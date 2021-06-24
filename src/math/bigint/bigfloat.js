
// A float is of the following form: sign * (2^30)^e * m, where m is a list of 30-bit words that contain the mantissa of
// the float. m = m_1 / 2^30 + m_2 / 2^60 + ... . The precision is the number of bits kept track of in the words. Since
// the start of the significant bits can occur anywhere from 0 to 29 bits into the first word,

import {flrLog2, getExponentAndMantissa, isDenormal, pow2} from "../real/fp_manip.js"
import {ROUNDING_MODE} from "../rounding_modes.js"
import {leftZeroPad} from "../../core/utils.js"

const BIGFLOAT_WORD_BITS = 30
const BIGFLOAT_WORD_SIZE = 1 << BIGFLOAT_WORD_BITS
const BIGFLOAT_WORD_MAX = BIGFLOAT_WORD_SIZE - 1

// Kinda arbitrary, but whatever
const BIGFLOAT_MIN_PRECISION_BITS = 4
const BIGFLOAT_MAX_PRECISION_BITS = 1 << 24

let CURRENT_PRECISION = 53
let CURRENT_ROUNDING_MODE = ROUNDING_MODE.NEAREST

/**
 * The minimum number of words needed to store a mantissa with prec bits. The +1 is because the bits need to be stored
 * at any shift within the word, from 1 to 29, so some space may be needed. WELL TESTED
 * @param prec {number}
 * @returns {number}
 */
export function neededWordsForPrecision (prec) {
  return ((prec - 1) / BIGFLOAT_WORD_BITS + 2) | 0
}

/**
 * Get an empty mantissa able to store a mantissa with prec bits. WELL TESTED
 * @param prec
 * @returns {Int32Array}
 */
function createMantissa (prec) {
  return new Int32Array(neededWordsForPrecision(prec))
}

/**
 * Given a subarray of a mantissa, return 0 if infinite zeros; 1 if between 0 and 0.5; 2 if a tie; 3 if between a tie and 1
 * @param mantissa {Int32Array}
 * @param index {number}
 * @returns {number}
 */
export function getTrailingInfo (mantissa, index) {
  let mantissaLen = mantissa.length

  if (index >= 0) {
    if (index < mantissaLen) {
      if (mantissa[index] === 1 << 29) {
        // Potential tie
        for (let i = index + 1; i < mantissaLen; ++i) {
          if (mantissa[i] !== 0) return 3
        }
        return 2
      } else if (mantissa[index] > 1 << 29) {
        return 3
      }
    } else return 0
  } else index = 0

  for (let i = index; i < mantissa.length; ++i) {
    if (mantissa[i] !== 0) return 1
  }

  return 0
}

/**
 * Count the number of leading zeros in a mantissa, including invalid mantissas in which the first word is not 0.
 * Returns -1 if the mantissa is all zeros.
 * @param mantissa {Int32Array}
 * @returns {number}
 */
function clzMantissa (mantissa) {
  let mantissaLen = mantissa.length

  for (let i = 0; i < mantissaLen; ++i) {
    if (mantissa[i]) {
      return Math.clz32(mantissa[i]) - 2 + 30 * i
    }
  }

  return -1
}

export function setGlobalRoundingMode (roundingMode) {
  CURRENT_ROUNDING_MODE = roundingMode
}

export function setGlobalPrecision (precision) {
  CURRENT_PRECISION = precision
}

/**
 * Round an (unsigned) mantissa to a given precision, in one of a few rounding modes. Also returns a shift if the
 * rounding operation brings the float to a higher exponent. Trailing information may be provided about the digits
 * following the mantissa to ensure correct rounding in those cases. This function allows aliasing, meaning the target
 * mantissa and the given mantissa can be the same array, leading to an in-place operation
 * @param mant {Int32Array} Array of 30-bit mantissa words
 * @param prec {number} Precision, in bits, to round the mantissa to
 * @param target {Int32Array} The mantissa to write to
 * @param round {number} Rounding mode; the operation treats the number as positive
 * @param trailing {number} 0 if the mantissa is followed by infinite zeros; 1 if between 0 and 0.5; 2 if a tie; 3 if between a tie and 1
 * @param trailingMode {number} 0 if the trailingInfo is considered to be at the end of all the words; 1 if it's considered to be at the end of precision
 * @returns {number} The shift of the rounding operation; 1 or 0
 */
export function roundMantissaToPrecision (mant, prec, target, round=CURRENT_ROUNDING_MODE, trailing=0, trailingMode=0) {
  let isAliased = mant === target
  let mantLen = mant.length

  if (round === ROUNDING_MODE.WHATEVER) {
    if (mant[0] === 0) {
      // Shifting needs to be done
      let shift = 0

      for (let i = 1; i < mantLen; ++i) {
        if (mant[i]) {
          shift = i
          break
        }
      }

      leftShiftMantissa(mant, shift * 30, target)
      return -shift
    }

    if (isAliased) return 0

    // Copy over the mantissa without rounding
    for (let i = target.length - 1; i >= 0; --i) {
      target[i] = mant[i]
    }

    return 0
  }

  let targetLen = target.length

  let offset = -1, shift = 0, bitShift = 0

  // How many ghost bits there are at the beginning; in other words, where to start counting precision bits from.
  // Specialized impl of clzMantissa
  for (let i = 0; i < mantLen; ++i) {
    if (mant[i]) {
      bitShift = 30 * i
      offset = bitShift + Math.clz32(mant[i]) - 2

      shift = -i | 0

      break
    }
  }

  if (offset === -1) {
    // Mantissa is all 0s, return
    for (let i = 0; i < targetLen; ++i) {
      target[i] = 0
    }

    return shift
  }

  // Copy over the given mantissa, shifted by shift
  leftShiftMantissa(mant, bitShift, target)
  offset -= bitShift

  // Which bit to start truncating at, indexing from 0 = the beginning of the mantissa
  let trunc = prec + offset
  let truncWord = (trunc / BIGFLOAT_WORD_BITS) | 0

  // Number of bits to truncate off the word, a number between 1 and 30 inclusive
  let truncateLen = BIGFLOAT_WORD_BITS - (trunc - truncWord * BIGFLOAT_WORD_BITS)

  // Remainder of the truncation and whether to do a carry after the truncation (rounding up)
  let rem = 0, doCarry = false

  // If the truncation would happen after the end of the mantissa...
  if (truncWord >= mantLen + shift) {
    // Whether the truncation bit is on the (nonexistent) word right after the mantissa
    let isAtVeryEnd = truncWord === mantLen + shift && truncateLen === BIGFLOAT_WORD_BITS

    // Fake a trailing info after the end. Our general strategy with trailingInfoMode = 1 is to convert it into a form
    // that trailingInfoMode = 0 can handle
    if (!isAtVeryEnd && trailingMode === 1 && trailing > 0) {
      // Any positive trailing info that isn't at the very end turns into a trailing info between 0 and 0.5 at the end
      trailing = 1
      isAtVeryEnd = true
    }

    // If rounding at the very end, what we do depends directly on the trailingInfo. To avoid complicating matters, we
    // "fake" the tie and round up cases so that the code doesn't have to be duplicated--especially the tie code, which
    // is slightly intricate
    if (isAtVeryEnd) {
      if (trailing === 0 || (round === ROUNDING_MODE.DOWN || round === ROUNDING_MODE.TOWARD_ZERO) ||
        ((trailing === 1) && (round === ROUNDING_MODE.TIES_AWAY || round === ROUNDING_MODE.TIES_EVEN))) {
        return shift
      } else if (trailing === 2 && (round === ROUNDING_MODE.TIES_AWAY || round === ROUNDING_MODE.TIES_EVEN)) {
        rem = 0x20000000 // emulate tie = BIGFLOAT_WORD_SIZE / 2
      } else {
        rem = 0x30000000 // emulate round up = 3 * BIGFLOAT_WORD_SIZE / 4
      }
    } else {
      // Otherwise, if the rounding is happening after the very end, nothing happens since it's already all 0s
      return shift
    }
  } else {
    // Truncate the word
    let word = target[truncWord]
    let truncatedWord = (word >> truncateLen) << truncateLen
    target[truncWord] = truncatedWord

    // Store the remainder, aka what was just truncated off
    if (trailingMode === 0) {
      rem = word - truncatedWord
    } else {
      // When in info mode 1, we fake a remainder and trailing info that corresponds to the correct rounding mode.
      // 0 -> (0, 0), 1 (between 0 and 0.5) -> (0, positive), 2 -> (tie, 0), 3 -> (tie, (between 0 and 0.5))
      rem = (trailing < 2) ? 0 : (1 << (truncateLen - 1))
      trailing &= 1
    }
  }

  // Determine whether to round up instead of truncating. Rounding up entails adding a 1 bit right where the mantissa
  // was truncated. For example, if we just truncated 011010110|1000, and our rounding mode is, say, TIES_AWAY, then we
  // determine that we have to round up and add 1 to the end: 01101011[1]. We call this a carry because it could
  // carry down the word in the right circumstances.
  doCarry: if (round === ROUNDING_MODE.UP || round === ROUNDING_MODE.TOWARD_INF) {
    // If we're rounding up, we carry if and only if the remainder is positive or there is a nonzero word after the
    // truncated word. If in info mode 1 we treat all the numbers following as 0 anyway, since that information is
    // contained within rem and trailingInfo
    if (rem > 0 || trailing > 0) {
      doCarry = true
    } else if (trailingMode === 0) {
      for (let i = truncWord - shift + 1; i < mantLen; ++i) {
        if (mant[i] !== 0) {
          doCarry = true
          break
        }
      }
    }
  } else if (round === ROUNDING_MODE.NEAREST || round === ROUNDING_MODE.TIES_AWAY) {
    // Truncated amounts less than this mean round down; more means round up; equals means needs to check whether the
    // rest of the limbs are 0, then break the tie
    let splitPoint = 1 << (truncateLen - 1)

    if (rem > splitPoint) {
      doCarry = true
    } else if (rem === splitPoint) {
      if (trailing > 0) {
        doCarry = true
      } else {
        if (trailingMode === 0) {
          // Try to break the tie by looking for nonzero bits
          for (let i = truncWord - shift + 1; i < mantLen; ++i) {
            if (mant[i] !== 0) {
              doCarry = true
              break doCarry
            }
          }
        }

        // Need to break the tie
        if (round === ROUNDING_MODE.TIES_EVEN) {
          // We only do the carry if it would give an even bit at the end. To do this we query for the bit which will be
          // affected (the truncateLen th bit). If the bit is 1, we do the carry. If truncateLen is 30 then we have to look
          // at the preceding word for the bit, since we truncated *at* a word

          let bit = (truncateLen === BIGFLOAT_WORD_BITS) ?
            (target[truncWord - 1] & 1) :
            ((target[truncWord] >> truncateLen) & 1)

          if (bit) doCarry = true
        } else {
          // Ties away from zero; always carry
          doCarry = true
        }
      }
    }
  }

  // Set all the words following the truncated word to 0
  for (let j = truncWord; ++j < targetLen;) {
    target[j] = 0
  }

  // The carry value is returned indicating whether the mantissa has "overflowed" due to rounding
  let carry = 0

  if (doCarry) {
    // Carry amount. Note that in the case of truncateLen = 30 we add 1 << 30 to a word, then immediately subtract
    // 2^30 and carry it to the next word, so everything works out
    carry = 1 << truncateLen

    for (let j = truncWord; j >= 0; --j) {
      let word = target[j] + carry

      if (word > BIGFLOAT_WORD_MAX) {
        word -= BIGFLOAT_WORD_SIZE
        target[j] = word
        carry = 1
      } else {
        target[j] = word
        carry = 0
        break // can immediately break
      }
    }
  }

  if (carry === 1) {
    // We carried the whole way and still have a 1, meaning the mantissa is now full of zeros and we need to shift by
    // one word and set the first word to a 1
    target[0] = 1

    return shift + 1
  }

  return shift
}


