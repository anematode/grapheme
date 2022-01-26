import { OperatorDefinition } from "./operator_definition.js"
import { castDistance } from './evaluator.js'

// For now we'll just have a mapping  name -> Array of possibilities
const KNOWN_OPERATORS = new Map()

// Put an operator in the global list
function registerOperator(definition) {
  let name = definition.name

  if (!KNOWN_OPERATORS.has(name))
    KNOWN_OPERATORS.set(name, [])

  KNOWN_OPERATORS.get(name).push(definition)
}

/**
 * Get the corresponding OperatorDefinition of a given name and arg types, returning [ definition, casts ] on success,
 * where casts is an array of MathematicalCasts, and [ null, null ] on failure
 * @param name
 * @param argTypes
 */
export function resolveOperatorDefinition (name, argTypes) {
  let defs = KNOWN_OPERATORS.get(name)
  if (!defs) return [ null, null ]

  // Choose first definition with the least cast distance (may change later)
  let bestDef = null
  let bestCasts = null
  let bestDist = Infinity

  for (let def of defs) {
    let casts = def.getCasts(argTypes)

    if (casts) {
      let dist = castDistance(casts)
      if (dist < bestDist) {
        bestDef = def
        bestCasts = casts
        bestDist = dist
      }

      if (dist === 0)
        break
    }
  }

  return [ bestDef, bestCasts ]
}

registerOperator(new OperatorDefinition({
  name: '+',
  args: ["int", "int"],
  returns: "int"
}))

registerOperator(new OperatorDefinition({
  name: '+',
  args: ["real", "real"],
  returns: "real"
}))
