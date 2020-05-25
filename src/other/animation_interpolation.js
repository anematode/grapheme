// Inspired by tween.js!

// list of all active interpolations. They are stored in the following form:
// {object, property, startTime, endTime, interpolationFunction}
let extantInterpolations = []

const SIGMOID_C = 0.964027580075816

// An interpolation function is a function from [0,1] to [0,1] such that f(0) = 0 and f(1) = 1
const Interpolations = {
  LINEAR: x => Math.min(Math.max(x, 0), 1),
  QUADRATIC: x => x < 0 ? 0 : (x > 1 ? 1 : x * x),
  CUBIC: x => x < 0 ? 0 : (x > 1 ? 1 : x * x * x),
  QUARTIC: x => x < 0 ? 0 : (x > 1 ? 1 : x * x * x * x),
  INVERTED_QUADRATIC: x => x < 0 ? 0 : (x > 1 ? 1 : (1 - (x - 1) ** 2)),
  INVERTED_CUBIC: x => x < 0 ? 0 : (x > 1 ? 1 : (1 - (x - 1) ** 3)),
  INVERTED_QUARTIC: x => x < 0 ? 0 : (x > 1 ? 1 : (1 - (x - 1) ** 4)),
  INVERTED_CIRCULAR: x => x < 0 ? 0 : (x > 1 ? 1 : (1-Math.sqrt(1-x*x))),
  CIRCULAR: x => x < 0 ? 0 : (x > 1 ? 1 : (Math.sqrt(1 - (x - 1)  ** 2))),
  SIGMOID: x => x < 0 ? 0 : (x > 1 ? 1 : (Math.tanh(4 * x - 2) / (2 * SIGMOID_C) + 0.5))
}

function removeFinishedInterpolations() {
  let time = Date.now()

  for (let i = 0; i < extantInterpolations.length; ++i) {
    if (extantInterpolations[i].end < time + 1000) {
      extantInterpolations.splice(i, 1)
      --i
    }
  }
}

// We store
function update() {
  extantInterpolations.forEach(interpolation => interpolation.tick())

  removeFinishedInterpolations()
}

class GraphemeInterpolation {
  constructor(object) {
    this.object = object

    this.duration = -1
    this.interpolationFunction = Interpolations.LINEAR

    this.values = {}

    this.startTime = -1
    this.endTime = -1

    this.onUpdate = []
    this.onComplete = []
  }

  to(values, duration) {
    for (let key in values) {
      let value = values[key]

      this.values[key] = {start: values[key], end: value}
    }

    this.duration = duration

    return this
  }

  cancel() {
    let index = extantInterpolations.indexOf(this)

    if (index !== -1) {
      extantInterpolations.splice(index, 1)
    }

    return this
  }

  setInterpolation(func) {
    this.interpolationFunction = func
    return this
  }

  start() {
    if (this.duration < 0) {
      throw new Error("You need to set a valid duration")
    }

    if (extantInterpolations.some(egg => egg.object === this.object))
      extantInterpolations = extantInterpolations.filter(egg => egg.object !== this.object)

    this.startTime = Date.now()
    this.endTime = this.startTime + this.duration

    for (let key in this.values) {
      this.values[key].start = this.object[key]
    }

    extantInterpolations.push(this)

    return this
  }

  tick() {
    let time = Date.now()
    let fractionCompleted = (time - this.startTime) / this.duration

    if (fractionCompleted >= 1) {
      fractionCompleted = 1
    }

    for (let key in this.values) {
      let value = this.values[key]

      this.object[key] = this.interpolationFunction(fractionCompleted) * (value.end - value.start) + value.start
    }

    this.onUpdate.forEach(callback => callback(this.object))

    if (fractionCompleted >= 1) {
      this.onComplete.forEach(callback => callback(this.object))

      this.cancel()
    }
  }

  update(func) {
    this.onUpdate.push(func)
    return this
  }

  complete(func) {
    this.onComplete.push(func)
    return this
  }
}

function interpolate(...args) {
  return new GraphemeInterpolation(...args)
}

let _interpolationsEnabled = true

function updateInterpolations() {

  if (_interpolationsEnabled)
    update()

  requestAnimationFrame(updateInterpolations)
}

updateInterpolations()

export { interpolate, Interpolations, _interpolationsEnabled }