/**
 * Add two mantissas together, potentially with an integer word shift on the second mantissa. The result mantissa may
 * also have a shift applied to it, which is relative to mant1. This function seems like it would be relatively simple,
 * but the shifting brings annoyingness, especially with the rounding modes. The overall concept is we compute as much
 * of the addition as needed without doing any carrying, then when we get to the end of the area of needed precision,
 * we continue computing until we can determine with certainty the carry and the rounding direction. This function
 * allows aliasing mant1 to be the target mantissa. TODO optimize
 * @param mant1 {Int32Array}
 * @param mant2 {Int32Array} Nonnegative shift applied to mantissa 2
 * @param mant2Shift {number}
 * @param prec {number}
 * @param target {Int32Array} The mantissa that is written to
 * @param round {number}
 */
export function addMantissas (mant1, mant2, mant2Shift, prec, target, round=CURRENT_ROUNDING_MODE) {
  let isAliased = mant1 === target

  let mant1Len = mant1.length, mant2Len = mant2.length, mant2End = mant2Len + mant2Shift

  let newMantLen = target.length
  let newMant = target

  // Need to compute to higher precision first
  if (mant1Len > newMantLen) {
    newMantLen = Math.max(mant1Len, neededWordsForPrecision(prec))
    newMant = new Int32Array(newMantLen)
  }

  // We first sum all the parts of the addition we definitely need:
  if (!isAliased) {
    for (let i = 0; i < mant1Len; ++i) {
      newMant[i] = mant1[i]
    }

    for (let i = mant1Len; i < newMantLen; ++i) {
      newMant[i] = 0
    }
  }

  let mant2Bound1 = Math.min(mant2End, newMantLen)
  for (let i = mant2Shift; i < mant2Bound1; ++i) {
    newMant[i] += mant2[i - mant2Shift]
  }

  // Do the carry
  let carry = 0
  for (let i = mant1Len - 1; i >= 0; --i) {
    let word = newMant[i] + carry

    if (word > 0x3fffffff) {
      word -= 0x40000000
      newMant[i] = word
      carry = 1
    } else {
      newMant[i] = word
      carry = 0
    }
  }

  // All that remains are the words of mant2 to the right of newMantLen - mant2Shift
  let trailingInfo = 0
  let needsTrailingInfo = (round === ROUNDING_MODE.TIES_AWAY || round === ROUNDING_MODE.UP || round === ROUNDING_MODE.TOWARD_INF || round === ROUNDING_MODE.NEAREST)

  if (needsTrailingInfo) {
    let trailingShift = newMantLen - mant2Shift
    trailingInfo = getTrailingInfo(mant2, Math.max(trailingShift, 0))

    if (trailingShift < 0) trailingInfo = +(!!trailingInfo) // Lol, if the trailing info is shifted, then round it to 0 or 1 as appropriate
  }

  let shift = 0

  if (carry) {
    // Get trailing info from beyond the end of the truncation due to right shifting LOL
    if (needsTrailingInfo) {
      let lastWord = newMant[newMant.length - 1]

      if (lastWord === 0) {
        trailingInfo = +(!!trailingInfo)
      } else if (lastWord < 0x20000000) {
        trailingInfo = 1
      } else if (lastWord === 0x20000000) {
        trailingInfo = trailingInfo ? 3 : 2
      } else {
        trailingInfo = 3
      }
    }

    rightShiftMantissa(newMant, 30)

    newMant[0] = 1
    shift += 1
  }

  let roundingShift = roundMantissaToPrecision(newMant, prec, target, round, trailingInfo)

  return roundingShift + shift
}

/**
 * Returns whether a mantissa can be correctly rounded, assuming a maximum error of maxNeg and maxPos in the last word.
 * This often allows rounding to happen before extra computation is requested. Assumes maxNeg and maxPos can actually
 * be subtracted; a mantissa has to have length at least 2 anyway.
 * @param mantissa {Int32Array}
 * @param precision {number}
 * @param round {number}
 * @param maxNeg {number}
 * @param maxPos {number}
 */
export function canMantissaBeRounded (mantissa, precision, round, maxNeg, maxPos) {
  if (maxNeg === 0 && maxPos === 0) return true

  let zeros = clzMantissa(mantissa)

  let endOfPrec = zeros + precision
  let endWord = (endOfPrec / 30) | 0

  if (endWord >= mantissa.length) {
    return false
  }

  let truncateLen = BIGFLOAT_WORD_BITS - (endOfPrec - endWord * BIGFLOAT_WORD_BITS)
  let truncatedWord = (mantissa[endWord] >> truncateLen) << truncateLen
  let rem = mantissa[endWord] - truncatedWord

  if (round === ROUNDING_MODE.WHATEVER) {
    // We use a tighter bound (truncateLen - 2) because subtracting may require an extra bit of precision
    let lower = truncateLen === 1 ? 0 : (1 << (truncateLen - 2))
    let higher = 1 << (truncateLen - 1)

    if (rem - maxNeg < lower) {
      return false
    } else if (rem + maxPos > higher) {
      return false
    }

    return true
  }

  return false
}

/**
 * Subtract two (positive) mantissas, with mant1 > mant2 and mant2 under a given shift, returning a shift relative to
 * the first word of mantissa 1 depending on the result.
 * @param mant1 {Int32Array}
 * @param mant2 {Int32Array}
 * @param mant2Shift {number}
 * @param prec {number}
 * @param target {Int32Array} The mantissa to write to
 * @param round {number}
 */
export function subtractMantissas (mant1, mant2, mant2Shift, prec, target, round=CURRENT_ROUNDING_MODE) {
  // Important length variables
  let mant1Len = mant1.length, mant2Len = mant2.length, mant2End = mant2Len + mant2Shift, maxEnd = Math.max(mant1Len, mant2End)
  let targetLen = target.length

  // New strategy; we iteratively compute words of the result until we get to the end of target, at which point we do
  // the carry. If the result has any leading zeros, shift left and continue computing words; if not, return if in
  // rounding mode: whatever, and if in a different rounding mode, compute whether a delta of -1 on the last word would
  // change the result. If it won't, round and return. If it will, compute words after the target until a carry and
  // trailing value are determined, which is a rather finnicky process that hopefully the fuzzer will help with

  // shift of the target relative to mant1
  let shift = 0

  // shift of the current uncomputed word relative to mant1
  let writeShift = 0

  let carry = 0

  while (1) {
    // Compute the words of target
    let i = writeShift

    for (; i < targetLen + shift; ++i) {
      let word1 = mant1[i] | 0
      let word2 = mant2[i - mant2Shift] | 0

      target[i - shift] = word1 - word2
    }

    writeShift = i

    for (let i = targetLen - 1; i >= 0; --i) {
      let word = target[i] | 0

      if (carry) {
        word -= carry
        target[i] = word
      }

      if (word < 0) {
        target[i] += 0x40000000
        carry = 1
      } else {
        carry = 0
      }
    }

    if (target[0] === 0) {
      let i = 0
      for (; !target[i] && i < targetLen; ++i);

      leftShiftMantissa(target, 30 * i, target)
      shift += i
      break
    } else {
      if (round === ROUNDING_MODE.WHATEVER)
        break

      let canBeRounded = canMantissaBeRounded(target, prec, round, 2, 0)
      if (canBeRounded) break

      // TODO

      break


      // Considering the words >= writeShift, we have 7 possibilities: less than -0x20000000, =-0x20000000, between
      // that and 0, 0 itself, between 0 and 0x20000000, 0x20000000, and greater than that. Negative results require
      // a negative carry
    }
  }

  return roundMantissaToPrecision(target, prec, target, round) - shift
}

/**
 * Right shift a mantissa by shift bits, destroying any bits that trail off the end. This function supports aliasing.
 * @param mantissa {Int32Array}
 * @param shift {number}
 * @param targetMantissa
 * @returns {Int32Array} Returns the passed mantissa
 */
