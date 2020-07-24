import { eta, zeta } from './riemann_zeta'

function polyreal(n, z) {
  if (z === 1)
    return zeta(n)
}

function F1(n, z, L) {

}

function F0(n, z, L) {
  let sum = 0

  for (let k = 1; k <= L; ++k) {
    sum += (z ** k) / (k ** n)
  }

  return sum
}

function Fn1(n, z, L) {

}

function polylogarithm(s, z) {
  if (s === 0) {
    return z / (1 - z)
  } else if (s === 1) {
    return - Math.log(1 - z)
  } else if (s === -1) {
    let cow = 1 - z
    return z / (cow * cow)
  }

  if (z === 1) {
    return zeta(s)
  } else if (z === -1) {
    return -eta(s)
  }
}

export { polylogarithm }
