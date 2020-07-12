import { factorial } from './gamma_function'

function pochhammer(q, n) {
  if (n === 0)
    return 1
  if (n === 1)
    return q

  let prod = 1
  for (let i = 0; i < n; ++i) {
    prod *= q
    q++
  }

  return prod
}

function hypergeometric(a, b, c, z, terms=40) {
  let prod = 1
  let sum = 0

  if (Number.isInteger(c) && c <= 0)
    return NaN

  for (let n = 0; n < terms; ++n) {
    sum += prod

    prod *= a * b
    prod /= c

    a++
    b++
    c++

    prod /= n + 1

    prod *= z
  }

  return sum
}

export { pochhammer, hypergeometric }