export function rightShiftMantissa (mantissa, shift, targetMantissa=mantissa) {
  if (shift === 0) return mantissa

  let mantissaLen = mantissa.length
  let targetMantissaLen = targetMantissa.length

  let integerShift = (shift / 30) | 0
  let bitShift = shift % 30

  if (bitShift === 0) {
    let lastFilledIndex = Math.min(mantissaLen - 1, targetMantissaLen - integerShift - 1)

    // Since it's a multiple of 30, we just copy everything over
    for (let i = lastFilledIndex; i >= 0; --i) {
      targetMantissa[i + integerShift] = mantissa[i]
    }

    // Fill empty stuff with zeros
    for (let i = 0; i < integerShift; ++i) targetMantissa[i] = 0
    for (let i = lastFilledIndex + integerShift + 1; i < targetMantissaLen; ++i) targetMantissa[i] = 0
  } else {
    let invBitShift = 30 - bitShift
    let firstNeededIndex = mantissaLen - integerShift - 1
    let lastFilledIndex = firstNeededIndex + integerShift + 1

    targetMantissa[lastFilledIndex] = 0

    for (let i = firstNeededIndex; i >= 0; --i) {
      let word = mantissa[i]

      // Two components from each word
      if (i !== firstNeededIndex)
        targetMantissa[i + integerShift + 1] += (word & ((1 << bitShift) - 1)) << invBitShift
      targetMantissa[i + integerShift] = word >> bitShift
    }

    for (let i = 0; i < integerShift; ++i) targetMantissa[i] = 0
    for (let i = lastFilledIndex; i < targetMantissaLen; ++i) targetMantissa[i] = 0
  }
}

/**
 * Left shift a mantissa by shift bits, destroying any bits that come off the front, writing the result to target.
 * This function supports aliasing.
 * @param mantissa {Int32Array}
 * @param shift {number}
 * @param targetMantissa
 * @returns {Int32Array} Returns the passed mantissa
 */
export function leftShiftMantissa (mantissa, shift, targetMantissa=mantissa) {
  if (shift === 0) {
    if (targetMantissa !== mantissa) {
      let targetMantissaLen = targetMantissa.length
      let copyLen = Math.min(targetMantissaLen, mantissa.length)

      for (let i = copyLen; i >= 0; --i) {
        targetMantissa[i] = mantissa[i]
      }

      for (let i = targetMantissaLen - 1; i > copyLen; --i) {
        targetMantissa[i] = 0
      }
    }

    return mantissa
  }

  let mantissaLen = mantissa.length
  let targetMantissaLen = targetMantissa.length

  let integerShift = (shift / 30) | 0
  let bitShift = shift % 30

  if (bitShift === 0) {
    // Since it's a multiple of 30, we just copy everything over
    for (let i = integerShift; i < mantissaLen; ++i) {
      targetMantissa[i - integerShift] = mantissa[i]
    }

    // Fill empty stuff with zeros
    for (let i = mantissaLen - integerShift; i < targetMantissaLen; ++i) {
      targetMantissa[i] = 0
    }
  } else {
    let invBitShift = 30 - bitShift

    for (let i = integerShift; i < mantissaLen; ++i) {
      targetMantissa[i - integerShift] = ((mantissa[i] << bitShift) & 0x3fffffff) + ((i < mantissaLen - 1) ? (mantissa[i + 1] >> invBitShift) : 0)
    }

    for (let i = mantissaLen - integerShift; i < targetMantissaLen; ++i) {
      targetMantissa[i] = 0
    }
  }
}

/**
 * Multiply a mantissa by an integer between 1 and 2^30 - 1, returning a new mantissa and a shift amount. The shift
 * amount is the number of words by which the new mantissa is shifted relative to the first (and is thus either 0 or 1).
 * @param mantissa
 * @param precision
 * @param int
 * @param targetMantissa
 * @param roundingMode
 * @returns {number} The shift of the operation
 */
export function multiplyMantissaByInteger (mantissa, int, precision, targetMantissa, roundingMode=CURRENT_ROUNDING_MODE) {
  let newMantissa = new Int32Array(neededWordsForPrecision(precision) + 1) // extra word for overflow

  // Decompose the given integer into two 15-bit words for the multiplication
  let word1Lo = int & 0x7FFF
  let word1Hi = int >> 15

  let carry = 0
  for (let i = mantissa.length - 1; i >= 0; --i) {
    // Multiply the word, storing the low part and tracking the high part
    let word = mantissa[i]

    let word2Lo = word & 0x7FFF
    let word2Hi = word >> 15

    let low = Math.imul(word1Lo, word2Lo), high = Math.imul(word1Hi, word2Hi)
    let middle = Math.imul(word2Lo, word1Hi) + Math.imul(word1Lo, word2Hi)

    low += ((middle & 0x7FFF) << 15) + carry
    if (low > 0x3FFFFFFF) {
      high += low >> 30
      low &= 0x3FFFFFFF
    }

    high += middle >> 15

    newMantissa[i + 1] = low
    carry = high
  }

  newMantissa[0] = carry
  let shift = 1

  if (carry === 0) {
    // Shift left; there was no carry after all
    for (let i = 0; i < newMantissa.length - 1; ++i) {
      newMantissa[i] = newMantissa[i + 1]
    }

    newMantissa[newMantissa.length - 1] = 0
    shift -= 1
  }

  let roundingShift = roundMantissaToPrecision(newMantissa, precision, targetMantissa, roundingMode)

  return shift + roundingShift
}

/**
 * Multiply two mantissas TODO make more efficient
 * @param mant1
 * @param mant2
 * @param precision
 * @param targetMantissa
 * @param roundingMode
 * @returns {number} The corresponding shift
 */
export function multiplyMantissas (mant1, mant2, precision, targetMantissa, roundingMode=CURRENT_ROUNDING_MODE) {
  let arr = new Int32Array(mant1.length + mant2.length + 1)

  // Will definitely optimise later
  for (let i = mant1.length; i >= 0; --i) {
    let mant1Word = mant1[i] | 0
    let mant1WordLo = mant1Word & 0x7FFF
    let mant1WordHi = mant1Word >> 15

    let carry = 0, j = mant2.length - 1
    for (; j >= 0; --j) {
      let mant2Word = mant2[j] | 0
      let mant2WordLo = mant2Word & 0x7FFF
      let mant2WordHi = mant2Word >> 15

      let low = Math.imul(mant1WordLo, mant2WordLo), high = Math.imul(mant1WordHi, mant2WordHi)
      let middle = (Math.imul(mant2WordLo, mant1WordHi) + Math.imul(mant1WordLo, mant2WordHi)) | 0

      low += ((middle & 0x7FFF) << 15) + carry + arr[i + j + 1]
      low >>>= 0

      if (low > 0x3FFFFFFF) {
        high += low >>> 30
        low &= 0x3FFFFFFF
      }

      high += middle >> 15

      arr[i + j + 1] = low
      carry = high
    }

    arr[i] += carry
  }

  let shift = 0

  if (arr[0] === 0) {
    leftShiftMantissa(arr, 30)
    shift -= 1
  }

  shift += roundMantissaToPrecision(arr, precision, targetMantissa, roundingMode)

  return shift
}

export function sqrtMantissa (mantissa, precision, targetMantissa, roundingMode=CURRENT_ROUNDING_MODE) {
  // We proceed by estimating the square root, then do a root finding search basically
}

/**
 * Not yet fully resistant, but a significantly faster (2x speedup) multiplication operation that works by only
 * multiplying the words which must appear in the final result. Hard to optimize beyond here until we get to Karatsuba
 * and the like, which isn't really relevant at these small scales.
 * @param mant1
 * @param mant2
 * @param precision
 * @param targetMantissa
 * @param roundingMode
 * @returns {number}
 */
export function multiplyMantissas2 (mant1, mant2, precision, targetMantissa, roundingMode=CURRENT_ROUNDING_MODE) {
  let mant1Len = mant1.length, mant2Len = mant2.length
  let targetMantissaLen = targetMantissa.length

  for (let i = 0; i < targetMantissaLen; ++i) targetMantissa[i] = 0

  let highestWord = 0

  // Only add the products whose high words are within targetMantissa
  for (let i = Math.min(targetMantissaLen, mant1Len - 1); i >= 0; --i) {
    let mant1Word = mant1[i]
    let mant1Lo = mant1Word & 0x7FFF
    let mant1Hi = mant1Word >> 15

    let carry = 0
    for (let j = Math.min(targetMantissaLen - i, mant2Len - 1); j >= 0; --j) {
      let writeIndex = i + j

      let mant2Word = mant2[j]
      let mant2Lo = mant2Word & 0x7FFF
      let mant2Hi = mant2Word >> 15

      let low = Math.imul(mant1Lo, mant2Lo)
      let high = Math.imul(mant1Hi, mant2Hi)
      let middle = (Math.imul(mant1Hi, mant2Lo) + Math.imul(mant1Lo, mant2Hi)) | 0

      low += ((middle & 0x7FFF) << 15) + ((writeIndex < targetMantissaLen) ? targetMantissa[writeIndex] : 0) + carry
      low >>>= 0

      if (low > 0x3FFFFFFF) {
        high += low >>> 30
        low &= 0x3FFFFFFF
      }

      high += middle >> 15

      if (writeIndex < targetMantissaLen) targetMantissa[writeIndex] = low
      carry = high
    }

    if (i > 0) {
      targetMantissa[i - 1] += carry
    } else {
      highestWord = carry
    }
  }

  let shift = -1

  if (highestWord !== 0) {
    rightShiftMantissa(targetMantissa, 30)

    targetMantissa[0] = highestWord
    shift = 0
  }

  let roundingShift = roundMantissaToPrecision(targetMantissa, precision, targetMantissa, roundingMode)

  return shift + roundingShift
}

/**
 * Ah, the formidable division. I really don't know how to do division besides a boring shift and subtract approach,
 * generating a couple bits at a time. So in keeping with the challenge of doing this stuff without outside references,
 * I guess that's what I'll do for now!!!11
 * @param mant1 {Int32Array}
 * @param mant2 {Int32Array}
 * @param precision {number}
 * @param targetMantissa {Int32Array}
 * @param roundingMode {number}
 */
