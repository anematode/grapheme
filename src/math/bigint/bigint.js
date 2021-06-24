import {isTypedArray, leftZeroPad} from "../../core/utils.js"
import {integerExp, rationalExp} from "../real/fp_manip.js"
import { ROUNDING_MODE } from "../rounding_modes.js"

const BIGINT_WORD_BITS = 30
const BIGINT_WORD_PART_BITS = BIGINT_WORD_BITS / 2

const BIGINT_WORD_BIT_MASK = 0x3FFFFFFF          // get the last 30 bits of a given word (removing the two junk bits)
const BIGINT_WORD_LOW_PART_BIT_MASK = 0x7FFF     // get the last 15 bits of a given word. Getting the high part is just >> 15
const BIGINT_WORD_OVERFLOW_BIT_MASK = 0x40000000 // get the overflow bit of a given word (aka the 31st bit)

const BIGINT_WORD_SIZE = 2 ** BIGINT_WORD_BITS
const BIGINT_WORD_MAX = BIGINT_WORD_SIZE - 1

/**
 * Return the number of bits a given word uses.
 */
function wordBitCount (word) {
  return 32 - Math.clz32(word)
}

/**
 * Get the number of bits used by a given set of 30-bit words.
 * @param words
 * @param wordCount
 * @returns {*}
 */
function getBitCount (words, wordCount) {
  let lastIndex = wordCount - 1
  const lastWord = words[lastIndex]

  return wordBitCount(lastWord) + lastIndex * BIGINT_WORD_BITS
}

export function mulWords (word1, word2) {
  return mulAddWords(word1, word2, 0)
}

// Multiply and add three 30-bit words and return the low and high part of the result. (word1 * word2 + word3)
export function mulAddWords (word1, word2, word3) {
  let word1Lo = word1 & BIGINT_WORD_LOW_PART_BIT_MASK
  let word2Lo = word2 & BIGINT_WORD_LOW_PART_BIT_MASK
  let word1Hi = word1 >> BIGINT_WORD_PART_BITS
  let word2Hi = word2 >> BIGINT_WORD_PART_BITS

  let low = Math.imul(word1Lo, word2Lo), high = Math.imul(word1Hi, word2Hi)
  let middle = Math.imul(word2Lo, word1Hi) + Math.imul(word1Lo, word2Hi)

  low += ((middle & BIGINT_WORD_LOW_PART_BIT_MASK) << BIGINT_WORD_PART_BITS) + word3
  low >>>= 0

  if (low > BIGINT_WORD_OVERFLOW_BIT_MASK) {
    high += low >>> BIGINT_WORD_BITS
    low &= BIGINT_WORD_BIT_MASK
  }

  high += middle >> BIGINT_WORD_PART_BITS // add the high part of middle

  return [ low, high ]
}

export function multiplyBigInts(int1, int2) {
  if (int1.isZero() || int2.isZero()) return new BigInt(0)

  const { words: int1words, wordCount: int1wordCount, sign: int1sign } = int1
  const { words: int2words, wordCount: int2wordCount, sign: int2sign } = int2

  let end = int1wordCount + int2wordCount + 1
  let out = new Int32Array(end)

  // Textbook multiplication, go through each word of int1 and multiply by each word of int2
  for (let int1wordIndex = 0; int1wordIndex < int1wordCount; ++int1wordIndex) {
    let word1 = int1words[int1wordIndex]
    let carry = 0

    let word1Lo = word1 & BIGINT_WORD_LOW_PART_BIT_MASK
    let word1Hi = word1 >> BIGINT_WORD_PART_BITS

    for (let int2wordIndex = 0; int2wordIndex < end; ++int2wordIndex) {
      if (int2wordIndex >= int2wordCount && carry === 0) break
      let word2 = int2wordIndex < int2wordCount ? int2words[int2wordIndex] : 0

      let outIndex = int1wordIndex + int2wordIndex

      let word2Lo = word2 & BIGINT_WORD_LOW_PART_BIT_MASK
      let word2Hi = word2 >> BIGINT_WORD_PART_BITS

      let low = Math.imul(word1Lo, word2Lo), high = Math.imul(word1Hi, word2Hi)
      let middle = Math.imul(word2Lo, word1Hi) + Math.imul(word1Lo, word2Hi)

      low += ((middle & BIGINT_WORD_LOW_PART_BIT_MASK) << BIGINT_WORD_PART_BITS) + carry + out[outIndex]
      low >>>= 0

      if (low > BIGINT_WORD_OVERFLOW_BIT_MASK) {
        high += low >>> BIGINT_WORD_BITS
        low &= BIGINT_WORD_BIT_MASK
      }

      high += middle >> BIGINT_WORD_PART_BITS

      out[outIndex] = low
      carry = high
    }
  }

  return new BigInt().initFromWords(out, int1sign * int2sign)
}

/**
 * Remove trailing zeroes from an array or typed array (returning a subarray in the latter case for efficiency)
 * @param array
 */
