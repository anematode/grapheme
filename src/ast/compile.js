/**
 * Convert a node into a function, or set of functions.
 * @param root
 * @param opts
 */
import { getCast } from './operator.js'
import { getCloner, getConvenienceCaster, getFastInitializer, getInitializer, getTypecheck, TYPES } from './math_types.js'
import { isValidVariableName } from './parse_string.js'

export function compileNode (root, opts = {}) {
  // Whether to do typechecks to passed arguments
  let doTypechecks = !!opts.typechecks

  if (!opts.mode) opts.mode = "generic"

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
    return '$' + ++id
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
  let globalSetup = ''

  /**
   * Import a function f and return a constant variable name corresponding to that function, to be placed in
   * globalSetup. Importing the same function twice returns the same variable
   * @param f {Function}
   * @returns {string}
   */
  function importFunction (f) {
    if (typeof f !== 'function')
      throw new TypeError(`Unable to import function ${f}`)

    let stored = importInfo.get(f)
    if (stored) return stored

    let fName = getVarName() + '_f'

    if (doTypechecks)
      // Make sure f is actually a function
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

    let cName = getVarName() + '_c'

    importInfo.set(c, cName)
    return cName
  }

  // Dict of exported functions; mapping between names of functions and their arguments, setup and body
  let exportedFunctions = {}

  function exportFunction (name, args, body, setup) {
    exportedFunctions[name] = { args, body, setup }
  }

  // Compile a function which, given a scope, evaluates the function
  compileEvaluationFunction(
    root,
    nodeInfo,
    importFunction,
    importConstant,
    exportFunction,
    getVarName,
    opts
  )

  // efText is of the form return { evaluate: function ($1, $2, ) { ... } }
  let efText =
    Object.values(exportedFunctions).map(f => f.setup).join('\n') + // setup

    'return {\n' +
    Object.entries(exportedFunctions)
      .map(
        ([name, info]) =>
          `${name}: function (${info.args.join(',')}) { ${info.body} }`
      )
      .join(',') +
    '\n}'

  let nfText = globalSetup + efText

  let imports = Array.from(importInfo.keys())
  let importNames = Array.from(importInfo.values())

  // Last argument is the text of the function itself
  importNames.push(nfText)

  console.log(nfText)

  return Function.apply(null, importNames).apply(null, imports)
}