export function divMantissas (mant1, mant2, precision, targetMantissa, roundingMode=CURRENT_ROUNDING_MODE) {
  // Init mant1Copy with a shifted copy of mant1
  let mant1Copy = new Int32Array(Math.max(mant1.length + 1, mant2.length))
  for (let i = 0; i < mant1.length; ++i) mant1Copy[i+1] = mant1[i]

  /**
   * Get the number of leading zeros in the shifting mantissa, plus 2 (due to clz32), and -1 if it's all zeros.
   * @returns {number}
   */
  function getMant1LeadingZeros () {
    for (let i = 0; i < mant1Copy.length; ++i) {
      let word = mant1Copy[i]
      if (word > 0) return Math.clz32(word) + 30 * i
    }

    return -1
  }

  for (let i = targetMantissa.length - 1; i >= 0; --i) {
    targetMantissa[i] = 0
  }

  let newMantissaShift = 1

  // Index of the highest bit and last significant bit within newMantissa (uninitialized) TODO
  let firstBitIndex = -1, lastSignificantBit = 1 << 30 // maybe v8 can optimize this to be an integer :P

  // Index of the current bit we are writing to
  let bitIndex = -1

  // Info of the bits coming after the last significant bit TODO
  let trailingInfo = 0

  function pushZeroBits (count) {
    if (bitIndex === -1 && count >= 31) {
      // For the cases in which the first word is 0
      newMantissaShift -= 1
      bitIndex += count - 30
    } else {
      bitIndex += count
    }
  }

  function pushOneBit () {
    if (bitIndex > lastSignificantBit) {
      // At this point, we can determine the trailing info.

      if (bitIndex === lastSignificantBit + 1) {
        if (getMant1LeadingZeros() === -1) {
          trailingInfo = 2
        } else {
          trailingInfo = 3
        }
      } else {
        trailingInfo = 1
      }

      return true
    }

    let subIndex = (bitIndex / 30) | 0
    let bit = (29 - (bitIndex % 30))

    targetMantissa[subIndex] += 1 << bit

    if (firstBitIndex === -1) {
      firstBitIndex = bitIndex
      lastSignificantBit = firstBitIndex + precision - 1
    }

    return false
  }

  let mant2LeadingZeros = Math.clz32(mant2[0])

  while (true) {
    let mant1Zeros = getMant1LeadingZeros()

    if (mant1Zeros === -1) break
    let shift = mant1Zeros - mant2LeadingZeros

    if (shift !== 0) {
      leftShiftMantissa(mant1Copy, shift)
      pushZeroBits(shift)
    }

    let cmp = compareMantissas(mant1Copy, mant2)
    if (cmp === -1) {
      leftShiftMantissa(mant1Copy, 1)
      pushZeroBits(1)
    } else if (cmp === 0) {
      pushOneBit()
      break
    }

    // Subtract mant2 from mant1
    let carry = 0
    for (let i = mant2.length - 1; i >= 0; --i) {
      let word = mant1Copy[i] - mant2[i] - carry
      if (word < 0) {
        word += BIGFLOAT_WORD_SIZE
        carry = 1
      } else {
        carry = 0
      }

      mant1Copy[i] = word
    }

    // Note that carry will sometimes be -1 at this point, when the cmp === -1 shift has truncated off the highest bit
    // of mant1Copy. This is intentional

    if (pushOneBit()) break
  }

  const roundingShift = roundMantissaToPrecision(targetMantissa, precision, targetMantissa, roundingMode, trailingInfo, 1)
  return newMantissaShift + roundingShift
}

let dRecipConst1 = new Int32Array([0x1, 0x38787878, 0x1e1e1e00]) // = 32/17
let dRecipConst2 = new Int32Array([0x2, 0x34b4b4b4, 0x2d2d2e00]) // = 48/17


export function reciprocalMantissa (mantissa, precision, targetMantissa, roundingMode=CURRENT_ROUNDING_MODE) {

}

/**
 * Multiply a mantissa by a given power of two, with a rounding mode and precision if the target mantissa is shorter
 * than the given mantissa. This function allows aliasing.
 * @param mantissa
 * @param power {number} Exponent
 * @param targetMantissa
 * @param precision {number}
 * @param roundingMode
 */
function multiplyMantissaPow2 (mantissa, power, precision, targetMantissa, roundingMode=CURRENT_ROUNDING_MODE) {
  let clz = Math.clz32(mantissa[0]) - 2
  let newClz = clz - power

  let expShift = 0

  if (newClz > 29 || newClz < 0) {
    expShift = Math.floor(newClz / 30)
    newClz = newClz - expShift * 30
  }

  let bitshift = newClz - clz
  if (bitshift <= 0) {
    leftShiftMantissa(mantissa, -bitshift, targetMantissa)
  } else if (bitshift > 0) {
    rightShiftMantissa(mantissa, bitshift, targetMantissa)
  }

  let roundingShift = roundMantissaToPrecision(targetMantissa, precision, targetMantissa, roundingMode)

  return roundingShift - expShift
}

/**
 * Divide two mantissas and write the result to a target mantissa.
 * @param mant1
 * @param mant2
 * @param precision
 * @param targetMantissa
 * @param roundingMode
 */
export function divMantissas2 (mant1, mant2, precision, targetMantissa, roundingMode=CURRENT_ROUNDING_MODE) {
  // We use a Newton-Raphson approach, narrowing down on the result with quadratic speed. The first step is determining
  // the reciprocal of mant2, then multiplying by mant1. The approach is based on the wikipedia article
  // https://en.wikipedia.org/wiki/Division_algorithm (yes, I gave up trying to figure this stuff out on my own)

  let sdRecip = createMantissa(precision)

  // Estimating the reciprocal
  let tmp = new Int32Array(2)
  let rEst = new Int32Array(2)

  // Shift the denominator until mant[0] > 1 << 29
  let sd = createMantissa(precision)
  let dShift = clzMantissa(mant2)

  if (dShift === -1) throw new RangeError("Division by zero")
  leftShiftMantissa(mant2, dShift, sd)

  // Initial estimate for the reciprocal of the denominator (low precision, may inline this in future)

  // 1/D = 48/17 - 32/17 * D for 0.5 <= D < 1 is the estimate
  let sdShift = multiplyMantissas2(dRecipConst1, sd, 30, tmp, ROUNDING_MODE.WHATEVER)
  subtractMantissas(dRecipConst2, tmp, -sdShift, 30, rEst, ROUNDING_MODE.WHATEVER)

  // Copy over the low-precision estimate
  sdRecip[0] = rEst[0]
  sdRecip[1] = rEst[1]

  let one = new Int32Array([1])

  // X_(n+1) = X_n + X_n(1 - D * X_n)
  let innerP = createMantissa(precision) // = D * X_n
  let innerS = createMantissa(precision) // = 1 - innerP
  let outerP = createMantissa(precision) // = X_n * innerS
  let outerS = createMantissa(precision) // = X_n + outerP

  for (let i = 0; i < 5; ++i) {
    let mShift = multiplyMantissas2(sd, sdRecip, precision, innerP /*target*/, ROUNDING_MODE.WHATEVER) // D * X_n
    let sShift = 0
    let isInnerPositive = mShift === -1 // inner is positive if D * X_n < 1, so positive when the shift is -1

    if (isInnerPositive) {
      sShift = subtractMantissas(one, innerP, 1, precision, innerS /*target*/, ROUNDING_MODE.WHATEVER)
    } else {
      sShift = subtractMantissas(innerP, one, 0, precision, innerS /*target*/, ROUNDING_MODE.WHATEVER)
    }

    let mShift2 = multiplyMantissas2(innerS, sdRecip, precision, outerP /*target*/, ROUNDING_MODE.WHATEVER)

    if (isInnerPositive) {
      addMantissas(sdRecip, outerP, -(mShift2 + sShift + 1), precision, outerS /*target*/, ROUNDING_MODE.WHATEVER)
    } else {
      subtractMantissas(sdRecip, outerP, -(mShift2 + sShift + 1), precision, outerS /*target*/, ROUNDING_MODE.WHATEVER)
    }

    roundMantissaToPrecision(outerS, precision, sdRecip, ROUNDING_MODE.WHATEVER)
  }

  // 1 < sdRecip <= 2 is now 1/sd, so we multiply by the numerator
  let mulShift = multiplyMantissas2(mant1, sdRecip, precision, innerP /* tmp target */, ROUNDING_MODE.WHATEVER)
  let powShift = multiplyMantissaPow2(innerP, dShift, precision, targetMantissa, ROUNDING_MODE.WHATEVER)

  return -1 - mulShift + powShift
}

// debug mantissa function
function dM (m, e=0) {
  return new BigFloat(1, e, 0, m).toNumber()
}

/**
 * Determine which of two mantissas is larger. -1 if mant1 is smaller, 0 if they are equal, and 1 if mant2 is larger.
 * @param mant1
 * @param mant2
 */
export function compareMantissas (mant1, mant2) {
  let swapResult = false
  if (mant1.length < mant2.length) {
    let tmp = mant1
    mant1 = mant2
    mant2 = tmp

    swapResult = true
  }

  let mant1Len = mant1.length, mant2Len = mant2.length

  let result = 0
  for (let i = 0; i < mant1Len; ++i) {
    let mant1Word = mant1[i]
    let mant2Word = (i < mant2Len) ? mant2[i] : 0

    if (mant1Word > mant2Word) {
      result = 1
      break
    } else if (mant1Word < mant2Word) {
      result = -1
      break
    }
  }

  return swapResult ? -result : result
}

export function prettyPrintFloat (mantissa, precision) {
  let words = []
  let indices = []

  for (let i = 0; i < mantissa.length; ++i) {
    words.push(leftZeroPad(mantissa[i].toString(2), BIGFLOAT_WORD_BITS, '0'))
    indices.push("0    5    10   15   20   25   ")
  }

  function insert (index, wordChar, indicesChar) {
    let wordIndex = Math.floor(index / BIGFLOAT_WORD_BITS)
    let subIndex = index - wordIndex * BIGFLOAT_WORD_BITS

    let wordWord = words[wordIndex]
    let indicesWord = indices[wordIndex]

    words[wordIndex] = wordWord.slice(0, subIndex) + wordChar + wordWord.slice(subIndex)
    indices[wordIndex] = indicesWord.slice(0, subIndex) + indicesChar + indicesWord.slice(subIndex)
  }

  // Insert [ ... ] surrounding the actual meaningful parts of the mantissa
  if (precision) {
    let offset = Math.clz32(mantissa[0]) - 2

    let startIndex = offset
    let endIndex = offset + precision

    insert(startIndex, '[', ' ')
    insert(endIndex, ']', ' ')
  }

  words = words.join(' | ')
  indices = indices.join(' | ')

  return words + '\n' + indices
}