function trimTrailingZeroes (array) {
  const isArray = Array.isArray(array)
  if (isArray || isTypedArray(array)) {
    let i = array.length - 1
    for (; i >= 0; --i) {
      if (array[i] !== 0) break
    }
    if (i === -1) return isArray ? [0] : new Int32Array(1)

    return isArray ? array.slice(0, i+1) : array.subarray(0, i+1)
  } else {
    throw new TypeError("trimTrailingZeroes only operates on Arrays and TypedArrays")
  }
}

// lol
const NativeBigInt = (0n).constructor

/**
 * Big integers in JS! I would use the native implementation or JSBI, but I want a pretty customized setup for fast
 * multiplication, division, et cetera. Also, this will be fun.
 *
 * We represent a big-integer with an array of unsigned 30-bit words with the least significant bit at the front, and a
 * sign (-1, 0, or 1). Big-integers are not immutable and may be modified via certain in-place operations.
 *
 * As an example, "-45" is represented with { sign: -1, words: [45] }. "-1073741823" is { sign: -1, words: [ 1073741823 ] },
 * while "-1073741824" is { sign: -1, words: [ 0, 1 ]}. wordCount is the number of elements of words that are actually
 * used, which helps sometimes when the array shrinks and the top elements are all 0. "0" simply represented with a
 * wordCount of 1 and a single word 0. We will generally use typed arrays in here, specifically the Int32Array,
 * which may allow some asm.js fun in the future!
 */
export class BigInt {
  constructor (arg1, arg2) {
    if (typeof arg1 === "number") {
      this.initFromNumber(arg1)
    } else if (typeof arg1 === "string") {
      this.initFromString(arg1, arg2)
    } else if (typeof arg1 === "bigint") {
      this.initFromNativeBigint(arg1)
    } else if (arg1 instanceof BigInt) {
      this.initFromBigint(arg1)
    }
  }

  /**
   * Add bigint with same sign in place
   * @param num {BigInt}
   * @returns {BigInt}
   * @private
   */
  _addSameSignInPlace (num) {
    if (num.isZero()) return this

    // We'll need at most this many bits
    this.allocateBits(Math.max(num.bitCount(), this.bitCount()) + 1)

    const { words: otherWords, wordCount: otherWordCount } = num
    const { words, wordCount } = this

      // Add the other bigint's words to this one
    for (let i = 0; i < otherWordCount; ++i) {
      words[i] += otherWords[i]
    }

    // We need to check the words between [0, i] for carries
    let checkCarryCount = Math.min(otherWordCount, wordCount)

    let carry = 0, i = 0
    for (; i < words.length; ++i) {
      let word = words[i] + carry

      // Do carries
      if ((word & BIGINT_WORD_OVERFLOW_BIT_MASK) !== 0) {
        words[i] = word & BIGINT_WORD_BIT_MASK
        carry = 1
      } else {
        words[i] = word
        carry = 0

        if (i >= checkCarryCount) break
      }
    }

    // Update word count
    this.wordCount = Math.max(i, wordCount, otherWordCount)
  }

  /**
   * Adds the number in place, IGNORING SIGN
   * @param num
   */
  _addNumberSameSignInPlace (num) {
    if (num === 0) return

    if (num <= BIGINT_WORD_MAX) {
      // For small nums, we just add and carry. It's super similar to the longer case, but we have this for speed since
      // incrementing and such is a very common operation
      const {words, wordCount} = this

      let carry = num, i = 0
      for (; i < wordCount; ++i) {
        let word = words[i] + carry

        if ((word & BIGINT_WORD_OVERFLOW_BIT_MASK) !== 0) {
          words[i] = word & BIGINT_WORD_BIT_MASK
          carry = 1
        } else {
          words[i] = word
          carry = 0
          break
        }
      }

      // Happens when we increment from 2^30-1 to 2^30
      if (carry !== 0) {
        this.allocateWords(i + 1)
        this.words[i] = carry
        this.wordCount = i + 1
      }
    } else {
      this._addSameSignInPlace(new BigInt(num))
    }
  }

  /**
   * Subtracts the number in place, IGNORING SIGN
   * @param num
   */
  _subtractNumberSameSignInPlace (num) {
    if (num === 0) return this

    if (num <= BIGINT_WORD_MAX) {
      const { words, wordCount } = this
      if (wordCount === 1) {
        let firstWord = words[0]

        firstWord -= num
        if (firstWord === 0) {
          this.sign = 0
        } else if (firstWord < 0) {
          this.sign *= -1
          firstWord = -firstWord
        }

        words[0] = firstWord
        return this
      }

      let carry = num, i = 0
      for (; i < wordCount; ++i) {
        let word = words[i] - carry

        if (word < 0) {
          word = word + BIGINT_WORD_SIZE
          words[i] = word
          carry = 1
        } else {
          words[i] = word
          break
        }
      }
      // Carry should never equal 1
    } else {
      this._subtractSameSignInPlace(new BigInt(num))
    }
  }

