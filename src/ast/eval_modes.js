

// List of evaluation modes.

class EvaluationMode {
  constructor (name, params={}) {
    this.name = name

    this.args = params.args ?? []
    this.argCount = this.args.length
  }
}

let normal = new EvaluationMode("normal")
let fastInterval = new EvaluationMode("fast_interval", ["correctRounding"])

let EvaluationModes = {
  normal,
  fast_interval: fastInterval
}
