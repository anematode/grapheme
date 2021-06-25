import { gcd, lcm } from './basic_arithmetic.js'

test('Returns the non-zero argument if one argument is zero', () => {
  const cases = [
    [0, 1, 1],
    [0, 0, 0],
    [1, 0, 1],
    [-1, 0, 1]
  ]

  expectMultipleCases(gcd, cases)
})

test('Returns NaN for bad values', () => {
  expectMultipleCases(gcd, [
    [NaN, NaN, NaN],
    [-Infinity, 0, NaN],
    [0.5, 0, NaN],
    [0, 0.5, NaN]
  ])
})

test('Correct values', () => {
  expectMultipleCases(gcd, [
    [1, 1, 1],
    [1, 2, 1],
    [100001, -9091 * 1171, 9091],
    [4, 16, 4],
    [15, 30, 15],
    [30, 30, 30],
    [100000, 100001, 1],
    [100001, 9091 * 1171, 9091]
  ])
})

test('LCM is happy', () => {
  expectMultipleCases(lcm, [
    [0, 0, 0],
    [0, 5, 5],
    [0, -5, 5],
    [1, 1, 1],
    [1, 2, 2],
    [4, 16, 16],
    [15, 30, 30],
    [30, 30, 30],
    [100000, 100001, 10000100000],
    [100001, 9091 * 1171, 117101171]
  ])
})