  _subtractSameSignInPlace(num) {
    if (num instanceof BigInt) {
      this.allocateBits(Math.max(this.bitCount(), num.bitCount()))
      let spaceship = this.magnitudeSpaceship(num) // -1 if we're less than num, 0 if equal, 1 if greater

      if (spaceship === 0) {
        this.setZero()
        return
      }

      const { words, wordCount } = this
      const { words: otherWords, wordCount: otherWordCount } = num

      let maxCarryIndex = 0

      if (spaceship === 1) { // If we're greater, just subtract from our words
        for (let i = 0; i < otherWordCount; ++i) {
          if ((words[i] -= otherWords[i]) < 0) {
            maxCarryIndex = i
          }
        }
      } else {
        for (let i = 0; i < otherWordCount; ++i) {
          if ((words[i] = otherWords[i] - words[i]) < 0) {
            maxCarryIndex = i
          }
        }
      }

      let wordsToExamine = Math.max(wordCount, otherWordCount)

      let carry = 0
      for (let j = 0; j < wordsToExamine; ++j) {
        let word = words[j] - carry

        if (word < 0) {
          word += BIGINT_WORD_SIZE
          words[j] = word
          carry = 1
        } else {
          words[j] = word
          carry = 0
          if (j > maxCarryIndex) break
        }
      }

      if (spaceship === -1) this.sign *= -1

      this.recomputeWordCount()
    } else {
      this._subtractSameSignInPlace(new BigInt(num))
    }
  }

  addInPlace (num, flipSign=false) {
    if (typeof num === "number") {
      if (num === 0) return this

      if (this.sign === 0) {
        this.initFromNumber(num)
        if (flipSign) this.sign *= -1

        return this
      }

      if ((Math.sign(num) === this.sign) !== flipSign) {
        this._addNumberSameSignInPlace(Math.abs(num))
      } else {
        this._subtractNumberSameSignInPlace(Math.abs(num))
      }
    } else if (num instanceof BigInt) {
      if (num.isZero()) return this

      if (this.sign === 0) {
        this.initFromBigint(num)
        if (flipSign) this.sign *= -1

        return this
      }

      if ((this.sign === num.sign) !== flipSign) {
        this._addSameSignInPlace(num)
      } else {
        this._subtractSameSignInPlace(num)
      }
    } else {
      this.addInPlace(new BigInt(num), flipSign)
    }

    return this
  }

  add (bigint) {
    return this.clone().addInPlace(bigint)
  }

  subtractInPlace (num) {
    // Call addInPlace(-num)
    return this.addInPlace(num, true)
  }

  subtract (bigint) {
    return this.clone().subtractInPlace(bigint)
  }

  /**
   * Increase the size of the backing Int32Array to allow bitCount bits to be stored
   * @param bitCount
   */
  allocateBits (bitCount) {
    this.allocateWords(Math.ceil(bitCount / BIGINT_WORD_BITS))
  }

  /**
   * Shrink to fit the least number of words this bigint needs
   */
  shrinkToFit () {
    if (this.wordCount === this.words.length) return

    const newWords = new Int32Array(this.wordCount)
    newWords.set(this.words.subarray(0, this.wordCount))

    this.words = newWords
  }

  /**
   * Increase the size of the backing Int32Array, copying over the contents from the previous one
   * @param wordCount
   */
  allocateWords (wordCount) {
    if (wordCount <= this.words.length) return

    const newWords = new Int32Array(wordCount)
    newWords.set(this.words)

    this.words = newWords
  }

  /**
   * Get the total number of bits used; in other words, the number of bits in the last word + the number of bits in all
   * the preceding words
   */
  bitCount () {
    return getBitCount(this.words, this.wordCount)
  }

  clone () {
    return new BigInt(this)
  }

  /**
   * Init from another Grapheme bigint
   * @param int
   */
  initFromBigint (int) {
    let { words, sign, wordCount } = int

    this.words = new Int32Array(words.subarray(0, wordCount))
    this.sign = sign
    this.wordCount = wordCount

    return this
  }

  equals (bigint) {
    return this._compare(bigint, true, true, true)
  }

