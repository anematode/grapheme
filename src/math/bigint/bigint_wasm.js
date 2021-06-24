import { WASM } from "../../wasm/wasm.js"
import { BigInt } from "./bigint.js"

/**
 * Load a bigint into memory
 * @param bigint {BigInt}
 * @returns BigInt pointer
 */
export function loadBigInt (bigint) {
  let ptr = WASM._grapheme_bigint_external_init(bigint.sign, bigint.wordCount, bigint.wordCount)
  if (!ptr) throw new Error("Unable to initialize WASM big integer")

  // Put in the words, the space for which has already been allocated
  let wordsPtr = WASM._grapheme_bigint_get_words(ptr) >> 2
  WASM.HEAP32.set(bigint.words.subarray(0, bigint.wordCount), wordsPtr)

  return ptr
}

export function readBigInt (ptr) {
  let wordsPtr = WASM._grapheme_bigint_get_words(ptr) >> 2
  let wordCount = WASM._grapheme_bigint_get_word_count(ptr)
  let sign = WASM._grapheme_bigint_get_sign(ptr)

  return new BigInt().initFromWords(WASM.HEAP32.subarray(wordsPtr, wordsPtr + wordCount), sign)
}

export function createBigIntPtr () {
  return WASM._grapheme_bigint_init_from_single_word(0, 0)
}

export function hintAllocateWords (ptr, words) {
  return WASM._grapheme_bigint_allocate_words(ptr, words);
}

export function multiplyBigIntInPlace (ptr, multiplicand) {
  WASM._grapheme_bigint_multiply_in_place(ptr, multiplicand)
}

export function addBigIntInPlace (ptr, addend) {
  WASM._grapheme_bigint_add_in_place(ptr, addend)
}

export function freeBigInt (ptr) {
  WASM._grapheme_free_bigint(ptr)
}
