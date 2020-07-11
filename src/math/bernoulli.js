import * as utils from '../core/utils'

const MAX_BERNOULLI = 1e4

const BERNOULLI_N_NUMBERS = new Float64Array(MAX_BERNOULLI)
let BERNOULLI_N_INDEX = 0

function computeBernoulli(index) {
  for (let i = BERNOULLI_N_INDEX; i <= index; ++i) {
    let value = i === 0 ? 1 : 0

    for (let j = 0; j < i; ++j) {
      value -= utils.nCr(i, j) * BERNOULLI_N_NUMBERS[j] / (i - j + 1)
    }

    BERNOULLI_N_NUMBERS[i] = value
  }

  BERNOULLI_N_INDEX = index + 1
}

function bernoulliN(n) {
  if (n > MAX_BERNOULLI) {
    // Okay, that's a bit much
    throw new Error("Excessive n")
  }

  if (n < BERNOULLI_N_INDEX)
    return BERNOULLI_N_NUMBERS[n]

  computeBernoulli(n)

  return BERNOULLI_N_NUMBERS[n]
}

function bernoulliP(n) {
  if (n === 1)
    return 0.5

  return bernoulliN(n)
}

const bernoulli = bernoulliP

export { bernoulliN, bernoulliP, bernoulli }
