
/** General class dealing with drawing demarcations of things. In particular, given
a length in CSS space corresponding to the length between which demarcations should
be drawn, as well as the x starting and x ending points of the demarcation, it will
emit demarcations of a variety of classes corresponding to various methods of
dividing up a line. */

class DemarcationStrategizer {
  constructor(params={}) {
    const {
      start = 0,
      end = 1,
      length = 500 // in CSS pixels
    } = params

    this.start = start
    this.end = end
    this.length = length
  }

  axisLength () {
    return Math.abs(this.end - this.start)
  }
}

const MAX_DEMARCATIONS = 1000

/** A strategizer with three types: zero, main, and sub, where the main
and sub. The axis distance between main demarcations is mainLength and the number of
subdivisions is subdivs */
class MainSubDemarcationStrategizer extends DemarcationStrategizer {
  constructor(params = {}) {
    super(params)

    const {
      mainLength = 10,
      subdivs = 5
    } = params

    this.mainLength = mainLength
    this.subdivs = subdivs
  }

  getDemarcations() {
    // Whee!!
    let end = this.end, start = this.start

    if (end < start) {
      let t = end
      end = start
      start = t
    }

    let zero = []
    let main = []
    let sub = []

    let { mainLength, subdivs } = this

    let xS = Math.ceil(start / mainLength)
    let xE = Math.floor(end / mainLength)

    if (subdivs * (xS - xE) > MAX_DEMARCATIONS) {
      throw new Error("too many demarcations!!")
    }

    for (let i = xS; i <= xE; ++i) {
      if (i === 0) {
        zero.push(0)
        continue
      }

      let pos = mainLength * i
      main.push(pos)
    }

    let yS = Math.ceil(subdivs * start / mainLength)
    let yE = Math.floor(subdivs * end / mainLength)

    for (let i = yS; i <= yE; ++i) {
      if (i % subdivs === 0) { // already emitted as a main
        continue
      }

      let pos = mainLength / subdivs * i
      sub.push(pos)
    }

    return { zero, main, sub }
  }
}

/** This strategizer divides the line into one of three classes:

zero: a demarcation reserved only for the value 0
main: a demarcation for major things (perhaps integers)
sub: a demarcation for less major things

The way that this works is that we give the strategizer some potential subdivisions.
In particular, we give it an array of potential subdivisions {main, sub}, where main
is the absolute distance (in axis coordinates) between main demarcations and sub
is the number of sub demarcations to be used within that distance. More precisely, the
distance between sub demarcations will be main / sub. This is used to prevent annoying
float errors. main and sub must be positive integers. The strategizer will consider
any demarcation pattern of the form 10^n * {main, sub}, where n is an integer. The best
such pattern is chosen by the closeness in CSS pixels between sub demarcations to
the ideal distance between those demarcations, idealSubDist. If multiple patterns
satisfy this, the last one in the list of demarcations will be chosen.
*/
class StandardDemarcationStrategizer extends MainSubDemarcationStrategizer {
  constructor(params={}) {
    super(params)

    const {
      patterns = [
        {main: 10, sub: 5},
        {main: 5, sub: 5},
        {main: 4, sub: 4},
      ],
      idealSubDist = 60 // CSS pixels
    } = params

    this.idealSubDist = idealSubDist
    this.patterns = patterns
  }

  getDemarcations() {
    let {patterns, idealSubDist, start, end, length} = this

    // for each pattern, find the most optimal pattern based on powers of 10 and
    // see if that is indeed the best
    let bestMain = 0
    let bestSubdivs = 0
    let currentError = Infinity

    for (let i = 0; i < patterns.length; ++i) {
      let pattern = patterns[i]

      let ne = Math.round(Math.log10(this.idealSubDist * (end - start) / length * pattern.sub / pattern.main))
      let scaling = Math.pow(10, ne)

      let error = Math.abs(pattern.main / pattern.sub * length / (end-start) * scaling - this.idealSubDist)

      if (error < currentError) {
        bestMain = pattern.main * scaling
        bestSubdivs = pattern.sub
        currentError = error
      }
    }

    if (currentError === Infinity) {
      throw new Error("No happy demarcations")
    }

    this.mainLength = bestMain
    this.subdivs = bestSubdivs

    return super.getDemarcations()
  }
}

export {DemarcationStrategizer, StandardDemarcationStrategizer}