// Works for f in -0.5 <= f <= 0.5 using the straightforward Taylor series expansion
function slowLn1pBounded (f, precision) {
  // if (!(-0.5 <= f && f <= 0.5)) throw new RangeError("f must be between -0.5 and 0.5")

  precision += 10

  let fExp = BigFloat.fromNumber(1)

  let fExp2 = BigFloat.new(precision)
  let term = BigFloat.new(precision)
  let accum = BigFloat.new(precision)
  let accum2 = BigFloat.new(precision)

  let bitsPerIteration = -BigFloat.floorLog2(f, true)
  let iterations = precision / bitsPerIteration

  // The rate of convergence depends on f, with about -log2(abs(f)) bits being generated each time. Since we
  for (let i = 0; i < iterations; ++i) {
    BigFloat.mulTo(fExp, f, fExp2, ROUNDING_MODE.WHATEVER)
    BigFloat.divNumberTo(fExp2, ((i & 1) ? -1 : 1) * (i + 1), term, ROUNDING_MODE.WHATEVER)
    BigFloat.addTo(accum, term, accum2, ROUNDING_MODE.WHATEVER)

    // Swap the accumulators
    let tmp = accum
    accum = accum2
    accum2 = tmp

    tmp = fExp
    fExp = fExp2
    fExp2 = tmp
  }

  return accum
}

// Compute ln(x) for x in [0.5, 1.5] so we can later shift arguments via multiplication and subtraction into a
// neighborhood of 1 by caching some of these values, then using slowLn1pBounded or arctanhSmallRange
export function lnBaseCase (f, precision) {
  // ln(x) = 2 arctanh((x-1)/(x+1))
  precision += 10

  let atanhArg = BF.new(precision)
  let argNum = BF.new(precision), argDen = BF.new(precision)

  BF.subNumberTo(f, 1, argNum)
  BF.addNumberTo(f, 1, argDen)
  BF.divTo(argNum, argDen, atanhArg)

  let result = arctanhSmallRange(atanhArg, precision - 10)
  BF.mulPowTwoTo(result, 1, result)


  return result
}

// Compute atanh(f) for f in [0, 1/5] for use in natural log calculations
export function arctanhSmallRange (f, precision) {
  precision += 10

  // atanh(x) = x + x^3 / 3 + x^5 / 5 + ... meaning at worst we have convergence at -log2((1/5)^2) = 4.6 bits / iteration
  let accum = BF.new(precision), accumSwap = BF.new(precision), fSq = BF.new(precision), ret = BF.new(precision)
  BF.mulTo(f, f, fSq)

  // Compute 1 + x^2 / 3 + x^4 / 5 + ...
  let pow = BF.fromNumber(1, precision)
  let powSwap = BF.new(precision), powDiv = BF.new(precision)

  let bitsPerIteration = -BigFloat.floorLog2(fSq)
  let iterations = precision / bitsPerIteration

  for (let i = 0; i < iterations; ++i) {
    BF.divNumberTo(pow, 2 * i + 1, powDiv)

    BF.mulTo(pow, fSq, powSwap)
    ;[ powSwap, pow ] = [ pow, powSwap ]

    BF.addTo(accum, powDiv, accumSwap)
    ;[ accumSwap, accum ] = [ accum, accumSwap ]
  }

  // Multiply by x
  BF.mulTo(accum, f, ret)

  return ret
}

/**
 * Compute e^f for 0.5 <= f < 1. e^f = 1 + f * (1 + f/2 * (1 + f/3 * ... ) ) )
 */
export function expBaseCase (f, precision, target) {
  let tmp = BigFloat.new(precision)
  let tmp2 = BigFloat.new(precision)

  // The number of iterations depends on f. Since the term is f^n / n!, we take logs -> n ln(f) - ln(n!) = n ln(f) - n ln(n) + n
  // We want this to be less than ln(2^-(p + 1)) = -(p + 1) * ln(2) or so. We write the equation as n (ln f - ln n + 1) = -(p+1) * ln 2.
  // This is an annoying equation. For now I just came up with an approximation by picking n = c*p for a constant c and
  // fiddling around with it, till I got the approximation n = -l / (ln(f) - (ln(-l/(ln(f) - ln(p) + 2)) + 1), where l = p ln(2).
  // No clue how it works, but it seems to be good enough. At 999 bits precision and 0.5 it reports 153 iterations are needed,
  // while only 148 are sufficient. Oh well.

  let pln2 = (precision + 1) * Math.log(2)
  let lnf = Math.log(Math.abs(f.toNumber(ROUNDING_MODE.WHATEVER)))
  let lnp = Math.log(precision)

  const iters = Math.ceil(-pln2 / (lnf - Math.log(-pln2 / (lnf - lnp + 2)) + 1))

  BigFloat.divNumberTo(f, iters, tmp)
  BigFloat.addNumberTo(tmp, 1, target)

  for (let m = iters - 1; m > 0; --m) {
    BigFloat.divNumberTo(f, m, tmp)
    BigFloat.mulTo(tmp, target, tmp2)

    BigFloat.addNumberTo(tmp2, 1, target)
  }
}

const CACHED_CONSTANTS = {
  lnValues: new Map(),
  recipLnValues: new Map()
}

const recip2Pow30 = pow2(-BIGFLOAT_WORD_BITS)
const recip2Pow60 = pow2(-2 * BIGFLOAT_WORD_BITS)

/**
 * Compute and return ln(x), intended for x between 1 and 2 for higher series convergence in ln. +- 1 ulp
 * @param value
 * @param minPrecision
 * @returns {any|BigFloat}
 */
function getCachedLnValue (value, minPrecision) {
  let c = CACHED_CONSTANTS.lnValues.get(value)

  if (c && c.prec >= minPrecision) return c

  if (value > 2 || value < 1) {
    c = BigFloat.ln(value, minPrecision, ROUNDING_MODE.WHATEVER)
  } else {
    let f = BigFloat.fromNumber(value)

    c = lnBaseCase(f, minPrecision)
  }

  CACHED_CONSTANTS.lnValues.set(value, c)

  return c
}

/**
 * Compute and return 1/ln(x), intended for x = 10 and 2 for base conversions and the like.
 * @param value {number}
 * @param minPrecision {number}
 * @returns {any|BigFloat}
 */
export function getCachedRecipLnValue (value, minPrecision) {
  let c = CACHED_CONSTANTS.recipLnValues.get(value)

  if (c && c.prec >= minPrecision) return c

  c = BigFloat.ln(value, minPrecision + 1)
  c = BigFloat.div(1, c, minPrecision + 1)

  CACHED_CONSTANTS.recipLnValues.set(value, c)

  return c
}

/**
 * Takes in an arbitrary input and converts to a corresponding big float. If passed a BigFloat, it does nothing; if
 * passed a number, it converts to BigFloat. Used for user-facing operations
 * @param arg
 */
function cvtToBigFloat (arg) {
  if (arg instanceof BigFloat) return arg
  if (typeof arg === "number") return BigFloat.fromNumber(arg, 53)

  throw new TypeError(`Cannot convert argument ${arg} to BigFloat`)
}

export class BigFloat {

  /**
   * BEGIN CONSTRUCTORS
   */

  /**
   * Base constructor. Should generally not be called directly by the user.
   * @param sign {number} Sign of the float (-1, 0, 1, -Infinity, or Infinity)
   * @param exp {number} Exponent of the float
   * @param prec {number} Precision, in bits, of the float
   * @param mant {Int32Array} Storage of the float bits
   */
  constructor (sign, exp, prec, mant) {
    this.sign = sign
    this.exp = exp
    this.prec = prec
    this.mant = mant
  }

  /**
   * Construct a new BigFloat from a JS number with a given precision and rounding in the correct direction if the
   * precision is less than 53.
   * @param num {number} JS number to convert from
   * @param precision {number} Precision, in bits, of the float
   * @param roundingMode {number} Enum of which direction to round in
   * @returns {BigFloat}
   */
  static fromNumber (num, precision = CURRENT_PRECISION, roundingMode=CURRENT_ROUNDING_MODE) {
    let float = BigFloat.new(precision)
    float.setFromNumber(num, roundingMode)

    return float
  }

  /**
   * Create a new BigFloat with a given precision, initialized to a value of 0.
   * @param prec {number} Precision, in bits, of the float
   * @returns {BigFloat}
   */
  static new (prec=CURRENT_PRECISION) {
    if (prec < BIGFLOAT_MIN_PRECISION_BITS || prec > BIGFLOAT_MAX_PRECISION_BITS || !Number.isInteger(prec))
      throw new RangeError(`BigFloat precision must be an integer in the range [${BIGFLOAT_MIN_PRECISION_BITS}, ${BIGFLOAT_MAX_PRECISION_BITS}]`)

    return new BigFloat(0, 0, prec, createMantissa(prec))
  }

  /*
   * BEGIN COMPARISON OPERATORS
   */

  /**
   * Compare the magnitude of two floats, ignoring their signs entirely. Returns -1 if |f1| < |f2|, 0 if |f1| = |f2|,
   * and 1 if |f1| > |f2|.
   * @param f1 {BigFloat}
   * @param f2 {BigFloat}
   * @returns {number}
   */
  static cmpFloatMagnitudes (f1, f2) {
    if (f1.exp < f2.exp) {
      return -1
    } else if (f1.exp > f2.exp) {
      return 1
    } else {
      return compareMantissas(f1.mant, f2.mant)
    }
  }

  /**
   * Compare two floats. Returns -1 if f1 < f2, 0 if f1 = f2, and 1 if f1 > f2. If either is NaN, returns NaN.
   * @param f1 {BigFloat}
   * @param f2 {BigFloat}
   * @returns {number}
   */
  static cmpFloats (f1, f2) {
    const f1Sign = f1.sign
    const f2Sign = f2.sign

    if (f1Sign < f2Sign) return -1
    if (f1Sign > f2Sign) return 1

    if (f1Sign === 0 && f2Sign === 0) return 0

    if (!Number.isFinite(f1Sign) || !Number.isFinite(f2Sign)) {
      // Then they are either both a same signed infinity, or two NaNs

      if (Number.isNaN(f1Sign) || Number.isNaN(f2Sign)) return NaN
      return 0
    }

    if (f1.exp < f2.exp) {
      return -1
    } else if (f1.exp > f2.exp) {
      return 1
    } else {
      return f1.sign * compareMantissas(f1.mant, f2.mant)
    }
  }