  /**
   * Internal function comparing this integer to another integer.
   * @param bigint {BigInt|number}
   * @param lessThan {boolean} Whether to test as less than (<) or greater than (>)
   * @param orEqual {boolean} Whether to return true if the integers are equal
   * @param onlyEqual {boolean} Whether to only return true if the integers are equal
   * @returns {boolean}
   * @private
   */
  _compare (bigint, lessThan=true, orEqual=false, onlyEqual=false) {
    if (bigint instanceof BigInt) {
      let sign = this.sign, otherSign = bigint.sign

      if (sign < otherSign) return lessThan && !onlyEqual
      if (sign > otherSign) return !lessThan && !onlyEqual
      if (sign === 0) return orEqual

      let bitcount = this.bitCount(), otherBitcount = bigint.bitCount()

      if (bitcount < otherBitcount) return ((sign === 1) === lessThan) && !onlyEqual
      if (bitcount > otherBitcount) return ((sign === 1) !== lessThan) && !onlyEqual

      let wordCount = this.wordCount, words = this.words, otherWords = bigint.words

      for (let i = wordCount; i >= 0; --i) {
        let word = words[i], otherWord = otherWords[i]
        if (word > otherWord) return ((sign === 1) !== lessThan) && !onlyEqual
        if (word < otherWord) return ((sign === 1) === lessThan) && !onlyEqual
      }

      return orEqual
    } else if (typeof bigint === "number") {
      if (!Number.isFinite(bigint)) return false
      let sign = this.sign, otherSign = Math.sign(bigint)

      if (sign < otherSign) return lessThan && !onlyEqual
      if (sign > otherSign) return !lessThan && !onlyEqual
      if (sign === 0) return orEqual

      bigint *= otherSign

      if (bigint <= BIGINT_WORD_MAX) {
        if (this.wordCount > 1) return false
        let diff = this.words[0] - bigint

        if (diff > 0) return ((sign === 1) !== lessThan) && !onlyEqual
        if (diff < 0) return ((sign === 1) === lessThan) && !onlyEqual
        return orEqual
      }

      let bitCount = this.bitCount()
      let givenBitCount = Math.log2(bigint) + 1

      // Give some leniency in case of rounding errors (which shouldn't technically happen, but ehh I don't want to prove it)
      if (bitCount < Math.floor(givenBitCount) - 1) return ((sign === 1) === lessThan) && !onlyEqual
      else if (bitCount > Math.ceil(givenBitCount) + 1) return ((sign === 1) !== lessThan) && !onlyEqual
    }

    // Fallback for other types
    return this._compare(new BigInt(bigint), lessThan, orEqual, onlyEqual)
  }

  /**
   * Returns -1 if less than bigint2, 0 if equal, 1 if greater than, IGNORING THE SIGN
   * @param bigint {BigInt}
   * @returns {boolean|number|*}
   */
  magnitudeSpaceship (bigint) {
    let sign = this.sign, otherSign = bigint.sign
    if (sign === 0) {
      return (otherSign === 0) ? 0 : -1
    } else if (otherSign === 0) {
      return (sign === 0) ? 0 : 1
    }

    let bitcount = this.bitCount(), otherBitcount = bigint.bitCount()

    if (bitcount < otherBitcount) return -1
    if (bitcount > otherBitcount) return 1

    let wordCount = this.wordCount, words = this.words, otherWords = bigint.words

    for (let i = wordCount; i >= 0; --i) {
      let word = words[i], otherWord = otherWords[i]
      if (word > otherWord) return 1
      if (word < otherWord) return -1
    }

    return 0
  }

  lessThan (bigint) {
    return this._compare(bigint, true, false)
  }

  lessThanOrEqual (bigint) {
    return this._compare(bigint, true, true)
  }

  greaterThan (bigint) {
    return this._compare(bigint, false, false)
  }

  greaterThanOrEqual (bigint) {
    return this._compare(bigint, false, true)
  }

  /**
   * Create Grapheme bigint from native bigint
   * @param int {bigint}
   */
  initFromNativeBigint (int) {
    // We basically just use repeated bit shifts to get all the words we want.
    let words = []
    let sign = 1

    if (int === 0n) {
      this.initZero()
      return
    } else if (int < 0n) {
      sign = -1
      int = -int
    }

    const mask = NativeBigInt(BIGINT_WORD_BIT_MASK)
    const wordBits = NativeBigInt(BIGINT_WORD_BITS)

    while (int) {
      words.push(Number(int & mask))

      int >>= wordBits
    }

    this.initFromWords(words, sign)
    return this
  }

  /**
   * We construct words, wordCount and sign from a JS number. If val is NaN or ±Infinity, we throw an error. Profiling:
   * on 5/26/2021, got 0.00025 ms/iteration for random floats in [0, 1e6]. Also got 0.0016 ms/iteration for random floats
   * in [0, 1e200], which is more a reflection of the performance of leftShiftInPlace.
   * @param val
   */
  initFromNumber (val) {
    if (!Number.isFinite(val)) throw new RangeError("Numeric value passed to BigInt constructor must be finite")

    val = Math.trunc(val)           // Guaranteed to be an integer
    const sign = Math.sign(val) + 0 // convert -0 to +0 :D

    val *= sign

    if (val <= BIGINT_WORD_MAX) { // can initialize directly=
      this.initFromWords( [ val ], sign)
      return
    }


    // We now convert the number into the form [i, e] where i is an integer within the 2^53 range and e is an exponent.
    // The bit pattern of the number is thus
    //     1 0 1 0 0 0 1 0 1 0 0 1  0 0 0 0 0 0 0 0 0 0 0 0 0
    //     -----------------------  -------------------------
    //            integer i               e extra zeroes
    // Funnily enough, all integers are represented in this way, even if they aren't massive. But it is consistent.
    // Thus, we initialize with two words corresponding to the upper and lower halves of the 53-bit integer i, then
    // left shift the bits by the exponent e times.
    let [ integer, exponent ] = integerExp(val)

    this.initFromWords([ integer % BIGINT_WORD_SIZE, Math.floor(integer / BIGINT_WORD_SIZE) ], sign)
    this.leftShiftInPlace(exponent)

    return this
  }

