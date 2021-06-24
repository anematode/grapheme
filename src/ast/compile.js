/**
 * Convert a node into a function, or set of functions.
 * @param root
 * @param opts
 */
import {getCast, TYPES} from "./new_operator.js"

export function compileNode (root, opts={}) {
  // Whether to do typechecks to passed arguments
  let doTypechecks = !!opts.typechecks

  // Whether to allow optimizations which may change the output due to rounding
  let fastMath = !!opts.fastMath

  // We construct the text of a function of the form (imports) => { let setup = ... ; return function (...) { ... }}
  // then create the function via new Function. The evaluation process basically involves generating variables $0, $1,
  // $2, ... that correspond to the nodes in the graph. For example, x^2+3 becomes

  // $0 = scope.x
  // $1 = 2
  // $2 = Math.pow($0, $1)
  // $3 = 3
  // $4 = $2 + $3
  // return $4

  // Breaking down the evaluation like this allows for much greater optimizations, including conditional eval (we'll
  // get to that later).

  let id = 0

  /**
   * Get id to be used for intermediate functions and the like
   * @returns {string}
   */
  function getVarName () {
    return "$" + (++id)
  }

  // Map between nodes and information about those nodes (corresponding var names, optimizations, etc.)
  let nodeInfo = new Map()

  // Create stores for each node for information about each
  root.applyAll(node => {
    nodeInfo.set(node, {})
  }, false /* call the function on all nodes, not just group nodes */)

  // Mapping between function/constant import objects and their variable names
  let importInfo = new Map()

  // Text of the setup code preceding all the exported functions
  let globalSetup = ""

  /**
   * Import a function f and return a constant variable name corresponding to that function, to be placed in
   * globalSetup. Importing the same function twice returns the same variable
   * @param f {Function}
   * @returns {string}
   */
  function importFunction (f) {
    if (typeof f !== "function")
      throw new TypeError(`Unable to import function ${f}`)

    let stored = importInfo.get(f)
    if (stored) return stored

    let fName = getVarName() + "_f"

    if (doTypechecks) // Make sure f is actually a function
      globalSetup += `if (typeof ${fName} !== "function") throw new TypeError("Imported parameter ${fName} is not a function");\n`

    importInfo.set(f, fName)
    return fName
  }

  /**
   * Import a generic variable of any type
   * @param c {any} External constant
   * @returns {string} Variable name corresponding to the constant
   */
  function importConstant (c) {
    let stored = importInfo.get(c)
    if (stored) return stored

    let cName = getVarName() + "_c"

    importInfo.set(c, cName)
    return cName
  }

  // Dict of exported functions; mapping between names of functions and their arguments, setup and body
  let exportedFunctions = {}

  function exportFunction (name, args, body) {
    exportedFunctions[name] = { args, body }
  }

  // Compile a function which, given a scope, evaluates the function
  compileEvaluationFunction(root, nodeInfo, importFunction, importConstant, exportFunction, getVarName, opts)

  // efText is of the form return { evaluate: function ($1, $2, ) { ... } }
  let efText = "return {" + Object.entries(exportedFunctions)
    .map(([name, info]) => `${name}: function (${info.args.join(',')}) { ${info.body} }`)
    .join(',') + '}'

  let nfText = globalSetup + efText

  let imports = Array.from(importInfo.keys())
  let importNames = Array.from(importInfo.values())

  // Last argument is the text of the function itself
  importNames.push(nfText)

  return Function.apply(null, importNames).apply(null, imports)
}


function compileEvaluationFunction (root, nodeInfo, importFunction, importConstant, exportFunction, getUnusedVarName, opts) {
  // Whether to add typechecks to the passed variables
  let doTypechecks = !!opts.typechecks

  let scopeVarName = "scope"
  let fBody = ""
  let fArgs = [scopeVarName]

  // Mapping between string variable name and information about that variable (varName)
  let varInfo = new Map()

  /**
   * Get information, including the JS variable name
   * @param name
   */
  function getScopedVariable (name) {
    let stored = varInfo.get(name)
    if (stored) return stored

    stored = { varName: getUnusedVarName() }
    varInfo.set(name, stored)

    return stored
  }

  function addLine (code) {
    fBody += code + '\n'
  }

  // Typecheck scope object
  if (doTypechecks)
    addLine(`if (typeof ${scopeVarName} !== "object" || Array.isArray(${scopeVarName})) throw new TypeError("Object passed to evaluate function should be a scope");`)

  // Import and typecheck variables
  let requiredVariables = root.usedVariables()
  for (const [name, type] of requiredVariables.entries()) {
    let varInfo = getScopedVariable(name)
    let varName = varInfo.varName

    addLine(`var ${varName}=${scopeVarName}.${name};`)

    if (doTypechecks) {
      let typecheck = importFunction(TYPES[type].typecheck.generic.f)

      addLine(`if (${varName} === undefined) throw new Error("Variable ${name} is not defined in this scope");`)
      addLine(`if (!${typecheck}(${varName})) throw new Error("Expected variable ${name} to have a type of ${type}");`)
    }
  }

  compileEvaluateVariables(root, nodeInfo, importFunction, importConstant, getScopedVariable, getUnusedVarName, addLine, opts)
  addLine(`return ${nodeInfo.get(root).varName};`)

  exportFunction("evaluate", fArgs, fBody)
}

function compileEvaluateVariables(root, nodeInfo, importFunction, importConstant, getScopedVariable, getUnusedVarName, addLine, opts) {
  // How much to try and optimize the computations
  let optimizationLevel = opts.o ?? 0

  function compileOperator (node) {
    let varName = getUnusedVarName()

    let definition = node.definition
    let evaluator = definition.evaluators.generic
    let evaluatorType = evaluator.type

    let children = node.children
    let args = children.map((c, i) => {
      let varName = nodeInfo.get(c).varName
      let srcType = c.type
      let dstType = definition.signature[i]

      // Do type conversion
      if (srcType !== dstType) {
        let cast = getCast(srcType, dstType)

        if (cast.name !== "identity") {
          let convertedVarName = getUnusedVarName()

          addLine(`var ${convertedVarName}=${importFunction(cast.evaluators.generic.f)}(${varName});`)
          varName = convertedVarName
        }
      }

      return varName
    })

    if (evaluatorType === "special_binary") {
      addLine(`var ${varName}=${args[0]} ${evaluator.binary} ${args[1]};`)
    } else {
      let fName = importFunction(evaluator.f)
      addLine(`var ${varName}=${fName}(${args.join(',')});`)
    }

    return varName
  }

  root.applyAll(node => {
    let info = nodeInfo.get(node)
    let nodeType = node.nodeType()
    let varName

    switch (nodeType) {
      case "op":
        varName = compileOperator(node)
        break
      case "var":
        varName = getScopedVariable(node.name).varName
        break
      case "const":
        varName = importConstant(node.value)
        break
      case "group":
        // Forward the var name from the only child (since this is a grouping)
        varName = nodeInfo.get(node.children[0]).varName
        break
      default:
        throw new Error(`Unknown node type ${nodeType}`)
    }

    info.varName = varName
  }, false, true /* children first, so bottom up */)
}
