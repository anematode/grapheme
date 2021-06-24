import {
  addMantissas,
  BigFloat,
  compareMantissas, getTrailingInfo, neededWordsForPrecision,
  rightShiftMantissa,
  roundMantissaToPrecision,
  subtractMantissas
} from "../src/math/bigint/bigfloat.js"
import {deepEquals, leftZeroPad, rightZeroPad} from "../src/core/utils.js"
import {ROUNDING_MODE} from "../src/math/rounding_modes.js"
import { expect } from "chai"

const BF = BigFloat
const RM = ROUNDING_MODE

export function prettyPrintMantissa (mantissa, color="\x1b[32m") {
  return '[ ' + Array.from(mantissa).map(toHex).map(s => `${color}${s}\x1b[0m`).join(', ') + ' ]'
}

function prettyPrintArg (arg) {
  if (arg instanceof Int32Array) {
    return prettyPrintMantissa(arg)
  } else if (typeof arg === "number") {
    if (Object.is(arg, -0)) {
      return "-0"
    } else {
      return arg + ''
    }
  } else {
    return arg + ''
  }
}

/**
 * Pretty prints a word of a mantissa
 * @param a {number}
 * @returns {string}
 */
export function toHex (a) {
  return ((a < 0) ? '-' : '') + "0x" + leftZeroPad(Math.abs(a).toString(16), 8, '0')
}

/**
 * Verify whether a mantissa is valid; negative/overflow/zeros
 * @param mantissa
 */
export function verifyMantissa (mantissa) {
  if (mantissa[0] === 0)
    throw new Error("Mantissa should not have a 0 as its first word")

  for (let i = 0; i < mantissa.length; ++i) {
    let m = mantissa[i]
    if (m < 0)
      throw new Error(`Mantissa has a negative word ${toHex(m)} at index ${i}`)
    else if (m > 0x3fffffff)
      throw new Error(`Mantissa has an overflowed word ${toHex(m)} at index ${i}`)
  }
}

function wrapErr(f) {
  return { toString: f }
}

// Passed: array of arguments, size of target mantissa, expected value of target mantissa, and expected returned shift
export function testMantissaCase (func, args, argNames, expectedTarget, expectedReturn) {
  verifyMantissa(expectedTarget)

  // Replace target argument with empty array of corresponding length
  let i = argNames.indexOf("target")

  let target = new Int32Array(args[i]) // give target size
  args[i] = target

  // So that they have the same length
  let typedExpectedTarget = new Int32Array(target.length)
  for (let i = 0; i < target.length; ++i) typedExpectedTarget[i] = expectedTarget[i]

  expectedTarget = typedExpectedTarget

  // Fill array with junk data, in case the array isn't cleared correctly
  target.fill(0x2BADBEEF)

  const originalTarget = new Int32Array(target)

  // Allow normal arrays to be used, for brevity
  args = args.map(a => Array.isArray(a) ? new Int32Array(a) : a)

  let ret = func(...args)

  function formatArgs () {
    let out = ""
    for (let _i = 0; _i < argNames.length; ++_i) {
      out += `\n\x1b[32m${argNames[_i]}\x1b[0m: ${prettyPrintArg((i === _i) ? originalTarget : args[_i])}`
    }
    return out
  }

  if (!deepEquals(target, expectedTarget)) {
    throw new Error(`Incorrect result while testing function ${func.name}. Arguments are as follows: ${formatArgs()}\nExpected target mantissa: ${prettyPrintArg(expectedTarget)}\nActual mantissa:          ${prettyPrintMantissa(target, '\u001b[31m')}\n\n`)
  }

  if (!deepEquals(ret, expectedReturn)) {
    throw new Error(`Incorrect result while testing function ${func.name}. Arguments are as follows: ${formatArgs()}\nExpected return: ${prettyPrintArg(expectedReturn)}\nActual return: ${prettyPrintArg(ret)}\n`)
  }
}

