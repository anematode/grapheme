import { factorial, gamma, lnGamma } from './gamma'

const specialValueCases = [
  [ Infinity, Infinity ],
  [ -Infinity, NaN ],
  [ NaN, NaN ]
]

// Test values for the gamma function's poles
const poles = [
  -1e6, -100, -4, -3, -2, -1, 0
]

// Factorials which should be exactly correct. smallFactorials[i] should be equal to factorial(i).
const smallFactorials = [
  1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800,
  479001600, 6227020800, 87178291200, 1307674368000, 20922789888000,
  355687428096000, 6402373705728000
]

test('gamma function has correct special values', () => {
  expectMultipleCases(gamma, specialValueCases)
})

test('lnGamma function has correct special values', () => {
  expectMultipleCases(lnGamma, specialValueCases)
})

test('gamma function returns NaN at poles', () => {
  expectAllEquals(gamma, poles, NaN)
})

test('lnGamma function returns NaN at poles', () => {
  expectAllEquals(lnGamma, poles, NaN)
})

test('lnGamma function accurate for 1 and 2', () => {
  expectAllEquals(lnGamma, [ 1, 2 ], 0)
})

test('gamma function accurate for small integers', () => {
  expectMultipleCases(gamma, smallFactorials.map((int, i) => [ i + 1, int ]))
})

test('factorial function correct for small integers', () => {
  expectMultipleCases(factorial, smallFactorials.map((int, i) => [ i, int ]))
})