function compileEvaluationFunction (
  root,
  nodeInfo,
  importFunction,
  importConstant,
  exportFunction,
  getUnusedVarName,
  opts
) {
  let doTypechecks = !!opts.typechecks
  let doCasts = !!opts.casts
  let mode = opts.mode
  let copyResult = !!opts.copyResult

  // List of arguments to be placed BEFORE the scope variable. For example, we might do
  // compileNode("x^2+y^2", { args: ["x", "y"] }) and then do res.evaluate(3, 4) -> 25, eliminating the need for a scope
  // object.
  let exportedArgs = opts.args ?? []

  exportedArgs.forEach(a => {
    if (!isValidVariableName(a))
      throw new Error(`Invalid exported variable name ${a}`)
  })

  let scopeVarName = "scope"
  let scopeUsed = !!opts.scope

  // Components to a compiled function:
  // Pre-allocated variables
  let allocationsText = ""

  // Typecheck scope
  let typecheckScopeText = ""

  // Get scoped variables
  let scopedText = ""

  // Typecheck/cast variables
  let typecheckText = ""

  // Allocate local variables
  let localsText = ""

  // Computation
  let computationText = ""

  // Result
  let returnText = ""

  // Add a typecheck for a variable
  function addTypecheck (jsVariableName, variableName, type) {
    let typecheck = getTypecheck(type, mode)
    let tcFunc = importFunction(typecheck.f)

    typecheckText += `if (!${tcFunc}(${jsVariableName})) throw new TypeError(${jsVariableName} === undefined ? "Expected variable ${variableName} to be defined" : "Expected variable ${variableName} to have type ${type}");\n`
  }

  function addCast (jsVariableName, variableName, type) {
    let typecheck = getConvenienceCaster(type, mode)
    let tcFunc = importFunction(typecheck.f)

    typecheckText += `${jsVariableName}=${tcFunc}(${jsVariableName});\nif (${jsVariableName} === undefined) throw new TypeError("Failed to cast variable ${variableName} to type ${type}");\n`
  }

  // Get a variable from the scope
  function getScopedVariable (scopedVarName) {
    let varName = getUnusedVarName()

    scopedText += `var ${varName}=${scopeVarName}.${scopedVarName};\n`
    return varName
  }

  // Allocate a variable using a given allocator
  function allocateVariable (type, initValue, local=false) {
    let hasInitValue = initValue !== undefined
    let text

    let varName = getUnusedVarName()

    if (mode === "generic" && (type === "real" || type === "bool" || type === "int")) { // special case where the allocation function can be elided
      text = `var ${varName}=${initValue ?? getFastInitializer(type, mode).f()};\n`
    } else {
      let allocator = (hasInitValue ? getInitializer : getFastInitializer)(type, mode)
      let allFunc = importFunction(allocator.f)

      text = `var ${varName}=${allFunc}(${hasInitValue ? importConstant(initValue) : ''});\n`
    }

    if (local) {
      localsText += text
    } else {
      allocationsText += text
    }

    return varName
  }

  // Allocate a *local* variable using a given allocator
  function localVariable (type, initValue) {
    allocateVariable(type, initValue, true)
  }

  function computeVariable (type, args, contextArgs, evaluator, local=false) {
    if (!evaluator) {
      throw new Error("No evaluator for function")
    }

    if (evaluator.type === "special") {
      if (evaluator.name === "identity") {
        return args[0]
      }
    }

    let evaluatorType = evaluator.type === "writes" ? "writes" : "returns"
    let varName

    let evalFunc = importFunction(evaluator.f)

    if (evaluatorType === "writes") {
      varName = (local ? localVariable : allocateVariable)(type)
      computationText += `${evalFunc}(${args.join(', ')}, ${varName}${contextArgs.length ? (', ' + contextArgs.join(', ')) : ''});\n`
    } else {
      varName = local ? getUnusedVarName() : allocateVariable(type)
      let allArgs = args.concat(contextArgs).join(', ')

      computationText += `${local ? "var " : ""}${varName}=${evalFunc}(${allArgs});\n`
    }

    return varName
  }

  function getCasted (node, dstType) {
    let info = nodeInfo.get(node)
    if (node.type === dstType) return info.varName

    let casts = info.casts
    if (!casts) casts = info.casts = {}

    if (casts[dstType]) return casts[dstType]

    let typecast = getCast(node.type, dstType)

    return casts[dstType] = computeVariable(dstType, [info.varName], [], typecast.evaluators[mode])
  }

  // Map between variable name -> JS variable name
  let varMap = new Map()

  let variables = root.usedVariables()
  for (const [ name, type ] of variables) {
    let isExported = exportedArgs.includes(name)
    let varName

    if (isExported) {
      varName = name
    } else {
      scopeUsed = true

      // Does something like var $1 = scope.x
      varName = getScopedVariable(name)
    }

    varMap.set(name, varName)
    if (doTypechecks)
      addTypecheck(varName, name, type)
    if (doCasts)
      addCast(varName, name, type)
  }

  if (scopeUsed) {
    if (doTypechecks) {
      typecheckScopeText += `if (typeof ${scopeVarName} !== "object" || Array.isArray(${scopeVarName})) throw new TypeError("Scope must be an object");\n`
    }

    exportedArgs.push(scopeVarName)
  }

  root.applyAll(node => {
    let info = nodeInfo.get(node)

    switch (node.nodeType()) {
      case "var":
        info.varName = varMap.get(node.name)
        break
      case "const":
        info.varName = allocateVariable(node.type, node.value)
        break
      case "op":
        let definition = node.definition
        let signature = definition.signature
        let children = node.children

        let args = children.map((child, i) => getCasted(child, signature[i]))
        let evaluator = definition.evaluators[mode]

        if (!evaluator)
          throw new Error(`No evaluator found for function ${definition.name} under mode ${mode}`)

        info.varName = computeVariable(node.type, args, [], evaluator)

        break
      case "group":
        info.varName = nodeInfo.get(node.children[0]).varName
        break
    }
  }, false, true)

  // Return text
  let rootInfo = nodeInfo.get(root)
  let rootVarName = rootInfo.varName

  if (copyResult) {
    rootVarName = computeVariable(rootInfo, [rootVarName], [], getCloner(type, mode), true)
  }

  returnText += `return ${rootVarName};\n`

  let fText = typecheckScopeText + scopedText + typecheckText + localsText + computationText + returnText

  exportFunction("evaluate", exportedArgs, fText, allocationsText)
}
