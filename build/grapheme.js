(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Grapheme = {}));
}(this, (function (exports) { 'use strict';

  /**
   * @file This file defines functions for bit-level manipulation of double-precision floating point numbers. More
   * information can be found in Grapheme Theory.
   */

  /**
   * Check endianness. The functions in this file will not work on big-endian systems, so we need to throw an error if that is the case.
   * Credit goes to Lucio Pavia on StackOverflow, specifically {@link https://stackoverflow.com/a/52827031/13458117|this answer}.
   * It is released under CC BY-SA 4.0, which is compatible with this project.
   * @ignore
   */
  const isBigEndian = (() => {
    const array = new Uint8Array(4);
    const view = new Uint32Array(array.buffer);
    return !((view[0] = 1) & array[0]);
  })();

  if (isBigEndian) throw new Error('only works on little-endian systems; your system is mixed- or big-endian.'); // Used for bit-level manipulation of floats

  const floatStore = new Float64Array(1);
  const intView = new Uint32Array(floatStore.buffer);
  /**
   * Returns the next floating point number after a positive x, but doesn't account for special cases.
   * @param x {number}
   * @returns {number}
   * @private
   */

  function _roundUp(x) {
    floatStore[0] = x;
    if (++intView[0] === 4294967296
    /* uint32_max + 1 */
    ) ++intView[1];
    return floatStore[0];
  }
  /**
   * Returns the previous floating point number before a positive x, but doesn't account for special cases.
   * @param x {number}
   * @returns {number}
   * @private
   */


  function _roundDown(x) {
    floatStore[0] = x;
    if (--intView[0] === -1) --intView[1];
    return floatStore[0];
  }
  /**
   * Returns the next floating point number after x. For example, roundUp(0) returns Number.MIN_VALUE.
   * Special cases (±inf, NaNs, 0) are handled separately. (An interesting special case is -Number.MIN_VALUE,
   * which would normally return -0 and thus must be handled separately.) Then, the float is put into a TypedArray,
   * treated as an integer, and incremented, which sets it to the next representable value. roundUp should
   * NEVER return -0 or -Infinity, but it can accept those values. On my computer both these functions take about
   * 20 ns / call (October 2020). They need to be performant because they are called very often (every interval
   * function, pretty much).
   * @param x {number} Any floating-point number
   * @returns {number} The next representable floating-point number, handling special cases
   * @function roundUp
   * @memberOf FP
   */


  function roundUp(x) {
    // Special cases, where the float representation will mess us up
    if (x === Infinity) return Infinity;
    if (x === -Infinity) return -Number.MAX_VALUE; // since -0 === 0, deals with signed zero

    if (x === 0) return Number.MIN_VALUE;
    if (Number.isNaN(x)) return NaN; // Special case unique to roundUp

    if (x === -Number.MIN_VALUE) return 0;
    return x < 0 ? -_roundDown(-x) : _roundUp(x);
  }
  /**
   * Returns the previous floating point number before x. For example, roundUp(0) returns -Number.MIN_VALUE.
   * See {@link FP.roundUp} for implementation explanation. This function should NEVER return -0 or
   * +Infinity, but it can accept those values; roundDown(0) is -Number.MIN_VALUE and roundDown(Infinity) is
   * Number.MAX_VALUE.
   * @param x {number} Any floating-point number
   * @returns {number} The previous representable floating-point number, handling special cases
   * @function roundDown
   * @memberOf FP
   */

  function roundDown(x) {
    if (x === Infinity) return Number.MAX_VALUE;
    if (x === -Infinity) return -Infinity;
    if (x === 0) return -Number.MIN_VALUE;
    if (Number.isNaN(x)) return NaN;
    return x < 0 ? -_roundUp(-x) : _roundDown(x);
  } // The first positive normal number

  const POSITIVE_NORMAL_MIN = 2.2250738585072014e-308; // The first negative normal number

  const NEGATIVE_NORMAL_MAX = -POSITIVE_NORMAL_MIN;
  /**
   * Return whether a number is denormal; see {@link https://en.wikipedia.org/wiki/Denormal_number|Wikipedia} for a
   * technical explanation of what this means. ±0 are not considered denormal numbers. Denormal numbers are sometimes
   * known as subnormal numbers.
   * @param x {number} Any floating-point number
   * @returns {boolean} Whether the number is a denormal number
   * @function isDenormal
   * @memberOf FP
   */

  function isDenormal(x) {
    // Note that NaN will return false, since NaN < anything is false.
    return x !== 0 && x < POSITIVE_NORMAL_MIN && x > NEGATIVE_NORMAL_MAX;
  }
  /**
   * Get the non-biased exponent of a floating-point number x. Equivalent mathematically to floor(log2(abs(x))) for
   * finite values, but more accurate as the precision of log2 is not technically guaranteed. My tests on Chrome suggest
   * that it is actually twice as fast as floor(log2(...)), which is surprising; the culprit is likely the log2 function,
   * which must calculate to full precision before being floored.
   * @param x {number} Any floating-point number
   * @returns {number} The non-biased exponent of that number's floating-point representation
   * @function getExponent
   * @memberOf FP
   */

  function getExponent(x) {
    floatStore[0] = x; // Mask the biased exponent, retrieve it and convert it to non-biased

    return ((intView[1] & 0x7ff00000) >> 20) - 1023;
  } // Internal function

  function _getMantissaHighWord() {
    return intView[1] & 0x000fffff;
  }
  /**
   * Get the mantissa of a floating-point number as an integer in [0, 2^52).
   * @param x {number} Any floating-point number
   * @returns {number} An integer in [0, 2^52) containing the mantissa of that number
   * @function getMantissa
   * @memberOf FP
   */


  function getMantissa(x) {
    floatStore[0] = x;
    return intView[0] + _getMantissaHighWord() * 4294967296;
  }
  function getExponentAndMantissa(x) {
    floatStore[0] = x;
    return [((intView[1] & 0x7ff00000) >> 20) - 1023, intView[0] + _getMantissaHighWord() * 4294967296];
  }
  /**
   * Testing function counting the approximate number of floats between x1 and x2, including x1 but excluding x2. NaN if
   * either is undefined. It is approximate because the answer may sometimes exceed Number.MAX_SAFE_INTEGER, but it is
   * exact if the answer is less than Number.MAX_SAFE_INTEGER.
   * @param x1 {number} The lesser number
   * @param x2 {number} The greater number
   * @returns {number} The number of floats in the interval [x1, x2)
   * @function getExponent
   * @memberOf FP
   */

  function countFloatsBetween(x1, x2) {
    if (Number.isNaN(x1) || Number.isNaN(x2)) {
      return NaN;
    }

    if (x1 === x2) return 0;

    if (x2 < x1) {
      const tmp = x1;
      x1 = x2;
      x2 = tmp;
    }

    const [x1man, x1exp] = frExp(x1);
    const [x2man, x2exp] = frExp(x2);
    return (x2man - x1man) * 2 ** 53 + (x2exp - x1exp) * 2 ** 52;
  }
  /**
   * Calculates 2 ^ exp, using a customized method for integer exponents. An examination of V8's pow function didn't
   * reveal any special handling, and indeed my benchmark indicates this method is 3 times faster than pow for integer
   * exponents. Note that bit shifts can't really be used except for a restricted range of exponents.
   * @param exp {number} Exponent; intended for use with integers, but technically works with any floating-point number.
   * @returns {number} Returns 2 ^ exp, and is guaranteed to be exact for integer exponents.
   * @function pow2
   * @memberOf FP
   */

  function pow2(exp) {
    if (!Number.isInteger(exp)) return Math.pow(2, exp);
    if (exp > 1023) return Infinity;
    if (exp < -1074) return 0;

    if (exp < -1022) {
      // Works because of JS's insane casting systems
      const field = 1 << exp + 1074;

      if (exp > -1043) {
        // denormalized case 1
        intView[0] = 0;
        intView[1] = field;
      } else {
        // case 2
        intView[0] = field;
        intView[1] = 0;
      }
    } else {
      intView[0] = 0;
      intView[1] = exp + 1023 << 20;
    }

    return floatStore[0];
  } // Counts the number of trailing zeros in a 32-bit integer n; similar to <i>Math.clz32</i>.

  function countTrailingZeros(n) {
    let bits = 0;

    if (n !== 0) {
      let x = n; // Suck off groups of 16 bits, then 8 bits, et cetera

      if ((x & 0x0000FFFF) === 0) {
        bits += 16;
        x >>>= 16;
      }

      if ((x & 0x000000FF) === 0) {
        bits += 8;
        x >>>= 8;
      }

      if ((x & 0x0000000F) === 0) {
        bits += 4;
        x >>>= 4;
      }

      if ((x & 0x00000003) === 0) {
        bits += 2;
        x >>>= 2;
      }

      bits += x & 1 ^ 1;
    } else {
      return 32;
    }

    return bits;
  } // Internal function


  function _mantissaCtz() {
    const bits = countTrailingZeros(intView[0]);

    if (bits === 32) {
      const secondWordCount = countTrailingZeros(_getMantissaHighWord());
      return 32 + Math.min(secondWordCount, 20);
    }

    return bits;
  }
  /**
   * Counts the number of trailing zeros in the mantissa of a floating-point number, between 0 and 52.
   * @param d {number} A floating-point number
   * @returns {number} The number of trailing zeros in that number's mantissa
   * @function mantissaCtz
   * @memberOf FP
   */


  function mantissaCtz(d) {
    floatStore[0] = d;
    return _mantissaCtz();
  } // Internal function

  function _mantissaClz() {
    const bits = Math.clz32(_getMantissaHighWord()) - 12; // subtract the exponent zeroed part

    return bits !== 20 ? bits : bits + Math.clz32(intView[0]);
  }
  /**
   * Counts the number of leading zeros in the mantissa of a floating-point number, between 0 and 52.
   * @param d {number} A floating-point number
   * @returns {number} The number of leading zeros in that number's mantissa
   * @function mantissaClz
   * @memberOf FP
   */


  function mantissaClz(d) {
    floatStore[0] = d;
    return _mantissaClz();
  }
  /**
   * Converts a floating-point number into a fraction in [0.5, 1) or (-1, -0.5], except special cases, and an exponent,
   * such that fraction * 2 ^ exponent gives the original floating point number. If x is ±0, ±Infinity or NaN, [x, 0] is
   * returned to maintain this guarantee.
   * @param x {number} Any floating-point number
   * @returns {number[]} [fraction, exponent]
   * @function frExp
   * @memberOf FP
   */

  function frExp(x) {
    if (x === 0 || !Number.isFinite(x)) return [x, 0]; // +1 so that the fraction is between 0.5 and 1 instead of 1 and 2

    let exp = getExponent(x) + 1; // Denormal

    if (exp === -1022) {
      // If the mantissa is the integer m, then we should subtract clz(m) from exp to get a suitable answer
      exp -= _mantissaClz();
    }

    return [x / pow2(exp), exp];
  }
  /**
   * Converts a floating-point number into a numerator, denominator and exponent such that it is equal to n/d * 2^e. n and
   * d are guaranteed to be less than or equal to 2^53 and greater than or equal to 0 (unless the number is ±0, Infinity,
   * or NaN, at which point [x, 1, 0] is returned). See Grapheme Theory for details. n/d is between 0.5 and 1.
   * @param x {number} Any floating-point number
   * @returns {number[]} [numerator, denominator, exponent]
   * @function rationalExp
   * @memberOf FP
   */

  function rationalExp(x) {
    const [frac, denExponent, exp] = rationalExpInternal(x);
    let den = pow2(denExponent);
    return [frac * den, den, exp];
  }

  function rationalExpInternal(x) {
    if (x < 0) {
      const [num, den, exp] = rationalExpInternal(-x);
      return [-num, den, exp];
    }

    if (x === 0 || !Number.isFinite(x)) return [x, 0, 0]; // Decompose into frac * 2 ^ exp

    const [frac, exp] = frExp(x); // This tells us the smallest power of two which frac * (2 ** shift) is an integer, which is the denominator
    // of the dyadic rational corresponding to x

    const denExponent = 53 - mantissaCtz(frac);
    return [frac, denExponent, exp];
  }
  /**
   * Converts a floating-point number into an integer and exponent [i, e], so that i * 2^e gives the original number. i
   * will be within the bounds of Number.MAX_SAFE_INTEGER.
   * @param x
   */


  function integerExp(x) {
    const [frac, denExponent, exp] = rationalExpInternal(x);
    return [frac * pow2(denExponent), exp - denExponent];
  }
  /**
   * Compute an ACCURATE floor log 2 function. floor(log2(268435455.99999994)), for example, returns 28 when it should
   * mathematically return 27.
   * @param x
   */

  function flrLog2(x) {
    let exp = getExponent(x) + 1;
    if (exp === -1022) exp -= _mantissaClz();
    return exp - 1;
  }

  var fp_manip = /*#__PURE__*/Object.freeze({
    __proto__: null,
    floatStore: floatStore,
    intView: intView,
    roundUp: roundUp,
    roundDown: roundDown,
    isDenormal: isDenormal,
    getExponent: getExponent,
    getMantissa: getMantissa,
    getExponentAndMantissa: getExponentAndMantissa,
    countFloatsBetween: countFloatsBetween,
    pow2: pow2,
    mantissaCtz: mantissaCtz,
    mantissaClz: mantissaClz,
    frExp: frExp,
    rationalExp: rationalExp,
    integerExp: integerExp,
    flrLog2: flrLog2
  });

  // import { WASM } from "../wasm/wasm.js"
  let version = 0;
  /**
   * This function returns a number starting from 1 that never decreases. It is used to store "when" an operation has
   * occurred, and thus whether to consider it a change.
   * @returns {number}
   */

  function getVersionID() {
    return ++version;
  }
  function benchmark(callback, iterations = 100, name) {
    const start = performance.now();

    for (let i = 0; i < iterations; ++i) {
      callback();
    }

    const duration = performance.now() - start;
    console.log("Function ".concat(name !== null && name !== void 0 ? name : callback.name, " took ").concat(duration / iterations, " ms") + (iterations === 1 ? '.' : ' per call.'));
  }
  function time(callback, output = console.log) {
    const start = performance.now();
    let result = 'finished';

    try {
      callback();
    } catch (e) {
      result = 'threw';
      throw e;
    } finally {
      output("Function ".concat(callback.name, " ").concat(result, " in ").concat(performance.now() - start, " ms."));
    }
  }
  function assertRange(num, min, max, variableName = 'Unknown variable') {
    if (num < min || num > max || Number.isNaN(num)) {
      throw new RangeError("".concat(variableName, " must be in the range [").concat(min, ", ").concat(max, "]"));
    }
  }
  function isPrimitive(obj) {
    return typeof obj === 'object' && obj !== null;
  } // Generate an id of the form xxxx-xxxx
  // TODO: guarantee no collisions via LFSR or something similar

  function getStringID() {
    function randLetter() {
      return String.fromCharCode(Math.round(Math.random() * 25 + 97));
    }

    function randFourLetter() {
      return randLetter() + randLetter() + randLetter() + randLetter();
    }

    return randFourLetter() + '-' + randFourLetter();
  } // Simple deep equals. Uses Object.is-type equality, though. Doesn't handle circularity or any of the fancy new containers

  function deepEquals(x, y) {
    if (typeof x !== "object" || x === null) return Object.is(x, y);
    if (x.constructor !== y.constructor) return false;

    if (Array.isArray(x) && Array.isArray(y)) {
      if (x.length !== y.length) return false;

      for (let i = x.length - 1; i >= 0; --i) {
        if (!deepEquals(x[i], y[i])) return false;
      }

      return true;
    } // The only other thing of consequence to us. Could probably handle other weird objects too, but meh.


    if (isTypedArray(x) && isTypedArray(y)) {
      if (x.length !== y.length) return false;

      if (x instanceof Float32Array || x instanceof Float64Array) {
        for (let i = x.length - 1; i >= 0; --i) {
          const xv = x[i]; // What a beautiful way to test for same valueness between floats!

          if (xv !== y[i] && !(xv !== xv && y[i] !== y[i]) || xv === 0 && 1 / xv !== 1 / y[i]) return false;
        }
      } else {
        for (let i = x.length - 1; i >= 0; --i) {
          if (x[i] !== y[i]) return false;
        }
      }

      return true;
    }

    if (x instanceof Map || x instanceof Set) return false; // Just in case
    // x and y are just objects

    const keys = Object.keys(x);
    if (Object.keys(y).length !== keys.length) return false;

    for (const key of keys) {
      // fails if y is Object.create(null)
      if (!y.hasOwnProperty(key)) return false;
      if (!deepEquals(x[key], y[key])) return false;
    }

    return true;
  }
  /**
   * Merge two objects, not checking for circularity, not merging arrays, modifying the first object
   * @param target {{}}
   * @param source {{}}
   * @param opts
   */

  function deepAssign(target, source, opts = {}) {
    var _opts$cloneArrays, _opts$assignUndefined;

    opts.cloneArrays = (_opts$cloneArrays = opts.cloneArrays) !== null && _opts$cloneArrays !== void 0 ? _opts$cloneArrays : true;
    opts.assignUndefined = (_opts$assignUndefined = opts.assignUndefined) !== null && _opts$assignUndefined !== void 0 ? _opts$assignUndefined : false;
    return deepAssignInternal(target, source, opts);
  }

  function deepAssignInternal(target, source, opts) {
    if (typeof source !== "object") return source !== undefined || opts.assignUndefined ? source : target;
    if (Array.isArray(target) || isTypedArray(target)) return opts.cloneArrays ? deepClone(source) : source;

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        let sourceVal = source[key];

        if (opts.assignUndefined || sourceVal !== undefined) {
          let val = target[key];
          let sourceIsArray = Array.isArray(sourceVal) || isTypedArray(sourceVal);

          if (typeof val === "object" && !Array.isArray(val)) {
            if (typeof sourceVal === "object" && !sourceIsArray) {
              deepAssign(val, sourceVal, opts);
              continue;
            }
          }

          target[key] = sourceIsArray && opts.cloneArrays ? deepClone(sourceVal) : sourceVal;
        }
      }
    }

    return target;
  }
  /**
   * Same as deepAssign, but creating a copy of the object. Arrays are optionally copied.
   * @param target {{}}
   * @param source {{}}
   * @param opts
   */


  function deepMerge(target, source, opts = {}) {
    if (target === undefined) return deepClone(source, opts);
    return deepAssign(deepClone(target, opts), source, opts);
  }
  /**
   * Deep clone an object, not checking for circularity or other weirdness, optionally cloning arrays
   * @param object
   * @param opts
   */

  function deepClone(object, opts = {}) {
    var _opts$cloneArrays2;

    opts.cloneArrays = (_opts$cloneArrays2 = opts.cloneArrays) !== null && _opts$cloneArrays2 !== void 0 ? _opts$cloneArrays2 : true;
    return deepCloneInternal(object, opts);
  }

  function deepCloneInternal(object, opts = {}) {
    if (typeof object !== "object") return object;

    if (Array.isArray(object)) {
      return opts.cloneArrays ? object.map(val => deepCloneInternal(val, opts)) : object;
    } else if (isTypedArray(object)) {
      return opts.cloneArrays ? new object.constructor(object) : object;
    }

    let ret = {};

    for (let key in object) {
      if (object.hasOwnProperty(key)) {
        ret[key] = deepClone(object[key], opts);
      }
    }

    return ret;
  }

  function isTypedArray(arr) {
    return ArrayBuffer.isView(arr) && !(arr instanceof DataView);
  }
  function mod(n, m) {
    return (n % m + m) % m;
  }
  function nextPowerOfTwo(n) {
    return 1 << Math.ceil(Math.log2(n));
  }
  /**
   * Freeze an object and all its children. Does not account for cycles
   * @param obj
   */

  function deepFreeze(obj) {
    Object.freeze(obj);
    Object.values(obj).forEach(value => {
      if (typeof value === "function" || typeof value === "object") deepFreeze(value);
    });
    return obj;
  }
  function leftZeroPad(str, len, char = '0') {
    if (str.length >= len) return str;
    return char.repeat(len - str.length) + str;
  }
  function rightZeroPad(str, len, char = '0') {
    if (str.length >= len) return str;
    return str + char.repeat(len - str.length);
  }
  /**
   * Credit to https://github.com/gustf/js-levenshtein/blob/master/index.js. Find the Levenshtein distance between two
   * strings.
   */

  const levenshtein = function () {
    function _min(d0, d1, d2, bx, ay) {
      return d0 < d1 || d2 < d1 ? d0 > d2 ? d2 + 1 : d0 + 1 : bx === ay ? d1 : d1 + 1;
    }

    return function (a, b) {
      if (a === b) {
        return 0;
      }

      if (a.length > b.length) {
        var tmp = a;
        a = b;
        b = tmp;
      }

      var la = a.length;
      var lb = b.length;

      while (la > 0 && a.charCodeAt(la - 1) === b.charCodeAt(lb - 1)) {
        la--;
        lb--;
      }

      var offset = 0;

      while (offset < la && a.charCodeAt(offset) === b.charCodeAt(offset)) {
        offset++;
      }

      la -= offset;
      lb -= offset;

      if (la === 0 || lb < 3) {
        return lb;
      }

      var x = 0;
      var y, d0, d1, d2, d3, dd, dy, ay, bx0, bx1, bx2, bx3;
      var vector = [];

      for (y = 0; y < la; y++) {
        vector.push(y + 1);
        vector.push(a.charCodeAt(offset + y));
      }

      var len = vector.length - 1;

      for (; x < lb - 3;) {
        bx0 = b.charCodeAt(offset + (d0 = x));
        bx1 = b.charCodeAt(offset + (d1 = x + 1));
        bx2 = b.charCodeAt(offset + (d2 = x + 2));
        bx3 = b.charCodeAt(offset + (d3 = x + 3));
        dd = x += 4;

        for (y = 0; y < len; y += 2) {
          dy = vector[y];
          ay = vector[y + 1];
          d0 = _min(dy, d0, d1, bx0, ay);
          d1 = _min(d0, d1, d2, bx1, ay);
          d2 = _min(d1, d2, d3, bx2, ay);
          dd = _min(d2, d3, dd, bx3, ay);
          vector[y] = dd;
          d3 = d2;
          d2 = d1;
          d1 = d0;
          d0 = dy;
        }
      }

      for (; x < lb;) {
        bx0 = b.charCodeAt(offset + (d0 = x));
        dd = ++x;

        for (y = 0; y < len; y += 2) {
          dy = vector[y];
          vector[y] = dd = _min(dy, d0, dd, bx0, vector[y + 1]);
          d0 = dy;
        }
      }

      return dd;
    };
  }();
  const onReadyCallbacks = [];
  function onReady(callback) {
    onReadyCallbacks.push(callback);
  }
  setTimeout(() => {
    for (const callback of onReadyCallbacks) callback();
  }, 0);

  var utils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getVersionID: getVersionID,
    benchmark: benchmark,
    time: time,
    assertRange: assertRange,
    isPrimitive: isPrimitive,
    getStringID: getStringID,
    deepEquals: deepEquals,
    deepAssign: deepAssign,
    deepMerge: deepMerge,
    deepClone: deepClone,
    isTypedArray: isTypedArray,
    mod: mod,
    nextPowerOfTwo: nextPowerOfTwo,
    deepFreeze: deepFreeze,
    leftZeroPad: leftZeroPad,
    rightZeroPad: rightZeroPad,
    levenshtein: levenshtein,
    onReady: onReady
  });

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      if (enumerableOnly) symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
      keys.push.apply(keys, symbols);
    }

    return keys;
  }

  function _objectSpread2(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};

      if (i % 2) {
        ownKeys(Object(source), true).forEach(function (key) {
          _defineProperty(target, key, source[key]);
        });
      } else if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      } else {
        ownKeys(Object(source)).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
      }
    }

    return target;
  }

  function _taggedTemplateLiteral(strings, raw) {
    if (!raw) {
      raw = strings.slice(0);
    }

    return Object.freeze(Object.defineProperties(strings, {
      raw: {
        value: Object.freeze(raw)
      }
    }));
  }

  function _classPrivateMethodGet(receiver, privateSet, fn) {
    if (!privateSet.has(receiver)) {
      throw new TypeError("attempted to get private field on non-instance");
    }

    return fn;
  }

  /**
   * @file Basic functions for common operations on floating-point numbers.
   */

  /**
   * Returns x + y.
   * @param x {number}
   * @param y {number}
   * @returns {number}
   * @function add
   * @memberOf RealFunctions
   */
  function Add$1(x, y) {
    return x + y;
  }
  /**
   * Returns x - y.
   * @param x {number}
   * @param y {number}
   * @returns {number}
   * @function subtract
   * @memberOf RealFunctions
   */

  function Subtract$1(x, y) {
    return x - y;
  }
  /**
   * Returns x * y.
   * @param x {number}
   * @param y {number}
   * @returns {number}
   * @function multiply
   * @memberOf RealFunctions
   */

  function Multiply$1(x, y) {
    return x * y;
  }
  /**
   * Returns x / y.
   * @param x {number}
   * @param y {number}
   * @returns {number}
   * @function divide
   * @memberOf RealFunctions
   */

  function Divide$1(x, y) {
    return x / y;
  }
  /**
   * Returns the greatest common divisor of a and b. Uses the Euclidean algorithm. Returns NaN if one of them is not an
   * integer, and the non-zero argument if one of them is zero (0 if both are zero).
   * @param a {number}
   * @param b {number}
   * @returns {number}
   * @function gcd
   * @memberOf RealFunctions
   */

  function Gcd(a, b) {
    if (!Number.isInteger(a) || !Number.isInteger(b)) return NaN;
    a = Math.abs(a);
    b = Math.abs(b);

    if (a === 0) {
      return b;
    }

    if (b === 0) {
      return a;
    }

    if (b > a) {
      const tmp = a;
      a = b;
      b = tmp;
    }

    while (true) {
      if (b === 0) {
        return a;
      }

      a %= b;

      if (a === 0) {
        return b;
      }

      b %= a;
    }
  }
  /**
   * Returns the least common multiple of two a and b. Returns NaN if one of them is not an integer, and returns the
   * non-zero argument if one of them is zero (0 if both are zero).
   * @param a {number}
   * @param b {number}
   * @returns {number}
   * @function lcm
   * @memberOf RealFunctions
   */

  function Lcm(a, b) {
    if (a === 0) {
      return Math.abs(b);
    }

    if (b === 0) {
      return Math.abs(a);
    }

    const abGCD = gcd(a, b);
    return Math.abs(a / abGCD * b);
  }

  var BASIC_ARITHMETIC = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Add: Add$1,
    Subtract: Subtract$1,
    Multiply: Multiply$1,
    Divide: Divide$1,
    Gcd: Gcd,
    Lcm: Lcm
  });

  /**
   * @file This file implements the gamma function and related functions, though not to least-significant-bit accuracy.
   */
  // Lanczos approximation data
  const LANCZOS_COUNT = 7;
  const LANCZOS_COEFFICIENTS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; // 1, 1, 2, 6, ...

  const INTEGER_FACTORIALS = [1]; // Populate INTEGER_FACTORIALS

  let fact = 1;

  for (let i = 1;; ++i) {
    fact *= i;

    if (fact === Infinity) {
      break;
    }

    INTEGER_FACTORIALS.push(fact);
  }

  const INTEGER_FACTORIAL_LEN = INTEGER_FACTORIALS.length;
  /**
   * This function accepts a real-valued number x and returns the value of the gamma function evaluated at
   * x. If there is a pole at x, NaN is returned. NaN is returned instead of Infinity to distinguish a pole
   * (at -1, -2, ...) from a massive value (e.g. at 100). The function is relatively accurate and fast, though I
   * would like to assess its accuracy at some point.
   * <br>
   * The algorithm works based on the Lanczos approximation. The original code was written in Python by
   * Fredrik Johansson and published to Wikipedia, which means it is compatible license-wise with this
   * project. The relevant diff (on the Swedish Wikipedia) is at
   * {@link https://sv.wikipedia.org/w/index.php?title=Gammafunktionen&diff=1146966&oldid=1146894}.
   * Values below 0.5 are calculated using the reflection formula, see
   * {@link https://en.wikipedia.org/wiki/Gamma_function#General}.
   * @param x {number} The argument to the gamma function
   * @returns {number} gamma(x), approximately
   * @function gamma
   * @memberOf RealFunctions
   */

  function gamma(x) {
    // Special cases
    if (Number.isNaN(x)) return NaN;
    if (x === Infinity) return Infinity;
    if (x === -Infinity) return NaN; // Define gamma specially for integral values

    if (Number.isInteger(x)) {
      // Gamma function undefined for negative integers
      if (x <= 0) return NaN; // Gamma function too large, return Infinity

      if (x > INTEGER_FACTORIAL_LEN) return Infinity;
      return INTEGER_FACTORIALS[x - 1];
    }

    if (x < 0.5) {
      // Reflection formula
      return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
    } else {
      // Lanczos approximation
      x -= 1; // The value of A_g(x), see https://en.wikipedia.org/wiki/Lanczos_approximation#Introduction

      let z = LANCZOS_COEFFICIENTS[0];

      for (let i = 1; i < LANCZOS_COUNT + 2; ++i) {
        z += LANCZOS_COEFFICIENTS[i] / (x + i);
      }

      const t = x + LANCZOS_COUNT + 0.5;
      const sqrt2Pi = Math.sqrt(2 * Math.PI); // for performance, since Math.sqrt can be overwritten

      return sqrt2Pi * Math.pow(t, x + 0.5) * Math.exp(-t) * z;
    }
  }
  /**
   * The factorial of x. This function accepts all numerical values and just internally uses the gamma function.
   * @param x {number} The argument to the factorial function
   * @returns {number} factorial(x), approximately (but exact if possible for integer x)
   * @function factorial
   * @memberOf RealFunctions
   */

  function factorial(x) {
    return gamma(x + 1);
  }
  /**
   * The log-gamma or ln-gamma function, commonly used because the gamma function blows up fast and it is
   * useful to work with its larger values. It is just the natural logarithm of the gamma function. The
   * algorithm is identical to the above, except there is no special case for positive integers > 2 (since
   * there is little point, and the list would have to be enormous).
   * <br>
   * Handling of special values: NaN -> NaN, Infinity -> Infinity, -Infinity -> NaN
   * @param x {number} The argument to the lnGamma function
   * @returns {number} lnGamma(x), approximately
   * @function lnGamma
   * @memberOf RealFunctions
   */

  function lnGamma(x) {
    // Special cases
    if (Number.isNaN(x)) return NaN;
    if (x === Infinity) return Infinity;
    if (x === -Infinity) return NaN;

    if (x <= 0) {
      // Handle negative numbers
      if (Number.isInteger(x)) return NaN; // If the floor of x is an odd number, then gamma(x) is negative and thus NaN should be returned.

      if (Math.floor(x) % 2 === 1) return NaN;
    } // lnGamma(1) = lnGamma(2) = 0; the algorithm is inexact for the former


    if (x === 1 || x === 2) return 0;

    if (x < 0.5) {
      // Reflection formula, as above
      const reflected = lnGamma(1 - x);
      const lnPi = Math.log(Math.PI); // for performance, since Math.log can be overwritten

      return lnPi - Math.log(Math.sin(Math.PI * x)) - reflected;
    } else {
      // See above for explanation
      x -= 1;
      let z = LANCZOS_COEFFICIENTS[0];

      for (let i = 1; i < LANCZOS_COUNT + 2; ++i) {
        z += LANCZOS_COEFFICIENTS[i] / (x + i);
      }

      const t = x + LANCZOS_COUNT + 0.5;
      const lnSqrt2Pi = Math.log(2 * Math.PI) / 2; // for performance, since Math.log can be overwritten

      return lnSqrt2Pi + Math.log(t) * (x + 0.5) - t + Math.log(z);
    }
  }

  /**
   * @file This file allows floating-point numbers to be recognized consistently as rational or irrational, with a
   * customizable error rate.
   */
  /**
   * Return the closest rational number p/q to x where 1 <= q <= maxDenominator and |p| <= maxNumerator. The algorithm is
   * described in Grapheme Theory, but the basic idea is that we express the given floating-point number as an exact
   * fraction, then expand its continued fraction and use it to find the best approximation.
   * @param x {number} The number to find rational numbers near
   * @param maxDenominator {number} An integer between 1 and Number.MAX_SAFE_INTEGER
   * @param maxNumerator {number} An integer between 1 and Number.MAX_SAFE_INTEGER
   * @returns {number[]} A three-element array [ p, q, error ], where error is abs(x - p/q) as calculated by JS
   */

  function closestRational(x, maxDenominator, maxNumerator = Number.MAX_SAFE_INTEGER) {
    if (x < 0) {
      const [p, q, error] = closestRational(-x, maxDenominator, maxNumerator);
      return [-p, q, error];
    }

    assertRange(maxDenominator, 1, Number.MAX_SAFE_INTEGER, 'maxDenominator');
    assertRange(maxNumerator, 1, Number.MAX_SAFE_INTEGER, 'maxNumerator'); // Make integers

    maxDenominator = Math.round(maxDenominator);
    maxNumerator = Math.round(maxNumerator); // Some simple cases

    if (!Number.isFinite(x)) {
      return [NaN, NaN, NaN];
    }

    if (Number.isInteger(x)) {
      if (x <= maxNumerator) {
        return [x, 1, 0];
      }
    } else if (maxDenominator === 1) {
      const rnd = Math.min(maxNumerator, Math.round(x));
      return [rnd, 1, Math.abs(rnd - x)];
    }

    if (x > maxNumerator) {
      // Closest we can get, unfortunately
      return [maxNumerator, 1, Math.abs(maxNumerator - x)];
    } // Floor and fractional part of x


    const flr = Math.floor(x); // Guaranteed to be in (0, 1) and to be exact

    const frac = x - flr; // frac = exactFracNum / (exactFracDenWithoutExp * 2 ^ exp) = exactN / exactD (last equality is by definition); exp >= 0 guaranteed

    const [exactFracNum, exactFracDenWithoutExp, expN] = rationalExp(frac);
    const exp = -expN; // exactFracDen = exactD; exactFracNum = exactN. Note that x * 2^n is always exactly representable, so exactFracDen
    // is exact even though it may be greater than MAX_SAFE_INTEGER. Occasionally, this will overflow to Infinity, but
    // that is okay; we just return 0.

    const exactFracDen = exactFracDenWithoutExp * pow2(exp);
    if (exactFracDen === Infinity) return [0, 1, x]; // We express frac as a continued fraction. To do this, we start with the definition that frac = exactN/exactD.
    // Then frac = 0 + 1 / (floor(exactD/exactN) + 1 / (exactN / mod(exactD,exactN))). Note that
    // the term mod(eD,eN) / eN is always representable exactly, since eN <= MAX_SAFE_INTEGER, and the rest of the
    // continued fraction can be evaluated. The calculation of floor(exactD/exactN) is troublesome given that exactD may
    // be greater than Number.MAX_SAFE_INTEGER, and that the calculation MUST be exact. What may indeed happen is that
    // exactD/exactN will have a value below an integer, but close to that integer, and then will round to that integer.
    // We get around this by using the calculated value for modDN, which IS exact, to nudge it towards the real answer.
    // Eventually I will prove this will always work, but it's worth pointing out that if the quotient is MASSIVE so that
    // the nudging makes no difference, then a small error doesn't matter because the convergent will be too big for
    // consideration anyway.

    const modDN = exactFracDen % exactFracNum;
    const flrDN = Math.round(exactFracDen / exactFracNum - modDN / exactFracNum);
    let contFracGeneratorNum = exactFracNum;
    let contFracGeneratorDen = modDN; // Define a recursive function d(i+1) = c_(i+1) * d(i) + d(i-1), where c_i is the ith term (indexed from 1) of the
    // continued fraction, as well as n(i+1) = c_(i+1) * n(i) + n(i-1). Then n(i+1) / d(i+1) is indeed the (i+1)th
    // convergent of the continued fraction. Thus, we store the previous two numerators and denominators, which is all we
    // need to calculate the next convergent.
    // n_(i-1), n_i, d_(i-1), d_i, starting at i = 1

    let nnm1 = 1;
    let nn = flr;
    let dnm1 = 0;
    let dn = 1; // Store the best numerators and denominators found so far

    let bestN = Math.round(x);
    let bestD = 1; // Same indexing variable as Grapheme Theory. In case there's a bug I don't know about; it should terminate in < 55 steps

    for (let i = 2; i < 100; ++i) {
      // term is equivalent to c_i from Grapheme theory
      let term, rem;

      if (i !== 2) {
        // All steps besides the first
        term = Math.floor(contFracGeneratorNum / contFracGeneratorDen);
        rem = contFracGeneratorNum % contFracGeneratorDen;
        contFracGeneratorNum = contFracGeneratorDen;
        contFracGeneratorDen = rem;
      } else {
        // The first step is special, since we have already specially computed these values
        term = flrDN;
        rem = modDN;
      } // nnp1 and dnp1 are equivalent to Grapheme Theory's n_i and d_i


      let nnp1 = term * nn + nnm1;
      let dnp1 = term * dn + dnm1; // Having computed the next convergent, we see if it meets our criteria. If it does not, we see whether a reduction
      // of that convergent can produce a fraction of better accuracy. If that is so, we return this reduced
      // value; otherwise, we return bestN/bestD, which we know to be a valid (and best possible) approximation.

      if (nnp1 <= maxNumerator && dnp1 <= maxDenominator) {
        bestN = nnp1;
        bestD = dnp1;
      } else {
        // Check for reduced. term_r is a valid reduction if term_reduced > term / 2 (except for a special case
        // which we'll deal with shortly) and the resulting values of nnp1 and dnp1 are within bounds. Thus,
        // term_r * nn + nnm1 <= maxNumerator and term_r * dn + dnm1 <= maxDenominator. Some finagling results in
        // term_r <= (maxNumerator - nnm1) / nn and term_r <= (maxDenominator - dnm1) / dn, thus we have our final ineq,
        // term / 2 < term_r <= Math.min((maxNumerator - nnm1) / nn, (maxDenominator - dnm1) / dn).
        const maxTermR = Math.floor(Math.min((maxNumerator - nnm1) / nn, (maxDenominator - dnm1) / dn));
        const minTermR = term / 2;

        if (maxTermR >= minTermR) {
          // reduced semiconvergent (maybe) possible
          nnp1 = maxTermR * nn + nnm1;
          dnp1 = maxTermR * dn + dnm1;

          if (maxTermR > minTermR) {
            bestN = nnp1;
            bestD = dnp1;
          } else {
            // rare special case. We check whether bestN/bestD is a BETTER convergent than this, and select the better one.
            const reduced = nnp1 / dnp1;
            const oldBest = bestN / bestD;

            if (Math.abs(reduced - x) < Math.abs(oldBest - x)) {
              bestN = nnp1;
              bestD = dnp1;
            }
          }
        }

        break;
      }

      if (rem === 0) break; // Store history of values

      nnm1 = nn;
      nn = nnp1;
      dnm1 = dn;
      dn = dnp1;
    }

    const quot = bestN / bestD;
    return [bestN, bestD, Math.abs(quot - x)];
  } // [...Array(53 + 25).keys()].map(n => { n = n - 52; return Math.floor(Math.min(Math.PI * 2 ** (26 - n/2) / 300, Number.MAX_SAFE_INTEGER)) })

  const dnLookupTable = [47161585013522, 33348276574567, 23580792506761, 16674138287283, 11790396253380, 8337069143641, 5895198126690, 4168534571820, 2947599063345, 2084267285910, 1473799531672, 1042133642955, 736899765836, 521066821477, 368449882918, 260533410738, 184224941459, 130266705369, 92112470729, 65133352684, 46056235364, 32566676342, 23028117682, 16283338171, 11514058841, 8141669085, 5757029420, 4070834542, 2878514710, 2035417271, 1439257355, 1017708635, 719628677, 508854317, 359814338, 254427158, 179907169, 127213579, 89953584, 63606789, 44976792, 31803394, 22488396, 15901697, 11244198, 7950848, 5622099, 3975424, 2811049, 1987712, 1405524, 993856, 702762, 496928, 351381, 248464, 175690, 124232, 87845, 62116, 43922, 31058, 21961, 15529, 10980, 7764, 5490, 3882, 2745, 1941, 1372, 970, 686, 485, 343, 242, 171, 121]; // Internal function used to convert a double to a rational; does the actual work.

  function _doubleToRational(d) {
    if (d === 0) {
      return [0, 1];
    } else if (Number.isInteger(d)) {
      return [d, 1];
    }

    const negative = d < 0;
    d = Math.abs(d); // Early exit conditions

    if (d <= 1.1102230246251565e-16
    /** 2^-53 */
    || d > 67108864
    /** 2^26 */
    || !Number.isFinite(d)) {
      return [NaN, NaN];
    } // Guaranteed that d > 0 and is finite, and that its exponent n is in the range [-52, 25] inclusive.


    const exp = getExponent(d); // We now look up the corresponding value of d_n, as explained in Grapheme Theory. It is offset by 52 because arrays
    // start from 0

    const dn = dnLookupTable[exp + 52]; // We find the nearest rational number that satisfies our requirements

    const [p, q, err] = closestRational(d, dn, Number.MAX_SAFE_INTEGER); // Return the fraction if close enough, but rigorously so (see Theory)

    if (err <= pow2(exp - 52)) return [negative ? -p : p, q];
    return [NaN, NaN];
  } // Cached values for doubleToRational


  let lastDoubleToRationalArg = 0;
  let lastDoubleToRationalRes = [0, 1];
  /**
   * This function classifies floats, which are all technically rationals (more specifically, dyadic rationals), as
   * rational or irrational numbers. See Grapheme Theory, "Intelligent Pow" for more information. In short, at most
   * 1/10000 of floats are classified as rational, and the potential returned rational numbers vary depending on the
   * magnitude of d. The technique expounded is very general, and any fraction of floats being rational can be pretty
   * much guaranteed. Takes about 0.0004 ms / call on my computer.
   * @param d {number} The number to convert to a rational
   * @param cache {boolean} Whether to cache the result to speed up later calls
   * @returns {number[]} Two-element array; first is the numerator, second is the denominator
   */

  function doubleToRational(d, cache = true) {
    if (d === lastDoubleToRationalArg) return lastDoubleToRationalRes;

    const res = _doubleToRational(d);

    if (cache) {
      lastDoubleToRationalRes = res;
      lastDoubleToRationalArg = d;
    }

    return res;
  }

  /**
   * @file This file allows the computation of pow with "near-rational" numbers.
   */

  function powRational(a, c, d) {
    // Simple return cases
    if (d === 0 || Number.isNaN(c) || Number.isNaN(d) || !Number.isInteger(c) || !Number.isInteger(d) || Number.isNaN(a)) {
      return NaN;
    }

    if (a === 0) return 0;
    const evenDenom = d % 2 === 0;
    const evenNumer = c % 2 === 0;
    if (evenDenom && a < 0) return NaN;

    if (d < 0) {
      c = -c;
      d = -d;
    } // Now we know that a is not NaN, c is an integer, and d is a nonzero positive integer. Also, the answer is not NaN.


    const mag = Math.pow(Math.abs(a), c / d);

    if (a >= 0) {
      // Can just do Math.pow
      return mag;
    } else if (a === 0) {
      return 0;
    } else {
      // We know that evenDenom is false
      return evenNumer ? mag : -mag;
    }
  }
  /**
   * Given a < 0 and non-integer b, try to compute a ^ b. We try to convert b to a nearby rational number. If there is no
   * such rational number, we assume that b is irrational and simply return NaN. If there is such a rational number p/q,
   * then we return NaN if q is even, and otherwise return the mathematical value.
   * @param a {number} The base of the exponential
   * @param b {number} The exponent
   * @private
   */


  function powSpecial(a, b) {
    const [num, den] = doubleToRational(b); // deemed irrational

    if (!den) return NaN; // integer, just use <i>Math.pow</i> directly

    if (den === 1) return Math.pow(a, num);
    return powRational(a, num, den);
  }
  /**
   * This function computes a^b, where a and b are floats, but does not always return NaN for a < 0 and b ≠ Z. The
   * method by which this is bodged is specified in Grapheme Theory. The idea is that something like pow(-1, 1/3), instead
   * of returning NaN, returns -1. For the special cases, it takes about 0.006 ms per evaluation on my computer.
   *
   * There are some special cases:
   *   a. if a === b === 0, 1 is returned (this is same as <i>Math.pow</i>)
   *   b. if a is NaN or b is NaN, NaN is returned
   *   c. if a < 0, b not an integer, a special algorithm is used (see above)
   *   d. The rest of the cases are identical to <i>Math.pow</i>.
   *
   * Contrast these cases with <i>Math.pow</i> at https://tc39.es/ecma262/#sec-numeric-types-number-exponentiate
   * @param a {number} The base of the exponential
   * @param b {number} The exponent
   * @returns {number} a ^ b as described
   * @function pow
   * @memberOf RealFunctions
   */


  function pow(a, b) {
    if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
    if (a < 0 && a > -Infinity && !Number.isInteger(b)) return powSpecial(a, b);
    return Math.pow(a, b);
  }

  /**
   * Functions that accept double-precision floating point numbers as arguments. Common functions not here are likely
   * provided by Math, so use those instead. Note that {@link RealFunctions.pow} is functionally different than
   * <i>Math.pow</i>.
   * @namespace RealFunctions
   */

  const RealFunctions = Object.freeze(_objectSpread2(_objectSpread2({}, BASIC_ARITHMETIC), {}, {
    Gamma: gamma,
    LnGamma: lnGamma,
    Factorial: factorial,
    Pow: pow
  }));

  /**
   * A base class to use for event listeners and the like. Supports things like addEventListener(eventName, callback),
   * triggerEvent(name, ?data), removeEventListener( ... ), removeEventListeners(?name). Listeners are called with
   * data and this as parameters. If a listener returns true, the event does not propagate to any other listeners.
   */
  class Eventful {
    constructor() {
      _defineProperty(this, "eventListeners", new Map());
    }

    /**
     * Register an event listener to a given event name. It will be given lower priority than the ones that came before.
     * The callbacks will be given a single parameter "data".
     * @param eventName {string} The name of the event
     * @param callback {function|Array} The callback(s) to register
     * @returns {Eventful} Returns self (for chaining)
     */
    addEventListener(eventName, callback) {
      if (Array.isArray(callback)) {
        for (const c of callback) this.addEventListener(eventName, c);

        return this;
      } else if (typeof callback === "function") {
        if (typeof eventName !== "string" || !eventName) throw new TypeError("Invalid event name");
        let listeners = this.eventListeners.get(eventName);

        if (!listeners) {
          listeners = [];
          this.eventListeners.set(eventName, listeners);
        }

        if (!listeners.includes(callback)) listeners.push(callback);
        return this;
      } else throw new TypeError("Invalid callback");
    }
    /**
     * Get the event listeners under "eventName", cloned so that they can be derped around with
     * @param eventName {string} Name of the event whose listeners we want
     * @returns {Array<function>}
     */


    getEventListeners(eventName) {
      const listeners = this.eventListeners.get(eventName);
      return Array.isArray(listeners) ? listeners.slice() : [];
    }
    /**
     * Whether there are any event listeners registered for the given name
     * @param eventName
     * @returns {boolean} Whether any listeners are registered for that event
     */


    hasEventListenersFor(eventName) {
      return Array.isArray(this.eventListeners.get(eventName));
    }
    /**
     * Remove an event listener from the given event. Fails silently if that listener is not registered.
     * @param eventName {string} The name of the event
     * @param callback {function} The callback to remove
     * @returns {Eventful} Returns self (for chaining)
     */


    removeEventListener(eventName, callback) {
      if (Array.isArray(callback)) {
        for (const c of callback) this.removeEventListener(eventName, c);

        return this;
      }

      const listeners = this.eventListeners.get(eventName);

      if (Array.isArray(listeners)) {
        const index = listeners.indexOf(callback);
        if (index !== -1) listeners.splice(index, 1);
        if (listeners.length === 0) this.eventListeners.delete(eventName);
      }

      return this;
    }
    /**
     * Remove all event listeners for a given event. Fails silently if there are no listeners registered for that event.
     * @param eventName {string} The name of the event whose listeners should be cleared
     * @returns {Eventful} Returns self (for chaining)
     */


    removeEventListeners(eventName) {
      this.eventListeners.delete(eventName);
      return this;
    }
    /**
     * Trigger the listeners registered under an event name, passing (data, this, eventName) to each. Returns true if
     * some listener returned true, stopping propagation; returns false otherwise
     * @param eventName {string} Name of the event to be triggered
     * @param data {any} Optional data parameter to be passed to listeners
     * @returns {boolean} Whether any listener stopped propagation
     */


    triggerEvent(eventName, data) {
      if (this.eventListeners.size === 0) return false;
      const listeners = this.eventListeners.get(eventName);

      if (Array.isArray(listeners)) {
        for (let i = 0; i < listeners.length; ++i) {
          if (listeners[i](data)) return true;
        }
      }

      return false;
    }

  }

  /**
   * The concept here is to allow the execution of expensive functions both synchronously and asynchronously, without the
   * need for a web worker or other heavyweight techniques. There are benefits to both synchronous and asynchronous
   * execution; some functions are so oft-executed and take such a short time that there is no point to using setTimeout
   * and making it asynchronous. I fear that the proliferation of asynchronous APIs all over the Internet discourages
   * simple, effective code. Also, the current asynchronous APIs aren't the most versatile. For example, how could we
   * track the progress of a render, or cancel the render, via Promises alone?
   *
   * Web workers, while useful (I plan to eventually implement them), are difficult. They can't really do rendering work,
   * and if the function in question takes an absurdly long amount of time to execute, it cannot be terminated gracefully;
   * the entire worker needs to be terminated and then restarted.
   *
   * We use a generator-like object called a "bolus". Why? Because I like that word. Also, it makes it feel
   * like the evaluation of these expensive functions is like digestion. We consume a bolus and digest it asynchronously;
   * it's not like while we're digesting, we can't do anything else. We do get periodic interruptions—stomach cramps,
   * defecation—but it does not control our life. If digestion is taking too long, we can go to the doctor and get a
   * laxative. Using a Web Worker is like giving the bolus to a chemical digester (or another person), and then eating the
   * digested remains; not appetizing, and the process of transferring a disgusting bolus soup is not pleasant. If we find
   * out the bolus is poisonous (aka, we don't want to fully digest it), we can vomit up the bolus, but this is not
   * guaranteed. If this bolus is extremely poisonous, we may die; similarly, if a Grapheme bolus is poorly made, it may
   * still crash the webpage. (Okay, henceforth every "bolus" is a Grapheme bolus.)
   *
   * The bolus may accept any number of arguments. If it is detected to be a normal function (that is, one whose return
   * value does not have a "next" function), its result is given if it's synchronously evaluated, or given as a Promise if
   * asynchronously evaluated. If it is a generator, then during its execution it may periodically yield. If synchronously
   * evaluated, the wrapper will simply keep calling .next() (digestion) until it returns, and then return this value.
   * If asynchronously evaluated, the wrapper will keep calling .next() until some amount of time has elapsed (default is
   * 8 ms, since a frame is 1/60 s) since the function call, or the function returns; in the former case, a timeout will
   * be called to unblock, and in the latter case, the result of the function resolves the Promise.
   *
   * There are additional things that may be given to the wrapper functions for convenience. For example, both sync and
   * asyncEvaluate can be told to throw an error (and thus in the latter case, reject the Promise) if too much time has
   * elapsed. Note that this won't prevent an errant function which enters an infinite loop and NEVER yields from crashing
   * the browser, but in the case of syncEvaluate, it can prevent crashes. Furthermore, asyncEvaluate may be given an
   * additional "onProgress" callback function along with the bolus, which is called based on the estimated time for a
   * bolus to finish, and the Promise it returns is equipped with a special function .cancel() which may be called to
   * terminate the function (and call reject()) before it actually ends. This is useful for things like cancelling
   * expensive updates.
   */
  // Find the sum of integers from 1 to n in bolus form
  function testBolus(n) {
    let i = 0;
    let sum = 0;
    let finished = false;
    return {
      next() {
        if (finished) return {
          value: undefined,
          done: true
        };

        for (let j = 0; j <= 1e5; ++i, ++j) {
          // Sum at most 10000 values
          sum += i;

          if (i === n) {
            finished = true;
            return {
              value: sum,
              done: true
            };
          }
        }

        return {
          value: i / n,
          done: false
        };
      }

    };
  }
  function coatBolus(bolus, stepIndex, stepCount) {}

  class BolusTimeoutError extends Error {
    constructor(message) {
      super(message);
      this.name = 'BolusTimeoutError';
    }

  }
  /**
   * A Bolus is any object with a next() function and potentially a cleanup() function. The cleanup() function is called
   * only if the bolus is terminated early. If the bolus is cancelled after completing digestion, cleanup() is not called.
   * next() returns { value: ..., done: false/true }. cleanup() is optional, and will be called if the generator finishes,
   * is canceled, or throws. value is a number between 0 and 1 representing the progress so far.
   * @typedef Bolus {Object}
   * @property {function} next
   * @property {function} cleanup
   */

  /**
   * Digest a bolus directly, which is ideal for some quickly evaluated boluses. A timeout may also be provided which will
   * terminate the bolus early if necessary. Note that if the bolus finishes and more than timeout ms have elapsed, an
   * error will not be thrown, but if the bolus has yielded without finishing and more than timeout ms have elapsed, it
   * will throw a BolusTimeoutError.
   *
   * Functions may return a bolus or, if they are exceedingly cheap, may return the value. Thus, syncDigest forwards non-
   * boluses directly.
   * @param bolus {Bolus} The bolus to evaluate, which may be a normal function or a generator.
   * @param timeout {number} Timeout length in milliseconds
   */


  function syncDigest(bolus, timeout = -1) {
    if (typeof (bolus === null || bolus === void 0 ? void 0 : bolus.next) !== 'function') return bolus;

    try {
      // Allow timeouts between one ms and one day
      if (timeout >= 1 && timeout <= 8.64e7) {
        /**
         * Note: this code is not safe for time changes, which perhaps we can fix at some point.
         * Also, there are some browser features (notably Firefox's privacy.resistFingerprinting) that artificially rounds
         * the Date.now() and performance.now() values. Indeed, their accuracy is never guaranteed. That is unfortunately
         * a fundamental limitation with Grapheme as it presently stands.
         */
        const startTime = Date.now();

        while (true) {
          // Iterate through the bolus
          const next = bolus.next();

          if (next.done) {
            // return the result if done
            return next.value;
          }

          const delta = Date.now() - startTime;

          if (delta > timeout) {
            // anger
            // Clean up if needed
            if (bolus.cleanup) bolus.cleanup();
            throw new BolusTimeoutError('Bolus did not digest within ' + timeout + ' ms.');
          }
        }
      } else if (timeout !== -1) {
        throw new RangeError('Invalid timeout, which must be between 1 and 86,400,000 ms, or -1 to signify no timeout.');
      }

      while (true) {
        const next = bolus.next();
        if (next.done) return next.value;
      }
    } finally {
      var _bolus$cleanup;

      // Potentially clean up
      (_bolus$cleanup = bolus.cleanup) === null || _bolus$cleanup === void 0 ? void 0 : _bolus$cleanup.call(bolus);
    }
  }
  /**
   * Digest a bolus asynchronously.
   * @param bolus
   * @param onProgress
   * @param timeout
   */

  function asyncDigest(bolus, onProgress, timeout = -1) {}

  // The general form of a prop store is { value: , changed: , userValue: , }
  const proxyHandlers = {
    get: (target, propName) => {
      return target.get(propName);
    },
    set: (target, propName, value) => {
      target.set(propName, value);
    }
  };
  /**
   * The properties class stores an element's internal properties, in contrast to the user-facing properties, which are
   * effectively getters and setters. There are benefits and costs to this approach. One of the main benefits is an easier
   * API for the programmer to manipulate complex stylings and properties. Another benefit is the built-in ability to
   * track whether a value has changed and whether it should be passed on to child elements. It also provides a sort of
   * abstract concept where the properties are the definition of how a given object is *rendered*.
   *
   * A property that does not exist essentially has the value of undefined. Deleting a property is thus essentially
   * equivalent to setting its value to undefined, with some important caveats, because the property's changed status
   * must still be stored. Such "undefined properties" are technical only and not inheritable or useable.
   *
   * Beyond a simple property store, this object provides two paramount functionalities: changedness and inheritance.
   * The concept of "changed" is relatively simple: it is whether a property has changed since the last time the element
   * was fully updated, *or* when the property's change was dealt with in a way such that it is consistent that the
   * element has fully updated. In other words, it is *functionally* identical to the last time an element was fully
   * updated. That means that if a given array is mutated, its changed value must be set to true, because it is not
   * functionally identical, even though it is strictly equal. It also means that if a given bounding box is cloned, its
   * "changed" status may still be unchanged.
   *
   * There are some simple things we can do to avoid recomputations. For sceneDimensions, for example, its call to set its
   * value is marked with equalityCheck = 2, meaning a deep equals comparison. Thus if the same dimensions are computed,
   * it will not be marked as a change. Cached values may also be used if that's appropriate, but it is generally not
   * (overhead and code complexity).
   *
   * Inheritance is whether a property should be forwarded to an element's descendants, stored in the property store's
   * inherit property. An inherit value of 2 means that the property is owned by the current element; an inherit value of
   * 1 means that the property is being passed along from an element above the current one. For example, sceneDimensions
   * is an inheritable property of a top-level scene, and thus has { inherit: 2 } in the scene's property store, while
   * in a figure below that scene, it has { inherit: 1 }. Inheritable properties must be treated slightly differently than
   * normal properties because they have effects outside the current element, and influence other elements directly.
   * Ideally, all elements should know whether an inheritable property has changed, but it would be inefficient and
   * ultimately inelegant to propagate down inherited properties every time one was changed. Instead, the inheritance
   * chain occurs during an update; an element inherits the inheritable properties from above it. An element only looks
   * for inheritable properties if parent.props.hasChangedInheritableProperties is 1 or 2, or if the element's updateStage
   * is -1. The latter case is for when an element has just been added to a group, and thus needs all the group's
   * inherited properties, whether they are changed or not.
   *
   * Another special property of inherited properties is that their "changed/unchanged" status is supplemented by a simple
   * time-based versioning system, as are many other Grapheme components. Inheritable properties thus have a version
   * value of some integer n, where n is unique and assigned in order of when the property was last set. A given
   * value of a property is associated with a unique integer n. When inheriting properties from a parent, all inheritable
   * properties are traversed, and those properties whose version is greater than the version in the child will be
   * inherited (or if the child doesn't have the property at all). An inheritable property is thus "changed" to a given
   * element if its value is less than the element's own version value, which is assigned in a similar temporal fashion
   * immediately following that element's update completion. It provides an efficient way of dealing with the concept of
   * "changed" for a certain property, but across multiple elements.
   *
   * A given element may set its private properties' "changed" status to false as long as it is consistent, and the
   * element may set the changed values of any of its inheritable properties to false, *provided* they leave the value
   * of this.props.hasChangedInheritableProperties alone. That's because that value is checked by children if they are
   * wondering whether they need to inherit props, and even if a parent's job may be done, the children still need to
   * check in case their version values don't match up. hasChangedInheritableProperties is only set to 0 (er, only should
   * be set to 0, as there is no enforcement mechanism) by the scene, during a global update, which will ensure that
   * inherited properties do not need to be propagated down anywhere. The other thing is that if an element ever changes
   * one of its inheritable properties, all of its direct children's updateStages need to be set to 0/-1, since they need
   * to be recomputed. Note that this will not lead to much overhead, because inheritable properties are supposed to be
   * used sparingly, and because setting a child's updateStage to 0 would mean they would simply check if any inheritable
   * props have changed and any of their props have changed, which will often mean a couple boolean accesses (many
   * elements can just explicitly inherit a few values).
   *
   * It is perhaps instructive to consider how properties will work on an actual example. Let's take a scene with
   * width: 640, height: 320, and dpr: 1, all of which are *local* properties, with an inheritance value of 0. Also, take
   * a figure with margins: { left: 0, top: 0, ... }, another local property. Finally, let a function plot with
   * function: "x^2" and pen: "red" be a child of the figure.
   *
   * It's a simple scene, and as nothing has been updated yet, all elements' versions and updateStages are -1. Indeed,
   * the figure has no clue about its position on the scene, let alone the transformation of coordinates needed for the
   * function to be happy. All elements have their local, uninheritable properties and those only. All of those
   * properties, being set moments ago, have changed: true (think of it as, they're being changed from being undefined).
   *
   * When scene.updateAll() is called, it traverses the tree of elements, calling update() on each one. scene.update()
   * sees that its updateStage is not 100, and so calls scene._update(), which observes that "width", "height", and "dpr"
   * have changed. It thus computes an inheritable property called sceneDimensions, which is just an object containing
   * those three parameters in one inheritable bundle. This property's version is, say, 501. The scene also sets all
   * of the children's update stages to the minimum of 0 and their current stage, which means they all stay at -1.
   * The scene is now permitted to set its own "changed" values to false for local properties. hasChangedInheritable
   * Properties, however, remains at 2. (One nuance: it's at 2 when inherited properties have been added or deleted, and
   * at 1 when only their values have changed.) The scene's updateStage is now 100
   *
   * figure.update() is next in line. Seeing its updateStage is not 100, it calls figure._update(), which observes that
   * its updateStage is -1, and thus properties must be inherited. It does so, keeping the version of sceneDimensions and
   * setting its own hasChangedInheritableProperties to 2, along with setting all its children's update stages to 0/-1.
   * Its version of sceneDimensions has inherit: 1, not 2. It also calculates its plotting box and other things, creating
   * a new value called plotTransform, with inherit: 2! It also sets all the children's update stages to the minimum of
   * 0 and their current value, which leaves them at -1. Also, focus on the sceneDimensions has a copied version. The
   * changed value of sceneDimensions is only used by the figure; the children inheriting always look at the version. In
   * other words, the changed is local to the element.
   *
   * function.update() is the last. Seeing its updateStage is not 100, it calls function._update(), which observes that
   * its updateStage is -1, and thus all properties must be inherited. It does so, keeping the versions of sceneDimensions
   * and plotTransform, along with private changed values for those properties. Again, THE CHANGED VALUE OF THE PARENT'S
   * PROPERTY IS IRRELEVANT. All inheritable properties are checked and their changed values compared to the element's
   * current value.
   *
   * At this point, the remainder of scene.updateAll() goes through all elements and sets their props.hasChangedInheritabl
   * eProperties to 0, knowing that all elements have updated and no longer need to check their parents for changed
   * inheritable properties. Let this state of the scene be STATE 1, a fully updated scene.
   *
   * Beginning from STATE 1, suppose another function plot, called function2, is added to the figure. Its updateStage is
   * -1. Thus, when scene.updateAll() is called and it gets to function2.update(), it knows to ignore the fact that
   * figure.props.hasChangedInheritableProperties is 0, and inherit all properties anyway. It stores those properties'
   * versions as before. But in the future, when its updateStage is 0, it knows it can take the value of figure.props.
   * hasChangedInheritableProperties literally.
   *
   * Beginning from STATE 1, suppose the scene's private width property is set to 500. The sceneDimensions does not
   * immediately update, locally or across elements. During updating, the scene's update stage is 0, so it computes
   * sceneDimensions. Seeing that an inheritable property has changed, scene.props.hasChangedInheritableProperties is
   * set to 1 and the figure's updateStage is set to 0. In turn, when updating, the figure sees that the scene's
   * hasChangedInheritableProperties has changed, so it checks its version of sceneDimensions versus the scene's version.
   * Finding the former is less, it copies the new version and new value of sceneDimensions, then sets figure.props.
   * hasChangedInheritableProperties to 1, and sets function's updateStage to 0.
   *
   * Beginning from STATE 1, suppose the scene deletes sceneDimensions, setting its value to undefined.
   * This operation sets the hasChangedInheritableProperties to 2 and all the children's update stages to 0. 2 means that
   * the actual types of inherited properties have changed. In this case, the child has to both inherit changed properties
   * AND delete the properties which it had inherited. The operation is similar; it sets its value to undefined and
   * inherit to 0, and its hasChangedInheritableProperties to 2. Other operations which set it to "2" are adding an
   * inheritable property and setting the inheritance of a property back to 0.
   *
   * Alongside the value of a property, there may or may not be a user-intended value and a program value. For some
   * parameters for which preprocessing is necessary, the user-intended value is the value that is actually changed when
   * .set() is called. Consider a pen, for instance. If the user does set("pen", "blue"), then the expected result should
   * be a blue line. Simple enough. But the pen used is not actually the string "blue"; it is an object of the form
   * {color, thickness, ...}. Thus, the user-intended value of pen is "blue", and the actual value of pen is the pen
   * object. The program value is a value indicating an "internal set". For example, a label may be a child of a certain
   * element, which sets the child's position to (50, 20). In this case, the program value is (50, 20) and the value is
   * (50, 20). We indicate these values by using bitsets for the changed and hasChangedProperties values, where bit 0
   * is the actual value, bit 1 is the user value, bit 2 is the program value, and the remaining bits are reserved for
   * other values if ever needed.
   */

  class Props {
    constructor() {
      /**
       * A key-object dictionary containing the values. The keys are the property names and the objects are of the form
       * { value, changed, ... some other metadata for the given property ... }.
       * @type {any}
       */
      this.store = new Map(); // Just for fun... not sure if I'll keep this. Makes programming a bit less painful

      this.proxy = new Proxy(this, proxyHandlers); // Stores whether any property has changed as a bitmask

      this.hasChangedProperties = 0; // 0 when no inheritable properties have changed, 1 when an inheritable property has changed since the last time
      // the scene was fully updated, and 2 when the actual list of inheritable properties has changed (different
      // signature of inheritance, if you will).

      this.hasChangedInheritableProperties = 0;
    }

    static toBit(as) {
      switch (as) {
        case "program":
          return 2;

        case "user":
          return 1;

        case "real":
        case "default":
          return 0;
      }
    } // Access functions, in case we want to switch to Object.create(null)


    getPropertyStore(propName) {
      return this.store.get(propName);
    }

    setPropertyStore(propName, value) {
      this.store.set(propName, value);
    }
    /**
     * Create a property store for a given prop, returning the store. It returns the already-existing store, if appropriate.
     * @param propName {string}
     * @returns {{}} Property store associated with the given property name
     */


    createPropertyStore(propName) {
      let existing = this.getPropertyStore(propName);

      if (!existing) {
        existing = {
          value: undefined,
          changed: false
        };
        this.setPropertyStore(propName, existing);
      }

      return existing;
    }
    /**
     * Deletes a property store wholesale, not trying to account for changed values and the like.
     * @param propName
     */


    deletePropertyStore(propName) {
      this.store.delete(propName);
    }

    forEachStore(callback) {
      for (let value of this.store.values()) {
        callback(value);
      }
    }

    forEachProperty(callback) {
      for (let [key, value] of this.store.entries()) {
        callback(key, value);
      }
    }
    /**
     * Get a list of all properties, including ones which are undefined but have a store
     * @returns {string[]}
     */


    listProperties() {
      return Array.from(this.store.keys());
    }
    /**
     * Returns whether a property has changed, locally speaking.
     * @param propName {string}
     * @returns {boolean}
     */


    hasChanged(propName) {
      var _this$getPropertyStor;

      return !!((_this$getPropertyStor = this.getPropertyStore(propName)) === null || _this$getPropertyStor === void 0 ? void 0 : _this$getPropertyStor.changed);
    }
    /**
     * Returns whether any property of a list of properties has changed, locally speaking.
     * @param propList {string[]}
     * @returns {boolean}
     */


    haveChanged(propList) {
      return this.hasChangedProperties && propList.some(prop => this.hasChanged(prop));
    }
    /**
     * Returns whether a given property is inheritable (i.e., an inherit of 1 or 2).
     * @param propName {string}
     * @returns {boolean}
     */


    isPropertyInheritable(propName) {
      var _this$getPropertyStor2;

      return !!((_this$getPropertyStor2 = this.getPropertyStore(propName)) === null || _this$getPropertyStor2 === void 0 ? void 0 : _this$getPropertyStor2.inherit);
    }
    /**
     * Returns a list of properties which have changed, locally speaking.
     * @returns {string[]}
     */


    listChangedProperties() {
      return this.listProperties().filter(prop => this.hasChanged(prop));
    }
    /**
     * Returns a list of properties which can be inherited (i.e., an inherit of 1 or 2).
     * @returns {string[]}
     */


    listInheritableProperties() {
      return this.listProperties().filter(prop => this.isPropertyInheritable(prop));
    }
    /**
     * Inherit all inheritable properties from a given props. The function does this by comparing the local inherited
     * prop's version to the given props's version. If the local version is lower, the property and version are copied,
     * and the changed status is set to true. If updateAll is set to true, the function makes sure to check that the
     * actual list of inherited properties is synchronized, because it normally only checks the local inheritable
     * properties and compares them. In fact, it only checks the local inheritable properties with inherit: 1, since that
     * indicates it came from a parent rather than being defined in the current element.
     * @param props {Props}
     * @param updateAll {boolean} Whether to force a complete update, in which the inheritable properties are verifiably
     * synced with the top element's properties. This usually happens after an element is added to a group, or after a
     * group's inheritance signature has changed.
     */


    inheritPropertiesFrom(props, updateAll = false) {
      // Early exit condition, where if no inheritable properties have changed, we need not do anything
      if (!(updateAll || props.hasChangedInheritableProperties)) return;
      updateAll = updateAll || props.hasChangedInheritableProperties === 2; // We recalculate all local properties whose inheritance is 1, indicating they were inherited from above. Properties
      // not found above are deleted, properties found above are copied if their version is greater than or equal to the
      // version of the current property. This ensures that this props does not have any extraneous properties or any
      // incorrect/nonupdated values.

      for (const [propName, propStore] of this.store.entries()) {
        if (propStore.inherit !== 1) continue;
        const otherPropsStore = props.getPropertyStore(propName); // if no such inheritable property, *delete* the local property (do not keep it as inheritable)

        if (!otherPropsStore || otherPropsStore.inherit < 1 || otherPropsStore.value === undefined) {
          propStore.value = undefined;
          propStore.changed |= 0b1;
          propStore.inherit = 0;
          this.changed |= 0b1;
          this.markHasChangedInheritableProperties();
        } // Value has been changed!


        if (otherPropsStore.version > propStore.version) {
          propStore.version = otherPropsStore.version;
          propStore.value = otherPropsStore.value;
          propStore.changed |= 0b1;
          this.changed |= 0b1;
          this.markHasChangedInheritableProperties();
        }
      } // If updateAll is true, we run through all the given properties and inherit all 1s and 2s.


      if (updateAll) {
        for (const [propName, propStore] of props.store.entries()) {
          if (!propStore.inherit || propStore.value === undefined) continue;
          let ourPropStore = this.getPropertyStore(propName); // Where things are actually inherited!!

          if (!ourPropStore || ourPropStore.inherit === 1 && propStore.version > ourPropStore.version) {
            if (!ourPropStore) {
              ourPropStore = this.createPropertyStore(propName); // Goes around set

              ourPropStore.inherit = 1;
              ourPropStore.value = propStore.value;
              this.markHasChangedInheritanceSignature();
            }

            ourPropStore.version = propStore.version;
            ourPropStore.value = propStore.value;
            ourPropStore.changed |= 0b1;
            this.markHasChangedProperties();
          }
        }
      }
    }
    /**
     * This function sets the value of a property. It is meant mostly for internal use. If prompted, it will check to see
     * whether the value given and the current value are strictly equal, or deeply equal, and if so, not mark the property
     * as changed. By default, this check is turned off, meaning all value assignments are marked as "changed". The third
     * parameter indicates whether the value should be directly modified, or
     * @param propName {string} The name of the property
     * @param value {any} The value of the property
     * @param as {number} Which value to change. 0 if real, 1 if user, 2 if program
     * @param equalityCheck {number} What type of equality check to perform against the current value, if any, to assess
     * the changed value. 0 - no check, 1 - strict equals, 2 - deep equals
     * @param markChanged {boolean} Whether to actually mark the value as changed. In turn, if the property is a changed
     * inheritable property, that will be noted
     * @returns {any}
     */


    set(propName, value, as = 0, equalityCheck = 0, markChanged = true) {
      let store = this.getPropertyStore(propName); // Helper functions to abstract away the "user/program/real" concept

      function getStoreValue() {
        switch (as) {
          case 0:
            return store.value;

          case 1:
            return store.userValue;

          case 2:
            return store.programValue;
        }
      }

      function setStoreValue(v) {
        switch (as) {
          case 0:
            store.value = v;
            break;

          case 1:
            store.userValue = v;
            break;

          case 2:
            store.programValue = v;
            break;
        }
      }

      if (value === undefined) {
        // Special case of deletion. If the property exists, we set its value to undefined, and if that property is
        // defined to be inheritable, we set this.hasChangedInheritableProperties to 2. Note that an inheritED property
        // cannot be deleted, as that would be inconsistent. It can only be overridden.
        // trivial case, don't do anything
        if (!store || getStoreValue() === undefined) return value;

        if (store.inherit === 1) {
          // If the store has an inheritance value of 1, we don't do anything
          return value;
        } else if (store.inherit === 2) {
          // If the property has inheritance 2, we keep it as undefined and notify that the signature of inheritable properties has
          // changed.
          setStoreValue(undefined); // If setting the real value, need to change the version

          if (as === 0) {
            store.version = getVersionID();
            if (markChanged) this.markHasChangedInheritanceSignature();
          }
        } else {
          // Set its value to undefined
          setStoreValue(undefined);
        }

        if (markChanged) {
          // Mark which bit has changed
          store.changed |= 1 << as;
          this.hasChangedProperties |= 1 << as;
        }

        return undefined;
      } // Otherwise, we need to get a property store


      if (!store) store = this.createPropertyStore(propName); // We reject assignments to an inherited property. This can be overridden by setting the property's inheritance
      // status.

      if (store.inherit === 1) return value;

      if (equalityCheck !== 0) {
        let storeValue = getStoreValue(); // Perform various equality checks

        if (equalityCheck === 1 && storeValue === value) return value;else if (equalityCheck === 2 && deepEquals(storeValue, value)) return value;
      } // Set the value and changed values


      setStoreValue(value);

      if (markChanged) {
        store.changed |= 1 << as;
        this.hasChangedProperties |= 1 << as; // For values to be inherited, store the version of this value. Only for inherit: 2 properties

        if (store.inherit === 2 && as === 0) {
          store.version = getVersionID();
          this.markHasChangedInheritableProperties();
        }
      }

      return value;
    }

    setProperties(values, equalityCheck = 0, markChanged = true) {
      for (const [propName, propValue] of Object.entries(values)) {
        this.set(propName, propValue, equalityCheck, markChanged);
      }

      return this;
    }

    markHasChangedProperties() {
      this.hasChangedProperties = true;
    }

    markHasChangedInheritableProperties() {
      this.hasChangedInheritableProperties = Math.max(this.hasChangedInheritableProperties, 1);
    }

    markHasChangedInheritanceSignature() {
      this.hasChangedInheritableProperties = 2;
    }

    configureProperty(propName, opts = {}) {
      this.getPropertyStore(propName);

      if (opts.inherit !== undefined) {
        this.setPropertyInheritance(propName, opts.inherit);
      }
    }

    configureProperties(propNames, opts = {}) {
      for (const propName of propNames) this.configureProperty(propName, opts);
    }
    /**
     * Set a property's inheritance to 2 (if inherit is true) or 0
     * @param propName {string}
     * @param inherit {boolean}
     * @return {Props}
     */


    setPropertyInheritance(propName, inherit = false) {
      const store = this.createPropertyStore(propName);
      let currentInheritance = !!store.inherit;
      if (currentInheritance === !!inherit) return this;

      if (inherit) {
        store.version = getVersionID();
        store.inherit = 2;
      } else {
        delete store.version;
        delete store.inherit;
      }

      if (store.value !== undefined) this.hasChangedInheritableProperties = 2;
      return this;
    }
    /**
     * Get the value of a property.
     * @param propName {string}
     * @param as {number} 0 if getting the real value, 1 if getting the user value, 2 if getting the program value
     * @returns {*}
     */


    get(propName, as = 0) {
      let store = this.getPropertyStore(propName);
      if (!store) return undefined;

      switch (as) {
        case 0:
          return store.value;

        case 1:
          return store.userValue;

        case 2:
          return store.programValue;
      }
    }

    getUserValue(propName) {
      return this.get(propName, 1);
    }

    getProgramValue(propName) {
      return this.get(propName, 2);
    }
    /**
     * Get the values of a list of properties.
     * @param propNameList {string[]}
     * @returns {*}
     */


    getProperties(propNameList) {
      return propNameList.map(propName => this.get(propName));
    }
    /**
     * Mark all properties as locally updated (changed = false).
     */


    markAllUpdated(bitmask = 0b111) {
      bitmask = ~bitmask;
      this.hasChangedProperties &= bitmask;
      this.forEachStore(store => {
        store.changed &= bitmask;
      });
    }
    /**
     * Mark a specific property as locally updated (changed = false).
     * @param propName {string}
     */


    markPropertyUpdated(propName) {
      const store = this.getPropertyStore(propName);
      if (store) store.changed = 0;
    }
    /**
     * Mark a given property as changed.
     * @param propName {string}
     */


    markChanged(propName) {
      let store = this.getPropertyStore(propName);
      store.changed |= 0b1;
      this.hasChangedProperties |= 0b1; // If the store is inheritable, we need to generate a version ID

      if (store.inherit) {
        store.version = getVersionID();
        this.markHasChangedInheritableProperties();
      }
    }
    /**
     * Mark that no more inheritance is necessary. This function should only be called by the scene
     */


    markGlobalUpdateComplete() {
      if (this.hasChangedProperties) this.markAllUpdated();
      this.hasChangedInheritableProperties = 0;
    }

    stringify() {
      const obj = {};

      for (const [propName, propStore] of this.store) {
        obj[propName] = propStore;
      }

      console.log(JSON.stringify(obj, null, 4));
    }

  }

  // Another one of these, yada yada, reinventing the wheel, yay
  class Vec2 {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }

    static fromObj(obj) {
      let x = 0,
          y = 0;

      if (Array.isArray(obj)) {
        x = obj[0];
        y = obj[1];
      } else if (typeof obj === "object" && obj.x) {
        x = obj.x;
        y = obj.y;
      } else if (typeof obj === "string") {
        switch (obj) {
          case "N":
          case "NE":
          case "NW":
            y = 1;
            break;

          case "S":
          case "SE":
          case "SW":
            y = -1;
            break;
        }

        switch (obj) {
          case "E":
          case "NE":
          case "SE":
            x = 1;
            break;

          case "W":
          case "NW":
          case "SW":
            x = -1;
            break;
        }

        if (x === 0 && y === 0 && obj !== 'C') return undefined;
      } else return undefined;

      return new Vec2(+x, +y);
    }

    add(vec) {
      return new Vec2(this.x + vec.x, this.y + vec.y);
    }

    sub(vec) {
      return new Vec2(this.x - vec.x, this.y - vec.y);
    }

    mul(scalar) {
      return new Vec2(this.x * scalar, this.y * scalar);
    }

    rot(angle, centre) {
      let s = Math.sin(angle),
          c = Math.cos(angle);
      if (!centre) return new Vec2(c * this.x - s * this.y, s * this.x + c * this.y);
    }

    rotDeg(angle, centre) {
      return this.rot(angle * Math.PI / 180, centre);
    }

    unit() {
      return this.mul(1 / this.len());
    }

    len() {
      return Math.hypot(this.x, this.y);
    }

    lenSq() {
      return this.x * this.x + this.y * this.y;
    }

  }

  // Principles: Some things in Grapheme have styling information that may be shared or may be composed from other bits of
  // Could use a library, but... good experience for me too

  class Color {
    constructor({
      r = 0,
      g = 0,
      b = 0,
      a = 255
    } = {}) {
      this.r = r;
      this.g = g;
      this.b = b;
      this.a = a;
    }

    rounded() {
      return {
        r: Math.round(this.r),
        g: Math.round(this.g),
        b: Math.round(this.b),
        a: Math.round(this.a)
      };
    }

    toJSON() {
      return {
        r: this.r,
        g: this.g,
        b: this.b,
        a: this.a
      };
    }

    hex() {
      const rnd = this.rounded();
      return "#".concat([rnd.r, rnd.g, rnd.b, rnd.a].map(x => leftZeroPad(x.toString(16), 2)).join(''));
    }

    glColor() {
      return {
        r: this.r / 255,
        g: this.g / 255,
        b: this.b / 255,
        a: this.a / 255
      };
    }

    toNumber() {
      return this.r * 0x1000000 + this.g * 0x10000 + this.b * 0x100 + this.a;
    }

    clone() {
      return new Color(this);
    }

    static rgb(r, g, b) {
      return new Color({
        r,
        g,
        b
      });
    }

    static rgba(r, g, b, a = 255) {
      return new Color({
        r,
        g,
        b,
        a
      });
    }

    static hsl(h, s, l) {
      return new Color(hslToRgb(h, s, l));
    }

    static hsla(h, s, l, a) {
      let color = Color.hsl(h, s, l);
      color.a = 255 * a;
      return color;
    }

    static fromHex(string) {
      return new Color(hexToRgb(string));
    }

    static fromCss(cssColorString) {
      function throwBadColor() {
        throw new Error("Unrecognized colour " + cssColorString);
      }

      cssColorString = cssColorString.toLowerCase().replace(/\s+/g, '');

      if (cssColorString.startsWith('#')) {
        return Color.fromHex(cssColorString);
      }

      let argsMatch = /\((.+)\)/g.exec(cssColorString);

      if (!argsMatch) {
        let color = Colors[cssColorString.toUpperCase()];
        return color ? color : throwBadColor();
      }

      let args = argsMatch[1].split(',').map(parseFloat);

      if (cssColorString.startsWith("rgb")) {
        return Color.rgb(...args.map(s => s * 255));
      } else if (cssColorString.startsWith("rgba")) {
        return Color.rgba(...args.map(s => s * 255));
      } else if (cssColorString.startsWith("hsl")) {
        return Color.hsl(...args);
      } else if (cssColorString.startsWith("hsla")) {
        return Color.hsla(...args);
      }

      throwBadColor();
    }

    static fromObj(obj) {
      if (typeof obj === "string") {
        return Color.fromCss(obj);
      }

      return new Color(obj);
    }

  } // Credit to https://stackoverflow.com/a/11508164/13458117


  function hexToRgb(hex) {
    let bigint = parseInt(hex.replace('#', ''), 16);
    let r = bigint >> 16 & 255;
    let g = bigint >> 8 & 255;
    let b = bigint & 255;
    return {
      r,
      g,
      b
    };
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  } // Credit to https://stackoverflow.com/a/9493060/13458117


  function hslToRgb(h, s, l) {
    var r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: 255 * r,
      g: 255 * g,
      b: 255 * b
    };
  }

  const rgb = Color.rgb;
  const Colors = {
    get LIGHTSALMON() {
      return rgb(255, 160, 122);
    },

    get SALMON() {
      return rgb(250, 128, 114);
    },

    get DARKSALMON() {
      return rgb(233, 150, 122);
    },

    get LIGHTCORAL() {
      return rgb(240, 128, 128);
    },

    get INDIANRED() {
      return rgb(205, 92, 92);
    },

    get CRIMSON() {
      return rgb(220, 20, 60);
    },

    get FIREBRICK() {
      return rgb(178, 34, 34);
    },

    get RED() {
      return rgb(255, 0, 0);
    },

    get DARKRED() {
      return rgb(139, 0, 0);
    },

    get CORAL() {
      return rgb(255, 127, 80);
    },

    get TOMATO() {
      return rgb(255, 99, 71);
    },

    get ORANGERED() {
      return rgb(255, 69, 0);
    },

    get GOLD() {
      return rgb(255, 215, 0);
    },

    get ORANGE() {
      return rgb(255, 165, 0);
    },

    get DARKORANGE() {
      return rgb(255, 140, 0);
    },

    get LIGHTYELLOW() {
      return rgb(255, 255, 224);
    },

    get LEMONCHIFFON() {
      return rgb(255, 250, 205);
    },

    get LIGHTGOLDENRODYELLOW() {
      return rgb(250, 250, 210);
    },

    get PAPAYAWHIP() {
      return rgb(255, 239, 213);
    },

    get MOCCASIN() {
      return rgb(255, 228, 181);
    },

    get PEACHPUFF() {
      return rgb(255, 218, 185);
    },

    get PALEGOLDENROD() {
      return rgb(238, 232, 170);
    },

    get KHAKI() {
      return rgb(240, 230, 140);
    },

    get DARKKHAKI() {
      return rgb(189, 183, 107);
    },

    get YELLOW() {
      return rgb(255, 255, 0);
    },

    get LAWNGREEN() {
      return rgb(124, 252, 0);
    },

    get CHARTREUSE() {
      return rgb(127, 255, 0);
    },

    get LIMEGREEN() {
      return rgb(50, 205, 50);
    },

    get LIME() {
      return rgb(0, 255, 0);
    },

    get FORESTGREEN() {
      return rgb(34, 139, 34);
    },

    get GREEN() {
      return rgb(0, 128, 0);
    },

    get DARKGREEN() {
      return rgb(0, 100, 0);
    },

    get GREENYELLOW() {
      return rgb(173, 255, 47);
    },

    get YELLOWGREEN() {
      return rgb(154, 205, 50);
    },

    get SPRINGGREEN() {
      return rgb(0, 255, 127);
    },

    get MEDIUMSPRINGGREEN() {
      return rgb(0, 250, 154);
    },

    get LIGHTGREEN() {
      return rgb(144, 238, 144);
    },

    get PALEGREEN() {
      return rgb(152, 251, 152);
    },

    get DARKSEAGREEN() {
      return rgb(143, 188, 143);
    },

    get MEDIUMSEAGREEN() {
      return rgb(60, 179, 113);
    },

    get SEAGREEN() {
      return rgb(46, 139, 87);
    },

    get OLIVE() {
      return rgb(128, 128, 0);
    },

    get DARKOLIVEGREEN() {
      return rgb(85, 107, 47);
    },

    get OLIVEDRAB() {
      return rgb(107, 142, 35);
    },

    get LIGHTCYAN() {
      return rgb(224, 255, 255);
    },

    get CYAN() {
      return rgb(0, 255, 255);
    },

    get AQUA() {
      return rgb(0, 255, 255);
    },

    get AQUAMARINE() {
      return rgb(127, 255, 212);
    },

    get MEDIUMAQUAMARINE() {
      return rgb(102, 205, 170);
    },

    get PALETURQUOISE() {
      return rgb(175, 238, 238);
    },

    get TURQUOISE() {
      return rgb(64, 224, 208);
    },

    get MEDIUMTURQUOISE() {
      return rgb(72, 209, 204);
    },

    get DARKTURQUOISE() {
      return rgb(0, 206, 209);
    },

    get LIGHTSEAGREEN() {
      return rgb(32, 178, 170);
    },

    get CADETBLUE() {
      return rgb(95, 158, 160);
    },

    get DARKCYAN() {
      return rgb(0, 139, 139);
    },

    get TEAL() {
      return rgb(0, 128, 128);
    },

    get POWDERBLUE() {
      return rgb(176, 224, 230);
    },

    get LIGHTBLUE() {
      return rgb(173, 216, 230);
    },

    get LIGHTSKYBLUE() {
      return rgb(135, 206, 250);
    },

    get SKYBLUE() {
      return rgb(135, 206, 235);
    },

    get DEEPSKYBLUE() {
      return rgb(0, 191, 255);
    },

    get LIGHTSTEELBLUE() {
      return rgb(176, 196, 222);
    },

    get DODGERBLUE() {
      return rgb(30, 144, 255);
    },

    get CORNFLOWERBLUE() {
      return rgb(100, 149, 237);
    },

    get STEELBLUE() {
      return rgb(70, 130, 180);
    },

    get ROYALBLUE() {
      return rgb(65, 105, 225);
    },

    get BLUE() {
      return rgb(0, 0, 255);
    },

    get MEDIUMBLUE() {
      return rgb(0, 0, 205);
    },

    get DARKBLUE() {
      return rgb(0, 0, 139);
    },

    get NAVY() {
      return rgb(0, 0, 128);
    },

    get MIDNIGHTBLUE() {
      return rgb(25, 25, 112);
    },

    get MEDIUMSLATEBLUE() {
      return rgb(123, 104, 238);
    },

    get SLATEBLUE() {
      return rgb(106, 90, 205);
    },

    get DARKSLATEBLUE() {
      return rgb(72, 61, 139);
    },

    get LAVENDER() {
      return rgb(230, 230, 250);
    },

    get THISTLE() {
      return rgb(216, 191, 216);
    },

    get PLUM() {
      return rgb(221, 160, 221);
    },

    get VIOLET() {
      return rgb(238, 130, 238);
    },

    get ORCHID() {
      return rgb(218, 112, 214);
    },

    get FUCHSIA() {
      return rgb(255, 0, 255);
    },

    get MAGENTA() {
      return rgb(255, 0, 255);
    },

    get MEDIUMORCHID() {
      return rgb(186, 85, 211);
    },

    get MEDIUMPURPLE() {
      return rgb(147, 112, 219);
    },

    get BLUEVIOLET() {
      return rgb(138, 43, 226);
    },

    get DARKVIOLET() {
      return rgb(148, 0, 211);
    },

    get DARKORCHID() {
      return rgb(153, 50, 204);
    },

    get DARKMAGENTA() {
      return rgb(139, 0, 139);
    },

    get PURPLE() {
      return rgb(128, 0, 128);
    },

    get INDIGO() {
      return rgb(75, 0, 130);
    },

    get PINK() {
      return rgb(255, 192, 203);
    },

    get LIGHTPINK() {
      return rgb(255, 182, 193);
    },

    get HOTPINK() {
      return rgb(255, 105, 180);
    },

    get DEEPPINK() {
      return rgb(255, 20, 147);
    },

    get PALEVIOLETRED() {
      return rgb(219, 112, 147);
    },

    get MEDIUMVIOLETRED() {
      return rgb(199, 21, 133);
    },

    get WHITE() {
      return rgb(255, 255, 255);
    },

    get SNOW() {
      return rgb(255, 250, 250);
    },

    get HONEYDEW() {
      return rgb(240, 255, 240);
    },

    get MINTCREAM() {
      return rgb(245, 255, 250);
    },

    get AZURE() {
      return rgb(240, 255, 255);
    },

    get ALICEBLUE() {
      return rgb(240, 248, 255);
    },

    get GHOSTWHITE() {
      return rgb(248, 248, 255);
    },

    get WHITESMOKE() {
      return rgb(245, 245, 245);
    },

    get SEASHELL() {
      return rgb(255, 245, 238);
    },

    get BEIGE() {
      return rgb(245, 245, 220);
    },

    get OLDLACE() {
      return rgb(253, 245, 230);
    },

    get FLORALWHITE() {
      return rgb(255, 250, 240);
    },

    get IVORY() {
      return rgb(255, 255, 240);
    },

    get ANTIQUEWHITE() {
      return rgb(250, 235, 215);
    },

    get LINEN() {
      return rgb(250, 240, 230);
    },

    get LAVENDERBLUSH() {
      return rgb(255, 240, 245);
    },

    get MISTYROSE() {
      return rgb(255, 228, 225);
    },

    get GAINSBORO() {
      return rgb(220, 220, 220);
    },

    get LIGHTGRAY() {
      return rgb(211, 211, 211);
    },

    get SILVER() {
      return rgb(192, 192, 192);
    },

    get DARKGRAY() {
      return rgb(169, 169, 169);
    },

    get GRAY() {
      return rgb(128, 128, 128);
    },

    get DIMGRAY() {
      return rgb(105, 105, 105);
    },

    get LIGHTSLATEGRAY() {
      return rgb(119, 136, 153);
    },

    get SLATEGRAY() {
      return rgb(112, 128, 144);
    },

    get DARKSLATEGRAY() {
      return rgb(47, 79, 79);
    },

    get BLACK() {
      return rgb(0, 0, 0);
    },

    get CORNSILK() {
      return rgb(255, 248, 220);
    },

    get BLANCHEDALMOND() {
      return rgb(255, 235, 205);
    },

    get BISQUE() {
      return rgb(255, 228, 196);
    },

    get NAVAJOWHITE() {
      return rgb(255, 222, 173);
    },

    get WHEAT() {
      return rgb(245, 222, 179);
    },

    get BURLYWOOD() {
      return rgb(222, 184, 135);
    },

    get TAN() {
      return rgb(210, 180, 140);
    },

    get ROSYBROWN() {
      return rgb(188, 143, 143);
    },

    get SANDYBROWN() {
      return rgb(244, 164, 96);
    },

    get GOLDENROD() {
      return rgb(218, 165, 32);
    },

    get PERU() {
      return rgb(205, 133, 63);
    },

    get CHOCOLATE() {
      return rgb(210, 105, 30);
    },

    get SADDLEBROWN() {
      return rgb(139, 69, 19);
    },

    get SIENNA() {
      return rgb(160, 82, 45);
    },

    get BROWN() {
      return rgb(165, 42, 42);
    },

    get MAROON() {
      return rgb(128, 0, 0);
    },

    get RANDOM() {
      var keys = Object.keys(Colors);
      return Colors[keys[keys.length * Math.random() << 0]];
    },

    get TRANSPARENT() {
      return new Color({
        r: 0,
        g: 0,
        b: 0,
        a: 0
      });
    }

  };
  const Pen = {
    // take a list of partial pen specifications and combine them into a complete pen by combining each and keeping only
    // the valid parameters TODO
    compose: (...args) => {
      let ret = {};

      for (let i = 0; i < args.length; ++i) {
        Object.assign(ret, args[i]);
      }

      ret.color = Color.fromObj(ret.color);
      return ret;
    },
    create: params => {
      return Pen.compose(Pen.default, params);
    },
    signature: {
      color: "color",
      thickness: "number"
    },
    default: deepFreeze({
      color: {
        r: 0,
        g: 0,
        b: 0,
        a: 255
      },
      thickness: 2,
      dashPattern: [],
      dashOffset: 0,
      endcap: "round",
      endcapRes: 1,
      join: "miter",
      joinRes: 1,
      useNative: false,
      visible: true
    }),

    fromObj(strOrObj) {
      if (typeof strOrObj === "string") return _interpretStringAsPen(strOrObj);
      return Pen.compose(Pen.default, strOrObj);
    }

  }; // Generic dictionary of pens, like { major: Pen, minor: Pen }. Partial pen specifications may be used and they will
  // turn into fully completed pens in the final product

  const Pens = {
    compose: (...args) => {
      let ret = {}; // Basically just combine all the pens

      for (let i = 0; i < args.length; ++i) {
        for (let key in args[i]) {
          let retVal = ret[key];
          if (!retVal) ret[key] = retVal = Pen.default;
          ret[key] = Pen.compose(ret[key], args[key]);
        }
      }
    },
    create: params => {
      return Pens.compose(Pens.default, params);
    },
    default: Object.freeze({})
  };
  /**const textElementInterface = constructInterface({
    font: { setAs: "user" },
    fontSize: { setAs: "user" },
    text: true,
    align: { setAs: "user" },
    baseline: { setAs: "user" },
    color: { setAs: "user" },
    shadowRadius: { setAs: "user" },
    shadowColor: { setAs: "user" },
    position: { conversion: Vec2.fromObj }
  }, */

  const TextStyle = {
    compose: (...args) => {
      let ret = {};

      for (let i = 0; i < args.length; ++i) {
        Object.assign(ret, args[i]);
      }

      ret.color = Color.fromObj(ret.color);
      ret.shadowColor = Color.fromObj(ret.shadowColor);
      return ret;
    },
    create: params => {
      return TextStyle.compose(TextStyle.default, params);
    },
    default: deepFreeze({
      color: {
        r: 0,
        g: 0,
        b: 0,
        a: 255
      },
      shadowColor: {
        r: 255,
        g: 255,
        b: 255,
        a: 255
      },
      font: "Cambria",
      fontSize: 12,
      shadowRadius: 0,
      align: "left",
      baseline: "bottom"
    })
  }; // Object of the form { x: ("dynamic"|"none"|"axis"|"outside"|"inside"|"bottom"|"top"), y: ( ..., "left"|"right") } (might change later)

  const LabelPosition = {
    compose: (...args) => {
      let ret = {};

      for (let i = 0; i < args.length; ++i) {
        let arg = args[i];

        if (typeof arg === "string") {
          ret.x = arg;
          ret.y = arg;
        } else {
          Object.assign(ret, args[i]);
        }
      }

      return ret;
    },
    create: params => {
      return LabelPosition.compose(LabelPosition.default, params);
    },
    default: deepFreeze({
      x: "dynamic",
      y: "dynamic"
    })
  };
  const GenericObject = {
    compose: (...args) => {
      let ret = {};

      for (let i = 0; i < args.length; ++i) {
        Object.assign(ret, args[i]);
      }

      return ret;
    },
    create: params => {
      return GenericObject.compose(GenericObject.default, params);
    },
    default: Object.freeze({})
  };
  const BooleanDict = {
    compose: (...args) => {
      let ret = {};

      for (let i = 0; i < args.length; ++i) {
        let arg = args[i];

        if (typeof arg === "boolean") {
          for (let key in ret) {
            ret[key] = arg;
          }
        } else Object.assign(ret, args[i]);
      }

      return ret;
    },
    create: params => {
      return GenericObject.compose(GenericObject.default, params);
    },
    default: Object.freeze({})
  };
  function lookupCompositionType(type) {
    switch (type) {
      case "TextStyle":
        return TextStyle;

      case "Pen":
        return Pen;

      case "Pens":
        return Pens;

      case "LabelPosition":
        return LabelPosition;

      case "Object":
        return GenericObject;

      case "BooleanDict":
        return BooleanDict;
    }
  } // Fun Asymptote Vector Graphics–like thing :) We break up str into tokens which each have some meaning TODO

  function _interpretStringAsPen(str) {
    try {
      let color = Color.fromCss(str);
      return Pen.fromObj({
        color
      });
    } catch (_unused) {
      return Pen.default;
    }
  }

  const DefaultStyles = {
    gridlinesMajor: Pen.create({
      thickness: 2,
      color: Color.rgba(0, 0, 0, 127),
      endcap: "butt"
    }),
    gridlinesMinor: Pen.create({
      thickness: 1,
      color: Color.rgba(0, 0, 0, 80),
      endcap: "butt"
    }),
    gridlinesAxis: Pen.create({
      thickness: 4,
      endcap: "butt"
    }),
    plotLabelPositions: LabelPosition.default,
    Pen: Pen.default,
    label: TextStyle.create({
      fontSize: 16,
      shadowRadius: 2
    })
  };

  // Defines an interface between a user-facing getter/setter and the internal properties of an element. There is not a
  /**
   * Print object to string in a way that isn't too painful (limit the length of the string to 100 chars or so)
   * @param obj
   * @param limit {number} (Estimated) number of characters to restrict the display to
   */

  function relaxedPrint(obj, limit = 100) {
    if (typeof obj === "number" || typeof obj === "boolean") {
      return '' + obj;
    } else if (typeof obj === "function") {
      let name = obj.name;
      let ret = name ? "[function " + name : "[function]";
      if (ret.length > limit) return "...";
      return ret;
    } else if (typeof obj === "object") {
      let keys = Object.keys(obj).slice(0, 3);

      if (keys.length === 0) {
        return "{}";
      }

      let keysUsed = 0;
      let keyValues = [];
      let totalLen = 5;

      for (let key of keys) {
        let n = obj[key];
        let pp = relaxedPrint(n, limit - totalLen - 4);
        totalLen += pp.length + 4;
        if (totalLen > limit) break;
        keyValues.push(pp);
        keysUsed++;
      }

      if (keysUsed === 0) {
        return "{ ... }";
      } else {
        let ret = "{ ";

        for (let i = 0; i < keysUsed; ++i) {
          ret += keys[i];
          ret += ': ';
          ret += keyValues[i];
          if (i !== keysUsed - 1) ret += ', ';
        }

        return ret + " }";
      }
    } else if (typeof obj === "string") {
      if (obj.length <= limit - 2) return "\"".concat(obj, "\"");
      let len = Math.max((limit / 2 | 0) - 4, 0);
      return '"' + obj.slice(0, len) + " ... " + obj.slice(obj.length - len) + '"';
    }
  }

  function genTypecheckRangedInteger(lo, hi) {
    if (lo === undefined) {
      return obj => !Number.isInteger(obj) || obj > hi ? "Expected $p to be an integer less than ".concat(hi, "; got $v.") : undefined;
    } else if (hi === undefined) {
      return obj => !Number.isInteger(obj) || obj < lo ? "Expected $p to be an integer greater than ".concat(lo, "; got $v.") : undefined;
    } else {
      return obj => !Number.isInteger(obj) || obj < lo || obj > hi ? "Expected $p to be an integer in the range [".concat(lo, ", ").concat(hi, "], inclusive; got $v.") : undefined;
    }
  }

  function typecheckInteger(obj) {
    if (!Number.isInteger(obj)) return "Expected $p to be an integer, not $v.";
  }

  function genTypecheckRangedNumber(lo, hi, finite) {
    let finiteMsg = finite ? "finite " : "";

    if (lo === undefined) {
      return obj => typeof obj !== "number" || obj > hi || finite && !Number.isFinite(obj) ? "Expected $p to be a ".concat(finiteMsg, "number less than ").concat(hi, ", got $v.") : undefined;
    } else if (hi === undefined) {
      return obj => typeof obj !== "number" || obj < lo ? "Expected $p to be a ".concat(finiteMsg, "number greater than ").concat(lo, ", got $v.") : undefined;
    } else {
      return obj => typeof obj !== "number" || obj < lo || obj > hi ? "Expected $p to be a ".concat(finiteMsg, "number in the range [").concat(lo, ", ").concat(hi, "], inclusive; got $v.") : undefined;
    }
  }

  function typecheckNumber(obj) {
    if (typeof obj !== "number") return "Expected $p to be a number, got $v.";
  }

  function typecheckFiniteNumber(obj) {
    if (typeof obj !== "number" || !Number.isFinite(obj)) return "Expected $p to be a finite number, got $v.";
  }

  function createIntegerTypecheck(check) {
    let min = check.min;
    let max = check.max;

    if (min === undefined && max === undefined) {
      return typecheckInteger;
    } else {
      return genTypecheckRangedInteger(min, max);
    }
  }

  function createNumberTypecheck(check) {
    let min = check.min;
    let max = check.max;
    let finite = check.finite;

    if (min === undefined && max === undefined) {
      if (finite) {
        return typecheckFiniteNumber;
      } else {
        return typecheckNumber;
      }
    } else {
      return genTypecheckRangedNumber(min, max, finite);
    }
  }

  function booleanTypecheck(obj) {
    return typeof obj !== "boolean" ? "Expected $p to be a boolean, got $v." : undefined;
  }

  function stringTypecheck(obj) {
    return typeof obj !== "string" ? "Expected $p to be a string, got $v." : undefined;
  }

  function createTypecheck(check) {
    if (typeof check === "string") check = {
      type: check
    };
    let type = check.type;

    switch (type) {
      case "integer":
        return createIntegerTypecheck(check);

      case "number":
        return createNumberTypecheck(check);

      case "boolean":
        return booleanTypecheck;

      case "string":
        return stringTypecheck;

      default:
        throw new Error("Unrecognized typecheck type ".concat(type, "."));
    }
  }

  function colorConversion(obj) {
    obj = Color.fromObj(obj);
    if (obj) return obj;
  }

  function vec2Conversion(obj) {
    let x = 0,
        y = 0;

    if (typeof obj === "number" || typeof obj === "string") ; else if (typeof obj === "object") {
      if (Array.isArray(obj)) {
        if (obj.length !== 2) {
          "Expected $p to be convertible to a Vec2, got $v (length ".concat(obj.length, ").");
        } else {
          x = obj[0];
          y = obj[1];
        }
      } else {
        var _obj$x, _obj$y;

        x = (_obj$x = obj.x) !== null && _obj$x !== void 0 ? _obj$x : obj.re;
        y = (_obj$y = obj.y) !== null && _obj$y !== void 0 ? _obj$y : obj.im;
      }
    }

    return new Vec2(x, y);
  }

  function vec2NonFlatArrayConversion(arr, f32 = true) {
    let ret = new (f32 ? Float32Array : Float64Array)(arr.length / 2);
    let retIndex = -1;

    for (let i = 0; i < arr.length; ++i) {
      let elem = arr[i];

      if (elem.x) {
        ret[++retIndex] = elem.x;
        ret[++retIndex] = elem.y;
      } else if (Array.isArray(elem)) {
        if (elem.length !== 2) {
          "Expected $p to be convertible to a flat array of Vec2s, found element ".concat(relaxedPrint(elem), " at index ").concat(i);
          return;
        }

        ret[++retIndex] = elem[0];
        ret[++retIndex] = elem[1];
      } else {
        "Expected $p to be convertible to a flat array of Vec2s, found element ".concat(relaxedPrint(elem), " at index ").concat(i);
        return;
      }
    }
  }

  function vec2ArrayConversion(obj, f32 = true) {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; ++i) {
        if (typeof obj[i] !== "number") {
          return vec2NonFlatArrayConversion(obj);
        }
      } // Obj is just an array of numbers


      if (obj.length & 1) {
        "Expected $p to be convertible to a flat array of Vec2s, got numeric array of odd length ".concat(obj.length, ".");
        return;
      }

      return new (f32 ? Float32Array : Float64Array)(obj);
    } else if (isTypedArray(obj)) {
      if (obj.length & 1) {
        "Expected $p to be convertible to a flat array of Vec2s, got typed array of odd length ".concat(obj.length, ".");
        return;
      }

      if (f32 && obj instanceof Float32Array) return obj;
      if (!f32 && obj instanceof Float64Array) return obj;
      return new (f32 ? Float32Array : Float64Array)(obj);
    }
  }
  /**
   * Return a function which, when evaluated, either sets CONVERSION_MSG to a message indicating why the conversion is
   * impossible and returns nothing or returns a converted result.
   * @param conversion
   */


  function createConversion(conversion) {
    if (typeof conversion === "string") conversion = {
      type: conversion
    };else if (typeof conversion === "function") return conversion;
    let type = conversion.type;

    switch (type) {
      case "Color":
        return colorConversion;

      case "Vec2":
        return vec2Conversion;

      case "f32_vec2_array":
        return vec2ArrayConversion;

      default:
        throw new Error("Unknown conversion type ".concat(type, "."));
    }
  }

  function constructInterface(description) {
    const interfaceDesc = description.interface;
    const internal = description.internal; //if (!interfaceDesc) throw new Error("Interface description lacks an interface")
    //if (!internal) throw new Error("Interface description lacks an internal description")
    // Instructions on how to get and set properties, respectively

    const setters = {};
    const getters = {};

    function handleProp(name, desc) {
      let needsSetter = !desc.readOnly;
      let needsGetter = !desc.writeOnly;
      if (!needsSetter && !needsGetter) return;

      if (needsSetter) {
        var _ref;

        let setter = {};
        let {
          typecheck,
          target,
          setTarget,
          setAs,
          conversion,
          aliases,
          merge
        } = desc;
        setAs = Props.toBit(setAs);
        if (typecheck) setter.typecheck = createTypecheck(typecheck);
        if (conversion) setter.conversion = createConversion(conversion);
        if (setAs) setter.setAs = setAs;
        if (merge) setter.merge = true;
        setter.target = (_ref = setTarget !== null && setTarget !== void 0 ? setTarget : target) !== null && _ref !== void 0 ? _ref : name;
        setters[name] = setter;
        if (aliases) for (const alias of Array.from(aliases)) setters[alias] = setter;
      }

      if (needsGetter) {
        var _ref2;

        let getter = {};
        let {
          target,
          getAs,
          getTarget
        } = desc;
        getAs = Props.toBit(getAs);
        if (getAs) getter.getAs = getAs;
        getter.target = (_ref2 = getTarget !== null && getTarget !== void 0 ? getTarget : target) !== null && _ref2 !== void 0 ? _ref2 : name;
        getters[name] = getter;
      }
    }

    for (let propName in interfaceDesc) {
      if (interfaceDesc.hasOwnProperty(propName)) {
        let propDesc = interfaceDesc[propName];
        handleProp(propName, propDesc);
      }
    }

    function _set(props, propName, value) {
      var _setter$setAs;

      let setter = setters[propName];

      if (!setter) {
        if (getters[propName]) throw new Error("Parameter \"".concat(propName, "\" is read-only."));
        throw new Error("Unrecognized parameter \"".concat(propName, "\"."));
      }

      if (setter.typecheck) {
        let result = setter.typecheck(value);
        if (result) throw new TypeError("Failed typecheck: ".concat(result.replace("$v", relaxedPrint(value)).replace("$p", 'parameter "' + propName + '"')));
      }

      if (setter.conversion) {
        let newValue = setter.conversion(value);
        if (newValue === undefined) throw new TypeError("Failed conversion: ".concat(result.replace("$v", relaxedPrint(value)).replace("$p", 'parameter "' + propName + '"')));
        value = newValue;
      }

      let setAs = (_setter$setAs = setter.setAs) !== null && _setter$setAs !== void 0 ? _setter$setAs : 0;
      /* real */

      let merge = !!setter.merge;

      if (merge) {
        props.set(setter.target, deepMerge(props.get(setter.target, setAs), value), setAs);
      } else {
        props.set(setter.target, value, setAs);
      }
    }

    function set(elem, propName, value) {
      if (typeof propName === "object") {
        setDict(elem.props, propName);
      } else if (typeof propName === "string") {
        _set(elem.props, propName, value);
      }
    }

    function get(elem, propName) {
      var _getter$getAs;

      let getter = getters[propName];

      if (!getter) {
        if (setters[propName]) throw new Error("Parameter \"".concat(propName, "\" is write-only."));
        throw new Error("Unrecognized parameter \"".concat(propName, "\"."));
      }

      let getAs = (_getter$getAs = getter.getAs) !== null && _getter$getAs !== void 0 ? _getter$getAs : 0;
      /* real */

      return elem.props.get(getter.target, getAs);
    }

    function setDict(props, propDict) {

      for (let propName in propDict) {
        _set(props, propName, propDict[propName]);
      }
    }
    /**
     * Given the internal description of the properties, compute their values based on their user values, current values,
     * et cetera. If isInitialized is true, compute all properties as if they are new.
     * @param props
     * @param isInitialized
     */


    function computeProps(props, isInitialized = true) {
      function getDefault(instructions) {
        let def = instructions.default;

        if (instructions.evaluateDefault) {
          if (typeof def !== "function") throw new Error("Internal instruction computation instruction says to evaluate the default value, but given default is not a function");
          return def();
        }

        return def;
      }

      for (let propName in internal) {
        let instructions = internal[propName];
        let computed = instructions.computed;
        let doCompose = !!instructions.compose;
        if (computed === "none") continue;

        if (computed === "default") {
          // Check whether the current value is undefined. If so, fill it with the default
          if (props.get(propName) === undefined) {
            props.set(propName, getDefault(instructions));
          }
        } else if (computed === "user") {
          // Check whether the user value is undefined, then the value, then the default
          let store = props.getPropertyStore(propName); // just to make things more efficient

          if (!store) {
            props.set(propName, getDefault(instructions));
          } else {
            if (store.userValue !== undefined) {
              if (doCompose) {
                var _getDefault;

                let type = lookupCompositionType(instructions.type);
                if (!type) throw new Error("Unknown composition type ".concat(instructions.type, "."));
                props.set(propName, type.compose((_getDefault = getDefault(instructions)) !== null && _getDefault !== void 0 ? _getDefault : type.default, store.userValue));
              } else {
                props.set(propName, store.userValue);
              }
            } else if (store.value !== undefined) ; else {
              props.set(propName, getDefault(instructions));
            }
          }
        }
      }
    }

    return {
      set,
      get,
      computeProps,
      description
    };
  }

  const attachGettersAndSetters = () => null;
  const NullInterface = constructInterface({
    interface: {},
    internal: {}
  });

  /**
   * @file This file specifies an Element, which is a component of a Grapheme scene. Elements are similar in design to
   * DOM elements, being nestable and having events.
   *
   * An Element has properties, which may be explicitly specified, inherited
   */
  /**
   * The element class.
   */

  class Element extends Eventful {
    constructor(params = {}) {
      var _params$id;

      super();
      /**
       * Unique string id of this element
       * @type {string}
       * @property
       */

      this.id = (_params$id = params.id) !== null && _params$id !== void 0 ? _params$id : getStringID();
      if (typeof this.id !== "string" || this.id.length === 0) throw new TypeError("The element id must be a non-empty string.");
      /**
       * The parent of this element; null if it has no parent
       * @type{Element|null}
       * @property
       */

      this.parent = null;
      /**
       * The scene this element is a part of
       * @type {Scene|null}
       * @property
       */

      this.scene = null;
      /**
       * Stores most of the state of the element. Similar to internal but with a lot more predefined behavior
       * @type {Props}
       * @property
       */

      this.props = new Props();
      /**
       * -1 corresponds to an element that has just been created, added, or removed. 0 corresponds to an element which
       * needs an update. 100 corresponds to a completely updated element
       * @type {number}
       */

      this.updateStage = -1;
      /**
       * Used for storing intermediate results required for rendering, interactivity and other things
       * @type {Object}
       * @property
       */

      this.internal = {
        version: getVersionID()
      }; // Call the element-defined constructor

      this.init(params); // Call set on remaining parameters. Corollary: constructor-only parameters should not also be parameters (no "id",
      // for example)

      this.set(params);
    }

    _update() {}

    apply(callback) {
      callback(this);
    }

    defaultInheritProps() {
      if (this.parent) this.props.inheritPropertiesFrom(this.parent.props, this.updateStage === -1);
    }

    getRenderingInfo() {
      if (this.internal.renderInfo) return this.internal.renderInfo;
    }

    isChild(child, recursive = true) {
      return false;
    }

    isScene() {
      return false;
    }

    init(params) {}

    set(propName, value) {
      this.getInterface().set(this, propName, value);
    }

    get(propName) {
      return this.getInterface().get(this, propName);
    }

    getDict(propNames) {
      return this.getInterface().getDict(this, propNames);
    }
    /**
     * For all given properties, check which ones need to be filled in with default values.
     * @param defaults
     * @param evaluate
     */


    defaultComputeProps() {
      let inter = this.getInterface();
      const needsInitialize = this.updateStage === -1;
      inter.computeProps(this.props, needsInitialize);
    }

    getInterface() {
      return NullInterface;
    }

    setScene(scene) {
      this.scene = scene;
    }

    stringify() {
      this.props.stringify();
    }

    update() {
      // If some properties have changed, set the update stage accordingly. We use .min in case the update stage is -1
      if (this.props.hasChangedProperties) this.updateStage = Math.min(this.updateStage, 0);
      if (this.updateStage === 100) return;

      this._update();

      this.updateStage = 100;
    }

  }

  class Group extends Element {
    constructor(params = {}) {
      super(params);
      this.children = [];
    }

    _update() {
      this.defaultInheritProps();
    }
    /**
     * Add an element to this group.
     * @param elem {Element}
     * @returns {Group}
     */


    add(elem) {
      if (elem.isScene()) throw new Error("Scene cannot be a child");
      if (elem.parent) throw new Error("Element to be added already has a parent");
      if (!(elem instanceof Element)) throw new TypeError("Element not element");
      if (elem === this) throw new Error("Can't add self");
      if (elem.isChild(this)) throw new Error("Can't make cycle");
      this.children.push(elem);
      elem.parent = this;
      elem.setScene(this.scene);
      elem.updateStage = -1;
      return this;
    }
    /**
     * Run callback(element) on this element and all the element's children
     * @param callback {Function}
     */


    apply(callback) {
      callback(this);
      this.children.forEach(child => child.apply(callback));
    }
    /**
     * If some inheritable properties have changed since the last global update completion, set all the children's update
     * stages to 0. May change how this works later
     */


    informChildrenOfInheritance() {
      if (this.props.hasChangedInheritableProperties && this.children) {
        this.children.forEach(child => {
          child.updateStage = Math.min(child.updateStage, 0); // math.min so that update stage -1 still works
        });
      }
    }

    isChild(elem, recursive = true) {
      for (const child of this.children) {
        if (child === elem) return true;
        if (recursive && child.isChild(elem, true)) return true;
      }

      return false;
    }

    isGroup() {
      return true;
    }

    remove(elem) {
      const index = this.children.indexOf(elem);

      if (index !== -1) {
        this.children.splice(index, 1);
        elem.parent = null;
        elem.setScene(null);
        elem.updateStage = -1;
        return this;
      }

      throw new Error("Not a direct child");
    }

    setScene(scene) {
      this.scene = scene;
      this.children.forEach(child => child.setScene(scene));
    }

    triggerEvent(eventName, data) {
      for (const child of this.children) {
        if (child.triggerEvent(eventName, data)) return true;
      }

      super.triggerEvent(eventName, data);
    }

    update() {
      super.update();
      this.informChildrenOfInheritance();
    }

  }

  /**
   * Given some parameters describing a line segment, find a line segment that is consistent with at least two of them.
   * @param x1 {number}
   * @param x2 {number}
   * @param w {number}
   * @param cx {number}
   */

  function resolveAxisSpecification(x1, x2, w, cx) {

    if (cx !== undefined) {
      let halfWidth = 0;
      if (w !== undefined) halfWidth = w / 2;else if (x2 !== undefined) halfWidth = x2 - cx;else if (x1 !== undefined) halfWidth = cx - x1;
      halfWidth = Math.abs(halfWidth);
      return [cx - halfWidth, cx + halfWidth];
    } else if (x1 !== undefined) {
      if (w !== undefined) return [x1, x1 + w];
      if (x2 !== undefined) return [x1, x2];
    } else if (x2 !== undefined) {
      if (w !== undefined) return [x2 - w, x2];
    }

    return [0, 0];
  }
  /**
   * A bounding box. In general, we consider the bounding box to be in canvas coordinates, so that the "top" is -y and
   * the "bottom" is +y.
   */


  class BoundingBox {
    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = x;
      this.y = y;
      this.w = width;
      this.h = height;
    }

    clone() {
      return new BoundingBox(this.x, this.y, this.w, this.h);
    }
    /**
     * Push in (or pull out) all the sides of the box by a given amount. Returns null if too far. So squishing
     * { x: 0, y: 0, w: 2, h: 2} by 1/2 will give { x: 0.5, y: 0.5, w: 1, h: 1 }
     * @param margin {number}
     */


    squish(margin = 0) {
      const {
        x,
        y,
        w,
        h
      } = this;
      if (2 * margin > w || 2 * margin > h) return null;
      return new BoundingBox(x + margin, y + margin, w - 2 * margin, h - 2 * margin);
    }

    squishAsymmetrically(left = 0, right = 0, bottom = 0, top = 0, flipY = false) {
      const {
        x,
        y,
        w,
        h
      } = this;

      if (2 * (left + right) > w || 2 * (bottom + top) > h) {
        return null;
      }

      if (flipY) {
        let tmp = bottom;
        bottom = top;
        top = tmp;
      }

      return new BoundingBox(x + left, y + top, w - (left + right), h - (top + bottom));
    }

    translate(v) {
      return new BoundingBox(this.x + v.x, this.y + v.y, this.w, this.h);
    }

    scale(s) {
      return new BoundingBox(this.x * s, this.y * s, this.w * s, this.h * s);
    }

    getX2() {
      return this.x + this.w;
    }

    getY2() {
      return this.y + this.h;
    }

    static fromObj(obj) {
      let finalX1, finalY1, finalX2, finalY2;

      if (Array.isArray(obj)) {
        finalX1 = obj[0];
        finalY1 = obj[1];
        finalX2 = obj[2] + finalX1;
        finalY2 = obj[3] + finalY1;
      } else if (typeof obj === "object") {
        var _x, _y, _w, _h, _cx, _cy;

        let {
          x,
          y,
          x1,
          y1,
          x2,
          y2,
          w,
          h,
          width,
          height,
          cx,
          cy,
          centerX,
          centerY
        } = obj; // various aliases

        x = (_x = x) !== null && _x !== void 0 ? _x : x1;
        y = (_y = y) !== null && _y !== void 0 ? _y : y1;
        w = (_w = w) !== null && _w !== void 0 ? _w : width;
        h = (_h = h) !== null && _h !== void 0 ? _h : height;
        cx = (_cx = cx) !== null && _cx !== void 0 ? _cx : centerX;
        cy = (_cy = cy) !== null && _cy !== void 0 ? _cy : centerY // We wish to find a rectangle that is roughly consistent. Note that along each axis, we have four relevant
        // variables: x, x2, w, cx. The axes are totally separable, so the problem is pretty trivial. I'm too tired
        // to figure out how to do it elegantly rather than case work.
        ;
        [finalX1, finalX2] = resolveAxisSpecification(x, x2, w, cx);
        [finalY1, finalY2] = resolveAxisSpecification(y, y2, h, cy);
      }

      return new BoundingBox(finalX1, finalY1, finalX2 - finalX1, finalY2 - finalY1);
    }

    get x1() {
      return this.x;
    }

    get y1() {
      return this.y;
    }

    get x2() {
      return this.getX2();
    }

    get y2() {
      return this.getY2();
    }

  }
  const boundingBoxTransform = {
    X: (x, box1, box2, flipX) => {
      if (Array.isArray(x) || isTypedArray(x)) {
        for (let i = 0; i < x.length; ++i) {
          let fractionAlong = (x[i] - box1.x) / box1.width;
          if (flipX) fractionAlong = 1 - fractionAlong;
          x[i] = fractionAlong * box2.width + box2.x;
        }

        return x;
      } else {
        return boundingBoxTransform.X([x], box1, box2, flipX)[0];
      }
    },
    Y: (y, box1, box2, flipY) => {
      if (Array.isArray(y) || isTypedArray(y)) {
        for (let i = 0; i < y.length; ++i) {
          let fractionAlong = (y[i] - box1.y) / box1.height;
          if (flipY) fractionAlong = 1 - fractionAlong;
          y[i] = fractionAlong * box2.height + box2.y;
        }

        return y;
      } else {
        return boundingBoxTransform.Y([y], box1, box2, flipY)[0];
      }
    },
    XY: (xy, box1, box2, flipX, flipY) => {
      if (Array.isArray(xy) || isTypedArray(x)) {
        for (let i = 0; i < xy.length; i += 2) {
          let fractionAlong = (xy[i] - box1.x) / box1.width;
          if (flipX) fractionAlong = 1 - fractionAlong;
          xy[i] = fractionAlong * box2.width + box2.x;
          fractionAlong = (xy[i + 1] - box1.y) / box1.height;
          if (flipY) fractionAlong = 1 - fractionAlong;
          xy[i + 1] = fractionAlong * box2.height + box2.y;
        }

        return xy;
      } else {
        throw new Error("No");
      }
    },

    getReducedTransform(box1, box2, flipX, flipY) {
      let x_m = 1 / box1.width;
      let x_b = -box1.x / box1.width;

      if (flipX) {
        x_m *= -1;
        x_b = 1 - x_b;
      }

      x_m *= box2.width;
      x_b *= box2.width;
      x_b += box2.x;
      let y_m = 1 / box1.height;
      let y_b = -box1.y / box1.height;

      if (flipY) {
        y_m *= -1;
        y_b = 1 - y_b;
      }

      y_m *= box2.height;
      y_b *= box2.height;
      y_b += box2.y;
      return {
        x_m,
        x_b,
        y_m,
        y_b
      };
    }

  };
  const EMPTY = new BoundingBox(new Vec2(0, 0), 0, 0);

  function intersectBoundingBoxes(box1, box2) {
    let x1 = Math.max(box1.x, box2.x);
    let y1 = Math.max(box1.y, box2.y);
    let x2 = Math.min(box1.x2, box2.x2);
    let y2 = Math.min(box1.y2, box2.y2);

    if (x2 < x1) {
      return EMPTY.clone();
    }

    if (y2 < y1) {
      return EMPTY.clone();
    }

    let width = x2 - x1;
    let height = y2 - y1;
    return new BoundingBox(new Vec2(x1, y1), width, height);
  }

  const sceneInterface$1 = constructInterface({
    interface: {
      width: {
        description: "The width of the scene",
        typecheck: {
          type: "integer",
          min: 100,
          max: 16384
        }
      },
      height: {
        description: "The height of the scene",
        typecheck: {
          type: "integer",
          min: 100,
          max: 16384
        }
      },
      dpr: {
        description: "The device pixel ratio of the scene",
        typecheck: {
          type: "number",
          min: 1 / 32,
          max: 32
        } //setAs: "user"

      },
      backgroundColor: {
        description: "The color of the scene background",
        setAs: "user",
        conversion: {
          type: "Color"
        }
      },
      sceneDims: {
        description: "The dimensions of the scene",
        readOnly: true
      }
    },
    internal: {
      width: {
        type: "number",
        computed: "default",
        default: 640
      },
      height: {
        type: "number",
        computed: "default",
        default: 480
      },
      dpr: {
        type: "number",
        computed: "default",
        default: 1
      },
      backgroundColor: {
        type: "Color",
        computed: "user",
        default: Colors.TRANSPARENT
      },
      sceneDims: {
        type: "SceneDimensions",
        computed: "none"
      }
    }
  });
  /**
   * Passed to children as the parameter "sceneDimensions"
   */

  class SceneDimensions {
    constructor(width, height, dpr) {
      this.width = width;
      this.height = height;
      this.dpr = dpr; // The size of the canvas in true device pixels, rather than CSS pixels

      this.canvasWidth = this.dpr * this.width;
      this.canvasHeight = this.dpr * this.height;
    }
    /**
     * Get the bounding box of the entire scene.
     * @returns {BoundingBox}
     */


    getBoundingBox() {
      return new BoundingBox(0, 0, this.width, this.height);
    }

  }
  /**
   * Top level element in a Grapheme context. The scene has a width, height, and device pixel ratio as its defining
   * geometric patterns, and potentially other properties -- interactivity information, for example. Uniquely, every
   * element knows its scene directly as its .scene property.
   */


  class Scene extends Group {
    getInterface() {
      return sceneInterface$1;
    }

    init() {
      this.scene = this;
      this.props.setPropertyInheritance("sceneDims", true);
    }
    /**
     * Compute the internal property "sceneDimensions"
     */


    calculateSceneDimensions() {
      const {
        props
      } = this;

      if (props.haveChanged(["width", "height", "dpr"])) {
        const {
          width,
          height,
          dpr
        } = props.proxy;
        const sceneDimensions = new SceneDimensions(width, height, dpr); // Equality check of 2 for deep comparison, in case width, height, dpr have not actually changed

        props.set("sceneDims", sceneDimensions, 0
        /* real */
        , 2
        /* equality check */
        );
      }
    }

    updateProps() {
      this.defaultComputeProps();
      this.calculateSceneDimensions();
    }
    /**
     * Only scenes (and derived scenes) return true
     * @returns {boolean}
     */


    isScene() {
      return true;
    }

    _update() {
      this.updateProps();
      this.internal.renderInfo = {
        contexts: {
          type: "scene",
          dims: this.get("sceneDims"),
          backgroundColor: this.get("backgroundColor")
        }
      };
    }
    /**
     * This function updates all the elements and is the only one with the authority to mark all properties, including
     * inheritable properties, as unchanged.
     */


    updateAll() {
      this.apply(child => {
        child.update();
      }); // Mark the update as completed (WIP)

      this.apply(child => child.props.markGlobalUpdateComplete());
    }

  }

  function _point_line_segment_compute(px, py, polyline_vertices, func) {
    if (polyline_vertices.length < 4) {
      return Infinity;
    }

    let f64 = ASMViews.f64;
    let is_typed_array = polyline_vertices instanceof Float64Array || polyline_vertices instanceof Float32Array;

    if (polyline_vertices.length > BufferSizes.f64) {
      let i,
          j,
          min_distance = Infinity;

      for (i = 0; i < polyline_vertices.length / BufferSizes.f64 + 1; ++i) {
        let offset = i * BufferSizes.f64;
        let cnt = polyline_vertices.length - offset;
        let elem_c = Math.min(BufferSizes.f64, cnt);

        if (is_typed_array) {
          f64.set(polyline_vertices.subarray(offset, offset + elem_c));
        } else {
          for (j = 0; j < elem_c; ++j) {
            f64[j] = polyline_vertices[offset + j];
          }
        }

        let distance = func(px, py, 0, elem_c);

        if (distance < min_distance) {
          min_distance = distance;
        }
      }

      return min_distance;
    }

    let i;

    if (is_typed_array) {
      ASMViews.f64.set(polyline_vertices);
    } else {
      for (i = 0; i < polyline_vertices.length; ++i) {
        ASMViews.f64[i] = polyline_vertices[i];
      }
    }

    return func(px, py, 0, polyline_vertices.length);
  }

  function pointLineSegmentMinDistance(px, py, polyline_vertices) {
    return _point_line_segment_compute(px, py, polyline_vertices, GeometryASMFunctions.point_line_segment_min_distance);
  }

  function pointLineSegmentClosest(px, py, polyline_vertices) {
    let distance = _point_line_segment_compute(px, py, polyline_vertices, GeometryASMFunctions.point_line_segment_min_closest);

    let x = ASMViews.f64[0];
    let y = ASMViews.f64[1];
    return {
      x,
      y,
      distance
    };
  }

  function anglesBetween(polyline_vertices, threshold = 0.03, aspectRatio = 1) {
    if (polyline_vertices.length >= BufferSizes.f64) {
      throw new Error('Polyline too numerous');
    }

    if (polyline_vertices instanceof Float32Array || polyline_vertices instanceof Float64Array) {
      ASMViews.f64.set(polyline_vertices);
    }

    let i;

    for (i = 0; i < polyline_vertices.length; ++i) {
      ASMViews.f64[i] = polyline_vertices[i];
    }

    GeometryASMFunctions.angles_between(0, i, threshold, aspectRatio);
    return ASMViews.f64.subarray(0, i / 2 - 2);
  }

  let heap = new ArrayBuffer(0x200000);
  let ASMViews = {
    f64: new Float64Array(heap)
  };
  let BufferSizes = {
    f64: ASMViews.f64.length
  }; //var GeometryASMFunctions = GeometryASMFunctionsCreate(stdlib, null, heap)

  /**
   * Test whether three points are in counterclockwise order
   * @param x1
   * @param y1
   * @param x2
   * @param y2
   * @param x3
   * @param y3
   * @returns {boolean}
   */

  function pointsCCW(x1, y1, x2, y2, x3, y3) {
    return (y3 - y1) * (x2 - x1) > (y2 - y1) * (x3 - x1);
  }
  /**
   * Returns whether two line segments (namely, (x1, y1) -- (x2, y2) and (x3, y3) -- (x4, y4)) intersect
   * @param x1
   * @param y1
   * @param x2
   * @param y2
   * @param x3
   * @param y3
   * @param x4
   * @param y4
   */


  function lineSegmentIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    return pointsCCW(x1, y1, x3, y3, x4, y4) !== pointsCCW(x2, y2, x3, y3, x4, y4) && pointsCCW(x1, y1, x2, y2, x3, y3) !== pointsCCW(x1, y1, x2, y2, x4, y4);
  } // Credit to cortijon on StackOverflow! Thanks bro/sis


  function getLineIntersection(p0_x, p0_y, p1_x, p1_y, p2_x, p2_y, p3_x, p3_y) {
    let s1_x, s1_y, s2_x, s2_y;
    s1_x = p1_x - p0_x;
    s1_y = p1_y - p0_y;
    s2_x = p3_x - p2_x;
    s2_y = p3_y - p2_y;
    const s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / (-s2_x * s1_y + s1_x * s2_y);
    const t = (s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / (-s2_x * s1_y + s1_x * s2_y);

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
      // Collision detected
      const intX = p0_x + t * s1_x;
      const intY = p0_y + t * s1_y;
      return [intX, intY];
    }

    return null;
  }

  function lineSegmentIntersectsBox(x1, y1, x2, y2, box_x1, box_y1, box_x2, box_y2) {
    // Return the component of the line segment that resides inside a box with boundaries x in (box_x1 .. box_x2), y in
    // (box_y1 .. box_y2), which may potentially be the entire line segment.
    let pt1InBox = box_x1 <= x1 && x1 <= box_x2 && box_y1 <= y1 && y1 <= box_y2;
    let pt2InBox = box_x1 <= x2 && x2 <= box_x2 && box_y1 <= y2 && y2 <= box_y2;

    if (pt1InBox && pt2InBox) {
      // The line segment is entirely in the box
      return [x1, y1, x2, y2];
    } // Infinities cause weird problems with getLineIntersection, so we just approximate them lol


    if (x1 === Infinity) x1 = 1e6;else if (x1 === -Infinity) x1 = -1e6;
    if (x2 === Infinity) x2 = 1e6;else if (x2 === -Infinity) x2 = -1e6;
    if (y1 === Infinity) y1 = 1e6;else if (y1 === -Infinity) y1 = -1e6;
    if (y2 === Infinity) y2 = 1e6;else if (y2 === -Infinity) y2 = -1e6;
    let int1 = getLineIntersection(x1, y1, x2, y2, box_x1, box_y1, box_x2, box_y1);
    let int2 = getLineIntersection(x1, y1, x2, y2, box_x2, box_y1, box_x2, box_y2);
    let int3 = getLineIntersection(x1, y1, x2, y2, box_x2, box_y2, box_x1, box_y2);
    let int4 = getLineIntersection(x1, y1, x2, y2, box_x1, box_y2, box_x1, box_y1);

    if (!(int1 || int2 || int3 || int4) && !pt1InBox && !pt2InBox) {
      // If there are no intersections and the points are outside the box, that means none of the segment is inside the
      // box, so we can return null
      return null;
    }

    let intersections = [int1, int2, int3, int4];

    if (!pt1InBox && !pt2InBox) {
      // Both points are outside of the box, but the segment intersects the box. I'm frustrated! We must RESTRICT by finding the pair of intersections with
      // maximal separation. This deals with annoying corner cases. Thankfully this code doesn't need to be too efficient
      // since this is a rare case.
      let maximalSeparationSquared = -1;
      let n_x1, n_y1, n_x2, n_y2;

      for (let i = 0; i < 3; ++i) {
        let i1 = intersections[i];

        if (i1) {
          for (let j = i + 1; j < 4; ++j) {
            let i2 = intersections[j];

            if (i2) {
              let dist = (i2[0] - i1[0]) ** 2 + (i2[1] - i1[1]) ** 2;

              if (dist > maximalSeparationSquared) {
                maximalSeparationSquared = dist;
                n_x1 = i1[0];
                n_y1 = i1[1];
                n_x2 = i2[0];
                n_y2 = i2[1];
              }
            }
          }
        }
      } // Swap the order if necessary. We need the result of this calculation to be in the same order as the points
      // that went in, since this will be used in the dashed line logic.


      if (n_x1 < n_x2 === x1 > x2 || n_y1 < n_y2 === y1 > y2) {
        let tmp = n_x1;
        n_x1 = n_x2;
        n_x2 = tmp;
        tmp = n_y1;
        n_y1 = n_y2;
        n_y2 = tmp;
      }

      return [n_x1, n_y1, n_x2, n_y2];
    }

    if (pt1InBox) {
      for (let i = 0; i < 4; ++i) {
        let intersection = intersections[i];
        if (intersection) return [x1, y1, intersection[0], intersection[1]];
      }
    } else if (pt2InBox) {
      for (let i = 0; i < 4; ++i) {
        let intersection = intersections[i];
        if (intersection) return [intersection[0], intersection[1], x2, y2];
      }
    }

    return [x1, y1, x2, y2];
  }

  function generateCircleTriangleStrip(radius, x = 0, y = 0, samples = 8) {
    const points = [];

    for (let i = 0; i <= samples; ++i) {
      const angle = i / samples * 2 * Math.PI;
      const xc = x + radius * Math.cos(angle),
            yc = y + radius * Math.sin(angle);

      if (i % 2 === 0) {
        points.push(xc, yc);
        points.push(x, y);
      } else {
        points.push(xc, yc);
      }
    }

    points.push(NaN, NaN);
    return new Float32Array(points);
  }
  function generateRectangleTriangleStrip(rect) {
    const {
      x,
      y,
      w,
      h
    } = rect;
    const points = [x, y, x + w, y, x, y + h, x + w, y + h];
    return new Float32Array(points);
  }
  /**
   * Given a rectangle, return a flat list of points enclosing a cycle around the rectangle.
   * @param rect {BoundingBox}
   * @returns {Float32Array}
   */

  function generateRectangleCycle(rect) {
    const {
      x,
      y,
      w,
      h
    } = rect;
    const points = [x, y, x + w, y, x + w, y + h, x, y + h, x, y];
    return new Float32Array(points);
  }
  function generateRectangleDebug(rect) {
    const {
      x,
      y,
      w,
      h
    } = rect;
    const points = [x, y, x + w, y, x + w, y + h, x, y + h, x, y, x + w, y + w];
    return new Float32Array(points);
  } // Given a Float32Array of appropriate size, repeatedly add given triangle strips

  function combineTriangleStrips(verticesBuff) {
    let index = 0;
    return arr => {
      if (arr.length === 0) return; // Repeat previous vertex

      if (index > 0) {
        verticesBuff[index] = verticesBuff[index - 2];
        verticesBuff[index + 1] = verticesBuff[index - 1];
        verticesBuff[index + 2] = arr[0];
        verticesBuff[index + 3] = arr[1];
        index += 4;
      }

      verticesBuff.set(arr, index);
      index += arr.length;
    };
  }
  function combineColoredTriangleStrips(verticesBuff, colorBuff) {
    let index = 0;
    return (arr, {
      r = 0,
      g = 0,
      b = 0,
      a = 0
    }) => {
      if (arr.length === 0) return; // Repeat previous vertex

      if (index > 0) {
        verticesBuff[index] = verticesBuff[index - 2];
        verticesBuff[index + 1] = verticesBuff[index - 1];
        verticesBuff[index + 2] = arr[0];
        verticesBuff[index + 3] = arr[1];
        index += 4;
      }

      verticesBuff.set(arr, index);
      fillRepeating(colorBuff, [r / 255, g / 255, b / 255, a / 255], index * 2, 2 * (index + arr.length));
      index += arr.length;
    };
  }
  /**
   * Fill the TypedArray arr with a given pattern throughout [startIndex, endIndex). Works if either is out of bounds.
   * Worst code ever. Uses copyWithin to try make the operation FAST for large arrays (not optimized for small ones). On
   * a 50000-element array in my chrome, it provides a 16x speedup.
   * @param arr Array to fill
   * @param pattern {Array} Pattern to fill with
   * @param startIndex {number} Index of the first instance of the pattern
   * @param endIndex {number} Index immediately after the last instance of the pattern
   * @param patternStride {number} Offset to begin copying the pattern
   * @returns The original array
   */

  function fillRepeating(arr, pattern, startIndex = 0, endIndex = arr.length, patternStride = 0) {
    if (endIndex <= startIndex) return arr;
    let patternLen = pattern.length,
        arrLen = arr.length;
    if (patternLen === 0) return arr;
    endIndex = Math.min(endIndex, arrLen);
    if (endIndex <= 0 || startIndex >= arrLen) return arr;

    if (startIndex < 0) {
      patternStride -= startIndex;
      startIndex = 0;
    }

    if (patternStride !== 0) patternStride = mod(patternStride, patternLen);
    let filledEndIndex = Math.min(endIndex, startIndex + patternLen);
    let i, j;

    for (i = startIndex, j = patternStride; i < filledEndIndex && j < patternLen; ++i, ++j) {
      arr[i] = pattern[j];
    } // For nonzero strides


    for (j = 0; i < filledEndIndex; ++i, ++j) {
      arr[i] = pattern[j];
    }

    if (filledEndIndex === endIndex) return arr; // We now need to iteratively copy [startIndex, startIndex + filledLen) to [startIndex + filledLen, endIndex) and
    // double filledLen accordingly. memcpy, take the wheel!

    let filledLen = patternLen;

    while (true) {
      let copyLen = Math.min(filledLen, endIndex - filledEndIndex);
      arr.copyWithin(filledEndIndex, startIndex, startIndex + copyLen);
      filledEndIndex += copyLen;
      filledLen += copyLen; // Should never be greater, but whatever

      if (filledEndIndex >= endIndex) return arr;
    }
  }

  function _flattenVec2ArrayInternal(arr) {
    const out = [];

    for (let i = 0; i < arr.length; ++i) {
      let item = arr[i];

      if (item === null || item === undefined) {
        out.push(NaN, NaN);
      } else if (item.x !== undefined && item.y !== undefined) {
        out.push(item.x, item.y);
      } else if (item[0] !== undefined) {
        var _item$;

        out.push(+item[0], (_item$ = item[1]) !== null && _item$ !== void 0 ? _item$ : 0);
      } else {
        if (typeof item === "number") out.push(item);else throw new TypeError("Error when converting array to flattened Vec2 array: Unknown item ".concat(item, " at index ").concat(i, " in given array"));
      }
    }

    return out;
  } // Given some arbitrary array of Vec2s, turn it into the regularized format [x1, y1, x2, y2, ..., xn, yn]. The end of
  // one polyline and the start of another is done by one pair of numbers being NaN, NaN.


  function flattenVec2Array(arr) {
    if (isTypedArray(arr)) return arr;

    for (let i = 0; i < arr.length; ++i) {
      if (typeof arr[i] !== "number") return _flattenVec2ArrayInternal(arr);
    }

    return arr;
  }
  /**
   * Get the actual bounding rectangle of a piece of text with a given vector anchor and spacing from that anchor. For
   * example, getActualTextLocation( { x: 0, y: 0, w: 10, h: 10 }, { x: 50, y: 50 }, "S", 3 ) is { x: 45, y: 37, w: 10, h: 10 } )
   * @param textRect {BoundingBox} The bounding box of the text rectangle (x and y are ignored)
   * @param anchor {Vec2} The position to anchor to
   * @param anchorDir {Vec2} The direction of the anchor
   * @param spacing {number} The additional constant spacing from the anchor
   * @returns {BoundingBox}
   */

  function getActualTextLocation(textRect, anchor, anchorDir, spacing) {
    var _Vec2$fromObj, _Vec2$fromObj2, _spacing;

    // We get the center of the rectangle, starting at anchor and adding anchorDir * textRect.wh / 4 * (1 + spacing / norm(textRect.wh) / 2).
    const {
      w,
      h
    } = textRect;
    anchor = (_Vec2$fromObj = Vec2.fromObj(anchor)) !== null && _Vec2$fromObj !== void 0 ? _Vec2$fromObj : new Vec2(0, 0);
    anchorDir = (_Vec2$fromObj2 = Vec2.fromObj(anchorDir)) !== null && _Vec2$fromObj2 !== void 0 ? _Vec2$fromObj2 : new Vec2(0, 0);
    spacing = (_spacing = spacing) !== null && _spacing !== void 0 ? _spacing : 0;
    let centerX = anchor.x + anchorDir.x * (textRect.w / 4 + spacing);
    let centerY = anchor.y + anchorDir.y * (textRect.h / 4 + spacing);
    return BoundingBox.fromObj({
      cx: centerX,
      cy: centerY,
      w,
      h
    });
  } // Merging geometries of various types is a very common operation because we want to minimize bufferData and drawArrays

  // This code is pretty old, but surprisingly effective!
  /**
   * Compute Math.hypot(x, y), but since all the values of x and y we're using here are not extreme, we don't have to
   * handle overflows and underflows with much accuracy at all. We can thus use the straightforward calculation.
   * Chrome: 61.9 ms/iteration for 1e7 calculations for fastHypot; 444 ms/iteration for Math.hypot
   * @param x {number}
   * @param y {number}
   * @returns {number} hypot(x, y)
   */

  function fastHypot(x, y) {
    return Math.sqrt(x * x + y * y);
  }
  /**
   * The maximum number of vertices to be emitted by getDashedPolyline. This condition is here just to prevent dashed
   * polyline from causing a crash from OOM or just taking forever to finish.
   * @type {number}
   */

  const MAX_DASHED_POLYLINE_VERTICES = 1e7;
  /**
   * Convert a polyline into another polyline, but with dashes.
   * @param vertices {Array} The vertices of the polyline.
   * @param pen {Pen} The polyline's pen
   * @param box {BoundingBox} The plotting box, used to clip excess portions of the polyline. There could theoretically be
   * an infinite number of dashes in a long vertical asymptote, for example, but this box condition prevents that from
   * being an issue. Portions of the polyline outside the plotting box are simply returned without dashes.
   * @returns {Array}
   */

  function getDashedPolyline(vertices, pen, box) {
    if (!box) box = new BoundingBox(-Infinity, -Infinity, Infinity, Infinity); // dashPattern is the pattern of dashes, given as the length (in pixels) of consecutive dashes and gaps.
    // dashOffset is the pixel offset at which to start the dash pattern, beginning at the start of every sub polyline.

    let {
      dashPattern,
      dashOffset
    } = pen; // If the dash pattern is odd in length, concat it to itself, creating a doubled, alternating dash pattern

    if (dashPattern.length % 2 === 1) dashPattern = dashPattern.concat(dashPattern); // The length, in pixels, of the pattern

    const patternLength = dashPattern.reduce((a, b) => a + b); // If the pattern is invalid in some way (NaN values, negative dash lengths, total length less than 2), return the
    // polyline without dashes.

    if (patternLength < 2 || dashPattern.some(dashLen => dashLen < 0) || dashPattern.some(Number.isNaN)) return vertices; // currentIndex is the current position in the dash pattern. currentLesserOffset is the offset within the dash or gap
    // ----    ----    ----    ----    ----    ----    ----  ... etc.
    //      ^
    // If we are there, then currentIndex is 1 and currentLesserOffset is 1.

    let currentIndex = 0,
        currentLesserOffset = 0; // Initialize the value of currentLesserOffset based on dashOffset and dashPattern

    recalculateOffset(0); // The returned dashed vertices

    const result = []; // The plotting box

    const boxX1 = box.x,
          boxX2 = box.x + box.w,
          boxY1 = box.y,
          boxY2 = box.y + box.h; // Calculate the value of currentLesserOffset, given the length of the pattern that we have just traversed.

    function recalculateOffset(length) {
      // If there's an absurdly long segment, we just pretend the length is 0 to avoid problems with Infinities/NaNs
      if (length > 1e6) length = 0; // Move length along the dashOffset, modulo the patternLength

      dashOffset += length;
      dashOffset %= patternLength; // It's certainly possible to precompute these sums and use a binary search to find the dash index, but
      // that's unnecessary for dashes with short length

      let sum = 0,
          i = 0,
          lesserOffset = 0;

      for (; i < dashPattern.length; ++i) {
        let dashLength = dashPattern[i]; // Accumulate the length from the start of the pattern to the current dash

        sum += dashLength; // If the dashOffset is within this dash...

        if (dashOffset <= sum) {
          // calculate the lesser offset
          lesserOffset = dashOffset - sum + dashLength;
          break;
        }
      } // Set the current index and lesserOffset


      currentIndex = i;
      currentLesserOffset = lesserOffset;
    } // Generate dashes for the line segment (x1, y1) -- (x2, y2)


    function generateDashes(x1, y1, x2, y2) {
      // length of the segment
      const length = fastHypot(x2 - x1, y2 - y1); // index of where along the dashes we are

      let i = currentIndex; // Length so far of emitted dashes

      let lengthSoFar = 0; // We do this instead of while (true) to prevent the program from crashing

      for (let _ = 0; _ < MAX_DASHED_POLYLINE_VERTICES; _++) {
        // Length of the dash/gap component we need to draw (we subtract currentLesserOffset because that is already drawn)
        const componentLen = dashPattern[i] - currentLesserOffset; // Length when this component ends

        const endingLen = componentLen + lengthSoFar; // Whether we are in a dash

        const inDash = i % 2 === 0;

        if (endingLen <= length) {
          // If the end of the dash/gap occurs before the end of the current segment, we need to continue
          let r = endingLen / length; // if in a gap, this starts the next dash; if in a dash, this ends the dash

          result.push(x1 + (x2 - x1) * r, y1 + (y2 - y1) * r); // If we're ending off a dash, put the gap in

          if (inDash) result.push(NaN, NaN); // Go to the next dash/gap

          ++i;
          i %= dashPattern.length; // Reset the current lesser offset

          currentLesserOffset = 0;
        } else {
          // If we're in a dash, that means we're in the middle of a dash, so we just add the vertex
          if (inDash) result.push(x2, y2);
          break;
        }

        lengthSoFar += componentLen;
      } // Recalculate currentLesserOffset


      recalculateOffset(length);
    } // Where we along on each chunk, which tells us when to yield a progress report
    if (currentIndex % 2 === 0) // We're beginning with a dash, so start it off
      result.push(vertices[0], vertices[1]);

    for (let i = 0; i < vertices.length - 2; i += 2) {
      // For each pair of vertices...
      let x1 = vertices[i];
      let y1 = vertices[i + 1];
      let x2 = vertices[i + 2];
      let y2 = vertices[i + 3];

      if (Number.isNaN(x1) || Number.isNaN(y1)) {
        // At the start of every subpolyline, reset the dash offset
        dashOffset = pen.dashOffset; // Recalculate the initial currentLesserOffset

        recalculateOffset(0); // End off the previous subpolyline

        result.push(NaN, NaN);
        continue;
      } // If the end of the segment is undefined, continue


      if (Number.isNaN(x2) || Number.isNaN(y2)) continue; // Length of the segment

      let length = fastHypot(x2 - x1, y2 - y1); // Find whether the segment intersects the box

      let intersect = lineSegmentIntersectsBox(x1, y1, x2, y2, boxX1, boxY1, boxX2, boxY2); // If the segment doesn't intersect the box, it is entirely outside the box, so we can add its length to pretend
      // like we drew it even though we didn't

      if (!intersect) {
        recalculateOffset(length);
        continue;
      } // Whether (x1, y1) and (x2, y2) are contained within the box


      let pt1Contained = intersect[0] === x1 && intersect[1] === y1;
      let pt2Contained = intersect[2] === x2 && intersect[3] === y2; // If (x1, y1) is contained, fake draw the portion of the line outside of the box

      if (!pt1Contained) recalculateOffset(fastHypot(x1 - intersect[0], y1 - intersect[1]));

      generateDashes(intersect[0], intersect[1], intersect[2], intersect[3]);
      if (!pt2Contained) recalculateOffset(fastHypot(x2 - intersect[2], y2 - intersect[3]));
      if (result.length > MAX_DASHED_POLYLINE_VERTICES) throw new Error("Too many generated vertices in getDashedPolyline.");
    }

    return result;
  }

  const ENDCAP_TYPES = {
    'butt': 0,
    'round': 1,
    'square': 2
  };
  const JOIN_TYPES = {
    'bevel': 0,
    'miter': 2,
    'round': 1,
    'dynamic': 3
  };

  const MIN_RES_ANGLE = 0.05; // minimum angle in radians between roundings in a polyline

  const B = 4 / Math.PI;
  const C = -4 / Math.PI ** 2;

  function fastSin(x) {
    // crude, but good enough for this
    x %= 6.28318530717;
    if (x < -3.14159265) x += 6.28318530717;else if (x > 3.14159265) x -= 6.28318530717;
    return B * x + C * x * (x < 0 ? -x : x);
  }

  function fastCos(x) {
    return fastSin(x + 1.570796326794);
  }

  function fastAtan2(y, x) {
    let abs_x = x < 0 ? -x : x;
    let abs_y = y < 0 ? -y : y;
    let a = abs_x < abs_y ? abs_x / abs_y : abs_y / abs_x;
    let s = a * a;
    let r = ((-0.0464964749 * s + 0.15931422) * s - 0.327622764) * s * a + a;
    if (abs_y > abs_x) r = 1.57079637 - r;
    if (x < 0) r = 3.14159265 - r;
    if (y < 0) r = -r;
    return r;
  }
  /**
   * Convert an array of polyline vertices into a Float32Array of vertices to be rendered using WebGL.
   * @param vertices {Array} The vertices of the polyline.
   * @param pen {Object} A JSON representation of the pen. Could also be the pen object itself.
   * @param box {BoundingBox} The bounding box of the plot, used to optimize line dashes
   */


  function calculatePolylineVertices(vertices, pen, box = null) {
    if (pen.dashPattern.length === 0) {
      return convertTriangleStrip(vertices, pen);
    } else {
      return convertTriangleStrip(getDashedPolyline(vertices, pen, box), pen);
    }
  } // TODO convert to float array. Arrays are surprisingly memory inefficient (8 to 16x), not sure why

  function convertTriangleStrip(vertices, pen) {
    if (pen.thickness <= 0 || pen.endcapRes < MIN_RES_ANGLE || pen.joinRes < MIN_RES_ANGLE || vertices.length <= 3) {
      return {
        glVertices: null,
        vertexCount: 0
      };
    }

    let glVertices = [];
    let origVertexCount = vertices.length / 2;
    let th = pen.thickness / 2;
    let maxMiterLength = th / fastCos(pen.joinRes / 2);
    let endcap = ENDCAP_TYPES[pen.endcap];
    let join = JOIN_TYPES[pen.join];

    if (endcap === undefined || join === undefined) {
      throw new Error("Undefined endcap or join.");
    }

    let x1, x2, x3, y1, y2, y3;
    let v1x, v1y, v2x, v2y, v1l, v2l, b1_x, b1_y, scale, dis;

    for (let i = 0; i < origVertexCount; ++i) {
      x1 = i !== 0 ? vertices[2 * i - 2] : NaN; // Previous vertex

      x2 = vertices[2 * i]; // Current vertex

      x3 = i !== origVertexCount - 1 ? vertices[2 * i + 2] : NaN; // Next vertex

      y1 = i !== 0 ? vertices[2 * i - 1] : NaN; // Previous vertex

      y2 = vertices[2 * i + 1]; // Current vertex

      y3 = i !== origVertexCount - 1 ? vertices[2 * i + 3] : NaN; // Next vertex

      if (isNaN(x2) || isNaN(y2)) {
        glVertices.push(NaN, NaN);
      }

      if (isNaN(x1) || isNaN(y1)) {
        // starting endcap
        v2x = x3 - x2;
        v2y = y3 - y2;
        v2l = fastHypot(v2x, v2y);

        if (v2l < 1e-8) {
          v2x = 1;
          v2y = 0;
        } else {
          v2x /= v2l;
          v2y /= v2l;
        }

        if (isNaN(v2x) || isNaN(v2y)) {
          continue;
        } // undefined >:(


        if (endcap === 1) {
          // rounded endcap
          let theta = fastAtan2(v2y, v2x) + Math.PI / 2;
          let steps_needed = Math.ceil(Math.PI / pen.endcapRes);
          let o_x = x2 - th * v2y,
              o_y = y2 + th * v2x;

          for (let i = 1; i <= steps_needed; ++i) {
            let theta_c = theta + i / steps_needed * Math.PI;
            glVertices.push(x2 + th * fastCos(theta_c), y2 + th * fastSin(theta_c), o_x, o_y);
          }

          continue;
        } else if (endcap === 2) {
          glVertices.push(x2 - th * v2x + th * v2y, y2 - th * v2y - th * v2x, x2 - th * v2x - th * v2y, y2 - th * v2y + th * v2x);
          continue;
        } else {
          // no endcap
          glVertices.push(x2 + th * v2y, y2 - th * v2x, x2 - th * v2y, y2 + th * v2x);
          continue;
        }
      }

      if (isNaN(x3) || isNaN(y3)) {
        // ending endcap
        v1x = x2 - x1;
        v1y = y2 - y1;
        v1l = v2l;

        if (v1l < 1e-8) {
          v1x = 1;
          v1y = 0;
        } else {
          v1x /= v1l;
          v1y /= v1l;
        }

        if (isNaN(v1x) || isNaN(v1y)) {
          continue;
        } // undefined >:(


        glVertices.push(x2 + th * v1y, y2 - th * v1x, x2 - th * v1y, y2 + th * v1x);

        if (endcap === 1) {
          let theta = fastAtan2(v1y, v1x) + 3 * Math.PI / 2;
          let steps_needed = Math.ceil(Math.PI / pen.endcapRes);
          let o_x = x2 - th * v1y,
              o_y = y2 + th * v1x;

          for (let i = 1; i <= steps_needed; ++i) {
            let theta_c = theta + i / steps_needed * Math.PI;
            glVertices.push(x2 + th * fastCos(theta_c), y2 + th * fastSin(theta_c), o_x, o_y);
          }
        }

        continue;
      } // all vertices are defined, time to draw a joinerrrrr


      if (join === 2 || join === 3) {
        // find the two angle bisectors of the angle formed by v1 = p1 -> p2 and v2 = p2 -> p3
        v1x = x1 - x2;
        v1y = y1 - y2;
        v2x = x3 - x2;
        v2y = y3 - y2;
        v1l = v2l;
        v2l = fastHypot(v2x, v2y);
        b1_x = v2l * v1x + v1l * v2x;
        b1_y = v2l * v1y + v1l * v2y;
        scale = 1 / fastHypot(b1_x, b1_y);

        if (scale === Infinity || scale === -Infinity) {
          b1_x = -v1y;
          b1_y = v1x;
          scale = 1 / fastHypot(b1_x, b1_y);
        }

        b1_x *= scale;
        b1_y *= scale;
        scale = th * v1l / (b1_x * v1y - b1_y * v1x);

        if (join === 2 || Math.abs(scale) < maxMiterLength) {
          // Draw a miter. But the length of the miter is massive and we're in dynamic mode (3), we exit this if statement and do a rounded join
          b1_x *= scale;
          b1_y *= scale;
          glVertices.push(x2 - b1_x, y2 - b1_y, x2 + b1_x, y2 + b1_y);
          continue;
        }
      }

      v2x = x3 - x2;
      v2y = y3 - y2;
      dis = fastHypot(v2x, v2y);

      if (dis < 0.001) {
        v2x = 1;
        v2y = 0;
      } else {
        v2x /= dis;
        v2y /= dis;
      }

      v1x = x2 - x1;
      v1y = y2 - y1;
      dis = fastHypot(v1x, v1y);

      if (dis === 0) {
        v1x = 1;
        v1y = 0;
      } else {
        v1x /= dis;
        v1y /= dis;
      }

      glVertices.push(x2 + th * v1y, y2 - th * v1x, x2 - th * v1y, y2 + th * v1x);

      if (join === 1 || join === 3) {
        let a1 = fastAtan2(-v1y, -v1x) - Math.PI / 2;
        let a2 = fastAtan2(v2y, v2x) - Math.PI / 2; // if right turn, flip a2
        // if left turn, flip a1

        let start_a, end_a;

        if (mod(a1 - a2, 2 * Math.PI) < Math.PI) {
          // left turn
          start_a = Math.PI + a1;
          end_a = a2;
        } else {
          start_a = Math.PI + a2;
          end_a = a1;
        }

        let angle_subtended = mod(end_a - start_a, 2 * Math.PI);
        let steps_needed = Math.ceil(angle_subtended / pen.joinRes);

        for (let i = 0; i <= steps_needed; ++i) {
          let theta_c = start_a + angle_subtended * i / steps_needed;
          glVertices.push(x2 + th * fastCos(theta_c), y2 + th * fastSin(theta_c), x2, y2);
        }
      }

      glVertices.push(x2 + th * v2y, y2 - th * v2x, x2 - th * v2y, y2 + th * v2x);
    }

    return new Float32Array(glVertices);
  }

  /**
   * Represents a linear transformation by storing two bounding boxes: one for the plot in CSS pixels, and one for the
   * actual elements in the graph. Some parts of this should be highly optimized, but it needn't be complicated.
   */
  class LinearPlot2DTransform {
    /**
     * Parameters beginning with p are the bounding box in pixel coordinates. Those beginning with g are the bounding box
     * in graph coordinates. The transform has an implicit y flipping operation, which is key. The point (px1, py1) does
     * NOT map to the point (gx1, gy1), but the point (gx1, gy1 + gh). This annoyance is why a special class is useful.
     * @param px1
     * @param py1
     * @param pw
     * @param ph
     * @param gx1
     * @param gy1
     * @param gw
     * @param gh
     */
    constructor(px1, py1, pw, ph, gx1, gy1, gw, gh) {
      this.px1 = px1;
      this.py1 = py1;
      this.pw = pw;
      this.ph = ph;
      this.gx1 = gx1;
      this.gy1 = gy1;
      this.gw = gw;
      this.gh = gh;
    }

    get px2() {
      return this.px1 + this.pw;
    }

    get py2() {
      return this.py1 + this.ph;
    }

    get gx2() {
      return this.gx1 + this.gw;
    }

    get gy2() {
      return this.gy1 + this.gh;
    }

    pixelBox() {
      return new BoundingBox(this.px1, this.py1, this.pw, this.ph);
    }

    graphBox() {
      return new BoundingBox(this.gx1, this.gy1, this.gw, this.gh);
    }

    resizeToPixelBox(box) {
      this.px1 = box.x;
      this.py1 = box.y;
      this.pw = box.w;
      this.ph = box.h;
      return this;
    }

    resizeToGraphBox(box) {
      this.gx1 = box.x;
      this.gy1 = box.y;
      this.gw = box.w;
      this.gh = box.h;
      return this;
    }

    setGraphXBounds(x1, x2) {
      this.gx1 = x1;
      this.gw = x2 - x1;
    }

    setGraphYBounds(y1, y2) {
      this.gy1 = y1;
      this.gh = y2 - y1;
    }

    setGraphXYBounds(x1, x2, y1, y2) {
      this.setGraphXBounds(x1, x2);
      this.setGraphYBounds(y1, y2);
    }

    clone() {
      return new LinearPlot2DTransform(this.px1, this.py1, this.pw, this.ph, this.gx1, this.gy1, this.gw, this.gh);
    }

    pixelToGraphX(x) {
      // This is not flipped
      return (x - this.px1) / this.pw * this.gw + this.gx1;
    }

    pixelToGraphY(y) {
      // This is flipped
      return (1 - (y - this.py1) / this.ph) * this.gh + this.gy1;
    }

    graphToPixelX(x) {
      // This is not flipped
      return (x - this.gx1) / this.gw * this.pw + this.px1;
    }

    graphToPixelY(y) {
      // This is flipped
      return (1 - (y - this.gy1) / this.gh) * this.ph + this.py1;
    }

    pixelToGraph(vec) {
      return new Vec2(this.pixelToGraphX(vec.x), this.pixelToGraphY(vec.y));
    }

    graphToPixel(vec) {
      return new Vec2(this.graphToPixelX(vec.x), this.graphToPixelY(vec.y));
    }
    /**
     * Return {xm, ym, xb, yb} where xm * x + xb is the transformation from graph x to pixel x, etc.
     */


    getReducedGraphToPixelTransform() {
      const {
        px1,
        py1,
        pw,
        ph,
        gx1,
        gy1,
        gw,
        gh
      } = this;
      return {
        xm: pw / gw,
        ym: -ph / gh,
        xb: -gx1 / gw * pw + px1,
        yb: (1 + gy1 / gh) * ph + py1
      };
    }

  }
  class LinearPlot2DTransformConstraints {
    constructor(params) {}

    limitTransform(oldTransform, newTransform) {
      // For now, just return the oldTransform if the new transform has width 0 or has non-finite numbers
      const {
        px1,
        py1,
        pw,
        ph,
        gx1,
        gy1,
        gw,
        gh
      } = newTransform;
      if (gw <= 0 || gh <= 0 || !Number.isFinite(gx1) || !Number.isFinite(gy1) || !Number.isFinite(gw) || !Number.isFinite(gh)) return oldTransform;
      return newTransform;
    }

  }

  const defaultView = [-1, -1, 2, 2];
  const figureInterface = constructInterface({
    interface: {
      "interactivity": {
        description: "Whether interactivity is enabled",
        typecheck: {
          type: "boolean"
        }
      }
    },
    internal: {
      // Scene dims (inherited from above)
      "sceneDims": {
        computed: "none"
      },
      // Bounding box of the entire figure
      "figureBoundingBox": {
        computed: "none"
      },
      // Box in which things are actually plotted
      "plottingBox": {
        computed: "none"
      },
      // Margin between the plotting box and figure bounding box
      "margins": {
        computed: "default",
        default: {
          left: 30,
          right: 30,
          top: 30,
          bottom: 30
        }
      },
      // Transformation from pixel to graph coordinates and vice versa
      "plotTransform": {
        computed: "default",
        default: () => new LinearPlot2DTransform(0, 0, 0, 0, ...defaultView),
        evaluateDefault: true
      },
      // Whether to force the plot transform to have a specific aspect ratio
      "preserveAspectRatio": {
        computed: "default",
        default: true
      },
      // The aspect ratio to force
      "forceAspectRatio": {
        computed: "default",
        default: 1
      },
      // Interactivity
      "interactivity": {
        computed: "default",
        default: true
      },
      // Constraints on where the transform can be (min zoom, max zoom, etc.)
      "transformConstraints": {
        computed: "default",
        default: () => new LinearPlot2DTransformConstraints(),
        evaluateDefault: true
      }
    }
  });

  var _disableInteractivityListeners$1 = new WeakSet();

  var _enableInteractivityListeners$1 = new WeakSet();

  class NewFigure extends Group {
    constructor(...args) {
      super(...args);

      _enableInteractivityListeners$1.add(this);

      _disableInteractivityListeners$1.add(this);
    }

    init() {
      this.props.configureProperty("plotTransform", {
        inherit: true
      });
    }

    _update() {
      this.defaultInheritProps();
      this.defaultComputeProps();
      this.computeBoxes();
      this.computeScissor();
      this.computePlotTransform();
      this.toggleInteractivity();
    }

    toggleInteractivity() {
      let internal = this.internal;
      let interactivity = this.props.get("interactivity");

      if (!!internal.interactivityListeners !== interactivity) {
        interactivity ? _classPrivateMethodGet(this, _enableInteractivityListeners$1, _enableInteractivityListeners2$1).call(this) : _classPrivateMethodGet(this, _disableInteractivityListeners$1, _disableInteractivityListeners2$1).call(this);
      }
    }

    computeBoxes() {
      const {
        props
      } = this;
      props.set("figureBoundingBox", props.get("sceneDims").getBoundingBox());
      let margins = props.get("margins");
      props.set("plottingBox", props.get("figureBoundingBox").squishAsymmetrically(margins.left, margins.right, margins.bottom, margins.top), 0
      /* real */
      , 2
      /* deep equality */
      );
    }

    computeScissor() {
      const {
        props
      } = this;
      this.internal.renderInfo = {
        contexts: {
          type: "scissor",
          scissor: props.get("plottingBox")
        }
      };
    }

    computePlotTransform() {
      // We compute the plot transform from its current value, the plotting box, and related values which constrain the
      // plot transform (minZoom, maxZoom, preserveAspectRatio). The algorithm is as follows:
      // 1: resize the pixel box to the plotting box
      // 2: if preserveAspectRatio is true, stretch *out* from (cx, cy) as necessary to get an aspect ratio of forceAspectRatio
      // 3: To avoid some strange case where float values repeatedly cause the plot transform to change minutely because
      //    forceAspectRatio demands it, no stretching occurs if the aspect ratio is already proportionally close to the
      //    real aspect ratio
      // 4: ... other constraints ....
      const {
        props
      } = this;
      let {
        plotTransform,
        plottingBox,
        preserveAspectRatio
      } = props.proxy;
      plotTransform.resizeToPixelBox(plottingBox);

      if (preserveAspectRatio) {
        plotTransform.graphBox();
      }

      props.markChanged("plotTransform");
    }

    getInterface() {
      return figureInterface;
    }

  }

  var _disableInteractivityListeners2$1 = function _disableInteractivityListeners2() {
    let internal = this.internal;
    let interactivityListeners = internal.interactivityListeners;
    if (!interactivityListeners) return;

    for (let listenerType in interactivityListeners) {
      let listener = interactivityListeners[listenerType];
      this.removeEventListener(listenerType, listener);
    }

    internal.interactivityListeners = null;
  };

  var _enableInteractivityListeners2$1 = function _enableInteractivityListeners2() {
    _classPrivateMethodGet(this, _disableInteractivityListeners$1, _disableInteractivityListeners2$1).call(this);

    let int = this.internal,
        props = this.props;
    let listeners = this.interactivityListeners = {};
    this.addEventListener("mousedown", listeners.mousedown = evt => {
      int.mouseDownAt = evt.pos;
      int.graphMouseDownAt = props.get("plotTransform").pixelToGraph(int.mouseDownAt); // try to keep this constant

      int.isDragging = true;
    });
    this.addEventListener("mouseup", listeners.mousedown = () => {
      int.isDragging = false;
    });
    this.addEventListener("mousemove", listeners.mousemove = evt => {
      if (!int.isDragging) return;
      let transform = props.get("plotTransform");
      let constraints = props.get("transformConstraints");
      let newTransform = transform.clone(); // Get where the mouse is currently at and move (graphMouseDownAt) to (mouseDownAt)

      let graphMouseMoveAt = transform.pixelToGraph(evt.pos);
      let translationNeeded = int.graphMouseDownAt.sub(graphMouseMoveAt);
      newTransform.gx1 += translationNeeded.x;
      newTransform.gy1 += translationNeeded.y;
      newTransform = constraints.limitTransform(transform, newTransform);
      props.set("plotTransform", newTransform, 0
      /* real */
      , 2
      /* deep equality */
      );
    }); // Scroll handler

    this.addEventListener("wheel", listeners.wheel = evt => {
      let transform = props.get("plotTransform");
      let constraints = props.get("transformConstraints");
      let newTransform = transform.clone();
      let scaleFactor = 1 + Math.atanh(evt.deltaY / 300) / 300;
      let graphScrollAt = transform.pixelToGraph(evt.pos); // We need to scale graphBox at graphScrollAt with a scale factor. We translate it by -graphScrollAt, scale it by
      // sF, then translate it by graphScrollAt

      let graphBox = transform.graphBox();
      graphBox = graphBox.translate(graphScrollAt.mul(-1)).scale(scaleFactor).translate(graphScrollAt);
      newTransform.resizeToGraphBox(graphBox);
      newTransform = constraints.limitTransform(transform, newTransform);
      props.set("plotTransform", newTransform, 0
      /* real */
      , 2
      /* deep equality */
      );
    });
  };

  // A rather common operation for generating texture atlases and the like.
  // Takes in an array of rectangles and returns a packing of those rectangles as a list of x and y coordinates
  // The code fucking sucks, whatever, I just want text working ASAP
  // TODO: Chazelle packing
  function packRectangles(rectangles) {
    // For now, just find the maximum size and repeat that.
    let rectWidth = 0,
        rectHeight = 0;

    for (const rectangle of rectangles) {
      rectWidth = Math.max(rectWidth, rectangle.w);
      rectHeight = Math.max(rectHeight, rectangle.h);
    }

    let rectangleCount = rectangles.length;
    // has sides that are both powers of two. We consider rectangles of the ratios 2:1, 1:1 and 1:2.

    const totalArea = rectWidth * rectHeight * rectangleCount;
    let nextPowerOfTwo = Math.ceil(Math.floor(Math.log2(totalArea)));
    let textureWidth, textureHeight;
    let rectXCount;

    function tryPacking(width, height) {
      if (textureWidth) return;
      const minYCount = Math.floor(height / rectHeight);
      let minXCount = Math.floor(width / rectWidth);
      let correspondingXCount = Math.ceil(rectangleCount / minYCount);

      if (correspondingXCount <= minXCount) {
        // Then a packing of minYCount rectangles tall and correspondingXCount rectangles wide will suffice, in a bounding
        // box of textureWidth x textureHeight
        textureWidth = width;
        textureHeight = height;
        rectXCount = correspondingXCount;
      }
    }

    while (!textureWidth) {
      if (nextPowerOfTwo % 2 !== 0) {
        let width = 1 << nextPowerOfTwo / 2;
        let height = 1 << nextPowerOfTwo / 2 + 1;
        tryPacking(width, height);
        tryPacking(height, width);
      } else {
        const sideLen = 1 << nextPowerOfTwo / 2;
        tryPacking(sideLen, sideLen);
      }

      nextPowerOfTwo++;
    }

    let rects = [];

    for (let i = 0; i < rectangleCount; ++i) {
      let x = i % rectXCount;
      let y = Math.floor(i / rectXCount);
      let rect = rectangles[i];
      rects.push({
        x: x * rectWidth,
        y: y * rectHeight,
        w: rect.w,
        h: rect.h
      });
    }

    return {
      width: textureWidth,
      height: textureHeight,
      rects
    };
  }
  class DynamicRectanglePacker {
    constructor() {
      // Given rectangles of some ids, packs them, allowing for rectangles to be deleted and new ones to be added after
      // a previous packing
      // Maps rectangle ids to rectangles { x, y, w, h }
      this.rects = new Map();
      this.packingBoundary = [];
      this.packingMaxX = 0;
      this.packingMaxY = 0;
      this.queue = [];
    }
    /**
     * Reset the packer
     */


    clear() {
      this.rects.clear();
    } // Queue a rectangle of some width and height


    queueRectangle(id, width, height) {
      this.queue.push({
        id,
        w: width,
        h: height
      });
    }

    pack() {
      // Sorted by area. In the case of text, sorting by height might make more sense
      const rectsToPack = this.queue.sort((r1, r2) => r1.w * r1.h - r2.w * r2.h); // The packing boundary is the minimal "step function" that encompasses the rectangles already allocated. Yes, I know

      for (const rect of rectsToPack) {
        rect.w;
            rect.h;
      }
    }

  } // Credit to the authors of github.com/mapbox/potpack. I will be writing a better version soon

  function potpack(boxes) {
    // calculate total box area and maximum box width
    let area = 0;
    let maxWidth = 0;

    for (const box of boxes) {
      area += box.w * box.h;
      maxWidth = Math.max(maxWidth, box.w);
    } // sort the boxes for insertion by height, descending


    boxes.sort((a, b) => b.h - a.h); // aim for a squarish resulting container,
    // slightly adjusted for sub-100% space utilization

    const startWidth = Math.max(Math.ceil(Math.sqrt(area / 0.95)), maxWidth); // start with a single empty space, unbounded at the bottom

    const spaces = [{
      x: 0,
      y: 0,
      w: startWidth,
      h: Infinity
    }];
    let width = 0;
    let height = 0;

    for (const box of boxes) {
      // look through spaces backwards so that we check smaller spaces first
      for (let i = spaces.length - 1; i >= 0; i--) {
        const space = spaces[i]; // look for empty spaces that can accommodate the current box

        if (box.w > space.w || box.h > space.h) continue; // found the space; add the box to its top-left corner
        // |-------|-------|
        // |  box  |       |
        // |_______|       |
        // |         space |
        // |_______________|

        box.x = space.x;
        box.y = space.y;
        height = Math.max(height, box.y + box.h);
        width = Math.max(width, box.x + box.w);

        if (box.w === space.w && box.h === space.h) {
          // space matches the box exactly; remove it
          const last = spaces.pop();
          if (i < spaces.length) spaces[i] = last;
        } else if (box.h === space.h) {
          // space matches the box height; update it accordingly
          // |-------|---------------|
          // |  box  | updated space |
          // |_______|_______________|
          space.x += box.w;
          space.w -= box.w;
        } else if (box.w === space.w) {
          // space matches the box width; update it accordingly
          // |---------------|
          // |      box      |
          // |_______________|
          // | updated space |
          // |_______________|
          space.y += box.h;
          space.h -= box.h;
        } else {
          // otherwise the box splits the space into two spaces
          // |-------|-----------|
          // |  box  | new space |
          // |_______|___________|
          // | updated space     |
          // |___________________|
          spaces.push({
            x: space.x + box.w,
            y: space.y,
            w: space.w - box.w,
            h: box.h
          });
          space.y += box.h;
          space.h -= box.h;
        }

        break;
      }
    }

    return {
      w: width,
      // container width
      h: height,
      // container height
      fill: area / (width * height) || 0 // space utilization

    };
  }

  const INF = 1e20;
  class TinySDF {
    constructor({
      fontSize = 24,
      buffer = 3,
      radius = 8,
      cutoff = 0.25,
      fontFamily = 'sans-serif',
      fontWeight = 'normal'
    }) {
      this.buffer = buffer;
      this.cutoff = cutoff;
      this.radius = radius; // make the canvas size big enough to both have the specified buffer around the glyph
      // for "halo", and account for some glyphs possibly being larger than their font size

      const size = this.size = fontSize + buffer * 4;

      const canvas = this._createCanvas(size);

      const ctx = this.ctx = canvas.getContext('2d');
      ctx.font = "".concat(fontWeight, " ").concat(fontSize, "px ").concat(fontFamily);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left'; // Necessary so that RTL text doesn't have different alignment

      ctx.fillStyle = 'black'; // temporary arrays for the distance transform

      this.gridOuter = new Float64Array(size * size);
      this.gridInner = new Float64Array(size * size);
      this.f = new Float64Array(size);
      this.z = new Float64Array(size + 1);
      this.v = new Uint16Array(size);
    }

    _createCanvas(size) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      return canvas;
    }

    getMetrics(char) {
      const {
        width: glyphAdvance,
        actualBoundingBoxAscent,
        actualBoundingBoxDescent,
        actualBoundingBoxLeft,
        actualBoundingBoxRight
      } = this.ctx.measureText(char); // The integer/pixel part of the top alignment is encoded in metrics.glyphTop
      // The remainder is implicitly encoded in the rasterization

      const glyphTop = Math.floor(actualBoundingBoxAscent);
      const glyphLeft = 0; // If the glyph overflows the canvas size, it will be clipped at the bottom/right

      const glyphWidth = Math.min(this.size - this.buffer, Math.ceil(actualBoundingBoxRight - actualBoundingBoxLeft));
      const glyphHeight = Math.min(this.size - this.buffer, Math.ceil(actualBoundingBoxAscent) + Math.ceil(actualBoundingBoxDescent));
      const width = glyphWidth + 2 * this.buffer;
      const height = glyphHeight + 2 * this.buffer;
      return {
        width,
        height,
        glyphWidth,
        glyphHeight,
        glyphTop,
        glyphLeft,
        glyphAdvance
      };
    }

    draw(char, metrics = this.getMetrics(char)) {
      const {
        width,
        height,
        glyphWidth,
        glyphHeight,
        glyphTop
      } = metrics;
      const len = width * height;
      const data = new Uint8ClampedArray(len);

      const glyph = _objectSpread2({
        data
      }, metrics);

      if (glyphWidth === 0 || glyphHeight === 0) return glyph;
      const {
        ctx,
        buffer,
        gridInner,
        gridOuter
      } = this;
      ctx.clearRect(buffer, buffer, glyphWidth, glyphHeight);
      ctx.fillText(char, buffer, buffer + glyphTop + 1);
      const imgData = ctx.getImageData(buffer, buffer, glyphWidth, glyphHeight); // Initialize grids outside the glyph range to alpha 0

      gridOuter.fill(INF, 0, len);
      gridInner.fill(0, 0, len);

      for (let y = 0; y < glyphHeight; y++) {
        for (let x = 0; x < glyphWidth; x++) {
          const a = imgData.data[4 * (y * glyphWidth + x) + 3] / 255; // alpha value

          if (a === 0) continue; // empty pixels

          const j = (y + buffer) * width + x + buffer;

          if (a === 1) {
            // fully drawn pixels
            gridOuter[j] = 0;
            gridInner[j] = INF;
          } else {
            // aliased pixels
            const d = 0.5 - a;
            gridOuter[j] = d > 0 ? d * d : 0;
            gridInner[j] = d < 0 ? d * d : 0;
          }
        }
      }

      edt(gridOuter, width, height, this.f, this.v, this.z);
      edt(gridInner, width, height, this.f, this.v, this.z);

      for (let i = 0; i < len; i++) {
        const d = Math.sqrt(gridOuter[i]) - Math.sqrt(gridInner[i]);
        data[i] = Math.round(255 - 255 * (d / this.radius + this.cutoff));
      }

      return glyph;
    }

  } // 2D Euclidean squared distance transform by Felzenszwalb & Huttenlocher https://cs.brown.edu/~pff/papers/dt-final.pdf

  function edt(data, width, height, f, v, z) {
    for (let x = 0; x < width; x++) edt1d(data, x, width, height, f, v, z);

    for (let y = 0; y < height; y++) edt1d(data, y * width, 1, width, f, v, z);
  } // 1D squared distance transform


  function edt1d(grid, offset, stride, length, f, v, z) {
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    f[0] = grid[offset];

    for (let q = 1, k = 0, s = 0; q < length; q++) {
      f[q] = grid[offset + q * stride];
      const q2 = q * q;

      do {
        const r = v[k];
        s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
      } while (s <= z[k] && --k > -1);

      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }

    for (let q = 0, k = 0; q < length; q++) {
      while (z[k + 1] < q) k++;

      const r = v[k];
      const qr = q - r;
      grid[offset + q * stride] = f[r] + qr * qr;
    }
  } // For now we'll just do printable ASCII. Everything else will be dropped


  let desiredChars = '';

  for (let i = 33; i < 127; ++i) desiredChars += String.fromCharCode(i);

  function getTextSDFInformation(params = {}) {
    // Parameters are fontSize, buffer, radius, cutoff, fontFamily, and fontWeight. space is dealt with separately
    const sdf = new TinySDF(params);
    const chars = desiredChars.split('');
    const charData = [];

    for (const char of chars) {
      charData.push(sdf.draw(char));
    }

    const charPacking = packRectangles(charData.map(char => ({
      w: char.width,
      h: char.height
    })));
    const {
      width,
      height,
      rects
    } = charPacking;
    const atlas = new Uint8ClampedArray(width * height); // The text is generally going to be inverted, so

    function pasteIntoAtlas(data
    /* Uint8ClampedArray */
    , pasteX, pasteY, dataWidth, dataHeight) {
      // Do it row by row, so go to y for the first element, draw dataWidth elements, then skip down
      let i = 0;

      for (let y = pasteY; y < pasteY + dataHeight; ++y) {
        let offset = width / 2 * y + pasteX / 2;

        for (let pos = offset; pos < offset + dataWidth; ++pos) {
          atlas[offset + pos] = data[i];
          ++i;
        }
      }
    }

    for (let i = 0; i < chars.length; ++i) {
      let data = charData[i];
      let rect = rects[i];
      pasteIntoAtlas(data.data, rect.x, rect.y, data.width, data.height);
      data.atlasX = rect.x;
      data.atlasY = rect.y;
    }

    chars.push(' ');
    charData.push({
      glyphAdvance: sdf.ctx.measureText(' ').width
    });
    const retData = {};

    for (let i = 0; i < chars.length; ++i) {
      retData[chars[i]] = charData[i];
    }

    return {
      // Current structure: Each glyph is given a rectangle on the texture with bounds (atlasX, atlasY) +
      charData: retData,
      atlas,
      atlasWidth: width,
      atlasHeight: height
    };
  }

  class TextRenderer {
    constructor() {
      this.canvas = document.createElement("canvas");
      let ctx = this.ctx = this.canvas.getContext("2d");
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
    /**
     * Clear out all previous text stores. In the future, when doing a dynamic text packing, this will be called sometimes
     * to do a reallocation.
     */


    clearText() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    getMetrics(textInfo) {
      const {
        ctx
      } = this;
      const {
        fontSize,
        font
      } = textInfo.style;
      ctx.font = "".concat(fontSize, "px ").concat(font);
      return ctx.measureText(textInfo.text);
    }

    resizeCanvas(width, height) {
      this.canvas.width = width;
      this.canvas.height = height;
      const {
        ctx
      } = this;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }

    drawText(textInfos) {
      const {
        ctx
      } = this;
      const padding = 2; // Extra padding to allow for various antialiased pixels to spill over
      // Sort by font to avoid excess ctx.font modifications

      textInfos.sort((c1, c2) => c1.style.font < c2.style.font); // Compute where to place the text. Note that the text instructions are mutated in this process (in fact, the point
      // of this process is to provide the instruction compiler with enough info to get the correct vertices)

      const rects = [];

      for (const draw of textInfos) {
        var _ref;

        const metrics = this.getMetrics(draw);
        let shadowDiameter = (_ref = 2 * draw.style.shadowRadius) !== null && _ref !== void 0 ? _ref : 0;
        const width = Math.ceil(metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) + shadowDiameter + padding;
        const height = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) + shadowDiameter + padding;
        draw.metrics = metrics;
        draw.rect = {
          w: width,
          h: height
        };
        rects.push(draw.rect);
      }

      const {
        w: packedWidth,
        h: packedHeight
      } = potpack(rects); // Powers of two are generally nicer when working with textures

      const canvasWidth = nextPowerOfTwo(packedWidth),
            canvasHeight = nextPowerOfTwo(packedHeight);
      this.resizeCanvas(canvasWidth, canvasHeight);
      this.clearText();
      ctx.fillStyle = "black"; // Each draw is now { metrics: TextMetrics, rect: {w, h, x, y}, text, style }

      for (const draw of textInfos) {
        var _draw$style$shadowRad;

        const style = draw.style;
        ctx.font = "".concat(style.fontSize, "px ").concat(style.font);
        const shadowRadius = (_draw$style$shadowRad = draw.style.shadowRadius) !== null && _draw$style$shadowRad !== void 0 ? _draw$style$shadowRad : 0;
        let x = draw.rect.x + draw.metrics.actualBoundingBoxLeft + shadowRadius;
        let y = draw.rect.y + draw.metrics.actualBoundingBoxAscent + shadowRadius; // Stroke text behind the text with white

        if (shadowRadius) {
          ctx.strokeStyle = "white";
          ctx.lineWidth = shadowRadius;
          ctx.strokeText(draw.text, x, y);
          ctx.fillStyle = "black";
        }

        ctx.fillText(draw.text, x, y); // The actual texture coordinates used should be minus the padding (which is only used for potpack)

        draw.rect.w -= padding;
        draw.rect.h -= padding;
      }
    }

  }

  let sceneInterface = Scene.prototype.getInterface();
  let interactiveSceneInterface = {
    interface: _objectSpread2(_objectSpread2({}, sceneInterface.description.interface), {}, {
      interactivity: {
        typecheck: {
          type: "boolean"
        }
      }
    }),
    internal: _objectSpread2(_objectSpread2({}, sceneInterface.description.internal), {}, {
      interactivity: {
        type: "boolean",
        computed: "default",
        default: true
      }
    })
  };
  interactiveSceneInterface = constructInterface(interactiveSceneInterface);
  /**
   * A scene endowed with an actual DOM element.
   */

  var _disableInteractivityListeners = new WeakSet();

  var _enableInteractivityListeners = new WeakSet();

  class InteractiveScene extends Scene {
    constructor(...args) {
      super(...args);

      _enableInteractivityListeners.add(this);

      _disableInteractivityListeners.add(this);
    }

    init(params) {
      super.init(params);
      this.domElement = document.createElement("canvas");
      this.bitmapRenderer = this.domElement.getContext("bitmaprenderer");
    }

    toggleInteractivity() {
      let internal = this.internal;
      let interactivity = this.props.get("interactivity");

      if (!!internal.interactivityListeners !== interactivity) {
        interactivity ? _classPrivateMethodGet(this, _enableInteractivityListeners, _enableInteractivityListeners2).call(this) : _classPrivateMethodGet(this, _disableInteractivityListeners, _disableInteractivityListeners2).call(this);
      }
    }

    _update() {
      super._update();

      this.toggleInteractivity();
      this.resizeCanvas();
    }

    getInterface() {
      return interactiveSceneInterface;
    }

    resizeCanvas() {
      const {
        width,
        height,
        dpr
      } = this.props.proxy;
      const {
        domElement
      } = this;
      domElement.width = width * dpr;
      domElement.height = height * dpr;
      domElement.style.width = width + 'px';
      domElement.style.height = height + 'px';
    }

  }

  var _disableInteractivityListeners2 = function _disableInteractivityListeners2() {
    let internal = this.internal;
    let interactivityListeners = internal.interactivityListeners;
    if (!interactivityListeners) return;

    for (let listenerType in interactivityListeners) {
      let listener = interactivityListeners[listenerType];
      this.domElement.removeEventListener(listenerType, listener);
    }

    internal.interactivityListeners = null;
  };

  var _enableInteractivityListeners2 = function _enableInteractivityListeners2() {
    _classPrivateMethodGet(this, _disableInteractivityListeners, _disableInteractivityListeners2).call(this);

    let listeners = this.internal.interactivityListeners = {}; // Convert mouse event coords (which are relative to the top left corner of the page) to canvas coords

    const getSceneCoords = evt => {
      let rect = this.domElement.getBoundingClientRect();
      return new Vec2(evt.clientX - rect.x, evt.clientY - rect.y);
    };

    ["mousedown", "mousemove", "mouseup", "wheel"].forEach(eventName => {
      let listener;

      if (eventName === "wheel") {
        listener = evt => {
          this.triggerEvent(eventName, {
            pos: getSceneCoords(evt),
            deltaY: evt.deltaY
          });
          evt.preventDefault();
        };
      } else {
        listener = evt => {
          this.triggerEvent(eventName, {
            pos: getSceneCoords(evt)
          });
          evt.preventDefault();
        };
      }

      this.domElement.addEventListener(eventName, listeners[eventName] = listener);
    });
  };

  // Given a top-level scene, construct a bunch of information about the scene, outputting a map of context ids ->
  /**
   * Validate, shallow clone instructions and change their zIndex, et cetera
   * @param instruction
   */

  function adjustInstruction(instruction) {
    const type = instruction.type;
    if (!type) throw new Error("Instruction does not have a type. Erroneous instruction: " + JSON.stringify(instruction));
    let out = Object.assign({}, instruction);
    let zIndex = out.zIndex;
    let escapeContext = out.escapeContext; // Fill in zIndex value for sorting

    if (zIndex === undefined) {
      if (type === "text") {
        out.zIndex = Infinity;
      } else {
        out.zIndex = 0;
      }
    }

    if (escapeContext === undefined) {
      // Default text value
      if (type === "text") {
        out.escapeContext = "top";
      }
    } else if (escapeContext) {
      // Validate
      if (typeof escapeContext !== "string") {
        throw new Error("Instruction has an invalid escape context value. Erroneous instruction: " + JSON.stringify(instruction));
      }
    }

    return out;
  }
  /**
   * Return whether a given context is the correct context to escape to, depending on what information is provided.
   * @param context
   * @param escapeContext
   */


  function matchEscapeContext(context, escapeContext) {
    if (typeof escapeContext === "string") {
      return context.id === escapeContext;
    } else if (typeof escapeContext === "object") {
      let type = escapeContext.type;
      if (!type) throw new Error("escapeContext has insufficient information to determine which context to escape to");
      return context.info.type !== type;
    } else {
      throw new TypeError("Invalid escapeContext value ".concat(escapeContext));
    }
  }

  class SceneGraph {
    constructor() {
      /**
       * Mapping of <context id> -> <context info>, where contexts are specific subsets of the rendering sequence created
       * by certain groups that allow for operations to be applied to multiple elements. Example: a plot may create a
       * context to scissor element within its boundaries. The context info also contains rendering instructions for that
       * context (incl. buffers and such). The scene graph contains a lot of information!
       * @type {Map<string, {}>}
       */
      this.contextMap = new Map();
      this.id = getStringID();
      /**
       * The renderer this graph is attached to. Certain instructions don't need the renderer to be involved, so this
       * is optional allowing for static analysis of scenes detached from any specific renderer.
       * @type {WebGLRenderer|null}
       */

      this.renderer = null;
      /**
       * Resources used by this scene graph
       * @type {{}}
       */

      this.resources = {
        textures: {},
        buffers: {}
      };
    }

    destroyAll() {
      this.contextMap.clear();
    }
    /**
     * Construct a graph from scratch
     * @param scene
     * @returns {*}
     */


    constructFromScene(scene) {
      this.destroyAll();
      const contextMap = this.contextMap;
      let topContext = {
        parent: null,
        id: "top",
        info: {
          type: "top"
        },
        children: [],
        contextDepth: 0
      };
      contextMap.set("top", topContext);
      let currentContext = topContext;
      let contextDepth = 0;
      recursivelyBuild(scene); // Recurse through the scene elements, not yet handling zIndex and escapeContext

      function recursivelyBuild(elem) {
        let children = elem.children;
        let info = elem.getRenderingInfo();
        let instructions = info === null || info === void 0 ? void 0 : info.instructions;
        let contexts = info === null || info === void 0 ? void 0 : info.contexts;
        let initialContext = currentContext;

        if (contexts) {
          // Time to build contexts
          contexts = Array.isArray(contexts) ? contexts : [contexts];

          for (const c of contexts) {
            var _c$id, _c$zIndex;

            contextDepth++;
            let newContext = {
              type: "context",
              id: (_c$id = c.id) !== null && _c$id !== void 0 ? _c$id : elem.id + '-' + getVersionID(),
              parent: currentContext,
              children: [],
              info: c,
              zIndex: (_c$zIndex = c.zIndex) !== null && _c$zIndex !== void 0 ? _c$zIndex : 0,
              contextDepth,
              escapeContext: c.type === "escapeContext" ? c.escapeContext : null
            };
            contextMap.set(newContext.id, newContext);
            currentContext.children.push(newContext);
            currentContext = newContext;
          }
        }

        if (instructions) {
          instructions = Array.isArray(instructions) ? instructions : [instructions];
          currentContext.children.push({
            id: elem.id,
            instructions
          });
        }

        if (children) {
          let childrenLen = children.length;

          for (let i = 0; i < childrenLen; ++i) {
            recursivelyBuild(children[i]);
          }
        }

        currentContext = initialContext;
        contextDepth = currentContext.contextDepth;
      }

      return this;
    }

    computeInstructions() {
      // For each context compute a list of instructions that the renderer should run
      const {
        contextMap
      } = this;
      const contexts = Array.from(contextMap.values()).sort((a, b) => b.contextDepth - a.contextDepth);

      for (const c of contexts) {
        const children = c.children;
        const instructions = [];
        const escapingInstructions = []; // eventually, instructions will have the structure {child: id, instructions: [], zIndex: (number)}. zIndex of text
        // instructions is assumed to be Infinity and unspecified zIndex is 0. For now we'll just have a flat map

        for (const child of children) {
          if (child.children) {
            var _child$zIndex;

            // Is context
            let contextInstruction = {
              type: "context",
              id: child.id,
              zIndex: (_child$zIndex = child.zIndex) !== null && _child$zIndex !== void 0 ? _child$zIndex : 0,
              escapeContext: child.escapeContext
            };

            if (child.escapeContext) {
              escapingInstructions.push(contextInstruction);
            } else {
              instructions.push(contextInstruction); // Add escaped instructions

              for (const inst of child.escapingInstructions) {
                if (matchEscapeContext(c, inst.escapeContext)) instructions.push(inst);else escapingInstructions.push(inst);
              }
            }
          } else {
            for (const instruction of child.instructions) {
              let adj = adjustInstruction(instruction);

              if (adj.escapeContext) {
                escapingInstructions.push(adj);
              } else {
                instructions.push(adj);
              }
            }
          }
        }

        c.instructions = instructions;
        c.escapingInstructions = escapingInstructions;
      }

      for (const c of contextMap.values()) {
        c.instructions.sort((a, b) => a.zIndex - b.zIndex);
      }
    }
    /**
     * Execute a callback on each context of the scene graph
     * @param callback
     */


    forEachContext(callback) {
      for (const context of this.contextMap.values()) callback(context);
    }
    /**
     * Return an array of all text instructions, to be used to generate a text texture
     * @returns {Array}
     */


    getTextInstructions() {
      let ret = [];
      this.forEachContext(c => {
        const instructions = c.instructions;

        for (let i = instructions.length - 1; i >= 0; --i) {
          if (instructions[i].type === "text") ret.push(instructions[i]);
        }
      });
      return ret;
    }

    loadTextAtlas(img) {
      const renderer = this.renderer;
      const gl = renderer.gl;
      let name = "__" + this.id + "-text";
      let texture = renderer.getTexture(name);
      let needsInitialize = !texture;

      if (needsInitialize) {
        texture = renderer.createTexture(name);
      }

      gl.bindTexture(gl.TEXTURE_2D, texture);

      if (needsInitialize) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      this.resources.textAtlas = {
        id: name,
        width: img.width,
        height: img.height
      };
    }

    freeCompiledInstructions(inst) {
      if (!inst) return;

      for (const i of inst) {
        if (i.vao) {
          this.renderer.deleteVAO(i.vao);
        }

        if (i.buffers) {
          i.buffers.forEach(b => this.renderer.deleteBuffer(b));
        }
      }
    }

    compile() {
      // Convert context instructions into a series of renderable instructions, generating appropriate vertex arrays and
      // textures. Until this step, the scene graph is independent of the renderer.
      const renderer = this.renderer;
      if (!renderer) throw new Error("Compiling a scene graph requires the graph to be attached to a renderer.");
      const gl = renderer.gl;
      const textRenderer = renderer.textRenderer;
      const textInstructions = this.getTextInstructions();

      if (textInstructions.length !== 0) {
        textRenderer.drawText(textInstructions);
        this.loadTextAtlas(textRenderer.canvas);
      }

      this.forEachContext(context => {
        this.freeCompiledInstructions(context.compiledInstructions);
        const instructions = context.instructions;
        const compiledInstructions = [];

        switch (context.info.type) {
          case "scene":
          case "scissor":
            compiledInstructions.push(context.info);
            break;
        } // Super simple (and hella inefficient) for now


        for (const instruction of instructions) {
          switch (instruction.type) {
            case "context":
              compiledInstructions.push(instruction);
              break;

            case "polyline":
              {
                let vertices = convertTriangleStrip(instruction.vertices, instruction.pen);
                let color = instruction.pen.color;
                let buffName = context.id + '-' + getVersionID();
                let vaoName = context.id + '-' + getVersionID();
                let buff = renderer.createBuffer(buffName);
                let vao = renderer.createVAO(vaoName);
                gl.bindVertexArray(vao);
                gl.bindBuffer(gl.ARRAY_BUFFER, buff);
                gl.enableVertexAttribArray(0
                /* position buffer */
                );
                gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
                gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
                let compiled = {
                  type: "triangle_strip",
                  vao: vaoName,
                  buffers: [buffName],
                  vertexCount: vertices.length / 2,
                  color
                };
                compiledInstructions.push(compiled);
                break;
              }

            case "text":
              {
                let tcName = context.id + '-' + getVersionID();
                let scName = context.id + '-' + getVersionID();
                let vaoName = context.id + '-' + getVersionID();
                let textureCoords = renderer.createBuffer(tcName);
                let sceneCoords = renderer.createBuffer(scName);
                let vao = renderer.createVAO(vaoName);
                gl.bindVertexArray(vao);
                gl.bindBuffer(gl.ARRAY_BUFFER, sceneCoords);
                gl.enableVertexAttribArray(0
                /* position buffer */
                );
                gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
                let rect = getActualTextLocation(instruction.rect, instruction.pos);
                rect.x |= 0;
                rect.y |= 0;
                gl.bufferData(gl.ARRAY_BUFFER, generateRectangleTriangleStrip(rect), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, textureCoords);
                gl.enableVertexAttribArray(1
                /* texture coords buffer */
                );
                gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
                gl.bufferData(gl.ARRAY_BUFFER, generateRectangleTriangleStrip(instruction.rect), gl.STATIC_DRAW);
                let compiled = {
                  type: "text",
                  vao: vaoName,
                  buffers: [tcName, scName],
                  vertexCount: 4,
                  text: instruction.text
                };
                compiledInstructions.push(compiled);
                break;
              }

            case "triangle_strip":
              {
                let vertices = instruction.vertices;
                let color = instruction.color;
                let buffName = context.id + '-' + getVersionID();
                let vaoName = context.id + '-' + getVersionID();
                let buff = renderer.createBuffer(buffName);
                let vao = renderer.createVAO(vaoName);
                gl.bindVertexArray(vao);
                gl.bindBuffer(gl.ARRAY_BUFFER, buff);
                gl.enableVertexAttribArray(0
                /* position buffer */
                );
                gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
                gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
                let compiled = {
                  type: "triangle_strip",
                  vao: vaoName,
                  buffers: [buffName],
                  vertexCount: vertices.length / 2,
                  color
                };
                compiledInstructions.push(compiled);
                break;
              }

            case "debug":
              {
                let buffName = context.id + '-' + getVersionID();
                let vaoName = context.id + '-' + getVersionID();
                let buff = renderer.createBuffer(buffName);
                let vao = renderer.createVAO(vaoName);
                gl.bindVertexArray(vao);
                gl.bindBuffer(gl.ARRAY_BUFFER, buff);
                gl.enableVertexAttribArray(0
                /* position buffer */
                );
                gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
                let vertices;

                if (instruction.rect) {
                  let rect = BoundingBox.fromObj(instruction.rect);
                  if (!rect) throw new Error("Invalid rectangle debug instruction");
                  vertices = generateRectangleDebug(rect);
                } else {
                  throw new Error("Unrecognized debug instruction");
                }

                gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
                let compiled = {
                  type: "line_strip",
                  vao: vaoName,
                  buffers: [buffName],
                  vertexCount: vertices.length / 2,
                  color: Colors.RED
                };
                compiledInstructions.push(compiled);
                break;
              }

            default:
              throw new Error("Unsupported instruction type ".concat(instruction.type));
          }
        }

        gl.bindVertexArray(null);
        compiledInstructions.push({
          type: "pop_context"
        });
        context.compiledInstructions = compiledInstructions;
      });
    } // Yield a list of all compiled instructions


    forEachCompiledInstruction(callback, contextID = "top") {
      let ctx = this.contextMap.get(contextID);

      if (ctx.compiledInstructions) {
        for (const instruction of ctx.compiledInstructions) {
          if (instruction.type === "context") {
            this.forEachCompiledInstruction(callback, instruction.id);
          } else {
            callback(instruction);
          }
        }
      }
    }
    /**
     * Get pre-rendering info so the renderer knows what to expect. This includes, notably, text
     */


    getPreRenderingInfo() {}

    destroy() {
      this.forEachContext(c => this.freeCompiledInstructions(c.compiledInstructions));
    }

  }

  /**
   * Grapheme's renderer is going to be pretty monolithic, with a lot of interdependent moving parts. As such, I'm going
   * to keep it mostly contained within one class, perhaps with some helper classes. Doing so will also help eliminate
   * fluff and make optimization easy and expressive.
   *
   * On the surface, Grapheme's rendering sequence is simple: the renderer traverses through the scene, calls
   * getRenderingInfo() on every element, compiles a list of all the instructions (which look something like
   * "draw this set of triangles", "draw this text"), and runs them all, returning the final product. But if the rendering
   * pipeline were so simple, there would be little point in using WebGL at all. Why not just use Canvas2D? Why learn such
   * a ridiculous API? The name of the game is parallelism and optimization. Where WebGL excels at is low-level control
   * and rapid parallel computation. Its weaknesses are in a lack of intrinsic functions (lacking text, for example) and
   * high complexity and verbosity,
   *
   * Imagine we did indeed render a scene instruction by instruction. We come across a line, so we switch to the polyline
   * program, load in the vertices into a buffer, and drawArrays -- draw it to the canvas. We then come across a piece of
   * text. WebGL cannot render text, so we switch over to a Canvas2D context and draw a piece of text onto a blank canvas.
   * We then load the blank canvas as a texture into WebGL and switch to the text program, loading in a set of vertices
   * specifying where the text is, and calling drawArrays. We then come across a couple hundred polylines in a row. For
   * each polyline, we copy its data to the buffer and render it.
   *
   * This is madness. There are two serious problems here. One is that loading buffers and textures is slow, for various
   * reasons. Another is that parallelism is seriously lacking. We have to call drawArrays several hundred times for those
   * polylines, and each call has a large constant time overhead.
   *
   * The renderer thus has several difficult jobs: minimizing buffer and texture loading, and combining consecutive calls
   * into one large drawArrays call. Accomplishing these jobs (and a few more) requires somewhat intricate algorithms,
   * which should of course be designed to allow more esoteric draw calls -- for a Mandelbrot set, say -- to still be
   * handled with consistency. There is no perfect solution, but there are certainly gains to be made. As with the props
   * of Grapheme elements, the problem is made easier by high-level abstraction. The renderer should produce a comparable
   * result when optimized, compared to when every call is made individually. (They need not be exactly the same, for
   * reasons that will become apparent.)
   *
   * Even more annoying is that the WebGL context may suddenly crash and all its buffers and programs lost in the ether.
   * The renderer thus has to be able to handle such data loss without indefinitely screwing up the rendering process. So
   * I have my work cut out, but that's exciting.
   *
   * The current thinking is a z-index based system with heuristic reallocation of changing and unchanging buffers. Given
   * a list of elements and each element's instructions, we are allowed to rearrange the instructions under certain
   * conditions: 1. instructions are drawn in order of z-index and 2. specific instructions within a given z-index may
   * specify that they must be rendered in the order in which they appear in the instruction list. The latter condition
   * allows deterministic ordering of certain instructions on the same z-index, which is useful when that suborder does
   * matter (like when two instructions for a given element are intended to be one on top of the other). Otherwise, the
   * instructions may be freely rearranged and (importantly) combined into larger operations that look the same.
   *
   * Already, such a sorting system is very helpful. Text elements generally specify a z-index of Infinity, while
   * gridlines might specify a z-index of 0 to be behind most things, and a draggable point might have an index of 20. A
   * simple algorithm to render a static image is to sort by z-index, then within each z-index group triangle draw calls
   * with the same color together, and group text draw calls together. We then proceed to render each z-index's grouped
   * calls in order.
   *
   * For a static scene, such a rendering system would work great. But in a dynamic scene, constantly reoptimizing the
   * entire scene as a result of changing some inconsequential little geometry would be stupid. Ideally, changing a little
   * geometry would merely update a single buffer or subsection of a buffer. Yet some changes do require a complete re-
   * distribution of instructions; if the scene's size doubled, for example, and all the elements changed substantially.
   * We can certainly cache information from the previous rendering process of a scene, but what do we cache? How do we
   * ensure stability and few edge cases? How do we deal with context loss?
   *
   * The first step is to understand exactly what instructions are. *Anonymous* instructions have a type, some data, and
   * an element id (which element it originated from). *Normal* instructions have a type, some data, an element id, an
   * instruction id, and a version. The point of normal instructions is to represent a sort of "draw concept", where after
   * an update, that instruction may have changed slightly, but will still have the same id. The instruction associated
   * with a function plot, for example, will have some numerical ID, and when the plot changes somehow, the version will
   * increase, but the numerical ID will remain the same. Conceptually, this means that the instruction to draw the
   * function plot has been rewritten, and the old data is basically irrelevant -- and buffers associated with that
   * data can and should be reused or reallocated.
   *
   * Anonymous instructions, on the other hand, have no identical concept of "versioning". Anonymous instructions are
   * entirely reallocated or deleted every time their element updates. These instructions are generally used to indicate
   * instructions which are very prone to change and where its values should be tied solely to the element updating.
   */

  function createShaderFromSource(gl, shaderType, shaderSource) {
    const shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    const succeeded = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (succeeded) return shader;
    const err = new Error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    throw err;
  }

  function createGLProgram(gl, vertexShader, fragShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    const succeeded = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (succeeded) return program;
    const err = new Error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    throw err;
  }

  const MonochromaticGeometryProgram = {
    vert: "\nprecision highp float;\nattribute vec2 vertexPosition;\n// Transforms a vertex from pixel coordinates to clip space\nuniform vec2 xyScale;\nvec2 displacement = vec2(-1, 1);\n         \nvoid main() {\n   gl_Position = vec4(vertexPosition * xyScale + displacement, 0, 1);\n}",
    frag: "precision highp float;\nuniform vec4 color;\n        \nvoid main() {\n   gl_FragColor = color;\n}"
  };
  const TextProgram = {
    vert: "\nprecision highp float;\nattribute vec2 vertexPosition;\nattribute vec2 texCoords;\n        \nuniform vec2 xyScale;\nuniform vec2 textureSize;\n        \nvarying vec2 texCoord;\nvec2 displace = vec2(-1, 1);\n         \nvoid main() {\n  gl_Position = vec4(vertexPosition * xyScale + displace, 0, 1);\n  texCoord = texCoords / textureSize;\n}",
    frag: "\nprecision highp float;\n        \nuniform vec4 color;\nuniform sampler2D textAtlas;\n        \nvarying vec2 texCoord;\n        \nvoid main() {\n  gl_FragColor = texture2D(textAtlas, texCoord);\n}"
  };
  /**
   * Currently accepted draw calls:
   *
   * Triangle strip: { type: "triangle_strip", vertices: Float32Array, color: { r: (int), g: (int), b: (int), a: (int) } }
   * Debug: { type: "debug" }
   * Text: { type: "text", font: (string), x: (float), y: (float), color: { r: ... } }
   */

  class WebGLRenderer {
    constructor() {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2");
      /**
       * The main rendering buffer
       * @type {HTMLCanvasElement}
       */

      this.canvas = canvas;
      /**
       * The renderer's WebGL context. Assuming WebGL2 for now
       * @type {WebGLRenderingContext}
       */

      this.gl = gl;
      /**
       * Map between scene ids and known information about them
       * @type {Map<string, {}>}
       */

      this.sceneCaches = new Map();
      /**
       * A mapping between program names and valid programs. When the context is lost, this map is reset
       * @type {Map<string, { glProgram: WebGLProgram, attribs: {}, uniforms: {} }>}
       */

      this.programs = new Map();
      this.buffers = new Map();
      this.textures = new Map();
      this.vaos = new Map();
      this.textRenderer = new TextRenderer();
    }
    /**
     * Create and link a program and store it in the form { glProgram, attribs, uniforms }, where glProgram is the
     * underlying program and attribs and uniforms are a dictionary of attributes and uniforms from the program. The
     * attributes are given as an object, of manually assigned indices
     * @param programName {string}
     * @param vertexShaderSource {string}
     * @param fragShaderSource {string}
     * @param attributeBindings {{}}
     * @param uniformNames {string[]}
     * @return  {{glProgram: WebGLProgram, attribs: {}, uniforms: {}}} The program
     */


    createProgram(programName, vertexShaderSource, fragShaderSource, attributeBindings = {}, uniformNames = []) {
      this.deleteProgram(programName);
      const {
        gl
      } = this;
      const glProgram = createGLProgram(gl, createShaderFromSource(gl, gl.VERTEX_SHADER, vertexShaderSource), createShaderFromSource(gl, gl.FRAGMENT_SHADER, fragShaderSource));

      for (let name in attributeBindings) {
        let loc = attributeBindings[name];
        gl.bindAttribLocation(glProgram, loc, name);
      }

      const uniforms = {};

      for (const name of uniformNames) {
        uniforms[name] = gl.getUniformLocation(glProgram, name);
      }

      const program = {
        glProgram,
        attribs: attributeBindings,
        uniforms
      };
      this.programs.set(programName, program);
      return program;
    }
    /**
     * Get the program of a given name, returning undefined if it does not exist
     * @param programName {string}
     * @returns {{glProgram: WebGLProgram, attribs: {}, uniforms: {}}}
     */


    getProgram(programName) {
      return this.programs.get(programName);
    }
    /**
     * Delete a program, including the underlying GL program
     * @param programName {string}
     */


    deleteProgram(programName) {
      const program = this.getProgram(programName);

      if (program) {
        this.gl.deleteProgram(program.glProgram);
        this.programs.delete(programName);
      }
    }

    getTexture(textureName) {
      return this.textures.get(textureName);
    }

    deleteTexture(textureName) {
      let texture = this.getTexture(textureName);

      if (texture !== undefined) {
        this.gl.deleteTexture(this.getTexture(textureName));
        this.textures.delete(textureName);
      }
    }

    createTexture(textureName) {
      this.deleteTexture(textureName);
      const texture = this.gl.createTexture();
      this.textures.set(textureName, texture);
      return texture;
    }

    getBuffer(bufferName) {
      return this.buffers.get(bufferName);
    }

    createBuffer(bufferName) {
      let buffer = this.getBuffer(bufferName);

      if (!buffer) {
        buffer = this.gl.createBuffer();
        this.buffers.set(bufferName, buffer);
      }

      return buffer;
    }

    deleteBuffer(bufferName) {
      const buffer = this.getBuffer(bufferName);

      if (buffer !== undefined) {
        this.buffers.delete(bufferName);
        this.gl.deleteBuffer(buffer);
      }
    }

    getVAO(vaoName) {
      return this.vaos.get(vaoName);
    }

    createVAO(vaoName) {
      let vao = this.getVAO(vaoName);

      if (!vao) {
        vao = this.gl.createVertexArray();
        this.vaos.set(vaoName, vao);
      }

      return vao;
    }

    deleteVAO(vaoName) {
      const vao = this.getVAO(vaoName);

      if (vao !== undefined) {
        this.vaos.delete(vaoName);
        this.gl.deleteVertexArray(vao);
      }
    }

    monochromaticGeometryProgram() {
      let program = this.getProgram("__MonochromaticGeometry");

      if (!program) {
        const programDesc = MonochromaticGeometryProgram;
        program = this.createProgram("__MonochromaticGeometry", programDesc.vert, programDesc.frag, {
          vertexPosition: 0
        }, ['xyScale', 'color']);
      }

      return program;
    }

    textProgram() {
      let program = this.getProgram("__Text");

      if (!program) {
        const programDesc = TextProgram;
        program = this.createProgram("__Text", programDesc.vert, programDesc.frag, {
          vertexPosition: 0,
          texCoords: 1
        }, ["textureSize", "xyScale", "textAtlas", "color"]);
      }

      return program;
    }
    /**
     * Resize and clear the canvas, only clearing if the dimensions haven't changed, since the buffer will be erased.
     * @param width
     * @param height
     * @param dpr
     * @param clear {Color}
     */


    clearAndResizeCanvas(width, height, dpr = 1, clear = Colors.TRANSPARENT) {
      const {
        canvas
      } = this;
      this.dpr = dpr;
      width *= dpr;
      height *= dpr;

      if (canvas.width === width && canvas.height === height) {
        this.clearCanvas(clear);
      } else {
        canvas.width = width;
        canvas.height = height; // lol, use the given background color

        if (clear.r || clear.g || clear.b || clear.a) {
          this.clearCanvas(clear);
        }
      }

      this.gl.viewport(0, 0, width, height);
    }

    clearCanvas(clearColor) {
      const {
        gl
      } = this;
      gl.clearColor(clearColor.r / 255, clearColor.g / 255, clearColor.b / 255, clearColor.a / 255);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    getXYScale() {
      return [2 / this.canvas.width, -2 / this.canvas.height];
    }

    renderScene(scene, log = false) {
      scene.updateAll();
      const graph = new SceneGraph();
      graph.renderer = this;
      let startTime = performance.now();
      let globalStartTime = startTime;
      graph.constructFromScene(scene);
      let endTime = performance.now();
      if (log) console.log("Construction time: ".concat(endTime - startTime, "ms"));
      startTime = performance.now();
      graph.computeInstructions();
      endTime = performance.now();
      if (log) console.log("Instruction compute time: ".concat(endTime - startTime, "ms"));
      startTime = performance.now();
      graph.compile();
      endTime = performance.now();
      if (log) console.log("Instruction compile time: ".concat(endTime - startTime, "ms"));
      const {
        gl
      } = this;
      let scissorTest = false;
      let scissorBox = null; // Contains instructions for how to reset the state back to how it was before a context was entered

      const contexts = [];

      const setScissor = (enabled, box) => {
        scissorTest = enabled;
        scissorBox = box;

        if (enabled) {
          gl.enable(gl.SCISSOR_TEST);
        } else {
          gl.disable(gl.SCISSOR_TEST);
        }

        if (box) {
          // GL scissoring is from bottom left corner, not top left
          gl.scissor(box.x, this.canvas.height - box.y - box.h, box.w, box.h);
        }
      };

      startTime = performance.now();
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      graph.forEachCompiledInstruction(instruction => {
        let drawMode = 0;

        switch (instruction.type) {
          case "scene":
            {
              const {
                dims,
                backgroundColor
              } = instruction;
              this.clearAndResizeCanvas(dims.canvasWidth, dims.canvasHeight, dims.dpr, backgroundColor);
              contexts.push(null);
              break;
            }

          case "scissor":
            {
              contexts.push({
                type: "set_scissor",
                enable: scissorTest,
                scissor: scissorBox
              });
              setScissor(true, instruction.scissor);
              break;
            }

          case "text":
            {
              const program = this.textProgram();
              gl.useProgram(program.glProgram);
              gl.bindVertexArray(this.getVAO(instruction.vao));
              let {
                id: atlasID,
                width: atlasWidth,
                height: atlasHeight
              } = graph.resources.textAtlas;
              let texture = this.getTexture(atlasID);
              gl.activeTexture(gl.TEXTURE0);
              gl.bindTexture(gl.TEXTURE_2D, texture);
              gl.uniform1i(program.uniforms.textAtlas, 0);
              gl.uniform2f(program.uniforms.textureSize, atlasWidth, atlasHeight);
              gl.uniform2fv(program.uniforms.xyScale, this.getXYScale());
              gl.drawArrays(gl.TRIANGLE_STRIP, 0, instruction.vertexCount);
              break;
            }

          case "triangle_strip":
            // LOL
            drawMode++;

          case "triangles":
            drawMode++;

          case "line_strip":
            drawMode += 2;

          case "lines":
            drawMode++;
            {
              const program = this.monochromaticGeometryProgram();
              gl.useProgram(program.glProgram);
              gl.bindVertexArray(this.getVAO(instruction.vao));
              const color = instruction.color;
              gl.uniform4f(program.uniforms.color, color.r / 255, color.g / 255, color.b / 255, color.a / 255);
              gl.uniform2fv(program.uniforms.xyScale, this.getXYScale());
              gl.drawArrays(drawMode, 0, instruction.vertexCount);
              break;
            }

          case "pop_context":
            {
              const popped = contexts.pop();
              if (!popped) break;

              switch (popped.type) {
                case "set_scissor":
                  {
                    setScissor(popped.enabled, popped.scissor);
                    break;
                  }
              }

              break;
            }

          default:
            throw new Error("Unknown instruction type ".concat(instruction.type));
        }
      });
      endTime = performance.now();
      if (log) console.log("Render time: ".concat(endTime - globalStartTime, "ms"));
      graph.destroy();
    }

    renderDOMScene(scene) {
      this.renderScene(scene);
      createImageBitmap(this.canvas).then(bitmap => {
        scene.bitmapRenderer.transferFromImageBitmap(bitmap);
      });
    }

  }

  let textElementInterface = constructInterface({
    interface: {
      style: {
        description: "The style of the text.",
        setAs: "user",
        merge: true
      },
      position: {
        description: "The position of the text.",
        conversion: {
          type: "Vec2"
        },
        target: "pos"
      },
      text: {
        description: "The string of text.",
        typecheck: "string"
      }
    },
    internal: {
      pos: {
        type: "Vec2",
        computed: "none"
      },
      style: {
        type: "TextStyle",
        computed: "user",
        compose: true,
        default: TextStyle.default
      }
    }
  });
  class TextElement extends Element {
    getInterface() {
      return textElementInterface;
    }

    _update() {
      this.defaultComputeProps();
      this.internal.renderInfo = {
        instructions: {
          type: "text",
          text: this.props.get("text"),
          pos: this.props.get("pos"),
          style: this.props.get("style")
        }
      };
    }

  }

  // Sort of a test object for now so that I can figure out the rest of Grapheme's internals
  const pointCloudInterface = constructInterface({
    data: true,
    pointRadius: true,
    color: true
  });
  class PointCloudElement extends Element {
    init() {
      this.set({
        pointRadius: 4,
        color: Colors.BLUE
      });
    }

    getInterface() {
      return pointCloudInterface;
    }

    _update() {
      this.defaultInheritProps();
      const {
        data,
        pointRadius,
        color,
        plotTransform
      } = this.props.proxy;
      let circle = generateCircleTriangleStrip(pointRadius, 0, 0, 16);
      let vertices = new Float32Array(circle.length * data.length / 2);
      let {
        xm,
        ym,
        xb,
        yb
      } = plotTransform.getReducedGraphToPixelTransform();
      let verticesOffset = 0;

      for (let i = 0; i < data.length; i += 2) {
        let x = data[i],
            y = data[i + 1];
        x = xm * x + xb;
        y = ym * y + yb;

        for (let j = 0; j < circle.length; j += 2) {
          vertices[verticesOffset + j] = circle[j] + x;
          vertices[verticesOffset + j + 1] = circle[j + 1] + y;
        }

        verticesOffset += circle.length;
      }

      this.internal.renderInfo = {
        instructions: {
          type: "triangle_strip",
          vertices,
          color
        }
      };
    }

  }

  const polylineInterface = constructInterface({
    pen: {
      setAs: "user",
      setMerge: true,
      getAs: "real",
      description: "The pen used to draw the polyline."
    },
    vertices: {
      conversion: "f32_vec2_array",
      description: "The vertices of the polyline."
    }
  });
  class PolylineElement extends Element {
    _update() {
      const {
        props
      } = this;

      if (props.hasChanged("pen")) {
        let pen = Pen.compose(DefaultStyles.Pen, props.getUserValue("pen"));
        props.set("pen", pen);
      }
    }

    getInterface() {
      return polylineInterface;
    }

    getRenderingInfo() {
      let {
        vertices,
        pen
      } = this.props.proxy;
      if (!vertices || !pen) return;
      return {
        type: "polyline",
        vertices,
        pen
      };
    }

  }

  // Define general types of rounding modes for various mathematical operations over the reals
  const ROUNDING_MODE = Object.freeze({
    NEAREST: 0,
    // nearest neighbor, ties to even
    UP: 1,
    // always round positively
    DOWN: 2,
    TOWARD_INF: 3,
    // towards the extremes
    TOWARD_ZERO: 4,
    // towards zero
    TIES_AWAY: 5,
    // tie away from zero
    WHATEVER: 6,
    // do whatever's easiest
    TIES_EVEN: 0 // equivalent to NEAREST

  });
  function roundingModeToString(mode) {
    switch (mode) {
      case ROUNDING_MODE.NEAREST:
      case ROUNDING_MODE.TIES_EVEN:
        return "NEAREST";

      case ROUNDING_MODE.UP:
        return "UP";

      case ROUNDING_MODE.DOWN:
        return "DOWN";

      case ROUNDING_MODE.TOWARD_INF:
        return "TOWARD_INF";

      case ROUNDING_MODE.TOWARD_ZERO:
        return "TOWARD_ZERO";

      case ROUNDING_MODE.TIES_AWAY:
        return "TIES_AWAY";

      case ROUNDING_MODE.WHATEVER:
        return "WHATEVER";
    }
  }

  const BIGINT_WORD_BITS = 30;
  const BIGINT_WORD_PART_BITS = BIGINT_WORD_BITS / 2;
  const BIGINT_WORD_BIT_MASK = 0x3FFFFFFF; // get the last 30 bits of a given word (removing the two junk bits)

  const BIGINT_WORD_LOW_PART_BIT_MASK = 0x7FFF; // get the last 15 bits of a given word. Getting the high part is just >> 15

  const BIGINT_WORD_OVERFLOW_BIT_MASK = 0x40000000; // get the overflow bit of a given word (aka the 31st bit)

  const BIGINT_WORD_SIZE = 2 ** BIGINT_WORD_BITS;
  const BIGINT_WORD_MAX = BIGINT_WORD_SIZE - 1;
  /**
   * Return the number of bits a given word uses.
   */

  function wordBitCount(word) {
    return 32 - Math.clz32(word);
  }
  /**
   * Get the number of bits used by a given set of 30-bit words.
   * @param words
   * @param wordCount
   * @returns {*}
   */


  function getBitCount(words, wordCount) {
    let lastIndex = wordCount - 1;
    const lastWord = words[lastIndex];
    return wordBitCount(lastWord) + lastIndex * BIGINT_WORD_BITS;
  }

  function mulWords(word1, word2) {
    return mulAddWords(word1, word2, 0);
  } // Multiply and add three 30-bit words and return the low and high part of the result. (word1 * word2 + word3)

  function mulAddWords(word1, word2, word3) {
    let word1Lo = word1 & BIGINT_WORD_LOW_PART_BIT_MASK;
    let word2Lo = word2 & BIGINT_WORD_LOW_PART_BIT_MASK;
    let word1Hi = word1 >> BIGINT_WORD_PART_BITS;
    let word2Hi = word2 >> BIGINT_WORD_PART_BITS;
    let low = Math.imul(word1Lo, word2Lo),
        high = Math.imul(word1Hi, word2Hi);
    let middle = Math.imul(word2Lo, word1Hi) + Math.imul(word1Lo, word2Hi);
    low += ((middle & BIGINT_WORD_LOW_PART_BIT_MASK) << BIGINT_WORD_PART_BITS) + word3;
    low >>>= 0;

    if (low > BIGINT_WORD_OVERFLOW_BIT_MASK) {
      high += low >>> BIGINT_WORD_BITS;
      low &= BIGINT_WORD_BIT_MASK;
    }

    high += middle >> BIGINT_WORD_PART_BITS; // add the high part of middle

    return [low, high];
  }
  function multiplyBigInts(int1, int2) {
    if (int1.isZero() || int2.isZero()) return new BigInt(0);
    const {
      words: int1words,
      wordCount: int1wordCount,
      sign: int1sign
    } = int1;
    const {
      words: int2words,
      wordCount: int2wordCount,
      sign: int2sign
    } = int2;
    let end = int1wordCount + int2wordCount + 1;
    let out = new Int32Array(end); // Textbook multiplication, go through each word of int1 and multiply by each word of int2

    for (let int1wordIndex = 0; int1wordIndex < int1wordCount; ++int1wordIndex) {
      let word1 = int1words[int1wordIndex];
      let carry = 0;
      let word1Lo = word1 & BIGINT_WORD_LOW_PART_BIT_MASK;
      let word1Hi = word1 >> BIGINT_WORD_PART_BITS;

      for (let int2wordIndex = 0; int2wordIndex < end; ++int2wordIndex) {
        if (int2wordIndex >= int2wordCount && carry === 0) break;
        let word2 = int2wordIndex < int2wordCount ? int2words[int2wordIndex] : 0;
        let outIndex = int1wordIndex + int2wordIndex;
        let word2Lo = word2 & BIGINT_WORD_LOW_PART_BIT_MASK;
        let word2Hi = word2 >> BIGINT_WORD_PART_BITS;
        let low = Math.imul(word1Lo, word2Lo),
            high = Math.imul(word1Hi, word2Hi);
        let middle = Math.imul(word2Lo, word1Hi) + Math.imul(word1Lo, word2Hi);
        low += ((middle & BIGINT_WORD_LOW_PART_BIT_MASK) << BIGINT_WORD_PART_BITS) + carry + out[outIndex];
        low >>>= 0;

        if (low > BIGINT_WORD_OVERFLOW_BIT_MASK) {
          high += low >>> BIGINT_WORD_BITS;
          low &= BIGINT_WORD_BIT_MASK;
        }

        high += middle >> BIGINT_WORD_PART_BITS;
        out[outIndex] = low;
        carry = high;
      }
    }

    return new BigInt().initFromWords(out, int1sign * int2sign);
  }
  /**
   * Remove trailing zeroes from an array or typed array (returning a subarray in the latter case for efficiency)
   * @param array
   */

  function trimTrailingZeroes(array) {
    const isArray = Array.isArray(array);

    if (isArray || isTypedArray(array)) {
      let i = array.length - 1;

      for (; i >= 0; --i) {
        if (array[i] !== 0) break;
      }

      if (i === -1) return isArray ? [0] : new Int32Array(1);
      return isArray ? array.slice(0, i + 1) : array.subarray(0, i + 1);
    } else {
      throw new TypeError("trimTrailingZeroes only operates on Arrays and TypedArrays");
    }
  } // lol


  const NativeBigInt = 0n.constructor;
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

  class BigInt {
    constructor(arg1, arg2) {
      if (typeof arg1 === "number") {
        this.initFromNumber(arg1);
      } else if (typeof arg1 === "string") {
        this.initFromString(arg1, arg2);
      } else if (typeof arg1 === "bigint") {
        this.initFromNativeBigint(arg1);
      } else if (arg1 instanceof BigInt) {
        this.initFromBigint(arg1);
      }
    }
    /**
     * Add bigint with same sign in place
     * @param num {BigInt}
     * @returns {BigInt}
     * @private
     */


    _addSameSignInPlace(num) {
      if (num.isZero()) return this; // We'll need at most this many bits

      this.allocateBits(Math.max(num.bitCount(), this.bitCount()) + 1);
      const {
        words: otherWords,
        wordCount: otherWordCount
      } = num;
      const {
        words,
        wordCount
      } = this; // Add the other bigint's words to this one

      for (let i = 0; i < otherWordCount; ++i) {
        words[i] += otherWords[i];
      } // We need to check the words between [0, i] for carries


      let checkCarryCount = Math.min(otherWordCount, wordCount);
      let carry = 0,
          i = 0;

      for (; i < words.length; ++i) {
        let word = words[i] + carry; // Do carries

        if ((word & BIGINT_WORD_OVERFLOW_BIT_MASK) !== 0) {
          words[i] = word & BIGINT_WORD_BIT_MASK;
          carry = 1;
        } else {
          words[i] = word;
          carry = 0;
          if (i >= checkCarryCount) break;
        }
      } // Update word count


      this.wordCount = Math.max(i, wordCount, otherWordCount);
    }
    /**
     * Adds the number in place, IGNORING SIGN
     * @param num
     */


    _addNumberSameSignInPlace(num) {
      if (num === 0) return;

      if (num <= BIGINT_WORD_MAX) {
        // For small nums, we just add and carry. It's super similar to the longer case, but we have this for speed since
        // incrementing and such is a very common operation
        const {
          words,
          wordCount
        } = this;
        let carry = num,
            i = 0;

        for (; i < wordCount; ++i) {
          let word = words[i] + carry;

          if ((word & BIGINT_WORD_OVERFLOW_BIT_MASK) !== 0) {
            words[i] = word & BIGINT_WORD_BIT_MASK;
            carry = 1;
          } else {
            words[i] = word;
            carry = 0;
            break;
          }
        } // Happens when we increment from 2^30-1 to 2^30


        if (carry !== 0) {
          this.allocateWords(i + 1);
          this.words[i] = carry;
          this.wordCount = i + 1;
        }
      } else {
        this._addSameSignInPlace(new BigInt(num));
      }
    }
    /**
     * Subtracts the number in place, IGNORING SIGN
     * @param num
     */


    _subtractNumberSameSignInPlace(num) {
      if (num === 0) return this;

      if (num <= BIGINT_WORD_MAX) {
        const {
          words,
          wordCount
        } = this;

        if (wordCount === 1) {
          let firstWord = words[0];
          firstWord -= num;

          if (firstWord === 0) {
            this.sign = 0;
          } else if (firstWord < 0) {
            this.sign *= -1;
            firstWord = -firstWord;
          }

          words[0] = firstWord;
          return this;
        }

        let carry = num,
            i = 0;

        for (; i < wordCount; ++i) {
          let word = words[i] - carry;

          if (word < 0) {
            word = word + BIGINT_WORD_SIZE;
            words[i] = word;
            carry = 1;
          } else {
            words[i] = word;
            break;
          }
        } // Carry should never equal 1

      } else {
        this._subtractSameSignInPlace(new BigInt(num));
      }
    }

    _subtractSameSignInPlace(num) {
      if (num instanceof BigInt) {
        this.allocateBits(Math.max(this.bitCount(), num.bitCount()));
        let spaceship = this.magnitudeSpaceship(num); // -1 if we're less than num, 0 if equal, 1 if greater

        if (spaceship === 0) {
          this.setZero();
          return;
        }

        const {
          words,
          wordCount
        } = this;
        const {
          words: otherWords,
          wordCount: otherWordCount
        } = num;
        let maxCarryIndex = 0;

        if (spaceship === 1) {
          // If we're greater, just subtract from our words
          for (let i = 0; i < otherWordCount; ++i) {
            if ((words[i] -= otherWords[i]) < 0) {
              maxCarryIndex = i;
            }
          }
        } else {
          for (let i = 0; i < otherWordCount; ++i) {
            if ((words[i] = otherWords[i] - words[i]) < 0) {
              maxCarryIndex = i;
            }
          }
        }

        let wordsToExamine = Math.max(wordCount, otherWordCount);
        let carry = 0;

        for (let j = 0; j < wordsToExamine; ++j) {
          let word = words[j] - carry;

          if (word < 0) {
            word += BIGINT_WORD_SIZE;
            words[j] = word;
            carry = 1;
          } else {
            words[j] = word;
            carry = 0;
            if (j > maxCarryIndex) break;
          }
        }

        if (spaceship === -1) this.sign *= -1;
        this.recomputeWordCount();
      } else {
        this._subtractSameSignInPlace(new BigInt(num));
      }
    }

    addInPlace(num, flipSign = false) {
      if (typeof num === "number") {
        if (num === 0) return this;

        if (this.sign === 0) {
          this.initFromNumber(num);
          if (flipSign) this.sign *= -1;
          return this;
        }

        if (Math.sign(num) === this.sign !== flipSign) {
          this._addNumberSameSignInPlace(Math.abs(num));
        } else {
          this._subtractNumberSameSignInPlace(Math.abs(num));
        }
      } else if (num instanceof BigInt) {
        if (num.isZero()) return this;

        if (this.sign === 0) {
          this.initFromBigint(num);
          if (flipSign) this.sign *= -1;
          return this;
        }

        if (this.sign === num.sign !== flipSign) {
          this._addSameSignInPlace(num);
        } else {
          this._subtractSameSignInPlace(num);
        }
      } else {
        this.addInPlace(new BigInt(num), flipSign);
      }

      return this;
    }

    add(bigint) {
      return this.clone().addInPlace(bigint);
    }

    subtractInPlace(num) {
      // Call addInPlace(-num)
      return this.addInPlace(num, true);
    }

    subtract(bigint) {
      return this.clone().subtractInPlace(bigint);
    }
    /**
     * Increase the size of the backing Int32Array to allow bitCount bits to be stored
     * @param bitCount
     */


    allocateBits(bitCount) {
      this.allocateWords(Math.ceil(bitCount / BIGINT_WORD_BITS));
    }
    /**
     * Shrink to fit the least number of words this bigint needs
     */


    shrinkToFit() {
      if (this.wordCount === this.words.length) return;
      const newWords = new Int32Array(this.wordCount);
      newWords.set(this.words.subarray(0, this.wordCount));
      this.words = newWords;
    }
    /**
     * Increase the size of the backing Int32Array, copying over the contents from the previous one
     * @param wordCount
     */


    allocateWords(wordCount) {
      if (wordCount <= this.words.length) return;
      const newWords = new Int32Array(wordCount);
      newWords.set(this.words);
      this.words = newWords;
    }
    /**
     * Get the total number of bits used; in other words, the number of bits in the last word + the number of bits in all
     * the preceding words
     */


    bitCount() {
      return getBitCount(this.words, this.wordCount);
    }

    clone() {
      return new BigInt(this);
    }
    /**
     * Init from another Grapheme bigint
     * @param int
     */


    initFromBigint(int) {
      let {
        words,
        sign,
        wordCount
      } = int;
      this.words = new Int32Array(words.subarray(0, wordCount));
      this.sign = sign;
      this.wordCount = wordCount;
      return this;
    }

    equals(bigint) {
      return this._compare(bigint, true, true, true);
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


    _compare(bigint, lessThan = true, orEqual = false, onlyEqual = false) {
      if (bigint instanceof BigInt) {
        let sign = this.sign,
            otherSign = bigint.sign;
        if (sign < otherSign) return lessThan && !onlyEqual;
        if (sign > otherSign) return !lessThan && !onlyEqual;
        if (sign === 0) return orEqual;
        let bitcount = this.bitCount(),
            otherBitcount = bigint.bitCount();
        if (bitcount < otherBitcount) return sign === 1 === lessThan && !onlyEqual;
        if (bitcount > otherBitcount) return sign === 1 !== lessThan && !onlyEqual;
        let wordCount = this.wordCount,
            words = this.words,
            otherWords = bigint.words;

        for (let i = wordCount; i >= 0; --i) {
          let word = words[i],
              otherWord = otherWords[i];
          if (word > otherWord) return sign === 1 !== lessThan && !onlyEqual;
          if (word < otherWord) return sign === 1 === lessThan && !onlyEqual;
        }

        return orEqual;
      } else if (typeof bigint === "number") {
        if (!Number.isFinite(bigint)) return false;
        let sign = this.sign,
            otherSign = Math.sign(bigint);
        if (sign < otherSign) return lessThan && !onlyEqual;
        if (sign > otherSign) return !lessThan && !onlyEqual;
        if (sign === 0) return orEqual;
        bigint *= otherSign;

        if (bigint <= BIGINT_WORD_MAX) {
          if (this.wordCount > 1) return false;
          let diff = this.words[0] - bigint;
          if (diff > 0) return sign === 1 !== lessThan && !onlyEqual;
          if (diff < 0) return sign === 1 === lessThan && !onlyEqual;
          return orEqual;
        }

        let bitCount = this.bitCount();
        let givenBitCount = Math.log2(bigint) + 1; // Give some leniency in case of rounding errors (which shouldn't technically happen, but ehh I don't want to prove it)

        if (bitCount < Math.floor(givenBitCount) - 1) return sign === 1 === lessThan && !onlyEqual;else if (bitCount > Math.ceil(givenBitCount) + 1) return sign === 1 !== lessThan && !onlyEqual;
      } // Fallback for other types


      return this._compare(new BigInt(bigint), lessThan, orEqual, onlyEqual);
    }
    /**
     * Returns -1 if less than bigint2, 0 if equal, 1 if greater than, IGNORING THE SIGN
     * @param bigint {BigInt}
     * @returns {boolean|number|*}
     */


    magnitudeSpaceship(bigint) {
      let sign = this.sign,
          otherSign = bigint.sign;

      if (sign === 0) {
        return otherSign === 0 ? 0 : -1;
      } else if (otherSign === 0) {
        return sign === 0 ? 0 : 1;
      }

      let bitcount = this.bitCount(),
          otherBitcount = bigint.bitCount();
      if (bitcount < otherBitcount) return -1;
      if (bitcount > otherBitcount) return 1;
      let wordCount = this.wordCount,
          words = this.words,
          otherWords = bigint.words;

      for (let i = wordCount; i >= 0; --i) {
        let word = words[i],
            otherWord = otherWords[i];
        if (word > otherWord) return 1;
        if (word < otherWord) return -1;
      }

      return 0;
    }

    lessThan(bigint) {
      return this._compare(bigint, true, false);
    }

    lessThanOrEqual(bigint) {
      return this._compare(bigint, true, true);
    }

    greaterThan(bigint) {
      return this._compare(bigint, false, false);
    }

    greaterThanOrEqual(bigint) {
      return this._compare(bigint, false, true);
    }
    /**
     * Create Grapheme bigint from native bigint
     * @param int {bigint}
     */


    initFromNativeBigint(int) {
      // We basically just use repeated bit shifts to get all the words we want.
      let words = [];
      let sign = 1;

      if (int === 0n) {
        this.initZero();
        return;
      } else if (int < 0n) {
        sign = -1;
        int = -int;
      }

      const mask = NativeBigInt(BIGINT_WORD_BIT_MASK);
      const wordBits = NativeBigInt(BIGINT_WORD_BITS);

      while (int) {
        words.push(Number(int & mask));
        int >>= wordBits;
      }

      this.initFromWords(words, sign);
      return this;
    }
    /**
     * We construct words, wordCount and sign from a JS number. If val is NaN or ±Infinity, we throw an error. Profiling:
     * on 5/26/2021, got 0.00025 ms/iteration for random floats in [0, 1e6]. Also got 0.0016 ms/iteration for random floats
     * in [0, 1e200], which is more a reflection of the performance of leftShiftInPlace.
     * @param val
     */


    initFromNumber(val) {
      if (!Number.isFinite(val)) throw new RangeError("Numeric value passed to BigInt constructor must be finite");
      val = Math.trunc(val); // Guaranteed to be an integer

      const sign = Math.sign(val) + 0; // convert -0 to +0 :D

      val *= sign;

      if (val <= BIGINT_WORD_MAX) {
        // can initialize directly=
        this.initFromWords([val], sign);
        return;
      } // We now convert the number into the form [i, e] where i is an integer within the 2^53 range and e is an exponent.
      // The bit pattern of the number is thus
      //     1 0 1 0 0 0 1 0 1 0 0 1  0 0 0 0 0 0 0 0 0 0 0 0 0
      //     -----------------------  -------------------------
      //            integer i               e extra zeroes
      // Funnily enough, all integers are represented in this way, even if they aren't massive. But it is consistent.
      // Thus, we initialize with two words corresponding to the upper and lower halves of the 53-bit integer i, then
      // left shift the bits by the exponent e times.


      let [integer, exponent] = integerExp(val);
      this.initFromWords([integer % BIGINT_WORD_SIZE, Math.floor(integer / BIGINT_WORD_SIZE)], sign);
      this.leftShiftInPlace(exponent);
      return this;
    }

    initFromSingleWord(word, sign = 1) {
      this.words = new Int32Array([word]);
      this.sign = sign;
      this.wordCount = 1;
    }

    multiply(bigint) {
      return multiplyBigInts(this, bigint);
    }
    /**
     * TODO: optimize
     * @param str
     * @param radix
     */


    initFromString(str, radix = 10) {
      if (!Number.isInteger(radix) || radix < 2 || radix > 36) throw new RangeError("Radix must be an integer between 2 and 36");

      function throwInvalidDigitError(digit, index) {
        throw new RangeError("Invalid digit '".concat(String.fromCharCode(digit), "' in base-").concat(radix, " string at index ").concat(index));
      }

      const CHUNKING_EXPONENTS = [29, 536870912, 18, 387420489, 14, 268435456, 12, 244140625, 11, 362797056, 10, 282475249, 9, 134217728, 9, 387420489, 9, 1000000000, 8, 214358881, 8, 429981696, 8, 815730721, 7, 105413504, 7, 170859375, 7, 268435456, 7, 410338673, 7, 612220032, 7, 893871739, 6, 64000000, 6, 85766121, 6, 113379904, 6, 148035889, 6, 191102976, 6, 244140625, 6, 308915776, 6, 387420489, 6, 481890304, 6, 594823321, 6, 729000000, 6, 887503681, 5, 33554432, 5, 39135393, 5, 45435424, 5, 52521875, 5, 60466176];
      const CHUNKING_EXPONENT = CHUNKING_EXPONENTS[2 * radix - 4];
      const CHUNK_SIZE = CHUNKING_EXPONENTS[2 * radix - 3];
      this.setZero();
      let startIndex = 0;
      if (str[0] === '-') startIndex = 1;
      const digits = [];

      for (let i = startIndex; i < str.length; ++i) {
        let digit = str.charCodeAt(i); // 0x30 - 0; 0x39 - 9; 0x61 - a; 0x7a - z

        let val = 0;

        if (digit < 0x30 || digit > 0x7a) {
          throwInvalidDigitError(digit, i);
        } else if (digit <= 0x39) {
          val = digit - 0x30;
        } else if (digit >= 0x61) {
          val = digit - 0x61 + 10;
        } else {
          throwInvalidDigitError(digit, i);
        }

        if (val >= radix) throwInvalidDigitError(digit, i);
        digits.push(val);
      }

      this.allocateBits(Math.ceil(Math.log2(radix) * digits.length)); // Initial word

      let initialGroupSize = (digits.length - 1) % CHUNKING_EXPONENT + 1,
          i = 0,
          chunk = 0;

      for (; i < initialGroupSize; ++i) {
        chunk *= radix;
        chunk += digits[i];
      }

      this.addInPlace(chunk);

      for (let j = i; j < digits.length; j += CHUNKING_EXPONENT) {
        this.multiplyInPlace(CHUNK_SIZE);
        let chunk = 0,
            jEnd = j + CHUNKING_EXPONENT;

        for (let k = j; k < jEnd; ++k) {
          chunk *= radix;
          chunk += digits[k];
        }

        this.addInPlace(chunk);
      }

      this.recomputeWordCount();

      if (str[0] === '-') {
        this.sign = -1;
      } else if (this.isZero()) {
        this.sign = 0;
      } else {
        this.sign = 1;
      }
    }
    /**
     * Sign 0 is 0, sign 1 is 1, sign -1 is -1. There is no negative zero big int.
     * @param words
     * @param sign
     */


    initFromWords(words, sign = 1) {
      words = trimTrailingZeroes(words);
      this.words = new Int32Array(words);
      this.wordCount = words.length;
      this.sign = sign;
      return this;
    }

    initZero() {
      this.words = new Int32Array(1);
      this.wordCount = 1;
      this.sign = 0;
    }
    /**
     * Returns true if the big integer is zero.
     * @returns {boolean}
     */


    isZero() {
      return this.wordCount === 1 && this.words[0] === 0;
    }

    leftShiftInPlace(count) {
      count = count | 0;
      if (!Number.isInteger(count) || count < 0) throw new RangeError("Left shift count must be a nonnegative integer");
      if (count === 0) return; // Number of bits after shifting

      let newBitCount = this.bitCount() + count;
      this.allocateBits(newBitCount);
      let {
        words,
        wordCount
      } = this; // We split up the shift into a multiple of 30 shift and a normal shift.

      let shifts = count % BIGINT_WORD_BITS;
      let wordShifts = Math.floor(count / BIGINT_WORD_BITS);

      if (count >= BIGINT_WORD_BITS) {
        // We use copyWithin to shift the current words from [0, wordCount - 1] to [wordShifts, wordShifts + wordCount - 1]
        words.copyWithin(wordShifts, 0, wordCount); // Fill [0, wordShifts - 1] with 0s

        words.fill(0, 0, wordShifts);
        wordCount += wordShifts;
      }

      if (shifts !== 0) {
        // We now perform a smaller shift in which we iterate from [wordCount - 1] down to 0 and shift the current value of
        // the cell up by <shifts>. We know that shifts is less than 30. The algorithm here is to take the word value, right
        // shift it by (30 - shift value), and add that to the larger word. Then, shift the word value to the left by
        // (shift value), remove the extra 31st and 32nd bits with & 0x3FFFFFFF, and rewrite the word.
        let rightShift = BIGINT_WORD_BITS - shifts;

        for (let i = wordCount - 1; i >= wordShifts; --i) {
          let word = words[i];
          let carry = word >> rightShift;
          if (carry !== 0) words[i + 1] += carry;
          word <<= shifts;
          words[i] = word & BIGINT_WORD_BIT_MASK;
        }
      } // Should be reliable


      this.wordCount = Math.ceil(newBitCount / BIGINT_WORD_BITS);
    }
    /**
     * Multiply the bigint in place by a number or biginteger val. Hard to optimize it more than this, sadly. If only JS
     * had 64-bit multiplication... :(
     * @param val
     */


    multiplyInPlace(val) {
      if (typeof val === "number" && Math.abs(val) <= BIGINT_WORD_MAX) {
        if (val === 0) {
          this.setZero();
          return;
        }

        if (val === 1) return;
        if (val === -1) this.sign *= -1;
        this.allocateBits(wordBitCount(val) + this.bitCount());
        const {
          words,
          wordCount
        } = this;
        let word2Lo = val & BIGINT_WORD_LOW_PART_BIT_MASK;
        let word2Hi = val >> BIGINT_WORD_PART_BITS;
        let carry = 0;

        for (let i = 0; i < wordCount; ++i) {
          let word = words[i];
          let word1Lo = word & BIGINT_WORD_LOW_PART_BIT_MASK;
          let word1Hi = word >> BIGINT_WORD_PART_BITS;
          let low = Math.imul(word1Lo, word2Lo),
              high = Math.imul(word1Hi, word2Hi);
          let middle = Math.imul(word2Lo, word1Hi) + Math.imul(word1Lo, word2Hi);
          low += ((middle & BIGINT_WORD_LOW_PART_BIT_MASK) << BIGINT_WORD_PART_BITS) + carry;
          low >>>= 0;

          if (low > BIGINT_WORD_OVERFLOW_BIT_MASK) {
            high += low >>> BIGINT_WORD_BITS;
            low &= BIGINT_WORD_BIT_MASK;
          }

          high += middle >> BIGINT_WORD_PART_BITS; // add the high part of middle

          words[i] = low;
          carry = high;
        }

        if (carry !== 0) {
          words[wordCount] = carry;
          this.wordCount += 1;
        }

        this.sign *= Math.sign(val);
      } else if (val instanceof BigInt) {
        this.initFromBigint(multiplyBigInts(this, val));
      } else {
        this.multiplyInPlace(new BigInt(val));
      }
    }
    /**
     * Get the word count by starting at the end of the array, searching for 0s and setting the wordCount accordingly.
     */


    recomputeWordCount() {
      const {
        words
      } = this;

      for (let i = words.length - 1; i >= 0; --i) {
        if (words[i] !== 0) {
          this.wordCount = i + 1;
          return;
        }
      }

      this.wordCount = 1; // There is always at least one word, even if the bigint has value 0
    }

    rightShiftInPlace(count) {
      count = count | 0;
      if (!Number.isInteger(count) || count < 0) throw new RangeError("Right shift count must be a nonnegative integer");
      if (count === 0) return; // Number of bits after shifting

      let newBitCount = this.bitCount() - count;

      if (newBitCount <= 0) {
        this.setZero();
        return;
      }

      this.wordCount = Math.ceil(newBitCount / BIGINT_WORD_BITS);
    }

    setZero() {
      this.words = new Int32Array(1);
      this.wordCount = 1;
      this.sign = 0;
      return this;
    }

    toBigint() {
      // Not too hard, we just construct it from the words in order
      const {
        words
      } = this;
      let out = 0n;
      let wordBits = NativeBigInt(BIGINT_WORD_BITS);

      for (let i = this.wordCount - 1; i >= 0; --i) {
        out <<= wordBits;
        out += NativeBigInt(words[i]);
      }

      return out;
    }
    /**
     * Here, we abuse floats a little bit to get a quick expansion for large radixes, as is used for base-10 conversion
     * when we chunk the number into base 10^15. The concept is quite simple; we start with the highest word, add it,
     * multiply everything by 2^30, and repeat.
     * @param radix
     * @returns {number[]}
     */


    toLargeRadixInternal(radix) {
      radix = +radix;
      if (!Number.isInteger(radix) || radix <= 4294967296 || radix >= 4503599627370496) throw new RangeError("Base of radix conversion must be an integer between 4294967296 and 4503599627370496, inclusive.");
      const digitsOut = [0];
      const {
        words
      } = this;

      for (let wordIndex = words.length - 1; wordIndex >= 0; --wordIndex) {
        let carry = 0,
            i = 0;

        for (; i < digitsOut.length; ++i) {
          let digit = digitsOut[i] * BIGINT_WORD_SIZE; // Because we're working with floats, this operation is exact
          // The low part, before adding the carry; this is exact

          let remainder = digit % radix; // floor(digit / radix) is sus because the division might round up and thus be incorrect, so we nudge it
          // in the right direction. floor(x + 0.5) is slightly faster than round(x)

          let nextCarry = Math.floor((digit - remainder) / radix + 0.5); // Need to add the carry

          digit = remainder + carry; // If the digit has gone beyond the radix, we need to update the next carry

          if (digit >= radix) {
            nextCarry++;
            digit -= radix;
          }

          digitsOut[i] = digit;
          carry = nextCarry;
        }

        if (carry) digitsOut[i] = carry;
        let word = words[wordIndex];
        digitsOut[0] += word;
      } // Carry any remaining stuff


      let carry = 0,
          i = 0;

      for (; i < digitsOut.length; ++i) {
        digitsOut[i] += carry;

        if (digitsOut[i] >= radix) {
          carry = 1;
          digitsOut[i] -= radix;
        } else {
          carry = 0;
          break;
        }
      }

      if (carry) digitsOut[i] = carry;
      return digitsOut;
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


    toNumber(roundingMode) {
      // Example: 17 = 0b10001
      this.bitCount() - 1; // bitCount is 5, so the float will be of the form m * 2^4

      this.getWordsAtBit(0, 2);
      this.getWordAtBit(30);
    }

    toPow2RadixInternal(radix) {
      radix = +radix;
      if (radix === 1073741824) return this.words.subarray(0, this.wordCount);else return this.toRadixInternal(radix); // TODO
    }
    /**
     * Returns an array of integers corresponding to the digits in the expansion of a given radix. For example, converting
     * the BigInt corresponding to 5002 (20212021 base 3) to radix 3 will give [1, 2, 0, 2, 1, 2, 0, 2]. 0 gives an empty
     * array for all inputs. This function is relatively important to optimize, especially for radix=10, because it is
     * expensive but important. I will do some digging later, but currently it averages between 2 to 10 times slower than
     * native for some reason.
     * @param radix {number} Base for the conversion; should be an integer between 2 and 1125899906842600.
     */


    toRadixInternal(radix) {
      radix = +radix;
      if (!Number.isInteger(radix) || radix <= 1 || radix >= 1125899906842600) throw new RangeError("Base of radix conversion must be an integer between 2 and 1125899906842600, inclusive."); // We construct the output via decomposing the integer into a series of operations of either x * 2 or x + 1,
      // applying each to the digitsOut array. These operations correspond to the bits of the BigInt in reverse order.

      const digitsOut = [];
      const {
        words
      } = this; // Is the radix large enough for these optimizations

      let canMultiplyBy8 = radix >= 8;
      let canMultiplyBy4 = radix >= 4;

      function doMultiplications() {
        while (queuedMultiplications > 0) {
          if (queuedMultiplications > 2 && canMultiplyBy8) {
            let carry = 0,
                i = 0;

            for (; i < digitsOut.length; ++i) {
              let currentDigit = digitsOut[i];
              let newDigit = currentDigit * 8 + carry;

              if (newDigit < radix) {
                carry = 0;
              } else if (newDigit < 2 * radix) {
                carry = 1;
                newDigit -= radix;
              } else if (newDigit < 3 * radix) {
                carry = 2;
                newDigit -= 2 * radix;
              } else if (newDigit < 4 * radix) {
                carry = 3;
                newDigit -= 3 * radix;
              } else if (newDigit < 5 * radix) {
                carry = 4;
                newDigit -= 4 * radix;
              } else if (newDigit < 6 * radix) {
                carry = 5;
                newDigit -= 5 * radix;
              } else if (newDigit < 7 * radix) {
                carry = 6;
                newDigit -= 6 * radix;
              } else {
                carry = 7;
                newDigit -= 7 * radix;
              }

              digitsOut[i] = newDigit;
            }

            if (carry !== 0) digitsOut[i] = carry;
            queuedMultiplications -= 3;
          } else if (queuedMultiplications > 1 && canMultiplyBy4) {
            let carry = 0,
                i = 0;

            for (; i < digitsOut.length; ++i) {
              let currentDigit = digitsOut[i];
              let newDigit = currentDigit * 4 + carry;

              if (newDigit < radix) {
                carry = 0;
              } else if (newDigit < 2 * radix) {
                carry = 1;
                newDigit -= radix;
              } else if (newDigit < 3 * radix) {
                carry = 2;
                newDigit -= 2 * radix;
              } else {
                carry = 3;
                newDigit -= 3 * radix;
              }

              digitsOut[i] = newDigit;
            }

            if (carry !== 0) digitsOut[i] = carry;
            queuedMultiplications -= 2;
          } else {
            let carry = 0,
                i = 0;

            for (; i < digitsOut.length; ++i) {
              let currentDigit = digitsOut[i];
              let newDigit = currentDigit * 2 + carry;

              if (newDigit >= radix) {
                newDigit -= radix;
                carry = 1;
              } else {
                carry = 0;
              }

              digitsOut[i] = newDigit;
            }

            if (carry === 1) digitsOut[i] = 1;
            queuedMultiplications--;
          }
        }
      }

      let queuedMultiplications = 0; // For each word, starting at the most significant word...

      for (let wordIndex = words.length - 1; wordIndex >= 0; --wordIndex) {
        let word = words[wordIndex];

        for (let j = 0; j < BIGINT_WORD_BITS; ++j) {
          queuedMultiplications++;
          word <<= 1; // For each bit in the word, from most to least significant

          if ((word & BIGINT_WORD_OVERFLOW_BIT_MASK) !== 0) {
            // Run the queued multiplications
            doMultiplications();
            let carry = 1,
                i = 0;

            for (; i < digitsOut.length; ++i) {
              let currentDigit = digitsOut[i];
              let newDigit = currentDigit + carry;

              if (newDigit >= radix) {
                newDigit = newDigit - radix;
                carry = 1;
              } else {
                carry = 0;
              }

              digitsOut[i] = newDigit;
              if (carry === 0) break; // early exit condition
            }

            if (carry === 1) digitsOut[i] = 1;
          }
        }
      }

      doMultiplications();
      return digitsOut.length === 0 ? [0] : digitsOut;
    }
    /**
     * Convert this BigInt to a string with a base between 2 and 36, inclusive. Formatting options are included.
     * @param radix {number}
     * @returns {string}
     */


    toString(radix = 10) {
      // The algorithm is as follows: We calculate the digits of the integer in a base (radix)^n, where n is chosen so that
      // the base fits nicely into a JS number. We then go chunk by chunk and convert to string, then concatenate
      // everything into a single output
      if (!Number.isInteger(radix) || radix < 2 || radix > 36) throw new RangeError("Base of radix conversion must be an integer between 2 and 36, inclusive.");
      const CHUNKING_EXPONENTS = [50, 1125899906842624, 31, 617673396283947, 25, 1125899906842624, 21, 476837158203125, 19, 609359740010496, 17, 232630513987207, 16, 281474976710656, 15, 205891132094649, 15, 1000000000000000, // for example, we convert to base 10^15 instead of 10 first
      14, 379749833583241, 13, 106993205379072, 13, 302875106592253, 13, 793714773254144, 12, 129746337890625, 12, 281474976710656, 12, 582622237229761, 11, 64268410079232, 11, 116490258898219, 11, 204800000000000, 11, 350277500542221, 11, 584318301411328, 11, 952809757913927, 10, 63403380965376, 10, 95367431640625, 10, 141167095653376, 10, 205891132094649, 10, 296196766695424, 10, 420707233300201, 10, 590490000000000, 10, 819628286980801, 10, 1125899906842624, 9, 46411484401953, 9, 60716992766464, 9, 78815638671875, 9, 101559956668416];
      const CHUNK_EXPONENT = CHUNKING_EXPONENTS[2 * radix - 4];
      const digits = this.toLargeRadixInternal(CHUNKING_EXPONENTS[2 * radix - 3]);
      let out = (this.sign < 0 ? '-' : '') + digits[digits.length - 1].toString(radix);

      for (let i = digits.length - 2; i >= 0; --i) {
        out += leftZeroPad(digits[i].toString(radix), CHUNK_EXPONENT, '0');
      }

      return out;
    }

  }

  const BIGFLOAT_WORD_BITS = 30;
  const BIGFLOAT_WORD_SIZE = 1 << BIGFLOAT_WORD_BITS;
  const BIGFLOAT_WORD_MAX = BIGFLOAT_WORD_SIZE - 1; // Kinda arbitrary, but whatever

  const BIGFLOAT_MIN_PRECISION_BITS = 4;
  const BIGFLOAT_MAX_PRECISION_BITS = 1 << 24;
  let CURRENT_PRECISION = 53;
  let CURRENT_ROUNDING_MODE = ROUNDING_MODE.NEAREST;
  /**
   * The minimum number of words needed to store a mantissa with prec bits. The +1 is because the bits need to be stored
   * at any shift within the word, from 1 to 29, so some space may be needed. WELL TESTED
   * @param prec {number}
   * @returns {number}
   */

  function neededWordsForPrecision(prec) {
    return (prec - 1) / BIGFLOAT_WORD_BITS + 2 | 0;
  }
  /**
   * Get an empty mantissa able to store a mantissa with prec bits. WELL TESTED
   * @param prec
   * @returns {Int32Array}
   */

  function createMantissa(prec) {
    return new Int32Array(neededWordsForPrecision(prec));
  }
  /**
   * Given a subarray of a mantissa, return 0 if infinite zeros; 1 if between 0 and 0.5; 2 if a tie; 3 if between a tie and 1
   * @param mantissa {Int32Array}
   * @param index {number}
   * @returns {number}
   */


  function getTrailingInfo(mantissa, index) {
    let mantissaLen = mantissa.length;

    if (index >= 0) {
      if (index < mantissaLen) {
        if (mantissa[index] === 1 << 29) {
          // Potential tie
          for (let i = index + 1; i < mantissaLen; ++i) {
            if (mantissa[i] !== 0) return 3;
          }

          return 2;
        } else if (mantissa[index] > 1 << 29) {
          return 3;
        }
      } else return 0;
    } else index = 0;

    for (let i = index; i < mantissa.length; ++i) {
      if (mantissa[i] !== 0) return 1;
    }

    return 0;
  }
  /**
   * Count the number of leading zeros in a mantissa, including invalid mantissas in which the first word is not 0.
   * Returns -1 if the mantissa is all zeros.
   * @param mantissa {Int32Array}
   * @returns {number}
   */

  function clzMantissa(mantissa) {
    let mantissaLen = mantissa.length;

    for (let i = 0; i < mantissaLen; ++i) {
      if (mantissa[i]) {
        return Math.clz32(mantissa[i]) - 2 + 30 * i;
      }
    }

    return -1;
  }

  function setGlobalRoundingMode(roundingMode) {
    CURRENT_ROUNDING_MODE = roundingMode;
  }
  function setGlobalPrecision(precision) {
    CURRENT_PRECISION = precision;
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

  function roundMantissaToPrecision(mant, prec, target, round = CURRENT_ROUNDING_MODE, trailing = 0, trailingMode = 0) {
    let isAliased = mant === target;
    let mantLen = mant.length;

    if (round === ROUNDING_MODE.WHATEVER) {
      if (mant[0] === 0) {
        // Shifting needs to be done
        let shift = 0;

        for (let i = 1; i < mantLen; ++i) {
          if (mant[i]) {
            shift = i;
            break;
          }
        }

        leftShiftMantissa(mant, shift * 30, target);
        return -shift;
      }

      if (isAliased) return 0; // Copy over the mantissa without rounding

      for (let i = target.length - 1; i >= 0; --i) {
        target[i] = mant[i];
      }

      return 0;
    }

    let targetLen = target.length;
    let offset = -1,
        shift = 0,
        bitShift = 0; // How many ghost bits there are at the beginning; in other words, where to start counting precision bits from.
    // Specialized impl of clzMantissa

    for (let i = 0; i < mantLen; ++i) {
      if (mant[i]) {
        bitShift = 30 * i;
        offset = bitShift + Math.clz32(mant[i]) - 2;
        shift = -i | 0;
        break;
      }
    }

    if (offset === -1) {
      // Mantissa is all 0s, return
      for (let i = 0; i < targetLen; ++i) {
        target[i] = 0;
      }

      return shift;
    } // Copy over the given mantissa, shifted by shift


    leftShiftMantissa(mant, bitShift, target);
    offset -= bitShift; // Which bit to start truncating at, indexing from 0 = the beginning of the mantissa

    let trunc = prec + offset;
    let truncWord = trunc / BIGFLOAT_WORD_BITS | 0; // Number of bits to truncate off the word, a number between 1 and 30 inclusive

    let truncateLen = BIGFLOAT_WORD_BITS - (trunc - truncWord * BIGFLOAT_WORD_BITS); // Remainder of the truncation and whether to do a carry after the truncation (rounding up)

    let rem = 0,
        doCarry = false; // If the truncation would happen after the end of the mantissa...

    if (truncWord >= mantLen + shift) {
      // Whether the truncation bit is on the (nonexistent) word right after the mantissa
      let isAtVeryEnd = truncWord === mantLen + shift && truncateLen === BIGFLOAT_WORD_BITS; // Fake a trailing info after the end. Our general strategy with trailingInfoMode = 1 is to convert it into a form
      // that trailingInfoMode = 0 can handle

      if (!isAtVeryEnd && trailingMode === 1 && trailing > 0) {
        // Any positive trailing info that isn't at the very end turns into a trailing info between 0 and 0.5 at the end
        trailing = 1;
        isAtVeryEnd = true;
      } // If rounding at the very end, what we do depends directly on the trailingInfo. To avoid complicating matters, we
      // "fake" the tie and round up cases so that the code doesn't have to be duplicated--especially the tie code, which
      // is slightly intricate


      if (isAtVeryEnd) {
        if (trailing === 0 || round === ROUNDING_MODE.DOWN || round === ROUNDING_MODE.TOWARD_ZERO || trailing === 1 && (round === ROUNDING_MODE.TIES_AWAY || round === ROUNDING_MODE.TIES_EVEN)) {
          return shift;
        } else if (trailing === 2 && (round === ROUNDING_MODE.TIES_AWAY || round === ROUNDING_MODE.TIES_EVEN)) {
          rem = 0x20000000; // emulate tie = BIGFLOAT_WORD_SIZE / 2
        } else {
          rem = 0x30000000; // emulate round up = 3 * BIGFLOAT_WORD_SIZE / 4
        }
      } else {
        // Otherwise, if the rounding is happening after the very end, nothing happens since it's already all 0s
        return shift;
      }
    } else {
      // Truncate the word
      let word = target[truncWord];
      let truncatedWord = word >> truncateLen << truncateLen;
      target[truncWord] = truncatedWord; // Store the remainder, aka what was just truncated off

      if (trailingMode === 0) {
        rem = word - truncatedWord;
      } else {
        // When in info mode 1, we fake a remainder and trailing info that corresponds to the correct rounding mode.
        // 0 -> (0, 0), 1 (between 0 and 0.5) -> (0, positive), 2 -> (tie, 0), 3 -> (tie, (between 0 and 0.5))
        rem = trailing < 2 ? 0 : 1 << truncateLen - 1;
        trailing &= 1;
      }
    } // Determine whether to round up instead of truncating. Rounding up entails adding a 1 bit right where the mantissa
    // was truncated. For example, if we just truncated 011010110|1000, and our rounding mode is, say, TIES_AWAY, then we
    // determine that we have to round up and add 1 to the end: 01101011[1]. We call this a carry because it could
    // carry down the word in the right circumstances.


    doCarry: if (round === ROUNDING_MODE.UP || round === ROUNDING_MODE.TOWARD_INF) {
      // If we're rounding up, we carry if and only if the remainder is positive or there is a nonzero word after the
      // truncated word. If in info mode 1 we treat all the numbers following as 0 anyway, since that information is
      // contained within rem and trailingInfo
      if (rem > 0 || trailing > 0) {
        doCarry = true;
      } else if (trailingMode === 0) {
        for (let i = truncWord - shift + 1; i < mantLen; ++i) {
          if (mant[i] !== 0) {
            doCarry = true;
            break;
          }
        }
      }
    } else if (round === ROUNDING_MODE.NEAREST || round === ROUNDING_MODE.TIES_AWAY) {
      // Truncated amounts less than this mean round down; more means round up; equals means needs to check whether the
      // rest of the limbs are 0, then break the tie
      let splitPoint = 1 << truncateLen - 1;

      if (rem > splitPoint) {
        doCarry = true;
      } else if (rem === splitPoint) {
        if (trailing > 0) {
          doCarry = true;
        } else {
          if (trailingMode === 0) {
            // Try to break the tie by looking for nonzero bits
            for (let i = truncWord - shift + 1; i < mantLen; ++i) {
              if (mant[i] !== 0) {
                doCarry = true;
                break doCarry;
              }
            }
          } // Need to break the tie


          if (round === ROUNDING_MODE.TIES_EVEN) {
            // We only do the carry if it would give an even bit at the end. To do this we query for the bit which will be
            // affected (the truncateLen th bit). If the bit is 1, we do the carry. If truncateLen is 30 then we have to look
            // at the preceding word for the bit, since we truncated *at* a word
            let bit = truncateLen === BIGFLOAT_WORD_BITS ? target[truncWord - 1] & 1 : target[truncWord] >> truncateLen & 1;
            if (bit) doCarry = true;
          } else {
            // Ties away from zero; always carry
            doCarry = true;
          }
        }
      }
    } // Set all the words following the truncated word to 0


    for (let j = truncWord; ++j < targetLen;) {
      target[j] = 0;
    } // The carry value is returned indicating whether the mantissa has "overflowed" due to rounding


    let carry = 0;

    if (doCarry) {
      // Carry amount. Note that in the case of truncateLen = 30 we add 1 << 30 to a word, then immediately subtract
      // 2^30 and carry it to the next word, so everything works out
      carry = 1 << truncateLen;

      for (let j = truncWord; j >= 0; --j) {
        let word = target[j] + carry;

        if (word > BIGFLOAT_WORD_MAX) {
          word -= BIGFLOAT_WORD_SIZE;
          target[j] = word;
          carry = 1;
        } else {
          target[j] = word;
          carry = 0;
          break; // can immediately break
        }
      }
    }

    if (carry === 1) {
      // We carried the whole way and still have a 1, meaning the mantissa is now full of zeros and we need to shift by
      // one word and set the first word to a 1
      target[0] = 1;
      return shift + 1;
    }

    return shift;
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

  function addMantissas(mant1, mant2, mant2Shift, prec, target, round = CURRENT_ROUNDING_MODE) {
    let isAliased = mant1 === target;
    let mant1Len = mant1.length,
        mant2Len = mant2.length,
        mant2End = mant2Len + mant2Shift;
    let newMantLen = target.length;
    let newMant = target; // Need to compute to higher precision first

    if (mant1Len > newMantLen) {
      newMantLen = Math.max(mant1Len, neededWordsForPrecision(prec));
      newMant = new Int32Array(newMantLen);
    } // We first sum all the parts of the addition we definitely need:


    if (!isAliased) {
      for (let i = 0; i < mant1Len; ++i) {
        newMant[i] = mant1[i];
      }

      for (let i = mant1Len; i < newMantLen; ++i) {
        newMant[i] = 0;
      }
    }

    let mant2Bound1 = Math.min(mant2End, newMantLen);

    for (let i = mant2Shift; i < mant2Bound1; ++i) {
      newMant[i] += mant2[i - mant2Shift];
    } // Do the carry


    let carry = 0;

    for (let i = mant1Len - 1; i >= 0; --i) {
      let word = newMant[i] + carry;

      if (word > 0x3fffffff) {
        word -= 0x40000000;
        newMant[i] = word;
        carry = 1;
      } else {
        newMant[i] = word;
        carry = 0;
      }
    } // All that remains are the words of mant2 to the right of newMantLen - mant2Shift


    let trailingInfo = 0;
    let needsTrailingInfo = round === ROUNDING_MODE.TIES_AWAY || round === ROUNDING_MODE.UP || round === ROUNDING_MODE.TOWARD_INF || round === ROUNDING_MODE.NEAREST;

    if (needsTrailingInfo) {
      let trailingShift = newMantLen - mant2Shift;
      trailingInfo = getTrailingInfo(mant2, Math.max(trailingShift, 0));
      if (trailingShift < 0) trailingInfo = +!!trailingInfo; // Lol, if the trailing info is shifted, then round it to 0 or 1 as appropriate
    }

    let shift = 0;

    if (carry) {
      // Get trailing info from beyond the end of the truncation due to right shifting LOL
      if (needsTrailingInfo) {
        let lastWord = newMant[newMant.length - 1];

        if (lastWord === 0) {
          trailingInfo = +!!trailingInfo;
        } else if (lastWord < 0x20000000) {
          trailingInfo = 1;
        } else if (lastWord === 0x20000000) {
          trailingInfo = trailingInfo ? 3 : 2;
        } else {
          trailingInfo = 3;
        }
      }

      rightShiftMantissa(newMant, 30);
      newMant[0] = 1;
      shift += 1;
    }

    let roundingShift = roundMantissaToPrecision(newMant, prec, target, round, trailingInfo);
    return roundingShift + shift;
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

  function canMantissaBeRounded(mantissa, precision, round, maxNeg, maxPos) {
    if (maxNeg === 0 && maxPos === 0) return true;
    let zeros = clzMantissa(mantissa);
    let endOfPrec = zeros + precision;
    let endWord = endOfPrec / 30 | 0;

    if (endWord >= mantissa.length) {
      return false;
    }

    let truncateLen = BIGFLOAT_WORD_BITS - (endOfPrec - endWord * BIGFLOAT_WORD_BITS);
    let truncatedWord = mantissa[endWord] >> truncateLen << truncateLen;
    let rem = mantissa[endWord] - truncatedWord;

    if (round === ROUNDING_MODE.WHATEVER) {
      // We use a tighter bound (truncateLen - 2) because subtracting may require an extra bit of precision
      let lower = truncateLen === 1 ? 0 : 1 << truncateLen - 2;
      let higher = 1 << truncateLen - 1;

      if (rem - maxNeg < lower) {
        return false;
      } else if (rem + maxPos > higher) {
        return false;
      }

      return true;
    }

    return false;
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

  function subtractMantissas(mant1, mant2, mant2Shift, prec, target, round = CURRENT_ROUNDING_MODE) {
    // Important length variables
    mant1.length;
        mant2.length;
    let targetLen = target.length; // New strategy; we iteratively compute words of the result until we get to the end of target, at which point we do
    // the carry. If the result has any leading zeros, shift left and continue computing words; if not, return if in
    // rounding mode: whatever, and if in a different rounding mode, compute whether a delta of -1 on the last word would
    // change the result. If it won't, round and return. If it will, compute words after the target until a carry and
    // trailing value are determined, which is a rather finnicky process that hopefully the fuzzer will help with
    // shift of the target relative to mant1

    let shift = 0; // shift of the current uncomputed word relative to mant1

    let writeShift = 0;
    let carry = 0;

    while (1) {
      // Compute the words of target
      let i = writeShift;

      for (; i < targetLen + shift; ++i) {
        let word1 = mant1[i] | 0;
        let word2 = mant2[i - mant2Shift] | 0;
        target[i - shift] = word1 - word2;
      }

      writeShift = i;

      for (let i = targetLen - 1; i >= 0; --i) {
        let word = target[i] | 0;

        if (carry) {
          word -= carry;
          target[i] = word;
        }

        if (word < 0) {
          target[i] += 0x40000000;
          carry = 1;
        } else {
          carry = 0;
        }
      }

      if (target[0] === 0) {
        let i = 0;

        for (; !target[i] && i < targetLen; ++i);

        leftShiftMantissa(target, 30 * i, target);
        shift += i;
        break;
      } else {
        if (round === ROUNDING_MODE.WHATEVER) break;
        let canBeRounded = canMantissaBeRounded(target, prec, round, 2, 0);
        if (canBeRounded) break; // TODO

        break; // Considering the words >= writeShift, we have 7 possibilities: less than -0x20000000, =-0x20000000, between
        // that and 0, 0 itself, between 0 and 0x20000000, 0x20000000, and greater than that. Negative results require
        // a negative carry
      }
    }

    return roundMantissaToPrecision(target, prec, target, round) - shift;
  }
  /**
   * Right shift a mantissa by shift bits, destroying any bits that trail off the end. This function supports aliasing.
   * @param mantissa {Int32Array}
   * @param shift {number}
   * @param targetMantissa
   * @returns {Int32Array} Returns the passed mantissa
   */

  function rightShiftMantissa(mantissa, shift, targetMantissa = mantissa) {
    if (shift === 0) return mantissa;
    let mantissaLen = mantissa.length;
    let targetMantissaLen = targetMantissa.length;
    let integerShift = shift / 30 | 0;
    let bitShift = shift % 30;

    if (bitShift === 0) {
      let lastFilledIndex = Math.min(mantissaLen - 1, targetMantissaLen - integerShift - 1); // Since it's a multiple of 30, we just copy everything over

      for (let i = lastFilledIndex; i >= 0; --i) {
        targetMantissa[i + integerShift] = mantissa[i];
      } // Fill empty stuff with zeros


      for (let i = 0; i < integerShift; ++i) targetMantissa[i] = 0;

      for (let i = lastFilledIndex + integerShift + 1; i < targetMantissaLen; ++i) targetMantissa[i] = 0;
    } else {
      let invBitShift = 30 - bitShift;
      let firstNeededIndex = mantissaLen - integerShift - 1;
      let lastFilledIndex = firstNeededIndex + integerShift + 1;
      targetMantissa[lastFilledIndex] = 0;

      for (let i = firstNeededIndex; i >= 0; --i) {
        let word = mantissa[i]; // Two components from each word

        if (i !== firstNeededIndex) targetMantissa[i + integerShift + 1] += (word & (1 << bitShift) - 1) << invBitShift;
        targetMantissa[i + integerShift] = word >> bitShift;
      }

      for (let i = 0; i < integerShift; ++i) targetMantissa[i] = 0;

      for (let i = lastFilledIndex; i < targetMantissaLen; ++i) targetMantissa[i] = 0;
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

  function leftShiftMantissa(mantissa, shift, targetMantissa = mantissa) {
    if (shift === 0) {
      if (targetMantissa !== mantissa) {
        let targetMantissaLen = targetMantissa.length;
        let copyLen = Math.min(targetMantissaLen, mantissa.length);

        for (let i = copyLen; i >= 0; --i) {
          targetMantissa[i] = mantissa[i];
        }

        for (let i = targetMantissaLen - 1; i > copyLen; --i) {
          targetMantissa[i] = 0;
        }
      }

      return mantissa;
    }

    let mantissaLen = mantissa.length;
    let targetMantissaLen = targetMantissa.length;
    let integerShift = shift / 30 | 0;
    let bitShift = shift % 30;

    if (bitShift === 0) {
      // Since it's a multiple of 30, we just copy everything over
      for (let i = integerShift; i < mantissaLen; ++i) {
        targetMantissa[i - integerShift] = mantissa[i];
      } // Fill empty stuff with zeros


      for (let i = mantissaLen - integerShift; i < targetMantissaLen; ++i) {
        targetMantissa[i] = 0;
      }
    } else {
      let invBitShift = 30 - bitShift;

      for (let i = integerShift; i < mantissaLen; ++i) {
        targetMantissa[i - integerShift] = (mantissa[i] << bitShift & 0x3fffffff) + (i < mantissaLen - 1 ? mantissa[i + 1] >> invBitShift : 0);
      }

      for (let i = mantissaLen - integerShift; i < targetMantissaLen; ++i) {
        targetMantissa[i] = 0;
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

  function multiplyMantissaByInteger(mantissa, int, precision, targetMantissa, roundingMode = CURRENT_ROUNDING_MODE) {
    let newMantissa = new Int32Array(neededWordsForPrecision(precision) + 1); // extra word for overflow
    // Decompose the given integer into two 15-bit words for the multiplication

    let word1Lo = int & 0x7FFF;
    let word1Hi = int >> 15;
    let carry = 0;

    for (let i = mantissa.length - 1; i >= 0; --i) {
      // Multiply the word, storing the low part and tracking the high part
      let word = mantissa[i];
      let word2Lo = word & 0x7FFF;
      let word2Hi = word >> 15;
      let low = Math.imul(word1Lo, word2Lo),
          high = Math.imul(word1Hi, word2Hi);
      let middle = Math.imul(word2Lo, word1Hi) + Math.imul(word1Lo, word2Hi);
      low += ((middle & 0x7FFF) << 15) + carry;

      if (low > 0x3FFFFFFF) {
        high += low >> 30;
        low &= 0x3FFFFFFF;
      }

      high += middle >> 15;
      newMantissa[i + 1] = low;
      carry = high;
    }

    newMantissa[0] = carry;
    let shift = 1;

    if (carry === 0) {
      // Shift left; there was no carry after all
      for (let i = 0; i < newMantissa.length - 1; ++i) {
        newMantissa[i] = newMantissa[i + 1];
      }

      newMantissa[newMantissa.length - 1] = 0;
      shift -= 1;
    }

    let roundingShift = roundMantissaToPrecision(newMantissa, precision, targetMantissa, roundingMode);
    return shift + roundingShift;
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

  function multiplyMantissas(mant1, mant2, precision, targetMantissa, roundingMode = CURRENT_ROUNDING_MODE) {
    let arr = new Int32Array(mant1.length + mant2.length + 1); // Will definitely optimise later

    for (let i = mant1.length; i >= 0; --i) {
      let mant1Word = mant1[i] | 0;
      let mant1WordLo = mant1Word & 0x7FFF;
      let mant1WordHi = mant1Word >> 15;
      let carry = 0,
          j = mant2.length - 1;

      for (; j >= 0; --j) {
        let mant2Word = mant2[j] | 0;
        let mant2WordLo = mant2Word & 0x7FFF;
        let mant2WordHi = mant2Word >> 15;
        let low = Math.imul(mant1WordLo, mant2WordLo),
            high = Math.imul(mant1WordHi, mant2WordHi);
        let middle = Math.imul(mant2WordLo, mant1WordHi) + Math.imul(mant1WordLo, mant2WordHi) | 0;
        low += ((middle & 0x7FFF) << 15) + carry + arr[i + j + 1];
        low >>>= 0;

        if (low > 0x3FFFFFFF) {
          high += low >>> 30;
          low &= 0x3FFFFFFF;
        }

        high += middle >> 15;
        arr[i + j + 1] = low;
        carry = high;
      }

      arr[i] += carry;
    }

    let shift = 0;

    if (arr[0] === 0) {
      leftShiftMantissa(arr, 30);
      shift -= 1;
    }

    shift += roundMantissaToPrecision(arr, precision, targetMantissa, roundingMode);
    return shift;
  }
  function sqrtMantissa(mantissa, precision, targetMantissa, roundingMode = CURRENT_ROUNDING_MODE) {// We proceed by estimating the square root, then do a root finding search basically
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

  function multiplyMantissas2(mant1, mant2, precision, targetMantissa, roundingMode = CURRENT_ROUNDING_MODE) {
    let mant1Len = mant1.length,
        mant2Len = mant2.length;
    let targetMantissaLen = targetMantissa.length;

    for (let i = 0; i < targetMantissaLen; ++i) targetMantissa[i] = 0;

    let highestWord = 0; // Only add the products whose high words are within targetMantissa

    for (let i = Math.min(targetMantissaLen, mant1Len - 1); i >= 0; --i) {
      let mant1Word = mant1[i];
      let mant1Lo = mant1Word & 0x7FFF;
      let mant1Hi = mant1Word >> 15;
      let carry = 0;

      for (let j = Math.min(targetMantissaLen - i, mant2Len - 1); j >= 0; --j) {
        let writeIndex = i + j;
        let mant2Word = mant2[j];
        let mant2Lo = mant2Word & 0x7FFF;
        let mant2Hi = mant2Word >> 15;
        let low = Math.imul(mant1Lo, mant2Lo);
        let high = Math.imul(mant1Hi, mant2Hi);
        let middle = Math.imul(mant1Hi, mant2Lo) + Math.imul(mant1Lo, mant2Hi) | 0;
        low += ((middle & 0x7FFF) << 15) + (writeIndex < targetMantissaLen ? targetMantissa[writeIndex] : 0) + carry;
        low >>>= 0;

        if (low > 0x3FFFFFFF) {
          high += low >>> 30;
          low &= 0x3FFFFFFF;
        }

        high += middle >> 15;
        if (writeIndex < targetMantissaLen) targetMantissa[writeIndex] = low;
        carry = high;
      }

      if (i > 0) {
        targetMantissa[i - 1] += carry;
      } else {
        highestWord = carry;
      }
    }

    let shift = -1;

    if (highestWord !== 0) {
      rightShiftMantissa(targetMantissa, 30);
      targetMantissa[0] = highestWord;
      shift = 0;
    }

    let roundingShift = roundMantissaToPrecision(targetMantissa, precision, targetMantissa, roundingMode);
    return shift + roundingShift;
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

  function divMantissas(mant1, mant2, precision, targetMantissa, roundingMode = CURRENT_ROUNDING_MODE) {
    // Init mant1Copy with a shifted copy of mant1
    let mant1Copy = new Int32Array(Math.max(mant1.length + 1, mant2.length));

    for (let i = 0; i < mant1.length; ++i) mant1Copy[i + 1] = mant1[i];
    /**
     * Get the number of leading zeros in the shifting mantissa, plus 2 (due to clz32), and -1 if it's all zeros.
     * @returns {number}
     */


    function getMant1LeadingZeros() {
      for (let i = 0; i < mant1Copy.length; ++i) {
        let word = mant1Copy[i];
        if (word > 0) return Math.clz32(word) + 30 * i;
      }

      return -1;
    }

    for (let i = targetMantissa.length - 1; i >= 0; --i) {
      targetMantissa[i] = 0;
    }

    let newMantissaShift = 1; // Index of the highest bit and last significant bit within newMantissa (uninitialized) TODO

    let firstBitIndex = -1,
        lastSignificantBit = 1 << 30; // maybe v8 can optimize this to be an integer :P
    // Index of the current bit we are writing to

    let bitIndex = -1; // Info of the bits coming after the last significant bit TODO

    let trailingInfo = 0;

    function pushZeroBits(count) {
      if (bitIndex === -1 && count >= 31) {
        // For the cases in which the first word is 0
        newMantissaShift -= 1;
        bitIndex += count - 30;
      } else {
        bitIndex += count;
      }
    }

    function pushOneBit() {
      if (bitIndex > lastSignificantBit) {
        // At this point, we can determine the trailing info.
        if (bitIndex === lastSignificantBit + 1) {
          if (getMant1LeadingZeros() === -1) {
            trailingInfo = 2;
          } else {
            trailingInfo = 3;
          }
        } else {
          trailingInfo = 1;
        }

        return true;
      }

      let subIndex = bitIndex / 30 | 0;
      let bit = 29 - bitIndex % 30;
      targetMantissa[subIndex] += 1 << bit;

      if (firstBitIndex === -1) {
        firstBitIndex = bitIndex;
        lastSignificantBit = firstBitIndex + precision - 1;
      }

      return false;
    }

    let mant2LeadingZeros = Math.clz32(mant2[0]);

    while (true) {
      let mant1Zeros = getMant1LeadingZeros();
      if (mant1Zeros === -1) break;
      let shift = mant1Zeros - mant2LeadingZeros;

      if (shift !== 0) {
        leftShiftMantissa(mant1Copy, shift);
        pushZeroBits(shift);
      }

      let cmp = compareMantissas(mant1Copy, mant2);

      if (cmp === -1) {
        leftShiftMantissa(mant1Copy, 1);
        pushZeroBits(1);
      } else if (cmp === 0) {
        pushOneBit();
        break;
      } // Subtract mant2 from mant1


      let carry = 0;

      for (let i = mant2.length - 1; i >= 0; --i) {
        let word = mant1Copy[i] - mant2[i] - carry;

        if (word < 0) {
          word += BIGFLOAT_WORD_SIZE;
          carry = 1;
        } else {
          carry = 0;
        }

        mant1Copy[i] = word;
      } // Note that carry will sometimes be -1 at this point, when the cmp === -1 shift has truncated off the highest bit
      // of mant1Copy. This is intentional


      if (pushOneBit()) break;
    }

    const roundingShift = roundMantissaToPrecision(targetMantissa, precision, targetMantissa, roundingMode, trailingInfo, 1);
    return newMantissaShift + roundingShift;
  }
  let dRecipConst1 = new Int32Array([0x1, 0x38787878, 0x1e1e1e00]); // = 32/17

  let dRecipConst2 = new Int32Array([0x2, 0x34b4b4b4, 0x2d2d2e00]); // = 48/17

  function reciprocalMantissa(mantissa, precision, targetMantissa, roundingMode = CURRENT_ROUNDING_MODE) {}
  /**
   * Multiply a mantissa by a given power of two, with a rounding mode and precision if the target mantissa is shorter
   * than the given mantissa. This function allows aliasing.
   * @param mantissa
   * @param power {number} Exponent
   * @param targetMantissa
   * @param precision {number}
   * @param roundingMode
   */

  function multiplyMantissaPow2(mantissa, power, precision, targetMantissa, roundingMode = CURRENT_ROUNDING_MODE) {
    let clz = Math.clz32(mantissa[0]) - 2;
    let newClz = clz - power;
    let expShift = 0;

    if (newClz > 29 || newClz < 0) {
      expShift = Math.floor(newClz / 30);
      newClz = newClz - expShift * 30;
    }

    let bitshift = newClz - clz;

    if (bitshift <= 0) {
      leftShiftMantissa(mantissa, -bitshift, targetMantissa);
    } else if (bitshift > 0) {
      rightShiftMantissa(mantissa, bitshift, targetMantissa);
    }

    let roundingShift = roundMantissaToPrecision(targetMantissa, precision, targetMantissa, roundingMode);
    return roundingShift - expShift;
  }
  /**
   * Divide two mantissas and write the result to a target mantissa.
   * @param mant1
   * @param mant2
   * @param precision
   * @param targetMantissa
   * @param roundingMode
   */


  function divMantissas2(mant1, mant2, precision, targetMantissa, roundingMode = CURRENT_ROUNDING_MODE) {
    // We use a Newton-Raphson approach, narrowing down on the result with quadratic speed. The first step is determining
    // the reciprocal of mant2, then multiplying by mant1. The approach is based on the wikipedia article
    // https://en.wikipedia.org/wiki/Division_algorithm (yes, I gave up trying to figure this stuff out on my own)
    let sdRecip = createMantissa(precision); // Estimating the reciprocal

    let tmp = new Int32Array(2);
    let rEst = new Int32Array(2); // Shift the denominator until mant[0] > 1 << 29

    let sd = createMantissa(precision);
    let dShift = clzMantissa(mant2);
    if (dShift === -1) throw new RangeError("Division by zero");
    leftShiftMantissa(mant2, dShift, sd); // Initial estimate for the reciprocal of the denominator (low precision, may inline this in future)
    // 1/D = 48/17 - 32/17 * D for 0.5 <= D < 1 is the estimate

    let sdShift = multiplyMantissas2(dRecipConst1, sd, 30, tmp, ROUNDING_MODE.WHATEVER);
    subtractMantissas(dRecipConst2, tmp, -sdShift, 30, rEst, ROUNDING_MODE.WHATEVER); // Copy over the low-precision estimate

    sdRecip[0] = rEst[0];
    sdRecip[1] = rEst[1];
    let one = new Int32Array([1]); // X_(n+1) = X_n + X_n(1 - D * X_n)

    let innerP = createMantissa(precision); // = D * X_n

    let innerS = createMantissa(precision); // = 1 - innerP

    let outerP = createMantissa(precision); // = X_n * innerS

    let outerS = createMantissa(precision); // = X_n + outerP

    for (let i = 0; i < 5; ++i) {
      let mShift = multiplyMantissas2(sd, sdRecip, precision, innerP
      /*target*/
      , ROUNDING_MODE.WHATEVER); // D * X_n

      let sShift = 0;
      let isInnerPositive = mShift === -1; // inner is positive if D * X_n < 1, so positive when the shift is -1

      if (isInnerPositive) {
        sShift = subtractMantissas(one, innerP, 1, precision, innerS
        /*target*/
        , ROUNDING_MODE.WHATEVER);
      } else {
        sShift = subtractMantissas(innerP, one, 0, precision, innerS
        /*target*/
        , ROUNDING_MODE.WHATEVER);
      }

      let mShift2 = multiplyMantissas2(innerS, sdRecip, precision, outerP
      /*target*/
      , ROUNDING_MODE.WHATEVER);

      if (isInnerPositive) {
        addMantissas(sdRecip, outerP, -(mShift2 + sShift + 1), precision, outerS
        /*target*/
        , ROUNDING_MODE.WHATEVER);
      } else {
        subtractMantissas(sdRecip, outerP, -(mShift2 + sShift + 1), precision, outerS
        /*target*/
        , ROUNDING_MODE.WHATEVER);
      }

      roundMantissaToPrecision(outerS, precision, sdRecip, ROUNDING_MODE.WHATEVER);
    } // 1 < sdRecip <= 2 is now 1/sd, so we multiply by the numerator


    let mulShift = multiplyMantissas2(mant1, sdRecip, precision, innerP
    /* tmp target */
    , ROUNDING_MODE.WHATEVER);
    let powShift = multiplyMantissaPow2(innerP, dShift, precision, targetMantissa, ROUNDING_MODE.WHATEVER);
    return -1 - mulShift + powShift;
  } // debug mantissa function
  /**
   * Determine which of two mantissas is larger. -1 if mant1 is smaller, 0 if they are equal, and 1 if mant2 is larger.
   * @param mant1
   * @param mant2
   */


  function compareMantissas(mant1, mant2) {
    let swapResult = false;

    if (mant1.length < mant2.length) {
      let tmp = mant1;
      mant1 = mant2;
      mant2 = tmp;
      swapResult = true;
    }

    let mant1Len = mant1.length,
        mant2Len = mant2.length;
    let result = 0;

    for (let i = 0; i < mant1Len; ++i) {
      let mant1Word = mant1[i];
      let mant2Word = i < mant2Len ? mant2[i] : 0;

      if (mant1Word > mant2Word) {
        result = 1;
        break;
      } else if (mant1Word < mant2Word) {
        result = -1;
        break;
      }
    }

    return swapResult ? -result : result;
  }
  function prettyPrintFloat(mantissa, precision) {
    let words = [];
    let indices = [];

    for (let i = 0; i < mantissa.length; ++i) {
      words.push(leftZeroPad(mantissa[i].toString(2), BIGFLOAT_WORD_BITS, '0'));
      indices.push("0    5    10   15   20   25   ");
    }

    function insert(index, wordChar, indicesChar) {
      let wordIndex = Math.floor(index / BIGFLOAT_WORD_BITS);
      let subIndex = index - wordIndex * BIGFLOAT_WORD_BITS;
      let wordWord = words[wordIndex];
      let indicesWord = indices[wordIndex];
      words[wordIndex] = wordWord.slice(0, subIndex) + wordChar + wordWord.slice(subIndex);
      indices[wordIndex] = indicesWord.slice(0, subIndex) + indicesChar + indicesWord.slice(subIndex);
    } // Insert [ ... ] surrounding the actual meaningful parts of the mantissa


    if (precision) {
      let offset = Math.clz32(mantissa[0]) - 2;
      let startIndex = offset;
      let endIndex = offset + precision;
      insert(startIndex, '[', ' ');
      insert(endIndex, ']', ' ');
    }

    words = words.join(' | ');
    indices = indices.join(' | ');
    return words + '\n' + indices;
  } // Works for f in -0.5 <= f <= 0.5 using the straightforward Taylor series expansion
  // neighborhood of 1 by caching some of these values, then using slowLn1pBounded or arctanhSmallRange


  function lnBaseCase(f, precision) {
    // ln(x) = 2 arctanh((x-1)/(x+1))
    precision += 10;
    let atanhArg = BF.new(precision);
    let argNum = BF.new(precision),
        argDen = BF.new(precision);
    BF.subNumberTo(f, 1, argNum);
    BF.addNumberTo(f, 1, argDen);
    BF.divTo(argNum, argDen, atanhArg);
    let result = arctanhSmallRange(atanhArg, precision - 10);
    BF.mulPowTwoTo(result, 1, result);
    return result;
  } // Compute atanh(f) for f in [0, 1/5] for use in natural log calculations

  function arctanhSmallRange(f, precision) {
    precision += 10; // atanh(x) = x + x^3 / 3 + x^5 / 5 + ... meaning at worst we have convergence at -log2((1/5)^2) = 4.6 bits / iteration

    let accum = BF.new(precision),
        accumSwap = BF.new(precision),
        fSq = BF.new(precision),
        ret = BF.new(precision);
    BF.mulTo(f, f, fSq); // Compute 1 + x^2 / 3 + x^4 / 5 + ...

    let pow = BF.fromNumber(1, precision);
    let powSwap = BF.new(precision),
        powDiv = BF.new(precision);
    let bitsPerIteration = -BigFloat.floorLog2(fSq);
    let iterations = precision / bitsPerIteration;

    for (let i = 0; i < iterations; ++i) {
      BF.divNumberTo(pow, 2 * i + 1, powDiv);
      BF.mulTo(pow, fSq, powSwap);
      [powSwap, pow] = [pow, powSwap];
      BF.addTo(accum, powDiv, accumSwap);
      [accumSwap, accum] = [accum, accumSwap];
    } // Multiply by x


    BF.mulTo(accum, f, ret);
    return ret;
  }
  /**
   * Compute e^f for 0.5 <= f < 1. e^f = 1 + f * (1 + f/2 * (1 + f/3 * ... ) ) )
   */

  function expBaseCase(f, precision, target) {
    let tmp = BigFloat.new(precision);
    let tmp2 = BigFloat.new(precision); // The number of iterations depends on f. Since the term is f^n / n!, we take logs -> n ln(f) - ln(n!) = n ln(f) - n ln(n) + n
    // We want this to be less than ln(2^-(p + 1)) = -(p + 1) * ln(2) or so. We write the equation as n (ln f - ln n + 1) = -(p+1) * ln 2.
    // This is an annoying equation. For now I just came up with an approximation by picking n = c*p for a constant c and
    // fiddling around with it, till I got the approximation n = -l / (ln(f) - (ln(-l/(ln(f) - ln(p) + 2)) + 1), where l = p ln(2).
    // No clue how it works, but it seems to be good enough. At 999 bits precision and 0.5 it reports 153 iterations are needed,
    // while only 148 are sufficient. Oh well.

    let pln2 = (precision + 1) * Math.log(2);
    let lnf = Math.log(Math.abs(f.toNumber(ROUNDING_MODE.WHATEVER)));
    let lnp = Math.log(precision);
    const iters = Math.ceil(-pln2 / (lnf - Math.log(-pln2 / (lnf - lnp + 2)) + 1));
    BigFloat.divNumberTo(f, iters, tmp);
    BigFloat.addNumberTo(tmp, 1, target);

    for (let m = iters - 1; m > 0; --m) {
      BigFloat.divNumberTo(f, m, tmp);
      BigFloat.mulTo(tmp, target, tmp2);
      BigFloat.addNumberTo(tmp2, 1, target);
    }
  }
  const CACHED_CONSTANTS = {
    lnValues: new Map(),
    recipLnValues: new Map()
  };
  const recip2Pow30 = pow2(-BIGFLOAT_WORD_BITS);
  const recip2Pow60 = pow2(-2 * BIGFLOAT_WORD_BITS);
  /**
   * Compute and return ln(x), intended for x between 1 and 2 for higher series convergence in ln. +- 1 ulp
   * @param value
   * @param minPrecision
   * @returns {any|BigFloat}
   */

  function getCachedLnValue(value, minPrecision) {
    let c = CACHED_CONSTANTS.lnValues.get(value);
    if (c && c.prec >= minPrecision) return c;

    if (value > 2 || value < 1) {
      c = BigFloat.ln(value, minPrecision, ROUNDING_MODE.WHATEVER);
    } else {
      let f = BigFloat.fromNumber(value);
      c = lnBaseCase(f, minPrecision);
    }

    CACHED_CONSTANTS.lnValues.set(value, c);
    return c;
  }
  /**
   * Compute and return 1/ln(x), intended for x = 10 and 2 for base conversions and the like.
   * @param value {number}
   * @param minPrecision {number}
   * @returns {any|BigFloat}
   */


  function getCachedRecipLnValue(value, minPrecision) {
    let c = CACHED_CONSTANTS.recipLnValues.get(value);
    if (c && c.prec >= minPrecision) return c;
    c = BigFloat.ln(value, minPrecision + 1);
    c = BigFloat.div(1, c, minPrecision + 1);
    CACHED_CONSTANTS.recipLnValues.set(value, c);
    return c;
  }
  /**
   * Takes in an arbitrary input and converts to a corresponding big float. If passed a BigFloat, it does nothing; if
   * passed a number, it converts to BigFloat. Used for user-facing operations
   * @param arg
   */

  function cvtToBigFloat(arg) {
    if (arg instanceof BigFloat) return arg;
    if (typeof arg === "number") return BigFloat.fromNumber(arg, 53);
    throw new TypeError("Cannot convert argument ".concat(arg, " to BigFloat"));
  }

  class BigFloat {
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
    constructor(sign, exp, prec, mant) {
      this.sign = sign;
      this.exp = exp;
      this.prec = prec;
      this.mant = mant;
    }
    /**
     * Construct a new BigFloat from a JS number with a given precision and rounding in the correct direction if the
     * precision is less than 53.
     * @param num {number} JS number to convert from
     * @param precision {number} Precision, in bits, of the float
     * @param roundingMode {number} Enum of which direction to round in
     * @returns {BigFloat}
     */


    static fromNumber(num, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
      let float = BigFloat.new(precision);
      float.setFromNumber(num, roundingMode);
      return float;
    }
    /**
     * Create a new BigFloat with a given precision, initialized to a value of 0.
     * @param prec {number} Precision, in bits, of the float
     * @returns {BigFloat}
     */


    static new(prec = CURRENT_PRECISION) {
      if (prec < BIGFLOAT_MIN_PRECISION_BITS || prec > BIGFLOAT_MAX_PRECISION_BITS || !Number.isInteger(prec)) throw new RangeError("BigFloat precision must be an integer in the range [".concat(BIGFLOAT_MIN_PRECISION_BITS, ", ").concat(BIGFLOAT_MAX_PRECISION_BITS, "]"));
      return new BigFloat(0, 0, prec, createMantissa(prec));
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


    static cmpFloatMagnitudes(f1, f2) {
      if (f1.exp < f2.exp) {
        return -1;
      } else if (f1.exp > f2.exp) {
        return 1;
      } else {
        return compareMantissas(f1.mant, f2.mant);
      }
    }
    /**
     * Compare two floats. Returns -1 if f1 < f2, 0 if f1 = f2, and 1 if f1 > f2. If either is NaN, returns NaN.
     * @param f1 {BigFloat}
     * @param f2 {BigFloat}
     * @returns {number}
     */


    static cmpFloats(f1, f2) {
      const f1Sign = f1.sign;
      const f2Sign = f2.sign;
      if (f1Sign < f2Sign) return -1;
      if (f1Sign > f2Sign) return 1;
      if (f1Sign === 0 && f2Sign === 0) return 0;

      if (!Number.isFinite(f1Sign) || !Number.isFinite(f2Sign)) {
        // Then they are either both a same signed infinity, or two NaNs
        if (Number.isNaN(f1Sign) || Number.isNaN(f2Sign)) return NaN;
        return 0;
      }

      if (f1.exp < f2.exp) {
        return -1;
      } else if (f1.exp > f2.exp) {
        return 1;
      } else {
        return f1.sign * compareMantissas(f1.mant, f2.mant);
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


    static addTo(f1, f2, target, roundingMode = CURRENT_ROUNDING_MODE, flipF2Sign = false) {
      let f1Sign = f1.sign;
      let f2Sign = flipF2Sign ? -f2.sign : f2.sign; // Special cases

      if (!Number.isFinite(f1Sign) || !Number.isFinite(f2Sign)) {
        target.sign = f1Sign + f2Sign;
        return;
      }

      if (f1Sign === 0) {
        target.setFromFloat(f2, roundingMode);
        if (flipF2Sign) target.sign *= -1;
        return;
      }

      if (f2Sign === 0) {
        target.setFromFloat(f1, roundingMode);
        return;
      } // Used to swap it so that f1 > f2


      function swapF1F2() {
        let tmp = f1;
        f1 = f2;
        f2 = tmp;
        let tmp2 = f1Sign;
        f1Sign = f2Sign;
        f2Sign = tmp2;
      }

      let targetPrecision = target.prec;
      let targetMantissa = target.mant;

      if (f1Sign !== f2Sign) {
        let cmp = BigFloat.cmpFloatMagnitudes(f1, f2);
        let sign = 0;

        if (cmp === 0) {
          target.setZero();
          return;
        } else if (cmp === 1) sign = f1Sign;else sign = f2Sign;

        if (cmp === -1) swapF1F2();
        let shift = subtractMantissas(f1.mant, f2.mant, f1.exp - f2.exp, targetPrecision, targetMantissa, roundingMode);
        target.sign = sign;
        target.exp = f1.exp + shift;
      } else {
        if (f1.exp < f2.exp) swapF1F2();
        let shift = addMantissas(f1.mant, f2.mant, f1.exp - f2.exp, targetPrecision, targetMantissa, roundingMode);
        target.sign = f1Sign;
        target.exp = f1.exp + shift;
      }
    }
    /**
     * Add a JS number to the given float, writing the result to target
     * @param f1 {BigFloat}
     * @param num {number}
     * @param target {BigFloat}
     * @param roundingMode {number}
     */


    static addNumberTo(f1, num, target, roundingMode = CURRENT_ROUNDING_MODE) {
      DOUBLE_STORE.setFromNumber(num);
      BigFloat.addTo(f1, DOUBLE_STORE, target, roundingMode);
    }
    /**
     * Subtract two numbers and write the result to the target.
     * @param f1 {BigFloat}
     * @param f2 {BigFloat}
     * @param target {BigFloat}
     * @param roundingMode {number}
     */


    static subTo(f1, f2, target, roundingMode = CURRENT_ROUNDING_MODE) {
      BigFloat.addTo(f1, f2, target, roundingMode, true);
    }
    /**
     * Subtract a JS number from the given float, writing the result to target
     * @param f1 {BigFloat}
     * @param num {number}
     * @param target {BigFloat}
     * @param roundingMode {number}
     */


    static subNumberTo(f1, num, target, roundingMode = CURRENT_ROUNDING_MODE) {
      DOUBLE_STORE.setFromNumber(num);
      BigFloat.subTo(f1, DOUBLE_STORE, target, roundingMode);
    }
    /**
     * Multiply two big floats and write the result to the target.
     * @param f1 {BigFloat}
     * @param f2 {BigFloat}
     * @param target {BigFloat}
     * @param roundingMode {number}
     */


    static mulTo(f1, f2, target, roundingMode = CURRENT_ROUNDING_MODE) {
      let f1Sign = f1.sign;
      let f2Sign = f2.sign;
      target.sign = f1Sign * f2Sign;
      if (f1Sign === 0 || f2Sign === 0 || !Number.isFinite(f1Sign) || !Number.isFinite(f2Sign)) return;

      if (f1.exp < f2.exp) {
        [f1, f2] = [f2, f1];
      }

      let shift = multiplyMantissas2(f1.mant, f2.mant, target.prec, target.mant, roundingMode);
      target.exp = f1.exp + f2.exp + shift;
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


    static mulNumberTo(float, num, target, roundingMode = CURRENT_ROUNDING_MODE) {
      let isAliased = float === target;

      if (num === 0) {
        target.setZero();
        return;
      } else if (num === 1) {
        if (!isAliased) target.setFromFloat(float);
        return;
      }

      if (Number.isInteger(num)) {
        let absNum = Math.abs(num);

        if (absNum <= 0x3fffffff) {
          let shift = multiplyMantissaByInteger(float.mant, absNum, target.prec, target.mant, roundingMode);
          target.sign = float.sign * Math.sign(num);
          target.exp = float.exp + shift;
          return;
        }
      }

      DOUBLE_STORE.setFromNumber(num);

      if (isAliased) {
        let tmp = BigFloat.new(target.prec);
        BigFloat.mulTo(float, DOUBLE_STORE, tmp, roundingMode);
        target.set(tmp);
      } else {
        BigFloat.mulTo(float, DOUBLE_STORE, target, roundingMode);
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


    static mulPowTwoTo(float, exponent, target, roundingMode = CURRENT_ROUNDING_MODE) {
      if (float.sign === 0 || !Number.isFinite(float.sign)) {
        target.sign = float.sign;
        return;
      }

      let clz = Math.clz32(float.mant[0]) - 2;
      let newClz = clz - exponent;
      let expShift = 0;

      if (newClz > 29 || newClz < 0) {
        expShift = Math.floor(newClz / 30);
        newClz = newClz - expShift * 30;
      }

      target.exp = float.exp - expShift;
      let bitshift = newClz - clz;

      if (bitshift < 0) {
        leftShiftMantissa(float.mant, -bitshift, target.mant);
      } else if (bitshift > 0) {
        rightShiftMantissa(float.mant, bitshift, target.mant);
      } else {
        roundMantissaToPrecision(float.mant, target.prec, target.mant, roundingMode);
      }

      target.sign = float.sign;
    }
    /**
     * Subtract two numbers and write the result to the target.
     * @param f1 {BigFloat}
     * @param f2 {BigFloat}
     * @param target {BigFloat}
     * @param roundingMode {number}
     */


    static divTo(f1, f2, target, roundingMode = CURRENT_ROUNDING_MODE) {
      let f1Sign = f1.sign;
      let f2Sign = f2.sign;

      if (f1Sign === 0 || f2Sign === 0 || !Number.isFinite(f1Sign) || !Number.isFinite(f2Sign)) {
        target.sign = f1Sign / f2Sign;
        return;
      }

      let shift = divMantissas(f1.mant, f2.mant, target.prec, target.mant, roundingMode);
      target.exp = f1.exp - f2.exp + shift;
      target.sign = f1Sign / f2Sign;
    }
    /**
     * Divide a float by a JS number and write the result to the target.
     * @param f1 {BigFloat}
     * @param num {number}
     * @param target {BigFloat}
     * @param roundingMode {number}
     */


    static divNumberTo(f1, num, target, roundingMode = CURRENT_ROUNDING_MODE) {
      DOUBLE_STORE.setFromNumber(num);
      BigFloat.divTo(f1, DOUBLE_STORE, target, roundingMode);
    }
    /**
     * Split a float f1 into an integer part and a fractional part, such that int + frac = f1, int and frac do not have
     * opposite sign, and |frac| < 1.
     * @param f1
     * @param integerPart
     * @param fracPart
     * @param roundingMode
     */


    static splitIntegerTo(f1, integerPart, fracPart, roundingMode) {
      if (f1.sign === 0) {
        integerPart.setZero();
        fracPart.setZero();
        return;
      } else if (!Number.isFinite(f1.sign)) {
        if (Number.isNaN(f1.sign)) {
          integerPart.setNaN();
          fracPart.setNaN();
        } else {
          integerPart.sign = f1.sign;
          fracPart.setZero();
        }

        return;
      } // We identify which word within f1 is the one right after the decimal point and chop it there. Note the property
      // that the exponent of the integer part is always the same as f1.


      let word = f1.exp,
          mantLen = f1.length;

      if (word <= 0) {
        // |f1| < 1
        fracPart.setFromFloat(f1);
        integerPart.setZero();
      } else if (word >= mantLen) {
        integerPart.setFromFloat(f1);
        fracPart.setZero();
      } else {
        // word lies within [1, mantissaLen) and thus we need to chop it.
        let intWordCount = word;
        let mant = f1.mant,
            intPartMant = integerPart.mant,
            fracPartMant = fracPart.mant;

        if (intPartMant.length > intWordCount) {
          for (let i = 0; i < intWordCount; ++i) intPartMant[i] = mant[i];

          for (let i = intPartMant.length - 1; i >= intWordCount; --i) intPartMant[i] = 0;

          roundMantissaToPrecision(intPartMant, integerPart.prec, intPartMant, roundingMode);
        } else {
          // I am lazy to optimize this
          roundMantissaToPrecision(mant.subarray(0, word), integerPart.prec, intPartMant, roundingMode);
        }

        integerPart.exp = f1.exp;
        integerPart.sign = f1.sign;
        let shift;

        for (shift = word; shift < mantLen && mant[shift] === 0; ++shift);

        if (shift === mantLen) {
          fracPart.setZero();
          return;
        }

        let fracWordCount = mantLen - shift;

        if (fracPartMant.length > fracWordCount) {
          for (let i = 0; i < fracWordCount; ++i) fracPartMant[i] = mant[i + shift];

          for (let i = fracPartMant.length - 1; i >= mantLen; --i) fracPartMant[i] = 0;

          roundMantissaToPrecision(fracPartMant, fracPart.prec, fracPartMant, roundingMode);
        } else {
          roundMantissaToPrecision(mant.subarray(word), fracPart.prec, fracPartMant, roundingMode);
        }

        fracPart.exp = word - shift;
        fracPart.sign = f1.sign;
      }
    } // We'll deal with rounding later...


    static exp(f, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
      f = cvtToBigFloat(f);
      let sign = f.sign;
      if (Number.isNaN(sign)) return BigFloat.NaN(precision);
      if (sign === 0) return BigFloat.fromNumber(1, precision);
      let shifts = BigFloat.floorLog2(f, true);

      if (shifts < 0) {
        let ret = BigFloat.new(precision);
        expBaseCase(f, precision, ret);
        return ret;
      } else {
        let tmp = BigFloat.new(precision);
        let mul1 = BigFloat.new(precision);
        BigFloat.mulPowTwoTo(f, -shifts, tmp);
        expBaseCase(tmp, precision, mul1); // Repeated squaring; every shift requires one squaring

        for (; shifts >= 0; --shifts) {
          BigFloat.mulTo(mul1, mul1, tmp);
          [mul1, tmp] = [tmp, mul1];
        }

        return tmp;
      }
    }
    /**
     * Return the floored base-2 logarithm of a number, which can be useful for many reasons
     * @param f1
     * @param ignoreSign
     * @returns {number}
     */


    static floorLog2(f1, ignoreSign = false) {
      if (f1.sign === 0 || !Number.isFinite(f1.sign)) return Math.log2(f1.sign);
      if (!ignoreSign && f1.sign < 0) return NaN;
      return f1.exp * 30 - Math.clz32(f1.mant[0]) + 1;
    }

    static zero(precision = CURRENT_PRECISION) {
      return new BigFloat(0, 0, precision, createMantissa(precision));
    }

    static NaN(precision = CURRENT_PRECISION) {
      return new BigFloat(NaN, 0, precision, createMantissa(precision));
    }

    static Infinity(precision = CURRENT_PRECISION) {
      return new BigFloat(Infinity, 0, precision, createMantissa(precision));
    }

    static NegativeInfinity(precision = CURRENT_PRECISION) {
      return new BigFloat(-Infinity, 0, precision, createMantissa(precision));
    }

    static isNaN(f) {
      return Number.isNaN(f.sign);
    }

    static isFinite(f) {
      return Number.isFinite(f.sign);
    }

    static isZero(f) {
      return f.sign === 0;
    }

    /**
     * Clone this big float
     * @returns {BigFloat}
     */
    clone() {
      return new BigFloat(this.sign, this.exp, this.prec, new Int32Array(this.mant));
    }

    neg() {
      return new BigFloat(this.sign * -1, this.exp, this.prec, new Int32Array(this.mant));
    }
    /**
     * Set this float's parameters to another float's parameters
     * @param {BigFloat} float
     */


    set(float) {
      this.sign = float.sign;
      this.mant = new Int32Array(float.mant);
      this.exp = float.exp;
      this.prec = float.prec;
    }
    /**
     * Set this float to the value of another float, keeping the current precision.
     * @param f {BigFloat}
     * @param roundingMode {number}
     */


    setFromFloat(f, roundingMode = CURRENT_ROUNDING_MODE) {
      if (f.prec === this.prec) {
        this.sign = f.sign;
        let thisMant = this.mant;

        for (let i = 0; i < thisMant.length; ++i) {
          thisMant[i] = f.mant[i];
        }

        this.exp = f.exp;
        return;
      }

      this.sign = f.sign;
      this.exp = f.exp;
      roundMantissaToPrecision(f.mant, this.prec, this.mant, roundingMode);
    }

    setFromNumber(num, roundingMode = CURRENT_ROUNDING_MODE) {
      if (num === 0 || !Number.isFinite(num)) {
        this.sign = num + 0;
        return;
      } // In the odd case we want a lower precision, we create a normal precision and then downcast


      if (this.prec < 53) {
        this.set(BigFloat.fromNumber(num, 53, roundingMode).toBigFloat(this.prec));
        return;
      }

      const outMantissa = this.mant;
      let isNumDenormal = isDenormal(num);
      let [valExponent, valMantissa] = getExponentAndMantissa(num); // Exponent of the float (2^30)^newExp

      let newExp = Math.ceil((valExponent + 1) / BIGFLOAT_WORD_BITS); // The mantissa needs to be shifted to the right by this much. 0 < bitshift <= 30. If the number is denormal, we
      // have to shift it by one bit less

      let bitshift = newExp * BIGFLOAT_WORD_BITS - valExponent - isNumDenormal;
      let denom = pow2(bitshift + 22);
      outMantissa[0] = Math.floor(valMantissa / denom)
      /* from double */
      + (isNumDenormal ? 0 : 1 << 30 - bitshift);
      /* add 1 if not denormal */

      let rem = valMantissa % denom;

      if (bitshift > 8) {
        let cow = 1 << bitshift - 8;
        outMantissa[1] = Math.floor(rem / cow);
        outMantissa[2] = rem % cow << 38 - bitshift;
      } else {
        outMantissa[1] = rem << 8 - bitshift;
      } // Special handling; for extremely small denormal numbers, the first word is 0, so we shift them over


      if (isNumDenormal && outMantissa[0] === 0) {
        outMantissa[0] = outMantissa[1];
        outMantissa[1] = outMantissa[2];
        outMantissa[2] = 0;
        newExp -= 1;
      }

      this.exp = newExp;
      this.sign = Math.sign(num);
    }
    /**
     * Set this number to NaN. Doesn't actually touch the mantissa
     */


    setNaN() {
      this.sign = NaN;
    }
    /**
     * Set this number to 0. Doesn't actually touch the mantissa
     */


    setZero() {
      this.sign = 0;
    }
    /**
     * Convert this float into a float with a different precision, rounded in the correct direction
     * @param precision
     * @param roundingMode
     */


    toBigFloat(precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
      let newMantissa = createMantissa(precision);
      let {
        mant,
        sign,
        exp
      } = this;

      if (this.sign !== 0 && Number.isFinite(sign)) {
        let shift = roundMantissaToPrecision(mant, precision, newMantissa, roundingMode);
        exp += shift;
      }

      return new BigFloat(sign, exp, precision, newMantissa);
    }
    /**
     * Convert this BigFloat to a normal JS number, rounding in the given direction and optionally rounding to the nearest
     * float32 value. It *does* handle denormal numbers, unfortunately for me.
     * @param roundingMode {number}
     * @param f32 {boolean} Whether to cast to a float32 instead of a float64
     * @returns {number}
     */


    toNumber(roundingMode = CURRENT_ROUNDING_MODE, f32 = false) {
      if (this.sign === 0 || !Number.isFinite(this.sign)) return this.sign;
      let m = this.mant,
          exp = (this.exp - 1) * BIGFLOAT_WORD_BITS;

      if (roundingMode === ROUNDING_MODE.WHATEVER) {
        // Short-circuit calculation for efficiency
        return pow2(exp) * (m[0] + m[1] * recip2Pow30 + (f32 ? 0 : m[2] * recip2Pow60));
      }

      let prec = f32 ? 24 : 53;
      let roundedMantissa = createMantissa(prec); // Round to the nearest float32 or float64, ignoring denormal numbers for now

      const shift = roundMantissaToPrecision(m, prec, roundedMantissa, roundingMode); // Calculate an exponent and mant such that mant * 2^exponent = the number

      let mAsInt;

      if (shift) {
        mAsInt = 1 << 30;
      } else {
        mAsInt = roundedMantissa[0] + roundedMantissa[1] * recip2Pow30 + (f32 ? 0 : roundedMantissa[2] * recip2Pow60);
      } // Normalize mant to be in the range [0.5, 1), which lines up exactly with a normal double


      let expShift = flrLog2(mAsInt) + 1;
      mAsInt /= pow2(expShift);
      exp += expShift;
      let MIN_EXPONENT = f32 ? -148 : -1073;
      let MAX_EXPONENT = f32 ? 127 : 1023;
      let MIN_VALUE = f32 ? 1.175494e-38 : Number.MIN_VALUE;
      let MAX_VALUE = f32 ? 3.40282347e+38 : Number.MAX_VALUE; // We now do various things depending on the rounding mode. The range of a double's exponent is -1024 to 1023,
      // inclusive, so if the exponent is outside of those bounds, we clamp it to a value depending on the rounding mode.

      if (exp < MIN_EXPONENT) {
        if (roundingMode === ROUNDING_MODE.TIES_AWAY || roundingMode === ROUNDING_MODE.NEAREST) {
          // Deciding between 0 and Number.MIN_VALUE. Unfortunately at 0.5 * 2^1074 there is a TIE
          if (exp === MIN_EXPONENT - 1) {
            // If greater or ties away
            if (mAsInt > 0.5 || roundingMode === ROUNDING_MODE.TIES_AWAY) {
              return this.sign * MIN_VALUE;
            }
          }

          return 0;
        } else {
          if (this.sign === 1) {
            if (roundingMode === ROUNDING_MODE.TOWARD_INF || roundingMode === ROUNDING_MODE.UP) return MIN_VALUE;else return 0;
          } else {
            if (roundingMode === ROUNDING_MODE.TOWARD_ZERO || roundingMode === ROUNDING_MODE.UP) return 0;else return -MIN_VALUE;
          }
        }
      } else if (exp > MAX_EXPONENT) {
        if (exp === MAX_EXPONENT + 1) {
          // Bottom formula will overflow, so we adjust
          return this.sign * mAsInt * 2 * pow2(exp - 1);
        }

        if (roundingMode === ROUNDING_MODE.TIES_AWAY || roundingMode === ROUNDING_MODE.NEAREST) {
          return Infinity * this.sign;
        } else if (this.sign === 1) {
          if (roundingMode === ROUNDING_MODE.TOWARD_INF || roundingMode === ROUNDING_MODE.UP) return Infinity;else return MAX_VALUE;
        } else {
          if (roundingMode === ROUNDING_MODE.TOWARD_ZERO || roundingMode === ROUNDING_MODE.UP) return -MAX_VALUE;else return -Infinity;
        }
      } else {
        return this.sign * mAsInt * pow2(exp);
      }
    }

    toUnderstandableString() {
      return prettyPrintFloat(this.mant, this.prec);
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


    static add(f1, f2, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
      f1 = cvtToBigFloat(f1);
      f2 = cvtToBigFloat(f2);
      let ret = BigFloat.new(precision);
      BigFloat.addTo(f1, f2, ret, roundingMode);
      return ret;
    }
    /**
     * User-friendly subtraction function that takes in both JS numbers and plain floats.
     * @param f1 {BigFloat|number}
     * @param f2 {BigFloat|number}
     * @param precision
     * @param roundingMode
     */


    static sub(f1, f2, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
      f1 = cvtToBigFloat(f1);
      f2 = cvtToBigFloat(f2);
      let ret = BigFloat.new(precision);
      BigFloat.subTo(f1, f2, ret, roundingMode);
      return ret;
    }
    /**
     * User-friendly divide function that takes in both JS numbers and plain floats.
     * @param f1 {BigFloat|number}
     * @param f2 {BigFloat|number}
     * @param precision
     * @param roundingMode
     */


    static div(f1, f2, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
      f1 = cvtToBigFloat(f1);
      f2 = cvtToBigFloat(f2);
      let ret = BigFloat.new(precision);
      BigFloat.divTo(f1, f2, ret, roundingMode);
      return ret;
    }
    /**
     * User-friendly divide function that takes in both JS numbers and plain floats.
     * @param f1 {BigFloat|number}
     * @param f2 {BigFloat|number}
     * @param precision
     * @param roundingMode
     */


    static mul(f1, f2, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
      f1 = cvtToBigFloat(f1);
      f2 = cvtToBigFloat(f2);
      let ret = BigFloat.new(precision);
      BigFloat.mulTo(f1, f2, ret, roundingMode);
      return ret;
    }
    /**
     * Returns -1 if a is less than b, 0 if they are equal, and 1 if a is greater than b
     * @param a {BigFloat|number}
     * @param b {BigFloat|number}
     */


    static cmp(a, b) {
      if (a instanceof BigFloat && b instanceof BigFloat) {
        return BigFloat.cmpFloats(a, b);
      }

      if (typeof a === "number" && typeof b === "number") {
        if (a < b) return -1;else if (a === b) return 0;else if (a > b) return 1;else return NaN;
      }

      if (a instanceof BigFloat && typeof b === "number") {
        if (BigFloat.isNaN(a) || Number.isNaN(b)) return NaN;
        const aSign = a.sign;
        const bSign = Math.sign(b);
        if (aSign < bSign) return -1;else if (aSign > bSign) return 1;
        if (aSign === Infinity || aSign === -Infinity || aSign === 0) return 0;
        let aFlrLog2 = BigFloat.floorLog2(a, true);
        let bFlrLog2 = flrLog2(b * bSign);

        if (aFlrLog2 < bFlrLog2) {
          return -aSign;
        } else if (aFlrLog2 > bFlrLog2) {
          return aSign;
        } else {
          // Fallback
          DOUBLE_STORE.setFromNumber(b);
          return BigFloat.cmpFloats(a, DOUBLE_STORE);
        }
      } else if (typeof a === "number" && b instanceof BigFloat) {
        return -BigFloat.cmpNumber(b, a);
      }

      throw new Error("Invalid arguments to cmpNumber");
    }
    /**
     * Returns true if the numbers are equal (allows for JS numbers to be used)
     * @param f {BigFloat|f}
     * @returns {boolean}
     */


    equals(f) {
      return BigFloat.cmp(this, f) === 0;
    }
    /**
     * Returns true if this float is greater than or equal to the argument (allows for JS numbers to be used)
     * @param f {BigFloat|f}
     * @returns {boolean}
     */


    greaterEq(f) {
      return BigFloat.cmp(this, f) >= 0;
    }
    /**
     * Returns true if this float is greater than the argument (allows for JS numbers to be used)
     * @param f {BigFloat|f}
     * @returns {boolean}
     */


    greaterThan(f) {
      return BigFloat.cmp(this, f) === 1;
    }
    /**
     * Returns true if this float is less than or equal to the argument (allows for JS numbers to be used)
     * @param f {BigFloat|f}
     * @returns {boolean}
     */


    lessEq(f) {
      return BigFloat.cmp(this, f) <= 0;
    }
    /**
     * Returns true if this float is less than the argument (allows for JS numbers to be used)
     * @param f {BigFloat|f}
     * @returns {boolean}
     */


    lessThan(f) {
      return BigFloat.cmp(this, f) === -1;
    }
    /**
     * Returns the natural logarithm of f.
     * @param f
     * @param precision
     * @param roundingMode
     * @returns {BigFloat}
     */


    static ln(f, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
      f = cvtToBigFloat(f);
      let f1Sign = f.sign; // Special cases

      if (f1Sign === 0) {
        return BigFloat.NegativeInfinity(precision);
      } else if (f1Sign < 0) {
        return BigFloat.NaN(precision);
      } else if (!Number.isFinite(f1Sign)) {
        return BigFloat.fromNumber(f1Sign, precision);
      } // By what power of two to shift f, so that we get a number between 0.5 and 1


      let shift = BigFloat.floorLog2(f, true) + 1;
      let tmp = BigFloat.new(precision),
          tmp2 = BigFloat.new(precision),
          m = BigFloat.new(precision);
      BigFloat.mulPowTwoTo(f, -shift, m); // 0.5 <= m < 1, integerPart is exponent. We have a lookup table of log(x) for x in 1 to 2, so that m
      // can be put into a quickly converging series based on the inverse hyperbolic tangent. For now we aim for
      // |1-x| < 0.125, meaning 8 brackets.

      let mAsNumber = m.toNumber(ROUNDING_MODE.WHATEVER); // Makes things easier

      let lookup = 1 + Math.floor((1 / mAsNumber - 1) * 8) / 8; // Compute ln(f * lookup) - ln(lookup)

      BigFloat.mulNumberTo(m, lookup, tmp);
      let part1 = lnBaseCase(tmp, precision);
      let part2 = getCachedLnValue(lookup, precision);
      BigFloat.subTo(part1, part2, tmp2);
      BigFloat.mulNumberTo(getCachedLnValue(2, precision), shift, tmp);
      BigFloat.addTo(tmp, tmp2, m);
      return m;
    }
    /**
     * Compute the standard logarithm of f.
     * @param f {BigFloat}
     * @param precision {number}
     * @param roundingMode {number}
     * @returns {BigFloat}
     */


    static log10(f, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
      f = cvtToBigFloat(f); // log10 (x) = ln(x) / ln(10)

      const num = BigFloat.ln(f, precision);
      const den = getCachedRecipLnValue(10, precision);
      return BigFloat.mul(num, den, precision);
    }
    /**
     * Compute x raised to the power y.
     * @param x
     * @param y
     * @param precision
     * @param roundingMode
     */


    static pow(x, y, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {// x^y = exp(y ln x)
    }
    /**
     * Compute 10^f.
     * @param f
     * @param precision
     * @param roundingMode
     */


    static pow10(f, precision = CURRENT_PRECISION, roundingMode = CURRENT_ROUNDING_MODE) {
      f = cvtToBigFloat(f);
      let ln10 = getCachedLnValue(10, precision);
      return BigFloat.exp(BigFloat.mul(f, ln10, precision), precision);
    }
    /**
     * Convert a float to a readable base-10 representation.
     */


    toPrecision(prec = this.prec / 3.23
    /* log2(10) */
    ) {
      // f = m * 2^e; log10(f) = log10(m) + log10(2) * e
      // f = frac(log10(f)) * 10^floor(log10(f))
      prec = prec | 0;
      let workingPrecision = (prec * 3.23 | 0) + 5;
      let log10 = BigFloat.log10(this, workingPrecision);
      let floor = BigFloat.new(53),
          frac = BigFloat.new(workingPrecision);
      BigFloat.splitIntegerTo(log10, floor, frac, ROUNDING_MODE.NEAREST);
      console.log(floor.toNumber());
      let base10mant = BigFloat.div(BigFloat.pow10(frac, workingPrecision), 10, workingPrecision); // We convert the base 10 mant to decimal and then round it to the

      let mant = base10mant.mant;
      let decimalOut = [0];

      function divPow30() {
        let carry = 0;

        for (let i = 0; i < decimalOut.length; ++i) {
          let word = decimalOut[i];
          let div = word / 2 ** 15;
          let flr = Math.floor(div);
          let newWord = flr + carry;
          decimalOut[i] = newWord;
          carry = (div - flr) * 10 ** 15;
        }

        if (carry) decimalOut.push(carry);
      }

      for (let i = mant.length - 2; i >= 0; --i) {
        decimalOut[0] += mant[i] & 0x7fff;
        divPow30();
        decimalOut[0] += mant[i] >> 15;
        divPow30();
      }

      return decimalOut;
    }

  } // Used for intermediate calculations to avoid allocating floats unnecessarily

  _defineProperty(BigFloat, "ZERO", Object.freeze(BigFloat.fromNumber(0, 53)));

  _defineProperty(BigFloat, "ONE", Object.freeze(BigFloat.fromNumber(1, 53)));

  const DOUBLE_STORE = BigFloat.new(53);

  const pointInterface = constructInterface({
    interface: {
      position: {
        description: "Position of the point, potentially under a plot transformation",
        conversion: {
          type: "Vec2"
        },
        target: "pos"
      },
      color: {
        description: "Color of the point",
        conversion: {
          type: "Color"
        },
        setAs: "user"
      },
      size: {
        description: "Radius in pixels of the dot",
        typecheck: {
          type: "number",
          min: 0,
          max: 100
        },
        setAs: "user"
      }
    },
    internal: {
      pos: {
        type: "Vec2",
        computed: "none"
        /* No defaults, no user value, no nothing */

      },
      color: {
        type: "Color",
        computed: "user",
        default: Colors.BLACK
      },
      size: {
        type: "number",
        computed: "user",
        default: 5
      }
    }
  });
  class PointElement extends Element {
    getInterface() {
      return pointInterface;
    }

    _update() {
      this.defaultInheritProps();
      this.defaultComputeProps();
      let {
        pos,
        color,
        size,
        plotTransform
      } = this.props.proxy;

      if (!pos || !color || !size) {
        this.internal.renderInfo = null;
        return;
      }

      if (plotTransform) {
        pos = plotTransform.graphToPixel(pos);
      }

      let circleVertices = generateCircleTriangleStrip(size, pos.x, pos.y);
      this.internal.renderInfo = {
        instructions: {
          type: "triangle_strip",
          color,
          vertices: circleVertices
        }
      };
    }

  }

  function getDemarcations(xStart, xEnd, xLen, desiredMinorSep, desiredMajorSep, subdivisions, includeAxis = false) {
    if (xStart >= xEnd || !Number.isFinite(xStart) || !Number.isFinite(xEnd) || !Number.isFinite(xLen) || desiredMajorSep < 1 || desiredMinorSep < 1 || subdivisions.length === 0) return [];
    let xGraphLen = xEnd - xStart;
    let estimatedMajors = xLen / desiredMajorSep; // We look for the base b and subdivision s such that the number of major subdivisions that result would be closest
    // to the number implied by the desired major sep

    let bestBase = 0;
    let bestErr = Infinity;
    let bestSubdivision = [1, 1];

    for (const subdiv of subdivisions) {
      let maj = subdiv[1];
      let desiredBase = Math.log10(maj * xGraphLen / estimatedMajors);
      let nearest = Math.round(desiredBase);
      let err = Math.abs(maj * xGraphLen / Math.pow(10, nearest) - estimatedMajors);

      if (err < bestErr) {
        bestErr = err;
        bestSubdivision = subdiv;
        bestBase = nearest;
      }
    } // Generate the ticks based on the chosen base and subdivision. We first find the offset of the nearest multiple of
    // 10^b preceding xStart, say m * 10^b, then for each interval (m, m+1) generate the ticks that are in the range of
    // xStart and xEnd


    let based = Math.pow(10, bestBase);
    let firstMultiple = Math.floor(xStart / based);
    let lastMultiple = xEnd / based; // In the case that the end is at a power of 10, we want to generate the end as well

    if (Number.isInteger(lastMultiple)) lastMultiple++;
    lastMultiple = Math.ceil(lastMultiple);
    let [min, maj] = bestSubdivision;
    let minTicks = [];
    let majTicks = []; // Note we might start to get float errors here. We'll assume good faith for now that the plot transform constraints
    // are turned on.

    for (let i = firstMultiple; i < lastMultiple; ++i) {
      // Generate ticks
      let begin = i * based;
      let end = (i + 1) * based;
      let diff = end - begin;

      for (let j = 0; j < maj; ++j) {
        let tick = begin + diff * j / maj;
        if (tick > xEnd) continue;
        if (tick >= xStart && (includeAxis || tick !== 0)) majTicks.push(tick);

        for (let k = 1; k < min; ++k) {
          tick = begin + diff * ((j + k / min) / maj);
          if (tick > xEnd || tick < xStart) continue;
          minTicks.push(tick);
        }
      }
    }

    return {
      min: minTicks,
      maj: majTicks
    };
  }
  function get2DDemarcations(xStart, xEnd, xLen, yStart, yEnd, yLen, {
    desiredMinorSep = 20,
    desiredMajorSep = 150,
    subdivisions = [[4
    /* minor */
    , 5
    /* major */
    ], [5, 2], [5, 1]],
    // permissible subdivisions of the powers of ten into major separators and minor separators
    emitAxis = true // emit a special case for axis

  } = {}) {
    let x = getDemarcations(xStart, xEnd, xLen, desiredMinorSep, desiredMajorSep, subdivisions, !emitAxis);
    let y = getDemarcations(yStart, yEnd, yLen, desiredMinorSep, desiredMajorSep, subdivisions, !emitAxis);
    let ret = {
      major: {
        x: x.maj,
        y: y.maj
      },
      minor: {
        x: x.min,
        y: y.min
      }
    };

    if (emitAxis) {
      ret.axis = {
        x: xStart <= 0 || xEnd >= 0 ? [0] : [],
        y: yStart <= 0 || yEnd >= 0 ? [0] : []
      };
    }

    return ret;
  }

  const DefaultOutlinePen = Pen.create({
    endcap: "square"
  });
  const DefaultGridlinePens = {
    major: DefaultStyles.gridlinesMajor,
    minor: DefaultStyles.gridlinesMinor,
    axis: DefaultStyles.gridlinesAxis
  };
  const figureBaublesInterface = constructInterface({
    interface: {
      showOutline: {
        typecheck: "boolean",
        description: "Whether to show an outline of the figure"
      },
      showGridlines: {
        setAs: "user",
        description: "Whether to show gridlines"
      },
      sharpenGridlines: {
        typecheck: "boolean",
        description: "Whether to make the gridlines look sharp by aligning them to pixel boundaries"
      },
      outlinePen: {
        setAs: "user",
        description: "The pen used to draw the outline"
      }
    },
    internal: {
      // Whether to show a bounding outline of the figure
      showOutline: {
        type: "boolean",
        computed: "default",
        default: true
      },
      // Pen to use for the bounding outline
      outlinePen: {
        type: "Pen",
        computed: "user",
        default: DefaultOutlinePen,
        compose: true
      },
      // Internal variable of the form { major: { x: [ ... ], y: [ ... ] }, minor: ... } expressed in graph coordinates
      ticks: {
        computed: "none"
      },
      // Whether to show the figure's gridlines
      showGridlines: {
        type: "BooleanDict",
        computed: "user",
        default: {
          major: true,
          minor: true,
          axis: true
        },
        compose: true
      },
      // Whether to show axes instead of major gridlines
      generateGridlinesAxis: {
        type: "boolean",
        computed: "default",
        default: true
      },
      // Whether to sharpen the gridlines
      sharpenGridlines: {
        type: "boolean",
        computed: "default",
        default: true
      },
      // Dictionary of pens
      gridlinePens: {
        type: "Pens",
        computed: "user",
        default: DefaultGridlinePens,
        compose: true
      },
      // Whether to show labels
      showLabels: {
        type: "boolean",
        computed: "default",
        default: true
      },
      // Where to put the labels
      labelPosition: {
        type: "LabelPosition",
        computed: "user",
        default: DefaultStyles.plotLabelPositions,
        compose: true
      }
    }
  });
  const exponentReference = {
    '-': String.fromCharCode(8315),
    '0': String.fromCharCode(8304),
    '1': String.fromCharCode(185),
    '2': String.fromCharCode(178),
    '3': String.fromCharCode(179),
    '4': String.fromCharCode(8308),
    '5': String.fromCharCode(8309),
    '6': String.fromCharCode(8310),
    '7': String.fromCharCode(8311),
    '8': String.fromCharCode(8312),
    '9': String.fromCharCode(8313)
  };
  /* Convert a digit into its exponent form */

  function convertChar(c) {
    return exponentReference[c];
  }
  /* Convert an integer into its exponent form (of Unicode characters) */


  function exponentify(integer) {
    let stringi = integer + '';
    let out = '';

    for (let i = 0; i < stringi.length; ++i) {
      out += convertChar(stringi[i]);
    }

    return out;
  } // Credit: https://stackoverflow.com/a/20439411

  /* Turns a float into a pretty float by removing dumb floating point things */


  function beautifyFloat(f, prec = 12) {
    let strf = f.toFixed(prec);

    if (strf.includes('.')) {
      return strf.replace(/\.?0+$/g, '');
    } else {
      return strf;
    }
  }

  function isApproxEqual(v, w, eps = 1e-5) {
    return Math.abs(v - w) < eps;
  }

  const CDOT = String.fromCharCode(183);

  const standardLabelFunction = x => {
    if (x === 0) return "0"; // special case
    else if (Math.abs(x) < 1e5 && Math.abs(x) > 1e-5) // non-extreme floats displayed normally
        return beautifyFloat(x);else {
        // scientific notation for the very fat and very small!
        let exponent = Math.floor(Math.log10(Math.abs(x)));
        let mantissa = x / 10 ** exponent;
        let prefix = isApproxEqual(mantissa, 1) ? '' : beautifyFloat(mantissa, 8) + CDOT;
        let exponent_suffix = "10" + exponentify(exponent);
        return prefix + exponent_suffix;
      }
  };
  /**
   * Given a plot transform, ticks and set of pens, generate a set of polyline calls that draw gridlines.
   * @param plotTransform {LinearPlot2DTransform}
   * @param ticks
   * @param gridlinePens
   * @param enabledPens {{}|null} Dict (pen name -> boolean) of enabled pens to generate ticks for
   * @param sharpen {boolean} Whether to align the ticks to pixel boundaries to make them look sharper
   * @returns {Array}
   */


  function generateGridlinesInstructions(plotTransform, ticks, gridlinePens, enabledPens = null, sharpen = true) {
    let pixelBox = plotTransform.pixelBox();
    let instructions = [];

    for (let [style, entries] of Object.entries(ticks)) {
      if (enabledPens && !enabledPens[style]) continue;
      let pen = gridlinePens[style];
      let thickness = pen.thickness; // Used to make thin lines appear "sharper"

      let shift = thickness % 2 === 1 ? 0.5 : 0;
      if (!pen) continue;
      let vertices = [];

      for (let tick of entries.x) {
        let x = plotTransform.graphToPixelX(tick);

        if (sharpen) {
          x = (x | 0) + shift;
        }

        vertices.push(x, pixelBox.y, x, pixelBox.y2);
        vertices.push(NaN, NaN);
      }

      for (let tick of entries.y) {
        let y = (plotTransform.graphToPixelY(tick) | 0) + shift;

        if (sharpen) {
          y = (y | 0) + shift;
        }

        vertices.push(pixelBox.x, y, pixelBox.x2, y);
        vertices.push(NaN, NaN);
      }

      instructions.push({
        type: "polyline",
        vertices: new Float32Array(vertices),
        pen
      });
    }

    return instructions;
  }

  class FigureBaubles extends Group {
    getInterface() {
      return figureBaublesInterface;
    }

    _update() {
      this.defaultInheritProps();
      this.defaultComputeProps();
      this.computeTicks();
      this.computeGridlines();
      this.computeLabels();
      this.toggleOutline();
      this.computeRenderInfo();
    }

    computeTicks() {
      const {
        props
      } = this;

      if (props.hasChanged("plotTransform")) {
        let tr = props.get("plotTransform");
        let ticks = get2DDemarcations(tr.gx1, tr.gx1 + tr.gw, tr.pw, tr.gy1, tr.gy1 + tr.gh, tr.ph, {
          emitAxis: props.get("generateGridlinesAxis")
        });
        props.set("ticks", ticks);
      }
    }

    computeLabels() {
      const instructions = [];

      if (this.props.haveChanged(["ticks", "showLabels"])) {
        let {
          ticks,
          plotTransform
        } = this.props.proxy;

        for (let style of ["major"]) {
          let entries = ticks[style];
          let x = entries.x,
              y = entries.y;

          for (let i = 0; i < x.length; ++i) {
            let pos = plotTransform.graphToPixel(new Vec2(x[i], 0)).add(new Vec2(0, 10));
            instructions.push({
              type: "text",
              text: standardLabelFunction(x[i]),
              pos,
              style: DefaultStyles.label
            });
          }

          for (let i = 0; i < y.length; ++i) {
            let pos = plotTransform.graphToPixel(new Vec2(0, y[i])).add(new Vec2(-30, 0));
            instructions.push({
              type: "text",
              text: standardLabelFunction(y[i]),
              pos,
              style: DefaultStyles.label
            });
          }
        }

        this.internal.labelInstructions = instructions;
      }
    }

    computeGridlines() {
      if (this.props.haveChanged(["ticks", "showGridlines", "sharpenGridlines"])) {
        let {
          showGridlines,
          ticks,
          gridlinePens,
          plotTransform,
          sharpenGridlines
        } = this.props.proxy;
        this.internal.gridlinesInstructions = generateGridlinesInstructions(plotTransform, ticks, gridlinePens, showGridlines, sharpenGridlines);
      }
    }

    toggleOutline() {
      let {
        showOutline,
        plotTransform,
        outlinePen: pen
      } = this.props.proxy;

      if (showOutline && plotTransform) {
        // We inset the box by the thickness of the line so that it doesn't jut out
        let box = plotTransform.pixelBox().squish(pen.thickness / 2);
        let vertices = generateRectangleCycle(box);
        this.internal.outlineInstruction = {
          type: "polyline",
          vertices,
          pen
        };
      } else {
        this.internal.outlineInstruction = null;
      }
    }

    computeRenderInfo() {
      this.internal.renderInfo = {
        instructions: [this.internal.outlineInstruction, ...this.internal.labelInstructions, ...this.internal.gridlinesInstructions]
      };
    }

  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  function measureText(text, textStyle) {
    let font = textStyle.font;
    let fontSize = textStyle.fontSize;
    if (!font || !fontSize) throw new Error("Invalid text style");
    ctx.font = "".concat(fontSize, "px ").concat(font);
    return ctx.measureText(text);
  }

  /**
   * Error thrown when a parser gets pissed
   */
  class ParserError extends Error {
    constructor(message) {
      super(message);
      this.name = "ParserError";
    }

  }
  /**
   * Helper function to throw an error at a specific index in a string.
   * @param string {String} The string to complain about
   * @param index {number} The index in the string where the error occurred
   * @param message {String} The error message
   */

  function getAngryAt(string, index = 0, message = "I'm angry!") {
    // Spaces to offset the caret to the correct place along the string
    const spaces = " ".repeat(index);
    throw new ParserError(message + " at index " + index + ":\n" + string + "\n" + spaces + "^");
  }

  const RealIntervalFunctions = {};

  /**
   * Represents a complex number, with a real part and an imaginary part both represented by floats.
   */
  class Complex {
    /**
     * Construct a new complex number.
     * @param re The real part of the complex number.
     * @param im The imaginary part of the complex number.
     */
    constructor(re, im = 0) {
      this.re = re;
      this.im = im;
    }
    /**
     * Get i.
     * @returns {Complex} i.
     * @constructor
     */


    static get I() {
      return new Complex(0, 1);
    }
    /**
     * Get 1.
     * @returns {Complex} 1.
     * @constructor
     */


    static get One() {
      return new Complex(1, 0);
    }
    /**
     * Return the complex argument (principal value) corresponding to the complex number.
     * @returns {number} The complex argument Arg(z).
     */


    arg() {
      return Math.atan2(this.im, this.re);
    }
    /**
     * Returns |z|.
     * @returns {number} The complex magnitude |z|.
     */


    magnitude() {
      return Math.hypot(this.re, this.im);
    }
    /**
     * Returns |z|^2.
     * @returns {number} The square of the complex magnitude |z|^2.
     */


    magnitudeSquared() {
      return this.re * this.re + this.im * this.im;
    }
    /**
     * Returns z bar.
     * @returns {Complex} The conjugate of z.
     */


    conj() {
      return new Complex(this.re, -this.im);
    }
    /**
     * Clone this complex number.
     * @returns {Complex} Clone of z.
     */


    clone() {
      return new Complex(this.re, this.im);
    }
    /**
     * Scale this complex number by the real factor r.
     * @param r {number} The scaling factor.
     */


    scale(r) {
      return new Complex(this.re * r, this.im * r);
    }
    /**
     * Check whether this complex number is equal to another.
     * @param z {Complex} Complex number to compare with.
     */


    equals(z) {
      return this.re === z.re && this.im === z.im;
    }
    /**
     * Return a complex number pointing in the same direction, with magnitude 1.
     * @returns {Complex}
     */


    normalize() {
      let mag = this.magnitude();
      return this.scale(1 / mag);
    }

  }

  /**
   * Returns a + b.
   * @param a {Complex}
   * @param b {Complex}
   * @returns {Complex}
   */

  const Add = (a, b) => {
    return new Complex(a.re + b.re, a.im + b.im);
  };
  /**
   * Returns a * b.
   * @param a {Complex}
   * @param b {Complex}
   * @returns {Complex}
   */

  const Multiply = (a, b) => {
    return new Complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  };
  /**
   * Returns a / b.
   * @param a {Complex}
   * @param b {Complex}
   * @returns {Complex}
   */

  const Divide = (a, b) => {
    let div = b.magnitudeSquared();
    return Multiply(a, b.conj()).scale(1 / div);
  };
  /**
   * Returns a - b.
   * @param a {Complex}
   * @param b {Complex}
   * @returns {Complex}
   */

  const Subtract = (a, b) => {
    return new Complex(a.re - b.re, a.im - b.im);
  };
  /**
   * Returns Re(z).
   * @param z
   * @returns {number}
   */

  const Re = z => {
    return z.re;
  };
  /**
   * Returns Im(z)
   * @param z
   * @returns {number}
   */

  const Im = z => {
    return z.im;
  };
  /**
   * Returns the complex number a+bi
   * @param a
   * @param b
   * @returns {Complex}
   * @constructor
   */

  const Construct = (a, b = 0) => {
    return new Complex(a, b);
  };
  const UnaryMinus = a => {
    return new Complex(-a.re, -a.im);
  };

  const piecewise = (val1, cond, ...args) => {
    if (cond) return val1;

    if (args.length === 0) {
      if (cond === undefined) return val1;else return new Complex(0);
    }

    return piecewise(...args);
  };

  const Abs = z => {
    return z.magnitude();
  };
  const IsFinite = z => {
    return isFinite(z.re) && isFinite(z.im);
  };
  const Piecewise = piecewise;

  var BasicArithmeticFunctions = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Add: Add,
    Multiply: Multiply,
    Divide: Divide,
    Subtract: Subtract,
    Re: Re,
    Im: Im,
    Construct: Construct,
    UnaryMinus: UnaryMinus,
    Abs: Abs,
    IsFinite: IsFinite,
    Piecewise: Piecewise
  });

  /**
   * Returns e^(i theta) for real theta.
   * @param theta {number}
   * @returns {Complex} cis(theta)
   */

  const Cis = theta => {
    // For real theta
    let c = Math.cos(theta);
    let s = Math.sin(theta);
    return new Complex(c, s);
  };

  /**
   * Returns e^z for complex z.
   * @param z {Complex}
   * @returns {Complex}
   */

  const Exp = z => {
    let magnitude = Math.exp(z.re);
    let angle = z.im;
    return Cis(angle).scale(magnitude);
  };

  /**
   * Return the principal value of z^w.
   * @param z {Complex}
   * @param w {Complex}
   * @returns {Complex}
   */

  const Pow = (z, w) => {
    return Exp(Multiply(w, new Complex(Math.log(z.magnitude()), z.arg())));
  };
  /**
   * Multivalued version of z^w.
   * @param z {Complex}
   * @param w {Complex}
   * @param branch {number}
   * @returns {Complex}
   */

  const PowBranched = (z, w, branch = 0) => {
    return Multiply(Pow(z, w), Exp(Multiply(Complex.I, w.scale(2 * Math.PI * branch))));
  };
  /**
   * z^r, where r is a real number.
   * @param z {Complex}
   * @param r {number}
   * @returns {Complex}
   */

  const PowR = (z, r) => {
    if (r === 0) return new Complex(1);else if (r === 1) return z.clone();else if (r === 2) return Multiply(z, z);
    return Pow(z, new Complex(r));
  };
  const PowZ = (r, z) => {
    return Exp(Multiply(z, new Complex(Math.log(Math.abs(r)), r > 0 ? 0 : Math.PI)));
  };
  /**
   * z^r, where r is a real number, branched.
   * @param z {Complex}
   * @param r {number}
   * @param branch {number}
   * @returns {Complex}
   */

  const PowRBranched = (z, r, branch = 0) => {
    return PowBranched(z, new Complex(r), branch);
  };
  /**
   * Returns z^n, where n is a positive integer
   * @param z {Complex} The base of the exponentiation.
   * @param n {number} Positive integer, exponent.
   * @returns {Complex}
   */

  const PowN = (z, n) => {
    if (n === 0) {
      return new Complex(1, 0);
    } else if (n === 1) {
      return z.clone();
    } else if (n === -1) {
      return z.conj().scale(1 / z.magnitudeSquared());
    } else if (n === 2) {
      return Multiply(z, z);
    }

    let mag = z.magnitude();
    let angle = z.arg();
    let newMag = Math.pow(mag, n);
    let newAngle = angle * n;
    return Cis(newAngle).scale(newMag);
  };
  /**
   * Returns the principal value of sqrt(z).
   * @param z {Complex}
   * @returns {Complex}
   */

  const Sqrt = z => {
    // Handle real z specially
    if (Math.abs(z.im) < 1e-17) {
      let r = z.re;

      if (r >= 0) {
        return new Complex(Math.sqrt(r));
      } else {
        return new Complex(0, Math.sqrt(-r));
      }
    }

    let r = z.magnitude();
    let zR = Add(z, new Complex(r)).normalize();
    return zR.scale(Math.sqrt(r));
  };
  /**
   * Branched version of Sqrt(z).
   * @param z {Complex}
   * @param branch {number}
   * @returns {Complex}
   */

  const SqrtBranched = (z, branch = 0) => {
    if (branch % 2 === 0) {
      return Sqrt(z);
    } else {
      return Multiply(new Complex(-1, 0), Sqrt(z));
    }
  };
  /**
   * Principal value of cbrt(z).
   * @param z {Complex}
   * @returns {Complex}
   */

  const Cbrt = z => {
    return PowR(z, 1 / 3);
  };
  /**
   * Multivalued version of Cbrt(z).
   * @param z {Complex}
   * @param branch {number}
   * @returns {Complex}
   */

  const CbrtBranched = (z, branch = 0) => {
    return PowRBranched(z, 1 / 3, branch);
  };

  var PowFunctions = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Pow: Pow,
    PowBranched: PowBranched,
    PowR: PowR,
    PowZ: PowZ,
    PowRBranched: PowRBranched,
    PowN: PowN,
    Sqrt: Sqrt,
    SqrtBranched: SqrtBranched,
    Cbrt: Cbrt,
    CbrtBranched: CbrtBranched
  });

  /*import * as TrigFunctions from "./trig_functions"
  import Exp from './exp'
  import Cis from './cis'
  import * as LnFunctions from "./log"
  import * as HyperbolicTrigFunctions from "./hyperbolic_trig_functions"
  import * as InverseTrigFunctions from "./inverse_trig"
  import * as InverseHyperbolicFunctions from "./inverse_hyperbolic"
  import Gamma from "./gamma"
  import Digamma from "./digamma"
  import Trigamma from "./trigamma"
  import Polygamma from "./polygamma"
  import LnGamma from "./ln_gamma"
  import { Zeta, Eta } from "./zeta"
  import * as MiscSpecial from "./misc_special"
  import * as ExpIntegrals from "./exp_integral"
  import * as TrigIntegrals from "./trig_integrals"
  import * as Erfs from "./erf"*/

  /**
   * Complex functions!
   */

  const ComplexFunctions = Object.freeze(_objectSpread2(_objectSpread2({}, BasicArithmeticFunctions), PowFunctions));

  function _templateObject10() {
    const data = _taggedTemplateLiteral(["psi^{(", ")}\\left(", "\\right)"], ["\\psi^{(", ")}\\\\left(", "\\\\right)"]);

    _templateObject10 = function () {
      return data;
    };

    return data;
  }

  function _templateObject9() {
    const data = _taggedTemplateLiteral(["sqrt[", "]{", "}"], ["\\sqrt[", "]{", "}"]);

    _templateObject9 = function () {
      return data;
    };

    return data;
  }

  function _templateObject8() {
    const data = _taggedTemplateLiteral(["sqrt[3]{", "}"], ["\\sqrt[3]{", "}"]);

    _templateObject8 = function () {
      return data;
    };

    return data;
  }

  function _templateObject7() {
    const data = _taggedTemplateLiteral(["sqrt{", "}"], ["\\sqrt{", "}"]);

    _templateObject7 = function () {
      return data;
    };

    return data;
  }

  function _templateObject6() {
    const data = _taggedTemplateLiteral(["\text{", "}"], ["\\text{", "}"]);

    _templateObject6 = function () {
      return data;
    };

    return data;
  }

  function _templateObject5() {
    const data = _taggedTemplateLiteral(["", "_{", "}left(", "\right)"], ["", "_{", "}\\left(", "\\right)"]);

    _templateObject5 = function () {
      return data;
    };

    return data;
  }

  function _templateObject4() {
    const data = _taggedTemplateLiteral(["", "left(", "\right)"], ["", "\\left(", "\\right)"]);

    _templateObject4 = function () {
      return data;
    };

    return data;
  }

  function _templateObject3() {
    const data = _taggedTemplateLiteral(["", " ", ""]);

    _templateObject3 = function () {
      return data;
    };

    return data;
  }

  function _templateObject2() {
    const data = _taggedTemplateLiteral(["", "^{", "}"]);

    _templateObject2 = function () {
      return data;
    };

    return data;
  }

  function genInfixLatex(operator) {
    return (nodes, params = {}) => {
      return nodes.map(node => node.latex(params)).join(operator);
    };
  }

  function surround(str, leftToken, rightToken) {
    return "\\left\\" + leftToken + " " + str + "\\right\\" + rightToken;
  }

  function multiplicationLatex(nodes, params = {}) {
    return nodes.map(node => node.latex(params)).join('\\cdot ');
  }

  function additionLatex(nodes, params = {}) {
    return nodes.map(node => node.latex(params)).join('+');
  }

  function subtractionLatex(nodes, params = {}) {
    return nodes.map(node => node.latex(params)).join('-');
  }

  function divisionLatex(nodes, params = {}) {
    return "\\frac{".concat(nodes[0].latex(params), "}{").concat(nodes[1].latex(params), "}");
  }

  function exponentiationLatex(nodes, params = {}) {
    return String.raw(_templateObject2(), nodes[0].latex(params), nodes[1].latex(params));
  }

  function genFunctionLatex(functionName) {
    let fName = functionName[0] === '\\' ? functionName : "\\operatorname{".concat(functionName, "}");
    return (nodes, params = {}) => {
      if (nodes.length === 1) {
        if (optionalParentheses.includes(functionName) && !needsParentheses(nodes[0])) {
          return String.raw(_templateObject3(), fName, nodes[0].latex(params));
        }
      }

      return String.raw(_templateObject4(), fName, nodes.map(node => node.latex(params)).join(', '));
    };
  }

  function genFunctionSubscriptLatex(functionName) {
    let fName = functionName[0] === '\\' ? functionName : "\\operatorname{".concat(functionName, "}");
    return (nodes, params = {}) => String.raw(_templateObject5(), fName, nodes[0].latex(params), nodes.slice(1).map(node => node.latex(params)).join(', '));
  }

  function needsParentheses(node) {
    if (node instanceof VariableNode) {
      return false;
    } else return !(node instanceof ConstantNode);
  } // Mapping between inequality operators and their respective latex symbols


  const inequalityOperatorSymbols = {
    '<': '<',
    '>': '>',
    '<=': '\\leq',
    '>=': '\\geq',
    '==': '=',
    '!=': '\\neq'
  }; // Inequality

  function getInequalityOperator(str) {
    let symbol = inequalityOperatorSymbols[str];
    return symbol ? symbol : '';
  } // https://www.latex-tutorial.com/symbols/greek-alphabet/
  // Array.from(document.getElementsByTagName("tr")).forEach(egg => { arr.push(...egg.children[2].innerText.split(' ').filter(egg => egg[0] === '\\')) } )
  // Mapping between greek letters and their latex counterparts


  const _builtinGreekLetters = ["\\alpha", "\\beta", "\\gamma", "\\Gamma", "\\delta", "\\Delta", "\\epsilon", "\\zeta", "\\eta", "\\theta", "\\Theta", "\\iota", "\\kappa", "\\lambda", "\\Lambda", "\\mu", "\\nu", "\\omicron", "\\pi", "\\Pi", "\\rho", "\\sigma", "\\Sigma", "\\tau", "\\upsilon", "\\Upsilon", "\\phi", "\\Phi", "\\chi", "\\psi", "\\Psi", "\\omega", "\\Omega"];
  const optionalParentheses = [];
  ["sin", "cos", "tan"].forEach(trig => {
    ["", "arc"].forEach(arc => {
      ["", "h"].forEach(hyper => {
        optionalParentheses.push(arc + trig + hyper);
      });
    });
  });
  const greekLetterSymbols = {};

  for (let letter of _builtinGreekLetters) {
    greekLetterSymbols[letter.replace(/\\/g, '')] = letter;
  }

  function replaceGreekInName(str) {
    for (let letter in greekLetterSymbols) {
      if (greekLetterSymbols.hasOwnProperty(letter)) {
        if (str === letter) {
          return greekLetterSymbols[letter];
        }
      }
    }

    return str;
  }

  function getVariableLatex(str) {
    let booleanOp = inequalityOperatorSymbols[str];
    if (booleanOp) return booleanOp + ' ';
    let components = str.split('_');
    components = components.map(str => {
      str = replaceGreekInName(str);
      if (str[0] !== '\\' && str.length > 1) str = String.raw(_templateObject6(), str);
      return str;
    });
    return components.reduceRight((a, b) => "".concat(b, "_{").concat(a, "}"));
  }

  function getConstantLatex(obj) {
    let value = obj.value;
    let text = obj.text;
    if (text) return text;
    return value + '';
  }

  function sqrtLatex(nodes, params = {}) {
    return String.raw(_templateObject7(), nodes[0].latex(params));
  }

  function cbrtLatex(nodes, params = {}) {
    return String.raw(_templateObject8(), nodes[0].latex(params));
  }

  function nthRootLatex(nodes, params = {}) {
    return String.raw(_templateObject9(), nodes[0].latex(params), nodes[1].latex(params));
  }

  function polygammaLatex(nodes, params = {}) {
    return String.raw(_templateObject10(), nodes[0].latex(params), nodes[1].latex(params));
  }

  function piecewiseLatex(nodes, params = {}) {
    let pre = "\\begin{cases} ";
    let post;

    if (nodes.length % 2 === 0) {
      post = "0 & \\text{otherwise} \\end{cases}";
    } else {
      post = " \\text{otherwise} \\end{cases}";
    }

    let latex = pre;

    for (let i = 0; i < nodes.length; i += 2) {
      let k = 0;

      for (let j = 0; j <= 1; ++j) {
        let child = nodes[i + j];
        if (!child) continue;
        latex += child.latex(params);

        if (k === 0) {
          latex += " & ";
        } else {
          latex += " \\\\ ";
        }

        k++;
      }
    }

    latex += post;
    return latex;
  }

  function cchainLatex(nodes, params = {}) {
    return nodes.map(child => child.latex(params)).join('');
  }

  function floorLatex(nodes, params = {}) {
    return surround(nodes[0].latex(params), "lfloor", "rfloor");
  }

  function ceilLatex(nodes, params = {}) {
    return surround(nodes[0].latex(params), "lceil", "rceil");
  }

  function fractionalPartLatex(nodes, params = {}) {
    return surround(nodes[0].latex(params), "{", "}");
  }

  function absoluteValueLatex(nodes, params = {}) {
    return surround(nodes[0].latex(params), "lvert", "rvert");
  }

  function unaryMinusLatex(nodes, params = {}) {
    return "-" + nodes[0].latex(params);
  }

  const cmpLatex = {};
  Object.entries(inequalityOperatorSymbols).forEach(([key, value]) => {
    cmpLatex[key] = genInfixLatex(value);
  });
  const logicLatex = {
    not: (nodes, params) => {
      return "\\neg " + nodes[0].latex(params);
    },
    or: (nodes, params) => {
      return nodes.map(node => node.latex(params)).join("\\lor ");
    },
    and: (nodes, params) => {
      return nodes.map(node => node.latex(params)).join("\\land ");
    }
  };
  const LatexMethods = {
    multiplicationLatex,
    additionLatex,
    subtractionLatex,
    divisionLatex,
    exponentiationLatex,
    sqrtLatex,
    cbrtLatex,
    nthRootLatex,
    polygammaLatex,
    piecewiseLatex,
    absoluteValueLatex,
    floorLatex,
    ceilLatex,
    fractionalPartLatex,
    cchainLatex,
    replaceGreekInName,
    getInequalityOperator,
    getVariableLatex,
    genFunctionLatex,
    getConstantLatex,
    genFunctionSubscriptLatex,
    unaryMinusLatex,
    cmpLatex,
    logicLatex
  };

  const Typecasts = {
    RealToComplex: r => new Complex(r),
    RealArrayToComplexArray: arr => arr.map(elem => new Complex(elem)),
    Identity: r => r
  };

  const BooleanFunctions = {
    And: (a, b) => a && b,
    Or: (a, b) => a || b,
    Not: a => !a
  };

  const TYPES$1 = ["bool", "int", "real", "complex", "vec2", "vec3", "vec4", "mat2", "mat3", "mat4", "real_list", "complex_list", "real_interval", "complex_interval"];
  /**
   * Whether a type is valid
   * @param typename {string}
   * @returns {boolean}
   */

  function isValidType$1(typename) {
    return TYPES$1.includes(typename);
  }
  /**
   * Throw a (hopefully helpful) error when a type is invalid
   * @param typename {string}
   * @returns {boolean}
   */


  function throwInvalidType$1(typename) {
    if (!isValidType$1(typename)) {
      let didYouMean = "";
      let distances = TYPES$1.map(type => levenshtein(typename, type));
      let minDistance = Math.min(...distances);

      if (minDistance < 2) {
        didYouMean = "Did you mean " + TYPES$1[distances.indexOf(minDistance)] + "?";
      }

      throw new Error("Unrecognized type ".concat(typename, "; valid types are ").concat(TYPES$1.join(', '), ". ").concat(didYouMean));
    }
  }
  /**
   * Given the name of a function like Grapheme.RealFunctions.Multiply, find and return it. Eventually it will throw an
   * error when no function is found; for now, it will silently fail until I implement all the functions
   * @param str {string}
   * @returns {Function}
   */


  function retrieveEvaluationFunction(str) {
    let fName = str.split('.').pop();
    let res;
    if (str.includes("RealFunctions")) res = RealFunctions[fName];else if (str.includes("RealIntervalFunctions")) res = RealIntervalFunctions[fName];else if (str.includes("ComplexFunctions")) res = ComplexFunctions[fName];else if (str.includes("typecastList")) res = Typecasts[fName];else if (str.includes("BooleanFunctions")) res = BooleanFunctions[fName];
    /*if (!res)
      throw new Error(`Could not find evaluation function ${str}`)*/

    return res;
  }
  /**
   * Abstract class: definition of an evaluable operator
   */


  class OperatorDefinition$1 {
    constructor(params = {}) {
      /**
       * Return type of the operator
       * @type {string}
       */
      this.returns = params.returns || "real";
      throwInvalidType$1(this.returns);
      let evaluate = params.evaluate;
      if (!evaluate) throw new Error("An evaluation instruction must be provided");
      /**
       * String containing the location of the function among RealFunctions, ComplexFunctions, etc. so that it can be
       * compiled to JS. For example, multiplication may have an evaluate of "Grapheme.RealFunctions.Multiply".
       * @type {string}
       */

      this.evaluate = "Grapheme." + evaluate;
      /**
       * The function object which can be called directly instead of looking it up in the list of functions.
       */

      this.evaluateFunc = retrieveEvaluationFunction(this.evaluate);
    }

  }
  /**
   * Definition of an evaluable operator with a specific signature (fixed length and types of arguments)
   */


  class NormalDefinition extends OperatorDefinition$1 {
    constructor(params = {}) {
      super(params);
      let signature = params.signature;
      this.signature = Array.isArray(signature) ? signature : [signature];
      this.signature.forEach(throwInvalidType$1);
    }
    /**
     * Whether a given set of arguments (their types) works
     * @param signature {string[]}
     * @returns {boolean}
     */


    signatureWorks(signature) {
      return castableIntoMultiple(signature, this.signature);
    }
    /**
     * Get the true definition for a given signature. This is an identity operation for NormalDefinitions but requires
     * generating a signature of a specific length for VariadicDefinitions.
     * @param signature
     * @returns {NormalDefinition}
     */


    getDefinition(signature) {
      return this;
    }

  }

  class VariadicDefinition extends OperatorDefinition$1 {
    constructor(params = {}) {
      super(params);
      this.initialSignature = params.initialSignature;
      this.repeatingSignature = params.repeatingSignature;
      this.initialSignature.forEach(throwInvalidType$1);
      this.repeatingSignature.forEach(throwInvalidType$1);
    }

    getSignatureOfLength(len) {
      let signature = this.initialSignature.slice();

      while (signature.length < len) {
        signature.push(...this.repeatingSignature);
      }

      return signature;
    }

    signatureWorks(signature) {
      let len = signature.length;
      if (len < this.initialSignature.length) return false;
      let compSig = this.getSignatureOfLength(len);
      if (!compSig) return false;
      return castableIntoMultiple(signature, compSig);
    }

    getDefinition(signature) {
      let sig = this.getSignatureOfLength(signature.length);
      return new NormalDefinition({
        signature: sig,
        returns: this.returns,
        evaluate: this.evaluate,
        evaluateInterval: this.evaluateInterval,
        desc: this.desc,
        latex: this.latex
      });
    }

  }
  /**
   * Determines whether a given type can be cast into another type.
   * @param from {string}
   * @param to {string}
   * @returns {boolean}
   */


  function castableInto(from, to) {
    if (from === to) return true;
    let casts = TypecastDefinitions[from];
    return casts && casts.some(cast => cast.returns === to);
  }
  /**
   * Determines whether two signatures are compatible, in that every element of one can be cast into the other
   * @param signatureFrom {string[]}
   * @param signatureTo {string[]}
   * @returns {boolean}
   */


  function castableIntoMultiple(signatureFrom, signatureTo) {
    return signatureFrom.length === signatureTo.length && signatureFrom.every((type, index) => castableInto(type, signatureTo[index]));
  }
  /**
   * Special class for typecast definitions (in case we want more metadata for them later
   */


  class TypecastDefinition$1 extends OperatorDefinition$1 {}
  /**
   * Definitions of allowed typecasts. Currently just int -> real, int -> complex, and real -> complex, but we'll soon see
   * other conversions
   */


  const TypecastDefinitions = {
    'int': [new TypecastDefinition$1({
      returns: 'real',
      evaluate: "typecastList.Identity"
    }), new TypecastDefinition$1({
      returns: 'complex',
      evaluate: "typecastList.RealToComplex"
    })],
    'real': [new TypecastDefinition$1({
      returns: 'complex',
      evaluate: "typecastList.RealToComplex"
    })]
  };

  function constructTrigDefinitions(name, funcName) {
    let latex = LatexMethods.genFunctionLatex(funcName.toLowerCase());
    return [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions." + funcName,
      desc: "Returns the " + name + " of the real number x.",
      latex
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions." + funcName,
      desc: "Returns the " + name + " of the complex number z.",
      latex
    })];
  }

  ({
    '*': [new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Multiply",
      intervalEvaluate: "RealIntervalFunctions.Multiply",
      desc: "Returns the product of two integers.",
      latex: LatexMethods.multiplicationLatex
    }), new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Multiply",
      desc: "Returns the product of two real numbers.",
      latex: LatexMethods.multiplicationLatex
    }), new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Multiply",
      desc: "Returns the product of two complex numbers.",
      latex: LatexMethods.multiplicationLatex
    })],
    '+': [new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Add",
      desc: "Returns the sum of two integers.",
      latex: LatexMethods.additionLatex
    }), new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Add",
      desc: "Returns the sum of two real numbers.",
      latex: LatexMethods.additionLatex
    }), new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Add",
      desc: "Returns the sum of two complex numbers.",
      latex: LatexMethods.additionLatex
    }), new NormalDefinition({
      signature: ["vec2", "vec2"],
      returns: "vec2",
      evaluate: "VectorFunctions.Add",
      desc: "Returns the sum of two 2-dimensional vectors.",
      latex: LatexMethods.additionLatex
    })],
    '-': [new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Subtract",
      desc: "Returns the difference of two integers.",
      latex: LatexMethods.subtractionLatex
    }), new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Subtract",
      desc: "Returns the difference of two real numbers.",
      latex: LatexMethods.subtractionLatex
    }), new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Subtract",
      desc: "Returns the difference of two complex numbers.",
      latex: LatexMethods.subtractionLatex
    }), new NormalDefinition({
      signature: ["int"],
      returns: "int",
      evaluate: "RealFunctions.UnaryMinus",
      desc: "Returns the negation of an integer.",
      latex: LatexMethods.unaryMinusLatex
    }), new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.UnaryMinus",
      desc: "Returns the negation of a real number.",
      latex: LatexMethods.unaryMinusLatex
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.UnaryMinus",
      desc: "Returns the negation of a complex number.",
      latex: LatexMethods.unaryMinusLatex
    }), new NormalDefinition({
      signature: ["vec2", "vec2"],
      returns: "vec2",
      evaluate: "VectorFunctions.Subtract",
      desc: "Returns the sum of two 2-dimensional vectors.",
      latex: LatexMethods.subtractionLatex
    })],
    '/': [new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Divide",
      desc: "Returns the quotient of two real numbers.",
      latex: LatexMethods.divisionLatex
    }), new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Divide",
      desc: "Returns the quotient of two real numbers.",
      latex: LatexMethods.divisionLatex
    })],
    "complex": [new NormalDefinition({
      signature: ["real"],
      returns: "complex",
      evaluate: "ComplexFunctions.Construct",
      desc: "complex(a) casts a real number to a complex number."
    }), new NormalDefinition({
      signature: ["real", "real"],
      returns: "complex",
      evaluate: "ComplexFunctions.Construct",
      desc: "complex(a, b) returns the complex number a + bi."
    })],
    "sin": constructTrigDefinitions("sine", "Sin"),
    "cos": constructTrigDefinitions("cosine", "Cos"),
    "tan": constructTrigDefinitions("tangent", "Tan"),
    "csc": constructTrigDefinitions("cosecant", "Csc"),
    "sec": constructTrigDefinitions("secant", "Sec"),
    "cot": constructTrigDefinitions("cotangent", "Cot"),
    "asin": constructTrigDefinitions("inverse sine", "Arcsin"),
    "acos": constructTrigDefinitions("inverse cosine", "Arccos"),
    "atan": constructTrigDefinitions("inverse tangent", "Arctan"),
    "acsc": constructTrigDefinitions("inverse cosecant", "Arccsc"),
    "asec": constructTrigDefinitions("inverse secant", "Arcsec"),
    "acot": constructTrigDefinitions("inverse cotangent", "Arccot"),
    "sinh": constructTrigDefinitions("hyperbolic sine", "Sinh"),
    "cosh": constructTrigDefinitions("hyperbolic cosine", "Cosh"),
    "tanh": constructTrigDefinitions("hyperbolic tangent", "Tanh"),
    "csch": constructTrigDefinitions("hyperbolic cosecant", "Csch"),
    "sech": constructTrigDefinitions("hyperbolic secant", "Sech"),
    "coth": constructTrigDefinitions("hyperbolic cotangent", "Coth"),
    "asinh": constructTrigDefinitions("inverse hyperbolic sine", "Arcsinh"),
    "acosh": constructTrigDefinitions("inverse hyperbolic cosine", "Arccosh"),
    "atanh": constructTrigDefinitions("inverse hyperbolic tangent", "Arctanh"),
    "acsch": constructTrigDefinitions("inverse hyperbolic cosecant", "Arccsch"),
    "asech": constructTrigDefinitions("inverse hyperbolic secant", "Arcsech"),
    "acoth": constructTrigDefinitions("inverse hyperbolic cotangent", "Arccoth"),
    "Im": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Im",
      desc: "Im(r) returns the imaginary part of r, i.e. 0.",
      latex: LatexMethods.genFunctionLatex("Im")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "real",
      evaluate: "ComplexFunctions.Im",
      desc: "Im(z) returns the imaginary part of z.",
      latex: LatexMethods.genFunctionLatex("Im")
    })],
    "Re": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Re",
      desc: "Re(r) returns the real part of r, i.e. r.",
      latex: LatexMethods.genFunctionLatex("Re")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "real",
      evaluate: "ComplexFunctions.Re",
      desc: "Re(z) returns the real part of z.",
      latex: LatexMethods.genFunctionLatex("Re")
    })],
    "gamma": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Gamma",
      desc: "Evaluates the gamma function at r.",
      latex: LatexMethods.genFunctionLatex("\\Gamma")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Gamma",
      desc: "Evaluates the gamma function at z.",
      latex: LatexMethods.genFunctionLatex("\\Gamma")
    })],
    '^': [new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Pow",
      desc: "Evaluates a^b, undefined for negative b. If you want to evaluate something like a^(1/5), use pow_rational(a, 1, 5).",
      latex: LatexMethods.exponentiationLatex
    }), new NormalDefinition({
      signature: ["complex", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Pow",
      desc: "Returns the principal value of z^w.",
      latex: LatexMethods.exponentiationLatex
    })],
    "digamma": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Digamma",
      desc: "Evaluates the digamma function at r.",
      latex: LatexMethods.genFunctionLatex("\\psi^{(0})")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Digamma",
      desc: "Evaluates the digamma function at z.",
      latex: LatexMethods.genFunctionLatex("\\psi^{(0})")
    })],
    "trigamma": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Trigamma",
      desc: "Evaluates the trigamma function at r.",
      latex: LatexMethods.genFunctionLatex("\\psi^{(1})")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Trigamma",
      desc: "Evaluates the trigamma function at z.",
      latex: LatexMethods.genFunctionLatex("\\psi^{(1})")
    })],
    "polygamma": [new NormalDefinition({
      signature: ["int", "real"],
      returns: "real",
      evaluate: "RealFunctions.Polygamma",
      desc: "polygamma(n, r) evaluates the nth polygamma function at r.",
      latex: LatexMethods.polygammaLatex
    }), new NormalDefinition({
      signature: ["int", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Polygamma",
      desc: "polygamma(n, z) evaluates the nth polygamma function at z.",
      latex: LatexMethods.polygammaLatex
    })],
    "sqrt": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Sqrt",
      desc: "sqrt(r) returns the square root of r. NaN if r < 0.",
      latex: LatexMethods.sqrtLatex
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Sqrt",
      desc: "sqrt(z) returns the principal branch of the square root of z.",
      latex: LatexMethods.sqrtLatex
    })],
    "cbrt": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Cbrt",
      desc: "cbrt(r) returns the cube root of r. NaN if r < 0.",
      latex: LatexMethods.cbrtLatex
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Cbrt",
      desc: "cbrt(z) returns the principal branch of the cube root of z.",
      latex: LatexMethods.cbrtLatex
    })],
    "ln": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Ln",
      desc: "ln(r) returns the natural logarithm of r. NaN if r < 0.",
      latex: LatexMethods.genFunctionLatex("ln")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Ln",
      desc: "ln(z) returns the principal value of the natural logarithm of z.",
      latex: LatexMethods.genFunctionLatex("ln")
    })],
    "log10": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Log10",
      desc: "log10(r) returns the base-10 logarithm of r. NaN if r < 0.",
      latex: LatexMethods.genFunctionLatex("log_{10}")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Log10",
      desc: "log10(z) returns the principal value of base-10 logarithm of z.",
      latex: LatexMethods.genFunctionLatex("log_{10}")
    })],
    "log2": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Log2",
      desc: "log2(r) returns the base-2 logarithm of r. NaN if r < 0.",
      latex: LatexMethods.genFunctionLatex("log_{2}")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Log2",
      desc: "log2(z) returns the principal value of base-2 logarithm of z.",
      latex: LatexMethods.genFunctionLatex("log_{2}")
    })],
    "piecewise": [new VariadicDefinition({
      initialSignature: [],
      repeatingSignature: ["real", "bool"],
      returns: "real",
      evaluate: "RealFunctions.Piecewise",
      desc: "piecewise(a, cond1, b, cond2 ... ) returns a if cond1 is true, b if cond2 is true, and so forth, and 0 otherwise.",
      latex: LatexMethods.piecewiseLatex
    }), new VariadicDefinition({
      initialSignature: ["real"],
      repeatingSignature: ["bool", "real"],
      returns: "real",
      evaluate: "RealFunctions.Piecewise",
      desc: "piecewise(a, cond1, b, cond2, ..., default) returns a if cond1 is true, b if cond2 is true, and so forth, and default otherwise.",
      latex: LatexMethods.piecewiseLatex
    }), new VariadicDefinition({
      initialSignature: [],
      repeatingSignature: ["complex", "bool"],
      returns: "complex",
      evaluate: "ComplexFunctions.Piecewise",
      desc: "piecewise(a, cond1, b, cond2 ... ) returns a if cond1 is true, b if cond2 is true, and so forth, and 0 otherwise.",
      latex: LatexMethods.piecewiseLatex
    }), new VariadicDefinition({
      initialSignature: ["complex"],
      repeatingSignature: ["bool", "complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Piecewise",
      desc: "piecewise(a, cond1, b, cond2, ..., default) returns a if cond1 is true, b if cond2 is true, and so forth, and default otherwise.",
      latex: LatexMethods.piecewiseLatex
    })],
    "ifelse": [new NormalDefinition({
      signature: ["real", "bool", "real"],
      returns: "real",
      evaluate: "RealFunctions.Piecewise",
      desc: "ifelse(a, cond, b) returns a if cond is true, and b otherwise",
      latex: LatexMethods.piecewiseLatex
    }), new NormalDefinition({
      signature: ["complex", "bool", "complex"],
      returns: "real",
      evaluate: "RealFunctions.Piecewise",
      desc: "ifelse(a, cond, b) returns a if cond is true, and b otherwise",
      latex: LatexMethods.piecewiseLatex
    })],
    "cchain": [new VariadicDefinition({
      initialSignature: ["real"],
      repeatingSignature: ["int", "real"],
      returns: "bool",
      evaluate: "RealFunctions.CChain",
      desc: "Used internally to describe comparison chains (e.x. 0 < a < b < 1)",
      latex: LatexMethods.cchainLatex
    })],
    "<": [new NormalDefinition({
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.LessThan",
      desc: "Returns a < b.",
      latex: LatexMethods.cmpLatex['<']
    })],
    ">": [new NormalDefinition({
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.GreaterThan",
      desc: "Returns a > b.",
      latex: LatexMethods.cmpLatex['>']
    })],
    "<=": [new NormalDefinition({
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.LessEqualThan",
      desc: "Returns a <= b.",
      latex: LatexMethods.cmpLatex['<=']
    })],
    ">=": [new NormalDefinition({
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.GreaterEqualThan",
      desc: "Returns a >= b.",
      latex: LatexMethods.cmpLatex['>=']
    })],
    "==": [new NormalDefinition({
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.Equal",
      desc: "Returns a == b.",
      latex: LatexMethods.cmpLatex['==']
    })],
    "!=": [new NormalDefinition({
      signature: ["real", "real"],
      returns: "bool",
      evaluate: "RealFunctions.Cmp.NotEqual",
      desc: "Returns a != b.",
      latex: LatexMethods.cmpLatex['!=']
    })],
    "euler_phi": [new NormalDefinition({
      signature: ["int"],
      returns: "int",
      evaluate: "RealFunctions.EulerPhi",
      desc: "Returns Euler's totient function evaluated at an integer n.",
      latex: LatexMethods.genFunctionLatex('\\phi')
    })],
    "floor": [new NormalDefinition({
      signature: ["real"],
      returns: "int",
      evaluate: "RealFunctions.Floor",
      desc: "Returns the floor of a real number r.",
      latex: LatexMethods.floorLatex
    })],
    "ceil": [new NormalDefinition({
      signature: ["real"],
      returns: "int",
      evaluate: "RealFunctions.Ceil",
      desc: "Returns the ceiling of a real number r.",
      latex: LatexMethods.ceilLatex
    })],
    "riemann_zeta": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Zeta",
      desc: "Returns the Riemann zeta function of a real number r.",
      latex: LatexMethods.genFunctionLatex("\\zeta")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Zeta",
      desc: "Returns the Riemann zeta function of a complex number r.",
      latex: LatexMethods.genFunctionLatex("\\zeta")
    })],
    "dirichlet_eta": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Eta",
      desc: "Returns the Dirichlet eta function of a real number r.",
      latex: LatexMethods.genFunctionLatex("\\eta")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Eta",
      desc: "Returns the Dirichlet eta function of a complex number r.",
      latex: LatexMethods.genFunctionLatex("\\eta")
    })],
    "mod": [new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Mod",
      desc: "Returns a modulo b.",
      latex: LatexMethods.genFunctionLatex("mod")
    }), new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Mod",
      desc: "Returns a modulo b.",
      latex: LatexMethods.genFunctionLatex("mod")
    })],
    "frac": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Frac",
      desc: "Returns the fractional part of x.",
      latex: LatexMethods.fractionalPartLatex
    })],
    "sign": [new NormalDefinition({
      signature: ["real"],
      returns: "int",
      evaluate: "RealFunctions.Sign",
      desc: "Returns the sign of x: 1 if x > 0, 0 if x == 0 and -1 otherwise.",
      latex: LatexMethods.genFunctionLatex("sgn")
    })],
    "round": [new NormalDefinition({
      signature: ["real"],
      returns: "int",
      evaluate: "RealFunctions.Round",
      desc: "Returns the nearest integer to x. Note that if |x| > " + Number.MAX_SAFE_INTEGER + " this may not be accurate.",
      latex: LatexMethods.genFunctionLatex("round")
    })],
    "trunc": [new NormalDefinition({
      signature: ["real"],
      returns: "int",
      evaluate: "RealFunctions.Trunc",
      desc: "Removes the fractional part of x.",
      latex: LatexMethods.genFunctionLatex("trunc")
    })],
    "is_finite": [new NormalDefinition({
      signature: ["real"],
      returns: "bool",
      evaluate: "RealFunctions.IsFinite",
      desc: "Returns true if the number is finite and false if it is -Infinity, Infinity, or NaN",
      latex: LatexMethods.genFunctionLatex("isFinite")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "bool",
      evaluate: "ComplexFunctions.IsFinite",
      desc: "Returns true if the number is finite and false if it is undefined or infinite",
      latex: LatexMethods.genFunctionLatex("isFinite")
    })],
    "not": [new NormalDefinition({
      signature: ["bool"],
      returns: "bool",
      evaluate: "BooleanFunctions.Not",
      desc: "Returns the logical negation of b.",
      latex: LatexMethods.logicLatex.not
    })],
    "and": [new NormalDefinition({
      signature: ["bool", "bool"],
      returns: "bool",
      evaluate: "BooleanFunctions.And",
      desc: "Returns true if a and b are true, and false otherwise.",
      latex: LatexMethods.logicLatex.and
    })],
    "or": [new NormalDefinition({
      signature: ["bool", "bool"],
      returns: "bool",
      evaluate: "BooleanFunctions.Or",
      desc: "Returns true if a or b are true, and false otherwise.",
      latex: LatexMethods.logicLatex.or
    })],
    "Ei": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Ei",
      desc: "Returns the exponential integral of x.",
      latex: LatexMethods.genFunctionLatex("Ei")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Ei",
      desc: "Returns the exponential integral of z.",
      latex: LatexMethods.genFunctionLatex("Ei")
    })],
    "li": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Li",
      desc: "Returns the logarithmic integral of x.",
      latex: LatexMethods.genFunctionLatex("li")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Li",
      desc: "Returns the logarithmic integral of z.",
      latex: LatexMethods.genFunctionLatex("li")
    })],
    "sinc": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Sinc",
      desc: "Returns the sinc function of x.",
      latex: LatexMethods.genFunctionLatex("sinc")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Sinc",
      desc: "Returns the sinc function of x.",
      latex: LatexMethods.genFunctionLatex("sinc")
    })],
    "Si": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Si",
      desc: "Returns the sine integral of x.",
      latex: LatexMethods.genFunctionLatex("Si")
    })],
    "Ci": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Ci",
      desc: "Returns the cosine integral of x.",
      latex: LatexMethods.genFunctionLatex("Ci")
    })],
    "erf": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Erf",
      desc: "Returns the error function of x.",
      latex: LatexMethods.genFunctionLatex("erf")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Erf",
      desc: "Returns the error function of z.",
      latex: LatexMethods.genFunctionLatex("erf")
    })],
    "erfc": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Erfc",
      desc: "Returns the complementary error function of x.",
      latex: LatexMethods.genFunctionLatex("erfc")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Erfc",
      desc: "Returns the complementary error function of z.",
      latex: LatexMethods.genFunctionLatex("erfc")
    })],
    "inverse_erf": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.InverseErf",
      desc: "Returns the inverse error function of x.",
      latex: LatexMethods.genFunctionLatex("erf^{-1}")
    })],
    "inverse_erfc": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.InverseErfc",
      desc: "Returns the inverse complementary error function of x.",
      latex: LatexMethods.genFunctionLatex("erfc^{-1}")
    })],
    "gcd": [new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Gcd",
      desc: "Returns the greatest common divisor of a and b.",
      latex: LatexMethods.genFunctionLatex("gcd")
    })],
    "lcm": [new NormalDefinition({
      signature: ["int", "int"],
      returns: "int",
      evaluate: "RealFunctions.Lcm",
      desc: "Returns the least common multiple of a and b.",
      latex: LatexMethods.genFunctionLatex("lcm")
    })],
    "fresnel_S": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.FresnelS",
      desc: "Return the integral from 0 to x of sin(x^2).",
      latex: LatexMethods.genFunctionLatex("S")
    })],
    "fresnel_C": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.FresnelC",
      desc: "Return the integral from 0 to x of cos(x^2).",
      latex: LatexMethods.genFunctionLatex("C")
    })],
    "product_log": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.ProductLog",
      desc: "Return the principal branch of the product log of x (also known as the Lambert W function or W0(x)).",
      latex: LatexMethods.genFunctionLatex("W_0")
    }), new NormalDefinition({
      signature: ["int", "real"],
      returns: "real",
      evaluate: "RealFunctions.ProductLogBranched",
      desc: "Return the nth branch of the product log of x (also known as the Lambert W function or W0(x)). n can be 0 or -1.",
      latex: LatexMethods.genFunctionSubscriptLatex("W")
    })],
    "elliptic_K": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.EllipticK",
      desc: "Return the complete elliptic integral K(m) with parameter m = k^2.",
      latex: LatexMethods.genFunctionLatex("K")
    })],
    "elliptic_E": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.EllipticE",
      desc: "Return the complete elliptic integral E(m) with parameter m = k^2.",
      latex: LatexMethods.genFunctionLatex("E")
    })],
    "agm": [new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Agm",
      desc: "Return the arithmetic geometric mean of a and b.",
      latex: LatexMethods.genFunctionLatex("agm")
    })],
    "abs": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Abs",
      desc: "Return the absolute value of r.",
      latex: LatexMethods.absoluteValueLatex
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "real",
      evaluate: "ComplexFunctions.Abs",
      desc: "Return the magnitude of z.",
      latex: LatexMethods.absoluteValueLatex
    })],
    "vec2": [new NormalDefinition({
      signature: ["real", "real"],
      returns: "vec2",
      evaluate: "VectorFunctions.Construct",
      desc: "Construct a new vec2."
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "vec2",
      evaluate: "VectorFunctions.FromComplex",
      desc: "Construct a new vec2 from the real and imaginary components of a complex number."
    })],
    "vec": [new NormalDefinition({
      signature: ["real", "real"],
      returns: "vec2",
      evaluate: "VectorFunctions.Construct",
      desc: "Construct a new vec2."
    })],
    "dot": [new NormalDefinition({
      signature: ["vec2", "vec2"],
      returns: "real",
      evaluate: "VectorFunctions.Dot",
      desc: "Find the dot product of vectors v and w."
    })],
    "prime_count": [new NormalDefinition({
      signature: ["int"],
      returns: "int",
      evaluate: "RealFunctions.PrimeCount",
      desc: "Find the number of primes below n.",
      latex: LatexMethods.genFunctionLatex("\\pi")
    })],
    "cis": [new NormalDefinition({
      signature: ["real"],
      returns: "complex",
      evaluate: "ComplexFunctions.Cis",
      desc: "Returns cos(theta) + i sin(theta).",
      latex: LatexMethods.genFunctionLatex("cis")
    })],
    "Cl2": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Cl2",
      desc: "Evaluates the Clausen function of x.",
      latex: LatexMethods.genFunctionLatex("Cl_2")
    })],
    "beta": [new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Beta",
      desc: "Evaluates the beta function at a,b.",
      latex: LatexMethods.genFunctionLatex("B")
    })],
    "exp": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.Exp",
      latex: LatexMethods.genFunctionLatex("exp")
    }), new NormalDefinition({
      signature: ["complex"],
      returns: "complex",
      evaluate: "ComplexFunctions.Exp",
      latex: LatexMethods.genFunctionLatex("exp")
    })],
    "ln_gamma": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.LnGamma",
      latex: LatexMethods.genFunctionLatex("\\ln \\Gamma")
    })],
    "barnes_G": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.BarnesG",
      latex: LatexMethods.genFunctionLatex("G")
    })],
    "ln_barnes_G": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.LnBarnesG",
      latex: LatexMethods.genFunctionLatex("\\ln \\operatorname{G}")
    })],
    "K_function": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.KFunction",
      latex: LatexMethods.genFunctionLatex("K")
    })],
    "ln_K_function": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.LnKFunction",
      latex: LatexMethods.genFunctionLatex("\\ln \\operatorname{K}")
    })],
    "bessel_J": [new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.BesselJ",
      latex: LatexMethods.genFunctionSubscriptLatex("J")
    })],
    "bessel_Y": [new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.BesselY",
      latex: LatexMethods.genFunctionSubscriptLatex("Y")
    })],
    "bessel_J0": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.BesselJ0",
      latex: LatexMethods.genFunctionLatex("J_0")
    })],
    "bessel_Y0": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.BesselY0",
      latex: LatexMethods.genFunctionLatex("Y_0")
    })],
    "bessel_J1": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.BesselJ1",
      latex: LatexMethods.genFunctionLatex("J_1")
    })],
    "bessel_Y1": [new NormalDefinition({
      signature: ["real"],
      returns: "real",
      evaluate: "RealFunctions.BesselY1",
      latex: LatexMethods.genFunctionLatex("Y_1")
    })],
    "spherical_bessel_J": [new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.SphericalBesselJ",
      latex: LatexMethods.genFunctionSubscriptLatex("j")
    })],
    "spherical_bessel_Y": [new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.SphericalBesselY",
      latex: LatexMethods.genFunctionSubscriptLatex("y")
    })],
    "polylog": [new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      evaluate: "RealFunctions.Polylogarithm",
      latex: LatexMethods.genFunctionSubscriptLatex("Li")
    })]
  });

  function initTypecasts(TypecastDefinition, typecastList, typecastDict) {
    let intToReal = new TypecastDefinition({
      from: "int",
      to: "real",
      evaluators: {
        generic: "identity" // Identity conversion

      }
    });

    let doubleToComplex = x => new Complex(x, 0);

    let intToComplex = new TypecastDefinition({
      from: "int",
      to: "complex",
      evaluators: {
        generic: doubleToComplex
      }
    });
    let realToComplex = new TypecastDefinition({
      from: "real",
      to: "complex",
      evaluators: {
        generic: doubleToComplex
      }
    });
    typecastList.push(intToReal, intToComplex, realToComplex); // For simplicity, we convert the list of all typecasts into a dict of from -> to, so that it can be very quickly
    // searched during signature matching.

    for (const typecast of typecastList) {
      let from = typecast.from;

      if (typecastDict[from]) {
        typecastDict[from].push(typecast);
      } else {
        typecastDict[from] = [typecast];
      }
    }
  }

  const TYPES = {
    "bool": {
      typecheck: {
        generic: {
          f: x => typeof x === "boolean"
        }
      }
    },
    "int": {
      typecheck: {
        generic: {
          f: Number.isInteger
        }
      }
    },
    "real": {
      typecheck: {
        generic: {
          f: x => typeof x === "number"
        }
      }
    },
    "complex": true,
    "null": true
  };
  /**
   * Get typecast definition between two types--if the definition exists. Can also be used as a boolean test for whether
   * two types are castable. The list of allowed casts is generated in typecasts.js
   * @param from {string}
   * @param to {string}
   * @returns {TypecastDefinition|*}
   */

  function getCast(from, to) {
    let candidates = typecastDict[from];
    if (!candidates) return;

    for (let i = candidates.length - 1; i >= 0; --i) {
      let candidate = candidates[i];
      if (candidate.to === to) return candidate;
    }
  }
  function canCast(from, to) {
    return from === to || !!getCast(from, to);
  }
  /**
   * Whether a type is valid
   * @param typename {string}
   * @returns {boolean}
   */

  function isValidType(typename) {
    return typeof typename === "string" && typename in TYPES;
  }
  /**
   * Throw a (hopefully helpful) error when a type is invalid
   * @param typename {string}
   * @returns {boolean}
   */


  function throwInvalidType(typename) {
    if (!isValidType(typename)) {
      if (typeof typename !== "string") throw new Error("Non-string passed as typename");
      let didYouMean = "";
      let minDistance = Infinity,
          closestType;
      Object.keys(TYPES).forEach(type => {
        let dist = levenshtein(typename, type);

        if (dist < minDistance) {
          minDistance = dist;
          closestType = type;
        }
      });

      if (minDistance < 2) {
        didYouMean = ". Did you mean " + closestType + "?";
      } else {
        didYouMean = "; valid types are ".concat(Object.keys(TYPES).join(', '), ".");
      }

      throw new Error("Unrecognized type \"".concat(typename, "\"").concat(didYouMean));
    }
  }
  /**
   * Abstract class: definition of an evaluable operator
   */


  class OperatorDefinition {
    constructor(params = {}) {
      var _params$evaluators;

      throwInvalidType(this.returnType = params.returnType);
      /**
       * Mapping of evaluation mode -> evaluator which can evaluate the operator in that mode. "generic" accepts arguments
       * of various types--that is the intent
       * @type {{}}
       */

      this.evaluators = (_params$evaluators = params.evaluators) !== null && _params$evaluators !== void 0 ? _params$evaluators : {};
    }

  }
  /**
   * Taking in a signature argument like "real", ["real", "complex"], or undefined and converting it to a normalized form
   * @param obj {string[]|string|undefined}
   * @returns {string[]}
   */

  function signatureNormalize(obj) {
    if (Array.isArray(obj)) {
      obj.forEach(throwInvalidType);
      return obj;
    } else if (!obj) {
      return [];
    } else {
      throwInvalidType(obj);
      return [obj];
    }
  }

  const specialEvaluators = {
    identity: {
      type: "special",
      name: "identity",
      f: x => x
    },
    addition: {
      type: "special_binary",
      binary: '+',
      f: (a, b) => a + b
    },
    subtraction: {
      type: "special_binary",
      binary: '-',
      f: (a, b) => a - b
    },
    unary_subtraction: {
      type: "special",
      f: a => -a
    },
    multiplication: {
      type: "special_binary",
      binary: '*',
      f: (a, b) => a * b
    },
    division: {
      type: "special_binary",
      binary: '/',
      f: (a, b) => a / b
    },
    pow: {
      type: "special",
      name: "pow",
      f: Math.pow
    }
  };
  /**
   * Given an evaluator description, return a normalized evaluator of the form { type: (str), f: (function) } and
   * potentially more information that the compiler can use to optimize the evaluator (identity, piecewiseness, etc.)
   * @param obj
   */

  function evaluatorNormalize(obj) {
    if (typeof obj === "string") {
      let evaluator = specialEvaluators[obj];
      if (!obj) throw new Error("Unknown special evaluator ".concat(obj));
      return evaluator;
    } else if (typeof obj === "function") {
      return {
        type: "normal",
        f: obj
      };
    }

    return obj;
  }
  /**
   * Normalize the form of evaluators in an evaluator dictionary. Modifies the passed object.
   * @param obj {{}}
   */


  function evaluatorsNormalize(obj) {
    for (let key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      obj[key] = evaluatorNormalize(obj[key]);
    }

    return obj;
  }
  /**
   * Operator with a fixed type signature and type output
   */


  class FixedOperatorDefinition extends OperatorDefinition {
    constructor(params = {}) {
      super(params);
      this.signature = signatureNormalize(params.signature);
      this.evaluators = evaluatorsNormalize(params.evaluators);
    }

    argCount() {
      return this.signature.length;
    }
    /**
     * Return whether a given signature is compatible with this operator definition
     * @param signature {string[]}
     * @returns {boolean}
     */


    signatureWorks(signature) {
      let match = this.signature;
      if (match.length !== signature.length) return false;
      return match.every((type, i) => canCast(signature[i], type));
    }

  } // List of typecasts and dict from (source type) -> (dst type)

  let typecastList = [],
      typecastDict = {};

  class TypecastDefinition extends FixedOperatorDefinition {
    constructor(params = {}) {
      let from = params.from;
      let to = params.to;
      super(_objectSpread2(_objectSpread2({}, params), {}, {
        returnType: to,
        signature: from
      }));
      this.from = from;
      this.to = to;
    }

  }

  initTypecasts(TypecastDefinition, typecastList, typecastDict);

  const Operators = {};
  /**
   * Find the operator of a given name which matches a signature
   * @param name {string}
   * @param signature {string[]}
   */

  function resolveOperator(name, signature) {
    let candidates = Operators[name];
    if (!candidates) return;

    for (let candidate of candidates) {
      if (candidate.signatureWorks(signature)) {
        return candidate;
      }
    }
  }
  /**
   * Given the name of an operator and its definition, place it into the register of operators
   * @param name {string}
   * @param ops {OperatorDefinition[]}
   */

  function registerOperator(name, ...ops) {
    if (Operators[name]) {
      Operators[name].push(...ops);
    } else {
      Operators[name] = ops;
    }
  }

  let intAdd = new FixedOperatorDefinition({
    signature: ["int", "int"],
    returnType: "int",
    evaluators: {
      generic: "addition"
    }
  });
  let intSub = new FixedOperatorDefinition({
    signature: ["int", "int"],
    returnType: "int",
    evaluators: {
      generic: "subtraction"
    }
  });
  let unaryIntSub = new FixedOperatorDefinition({
    signature: ["int"],
    returnType: "int",
    evaluators: {
      generic: "unary_subtraction"
    }
  });
  let intMul = new FixedOperatorDefinition({
    signature: ["int", "int"],
    returnType: "int",
    evaluators: {
      generic: "multiplication"
    }
  });
  let intPow = new FixedOperatorDefinition({
    signature: ["int", "int"],
    returnType: "int",
    evaluators: {
      generic: Math.pow
    }
  });
  registerOperator('*', intMul);
  registerOperator('+', intAdd);
  registerOperator('-', intSub);
  registerOperator('-', unaryIntSub);
  registerOperator('^', intPow);
  let realAdd = new FixedOperatorDefinition({
    signature: ["real", "real"],
    returnType: "real",
    evaluators: {
      generic: "addition"
    }
  });
  let realSub = new FixedOperatorDefinition({
    signature: ["real", "real"],
    returnType: "real",
    evaluators: {
      generic: "subtraction"
    }
  });
  let unaryRealSub = new FixedOperatorDefinition({
    signature: ["real"],
    returnType: "real",
    evaluators: {
      generic: "unary_subtraction"
    }
  });
  let realMul = new FixedOperatorDefinition({
    signature: ["real", "real"],
    returnType: "real",
    evaluators: {
      generic: "multiplication"
    }
  });
  let realDiv = new FixedOperatorDefinition({
    signature: ["real", "real"],
    returnType: "real",
    evaluators: {
      generic: "division"
    }
  });
  let realPow = new FixedOperatorDefinition({
    signature: ["real", "real"],
    returnType: "real",
    evaluators: {
      generic: Math.pow
    }
  });
  registerOperator('*', realMul);
  registerOperator('+', realAdd);
  registerOperator('-', realSub);
  registerOperator('-', unaryRealSub);
  registerOperator('/', realDiv);
  registerOperator('^', realPow);

  class EvaluationError extends Error {
    constructor(message) {
      super(message);
      this.name = "EvaluationError";
    }

  }
  /**
   * Abstract base class for AST nodes
   */


  class ASTNode {
    applyAll(func, onlyGroups = true, childrenFirst = false, depth = 0) {
      if (!onlyGroups) func(this, depth);
    }

    nodeType() {
      return "node";
    }

    usedVariables() {
      // Map var -> type
      let types = new Map();
      this.applyAll(node => {
        if (node.nodeType() === "var") {
          if (!types.has(node.name)) types.set(node.name, node.type);
        }
      });
      return types;
    }

  }
  /**
   * Base class for a node in a Grapheme expression. Has children and a string type (returnType).
   *
   * A node can be one of a variety of types. A plain ASTNode signifies grouping, i.e. parentheses. Extended ASTNodes,
   * like constant nodes and operator nodes have more complexity.
   */

  class ASTGroup extends ASTNode {
    /**
     * A relatively simple base constructor, taking in only the children and the return type, which is "any" by default.
     * @param children {Array}
     * @param type {string}
     */
    constructor(children = [], type = null) {
      super();
      /**
       * Children of this node, which should also be ASTNodes
       * @type {Array}
       */

      this.children = children;
      /**
       * Type of this ASTNode (real, complex, etc.)
       * @type {string}
       */

      this.type = type;
    }
    /**
     * Apply a function to this node and all of its children, recursively.
     * @param func {Function} The callback function. We call it each time with (node, depth) as arguments
     * @param onlyGroups
     * @param childrenFirst {boolean} Whether to call the callback function for each child first, or for the parent first.
     * @param depth {number}
     * @returns {ASTNode}
     */


    applyAll(func, onlyGroups = false, childrenFirst = false, depth = 0) {
      if (!childrenFirst) func(this, depth);
      let children = this.children;

      for (let i = 0; i < children.length; ++i) {
        let child = children[i];

        if (child instanceof ASTNode) {
          child.applyAll(func, onlyGroups, childrenFirst, depth + 1);
        }
      }

      if (childrenFirst) func(this, depth);
      return this;
    }
    /**
     * Evaluate the value of this node using a given scope, which gives the evaluation parameters (values of the
     * variables) among other things
     * @param scope {{}}
     * @returns {*}
     */


    evaluate(scope) {
      return this.children[0].evaluate(scope);
    }
    /**
     * Given the types of variables, construct function definitions, et cetera
     * @param typeInfo
     */


    resolveTypes(typeInfo) {
      this.children.forEach(child => child.resolveTypes(typeInfo));
      this.type = this.children[0].type;
    }

    nodeType() {
      return "group";
    }

  }
  class VariableNode extends ASTNode {
    constructor(name, type = null) {
      super();
      this.name = name;
      this.type = type;
    }

    evaluate(scope) {
      let val = scope.variables[this.name];
      if (!val) throw new EvaluationError("Variable ".concat(this.name, " was not found in the scope"));
      return val;
    }

    resolveTypes(typeInfo) {
      let type = typeInfo[this.name];
      this.type = type !== null && type !== void 0 ? type : "real";
    }

    nodeType() {
      return "var";
    }

  }
  class OperatorNode extends ASTGroup {
    constructor(operator) {
      super();
      this.op = operator;
      this.definition = null; // One of the definitions in operators.js is actually going to be used to evaluate the node
    }

    getChildrenSignature() {
      return this.children.map(child => child.type);
    }

    evaluate(scope) {
      if (!this.definition) throw new EvaluationError("Evaluation definition not generated for operator node");
      const children = this.children;
      let params = this.children.map(child => child.evaluate(scope));
      const definition = this.definition,
            sig = definition.signature; // Cast arguments appropriately

      params.forEach((param, i) => {
        let dstType = sig[i];
        let srcType = children[i].type;
        if (dstType !== srcType) params[i] = getCast(srcType, dstType)(param);
      });
      return definition.evaluators.generic.f.apply(null, params);
    }

    resolveTypes(typeInfo = {}) {
      // We need to find the function definition that matches
      this.children.forEach(child => child.resolveTypes(typeInfo));
      let signature = this.getChildrenSignature();
      let definition = resolveOperator(this.op, signature);
      if (!definition) throw new Error("Could not find a suitable definition for operator " + this.op + "(" + signature.join(', ') + ').');
      this.definition = definition;
      this.type = definition.returnType;
      return this;
    }

    nodeType() {
      return "op";
    }

  }
  class ConstantNode extends ASTNode {
    constructor(value, text, type = "real") {
      super();
      this.value = value;
      this.text = text;
      this.type = type;
    }

    evaluate(scope) {
      return this.value;
    }

    resolveTypes(typeInfo) {}

    nodeType() {
      return "const";
    }

  }

  /**
   * In this file, we convert strings representing expressions in Grapheme into their ASTNode counterparts. For example,
   * x^2 is compiled to OperatorNode{operator=^, children=[VariableNode{name="x"}, ConstantNode{value="2"}]}
   */
  const OperatorSynonyms = {
    'arcsinh': 'asinh',
    'arsinh': 'asinh',
    'arccosh': 'acosh',
    'arcosh': 'acosh',
    'arctanh': 'atanh',
    'artanh': 'atanh',
    'arcsech': 'asech',
    'arccsch': 'acsch',
    'arccoth': 'acoth',
    'arsech': 'asech',
    'arcsch': 'acsch',
    'arcoth': 'acoth',
    'arcsin': 'asin',
    'arsin': 'asin',
    'arccos': 'acos',
    'arcos': 'acos',
    'arctan': 'atan',
    'artan': 'atan',
    'arcsec': 'asec',
    'arccsc': 'acsc',
    'arccot': 'acot',
    'arsec': 'asec',
    'arcsc': 'acsc',
    'arcot': 'acot',
    'log': 'ln'
  };
  const operator_regex = /^[*\-\/+^]|^[<>]=?|^[=!]=|^and\s+|^or\s+/;
  const function_regex = /^([a-zA-Z_][a-zA-Z0-9_]*)\(/;
  const constant_regex = /^[0-9]*\.?[0-9]*e?[0-9]+/;
  const variable_regex = /^[a-zA-Z_][a-zA-Z0-9_]*/;
  const paren_regex = /^[()\[\]]/;
  const comma_regex = /^,/;
  const string_regex = /^"(?:[^"\\]|\\.)*"/;
  /**
   * Take a string and check whether its parentheses are balanced, throwing a ParserError if not.
   * @param string
   */

  function checkParensBalanced(string) {
    // Stack of parentheses
    const stack = [];
    let i = 0;
    let err = false;

    outer: for (; i < string.length; ++i) {
      const chr = string[i];

      switch (chr) {
        case '(':
        case '[':
          stack.push(chr);
          break;

        case ')':
        case ']':
          if (stack.length === 0) {
            err = true;
            break outer;
          }

          if (chr === ')') {
            let pop = stack.pop();

            if (pop !== '(') {
              err = true;
              break outer;
            }
          } else {
            let pop = stack.pop();

            if (pop !== '[') {
              err = true;
              break outer;
            }
          }

      }
    }

    if (stack.length !== 0) err = true;
    if (err) getAngryAt(string, i, "Unbalanced parentheses/brackets");
  }

  function* tokenizer(string) {
    // what constitutes a token? a sequence of n letters, one of the operators *-/+^, parentheses or brackets
    string = string.trimEnd();
    let i = 0;
    let prev_len = string.length;
    let original_string = string;

    while (string) {
      string = string.trim();
      i += prev_len - string.length;
      prev_len = string.length;
      let match;

      do {
        match = string.match(paren_regex);

        if (match) {
          yield {
            type: "paren",
            paren: match[0],
            index: i
          };
          break;
        }

        match = string.match(constant_regex);

        if (match) {
          yield {
            type: "constant",
            value: match[0],
            index: i
          };
          break;
        }

        match = string.match(operator_regex);

        if (match) {
          yield {
            type: "operator",
            op: match[0].replace(/\s+/g, ""),
            index: i
          };
          break;
        }

        match = string.match(comma_regex);

        if (match) {
          yield {
            type: "comma",
            index: i
          };
          break;
        }

        match = string.match(function_regex);

        if (match) {
          yield {
            type: "function",
            name: match[1],
            index: i
          };
          yield {
            type: "paren",
            paren: '(',
            index: i + match[1].length
          };
          break;
        }

        match = string.match(variable_regex);

        if (match) {
          yield {
            type: "variable",
            name: match[0],
            index: i
          };
          break;
        }

        match = string.match(string_regex);

        if (match) {
          yield {
            type: "string",
            contents: match[0].slice(1, -1),
            index: i
          };
        }

        getAngryAt(original_string, i, "Unrecognized token");
      } while (false);

      let len = match[0].length;
      string = string.slice(len);
    }
  }

  function checkValid(string, tokens) {
    for (let i = 0; i < tokens.length - 1; ++i) {
      let token1 = tokens[i];
      let token2 = tokens[i + 1];
      let token2IsUnary = token2.op === '-' || token2.op === '+';

      if ((token1.type === "operator" || token1.type === "comma") && (token2.type === "operator" || token2.type === "comma") && (!token2IsUnary || i === tokens.length - 2)) {
        getAngryAt(string, token2.index, "No consecutive operators/commas");
      }

      if (token1.paren === "(" && token2.paren === ")") getAngryAt(string, token2.index, "No empty parentheses");
      if (token1.paren === "[" && token2.paren === "]") getAngryAt(string, token2.index, "No empty brackets");
      if (token1.type === "operator" && token2.paren === ")") getAngryAt(string, token2.index, "No operator followed by closing parenthesis");
      if (token1.type === "operator" && token2.paren === "]") getAngryAt(string, token2.index, "No operator followed by closing bracket");
      if (token1.type === "comma" && token2.paren === ")") getAngryAt(string, token2.index, "No comma followed by closing parenthesis");
      if (token1.type === "comma" && token2.paren === "]") getAngryAt(string, token2.index, "No comma followed by closing bracket");
      if (token1.paren === '(' && token2.type === "comma") getAngryAt(string, token2.index, "No comma after starting parenthesis");
      if (token1.paren === '[' && token2.type === "comma") getAngryAt(string, token2.index, "No comma after starting bracket");
      if (token1.paren === '(' && token2.type === "operator" && !token2IsUnary) getAngryAt(string, token2.index, "No operator after starting parenthesis");
      if (token1.paren === '[' && token2.type === "operator" && !token2IsUnary) getAngryAt(string, token2.index, "No operator after starting bracket");
    }

    if (tokens[0].type === "comma" || tokens[0].type === "operator" && !(tokens[0].op === '-' || tokens[0].op === '+')) getAngryAt(string, 0, "No starting comma/operator");
    const last_token = tokens[tokens.length - 1];
    if (last_token.type === "comma" || last_token.type === "operator") getAngryAt(string, tokens.length - 1, "No ending comma/operator");
  }
  /**
   * Find a pair of parentheses in a list of tokens, namely the first one as indexed by the closing paren/bracket. For
   * example, in (x(y(z)(w))) it will find (z).
   * @param children
   * @returns {number[]}
   */


  function findParenIndices(children) {
    let startIndex = -1;

    for (let i = 0; i < children.length; ++i) {
      let child = children[i];
      if (!child.paren) continue;
      if (child.paren === '(' || child.paren === '[') startIndex = i;
      if ((child.paren === ')' || child.paren === ']') && startIndex !== -1) return [startIndex, i];
    }
  }
  /**
   * Convert constants and variables to their ASTNode counterparts
   * @param tokens {Array}
   */


  function processConstantsAndVariables(tokens) {
    for (let i = 0; i < tokens.length; ++i) {
      let token = tokens[i];

      switch (token.type) {
        case "constant":
          let v = parseFloat(token.value);
          let node = new ConstantNode(v, token.value);
          if (Number.isInteger(v)) node.type = "int";
          tokens[i] = node;
          break;

        case "variable":
          tokens[i] = new VariableNode(token.name);
          break;
      }
    }
  } // To process parentheses, we find pairs of them and combine them into ASTNodes containing the nodes and
  // tokens between them. We already know the parentheses are balanced, which is a huge help here. We basically go
  // through each node recursively and convert all paren pairs to a node, then recurse into those new nodes


  function processParentheses(rootNode) {
    rootNode.applyAll(node => {
      let parensRemaining = true;

      while (parensRemaining) {
        parensRemaining = false;
        let indices = findParenIndices(node.children);

        if (indices) {
          parensRemaining = true;
          let newNode = new ASTGroup();
          let expr = node.children.splice(indices[0], indices[1] - indices[0] + 1, newNode);
          newNode.children = expr.slice(1, expr.length - 1);
        }
      }
    }, true);
  } // Turn function tokens followed by ASTNodes into OperatorNodes


  function processFunctions(rootNode) {
    rootNode.applyAll(node => {
      let children = node.children;

      for (let i = 0; i < children.length; ++i) {
        let token = children[i];

        if (token.type === "function") {
          let synonym = OperatorSynonyms[token.name];
          let newNode = new OperatorNode(synonym !== null && synonym !== void 0 ? synonym : token.name);
          children[i] = newNode; // Take children from the node coming immediately after

          newNode.children = children[i + 1].children; // Remove the node immediately after

          children.splice(i + 1, 1);
        }
      }
    }, true);
  } // Given a node and an index i of a binary operator, combine the nodes immediately to the left and right of the node
  // into a single binary operator


  function combineBinaryOperator(node, i) {
    const children = node.children;
    let newNode = new OperatorNode(children[i].op);
    newNode.children = [children[i - 1], children[i + 1]];
    children.splice(i - 1, 3, newNode);
  } // Process the highest precedence operators. Note that e^x^2 = (e^x)^2 and e^-x^2 = e^(-x^2).


  function processUnaryAndExponentiation(root) {
    root.applyAll(node => {
      let children = node.children; // We iterate backwards

      for (let i = children.length - 1; i >= 0; --i) {
        let child = children[i];
        if (child instanceof ASTNode || !child.op) continue;

        if (child.op === "-") {
          // If the preceding token is an unprocessed non-operator token, or node, then it's a binary expression
          if (i !== 0 && children[i - 1].type !== "operator") continue;
          let newNode = new OperatorNode("-");
          newNode.children = [children[i + 1]];
          children.splice(i, 2, newNode);
        } else if (child.op === "+") {
          // See above
          if (i !== 0 && children[i - 1].type !== "operator") continue; // Unary + is a no-op

          children.splice(i, 1);
        } else if (child.op === "^") {
          combineBinaryOperator(node, i);
          --i;
        }
      }
    }, true);
  } // Combine binary operators, going from left to right, with equal precedence for all


  function processOperators(root, operators) {
    root.applyAll(node => {
      let children = node.children;

      for (let i = 0; i < children.length; ++i) {
        let child = children[i];
        if (child instanceof ASTNode || !child.op) continue;

        if (operators.includes(child.op)) {
          combineBinaryOperator(node, i);
          --i;
        }
      }
    }, true);
  } // The index of each operator is also an enum, which is used in comparison chains to describe which operator is being used


  const comparisonOperators = ['<', '<=', '==', '!=', '>=', '>']; // Process "comparison chains", which are sequences of the form 0 <= x < 2. Internally these are transformed into
  // "cchain" operators, which have the form cchain(0, 1 (enum comparison), x, 0 (enum comparison), 2). Gross, but
  // it's hard to cleanly represent these comparison chains otherwise. You *could* represent them using boolean operations,
  // but that duplicates the internal nodes which is inefficient

  function processComparisonChains(root) {
    root.applyAll(node => {
      const children = node.children;

      for (let i = 0; i < children.length; ++i) {
        let child = children[i];
        if (child instanceof ASTNode || !child.op) continue;

        if (comparisonOperators.includes(children[i].op)) {
          let comparisonChainFound = false; // Found a comparison operator token; we now check for whether the tokens +2, +4, etc. ahead of it are also
          // comparison tokens. If so, we emit a comparison chain
          // Index of the last comparison token, plus 2

          let j = i + 2;

          for (; j < children.length; j += 2) {
            let nextChild = children[j];
            if (nextChild instanceof ASTNode || !nextChild.op) continue;

            if (comparisonOperators.includes(children[j].op)) {
              comparisonChainFound = true;
            } else {
              break;
            }
          }

          if (comparisonChainFound) {
            // The nodes i, i+2, i+4, ..., j-4, j-2 are all comparison nodes. Thus, all nodes in the range i-1 ... j-1
            // should be included in the comparison chain
            let comparisonChain = new OperatorNode("cchain");
            let cchainChildren = comparisonChain.children = children.splice(i - 1, j - i + 1, comparisonChain);

            for (let i = cchainChildren.length - 2; i >= 0; i -= 2) {
              // Convert operator tokens into constant node corresponding to their enum status
              let token = cchainChildren[i];
              let tokenEnum = comparisonOperators.indexOf(token.op);
              cchainChildren[i] = new ConstantNode(tokenEnum, tokenEnum + '', "int");
            }

            return;
          }
        }
      }
    }, true);
  } // Remove residual commas from the node


  function removeCommas(root) {
    root.applyAll(node => {
      let children = node.children;
      let i = children.length;

      while (i--) {
        if (children[i].type === "comma") children.splice(i, 1);
      }
    }, true);
  }
  /**
   * Parse a given list of tokens, returning a single ASTNode. At this point, the tokens are a list of the form
   * { type: "function"|"variable"|"paren"|"operator"|"constant"|"comma", index: <index of the token in the original string>,
   *  op?: <operator>, name?: <name of variable>, paren?: <type of paren> }
   * @param tokens
   * @returns {ASTNode}
   */


  function parseTokens(tokens) {
    processConstantsAndVariables(tokens);
    let root = new ASTGroup(tokens);
    processParentheses(root);
    processFunctions(root);
    processUnaryAndExponentiation(root); // PEMDAS

    processOperators(root, ['*', '/']);
    processOperators(root, ['-', '+']);
    processComparisonChains(root);
    processOperators(root, comparisonOperators);
    processOperators(root, ["and", "or"]);
    removeCommas(root);
    return root;
  }

  function parseString(string, types = {}) {
    checkParensBalanced(string);
    let tokens = [];

    for (let token of tokenizer(string)) {
      tokens.push(token);
    }

    checkValid(string, tokens);
    let node = parseTokens(tokens).children[0];
    return node;
  }

  /**
   * Convert a node into a function, or set of functions.
   * @param root
   * @param opts
   */
  function compileNode(root, opts = {}) {
    // Whether to do typechecks to passed arguments
    let doTypechecks = !!opts.typechecks; // Whether to allow optimizations which may change the output due to rounding

    !!opts.fastMath; // We construct the text of a function of the form (imports) => { let setup = ... ; return function (...) { ... }}
    // then create the function via new Function. The evaluation process basically involves generating variables $0, $1,
    // $2, ... that correspond to the nodes in the graph. For example, x^2+3 becomes
    // $0 = scope.x
    // $1 = 2
    // $2 = Math.pow($0, $1)
    // $3 = 3
    // $4 = $2 + $3
    // return $4
    // Breaking down the evaluation like this allows for much greater optimizations, including conditional eval (we'll
    // get to that later).

    let id = 0;
    /**
     * Get id to be used for intermediate functions and the like
     * @returns {string}
     */

    function getVarName() {
      return "$" + ++id;
    } // Map between nodes and information about those nodes (corresponding var names, optimizations, etc.)


    let nodeInfo = new Map(); // Create stores for each node for information about each

    root.applyAll(node => {
      nodeInfo.set(node, {});
    }, false
    /* call the function on all nodes, not just group nodes */
    ); // Mapping between function/constant import objects and their variable names

    let importInfo = new Map(); // Text of the setup code preceding all the exported functions

    let globalSetup = "";
    /**
     * Import a function f and return a constant variable name corresponding to that function, to be placed in
     * globalSetup. Importing the same function twice returns the same variable
     * @param f {Function}
     * @returns {string}
     */

    function importFunction(f) {
      if (typeof f !== "function") throw new TypeError("Unable to import function ".concat(f));
      let stored = importInfo.get(f);
      if (stored) return stored;
      let fName = getVarName() + "_f";
      if (doTypechecks) // Make sure f is actually a function
        globalSetup += "if (typeof ".concat(fName, " !== \"function\") throw new TypeError(\"Imported parameter ").concat(fName, " is not a function\");\n");
      importInfo.set(f, fName);
      return fName;
    }
    /**
     * Import a generic variable of any type
     * @param c {any} External constant
     * @returns {string} Variable name corresponding to the constant
     */


    function importConstant(c) {
      let stored = importInfo.get(c);
      if (stored) return stored;
      let cName = getVarName() + "_c";
      importInfo.set(c, cName);
      return cName;
    } // Dict of exported functions; mapping between names of functions and their arguments, setup and body


    let exportedFunctions = {};

    function exportFunction(name, args, body) {
      exportedFunctions[name] = {
        args,
        body
      };
    } // Compile a function which, given a scope, evaluates the function


    compileEvaluationFunction(root, nodeInfo, importFunction, importConstant, exportFunction, getVarName, opts); // efText is of the form return { evaluate: function ($1, $2, ) { ... } }

    let efText = "return {" + Object.entries(exportedFunctions).map(([name, info]) => "".concat(name, ": function (").concat(info.args.join(','), ") { ").concat(info.body, " }")).join(',') + '}';
    let nfText = globalSetup + efText;
    let imports = Array.from(importInfo.keys());
    let importNames = Array.from(importInfo.values()); // Last argument is the text of the function itself

    importNames.push(nfText);
    return Function.apply(null, importNames).apply(null, imports);
  }

  function compileEvaluationFunction(root, nodeInfo, importFunction, importConstant, exportFunction, getUnusedVarName, opts) {
    // Whether to add typechecks to the passed variables
    let doTypechecks = !!opts.typechecks;
    let scopeVarName = "scope";
    let fBody = "";
    let fArgs = [scopeVarName]; // Mapping between string variable name and information about that variable (varName)

    let varInfo = new Map();
    /**
     * Get information, including the JS variable name
     * @param name
     */

    function getScopedVariable(name) {
      let stored = varInfo.get(name);
      if (stored) return stored;
      stored = {
        varName: getUnusedVarName()
      };
      varInfo.set(name, stored);
      return stored;
    }

    function addLine(code) {
      fBody += code + '\n';
    } // Typecheck scope object


    if (doTypechecks) addLine("if (typeof ".concat(scopeVarName, " !== \"object\" || Array.isArray(").concat(scopeVarName, ")) throw new TypeError(\"Object passed to evaluate function should be a scope\");")); // Import and typecheck variables

    let requiredVariables = root.usedVariables();

    for (const [name, type] of requiredVariables.entries()) {
      let varInfo = getScopedVariable(name);
      let varName = varInfo.varName;
      addLine("var ".concat(varName, "=").concat(scopeVarName, ".").concat(name, ";"));

      if (doTypechecks) {
        let typecheck = importFunction(TYPES[type].typecheck.generic.f);
        addLine("if (".concat(varName, " === undefined) throw new Error(\"Variable ").concat(name, " is not defined in this scope\");"));
        addLine("if (!".concat(typecheck, "(").concat(varName, ")) throw new Error(\"Expected variable ").concat(name, " to have a type of ").concat(type, "\");"));
      }
    }

    compileEvaluateVariables(root, nodeInfo, importFunction, importConstant, getScopedVariable, getUnusedVarName, addLine, opts);
    addLine("return ".concat(nodeInfo.get(root).varName, ";"));
    exportFunction("evaluate", fArgs, fBody);
  }

  function compileEvaluateVariables(root, nodeInfo, importFunction, importConstant, getScopedVariable, getUnusedVarName, addLine, opts) {
    var _opts$o;

    // How much to try and optimize the computations
    (_opts$o = opts.o) !== null && _opts$o !== void 0 ? _opts$o : 0;

    function compileOperator(node) {
      let varName = getUnusedVarName();
      let definition = node.definition;
      let evaluator = definition.evaluators.generic;
      let evaluatorType = evaluator.type;
      let children = node.children;
      let args = children.map((c, i) => {
        let varName = nodeInfo.get(c).varName;
        let srcType = c.type;
        let dstType = definition.signature[i]; // Do type conversion

        if (srcType !== dstType) {
          let cast = getCast(srcType, dstType);

          if (cast.name !== "identity") {
            let convertedVarName = getUnusedVarName();
            addLine("var ".concat(convertedVarName, "=").concat(importFunction(cast.evaluators.generic.f), "(").concat(varName, ");"));
            varName = convertedVarName;
          }
        }

        return varName;
      });

      if (evaluatorType === "special_binary") {
        addLine("var ".concat(varName, "=").concat(args[0], " ").concat(evaluator.binary, " ").concat(args[1], ";"));
      } else {
        let fName = importFunction(evaluator.f);
        addLine("var ".concat(varName, "=").concat(fName, "(").concat(args.join(','), ");"));
      }

      return varName;
    }

    root.applyAll(node => {
      let info = nodeInfo.get(node);
      let nodeType = node.nodeType();
      let varName;

      switch (nodeType) {
        case "op":
          varName = compileOperator(node);
          break;

        case "var":
          varName = getScopedVariable(node.name).varName;
          break;

        case "const":
          varName = importConstant(node.value);
          break;

        case "group":
          // Forward the var name from the only child (since this is a grouping)
          varName = nodeInfo.get(node.children[0]).varName;
          break;

        default:
          throw new Error("Unknown node type ".concat(nodeType));
      }

      info.varName = varName;
    }, false, true
    /* children first, so bottom up */
    );
  }

  exports.BigFloat = BigFloat;
  exports.BigInt = BigInt;
  exports.BooleanDict = BooleanDict;
  exports.BoundingBox = BoundingBox;
  exports.Color = Color;
  exports.Colors = Colors;
  exports.Complex = Complex;
  exports.DefaultStyles = DefaultStyles;
  exports.DynamicRectanglePacker = DynamicRectanglePacker;
  exports.Element = Element;
  exports.Eventful = Eventful;
  exports.FP = fp_manip;
  exports.FigureBaubles = FigureBaubles;
  exports.GenericObject = GenericObject;
  exports.Group = Group;
  exports.InteractiveScene = InteractiveScene;
  exports.LabelPosition = LabelPosition;
  exports.NewFigure = NewFigure;
  exports.NullInterface = NullInterface;
  exports.Operators = Operators;
  exports.Pen = Pen;
  exports.Pens = Pens;
  exports.PointCloudElement = PointCloudElement;
  exports.PointElement = PointElement;
  exports.PolylineElement = PolylineElement;
  exports.Props = Props;
  exports.ROUNDING_MODE = ROUNDING_MODE;
  exports.RealFunctions = RealFunctions;
  exports.Scene = Scene;
  exports.TextElement = TextElement;
  exports.TextRenderer = TextRenderer;
  exports.TextStyle = TextStyle;
  exports.TinySDF = TinySDF;
  exports.Vec2 = Vec2;
  exports.WebGLRenderer = WebGLRenderer;
  exports.addMantissas = addMantissas;
  exports.anglesBetween = anglesBetween;
  exports.arctanhSmallRange = arctanhSmallRange;
  exports.asyncDigest = asyncDigest;
  exports.attachGettersAndSetters = attachGettersAndSetters;
  exports.boundingBoxTransform = boundingBoxTransform;
  exports.calculatePolylineVertices = calculatePolylineVertices;
  exports.canMantissaBeRounded = canMantissaBeRounded;
  exports.closestRational = closestRational;
  exports.coatBolus = coatBolus;
  exports.combineColoredTriangleStrips = combineColoredTriangleStrips;
  exports.combineTriangleStrips = combineTriangleStrips;
  exports.compareMantissas = compareMantissas;
  exports.compileNode = compileNode;
  exports.constructInterface = constructInterface;
  exports.convertTriangleStrip = convertTriangleStrip;
  exports.divMantissas = divMantissas;
  exports.divMantissas2 = divMantissas2;
  exports.doubleToRational = doubleToRational;
  exports.expBaseCase = expBaseCase;
  exports.fillRepeating = fillRepeating;
  exports.flattenVec2Array = flattenVec2Array;
  exports.generateCircleTriangleStrip = generateCircleTriangleStrip;
  exports.generateRectangleCycle = generateRectangleCycle;
  exports.generateRectangleDebug = generateRectangleDebug;
  exports.generateRectangleTriangleStrip = generateRectangleTriangleStrip;
  exports.get2DDemarcations = get2DDemarcations;
  exports.getActualTextLocation = getActualTextLocation;
  exports.getCachedRecipLnValue = getCachedRecipLnValue;
  exports.getDemarcations = getDemarcations;
  exports.getLineIntersection = getLineIntersection;
  exports.getTextSDFInformation = getTextSDFInformation;
  exports.getTrailingInfo = getTrailingInfo;
  exports.intersectBoundingBoxes = intersectBoundingBoxes;
  exports.leftShiftMantissa = leftShiftMantissa;
  exports.lineSegmentIntersect = lineSegmentIntersect;
  exports.lineSegmentIntersectsBox = lineSegmentIntersectsBox;
  exports.lnBaseCase = lnBaseCase;
  exports.lookupCompositionType = lookupCompositionType;
  exports.measureText = measureText;
  exports.mulAddWords = mulAddWords;
  exports.mulWords = mulWords;
  exports.multiplyBigInts = multiplyBigInts;
  exports.multiplyMantissaByInteger = multiplyMantissaByInteger;
  exports.multiplyMantissas = multiplyMantissas;
  exports.multiplyMantissas2 = multiplyMantissas2;
  exports.neededWordsForPrecision = neededWordsForPrecision;
  exports.packRectangles = packRectangles;
  exports.parseString = parseString;
  exports.pointLineSegmentClosest = pointLineSegmentClosest;
  exports.pointLineSegmentMinDistance = pointLineSegmentMinDistance;
  exports.potpack = potpack;
  exports.prettyPrintFloat = prettyPrintFloat;
  exports.reciprocalMantissa = reciprocalMantissa;
  exports.resolveOperator = resolveOperator;
  exports.rightShiftMantissa = rightShiftMantissa;
  exports.roundMantissaToPrecision = roundMantissaToPrecision;
  exports.roundingModeToString = roundingModeToString;
  exports.setGlobalPrecision = setGlobalPrecision;
  exports.setGlobalRoundingMode = setGlobalRoundingMode;
  exports.sqrtMantissa = sqrtMantissa;
  exports.subtractMantissas = subtractMantissas;
  exports.syncDigest = syncDigest;
  exports.testBolus = testBolus;
  exports.tokenizer = tokenizer;
  exports.utils = utils;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
