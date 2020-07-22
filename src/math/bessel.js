import { factorial, gamma } from './gamma_function'

function besselJ0(z) {
  if (z < 0)
    return besselJ0(-z)

  if (z < 6) {
    let sum = 0

    for (let m = 0; m <= 10; ++m) {
      let component = (-1) ** m / (factorial(m) ** 2) * (z/2) ** (2 * m)

      sum += component
    }

    return sum
  }

  return Math.sqrt(2 / (Math.PI * z)) * (1 - 1/(16 * z * z) + 53/(512 * z**4)) * Math.cos(z - Math.PI/4 - 1/(8 * z) + 25/(384 * z ** 3))
}

function besselJ(n, z) {
  if (n === 0)
    return besselJ0(z)

  if (n < 0)
    return (n % 2 === 0 ? 1 : -1) * besselJ(-n, z)

  if (z < 0) {
    if (Number.isInteger(n)) {
      if (n % 2 === 0) {
        return besselJ(n, -z)
      } else {
        return -besselJ(n, -z)
      }
    } else return NaN
  }

  if (z < 6) {
    let sum = 0

    for (let m = 0; m <= 10; ++m) {
      let component = (-1) ** m / (factorial(m) * factorial(m + n)) * (z/2) ** (2 * m + n)

      sum += component
    }

    return sum
  }

}

export { besselJ }