  initFromSingleWord (word, sign=1) {
    this.words = new Int32Array([word])
    this.sign = sign
    this.wordCount = 1
  }

  multiply (bigint) {
    return multiplyBigInts(this, bigint)
  }

  /**
   * TODO: optimize
   * @param str
   * @param radix
   */
  initFromString (str, radix=10) {
    if (!Number.isInteger(radix) || radix < 2 || radix > 36) throw new RangeError("Radix must be an integer between 2 and 36")

    function throwInvalidDigitError(digit, index) {
      throw new RangeError(`Invalid digit '${String.fromCharCode(digit)}' in base-${radix} string at index ${index}`)
    }

    const CHUNKING_EXPONENTS = [
      29, 536870912,
      18, 387420489,
      14, 268435456,
      12, 244140625,
      11, 362797056,
      10, 282475249,
      9, 134217728,
      9, 387420489,
      9, 1000000000,
      8, 214358881,
      8, 429981696,
      8, 815730721,
      7, 105413504,
      7, 170859375,
      7, 268435456,
      7, 410338673,
      7, 612220032,
      7, 893871739,
      6, 64000000,
      6, 85766121,
      6, 113379904,
      6, 148035889,
      6, 191102976,
      6, 244140625,
      6, 308915776,
      6, 387420489,
      6, 481890304,
      6, 594823321,
      6, 729000000,
      6, 887503681,
      5, 33554432,
      5, 39135393,
      5, 45435424,
      5, 52521875,
      5, 60466176
    ]

    const CHUNKING_EXPONENT = CHUNKING_EXPONENTS[2 * radix - 4]
    const CHUNK_SIZE = CHUNKING_EXPONENTS[2 * radix - 3]

    this.setZero()

    let startIndex = 0
    if (str[0] === '-') startIndex = 1

    const digits = []

    for (let i = startIndex; i < str.length; ++i) {
      let digit = str.charCodeAt(i)

      // 0x30 - 0; 0x39 - 9; 0x61 - a; 0x7a - z
      let val = 0
      if (digit < 0x30 || digit > 0x7a) {
        throwInvalidDigitError(digit, i)
      } else if (digit <= 0x39) {
        val = digit - 0x30
      } else if (digit >= 0x61) {
        val = digit - 0x61 + 10
      } else {
        throwInvalidDigitError(digit, i)
      }

      if (val >= radix)
        throwInvalidDigitError(digit, i)

      digits.push(val)
    }

    this.allocateBits(Math.ceil(Math.log2(radix) * digits.length))

    // Initial word
    let initialGroupSize = (digits.length - 1) % CHUNKING_EXPONENT + 1, i = 0, chunk = 0
    for (; i < initialGroupSize; ++i) {
      chunk *= radix
      chunk += digits[i]
    }

    this.addInPlace(chunk)

    for (let j = i; j < digits.length; j += CHUNKING_EXPONENT) {
      this.multiplyInPlace(CHUNK_SIZE)

      let chunk = 0, jEnd = j + CHUNKING_EXPONENT
      for (let k = j; k < jEnd; ++k) {
        chunk *= radix
        chunk += digits[k]
      }

      this.addInPlace(chunk)
    }

    this.recomputeWordCount()

    if (str[0] === '-') {
      this.sign = -1
    } else if (this.isZero()) {
      this.sign = 0
    } else {
      this.sign = 1
    }
  }

  /**
   * Sign 0 is 0, sign 1 is 1, sign -1 is -1. There is no negative zero big int.
   * @param words
   * @param sign
   */
  initFromWords(words, sign=1) {
    words = trimTrailingZeroes(words)

    this.words = new Int32Array(words)
    this.wordCount = words.length
    this.sign = sign

    return this
  }

  initZero () {
    this.words = new Int32Array(1)
    this.wordCount = 1
    this.sign = 0
  }

  /**
   * Returns true if the big integer is zero.
   * @returns {boolean}
   */
  isZero () {
    return this.wordCount === 1 && this.words[0] === 0
  }

