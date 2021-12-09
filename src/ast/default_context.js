import { EvaluationContext } from './context.js'

/**
 * Create an EvaluationContext with the default types, casts, and operators
 */
export function createEvaluationContext () {
  let context = new EvaluationContext()

  registerBasicTypes(context)
  registerBasicCasts(context)
  registerEvaluators(context)

  return context
}


function registerBasicTypes (context) {

}

function registerBasicCasts (context) {

}

function registerEvaluators (context) {

}
