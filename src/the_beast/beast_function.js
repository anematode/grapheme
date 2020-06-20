import {nodeFromJSON} from '../function_ast/from_json'

class BeastFunction {
  constructor(json) {
    this.node = nodeFromJSON(json)

    this.curvatureFunc = null
    this.func = null
    this.intervalFunc = null
  }

  setNode(json) {
    this.node = nodeFromJSON(json)

    this.curvatureFunc = null
    this.func = null
    this.intervalFunc = null
  }

  getCurvatureFunc() {
    if (this.curvatureFunc) {
      return this.curvatureFunc
    }
  }

  getFunc() {
    if (this.func) {
      return this.func
    }
  }

  getIntervalFunc() {
    if (this.intervalFunc) {
      return this.intervalFunc
    }
  }

  getDerivative(variable) {
    return this.node.derivative(variable)
  }
}

export {BeastFunction}