  leftShiftInPlace (count) {
    count = count | 0

    if (!Number.isInteger(count) || count < 0) throw new RangeError("Left shift count must be a nonnegative integer")
    if (count === 0) return

    // Number of bits after shifting
    let newBitCount = this.bitCount() + count
    this.allocateBits(newBitCount)

    let { words, wordCount } = this

    // We split up the shift into a multiple of 30 shift and a normal shift.
    let shifts = count % BIGINT_WORD_BITS
    let wordShifts = Math.floor(count / BIGINT_WORD_BITS)

    if (count >= BIGINT_WORD_BITS) {
      // We use copyWithin to shift the current words from [0, wordCount - 1] to [wordShifts, wordShifts + wordCount - 1]
      words.copyWithin(wordShifts, 0, wordCount)

      // Fill [0, wordShifts - 1] with 0s
      words.fill(0, 0, wordShifts)

      wordCount += wordShifts
    }

    if (shifts !== 0) {
      // We now perform a smaller shift in which we iterate from [wordCount - 1] down to 0 and shift the current value of
      // the cell up by <shifts>. We know that shifts is less than 30. The algorithm here is to take the word value, right
      // shift it by (30 - shift value), and add that to the larger word. Then, shift the word value to the left by
      // (shift value), remove the extra 31st and 32nd bits with & 0x3FFFFFFF, and rewrite the word.
      let rightShift = BIGINT_WORD_BITS - shifts

      for (let i = wordCount - 1; i >= wordShifts; --i) {
        let word = words[i]
        let carry = word >> rightShift

        if (carry !== 0) words[i + 1] += carry

        word <<= shifts
        words[i] = word & BIGINT_WORD_BIT_MASK
      }
    }

    // Should be reliable
    this.wordCount = Math.ceil(newBitCount / BIGINT_WORD_BITS)
  }

  /**
   * Multiply the bigint in place by a number or biginteger val. Hard to optimize it more than this, sadly. If only JS
   * had 64-bit multiplication... :(
   * @param val
   */
  multiplyInPlace (val) {
    if (typeof val === "number" && Math.abs(val) <= BIGINT_WORD_MAX) {
      if (val === 0) {
        this.setZero()
        return
      }

      if (val === 1) return
      if (val === -1) this.sign *= -1

      this.allocateBits(wordBitCount(val) + this.bitCount())

      const { words, wordCount } = this

      let word2Lo = val & BIGINT_WORD_LOW_PART_BIT_MASK
      let word2Hi = val >> BIGINT_WORD_PART_BITS

      let carry = 0
      for (let i = 0; i < wordCount; ++i) {
        let word = words[i]

        let word1Lo = word & BIGINT_WORD_LOW_PART_BIT_MASK
        let word1Hi = word >> BIGINT_WORD_PART_BITS

        let low = Math.imul(word1Lo, word2Lo), high = Math.imul(word1Hi, word2Hi)
        let middle = Math.imul(word2Lo, word1Hi) + Math.imul(word1Lo, word2Hi)

        low += ((middle & BIGINT_WORD_LOW_PART_BIT_MASK) << BIGINT_WORD_PART_BITS) + carry
        low >>>= 0

        if (low > BIGINT_WORD_OVERFLOW_BIT_MASK) {
          high += low >>> BIGINT_WORD_BITS
          low &= BIGINT_WORD_BIT_MASK
        }

        high += middle >> BIGINT_WORD_PART_BITS // add the high part of middle

        words[i] = low
        carry = high
      }

      if (carry !== 0) {
        words[wordCount] = carry
        this.wordCount += 1
      }

      this.sign *= Math.sign(val)
    } else if (val instanceof BigInt) {
      this.initFromBigint(multiplyBigInts(this, val))
    } else {
      this.multiplyInPlace(new BigInt(val))
    }
  }

  /**
   * Get the word count by starting at the end of the array, searching for 0s and setting the wordCount accordingly.
   */
  recomputeWordCount () {
    const { words } = this

    for (let i = words.length - 1; i >= 0; --i) {
      if (words[i] !== 0) {
        this.wordCount = i + 1
        return
      }
    }

    this.wordCount = 1 // There is always at least one word, even if the bigint has value 0
  }

  rightShiftInPlace (count) {
    count = count | 0

    if (!Number.isInteger(count) || count < 0) throw new RangeError("Right shift count must be a nonnegative integer")
    if (count === 0) return

    // Number of bits after shifting
    let newBitCount = this.bitCount() - count
    if (newBitCount <= 0) {
      this.setZero()
      return
    }

    this.wordCount = Math.ceil(newBitCount / BIGINT_WORD_BITS)
  }

  setZero () {
    this.words = new Int32Array(1)
    this.wordCount = 1
    this.sign = 0

    return this
  }

  toBigint () { // Not too hard, we just construct it from the words in order
    const { words } = this

    let out = 0n
    let wordBits = NativeBigInt(BIGINT_WORD_BITS)

    for (let i = this.wordCount - 1; i >= 0; --i) {
      out <<= wordBits
      out += NativeBigInt(words[i])
    }

    return out
  }

