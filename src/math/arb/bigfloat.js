// A float is of the following form: sign * (2^30)^e * m, where m is a list of 30-bit words that contain the mantissa of
// the float. m = m_1 / 2^30 + m_2 / 2^60 + ... . The precision is the number of bits kept track of in the words. Since
// the start of the significant bits can occur anywhere from 0 to 29 bits into the first word,

import {
  flrLog2,
  getExponentAndMantissa,
  isDenormal,
  pow2,
  frExp
} from '../real/fp_manip.js'
import { ROUNDING_MODE } from '../rounding_modes.js'
import { leftZeroPad, trimLeft } from '../../core/utils.js'

const BIGFLOAT_WORD_BITS = 30
const BIGFLOAT_WORD_SIZE = 1 << BIGFLOAT_WORD_BITS
const BIGFLOAT_WORD_MAX = BIGFLOAT_WORD_SIZE - 1

// Kinda arbitrary, but whatever
const BIGFLOAT_MIN_PRECISION_BITS = 4
const BIGFLOAT_MAX_PRECISION_BITS = 1 << 24

let CURRENT_PRECISION = 53
let CURRENT_ROUNDING_MODE = ROUNDING_MODE.NEAREST

const recip2Pow30 = pow2(-BIGFLOAT_WORD_BITS)
const recip2Pow60 = pow2(-2 * BIGFLOAT_WORD_BITS)

/**
 * The minimum number of words needed to store a mantissa with prec bits. The +2 is because the bits need to be stored
 * at any shift within the word, from 1 to 29, so some space may be needed.
 * @param prec {number}
 * @returns {number}
 */
export function neededWordsForPrecision (prec) {
  return ((prec - 1) / BIGFLOAT_WORD_BITS + 2) | 0
}

/**
 * Get an empty mantissa able to store a mantissa with prec bits.
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
    } else {
      return 0
    }
  } else {
    index = 0
  }

  for (let i = index; i < mantissa.length; ++i) {
    if (mantissa[i] !== 0) return 1
  }

  return 0
}

/**
 * Count the number of leading zeros in a mantissa, including "invalid" mantissas in which the first word is not 0.
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
export function roundMantissaToPrecision (
  mant,
  prec,
  target,
  round = CURRENT_ROUNDING_MODE,
  trailing = 0,
  trailingMode = 0
) {
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

  let offset = -1,
    shift = 0,
    bitShift = 0

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
  let truncateLen =
    BIGFLOAT_WORD_BITS - (trunc - truncWord * BIGFLOAT_WORD_BITS)

  // Remainder of the truncation and whether to do a carry after the truncation (rounding up)
  let rem = 0,
    doCarry = false

  // If the truncation would happen after the end of the mantissa...
  if (truncWord >= mantLen + shift) {
    // Whether the truncation bit is on the (nonexistent) word right after the mantissa
    let isAtVeryEnd =
      truncWord === mantLen + shift && truncateLen === BIGFLOAT_WORD_BITS

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
      if (
        trailing === 0 ||
        round === ROUNDING_MODE.DOWN || round === ROUNDING_MODE.TOWARD_ZERO ||
        (trailing === 1 &&
          (round === ROUNDING_MODE.TIES_AWAY ||
            round === ROUNDING_MODE.TIES_EVEN))
      ) {
        return shift
      } else if (
        trailing === 2 &&
        (round === ROUNDING_MODE.TIES_AWAY || round === ROUNDING_MODE.TIES_EVEN)
      ) {
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
      rem = trailing < 2 ? 0 : 1 << (truncateLen - 1)
      trailing &= 1
    }
  }

  // Determine whether to round up instead of truncating. Rounding up entails adding a 1 bit right where the mantissa
  // was truncated. For example, if we just truncated 011010110|1000, and our rounding mode is, say, TIES_AWAY, then we
  // determine that we have to round up and add 1 to the end: 01101011[1]. We call this a carry because it could
  // carry down the word in the right circumstances.
  doCarry: if (
    round === ROUNDING_MODE.UP ||
    round === ROUNDING_MODE.TOWARD_INF
  ) {
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
  } else if (
    round === ROUNDING_MODE.NEAREST ||
    round === ROUNDING_MODE.TIES_AWAY
  ) {
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

          let bit =
            truncateLen === BIGFLOAT_WORD_BITS
              ? target[truncWord - 1] & 1
              : (target[truncWord] >> truncateLen) & 1

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
 * @param mant1Len {number} Length of the first mantissa; how many words to actually use
 * @param mant2 {Int32Array} Nonnegative shift applied to mantissa 2
 * @param mant2Len {number} Length of the second mantissa; how many words to actually use
 * @param mant2Shift {number}
 * @param prec {number} Precision to compute and round to
 * @param target {Int32Array} The mantissa that is written to
 * @param targetLen {number} Number of words in the target mantissa
 * @param round {number}
 */
