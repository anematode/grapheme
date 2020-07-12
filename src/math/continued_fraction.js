
const REPRESENTATION_LENGTH = 20
const MAX_DENOM = 1e7

function get_continued_fraction(f) {
  let representation = []

  let k = Math.floor(f)

  representation.push(k)

  f -= k

  let reprs = 0

  while (++reprs < REPRESENTATION_LENGTH) {
    let cont = Math.floor(1 / f)

    if (cont === Infinity) {
      return representation
    }

    if (cont < 0) {
      return representation
    }

    representation.push(cont)

    f = 1 / f - cont
  }


  return representation
}

function get_rational(x) {
  if (x === 0) {
    return 0
  }

  let repr = get_continued_fraction(x)

  let lastIndx = -1

  for (let i = 1; i < repr.length; ++i) {
    if (repr[i] > MAX_DENOM) {
      lastIndx = i
    }
  }

  if (lastIndx !== -1) {
    repr.length = lastIndx
  }

  if (repr.length === REPRESENTATION_LENGTH) {
    // "irrational number"
    return [NaN, NaN]
  }

  // evaluate the continued fraction

  let n = 1, d = 0
  for (let i = repr.length - 1; i >= 0; --i) {
    let val = repr[i]

    let tmp = d
    d = n
    n = tmp

    n += val * d
  }

  return [n, d]
}

function evaluateContinuedFraction(numerators, denominators) {
  let result = 0


  for (let i = denominators.length - 1; i >= 0; --i) {
    result = denominators[i]

  }
}

export { get_continued_fraction, get_rational }