  /**
   * Here, we abuse floats a little bit to get a quick expansion for large radixes, as is used for base-10 conversion
   * when we chunk the number into base 10^15. The concept is quite simple; we start with the highest word, add it,
   * multiply everything by 2^30, and repeat.
   * @param radix
   * @returns {number[]}
   */
  toLargeRadixInternal (radix) {
    radix = +radix

    if (!Number.isInteger(radix) || radix <= 4294967296 || radix >= 4503599627370496) throw new RangeError("Base of radix conversion must be an integer between 4294967296 and 4503599627370496, inclusive.")

    const digitsOut = [0]
    const { words } = this

    for (let wordIndex = words.length - 1; wordIndex >= 0; --wordIndex) {
      let carry = 0, i = 0
      for (; i < digitsOut.length; ++i) {
        let digit = digitsOut[i] * BIGINT_WORD_SIZE // Because we're working with floats, this operation is exact

        // The low part, before adding the carry; this is exact
        let remainder = digit % radix

        // floor(digit / radix) is sus because the division might round up and thus be incorrect, so we nudge it
        // in the right direction. floor(x + 0.5) is slightly faster than round(x)
        let nextCarry = Math.floor((digit - remainder) / radix + 0.5)

        // Need to add the carry
        digit = remainder + carry

        // If the digit has gone beyond the radix, we need to update the next carry
        if (digit >= radix) {
          nextCarry++
          digit -= radix
        }

        digitsOut[i] = digit
        carry = nextCarry
      }

      if (carry) digitsOut[i] = carry

      let word = words[wordIndex]
      digitsOut[0] += word
    }

    // Carry any remaining stuff
    let carry = 0, i = 0
    for (; i < digitsOut.length; ++i) {
      digitsOut[i] += carry

      if (digitsOut[i] >= radix) {
        carry = 1
        digitsOut[i] -= radix
      } else {
        carry = 0
        break
      }
    }

    if (carry) digitsOut[i] = carry

    return digitsOut
  }


  /**
   * Convert the bigint to its closest double representation with the given rounding mode. We do this by abstracting a
   * double as basically a number of the form
   *
   *    .... 0 0 0 0 0 1 0 1 0 0 0 0 1 0 1 0 0 1 0 1 0 0 0 1 1 0 0 1 0 0 1 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ....
   *      ...  zeroes |                             53 bits                                  |  zeroes ...
   *
   * The closest number thus begins with the first bit of the integer, wherever that is, then either agrees or disagrees
   * with the rest of the integer. Having constructed the mantissa, we round in the correct direction and multiply by
   * the exponent.
   *
   * TODO
   */
  toNumber (roundingMode) {
    // Example: 17 = 0b10001

    let exponent = this.bitCount() - 1 // bitCount is 5, so the float will be of the form m * 2^4
    let word1 = this.getWordsAtBit(0, 2)
    let word2 = this.getWordAtBit(30)
  }

  toPow2RadixInternal (radix) {
    radix = +radix

    if (radix === 1073741824) return this.words.subarray(0, this.wordCount)
    else return this.toRadixInternal(radix) // TODO
  }