function mantissaFromBinaryString (str) {
  let arr = []

  for (let i = 0; i < str.length; i += 30) {
    arr.push(parseInt(rightZeroPad(str.slice(i, i + 30), 30), 2))
  }

  return arr
}

// Garden variety mantissas
const typicalMantissas = []

// List of mantissas that are likely to cause trouble
const difficultMantissas = []

// Mantissas consisting of only ones
const mantissaAllOnes = []

for (let i = 0; i < 29; ++i) {
  for (let count = 0; count < 100; ++count) {
    let str = '0'.repeat(i) + '1'.repeat(count)

    mantissaAllOnes.push(mantissaFromBinaryString(str))
  }
}

// Mantissas containing various troublesome words like 0x20000000 and 0x1fffffff
const troublesomeWords = [ 0x20000000, 0x1fffffff, 0x00000000, 0x00000001, 0x3fffffff, 0x1ffffffe, 0x20000001 ]

troublesomeWords.forEach(w => w ? difficultMantissas.push([ w ]) : 0)
troublesomeWords.forEach(w1 => w1 ? troublesomeWords.forEach(w2 => difficultMantissas.push([ w1, w2 ])) : 0)
troublesomeWords.forEach(w1 => w1 ? troublesomeWords.forEach(w2 => troublesomeWords.forEach(w3 => difficultMantissas.push([ w1, w2, w3 ]))) : 0)

describe("roundMantissaToPrecision", () => {
  const argNames = ["mant", "prec", "target", "round", "trailing", "trailingInfo"]

  it('fills in unused words with 0', () => {
    testMantissaCase(roundMantissaToPrecision, [ [ 0x1fffffff, 0 ], 20, 200 /* excess target length */, RM.NEAREST, 0, 0 ], argNames, [ 0x20000000, 0 ], 0)
  })
})

// Reference function. Slow but (hopefully) accurate
function referenceAddMantissas (mant1, mant2, mant2Shift, prec, target, round=CURRENT_ROUNDING_MODE) {
  let output = new Int32Array(Math.max(mant1.length, mant2.length + mant2Shift) + 1)

  for (let i = 0; i < mant1.length; ++i) {
    output[i] += mant1[i]
  }

  for (let i = 0; i < mant2.length; ++i) {
    output[i + mant2Shift] += mant2[i]
  }

  let carry = 0
  for (let i = output.length - 1; i >= 0; --i) {
    let word = output[i] + carry

    if (word > 0x3fffffff) {
      word -= 0x40000000
      carry = 1
    } else {
      carry = 0
    }

    output[i] = word
  }

  if (carry === 1) {
    rightShiftMantissa(output, 30, output)
    output[0] = carry
  }
  let roundingShift = roundMantissaToPrecision(output, prec, target, round)

  return carry + roundingShift
}

describe("addMantissas", () => {
  it("should behave identically to the reference implementation", () => {
    let argNames = ["mant1", "mant2", "mant2Shift", "prec", "target", "round"]

    let cases = 0
    let startTime = Date.now()

    // About 102 million test cases, should be somewhat thorough in terms of carry and rounding checking
    for (let i = 0; i < difficultMantissas.length; ++i) {
      const m1 = difficultMantissas[i]
      for (const m2 of difficultMantissas) {
        for (let shift = 0; shift < 5; ++shift) {
          for (let targetSize = 1; targetSize < 5; ++targetSize) {
            for (let precision of [30, 53, 59, 60, 120]) {
              for (let roundingMode of [0, 1, 2, 5]) {
                let target = new Int32Array(Math.max(neededWordsForPrecision(precision), targetSize))
                let ret = referenceAddMantissas(m1, m2, shift, precision, target, roundingMode)

                testMantissaCase(addMantissas, [m1, m2, shift, precision, target.length, roundingMode], argNames, target, ret)
                cases++
              }
            }
          }
        }
      }

      (!(i % 10)) ? console.log(`Progress: ${(i / difficultMantissas.length * 100).toPrecision(4)}% complete`) : 0
    }

    let endTime = Date.now()
    console.log(`Completed ${cases} test cases for addMantissas, comparing to referenceAddMantissas, in ${(endTime - startTime) / 1000} seconds.`)
  })
})

