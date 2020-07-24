import { factorial, gamma } from './gamma_function'
import { SingleVariablePolynomial } from './polynomial'

function besselJ0 (z) {
  if (z < 0) {
    return besselJ0(-z)
  }

  if (z < 6) {
    let sum = 0

    for (let m = 0; m <= 10; ++m) {
      let component = (-1) ** m / (factorial(m) ** 2) * (z / 2) ** (2 * m)

      sum += component
    }

    return sum
  }

  return Math.sqrt(2 / (Math.PI * z)) * (1 - 1 / (16 * z * z) + 53 / (512 * z ** 4)) * Math.cos(z - Math.PI / 4 - 1 / (8 * z) + 25 / (384 * z ** 3))
}

function besselJ1 (z) {
  if (z < 0) {
    return -besselJ1(-z)
  }

  if (z < 6) {
    let sum = 0

    for (let m = 0; m <= 10; ++m) {
      let component = (-1) ** m / (factorial(m) * factorial(m + 1)) * (z / 2) ** (2 * m + 1)

      sum += component
    }

    return sum
  }

  return Math.sqrt(2 / (Math.PI * z)) * (1 + 3 / (16 * z * z) - 99 / (512 * z ** 4)) * Math.cos(z - 3 * Math.PI / 4 + 3 / (8 * z) - 21 / (128 * z ** 3))
}

function besselJNonInteger(n, z) {
  if (n === 0.5) {
    return Math.sin(z) / Math.sqrt(2 * Math.PI)
  }

  let nSq4 = 4 * n * n
  let zSq = 64 * z * z

  let res = 0
}

// Huge credit to http://www.mhtl.uwaterloo.ca/old/courses/me3532/js/bessel.html, where most of this code comes from
function besselJ (n, z) {
  if (n === 0) {
    return besselJ0(z)
  }

  if (n === 1) {
    return besselJ1(z)
  }

  if (n < 0) {
    return (n % 2 === 0 ? 1 : -1) * besselJ(-n, z)
  }

  if (z < 0) {
    if (Number.isInteger(n)) {
      if (n % 2 === 0) {
        return besselJ(n, -z)
      } else {
        return -besselJ(n, -z)
      }
    } else {
      return NaN
    }
  }

  if (z < 6) {
    let sum = 0

    for (let m = 0; m <= 10; ++m) {
      let component = (-1) ** m / (factorial(m) * factorial(m + n)) * (z / 2) ** (2 * m + n)

      sum += component
    }

    return sum
  }

  if (!Number.isInteger(n)) {
    return besselJNonInteger(n, z)
  }

  let ACC = 40.0		// Make larger to increase accuracy.
  let BIGNO = 1.0e10
  let BIGNI = 1.0e-10
  let j, jsum, m, az, bj, bjm, bjp, sum, tox, ans
  az = Math.abs(z)

  if (az === 0.0) {
    return 0.0
  } else if (az > n) {
    tox = 2.0 / az
    bjm = besselJ0(az)
    bj = besselJ1(az)

    for (j = 1; j < n; j++) {
      bjp = j * tox * bj - bjm
      bjm = bj
      bj = bjp
    }

    ans = bj
  } else {
    tox = 2.0 / az
    if (Math.sqrt(ACC * n) >= 0) {
      m = 2 * ((n + Math.floor(Math.sqrt(ACC * n))) / 2)
    } else {
      m = 2 * ((n + Math.ceil(Math.sqrt(ACC * n))) / 2)
    }

    jsum = 0
    bjp = ans = sum = 0.0
    bj = 1.0

    for (j = m; j > 0; j--) {
      bjm = j * tox * bj - bjp
      bjp = bj
      bj = bjm
      if (Math.abs(bj) > BIGNO) {
        // Keep the numbers in an acceptable float range
        bj *= BIGNI
        bjp *= BIGNI
        ans *= BIGNI
        sum *= BIGNI
      }

      if (jsum) sum += bj
      jsum = !jsum

      if (j === n) ans = bjp
    }

    sum = 2.0 * sum - bj
    ans /= sum
  }

  return z < 0.0 && (n % 2 === 0) ? -ans : ans
}

function besselY0 (x) {
  let z, xx, y, ans, ans1, ans2
  if (x < 8.0) {
    y = x * x
    ans1 = -2957821389.0 + y * (7062834065.0 + y * (-512359803.6 + y * (10879881.29 + y * (-86327.92757 + y * 228.4622733))))
    ans2 = 40076544269.0 + y * (745249964.8 + y * (7189466.438 + y * (47447.26470 + y * (226.1030244 + y))))
    ans = (ans1 / ans2) + 0.636619772 * besselJ0(x) * Math.log(x)
  } else {
    z = 8.0/ x
    y = z * z
    xx = x - 0.785398164
    ans1 = 1.0 + y * (-0.1098628627e-2 + y * (0.2734510407e-4 + y * (-0.2073370639e-5 + y * 0.2093887211e-6)))
    ans2 = -0.1562499995e-1 + y * (0.1430488765e-3 + y * (-0.6911147651e-5 + y * (0.7621095161e-6 + y * (-0.934945152e-7))))
    ans = Math.sqrt(0.636619772 / x) * (Math.sin(xx) * ans1 + z * Math.cos(xx) * ans2)
  }
  return ans
}

function besselY1 (x) {
  let z, xx, y, ans, ans1, ans2
  if (x < 8.0) {
    y = x * x
    ans1 = x * (-0.4900604943e13 + y * (0.1275274390e13 + y * (-0.5153438139e11 + y * (0.7349264551e9 + y * (-0.4237922726e7 + y * 0.8511937935e4)))))
    ans2 = 0.2499580570e14 + y * (0.4244419664e12 + y * (0.3733650367e10 + y * (0.2245904002e8 + y * (0.1020426050e6 + y * (0.3549632885e3 + y)))))
    ans = (ans1 / ans2) + 0.636619772 * (besselJ1(x) * Math.log(x) - 1.0 / x)
  } else {
    z = 8.0 / x
    y = z * z
    xx = x - 2.356194491
    ans1 = 1.0 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * (-0.240337019e-6))))
    ans2 = 0.04687499995 + y * (-0.202690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.10578e-6)))
    ans = Math.sqrt(0.636619772 / x) * (Math.sin(xx) * ans1 + z * Math.cos(xx) * ans2)
  }
  return ans
}

function besselY (n, z) {
  if (n === 0) {
    return besselY0(z)
  } else if (n === 1) {
    return besselY1(z)
  }

  let j, by, bym, byp, tox

  tox = 2.0 / z
  by = besselY1(z)
  bym = besselY0(z)

  for (j = 1; j < n; j++) {
    byp = j * tox * by - bym
    bym = by
    by = byp
  }

  return by
}

function sphericalBesselJ(n, x) {
  return Math.sqrt(Math.PI / (2 * x)) * besselJ(n + 0.5, x)
}

function sphericalBesselY(n, x) {
  return Math.sqrt(Math.PI / (2 * x)) * besselY(n + 0.5, x)
}


export { besselJ, besselY, sphericalBesselJ, sphericalBesselY }