  /**
   * Returns an array of integers corresponding to the digits in the expansion of a given radix. For example, converting
   * the BigInt corresponding to 5002 (20212021 base 3) to radix 3 will give [1, 2, 0, 2, 1, 2, 0, 2]. 0 gives an empty
   * array for all inputs. This function is relatively important to optimize, especially for radix=10, because it is
   * expensive but important. I will do some digging later, but currently it averages between 2 to 10 times slower than
   * native for some reason.
   * @param radix {number} Base for the conversion; should be an integer between 2 and 1125899906842600.
   */
  toRadixInternal (radix) {
    radix = +radix

    if (!Number.isInteger(radix) || radix <= 1 || radix >= 1125899906842600) throw new RangeError("Base of radix conversion must be an integer between 2 and 1125899906842600, inclusive.")

    // We construct the output via decomposing the integer into a series of operations of either x * 2 or x + 1,
    // applying each to the digitsOut array. These operations correspond to the bits of the BigInt in reverse order.
    const digitsOut = []
    const { words } = this

    // Is the radix large enough for these optimizations
    let canMultiplyBy8 = radix >= 8
    let canMultiplyBy4 = radix >= 4

    function doMultiplications () {
      while (queuedMultiplications > 0) {
        if (queuedMultiplications > 2 && canMultiplyBy8) {
          let carry = 0, i = 0
          for (; i < digitsOut.length; ++i) {
            let currentDigit = digitsOut[i]
            let newDigit = (currentDigit * 8) + carry

            if (newDigit < radix) {
              carry = 0
            } else if (newDigit < 2 * radix) {
              carry = 1
              newDigit -= radix
            } else if (newDigit < 3 * radix) {
              carry = 2
              newDigit -= 2 * radix
            } else if (newDigit < 4 * radix) {
              carry = 3
              newDigit -= 3 * radix
            } else if (newDigit < 5 * radix) {
              carry = 4
              newDigit -= 4 * radix
            } else if (newDigit < 6 * radix) {
              carry = 5
              newDigit -= 5 * radix
            } else if (newDigit < 7 * radix) {
              carry = 6
              newDigit -= 6 * radix
            } else {
              carry = 7
              newDigit -= 7 * radix
            }

            digitsOut[i] = newDigit
          }
          if (carry !== 0) digitsOut[i] = carry

          queuedMultiplications -= 3
        } else if (queuedMultiplications > 1 && canMultiplyBy4) {
          let carry = 0, i = 0
          for (; i < digitsOut.length; ++i) {
            let currentDigit = digitsOut[i]
            let newDigit = (currentDigit * 4) + carry

            if (newDigit < radix) {
              carry = 0
            } else if (newDigit < 2 * radix) {
              carry = 1
              newDigit -= radix
            } else if (newDigit < 3 * radix) {
              carry = 2
              newDigit -= 2 * radix
            } else {
              carry = 3
              newDigit -= 3 * radix
            }

            digitsOut[i] = newDigit
          }
          if (carry !== 0) digitsOut[i] = carry

          queuedMultiplications -= 2
        } else {
          let carry = 0, i = 0
          for (; i < digitsOut.length; ++i) {
            let currentDigit = digitsOut[i]
            let newDigit = (currentDigit * 2) + carry

            if (newDigit >= radix) {
              newDigit -= radix
              carry = 1
            } else {
              carry = 0
            }

            digitsOut[i] = newDigit
          }
          if (carry === 1) digitsOut[i] = 1

          queuedMultiplications--
        }
      }
    }

    let queuedMultiplications = 0

    // For each word, starting at the most significant word...
    for (let wordIndex = words.length - 1; wordIndex >= 0; --wordIndex) {
      let word = words[wordIndex]

      for (let j = 0; j < BIGINT_WORD_BITS; ++j) {
        queuedMultiplications++
        word <<= 1

        // For each bit in the word, from most to least significant
        if ((word & BIGINT_WORD_OVERFLOW_BIT_MASK) !== 0) {
          // Run the queued multiplications
          doMultiplications()

          let carry = 1, i = 0
          for (; i < digitsOut.length; ++i) {
            let currentDigit = digitsOut[i]
            let newDigit = currentDigit + carry

            if (newDigit >= radix) {
              newDigit = newDigit - radix
              carry = 1
            } else {
              carry = 0
            }

            digitsOut[i] = newDigit
            if (carry === 0) break // early exit condition
          }

          if (carry === 1) digitsOut[i] = 1
        }
      }
    }

    doMultiplications()

    return digitsOut.length === 0 ? [0] : digitsOut
  }

  /**
   * Convert this BigInt to a string with a base between 2 and 36, inclusive. Formatting options are included.
   * @param radix {number}
   * @returns {string}
   */
  toString (radix=10) {
    // The algorithm is as follows: We calculate the digits of the integer in a base (radix)^n, where n is chosen so that
    // the base fits nicely into a JS number. We then go chunk by chunk and convert to string, then concatenate
    // everything into a single output

    if (!Number.isInteger(radix) || radix < 2 || radix > 36) throw new RangeError("Base of radix conversion must be an integer between 2 and 36, inclusive.")

    const CHUNKING_EXPONENTS = [
      50, 1125899906842624,
      31, 617673396283947,
      25, 1125899906842624,
      21, 476837158203125,
      19, 609359740010496,
      17, 232630513987207,
      16, 281474976710656,
      15, 205891132094649,
      15, 1000000000000000,   // for example, we convert to base 10^15 instead of 10 first
      14, 379749833583241,
      13, 106993205379072,
      13, 302875106592253,
      13, 793714773254144,
      12, 129746337890625,
      12, 281474976710656,
      12, 582622237229761,
      11, 64268410079232,
      11, 116490258898219,
      11, 204800000000000,
      11, 350277500542221,
      11, 584318301411328,
      11, 952809757913927,
      10, 63403380965376,
      10, 95367431640625,
      10, 141167095653376,
      10, 205891132094649,
      10, 296196766695424,
      10, 420707233300201,
      10, 590490000000000,
      10, 819628286980801,
      10, 1125899906842624,
      9, 46411484401953,
      9, 60716992766464,
      9, 78815638671875,
      9, 101559956668416
    ]

    const CHUNK_EXPONENT = CHUNKING_EXPONENTS[2 * radix - 4]
    const digits = this.toLargeRadixInternal(CHUNKING_EXPONENTS[2 * radix - 3])

    let out = (this.sign < 0 ? '-' : '') + digits[digits.length - 1].toString(radix)
    for (let i = digits.length - 2; i >= 0; --i) {
      out += leftZeroPad(digits[i].toString(radix), CHUNK_EXPONENT, '0')
    }

    return out
  }
}