// Reference function
function referenceSubtractMantissas (mant1, mant2, mant2Shift, prec, target, round=CURRENT_ROUNDING_MODE) {
  let output = new Int32Array(Math.max(mant1.length, mant2.length + mant2Shift) + 1)

  for (let i = 0; i < mant1.length; ++i) {
    output[i] += mant1[i]
  }

  for (let i = 0; i < mant2.length; ++i) {
    output[i + mant2Shift] -= mant2[i]
  }

  let carry = 0
  for (let i = output.length - 1; i >= 0; --i) {
    let word = output[i] - carry

    if (word < 0) {
      word += 0x40000000
      carry = 1
    } else {
      carry = 0
    }

    output[i] = word
  }

  if (carry === 1) {
    throw new Error(`Invalid mantissas ${prettyPrintMantissa(mant1)}, ${prettyPrintMantissa(mant2)}`)
  }

  return roundMantissaToPrecision(output, prec, target, round)
}

describe("subtractMantissas", () => {
  it("should behave identically to the reference implementation", () => {
    let argNames = ["mant1", "mant2", "mant2Shift", "prec", "target", "round"]

    let cases = 0
    let startTime = Date.now()

    // About 102 million test cases, should be somewhat thorough in terms of carry and rounding checking
    for (let i = 0; i < difficultMantissas.length; ++i) {
      const m1 = difficultMantissas[i]
      for (const m2 of difficultMantissas) {
        for (let shift = 0; shift < 5; ++shift) {
          // Eliminate invalid cases
          if (shift === 0) {
            let cmp = compareMantissas(m1, m2)
            if (cmp !== 1) continue
          }

          for (let targetSize = 0; targetSize < 5; ++targetSize) {
            for (let precision of [30, 53, 59, 60, 120]) {
              for (let roundingMode of [0, 1, 2, 5]) {
                let target = new Int32Array(neededWordsForPrecision(precision))
                let ret = referenceSubtractMantissas(m1, m2, shift, precision, target, roundingMode)

                testMantissaCase(subtractMantissas, [m1, m2, shift, precision, target.length, roundingMode], argNames, target, ret)
                cases++
              }
            }
          }
        }
      }

      (!(i % 10)) ? console.log(`Progress: ${(i / difficultMantissas.length * 100).toPrecision(4)}% complete`) : 0
    }

    let endTime = Date.now()
    console.log(`Completed ${cases} test cases for addMantissas, comparing to referenceAddMantissas, in ${(endTime - startTime) / 1000} seconds.`)
  })
})

describe("getTrailingInfo", () => {
  it("should return correct results", () => {
    expect(getTrailingInfo([0,0x20000000], 1)).to.equal(2)
    expect(getTrailingInfo([0,0x20000001], 1)).to.equal(3)
    expect(getTrailingInfo([0,0x20000000,0], 1)).to.equal(2)
    expect(getTrailingInfo([0,0x20000000,0,1], 1)).to.equal(3)
    expect(getTrailingInfo([0,0x20000000], 0)).to.equal(1)
    expect(getTrailingInfo([0,0], 0)).to.equal(0)
    expect(getTrailingInfo([0x25000000], 0)).to.equal(3)
    expect(getTrailingInfo([0x25000000], 1)).to.equal(0)
    expect(getTrailingInfo([0x1f000000], 0)).to.equal(1)
    expect(getTrailingInfo([0x25000000], -1)).to.equal(1)
    expect(getTrailingInfo([0], -1)).to.equal(0)
  })
})