  /**
   * BEGIN PRIMITIVE OPERATORS (ADDITION, MULTIPLICATION, ETC.).
   *
   * For maximum speed, these operators are provided in a "write-to" format to limit the number of needed allocations
   * of mantissas, et cetera. Seems annoying, but it actually provides a huge speedup relative to returning floats. More
   * convenient operations are provided as add(...), sub(...), and so on.
   */

  /**
   * Add floats f1 and f2 to the target float, using the precision of the target. target must not be either of f1 or f2.
   * @param f1 {BigFloat} The first float
   * @param f2 {BigFloat} The second float
   * @param target {BigFloat} The target float
   * @param roundingMode {number} The rounding mode
   * @param flipF2Sign {boolean} Whether to flip the sign of f2 (used to simplify the subtraction code)
   */
  static addTo (f1, f2, target, roundingMode=CURRENT_ROUNDING_MODE, flipF2Sign=false) {
    let f1Sign = f1.sign
    let f2Sign = flipF2Sign ? -f2.sign : f2.sign

    // Special cases
    if (!Number.isFinite(f1Sign) || !Number.isFinite(f2Sign)) {
      target.sign = f1Sign + f2Sign
      return
    }

    if (f1Sign === 0) {
      target.setFromFloat(f2, roundingMode)
      if (flipF2Sign)
        target.sign *= -1

      return
    }

    if (f2Sign === 0) {
      target.setFromFloat(f1, roundingMode)
      return
    }

    // Used to swap it so that f1 > f2
    function swapF1F2 () {
      let tmp = f1
      f1 = f2
      f2 = tmp

      let tmp2 = f1Sign
      f1Sign = f2Sign
      f2Sign = tmp2
    }

    let targetPrecision = target.prec
    let targetMantissa = target.mant

    if (f1Sign !== f2Sign) {
      let cmp = BigFloat.cmpFloatMagnitudes(f1, f2)
      let sign = 0

      if (cmp === 0) {
        target.setZero()
        return
      } else if (cmp === 1)
        sign = f1Sign
      else
        sign = f2Sign
      if (cmp === -1) swapF1F2()

      let shift = subtractMantissas(f1.mant, f2.mant, f1.exp - f2.exp, targetPrecision, targetMantissa, roundingMode)

      target.sign = sign
      target.exp = f1.exp + shift
    } else {
      if (f1.exp < f2.exp) swapF1F2()

      let shift = addMantissas(f1.mant, f2.mant, f1.exp - f2.exp, targetPrecision, targetMantissa, roundingMode)

      target.sign = f1Sign
      target.exp = f1.exp + shift
    }
  }

  /**
   * Add a JS number to the given float, writing the result to target
   * @param f1 {BigFloat}
   * @param num {number}
   * @param target {BigFloat}
   * @param roundingMode {number}
   */
  static addNumberTo (f1, num, target, roundingMode=CURRENT_ROUNDING_MODE) {
    DOUBLE_STORE.setFromNumber(num)

    BigFloat.addTo(f1, DOUBLE_STORE, target, roundingMode)
  }

  /**
   * Subtract two numbers and write the result to the target.
   * @param f1 {BigFloat}
   * @param f2 {BigFloat}
   * @param target {BigFloat}
   * @param roundingMode {number}
   */
  static subTo (f1, f2, target, roundingMode=CURRENT_ROUNDING_MODE) {
    BigFloat.addTo(f1, f2, target, roundingMode, true)
  }

  /**
   * Subtract a JS number from the given float, writing the result to target
   * @param f1 {BigFloat}
   * @param num {number}
   * @param target {BigFloat}
   * @param roundingMode {number}
   */
  static subNumberTo (f1, num, target, roundingMode=CURRENT_ROUNDING_MODE) {
    DOUBLE_STORE.setFromNumber(num)

    BigFloat.subTo(f1, DOUBLE_STORE, target, roundingMode)
  }

  /**
   * Multiply two big floats and write the result to the target.
   * @param f1 {BigFloat}
   * @param f2 {BigFloat}
   * @param target {BigFloat}
   * @param roundingMode {number}
   */
  static mulTo (f1, f2, target, roundingMode=CURRENT_ROUNDING_MODE) {
    let f1Sign = f1.sign
    let f2Sign = f2.sign

    target.sign = f1Sign * f2Sign

    if (f1Sign === 0 || f2Sign === 0 || !Number.isFinite(f1Sign) || !Number.isFinite(f2Sign)) return

    if (f1.exp < f2.exp) {
      [ f1, f2 ] = [ f2, f1 ]
    }

    let shift = multiplyMantissas2(f1.mant, f2.mant, target.prec, target.mant, roundingMode)
    target.exp = f1.exp + f2.exp + shift
  }

  /**
   * Multiply a float by a JS number and write the result to the target. This function supports aliasing; the target
   * float may be the same float as the first float. Aliasing should generally only be used when the number is a small
   * integer.
   * @param float {BigFloat}
   * @param num {number}
   * @param target {BigFloat}
   * @param roundingMode {number}
   */
  static mulNumberTo (float, num, target, roundingMode=CURRENT_ROUNDING_MODE) {
    let isAliased = float === target

    if (num === 0) {
      target.setZero()
      return
    } else if (num === 1) {
      if (!isAliased) target.setFromFloat(float)
      return
    }

    if (Number.isInteger(num)) {
      let absNum = Math.abs(num)

      if (absNum <= 0x3fffffff) {
        let shift = multiplyMantissaByInteger(float.mant, absNum, target.prec, target.mant, roundingMode)

        target.sign = float.sign * Math.sign(num)
        target.exp = float.exp + shift

        return
      }
    }

    DOUBLE_STORE.setFromNumber(num)

    if (isAliased) {
      let tmp = BigFloat.new(target.prec)

      BigFloat.mulTo(float, DOUBLE_STORE, tmp, roundingMode)
      target.set(tmp)
    } else {
      BigFloat.mulTo(float, DOUBLE_STORE, target, roundingMode)
    }
  }

  /**
   * Multiply a float by a power of two, writing the result to the target. This operation is very fast because it can
   * be accomplished via only bitshifts.
   * @param float
   * @param exponent
   * @param target
   * @param roundingMode
   */
  static mulPowTwoTo (float, exponent, target, roundingMode=CURRENT_ROUNDING_MODE) {
    if (float.sign === 0 || !Number.isFinite(float.sign)) {
      target.sign = float.sign
      return
    }

    let clz = Math.clz32(float.mant[0]) - 2
    let newClz = clz - exponent

    let expShift = 0

    if (newClz > 29 || newClz < 0) {
      expShift = Math.floor(newClz / 30)
      newClz = newClz - expShift * 30
    }

    target.exp = float.exp - expShift

    let bitshift = newClz - clz
    if (bitshift < 0) {
      leftShiftMantissa(float.mant, -bitshift, target.mant)
    } else if (bitshift > 0) {
      rightShiftMantissa(float.mant, bitshift, target.mant)
    } else {
      roundMantissaToPrecision(float.mant, target.prec, target.mant, roundingMode)
    }

    target.sign = float.sign
  }

  /**
   * Subtract two numbers and write the result to the target.
   * @param f1 {BigFloat}
   * @param f2 {BigFloat}
   * @param target {BigFloat}
   * @param roundingMode {number}
   */
  static divTo (f1, f2, target, roundingMode=CURRENT_ROUNDING_MODE) {
    let f1Sign = f1.sign
    let f2Sign = f2.sign

    if (f1Sign === 0 || f2Sign === 0 || !Number.isFinite(f1Sign) || !Number.isFinite(f2Sign)) {
      target.sign = f1Sign / f2Sign
      return
    }

    let shift = divMantissas(f1.mant, f2.mant, target.prec, target.mant, roundingMode)

    target.exp = f1.exp - f2.exp + shift
    target.sign = f1Sign / f2Sign
  }

  /**
   * Divide a float by a JS number and write the result to the target.
   * @param f1 {BigFloat}
   * @param num {number}
   * @param target {BigFloat}
   * @param roundingMode {number}
   */
  static divNumberTo (f1, num, target, roundingMode=CURRENT_ROUNDING_MODE) {
    DOUBLE_STORE.setFromNumber(num)

    BigFloat.divTo(f1, DOUBLE_STORE, target, roundingMode)
  }

  /**
   * Split a float f1 into an integer part and a fractional part, such that int + frac = f1, int and frac do not have
   * opposite sign, and |frac| < 1.
   * @param f1
   * @param integerPart
   * @param fracPart
   * @param roundingMode
   */
  static splitIntegerTo (f1, integerPart, fracPart, roundingMode) {
    if (f1.sign === 0) {
      integerPart.setZero()
      fracPart.setZero()
      return
    } else if (!Number.isFinite(f1.sign)) {
      if (Number.isNaN(f1.sign)) {
        integerPart.setNaN()
        fracPart.setNaN()
      } else {
        integerPart.sign = f1.sign
        fracPart.setZero()
      }

      return
    }


    // We identify which word within f1 is the one right after the decimal point and chop it there. Note the property
    // that the exponent of the integer part is always the same as f1.
    let word = f1.exp, mantLen = f1.length
    if (word <= 0) { // |f1| < 1
      fracPart.setFromFloat(f1)
      integerPart.setZero()
    } else if (word >= mantLen) {
      integerPart.setFromFloat(f1)
      fracPart.setZero()
    } else {
      // word lies within [1, mantissaLen) and thus we need to chop it.
      let intWordCount = word

      let mant = f1.mant, intPartMant = integerPart.mant, fracPartMant = fracPart.mant

      if (intPartMant.length > intWordCount) {
        for (let i = 0; i < intWordCount; ++i) intPartMant[i] = mant[i]
        for (let i = intPartMant.length - 1; i >= intWordCount; --i) intPartMant[i] = 0

        roundMantissaToPrecision(intPartMant, integerPart.prec, intPartMant, roundingMode)
      } else {
        // I am lazy to optimize this
        roundMantissaToPrecision(mant.subarray(0, word), integerPart.prec, intPartMant, roundingMode)
      }

      integerPart.exp = f1.exp
      integerPart.sign = f1.sign

      let shift
      for (shift = word; (shift < mantLen) && mant[shift] === 0; ++shift);

      if (shift === mantLen) {
        fracPart.setZero()
        return
      }

      let fracWordCount = mantLen - shift

      if (fracPartMant.length > fracWordCount) {
        for (let i = 0; i < fracWordCount; ++i) fracPartMant[i] = mant[i + shift]
        for (let i = fracPartMant.length - 1; i >= mantLen; --i) fracPartMant[i] = 0

        roundMantissaToPrecision(fracPartMant, fracPart.prec, fracPartMant, roundingMode)
      } else {
        roundMantissaToPrecision(mant.subarray(word), fracPart.prec, fracPartMant, roundingMode)
      }

      fracPart.exp = word - shift
      fracPart.sign = f1.sign
    }
  }

