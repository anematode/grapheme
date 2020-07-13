import * as utils from "../core/utils"
import { li } from './exp_integral'

let unsafeToSquare = Math.floor(Math.sqrt(Number.MAX_SAFE_INTEGER))

function addMod(a, b, m) {
  // Returns (a + b) % m

  let sum = a + b

  let result = sum % m

  if (sum < Number.MAX_SAFE_INTEGER)
    return result

  let signature = ((a % 8) + (b % 8)) % 8

  let sumMod = sum % 8

  for (let i = -2; i <= 2; ++i) {
    if ((sumMod + i) % 8 === signature) {
      let ret = result + i

      if (ret > m)
        ret = (result - m) + i // prevent overflow

      return ret
    }
  }
}

function mulMod(a, b, m) {
  if (m === 0)
    return 0

  let prod = a * b

  if (prod < Number.MAX_SAFE_INTEGER)
    return prod % m

  let y = 0
  let result = a

  while (b > 1) {
    if (b % 2 === 0) {
      result = addMod(result, result, m)

      b /= 2
    } else {
      y = addMod(result, y, m)
      result = addMod(result, result, m)

      b = (b - 1) / 2
    }
  }

  return addMod(result, y, m)
}

function squareMod(b, m) {
  // Computes (b * b % m)

  return mulMod(b, b, m)
}

function expModLargeB(b, exponent, m) {
  let y = 1

  while (exponent > 1) {
    if (exponent % 2 === 0) {
      b = squareMod(b, m)

      exponent /= 2
    } else {
      y = mulMod(y, b, m)
      b = squareMod(b, m)

      exponent = (exponent - 1) / 2
    }
  }

  return mulMod(b, y, m)
}

function expMod(b, exponent, m) {
  if (exponent === 0)
    return 1

  if (b >= unsafeToSquare || m >= unsafeToSquare) {
    return expModLargeB(b, exponent, m)
  }

  let y = 1

  while (exponent > 1) {
    if (exponent % 2 === 0) {
      b *= b
      b %= m

      exponent /= 2
    } else {
      y *= b
      b *= b

      y %= m
      b %= m

      exponent = (exponent - 1) / 2
    }
  }

  return (b * y) % m
}

function _isPrimeTrialDivision(p) {
  let sqrtP = Math.ceil(Math.sqrt(p))

  for (let i = 23; i <= sqrtP + 1; i += 2) {
    if (p % i === 0)
      return false
  }

  return true
}

function _isProbablePrimeMillerRabin(p, base=2) {
  let pm1 = p - 1
  let pm1div = pm1
  let d, r = 0

  while (true) {
    if (pm1div % 2 === 0) {
      pm1div /= 2

      r++
    } else {
      d = pm1div
      break
    }
  }

  let x = expMod(base, d, p)

  if (x === 1 || x === pm1)
    return true

  for (let i = 0; i < r - 1; ++i) {
    x = squareMod(x, p)

    if (x === pm1)
      return true
  }

  return false
}

function isPerfectSquare(p) {
  let h = p & 0xF

  if (h > 9)
    return false

  if (h !== 2 && h !== 3 && h !== 5 && h !== 6 && h !== 7 && h !== 8) {
    let t = Math.floor(Math.sqrt(p) + 0.5)
    return t * t === p
  }

  return false
}

function _isPrimeLarge(p) {
  let bases

  if (p < 2047)
    bases = [2]
  else if (p < 1373653)
    bases = [2, 3]
  else if (p < 9080191)
    bases = [31, 73]
  else if (p < 25326001)
    bases = [2, 3, 5]
  else if (p < 3215031751)
    bases = [2, 3, 5, 7]
  else if (p < 4759123141)
    bases = [2, 7, 61]
  else if (p < 1122004669633)
    bases = [2, 13, 23, 1662803]
  else if (p < 2152302898747)
    bases = [2, 3, 5, 7, 11]
  else if (p < 3474749660383)
    bases = [2, 3, 5, 7, 11, 13]
  else if (p < 341550071728321)
    bases = [2, 3, 5, 7, 11, 13, 17]
  else
    bases = [2, 3, 5, 7, 11, 13, 17, 19, 23]


  return bases.every(base => _isProbablePrimeMillerRabin(p, base))
}

let smallPrimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223]

function isPrime(p) {
  if (!Number.isInteger(p) || p < 2)
    return false

  // Test for small primes
  for (let i = 0; i < smallPrimes.length; ++i) {
    let prime = smallPrimes[i]

    if (p === prime)
      return true
    if (p % prime === 0)
      return false
  }

  if (p < 150) {
    return _isPrimeTrialDivision(p)
  } else {
    return _isPrimeLarge(p)
  }
}