export function addMantissas (
  mant1,
  mant1Len,
  mant2,
  mant2Len,
  mant2Shift,
  prec,
  target,
  targetLen,
  round = CURRENT_ROUNDING_MODE
) {
  let isAliased = mant1 === target

  let mant2End = mant2Len + mant2Shift

  let newMantLen = targetLen
  let newMant = target

  // Need to compute to higher precision first
  if (mant1Len > newMantLen) {
    newMantLen = Math.max(mant1Len, neededWordsForPrecision(prec))
    newMant = new Int32Array(newMantLen)
  }


  // We first copy over all the parts of the addition we definitely need:
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
  let needsTrailingInfo =
    round === ROUNDING_MODE.TIES_AWAY ||
    round === ROUNDING_MODE.UP ||
    round === ROUNDING_MODE.TOWARD_INF ||
    round === ROUNDING_MODE.NEAREST

  if (needsTrailingInfo) {
    let trailingShift = newMantLen - mant2Shift
    trailingInfo = getTrailingInfo(mant2, Math.max(trailingShift, 0))

    // If the trailing info is shifted, then round it to 0 or 1 as appropriate
    if (trailingShift < 0) trailingInfo = +!!trailingInfo
  }

  let shift = 0

  if (carry) {
    // Get trailing info from beyond the end of the truncation due to right shifting LOL
    if (needsTrailingInfo) {
      let lastWord = newMant[newMantLen - 1]

      if (lastWord === 0) {
        trailingInfo = +!!trailingInfo
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

  let roundingShift = roundMantissaToPrecision(
    newMant,
    prec,
    target,
    round,
    trailingInfo
  )

  return roundingShift + shift
}

/**
 * Returns whether a mantissa can be correctly rounded, assuming a maximum error of maxNeg and maxPos in the last word.
 * This often allows rounding to happen before extra computation is requested.
 * @param mantissa {Int32Array}
 * @param precision {number}
 * @param round {number}
 * @param maxNeg {number}
 * @param maxPos {number}
 */
export function canMantissaBeRounded (
  mantissa,
  precision,
  round,
  maxNeg,
  maxPos
) {
  if (maxNeg === 0 && maxPos === 0) return true

  let zeros = clzMantissa(mantissa)

  let endOfPrec = zeros + precision
  let endWord = (endOfPrec / 30) | 0

  if (endWord >= mantissa.length) {
    return false
  }

  if (endWord < mantissa.length - 1) return false // TODO

  let truncateLen = 30 - (endOfPrec - endWord * 30)
  if (round === ROUNDING_MODE.WHATEVER) {
    // To be within 1 ulp of the result
    return (maxNeg + maxPos < (1 << truncateLen))
  }

  let truncatedWord = (mantissa[endWord] >> truncateLen) << truncateLen
  let rem = mantissa[endWord] - truncatedWord

  if (round === ROUNDING_MODE.UP || round === ROUNDING_MODE.TOWARD_INF ||
    round === ROUNDING_MODE.DOWN || round === ROUNDING_MODE.TOWARD_ZERO) {
    return (rem - maxNeg > 0 && rem + maxPos <= (1 << truncateLen))
  }

  if (round === ROUNDING_MODE.TIES_AWAY || round === ROUNDING_MODE.TIES_EVEN) {
    if (truncateLen === 1) return false

    let min = rem - maxNeg, max = rem + maxPos, tie = 1 << (truncateLen - 1)
    return ((min < tie && max < tie) || (min > tie && max > tie)) && (min > -tie && max < 3 * tie)
  }
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
export function subtractMantissas (
  mant1,
  mant2,
  mant2Shift,
  prec,
  target,
  round = CURRENT_ROUNDING_MODE
) {
  // The algorithm for (efficient) subtraction is a bit complicated. The reference implementation allocates a mantissa
  // large enough to store the exact result, computes the exact result, and rounds it. But if mant2Shift is large, this
  // approach allocates and calculates way more stuff than it needs to. Ideally, we allocate little or nothing and only
  // compute as much as necessary for the target mantissa to be rounded to prec bits.

  // We already assume that mant1 and mant2 are both valid mantissas, and that mant1 > mant2. We need to find the
  // location of the first word of the result mantissa.

  let mant1Len = mant1.length, mant2Len = mant2.length, mant2End = mant2Len + mant2Shift, targetLen = target.length
  let exactEnd = Math.max(mant1Len, mant2End) // The end of exact computation, relative to the first word of mant1

  // We can visualize the situation as follows:
  //  <--           mant1Len = 4                  -->
  // [ 0xcafecafe, 0xcafecafe, 0xcafecafe, 0xcafecafe]
  //  <-- mant2Shift = 2 --> [ 0xdeadbeef, 0xdeadbeef, 0xdeadbeef ]
  //                          <--         mant2Len = 3         -->
  //  <--               exactEnd = mant2End = 5                -->

  // We calculate words of the result relative to the first word of mant1 (generally, this is how we index things). If a
  // word is 0, then the start of the result occurs later. If a word is 1, the start of the result may be there, or may
  // be later, depending on the next computed word: If the next computed word is negative, then the result begins later;
  // if the next computed word is 0, then the result may begin later; if the next computed word is positive, the result
  // begins at the word that is 1. If a word is 2 or greater, the start of the result is there.

  // mant1:      [ 0xcafecafe, 0xcafecafe, 0xcafecafe, 0x00000001 ]
  // mant2:      [ 0xcafecafe, 0xcafecafe, 0xcafecafd, 0x00000000 ]
  // computed words:    0           0           1       1 (positive)
  //                                            ^ result begins here

  // mant1:      [ 0xcafecafe, 0xcafecafe, 0xcafecafe, 0x00000000 ]
  // mant2:      [ 0xcafecafe, 0xcafecafe, 0xcafecafd, 0x00000001 ]
  // computed words:    0           0           1       -1 (negative)
  //                                            result begins later due to carry -->
  // after carry:[ 0x00000000, 0x00000000, 0x00000000, 0x3fffffff ]
  //                                                        ^ result begins here

  // In any case, once a positive word is discovered, we start storing computed words in the target mantissa. Once the
  // target mantissa is exhausted, we do the carry and count how many of the first n words are 0. If n > 0, we shift the
  // target mantissa left by n words and continue computing words, etc. etc. If n == 0, we note that the maximum
  // possible imprecision in the result is +-1 units in the last place (of the last word), so we check whether this
  // error bound is sufficient for us to call it quits under the current precision and rounding mode. If not, we must
  // compute the (positive or negative) trailing information of words following the target mantissa. In particular, we
  // need to know which range the stuff after the target lies in: (-0x40000000, -0x20000000), -0x20000000 (tie),
  // (-0x20000000, 0x00000000), 0x00000000 (zero), (0x00000000, 0x20000000), 0x20000000 (tie), (0x20000000, 0x40000000).
  // These cases are enumerated as -3, -2, -1, 0, 1, 2, and 3, respectively.

  let positiveComputedWordIndex = -1
  let positiveComputedWord = 0
  let wordIndex = 0

  for (; wordIndex < exactEnd; ++wordIndex) {
    // casting with "| 0" converts OOB undefined values to 0 (TODO: test if bounds checking makes this faster)
    let mant1Word = mant1[wordIndex] | 0, mant2Word = mant2[wordIndex - mant2Shift] | 0

    let computedWord = mant1Word - mant2Word
    if (computedWord > 0) {
      positiveComputedWordIndex = wordIndex
      positiveComputedWord = computedWord
      break
    }
  }

  target[0] = positiveComputedWord

  // mant1:      [ 0xcafecafe, 0xcafecafe, 0xcafecafe, 0x00000000 ]
  // mant2:      [ 0xcafecafe, 0xcafecafe, 0xcafecafd, 0x00000001 ]
  // computed words:    0           0           1 = positiveComputedWord
  //                                            ^ positiveComputedWordIndex

  // Returns the number of zero words that occurred at the beginning of target
  function doCarry (startIndex = targetLen-1) {
    // Before: [ 0x00000002, -0x3fffffff, -0x3fffffff, -0x3ffffffe ]
    // After:  [ 0x00000001,  0x00000000,  0x00000000,  0x00000002 ]
    //          n = 0 zero words

    // Before: [ 0x00000001, -0x3fffffff, -0x3fffffff, -0x3ffffffe ]
    // After:  [ 0x00000000,  0x00000000,  0x00000000,  0x00000002 ]
    //          <--       n = 3 zero words        -->

    let carry = 0
    for (let i = startIndex; i >= 0; --i) {
      let computedWord = target[i] + carry

      if (computedWord < 0) {
        carry = -1
        computedWord += 0x40000000
      } else {
        carry = 0
      }

      target[i] = computedWord
    }

    let zeroWords = 0
    for (; zeroWords < targetLen && (!target[zeroWords]); ++zeroWords);

    // Before: [ 0x00000000,  0x00000000,  0x00000000,  0x00000002 ]
    //          <--       n = 3 zero words        -->
    // After:  [ 0x00000002,  0x00000000,  0x00000000,  0x00000000 ]
    if (zeroWords > 0) {
      // We shift the target left so the first positive word is at index 0, then adjust positiveComputedWordIndex
      leftShiftMantissa(target, 30 * zeroWords, target)
      positiveComputedWordIndex += zeroWords
    }

    return zeroWords
  }

  // Compute words after the first positive computed word, carrying whenever the target is exhausted
  for (wordIndex = positiveComputedWordIndex + 1; wordIndex < exactEnd; ++wordIndex) {
    let targetIndex = wordIndex - positiveComputedWordIndex
    if (targetIndex >= targetLen) {
      let zeroWords = doCarry()

      if (zeroWords !== 0) {
        // The carry caused zeros to appear at the beginning, so we continue computing words
        targetIndex = wordIndex - positiveComputedWordIndex
      } else {
        // The target is full of computed words, and the first word is positive
        break
      }
    }

    let mant1Word = mant1[wordIndex] | 0, mant2Word = mant2[wordIndex - mant2Shift] | 0
    let computedWord = mant1Word - mant2Word

    target[targetIndex] = computedWord
  }

  if (wordIndex === exactEnd) {
    // Target was large enough to store the exact result. We clear everything after the last word and round
    let lastIndex = wordIndex - positiveComputedWordIndex
    for (let i = lastIndex; i < targetLen; ++i) target[i] = 0

    doCarry(lastIndex - 1)

    return -positiveComputedWordIndex + roundMantissaToPrecision(target, prec, target, round)
  } else {
    let canBeRounded = canMantissaBeRounded(target, prec, round, 1, 1)
    let trailingInfo = 0

    if (!canBeRounded) {
      // Compute trailing info
      let nextWord = 0

      while (1) {
        nextWord = (mant1[wordIndex] | 0) - (mant2[wordIndex - mant2Shift] | 0)

        if (nextWord < 0) {
          target[targetLen - 1] -= 1
          nextWord += 0x40000000

          let zeros = doCarry(targetLen - 1)

          if (zeros) {
            // Rare edge case:
            // mant1:          [ 0x00000001, 0x00000000, 0x00000000 ]
            // mant2:          [ 0x00000000, 0x00000000, 0x00000001 ]
            // target before:  [ 0x00000001, 0x00000000 ]
            // nextWord before: -0x00000001
            // target after:   [ 0x3fffffff, 0x3fffffff ]

            target[targetLen - 1] = nextWord
            wordIndex++

            continue
          }
        }

        break
      }

      // Various splitting points for rounding. 0 and 2 require more words to be examined
      if (nextWord === 0x00000000) {
        trailingInfo = 0
      } else if (nextWord < 0x20000000) {
        trailingInfo = 1
      } else if (nextWord === 0x20000000) {
        trailingInfo = 2
      } else {
        trailingInfo = 3
      }

      if (!(trailingInfo & 1)) {
        // trailingInfo = 0 or 2
        ++wordIndex

        // If the second mantissa is wholly after the first mantissa, skip ahead to the second mantissa since all the
        // words in between will be 0
        if (mant2Shift > mant1Len)
          wordIndex = Math.max(wordIndex, mant2Shift)

        for (; wordIndex < exactEnd; ++wordIndex) {
          let word = (mant1[wordIndex] | 0) - (mant2[wordIndex - mant2Shift] | 0)

          if (word === 0) continue
          else if (word < 0) {
            if (trailingInfo === 2) {
              // Negative word on a tie means it's below a tie
              trailingInfo = 1
              break
            }

            // Subtract one ulp, then set trailing info to 3 (equivalent to "trailing mode -1")
            target[targetLen - 1]--
            let zeros = doCarry(targetLen - 1)

            if (zeros) target[targetLen - 1] = 0x3fffffff

            trailingInfo = 3
            break
          } else if (word > 0) {
            if (trailingInfo === 2) {
              trailingInfo = 3
            } else trailingInfo = 1
            break
          }
        }
      }
    }

    return -positiveComputedWordIndex + roundMantissaToPrecision(target, prec, target, round, trailingInfo)
  }
}

/**
 * Right shift a mantissa by shift bits, destroying any bits that trail off the end. This function supports aliasing.
 * @param mantissa {Int32Array}
 * @param shift {number}
 * @param targetMantissa
 * @returns {Int32Array} Returns the passed mantissa
 */
export function rightShiftMantissa (
  mantissa,
  shift,
  targetMantissa = mantissa
) {
  if (shift === 0) return mantissa

  let mantissaLen = mantissa.length
  let targetMantissaLen = targetMantissa.length

  let integerShift = (shift / 30) | 0
  let bitShift = shift % 30

  if (bitShift === 0) {
    let lastFilledIndex = Math.min(
      mantissaLen - 1,
      targetMantissaLen - integerShift - 1
    )

    // Since it's a multiple of 30, we just copy everything over
    for (let i = lastFilledIndex; i >= 0; --i) {
      targetMantissa[i + integerShift] = mantissa[i]
    }

    // Fill empty stuff with zeros
    for (let i = 0; i < integerShift; ++i) targetMantissa[i] = 0
    for (let i = lastFilledIndex + integerShift + 1; i < targetMantissaLen; ++i) {
      targetMantissa[i] = 0
    }
  } else {
    let invBitShift = 30 - bitShift
    let firstNeededIndex = mantissaLen - integerShift - 1
    let lastFilledIndex = firstNeededIndex + integerShift + 1

    targetMantissa[lastFilledIndex] = 0

    for (let i = firstNeededIndex; i >= 0; --i) {
      let word = mantissa[i]

      // Two components from each word
      if (i !== firstNeededIndex) {
        targetMantissa[i + integerShift + 1] +=
          (word & ((1 << bitShift) - 1)) << invBitShift
      }
      targetMantissa[i + integerShift] = word >> bitShift
    }

    for (let i = 0; i < integerShift; ++i) targetMantissa[i] = 0
    for (let i = lastFilledIndex; i < targetMantissaLen; ++i) {
      targetMantissa[i] = 0
    }
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
export function leftShiftMantissa (mantissa, shift, targetMantissa = mantissa) {
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
      targetMantissa[i - integerShift] =
        ((mantissa[i] << bitShift) & 0x3fffffff) +
        (i < mantissaLen - 1 ? mantissa[i + 1] >> invBitShift : 0)
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
export function multiplyMantissaByInteger (
  mantissa,
  int,
  precision,
  targetMantissa,
  roundingMode = CURRENT_ROUNDING_MODE
) {
  let newMantissa = new Int32Array(neededWordsForPrecision(precision) + 1) // extra word for overflow

  // Decompose the given integer into two 15-bit words for the multiplication
  let word1Lo = int & 0x7fff
  let word1Hi = int >> 15

  let carry = 0
  for (let i = mantissa.length - 1; i >= 0; --i) {
    // Multiply the word, storing the low part and tracking the high part
    let word = mantissa[i]

    let word2Lo = word & 0x7fff
    let word2Hi = word >> 15

    let low = Math.imul(word1Lo, word2Lo),
      high = Math.imul(word1Hi, word2Hi)
    let middle = Math.imul(word2Lo, word1Hi) + Math.imul(word1Lo, word2Hi)

    low += ((middle & 0x7fff) << 15) + carry
    if (low > 0x3fffffff) {
      high += low >> 30
      low &= 0x3fffffff
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

  let roundingShift = roundMantissaToPrecision(
    newMantissa,
    precision,
    targetMantissa,
    roundingMode
  )

  return shift + roundingShift
}

export function sqrtMantissa (
  mantissa,
  precision,
  targetMantissa,
  roundingMode = CURRENT_ROUNDING_MODE
) {

}

// Slow function used as a fallback when accumulated error is too large
function slowExactMultiplyMantissas (mant1, mant2, precision, targetMantissa, roundingMode) {
  let arr = new Int32Array(mant1.length + mant2.length + 1)

  for (let i = mant1.length; i >= 0; --i) {
    let mant1Word = mant1[i] | 0
    let mant1WordLo = mant1Word & 0x7fff
    let mant1WordHi = mant1Word >> 15

    let carry = 0,
      j = mant2.length - 1
    for (; j >= 0; --j) {
      let mant2Word = mant2[j] | 0
      let mant2WordLo = mant2Word & 0x7fff
      let mant2WordHi = mant2Word >> 15

      let low = Math.imul(mant1WordLo, mant2WordLo),
        high = Math.imul(mant1WordHi, mant2WordHi)
      let middle =
        (Math.imul(mant2WordLo, mant1WordHi) +
          Math.imul(mant1WordLo, mant2WordHi)) |
        0

      low += ((middle & 0x7fff) << 15) + carry + arr[i + j + 1]
      low >>>= 0

      if (low > 0x3fffffff) {
        high += low >>> 30
        low &= 0x3fffffff
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

  shift += roundMantissaToPrecision(
    arr,
    precision,
    targetMantissa,
    roundingMode
  )

  return shift
}

/**
 * Multiply two mantissas
 * @param mant1
 * @param mant2
 * @param precision
 * @param targetMantissa
 * @param roundingMode
 * @returns {number}
 */
export function multiplyMantissas (
  mant1,
  mant2,
  precision,
  targetMantissa,
  roundingMode = CURRENT_ROUNDING_MODE
) {
  let mant1Len = mant1.length,
    mant2Len = mant2.length
  let targetMantissaLen = targetMantissa.length

  for (let i = 0; i < targetMantissaLen; ++i) targetMantissa[i] = 0

  let highestWord = 0

  // Low words that weren't counted on the first pass. Note that this number may overflow the 32 bit integer limit
  let ignoredLows = 0

  // Only add the products whose high words are within targetMantissa
  for (let i = Math.min(targetMantissaLen, mant1Len - 1); i >= 0; --i) {
    let mant1Word = mant1[i]
    let mant1Lo = mant1Word & 0x7fff
    let mant1Hi = mant1Word >> 15

    let carry = 0
    for (let j = Math.min(targetMantissaLen - i, mant2Len - 1); j >= 0; --j) {
      let writeIndex = i + j

      let mant2Word = mant2[j]
      let mant2Lo = mant2Word & 0x7fff
      let mant2Hi = mant2Word >> 15

      let low = Math.imul(mant1Lo, mant2Lo)
      let high = Math.imul(mant1Hi, mant2Hi)
      let middle =
        (Math.imul(mant1Hi, mant2Lo) + Math.imul(mant1Lo, mant2Hi)) | 0

      low +=
        ((middle & 0x7fff) << 15) +
        (writeIndex < targetMantissaLen ? targetMantissa[writeIndex] : 0) +
        carry
      low >>>= 0

      if (low > 0x3fffffff) {
        high += low >>> 30
        low &= 0x3fffffff
      }

      high += middle >> 15

      if (writeIndex < targetMantissaLen) targetMantissa[writeIndex] = low
      else ignoredLows += low

      carry = high
    }

    if (i > 0) {
      targetMantissa[i - 1] += carry
    } else {
      highestWord = carry
    }
  }

  let shift = -1
  let trailingInfo = 0
  let maxErr = Math.ceil(ignoredLows / 0x40000000) + 2

  if (highestWord !== 0) {
    maxErr = Math.ceil((targetMantissa[targetMantissaLen - 1] + maxErr) / 0x40000000)
    rightShiftMantissa(targetMantissa, 30)

    targetMantissa[0] = highestWord
    shift = 0
  }

  let canBeRounded = canMantissaBeRounded(targetMantissa, precision, roundingMode, 0, maxErr)

  if (!canBeRounded) { // pain ensues, but this is relatively rare
    return slowExactMultiplyMantissas(mant1, mant2, precision, targetMantissa, roundingMode)
  }

  let roundingShift = roundMantissaToPrecision(
    targetMantissa,
    precision,
    targetMantissa,
    roundingMode,
    trailingInfo
  )

  return shift + roundingShift
}

export function fmodMantissas (
  mant1,
  mant2,
  mant2Shift,
  targetMantissa,
  roundingMode
) {
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
export function divMantissas (
  mant1,
  mant2,
  precision,
  targetMantissa,
  roundingMode = CURRENT_ROUNDING_MODE
) {
  // Init mant1Copy with a shifted copy of mant1
  let mant1Copy = new Int32Array(Math.max(mant1.length + 1, mant2.length))
  for (let i = 0; i < mant1.length; ++i) mant1Copy[i + 1] = mant1[i]

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
  let firstBitIndex = -1,
    lastSignificantBit = 1 << 30 // maybe v8 can optimize this to be an integer :P

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
    let bit = 29 - (bitIndex % 30)

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

  const roundingShift = roundMantissaToPrecision(
    targetMantissa,
    precision,
    targetMantissa,
    roundingMode,
    trailingInfo,
    1
  )

  return newMantissaShift + roundingShift
}

class MantissaFactory {
  constructor () {
    this.arr = new Int32Array(8)
  }

  getStore (precision) {
    let words = neededWordsForPrecision(precision)
    if (this.arr.length < words) {
      this.arr = new Int32Array(words)
    }

    return this.arr
  }
}

// To calculate N/D... I'm genuinely not sure. We have an exact method already, which is good to compare to, but
// computing N/D *with correct rounding* is difficult. We can compute 1/D to within 1 ulp of precision using a root-
// finding method, sure... but then what? I think the strategy is to compute 1/D to the target precision, then multiply
// by N and keep track of the maximum relative error (which will be 2 ulp in either direction in this case), then check
// whether the result can be correctly rounded. If not, we compute 1/D to one extra word of precision (which isn't
// difficult) and try again... but couldn't this result in an infinite loop? A key observation is that sometimes we will
// have to compute the division to full precision, like when round is a floor operation and mant2 divides mant1 exactly.
// So perhaps we try computing 1/D to *one extra word of precision*, then when all else fails, we fall back to the slow
// bit-by-bit approach, similar to what we do with multiplication.

const divStore = new MantissaFactory()

export function divMantissas2 (mant1, mant2, precision, target, round) {
  let estimate = (2 ** 60) / (mant2[0] * (2 ** 30) + mant2[1] + ((mant2.length > 2) ? mant2[2] : 0) * (2 ** -30))
  let reciprocalTarget = divStore.getStore(precision)

  let estimateShift = 0

  estimate -= (reciprocalTarget[0] = Math.floor(estimate))
  estimate *= 2 ** 30
  estimate -= (reciprocalTarget[1] = Math.floor(estimate))
  estimate *= 2 ** 30
  reciprocalTarget[2] = Math.floor(estimate)

  //console.log(estimate, reciprocalTarget, mant2)


  return divMantissas(mant1, mant2, precision, target, round)

  console.log("mant1", mant1, "mant2", mant2, "target", target)
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

  let mant1Len = mant1.length,
    mant2Len = mant2.length

  let result = 0
  for (let i = 0; i < mant1Len; ++i) {
    let mant1Word = mant1[i]
    let mant2Word = i < mant2Len ? mant2[i] : 0

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

// Converting a binary mantissa to a base-10 sequence isn't trivial!
function mantissaToBaseWithPrecision (mant, shift, digits, base = 10) {
  let beforeDecimalPoint = [0]
  let afterDecimalPoint = [0]

  // Fractional component
  function computeAfterDecimalPoint () {
    function divPow15 () {
      let carry = 0

      for (let i = 0; i < afterDecimalPoint.length; ++i) {
        let word = afterDecimalPoint[i]
        let div = word / 2 ** 15
        let flr = Math.floor(div)

        let newWord = flr + carry

        afterDecimalPoint[i] = newWord
        carry = (div - flr) * 10 ** 15
      }

      if (carry) afterDecimalPoint.push(carry)
    }

    for (let i = mant.length - 1; i >= shift; --i) {
      if (i < 0) {
        divPow15()
        divPow15()
        continue
      }

      afterDecimalPoint[0] += mant[i] & 0x7fff
      divPow15()
      afterDecimalPoint[0] += mant[i] >> 15
      divPow15()
    }
  }

  function computeBeforeDecimalPoint () {
    function mulPow30 () {
      let carry = 0

      for (let i = 0; i < beforeDecimalPoint.length; ++i) {
        let word = beforeDecimalPoint[i]
        let mul = word * 2 ** 30

        let rem = mul % (10 ** 15)
        let flr = Math.floor((mul - rem) / (10 ** 15) + 0.5)

        rem += carry
        if (rem > 10 ** 15) {
          rem -= 10 ** 15
          flr += 1
        }

        beforeDecimalPoint[i] = rem
        carry = flr
      }

      if (carry) {
        beforeDecimalPoint.push(carry)
      }
    }

    for (let i = 0; i < Math.min(shift, mant.length); ++i) {
      mulPow30()
      beforeDecimalPoint[0] += mant[i]
    }
  }

  computeBeforeDecimalPoint()
  computeAfterDecimalPoint()

  function collapseDigits (digits) {
    return digits.map(d => leftZeroPad(d + '', 15)).join('')
  }

  return [collapseDigits(beforeDecimalPoint.reverse()), collapseDigits(afterDecimalPoint.slice(1))]
}

export function prettyPrintFloat (mantissa, precision) {
  let words = []
  let indices = []

  for (let i = 0; i < mantissa.length; ++i) {
    words.push(leftZeroPad(mantissa[i].toString(2), BIGFLOAT_WORD_BITS, '0'))
    indices.push('0    5    10   15   20   25   ')
  }

  function insert (index, wordChar, indicesChar) {
    let wordIndex = Math.floor(index / BIGFLOAT_WORD_BITS)
    let subIndex = index - wordIndex * BIGFLOAT_WORD_BITS

    let wordWord = words[wordIndex]
    let indicesWord = indices[wordIndex]

    words[wordIndex] =
      wordWord.slice(0, subIndex) + wordChar + wordWord.slice(subIndex)
    indices[wordIndex] =
      indicesWord.slice(0, subIndex) + indicesChar + indicesWord.slice(subIndex)
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

/**
 * Takes in an arbitrary input and converts to a corresponding big float. If passed a BigFloat, it does nothing; if
 * passed a number, it converts to BigFloat. Used for user-facing operations
 * @param arg
 */
function cvtToBigFloat (arg) {
  if (arg instanceof BigFloat) return arg
  if (typeof arg === 'number') return BigFloat.fromNumber(arg, 53)

  throw new TypeError(`Cannot convert argument ${arg} to BigFloat`)
}

export function computeLn2 (precision) {
  // We use the rapid series ln(2) = 2/3 * sum(k=0 to inf, 1 / ((2k+1) * 9^k)). To compute ln(2) to 1 ulp of precision,
  // we see that the error term after n terms is
  //        1                  1                   1          1
  //   -----------    +   -----------    + ... < ------ * --------- < 2^(-prec-1)
  // (2n+3) * 9^(n+1)   (2n+5) * 9^(n+2)          2n+3     8^(n+1)
  // and ignoring the 1/(2n+3) term for a moment, we see that n = prec / 4 + 2 iterations should be sufficient. The
  // remaining concern is rounding, of course; how many extra bits of precision do we need? Well, probably on the order
  // of 2 * log2(iters). I'm too bored to formalize it, so that's what we'll go with

  let ln2 = BigFloat.new(precision)
  let iters = Math.ceil(precision / 4) + 1

  let workingPrecision = (precision + 2 * Math.log2(iters)) | 0

  let twoThirds = BigFloat.div(2, 3, workingPrecision, ROUNDING_MODE.WHATEVER)
  let oneNinth = BigFloat.div(1, 9, workingPrecision, ROUNDING_MODE.WHATEVER)

  let tmp = BigFloat.new(workingPrecision),
    tmp2 = BigFloat.new(workingPrecision),
    sum = BigFloat.fromNumber(1, workingPrecision)

  let oneNinthPowed = BigFloat.fromNumber(1, workingPrecision)
  let summand = BigFloat.new(workingPrecision)

  for (let k = 1; k <= iters; ++k) {
    BigFloat.mulTo(oneNinth, oneNinthPowed, tmp, ROUNDING_MODE.WHATEVER)
    BigFloat.divNumberTo(tmp, 2 * k + 1, summand, ROUNDING_MODE.WHATEVER)

    BigFloat.addTo(summand, sum, tmp2, ROUNDING_MODE.WHATEVER)

    ;[tmp, oneNinthPowed] = [oneNinthPowed, tmp]
    ;[tmp2, sum] = [sum, tmp2]
  }

  BigFloat.mulTo(twoThirds, sum, ln2)

  return ln2
}

let cachedLn2, cachedLn10

export function getCachedLn2 (precision) {
  if (!cachedLn2 || cachedLn2.prec < precision) {
    cachedLn2 = computeLn2(precision)
  }

  return cachedLn2
}

function getCachedLn10 (precision) {
  if (!cachedLn10 || cachedLn10.prec < precision) {
    let workingPrecision = precision + 2

    cachedLn10 = BigFloat.ln(10, workingPrecision)
  }

  return cachedLn10
}

/**
 * Compute e^f for 0.5 <= f < 1. e^f = 1 + f * (1 + f/2 * (1 + f/3 * ... ) ) )
 */
export function expBaseCase (f, precision) {
  let workingPrecision = precision + 2
  let tmp = BigFloat.new(workingPrecision)
  let tmp2 = BigFloat.new(workingPrecision)

  let target = BigFloat.new(precision)

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

  return target
}

let cachedPi

export function getCachedPi (precision) {
  if (cachedPi?.prec >= precision) return cachedPi

  // We use the rapidly converging Gauss-Legendre algorithm to get pi, which is based on the arithmetic-geometric mean.
  // See https://en.wikipedia.org/wiki/Gauss%E2%80%93Legendre_algorithm for details.

  let an = BigFloat.new(precision), tn = BigFloat.new(precision), pn = BigFloat.new(precision),
    tmp = BigFloat.new(precision), tmp2 = BigFloat.new(precision), tmp3 = BigFloat.new(precision), tmp4 = BigFloat.new(precision)

  an.setFromNumber(1)
  let bn = BigFloat.div(1, BigFloat.sqrt(2, precision), precision)
  tn.setFromNumber(0.25)
  pn.setFromNumber(1)

  let iters = 4 + Math.log2(precision)

  for (let i = 0; i < iters; ++i) {
    BigFloat.mulTo(an, bn, tmp)
    tmp = BigFloat.sqrt(tmp, precision)

    BigFloat.addTo(an, bn, tmp2)
    BigFloat.mulPowTwoTo(tmp2, -1, tmp2)

    BigFloat.subTo(an, tmp2, tmp3)
    BigFloat.mulTo(tmp3, tmp3, tmp4)
    BigFloat.mulTo(tmp4, pn, tmp3)
    BigFloat.subTo(tn, tmp3, tmp4)
    BigFloat.mulPowTwoTo(pn, 1, pn)

    ;[an, tmp] = [tmp, an]
    ;[bn, tmp2] = [tmp2, bn]
    ;[tn, tmp4] = [tmp4, tn]
  }

  BigFloat.addTo(an, bn, tmp)
  BigFloat.mulTo(tmp, tmp, tmp2)
  BigFloat.divTo(tmp2, tn, tmp)
  BigFloat.mulPowTwoTo(tmp, -2, tmp)

  return cachedPi = tmp
}

// A special float with a mantissa of 30 bits. Its value should be interpreted as 2^exp * mant. Infinity is represented
// with a mantissa of Infinity, 0 is represented with a mantissa of 0, and NaN is represented with a mantissa of NaN
export class DeltaFloat {
  constructor (exp, mant) {
    /**
     * Exponent of the delta float
     * @type {number}
     */
    this.exp = exp

    /**
     * Number ranging from 2^29 to 2^30 - 1 for normal numbers,
     * @type {number}
     */
    this.mant = mant
  }

  /**
   * Convert a JS number to a DeltaFloat. We always round up.
   * @param num {number}
   * @returns {DeltaFloat}
   */
  static fromNumber (num) {
    num = Math.abs(num)

    if (num === 0 || num === Infinity || Number.isNaN(num)) {
      return new DeltaFloat(0, num)
    } else {
      // num = f * 2^exp where 0.5 <= f < 1
      let [f, exp] = frExp(num)

      f *= 1 << 30
      exp -= 30

      f = Math.ceil(f)
      if (f === 1 << 30) {
        f = 1 << 29
        exp += 1
      }

      return new DeltaFloat(exp, f)
    }
  }

  toNumber () {
    // TODO handle denormal numbers
    let mant = this.mant

    if (mant === 0 || mant === Infinity || Number.isNaN(mant)) {
      return mant
    }

    return mant * pow2(this.exp)
  }

  toBigFloat (prec = 30, roundingMode = CURRENT_ROUNDING_MODE) {
    let bigFloat = BigFloat.fromNumber(this.mant, prec, roundingMode)

    // Note this is permissible because mulPowTwoTo permits aliasing
    BigFloat.mulPowTwoTo(bigFloat, this.exp, bigFloat, roundingMode)

    return bigFloat
  }

  /**
   * Add two delta floats, always rounding up
   * @param f1 {DeltaFloat}
   * @param f2 {DeltaFloat}
   * @param target {DeltaFloat}
   */
  static addTo (f1, f2, target) {
    let f1mant = f1.mant, f1exp = f1.exp, f2mant = f2.mant, f2exp = f2.exp

  }

  toPrecision (prec, roundingMode = CURRENT_ROUNDING_MODE) {
    return this.toBigFloat().toPrecision(prec, roundingMode)
  }
}

/**
 * Unlike a typical RealInterval, we represent a BigFloatInterval with a center and a radius. The radius need not have
 * high precision, so we use a DeltaFloat--which has a fixed mantissa of 30 bits and an exponent that can range as
 * necessary. Kudos to Frederick Johansson for this idea (see https://arblib.org/mag.html).
 */
export class BigFloatInterval {
  constructor (prec) {
    /**
     * @type BigFloat
     */
    this.center = BigFloat.new(prec)

    /**
     * @type DeltaFloat
     */
    this.delta = new DeltaFloat(0, 0)
  }

  static fromNumber (num, prec = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
    const interval = new BigFloatInterval(prec)

    interval.center.setFromNumber(num)
    return interval
  }

  /**
   *
   * @param f1 {BigFloatInterval|BigFloat}
   * @param f2 {BigFloatInterval|BigFloat}
   * @param target {BigFloatInterval}
   */
  static addTo (f1, f2, target) {
    let f1center, f1delta, f2center, f2delta

    // We add the centers. The associated extra uncertainty is +- 1 ulp in the target precision
    let targetPrecision = target.center.prec

  }
}

const LOG210 = Math.log2(10)

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

  static from (obj) {
    if (typeof obj === "number") {
      return BigFloat.fromNumber(obj, 53)
    } else if (typeof obj === "string") {
      return BigFloat.fromString(obj)
    } else if (obj instanceof BigFloat) {
      return obj.clone()
    } else {
      throw new TypeError()
    }
  }

  /**
   * Construct a new BigFloat from a JS number with a given precision and rounding in the correct direction if the
   * precision is less than 53.
   * @param num {number} JS number to convert from
   * @param precision {number} Precision, in bits, of the float
   * @param roundingMode {number} Enum of which direction to round in
   * @returns {BigFloat}
   */
  static fromNumber (
    num,
    precision = CURRENT_PRECISION,
    roundingMode = CURRENT_ROUNDING_MODE
  ) {
    let float = BigFloat.new(precision)
    float.setFromNumber(num, roundingMode)

    return float
  }

  static fromString (str, precision) {
    let float = BigFloat.new(precision)
    float.setFromString(str)

    return float
  }

  /**
   * Create a new BigFloat with a given precision, initialized to a value of 0.
   * @param prec {number} Precision, in bits, of the float
   * @returns {BigFloat}
   */
  static new (prec = CURRENT_PRECISION) {
    if (
      prec < BIGFLOAT_MIN_PRECISION_BITS ||
      prec > BIGFLOAT_MAX_PRECISION_BITS ||
      !Number.isInteger(prec)
    ) {
      throw new RangeError(
        `BigFloat precision must be an integer in the range [${BIGFLOAT_MIN_PRECISION_BITS}, ${BIGFLOAT_MAX_PRECISION_BITS}]`
      )
    }

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
  static cmpMagnitudes (f1, f2) {
    f1 = cvtToBigFloat(f1)
    f2 = cvtToBigFloat(f2)

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
  static addTo (
    f1,
    f2,
    target,
    roundingMode = CURRENT_ROUNDING_MODE,
    flipF2Sign = false
  ) {
    let f1Sign = f1.sign
    let f2Sign = flipF2Sign ? -f2.sign : f2.sign

    // Special cases
    if (!Number.isFinite(f1Sign) || !Number.isFinite(f2Sign)) {
      target.sign = f1Sign + f2Sign
      return
    }

    if (f1Sign === 0) {
      target.setFromFloat(f2, roundingMode)
      if (flipF2Sign) target.sign *= -1

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
      let cmp = BigFloat.cmpMagnitudes(f1, f2)
      let sign = 0

      if (cmp === 0) {
        target.setZero()
        return
      } else if (cmp === 1) {
        sign = f1Sign
      } else {
        sign = f2Sign
      }
      if (cmp === -1) swapF1F2()

      let shift = subtractMantissas(
        f1.mant,
        f2.mant,
        f1.exp - f2.exp,
        targetPrecision,
        targetMantissa,
        roundingMode
      )

      target.sign = sign
      target.exp = f1.exp + shift
    } else {
      if (f1.exp < f2.exp) swapF1F2()

      let shift = addMantissas(
        f1.mant,
        f1.mant.length,
        f2.mant,
        f2.mant.length,
        f1.exp - f2.exp,
        targetPrecision,
        targetMantissa,
        targetMantissa.length,
        roundingMode
      )

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
  static addNumberTo (f1, num, target, roundingMode = CURRENT_ROUNDING_MODE) {
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
  static subTo (f1, f2, target, roundingMode = CURRENT_ROUNDING_MODE) {
    BigFloat.addTo(f1, f2, target, roundingMode, true)
  }

  /**
   * Subtract a JS number from the given float, writing the result to target
   * @param f1 {BigFloat}
   * @param num {number}
   * @param target {BigFloat}
   * @param roundingMode {number}
   */
  static subNumberTo (f1, num, target, roundingMode = CURRENT_ROUNDING_MODE) {
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
  static mulTo (f1, f2, target, roundingMode = CURRENT_ROUNDING_MODE) {
    let f1Sign = f1.sign
    let f2Sign = f2.sign

    target.sign = f1Sign * f2Sign

    if (
      f1Sign === 0 ||
      f2Sign === 0 ||
      !Number.isFinite(f1Sign) ||
      !Number.isFinite(f2Sign)
    ) {
      return
    }

    if (f1.exp < f2.exp) {
      let tmp = f1
      f1 = f2
      f2 = tmp
    }

    let shift = multiplyMantissas(
      f1.mant,
      f2.mant,
      target.prec,
      target.mant,
      roundingMode
    )
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
  static mulNumberTo (
    float,
    num,
    target,
    roundingMode = CURRENT_ROUNDING_MODE
  ) {
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
        let shift = multiplyMantissaByInteger(
          float.mant,
          absNum,
          target.prec,
          target.mant,
          roundingMode
        )

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
   * be accomplished via only bitshifts. This function allows aliasing, meaning the target float can be the same as the
   * argument.
   * @param float
   * @param exponent {number}
   * @param target
   * @param roundingMode
   */
  static mulPowTwoTo (
    float,
    exponent,
    target,
    roundingMode = CURRENT_ROUNDING_MODE
  ) {
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
      roundMantissaToPrecision(
        float.mant,
        target.prec,
        target.mant,
        roundingMode
      )
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
  static divTo (f1, f2, target, roundingMode = CURRENT_ROUNDING_MODE) {
    let f1Sign = f1.sign
    let f2Sign = f2.sign

    if (
      f1Sign === 0 ||
      f2Sign === 0 ||
      !Number.isFinite(f1Sign) ||
      !Number.isFinite(f2Sign)
    ) {
      target.sign = f1Sign / f2Sign
      return
    }

    let shift = divMantissas2(
      f1.mant,
      f2.mant,
      target.prec,
      target.mant,
      roundingMode
    )

    //divMantissas2(f1.mant, f2.mant, target.prec, target.mant, roundingMode)

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
  static divNumberTo (f1, num, target, roundingMode = CURRENT_ROUNDING_MODE) {
    DOUBLE_STORE.setFromNumber(num)

    BigFloat.divTo(f1, DOUBLE_STORE, target, roundingMode)
  }

  static fmodTo (f1, f2, target, roundingMode = CURRENT_ROUNDING_MODE) {
    const remainder = createMantissa(Math.max(f1.prec, f2.prec))
    let f1exp = f1.exp, f2exp = f2.exp, f1mant = f1.mant, f2mant = f2.mant

    // Algorithm: suppose we want to compute fmod(m1 * (2^30)^e1, m2 * (2^30)^e2), where e1 >= e2 and if e1 == e2, m1 > m2.
    // We use a shift-and-subtract approach, noting that the answer is equivalent to 2^e2 * fmod(m1 * (2^30)^(e1-e2), m2).
    // We basically calculate m1 mod m2, then multiply by 2 over and over and subtract m2 each time.

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
    let word = f1.exp,
      mantLen = f1.length
    if (word <= 0) {
      fracPart.setFromFloat(f1)
      integerPart.setZero()
    } else if (word >= mantLen) {
      integerPart.setFromFloat(f1)
      fracPart.setZero()
    } else {
      // word lies within [1, mantissaLen) and thus we need to chop it.
      let intWordCount = word

      let mant = f1.mant,
        intPartMant = integerPart.mant,
        fracPartMant = fracPart.mant

      if (intPartMant.length > intWordCount) {
        for (let i = 0; i < intWordCount; ++i) intPartMant[i] = mant[i]
        for (let i = intPartMant.length - 1; i >= intWordCount; --i) {
          intPartMant[i] = 0
        }

        roundMantissaToPrecision(
          intPartMant,
          integerPart.prec,
          intPartMant,
          roundingMode
        )
      } else {
        // I am lazy to optimize this
        roundMantissaToPrecision(
          mant.subarray(0, word),
          integerPart.prec,
          intPartMant,
          roundingMode
        )
      }

      integerPart.exp = f1.exp
      integerPart.sign = f1.sign

      let shift
      for (shift = word; shift < mantLen && mant[shift] === 0; ++shift)

      if (shift === mantLen) {
        fracPart.setZero()
        return
      }

      let roundingShift = roundMantissaToPrecision(
        mant.subarray(word),
        fracPart.prec,
        fracPartMant,
        roundingMode
      )

      if (fracPartMant.every(a => a === 0)) {
        fracPart.exp = fracPart.sign = 0
      } else {
        fracPart.exp = word - shift + roundingShift
        fracPart.sign = f1.sign
      }
    }
  }

  /**
   * Return the floored base-2 logarithm of a number, which can be useful for many reasons
   * @param f1
   * @param ignoreSign
   * @returns {number}
   */
  static floorLog2 (f1, ignoreSign = false) {
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

  static ZERO = Object.freeze(BigFloat.fromNumber(0, 53))
  static ONE = Object.freeze(BigFloat.fromNumber(1, 53))

  /**
   * Clone this big float
   * @returns {BigFloat}
   */
  clone () {
    return new BigFloat(
      this.sign,
      this.exp,
      this.prec,
      new Int32Array(this.mant)
    )
  }

  neg () {
    return new BigFloat(
      this.sign * -1,
      this.exp,
      this.prec,
      new Int32Array(this.mant)
    )
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
  setFromFloat (f, roundingMode = CURRENT_ROUNDING_MODE) {
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

  setFromNumber (num, roundingMode = CURRENT_ROUNDING_MODE) {
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
    let [valExponent, valMantissa] = getExponentAndMantissa(num)

    // Exponent of the float (2^30)^newExp
    let newExp = Math.ceil((valExponent + 1) / BIGFLOAT_WORD_BITS)

    // The mantissa needs to be shifted to the right by this much. 0 < bitshift <= 30. If the number is denormal, we
    // have to shift it by one bit less
    let bitshift = newExp * BIGFLOAT_WORD_BITS - valExponent - isNumDenormal

    let denom = pow2(bitshift + 22)
    outMantissa[0] =
      Math.floor(valMantissa / denom) /* from double */ +
      (isNumDenormal ? 0 : 1 << (30 - bitshift)) /* add 1 if not denormal */

    let rem = valMantissa % denom
    if (bitshift > 8) {
      let cow = 1 << (bitshift - 8)

      outMantissa[1] = Math.floor(rem / cow)
      outMantissa[2] = rem % cow << (38 - bitshift)
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

  setFromString (str, base = 10) {
    str = str + ''

    // Well this is going to be pain. We process strings of the form -?[0-9]+.?[0-9]*(e-?[0-9]+)?

    const re = /(?<sign>[-+])?(?<digits1>[0-9]*)?\.?(?<digits2>[0-9]*)?(e(?<exponent>[-+]?[0-9]+))?/
    let { sign, digits1, digits2, exponent } = str.match(re).groups

    // Conditions for invalid string
    valid: {
      if ((!digits1 && !digits2)) {
        break valid
      }

      exponent = exponent ? parseFloat(exponent) : 0
      if (Number.isNaN(exponent)) { // might happen if exponent is '+', for example
        break valid
      }

      sign = (sign === '-') ? -1 : 1
      if (!digits1) digits1 = ''
      if (!digits2) digits2 = ''

      // We have a sign, digits before and/or after the decimal point, and an exponent. We now have to convert this
      // to the nearest float in the current precision. Mathematically, we have
      //
      // f = (digits1 + digits2 / base^(digits2.length)) * base^exponent.
      //
      // Taking logs and letting d1 = digits1, d2 = digits2, b = base and e = exponent, we see
      // log(f) = e * log(b) + log(d1 + d2 / d2.length). The first addend is simple; the second involves the actual base
      // conversion. For now, I'm just going to go digit by digit and add the corresponding multiple of a power of b.
      // Kinda slow, but we'll improve this algorithm later.

      let workingPrecision = this.prec + 12

      let convertedDigits = BigFloat.new(workingPrecision)
      let bPowed = BigFloat.fromNumber(1, workingPrecision)

      let tmp = BigFloat.new(workingPrecision), tmp2 = BigFloat.new(workingPrecision)

      for (let i = digits1.length - 1; i >= 0; --i) {
        BigFloat.mulNumberTo(bPowed, parseInt(digits1[i]), tmp)
        BigFloat.addTo(tmp, convertedDigits, tmp2)

        BigFloat.mulNumberTo(bPowed, base, tmp)
        ;[tmp, bPowed] = [bPowed, tmp]
        ;[tmp2, convertedDigits] = [convertedDigits, tmp2]
      }

      BigFloat.divNumberTo(BigFloat.ONE, base, bPowed)

      for (let i = 0; i < digits2.length; ++i) {
        BigFloat.mulNumberTo(bPowed, parseInt(digits2[i]), tmp)
        BigFloat.addTo(tmp, convertedDigits, tmp2)

        BigFloat.divNumberTo(bPowed, base, tmp)
        ;[tmp, bPowed] = [bPowed, tmp]
        ;[tmp2, convertedDigits] = [convertedDigits, tmp2]
      }

      let lnConvertedDigits = BigFloat.ln(convertedDigits, workingPrecision)
      BigFloat.mulNumberTo(BigFloat.ln(base, workingPrecision), exponent, tmp)

      BigFloat.addTo(lnConvertedDigits, tmp, tmp2)

      this.setFromFloat(BigFloat.exp(tmp2, workingPrecision))
      return this
    }

    this.setNaN()
    return this
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
  toBigFloat (
    precision = CURRENT_PRECISION,
    roundingMode = CURRENT_ROUNDING_MODE
  ) {
    let newMantissa = createMantissa(precision)
    let { mant, sign, exp } = this

    if (this.sign !== 0 && Number.isFinite(sign)) {
      let shift = roundMantissaToPrecision(
        mant,
        precision,
        newMantissa,
        roundingMode
      )

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

    let m = this.mant,
      exp = (this.exp - 1) * BIGFLOAT_WORD_BITS
    if (roundingMode === ROUNDING_MODE.WHATEVER) {
      // Short-circuit calculation for efficiency
      return (
        pow2(exp) * (m[0] + m[1] * recip2Pow30 + (f32 ? 0 : m[2] * recip2Pow60))
      )
    }

    let prec = f32 ? 24 : 53
    let roundedMantissa = createMantissa(prec)

    // Round to the nearest float32 or float64, ignoring denormal numbers for now
    const shift = roundMantissaToPrecision(
      m,
      prec,
      roundedMantissa,
      roundingMode
    )

    // Calculate an exponent and mant such that mant * 2^exponent = the number
    let mAsInt

    if (shift) {
      mAsInt = 1 << 30
    } else {
      mAsInt =
        roundedMantissa[0] +
        roundedMantissa[1] * recip2Pow30 +
        (f32 ? 0 : roundedMantissa[2] * recip2Pow60)
    }

    // Normalize mant to be in the range [0.5, 1), which lines up exactly with a normal double
    let expShift = flrLog2(mAsInt) + 1
    mAsInt /= pow2(expShift)
    exp += expShift

    let MIN_EXPONENT = f32 ? -148 : -1073
    let MAX_EXPONENT = f32 ? 127 : 1023
    let MIN_VALUE = f32 ? 1.175494e-38 : Number.MIN_VALUE
    let MAX_VALUE = f32 ? 3.40282347e38 : Number.MAX_VALUE

    // We now do various things depending on the rounding mode. The range of a double's exponent is -1024 to 1023,
    // inclusive, so if the exponent is outside of those bounds, we clamp it to a value depending on the rounding mode.
    if (exp < MIN_EXPONENT) {
      if (
        roundingMode === ROUNDING_MODE.TIES_AWAY ||
        roundingMode === ROUNDING_MODE.NEAREST
      ) {
        // Deciding between 0 and Number.MIN_VALUE. Unfortunately at 0.5 * 2^1074 there is a TIE
        if (exp === MIN_EXPONENT - 1) {
          // If greater or ties away
          if (mAsInt > 0.5 || roundingMode === ROUNDING_MODE.TIES_AWAY) {
            return this.sign * MIN_VALUE
          }
        }

        return 0
      } else {
        if (this.sign === 1) {
          if (
            roundingMode === ROUNDING_MODE.TOWARD_INF ||
            roundingMode === ROUNDING_MODE.UP
          ) {
            return MIN_VALUE
          } else {
            return 0
          }
        } else {
          if (
            roundingMode === ROUNDING_MODE.TOWARD_ZERO ||
            roundingMode === ROUNDING_MODE.UP
          ) {
            return 0
          } else {
            return -MIN_VALUE
          }
        }
      }
    } else if (exp > MAX_EXPONENT) {
      if (exp === MAX_EXPONENT + 1) {
        // Bottom formula will overflow, so we adjust
        return this.sign * mAsInt * 2 * pow2(exp - 1)
      }

      if (
        roundingMode === ROUNDING_MODE.TIES_AWAY ||
        roundingMode === ROUNDING_MODE.NEAREST
      ) {
        return Infinity * this.sign
      } else if (this.sign === 1) {
        if (
          roundingMode === ROUNDING_MODE.TOWARD_INF ||
          roundingMode === ROUNDING_MODE.UP
        ) {
          return Infinity
        } else {
          return MAX_VALUE
        }
      } else {
        if (
          roundingMode === ROUNDING_MODE.TOWARD_ZERO ||
          roundingMode === ROUNDING_MODE.UP
        ) {
          return -MAX_VALUE
        } else {
          return -Infinity
        }
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

  static setPrecision () {
    throw new Error("Use setDecimalPrecision or setBinaryPrecision")
  }

  /**
   * Set the default precision, in digits of DECIMAL. Note that while setBinaryPrecision/getBinaryPrecision is an
   * identity, setDecimalPrecision and getDecimalPrecision
   * @param prec
   */
  static setDecimalPrecision (prec) {
    if (typeof prec !== 'number') throw new TypeError('Decimal precision must be a number')

    BigFloat.setBinaryPrecision(Math.ceil(LOG210 * prec))
  }

  static setBinaryPrecision (prec) {
    if (typeof prec !== 'number') throw new TypeError('Binary precision must be a number')

    prec = prec | 0
    if (prec < BIGFLOAT_MIN_PRECISION_BITS || prec > BIGFLOAT_MAX_PRECISION_BITS) {
      throw new RangeError(
        `BigFloat binary precision must be an integer in the range [${BIGFLOAT_MIN_PRECISION_BITS}, ${BIGFLOAT_MAX_PRECISION_BITS}]`
      )
    }

    CURRENT_PRECISION = prec
  }

  static getDecimalPrecision () {
    return Math.floor(CURRENT_PRECISION / LOG210)
  }

  static getBinaryPrecision () {
    return CURRENT_PRECISION
  }

  /**
   * User-friendly add function that takes in both JS numbers and plain floats.
   * @param f1 {BigFloat|number}
   * @param f2 {BigFloat|number}
   * @param precision
   * @param roundingMode
   */
  static add (
    f1,
    f2,
    precision = CURRENT_PRECISION,
    roundingMode = CURRENT_ROUNDING_MODE
  ) {
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
  static sub (
    f1,
    f2,
    precision = CURRENT_PRECISION,
    roundingMode = CURRENT_ROUNDING_MODE
  ) {
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
  static div (
    f1,
    f2,
    precision = CURRENT_PRECISION,
    roundingMode = CURRENT_ROUNDING_MODE
  ) {
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
  static mul (
    f1,
    f2,
    precision = CURRENT_PRECISION,
    roundingMode = CURRENT_ROUNDING_MODE
  ) {
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

    if (typeof a === 'number' && typeof b === 'number') {
      if (a < b) {
        return -1
      } else if (a === b) {
        return 0
      } else if (a > b) {
        return 1
      } else {
        return NaN
      }
    }

    if (a instanceof BigFloat && typeof b === 'number') {
      if (BigFloat.isNaN(a) || Number.isNaN(b)) return NaN

      const aSign = a.sign
      const bSign = Math.sign(b)

      if (aSign < bSign) {
        return -1
      } else if (aSign > bSign) return 1

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
    } else if (typeof a === 'number' && b instanceof BigFloat) {
      return -BigFloat.cmp(b, a)
    }

    throw new Error('Invalid arguments to cmpNumber')
  }

  static abs (f, precision=CURRENT_PRECISION) {
    let ret = BigFloat.new(precision)

    ret.setFromFloat(f)
    if (ret.sign === -1) ret.sign = 1

    return ret
  }

  /**
   * Set the working precision and run the given function, then reset the precision to what it was before
   * @param precision {number}
   * @param callback {Function}
   */
  static withWorkingBinaryPrecision (precision, callback) {
    let currentPrecision = BigFloat.getBinaryPrecision()

    BigFloat.setBinaryPrecision(precision)
    callback()
    BigFloat.setBinaryPrecision(currentPrecision)
  }

  /**
   * Set the working precision and run the given function, then reset the precision to what it was before
   * @param precision {number}
   * @param callback {Function}
   */
  static withWorkingDecimalPrecision (precision, callback) {
    let currentPrecision = BigFloat.getBinaryPrecision()

    BigFloat.setDecimalPrecision(precision)
    callback()
    BigFloat.setBinaryPrecision(currentPrecision)
  }

  valueOf () {
    return this.toNumber(ROUNDING_MODE.NEAREST)
  }

  /**
   * Returns true if the numbers are equal (allows for JS numbers to be used)
   * @param f {BigFloat|number}
   * @returns {boolean}
   */
  equals (f) {
    return BigFloat.cmp(this, f) === 0
  }

  /**
   * Returns true if this float is greater than or equal to the argument (allows for JS numbers to be used)
   * @param f {BigFloat|number}
   * @returns {boolean}
   */
  greaterEq (f) {
    return BigFloat.cmp(this, f) >= 0
  }

  /**
   * Returns true if this float is greater than the argument (allows for JS numbers to be used)
   * @param f {BigFloat|number}
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
   * @param f {BigFloat|number}
   * @returns {boolean}
   */
  lessThan (f) {
    return BigFloat.cmp(this, f) === -1
  }

  static sqrt (f1, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
    f1 = cvtToBigFloat(f1)

    let sign = f1.sign

    // Special handlers
    if (sign === 0) {
      return BigFloat.fromNumber(0, precision)
    } else if (sign < 0) {
      return BigFloat.fromNumber(NaN, precision)
    } else if (sign === Infinity) {
      return BigFloat.fromNumber(Infinity, precision)
    } else {
      // We get a high accuracy estimate of the square root by converting f1 to a number ;)
      let mant = f1.mant
      let mantEstimate = (mant[0] * BIGFLOAT_WORD_MAX) + mant[1] + (mant.length > 2 ? (mant[2] / BIGFLOAT_WORD_MAX) : 0)
      let sqrtEstimate = Math.sqrt(mantEstimate)

      // We use a Newton-Raphson approach, which has quadratic convergence. With 52 bits of precision already, we need
      // ceil(log2(prec / 52)) iterations to achieve full precision.

      // x_0 = sqrtEstimate; x_(n+1) = 0.5 * (x_n + mantEstimate / x_n).

      let workingPrecision = precision + 4
      let iters = Math.ceil(Math.log2(workingPrecision / 52)) + 1

      let f = BigFloat.new(workingPrecision), xn = BigFloat.new(workingPrecision)
      f.setFromFloat(f1)
      f.exp = 2  // f == mantEstimate

      let tmp = BigFloat.new(workingPrecision), tmp2 = BigFloat.new(workingPrecision)
      xn.setFromNumber(sqrtEstimate)

      for (let i = 0; i < iters; ++i) {
        BigFloat.divTo(f, xn, tmp, ROUNDING_MODE.WHATEVER) // tmp = mantEstimate / x_n
        BigFloat.addTo(xn, tmp, tmp2, ROUNDING_MODE.WHATEVER)
        BigFloat.mulPowTwoTo(tmp2, -1, tmp2)

        ;[tmp2, xn] = [xn, tmp2]
      }

      BigFloat.mulPowTwoTo(xn, -30 + 15 * f1.exp, xn)
      return xn.toBigFloat(precision)
    }
  }

  /**
   * Compute the arithmetic-geometric mean of two numbers
   * @param f1
   * @param f2
   * @param precision
   */
  static agm (f1, f2, precision=CURRENT_PRECISION) {
    f1 = cvtToBigFloat(f1)
    f2 = cvtToBigFloat(f2)

    let workingPrecision = precision + 4

    let an = BigFloat.new(workingPrecision), bn = BigFloat.new(workingPrecision), tmp = BigFloat.new(workingPrecision), tmp2 = BigFloat.new(workingPrecision)
    let err = BigFloat.new(30)

    an.setFromFloat(f1)
    bn.setFromFloat(f2)

    // agm convergence is a bit finnicky... for wildly different f1 and f2 it first converges slowly (bit by bit), then
    // suddenly quadratically. It's still pretty fast, though.
    for (let i = 0; i < 100; ++i) {
      BigFloat.addTo(an, bn, tmp)
      BigFloat.mulPowTwoTo(tmp, -1, tmp)
      BigFloat.mulTo(an, bn, tmp2)
      bn = BigFloat.sqrt(tmp2, workingPrecision)

      ;[an, tmp] = [tmp, an]
      BigFloat.subTo(an, bn, err)

      if (BigFloat.floorLog2(err, true) < BigFloat.floorLog2(bn) - precision) {
        break
      }
    }

    return an.toBigFloat(precision)
  }

  /**
   * Returns the natural logarithm of f.
   * @param f
   * @param precision
   * @param roundingMode
   * @returns {BigFloat}
   */
  static ln (
    f,
    precision = CURRENT_PRECISION,
    roundingMode = CURRENT_ROUNDING_MODE
  ) {
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

    // ln(f) is about pi * f * 2^(m-2) / (2 * agm(f * 2^(m-2), 1)) - m * ln(2), where m + ln2(x) > prec / 2

    let m = Math.ceil(precision / 2 - BigFloat.floorLog2(f))
    let tmp = BigFloat.new(precision), tmp2 = BigFloat.new(precision)

    BigFloat.mulPowTwoTo(f, m - 2, tmp) // tmp = 2 ^ (m-2)
    let den = BigFloat.agm(tmp, 1, precision)
    BigFloat.mulPowTwoTo(den, 1, den)

    BigFloat.mulTo(tmp, getCachedPi(precision), tmp2) // tmp = pi * f * 2 ^ (m-2)
    BigFloat.divTo(tmp2, den, tmp)

    BigFloat.mulNumberTo(getCachedLn2(precision), m, tmp2)
    return BigFloat.sub(tmp, tmp2, precision)
  }

  /**
   * Compute the standard logarithm of f.
   * @param f {BigFloat}
   * @param precision {number}
   * @param roundingMode {number}
   * @returns {BigFloat}
   */
  static log10 (
    f,
    precision = CURRENT_PRECISION,
    roundingMode = CURRENT_ROUNDING_MODE
  ) {
    f = cvtToBigFloat(f)

    // log10 (x) = ln(x) / ln(10)
    const num = BigFloat.ln(f, precision)
    const den = getCachedLn10(precision)

    return BigFloat.div(num, den, precision)
  }

  static exp (
    f,
    precision = CURRENT_PRECISION,
    roundingMode = CURRENT_ROUNDING_MODE
  ) {
    f = cvtToBigFloat(f)
    let sign = f.sign

    if (Number.isNaN(sign)) return BigFloat.NaN(precision)
    if (sign === 0) return BigFloat.fromNumber(1, precision)

    let n = BigFloat.floorLog2(f, true)

    if (n < 0) {
      // f < 0.5
      return expBaseCase(f, precision)
    } else {
      let a = BigFloat.new(precision)

      // f = a * 2^n, 0.5 <= a < 1
      BigFloat.mulPowTwoTo(f, -n, a)

      let mul = expBaseCase(a, precision)

      // Repeated squaring; every shift requires one squaring
      for (; n >= 0; --n) {
        BigFloat.mulTo(mul, mul, a)
        ;[mul, a] = [a, mul]
      }

      return a
    }
  }

  static pow10 (f, precision = CURRENT_PRECISION) {
    // 10^f = e^(f * ln(10))
    f = cvtToBigFloat(f)

    let workingPrecision = precision + 2
    let tmp = BigFloat.mul(f, getCachedLn10(workingPrecision), workingPrecision)

    return BigFloat.exp(tmp, precision)
  }

  /**
   * Convert a float to a readable base-10 representation, with prec base-10 digits of precision.
   */
  toPrecision (prec, roundingMode = CURRENT_ROUNDING_MODE) {
    const MAX_PRECISION = 1000

    if (typeof prec !== 'number' || !Number.isInteger(prec) || prec < 1 || prec > MAX_PRECISION) {
      throw new Error(`Precision must be an integer between 1 and ${MAX_PRECISION}`)
    }

    let sign = this.sign

    if (!Number.isFinite(sign)) {
      return sign + ''
    } else if (sign === 0) {
      if (prec === 1) return '0'
      return '0.' + '0'.repeat(prec - 1)
    }

    // The number is non-zero. We have a couple of methods to convert the number to a decimal representation, rounded
    // in the correct direction; the rounding makes things a bit more complicated, though, because we need to keep track
    // of errors in the computation.

    prec = prec | 0
    // f = 10^frac(log10(f)) * 10^floor(log10(f)) = m * 10^e

    let workingPrecision = ((prec * LOG210) | 0) + 10

    this.sign = Math.abs(sign)

    let log10 = BigFloat.log10(this, workingPrecision)
    this.sign = sign

    let e = BigFloat.new(53),
      m = BigFloat.new(workingPrecision)
    BigFloat.splitIntegerTo(log10, e, m, ROUNDING_MODE.NEAREST)
    e = e.toNumber()

    if (BigFloat.cmp(m, 0) === 0) {
      e -= 1
      m.setFromFloat(BigFloat.ONE)
    }

    m = BigFloat.pow10(m, workingPrecision)

    let [beforeDigits, afterDigits] = mantissaToBaseWithPrecision(m.mant, m.exp, prec)

    if (true) {
      let digits = ((sign === -1) ? '-' : '') + trimLeft(beforeDigits, '0') + '.' + afterDigits.slice(0, prec)

      return `${digits}e${e}`
    }

    return digits
  }
}

// Used for intermediate calculations to avoid allocating floats unnecessarily
const DOUBLE_STORE = BigFloat.new(53)