  // We'll deal with rounding later...
  static exp (f, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
    f = cvtToBigFloat(f)
    let sign = f.sign

    if (Number.isNaN(sign)) return BigFloat.NaN(precision)
    if (sign === 0) return BigFloat.fromNumber(1,  precision)

    let shifts = BigFloat.floorLog2(f, true)

    if (shifts < 0) {
      let ret = BigFloat.new(precision)

      expBaseCase(f, precision, ret)

      return ret
    } else {
      let tmp = BigFloat.new(precision)
      let mul1 = BigFloat.new(precision)

      BigFloat.mulPowTwoTo(f, -shifts, tmp)
      expBaseCase(tmp, precision, mul1)

      // Repeated squaring; every shift requires one squaring
      for (; shifts >= 0; --shifts) {
        BigFloat.mulTo(mul1, mul1, tmp)
        ;[ mul1, tmp ] = [ tmp, mul1 ]
      }

      return tmp
    }
  }

  /**
   * Return the floored base-2 logarithm of a number, which can be useful for many reasons
   * @param f1
   * @param ignoreSign
   * @returns {number}
   */
  static floorLog2 (f1, ignoreSign=false) {
    if (f1.sign === 0 || !Number.isFinite(f1.sign)) return Math.log2(f1.sign)
    if (!ignoreSign && f1.sign < 0) return NaN

    return f1.exp * 30 - Math.clz32(f1.mant[0]) + 1
  }

  static zero (precision = CURRENT_PRECISION) {
    return new BigFloat(0, 0, precision, createMantissa(precision))
  }

  static NaN (precision = CURRENT_PRECISION) {
    return new BigFloat(NaN, 0, precision, createMantissa(precision))
  }

  static Infinity (precision = CURRENT_PRECISION) {
    return new BigFloat(Infinity, 0, precision, createMantissa(precision))
  }

  static NegativeInfinity (precision = CURRENT_PRECISION) {
    return new BigFloat(-Infinity, 0, precision, createMantissa(precision))
  }

  static isNaN (f) {
    return Number.isNaN(f.sign)
  }

  static isFinite (f) {
    return Number.isFinite(f.sign)
  }

  static isZero (f) {
    return f.sign === 0
  }

  static ZERO = Object.freeze(BigFloat.fromNumber(0, 53 ))
  static ONE = Object.freeze(BigFloat.fromNumber(1, 53 ))

  /**
   * Clone this big float
   * @returns {BigFloat}
   */
  clone () {
    return new BigFloat(this.sign, this.exp, this.prec, new Int32Array(this.mant))
  }

  neg () {
    return new BigFloat(this.sign * -1, this.exp, this.prec, new Int32Array(this.mant))
  }

  /**
   * Set this float's parameters to another float's parameters
   * @param {BigFloat} float
   */
  set (float) {
    this.sign = float.sign
    this.mant = new Int32Array(float.mant)
    this.exp = float.exp
    this.prec = float.prec
  }

  /**
   * Set this float to the value of another float, keeping the current precision.
   * @param f {BigFloat}
   * @param roundingMode {number}
   */
  setFromFloat (f, roundingMode=CURRENT_ROUNDING_MODE) {
    if (f.prec === this.prec) {
      this.sign = f.sign

      let thisMant = this.mant
      for (let i = 0; i < thisMant.length; ++i) {
        thisMant[i] = f.mant[i]
      }

      this.exp = f.exp
      return
    }

    this.sign = f.sign
    this.exp = f.exp

    roundMantissaToPrecision(f.mant, this.prec, this.mant, roundingMode)
  }

  setFromNumber (num, roundingMode=CURRENT_ROUNDING_MODE) {
    if (num === 0 || !Number.isFinite(num)) {
      this.sign = num + 0
      return
    }

    // In the odd case we want a lower precision, we create a normal precision and then downcast
    if (this.prec < 53) {
      this.set(BigFloat.fromNumber(num, 53, roundingMode).toBigFloat(this.prec))
      return
    }

    const outMantissa = this.mant

    let isNumDenormal = isDenormal(num)
    let [ valExponent, valMantissa ] = getExponentAndMantissa(num)

    // Exponent of the float (2^30)^newExp
    let newExp = Math.ceil((valExponent + 1) / BIGFLOAT_WORD_BITS)

    // The mantissa needs to be shifted to the right by this much. 0 < bitshift <= 30. If the number is denormal, we
    // have to shift it by one bit less
    let bitshift = newExp * BIGFLOAT_WORD_BITS - valExponent - isNumDenormal

    let denom = pow2(bitshift + 22)
    outMantissa[0] = Math.floor(valMantissa / denom) /* from double */ + (isNumDenormal ? 0 : (1 << (30 - bitshift))) /* add 1 if not denormal */

    let rem = valMantissa % denom
    if (bitshift > 8) {
      let cow = 1 << (bitshift - 8)

      outMantissa[1] = Math.floor(rem / cow)
      outMantissa[2] = (rem % cow) << (38 - bitshift)
    } else {
      outMantissa[1] = rem << (8 - bitshift)
    }

    // Special handling; for extremely small denormal numbers, the first word is 0, so we shift them over
    if (isNumDenormal && outMantissa[0] === 0) {
      outMantissa[0] = outMantissa[1]
      outMantissa[1] = outMantissa[2]
      outMantissa[2] = 0

      newExp -= 1
    }

    this.exp = newExp
    this.sign = Math.sign(num)
  }

  /**
   * Set this number to NaN. Doesn't actually touch the mantissa
   */
  setNaN () {
    this.sign = NaN
  }

  /**
   * Set this number to 0. Doesn't actually touch the mantissa
   */
  setZero () {
    this.sign = 0
  }

  /**
   * Convert this float into a float with a different precision, rounded in the correct direction
   * @param precision
   * @param roundingMode
   */
  toBigFloat (precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
    let newMantissa = createMantissa(precision)
    let { mant, sign, exp } = this

    if (this.sign !== 0 && Number.isFinite(sign)) {
      let shift = roundMantissaToPrecision(mant, precision, newMantissa, roundingMode)

      exp += shift
    }

    return new BigFloat(sign, exp, precision, newMantissa)
  }

  /**
   * Convert this BigFloat to a normal JS number, rounding in the given direction and optionally rounding to the nearest
   * float32 value. It *does* handle denormal numbers, unfortunately for me.
   * @param roundingMode {number}
   * @param f32 {boolean} Whether to cast to a float32 instead of a float64
   * @returns {number}
   */
  toNumber (roundingMode = CURRENT_ROUNDING_MODE, f32 = false) {
    if (this.sign === 0 || !Number.isFinite(this.sign)) return this.sign

    let m = this.mant, exp = (this.exp - 1) * BIGFLOAT_WORD_BITS
    if (roundingMode === ROUNDING_MODE.WHATEVER) {
      // Short-circuit calculation for efficiency
      return pow2(exp) * (m[0] + m[1] * recip2Pow30 + (f32 ? 0 : m[2] * recip2Pow60))
    }

    let prec = f32 ? 24 : 53
    let roundedMantissa = createMantissa(prec)

    // Round to the nearest float32 or float64, ignoring denormal numbers for now
    const shift = roundMantissaToPrecision(m, prec, roundedMantissa, roundingMode)

    // Calculate an exponent and mant such that mant * 2^exponent = the number
    let mAsInt

    if (shift) {
      mAsInt = 1 << 30
    } else {
      mAsInt = roundedMantissa[0] + roundedMantissa[1] * recip2Pow30 + (f32 ? 0 : roundedMantissa[2] * recip2Pow60)
    }

    // Normalize mant to be in the range [0.5, 1), which lines up exactly with a normal double
    let expShift = flrLog2(mAsInt) + 1
    mAsInt /= pow2(expShift)
    exp += expShift

    let MIN_EXPONENT = f32 ? -148 : -1073
    let MAX_EXPONENT = f32 ? 127 : 1023
    let MIN_VALUE = f32 ? 1.175494e-38 : Number.MIN_VALUE
    let MAX_VALUE = f32 ? 3.40282347e+38 : Number.MAX_VALUE

    // We now do various things depending on the rounding mode. The range of a double's exponent is -1024 to 1023,
    // inclusive, so if the exponent is outside of those bounds, we clamp it to a value depending on the rounding mode.
    if (exp < MIN_EXPONENT) {
      if (roundingMode === ROUNDING_MODE.TIES_AWAY || roundingMode === ROUNDING_MODE.NEAREST) {
        // Deciding between 0 and Number.MIN_VALUE. Unfortunately at 0.5 * 2^1074 there is a TIE
        if (exp === MIN_EXPONENT - 1) {
          // If greater or ties away
          if (mAsInt > 0.5 || (roundingMode === ROUNDING_MODE.TIES_AWAY)) {
            return this.sign * MIN_VALUE
          }
        }

        return 0
      } else {
        if (this.sign === 1) {
          if (roundingMode === ROUNDING_MODE.TOWARD_INF || roundingMode === ROUNDING_MODE.UP) return MIN_VALUE
          else return 0
        } else {
          if (roundingMode === ROUNDING_MODE.TOWARD_ZERO || roundingMode === ROUNDING_MODE.UP) return 0
          else return -MIN_VALUE
        }
      }
    } else if (exp > MAX_EXPONENT) {
      if (exp === MAX_EXPONENT + 1) { // Bottom formula will overflow, so we adjust
        return this.sign * mAsInt * 2 * pow2(exp - 1)
      }

      if (roundingMode === ROUNDING_MODE.TIES_AWAY || roundingMode === ROUNDING_MODE.NEAREST) {
        return Infinity * this.sign
      } else if (this.sign === 1) {
        if (roundingMode === ROUNDING_MODE.TOWARD_INF || roundingMode === ROUNDING_MODE.UP) return Infinity
        else return MAX_VALUE
      } else {
        if (roundingMode === ROUNDING_MODE.TOWARD_ZERO || roundingMode === ROUNDING_MODE.UP) return -MAX_VALUE
        else return -Infinity
      }
    } else {
      return this.sign * mAsInt * pow2(exp)
    }
  }