function pollardBrent(n) {
  let y = utils.getRandomInt(1, n-1), c = utils.getRandomInt(1, n-1), m = utils.getRandomInt(1, n-1)
  let g = 1, r = 1, q = 1, x, ys

  while (g === 1) {
    x = y

    for (let i = 0; i < r; ++i) {
      y = addMod(squareMod(y, n), c, n)
    }

    let k = 0
    while (k < r && g === 1) {
      ys = y

      let iMax = Math.min(m, r-k)

      for (let i = 0; i < iMax; ++i) {
        y = addMod(squareMod(y, n), c, n)

        q = mulMod(q, Math.abs(x - y), n)
      }

      g = utils.gcd(q, n)
      k += m
    }

    r *= 2
  }

  if (g === n) {
    while (true) {
      ys = addMod(squareMod(ys, n), c, n)
      g = utils.gcd(Math.abs(x - ys), n)

      if (g > 1)
        break
    }
  }

  return g
}

function factor(n) {
  if (Math.abs(n) > Number.MAX_SAFE_INTEGER)
    throw new Error("Number to factor is too large to be represented by a JS Number")

  n = Math.floor(n)

  if (n === 0)
    return [0]
  if (n === 1)
    return [1]

  let factors = []

  if (n < 0) {
    factors.push(-1)
    n = -n
  }

  for (let i = 0; i < smallPrimes.length; ++i) {
    let prime = smallPrimes[i]

    while (true) {
      if (n % prime === 0) {
        factors.push(prime)

        n /= prime
      } else {
        break
      }
    }

    if (n === 1)
      break
  }

  if (n === 1)
    return factors

  while (true) {
    let factor = pollardBrent(n)

    if (n === factor) {
      factors.push(factor)

      break
    } else {
      n /= factor

      factors.push(factor)
    }
  }

  factors.sort((a, b) => a - b)

  return factors
}

function distinctFactors(n) {
  return Array.from(new Set(factor(n)))
}

function eulerPhi(n) {
  let factors = distinctFactors(n)

  let prod = 1

  prod *= n

  for (let i = 0; i < factors.length; ++i) {
    let factor = factors[i]

    // This order of evaluation prevents overflow
    prod /= factor
    prod *= factor - 1
  }

  return prod
}

function eratosthenes(n) {
  // Eratosthenes algorithm to find all primes under n
  let array = [], upperLimit = Math.sqrt(n), output = [];

  // Make an array from 2 to (n - 1)
  for (let i = 0; i < n; i++) {
    array.push(true);
  }

  // Remove multiples of primes starting from 2, 3, 5,...
  for (let i = 2; i <= upperLimit; i++) {
    if (array[i]) {
      for (var j = i * i; j < n; j += i) {
        array[j] = false;
      }
    }
  }

  // All array[i] set to true are primes
  for (let i = 2; i < n; i++) {
    if (array[i]) {
      output.push(i);
    }
  }

  return output;
}

function eratosthenesWithPi(n) {
  let array = [], upperLimit = Math.sqrt(n), output = [];
  let pi = [0, 0]

  for (let i = 0; i < n; i++) {
    array.push(true);
  }

  for (let i = 2; i <= upperLimit; i++) {
    if (array[i]) {
      for (var j = i * i; j < n; j += i) {
        array[j] = false;
      }
    }
  }

  let cnt = 0

  for (let i = 2; i < n; i++) {
    if (array[i]) {
      output.push(i);
      cnt++
    }

    pi.push(cnt)
  }

  return {primes: new Uint32Array(output), pi: new Uint32Array(pi)}
}

const phiMemo = []
let primes = []

function Phi(m, b) {
  if (b === 0)
    return m
  if (m === 0)
    return 0

  if (m >= 800) {
    return Phi(m, b - 1) - Phi(Math.floor(m / primes[b - 1]), b - 1)
  }

  let t = b * 800 + m

  if (!phiMemo[t]) {
    phiMemo[t] = Phi(m, b - 1) - Phi(Math.floor(m / primes[b - 1]), b - 1)
  }

  return phiMemo[t]
}

const smallValues = [0, 0, 1, 2, 2, 3]
let piValues

function primeCountingFunction(x) {
  if (x > 1e9)
    return li(x)

  if (x < 6)
    return smallValues[x]

  let root2 = Math.floor(Math.sqrt(x))
  let root3 = Math.floor(x ** (1/3))

  let top = Math.floor(x / root3) + 1

  if (root2 + 1 >= primes.length) {
    let res = eratosthenesWithPi(top + 2)

    primes = res.primes
    piValues = res.pi
  }

  let a = piValues[root3 + 1], b = piValues[root2 + 1]

  let sum = 0

  for (let i = a; i < b; ++i) {
    let p = primes[i]

    sum += piValues[Math.floor(x / p)] - piValues[p] + 1
  }

  let phi = Phi(x, a)

  return phi + a - 1 - sum
}

// for me: https://www.ams.org/journals/mcom/1996-65-213/S0025-5718-96-00674-6/S0025-5718-96-00674-6.pdf

export { isPrime, expMod, squareMod, addMod, mulMod, isPerfectSquare, factor, distinctFactors, eulerPhi, eratosthenes, primeCountingFunction }
