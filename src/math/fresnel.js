
const sqrtPi2 = Math.sqrt(Math.PI / 2)
const sqrt2Pi = Math.sqrt(2 * Math.PI)
const sqrt8Pi = Math.sqrt(8 * Math.PI)

function LargeS(x) {
  let xSq = x * x
  return sqrtPi2 * (Math.sign(x) / 2 - (Math.cos(xSq) / (x * sqrt2Pi) + Math.sin(xSq) / (x * xSq * sqrt8Pi)))
}

function LargeC(x) {
  let xSq = x * x
  return sqrtPi2 * (Math.sign(x) / 2 + (Math.sin(xSq) / (x * sqrt2Pi) + Math.cos(xSq) / (x * xSq * sqrt8Pi)))
}

function SmallS(x) {
  let sum = 0

  let z = x * x * x
  let xPow = z * x

  for (let n = 0; n < 50; ++n) {
    if (n !== 0)
      z /= 2 * n * (2 * n + 1)

    let component = z / (4 * n + 3)

    sum += component

    z *= xPow

    z *= -1

    if (Math.abs(component) < 1e-6)
      break
  }

  return sum
}

function SmallC(x) {
  let sum = 0

  let z = x
  let xPow = x * x * x * x

  for (let n = 0; n < 50; ++n) {
    if (n !== 0)
      z /= 2 * n * (2 * n - 1)

    let component = z / (4 * n + 1)

    sum += component

    z *= xPow

    z *= -1

    if (Math.abs(component) < 1e-6)
      break
  }

  return sum
}

function S(x) {
  if (Math.abs(x) > 5)
    return LargeS(x)
  return SmallS(x)
}

function C(x) {
  if (Math.abs(x) > 5)
    return LargeC(x)
  return SmallC(x)
}

export { S as FresnelS, C as FresnelC }