  toUnderstandableString () {
    return prettyPrintFloat(this.mant, this.prec)
  }

  /**
   * BEGIN USER-FRIENDLY FUNCTIONS
   */

  /**
   * User-friendly add function that takes in both JS numbers and plain floats.
   * @param f1 {BigFloat|number}
   * @param f2 {BigFloat|number}
   * @param precision
   * @param roundingMode
   */
  static add (f1, f2, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
    f1 = cvtToBigFloat(f1)
    f2 = cvtToBigFloat(f2)

    let ret = BigFloat.new(precision)
    BigFloat.addTo(f1, f2, ret, roundingMode)

    return ret
  }

  /**
   * User-friendly subtraction function that takes in both JS numbers and plain floats.
   * @param f1 {BigFloat|number}
   * @param f2 {BigFloat|number}
   * @param precision
   * @param roundingMode
   */
  static sub (f1, f2, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
    f1 = cvtToBigFloat(f1)
    f2 = cvtToBigFloat(f2)

    let ret = BigFloat.new(precision)
    BigFloat.subTo(f1, f2, ret, roundingMode)

    return ret
  }

  /**
   * User-friendly divide function that takes in both JS numbers and plain floats.
   * @param f1 {BigFloat|number}
   * @param f2 {BigFloat|number}
   * @param precision
   * @param roundingMode
   */
  static div (f1, f2, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
    f1 = cvtToBigFloat(f1)
    f2 = cvtToBigFloat(f2)

    let ret = BigFloat.new(precision)
    BigFloat.divTo(f1, f2, ret, roundingMode)

    return ret
  }

  /**
   * User-friendly divide function that takes in both JS numbers and plain floats.
   * @param f1 {BigFloat|number}
   * @param f2 {BigFloat|number}
   * @param precision
   * @param roundingMode
   */
  static mul (f1, f2, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
    f1 = cvtToBigFloat(f1)
    f2 = cvtToBigFloat(f2)

    let ret = BigFloat.new(precision)
    BigFloat.mulTo(f1, f2, ret, roundingMode)

    return ret
  }

  /**
   * Returns -1 if a is less than b, 0 if they are equal, and 1 if a is greater than b
   * @param a {BigFloat|number}
   * @param b {BigFloat|number}
   */
  static cmp (a, b) {
    if (a instanceof BigFloat && b instanceof BigFloat) {
      return BigFloat.cmpFloats(a, b)
    }

    if (typeof a === "number" && typeof b === "number") {
      if (a < b) return -1
      else if (a === b) return 0
      else if (a > b) return 1
      else return NaN
    }

    if (a instanceof BigFloat && typeof b === "number") {
      if (BigFloat.isNaN(a) || Number.isNaN(b)) return NaN

      const aSign = a.sign
      const bSign = Math.sign(b)

      if (aSign < bSign) return -1
      else if (aSign > bSign) return 1

      if (aSign === Infinity || aSign === -Infinity || aSign === 0) return 0

      let aFlrLog2 = BigFloat.floorLog2(a, true)
      let bFlrLog2 = flrLog2(b * bSign)

      if (aFlrLog2 < bFlrLog2) {
        return -aSign
      } else if (aFlrLog2 > bFlrLog2) {
        return aSign
      } else {
        // Fallback
        DOUBLE_STORE.setFromNumber(b)

        return BigFloat.cmpFloats(a, DOUBLE_STORE)
      }
    } else if (typeof a === "number" && (b instanceof BigFloat)) {
      return -BigFloat.cmpNumber(b, a)
    }

    throw new Error("Invalid arguments to cmpNumber")
  }

  /**
   * Returns true if the numbers are equal (allows for JS numbers to be used)
   * @param f {BigFloat|f}
   * @returns {boolean}
   */
  equals (f) {
    return BigFloat.cmp(this, f) === 0
  }

  /**
   * Returns true if this float is greater than or equal to the argument (allows for JS numbers to be used)
   * @param f {BigFloat|f}
   * @returns {boolean}
   */
  greaterEq (f) {
    return BigFloat.cmp(this, f) >= 0
  }

  /**
   * Returns true if this float is greater than the argument (allows for JS numbers to be used)
   * @param f {BigFloat|f}
   * @returns {boolean}
   */
  greaterThan (f) {
    return BigFloat.cmp(this, f) === 1
  }

  /**
   * Returns true if this float is less than or equal to the argument (allows for JS numbers to be used)
   * @param f {BigFloat|f}
   * @returns {boolean}
   */
  lessEq (f) {
    return BigFloat.cmp(this, f) <= 0
  }

  /**
   * Returns true if this float is less than the argument (allows for JS numbers to be used)
   * @param f {BigFloat|f}
   * @returns {boolean}
   */
  lessThan (f) {
    return BigFloat.cmp(this, f) === -1
  }

  /**
   * Returns the natural logarithm of f.
   * @param f
   * @param precision
   * @param roundingMode
   * @returns {BigFloat}
   */
  static ln (f, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
    f = cvtToBigFloat(f)
    let f1Sign = f.sign

    // Special cases
    if (f1Sign === 0) {
      return BigFloat.NegativeInfinity(precision)
    } else if (f1Sign < 0) {
      return BigFloat.NaN(precision)
    } else if (!Number.isFinite(f1Sign)) {
      return BigFloat.fromNumber(f1Sign, precision)
    }

    // By what power of two to shift f, so that we get a number between 0.5 and 1
    let shift = BigFloat.floorLog2(f, true) + 1
    let tmp = BigFloat.new(precision), tmp2 = BigFloat.new(precision), m = BigFloat.new(precision)

    BigFloat.mulPowTwoTo(f, -shift, m)

    // 0.5 <= m < 1, integerPart is exponent. We have a lookup table of log(x) for x in 1 to 2, so that m
    // can be put into a quickly converging series based on the inverse hyperbolic tangent. For now we aim for
    // |1-x| < 0.125, meaning 8 brackets.
    let mAsNumber = m.toNumber(ROUNDING_MODE.WHATEVER) // Makes things easier
    let lookup = 1 + Math.floor((( 1 / mAsNumber) - 1) * 8) / 8

    // Compute ln(f * lookup) - ln(lookup)
    BigFloat.mulNumberTo(m, lookup, tmp)

    let part1 = lnBaseCase(tmp, precision)
    let part2 = getCachedLnValue(lookup, precision)

    BigFloat.subTo(part1, part2, tmp2)
    BigFloat.mulNumberTo(getCachedLnValue(2, precision), shift, tmp)

    BigFloat.addTo(tmp, tmp2, m)

    return m
  }

  /**
   * Compute the standard logarithm of f.
   * @param f {BigFloat}
   * @param precision {number}
   * @param roundingMode {number}
   * @returns {BigFloat}
   */
  static log10 (f, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
    f = cvtToBigFloat(f)

    // log10 (x) = ln(x) / ln(10)
    const num = BigFloat.ln(f, precision)
    const den = getCachedRecipLnValue(10, precision)

    return BigFloat.mul(num, den, precision)
  }

  /**
   * Compute x raised to the power y.
   * @param x
   * @param y
   * @param precision
   * @param roundingMode
   */
  static pow (x, y, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
    // x^y = exp(y ln x)
  }

  /**
   * Compute 10^f.
   * @param f
   * @param precision
   * @param roundingMode
   */
  static pow10 (f, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
    f = cvtToBigFloat(f)
    let ln10 = getCachedLnValue(10, precision)

    return BigFloat.exp(BigFloat.mul(f, ln10, precision), precision)
  }

  /**
   * Convert a float to a readable base-10 representation.
   */
  toPrecision (prec=this.prec / 3.23 /* log2(10) */) {
    // f = m * 2^e; log10(f) = log10(m) + log10(2) * e
    // f = frac(log10(f)) * 10^floor(log10(f))

    prec = prec | 0

    let workingPrecision = ((prec * 3.23) | 0) + 5
    let log10 = BigFloat.log10(this, workingPrecision)

    let floor = BigFloat.new(53), frac = BigFloat.new(workingPrecision)
    BigFloat.splitIntegerTo(log10, floor, frac, ROUNDING_MODE.NEAREST)

    console.log(floor.toNumber())

    let base10mant = BigFloat.div(BigFloat.pow10(frac, workingPrecision), 10, workingPrecision)

    // We convert the base 10 mant to decimal and then round it to the

    let mant = base10mant.mant

    let decimalOut = [0]

    function divPow30 () {
      let carry = 0

      for (let i = 0; i < decimalOut.length; ++i) {
        let word = decimalOut[i]
        let div = word / (2 ** 15)
        let flr = Math.floor(div)

        let newWord = flr + carry

        decimalOut[i] = newWord
        carry = (div - flr) * (10 ** 15)
      }

      if (carry)
        decimalOut.push(carry)
    }

    for (let i = mant.length - 2; i >= 0; --i) {
      decimalOut[0] += mant[i] & 0x7fff
      divPow30()

      decimalOut[0] += mant[i] >> 15
      divPow30()
    }

    return decimalOut
  }
}

// Used for intermediate calculations to avoid allocating floats unnecessarily
const DOUBLE_STORE = BigFloat.new(53)
