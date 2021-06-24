import { closestRational, doubleToRational } from './rational.js'
import { gcd } from './basic_arithmetic'
import { roundDown, roundUp } from './fp_manip'

test('Throws on out-of-bounds', () => {
  const dumbNumbers = [ -Infinity, NaN, Infinity, -1, -1.5, 0.25, 2 ** 53, 2 ** 53 + 100, Number.MAX_VALUE ]
  const acceptableNumbers = [ 3, 100 ]

  for (const dumb of dumbNumbers) {
    for (const acceptable of acceptableNumbers) {
      expect(() => closestRational(0, dumb, acceptable)).toThrow()
      expect(() => closestRational(0, acceptable, dumb)).toThrow()
    }
  }
})

test('Handles special values', () => {
  expectAllEquals(closestRational, [
    [ Infinity, 100000 ], [ Infinity, 2 ], [ -Infinity, 2 ], [ NaN, 2 ]
  ], [ NaN, NaN, NaN ])
})

function rand () {
  return Math.ceil(Math.random() * 10000)
}

test('closestRational on random fractions', () => {
  const testCases = []

  for (let i = 0; i < 1000; ++i) {
    let a = rand(); let b = rand()
    const g = gcd(a, b)
    a /= g
    b /= g

    testCases.push([ a / b, 1e6, [ a, b, 0 ] ])
    testCases.push([ -a / b, 1e6, [ -a, b, 0 ] ])
  }

  expectMultipleCases(closestRational, testCases)
})

const numerators = [ 3, 13, 16, 19, 22, 179, 201, 223, 245, 267, 289, 311, 333, 355, 52163, 52518, 52873, 53228, 53583, 53938, 54293, 54648, 55003, 55358, 55713, 56068, 56423, 56778, 57133, 57488, 57843, 58198, 58553, 58908, 59263, 59618, 59973, 60328, 60683, 61038, 61393, 61748 ]
const denominators = [ 1, 4, 5, 6, 7, 57, 64, 71, 78, 85, 92, 99, 106, 113, 16604, 16717, 16830, 16943, 17056, 17169, 17282, 17395, 17508, 17621, 17734, 17847, 17960, 18073, 18186, 18299, 18412, 18525, 18638, 18751, 18864, 18977, 19090, 19203, 19316, 19429, 19542, 19655, 19768, 19881, 19994, 20107, 20220, 20333, 20446, 20559, 20672, 20785 ]

test('Approximants for pi', () => {
  for (let i = 1; i < numerators.length; ++i) {
    const n = numerators[i]
    const d = denominators[i]

    const pn = numerators[i - 1]
    const pd = denominators[i - 1]

    expect(closestRational(Math.PI, d)).toEqual([ n, d, Math.abs(Math.PI - n / d) ])
    expect(closestRational(Math.PI, d - 1)).toEqual([ pn, pd, Math.abs(Math.PI - pn / pd) ])
  }
})

test('doubleToRational on random fractions', () => {
  const testCases = []

  for (let i = 0; i < 1000; ++i) {
    let a = rand(); let b = rand()
    const g = gcd(a, b)
    a /= g
    b /= g

    testCases.push([ a / b, [ a, b ] ])
    testCases.push([ roundDown(a / b), [ a, b ] ])
    testCases.push([ roundUp(a / b), [ a, b ] ])
    testCases.push([ roundDown(roundDown(a / b)), [ NaN, NaN ] ])
    testCases.push([ roundUp(roundUp(a / b)), [ NaN, NaN ] ])
  }

  expectMultipleCases(doubleToRational, testCases)
})
