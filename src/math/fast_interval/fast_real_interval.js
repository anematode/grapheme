/**
 * A real interval with only min, max, defMin (bit 0), defMax (bit 1), contMin (bit 2), contMax (bit 3)
 */
import { roundDown, roundUp } from '../real/fp_manip.js'

export class FastRealInterval {
  constructor (min=0, max=min, info=0b111) {
    this.min = min
    this.max = max
    this.info = info
  }

  defMin () {
    return this.info & 0b1
  }

  defMax () {
    return this.info & 0b10
  }

  cont () {
    return this.info & 0b100
  }

  static set (src, dst) {
    dst.min = src.min
    dst.max = src.max
    dst.info = src.info
  }

  static setNumber (num, dst) {
    if (Number.isNaN(num)) {
      dst.info = 0
    } else {
      dst.min = num
      dst.max = num
      dst.info = 0b111
    }
  }

  static setRange (min, max, dst) {
    dst.min = min
    dst.max = max
    dst.info = 0b111
  }

  /**
   * Add two fast real intervals, sending the result to dst
   * @param src1 {FastRealInterval}
   * @param src2 {FastRealInterval}
   * @param dst {FastRealInterval}
   * @param correctRounding {boolean} Whether to use correct rounding so the result is mathematically guaranteed
   */
  static add (src1, src2, dst, correctRounding) {
    let info = src1.info & src2.info
    if (info === 0) {
      dst.info = 0
      return
    }

    let min = src1.min + src2.min
    let max = src1.max + src2.max

    if (correctRounding) {
      min = roundDown(min)
      max = roundUp(max)
    }

    dst.min = min
    dst.max = max
    dst.info = info
  }

  /**
   * Subtract two fast real intervals, sending the result to dst
   * @param src1 {FastRealInterval}
   * @param src2 {FastRealInterval}
   * @param dst {FastRealInterval}
   * @param correctRounding {boolean} Whether to use correct rounding so the result is mathematically guaranteed
   */
  static sub (src1, src2, dst, correctRounding) {
    let info = src1.info & src2.info
    if (info === 0) {
      dst.info = 0
      return
    }

    let min = src1.min - src2.max
    let max = src1.max - src2.min

    if (correctRounding) {
      min = roundDown(min)
      max = roundUp(max)
    }

    dst.min = min
    dst.max = max
    dst.info = info
  }

  /**
   * Negate a real interval, sending the result to dst
   * @param src {FastRealInterval}
   * @param dst {FastRealInterval}
   * @param correctRounding {boolean} Whether to use correct rounding so the result is mathematically guaranteed
   */
  static unarySub (src, dst, correctRounding) {
    dst.min = -src.max
    dst.max = -src.min
    dst.info = src.info
  }

  /**
   * Multiply two fast real intervals, sending the result to dst
   * @param src1 {FastRealInterval}
   * @param src2 {FastRealInterval}
   * @param dst {FastRealInterval}
   * @param correctRounding {boolean} Whether to use correct rounding so the result is mathematically guaranteed
   */
  static mul (src1, src2, dst, correctRounding) {
    let info = src1.info & src2.info
    if (info === 0) {
      dst.info = 0
      return
    }


    let s1min = src1.min, s1max = src1.max, s2min = src2.min, s2max = src2.max
    let p1 = s1min * s2min, p2 = s1max * s2min, p3 = s1min * s2max, p4 = s1max * s2max

    let min = Math.min(p1, p2, p3, p4)
    let max = Math.max(p1, p2, p3, p4)

    if (correctRounding) {
      min = roundDown(min)
      max = roundUp(max)
    }

    dst.min = min
    dst.max = max
    dst.info = info

  }

  /**
   * Divide two fast real intervals, sending the result to dst
   * @param src1 {FastRealInterval}
   * @param src2 {FastRealInterval}
   * @param dst {FastRealInterval}
   * @param correctRounding {boolean} Whether to use correct rounding so the result is mathematically guaranteed
   */
  static div (src1, src2, dst, correctRounding) {
    let info = src1.info & src2.info
    if (info === 0) {
      dst.info = 0
      return
    }

    let s2min = src2.min, s2max = src2.max

    if (0 < s2min || 0 > s2max) {
      // if 0 is outside the range...
      let s1min = src1.min, s1max = src1.max
      let p1 = s1min / s2min, p2 = s1max / s2min, p3 = s1min / s2max, p4 = s1max / s2max

      let min = Math.min(p1, p2, p3, p4)
      let max = Math.max(p1, p2, p3, p4)

      if (correctRounding) {
        min = roundDown(min)
        max = roundUp(max)
      }

      dst.min = min
      dst.max = max
      dst.info = info
    } else {
      dst.min = -Infinity
      dst.max = Infinity
      dst.info = 1
    }
  }

  /**
   * Take the square root of a real interval, sending the result to dst
   * @param src {FastRealInterval}
   * @param dst {FastRealInterval}
   * @param correctRounding {boolean} Whether to use correct rounding so the result is mathematically guaranteed
   */
  static sqrt (src, dst, correctRounding) {
    let info = src.info
    if (info === 0) {
      dst.info = 0
      return
    }

    let min = src.min, max = src.max
    if (max < 0) {
      dst.info = 0
      return
    } else if (max === 0) {
      dst.min = 0
      dst.max = 0
      dst.info = (min === 0) ? info : 1
      return
    } else {
      if (min < 0) {
        min = 0
        max = Math.sqrt(max)

        if (correctRounding) max = roundUp(max)

        info = 1
      } else {
        min = Math.sqrt(min)
        max = Math.sqrt(max)

        if (correctRounding) {
          min = roundDown(min)
          max = roundUp(max)
        }
      }
    }

    dst.min = min
    dst.max = max
    dst.info = info
  }

  /**
   * Take the cube root of a real interval, sending the result to dst
   * @param src {FastRealInterval}
   * @param dst {FastRealInterval}
   * @param correctRounding {boolean} Whether to use correct rounding so the result is mathematically guaranteed
   */
  static cbrt (src, dst, correctRounding) {
    let info = src.info
    if (info === 0) {
      dst.info = 0
      return
    }

    let min = Math.cbrt(src.min)
    let max = src.min === src.max ? min : Math.cbrt(src.max)

    if (correctRounding) {
      min = roundDown(min)
      max = roundUp(max)
    }

    dst.min = min
    dst.max = max
    dst.info = info
  }

  /**
   * Take the sine of a fast real interval and send the result to dst
   * @param src {FastRealInterval}
   * @param dst {FastRealInterval}
   * @param correctRounding {boolean} Whether to use correct rounding so the result is mathematically guaranteed TODO
   */
  static sin (src, dst, correctRounding) {
    const pio2 = Math.PI / 2
    const pi3o2 = 3 * Math.PI / 2
    const pi2 = 2 * Math.PI
    const pi5o2 = 5 * Math.PI / 2
    const pi7o2 = 7 * Math.PI / 2

    let info = src.info
    if (info === 0) {
      dst.info = 0
      return
    }

    let srcMin = src.min, srcMax = src.max
    let diff = srcMax - srcMin

    if (diff > pi2 || Number.isNaN(diff)) {
      dst.min = -1
      dst.max = 1
      dst.info = info
      return
    }

    srcMin = ((srcMin % pi2) + pi2) % pi2
    srcMax = srcMin + diff

    // Whether the range includes one and negative one
    let includesOne = (srcMin < pio2 && srcMax > pio2) || (srcMin < pi5o2 && srcMax > pi5o2)
    let includesNegOne = (srcMin < pi3o2 && srcMax > pi3o2) || (srcMin < pi7o2 && srcMax > pi7o2)

    if (includesOne && includesNegOne) {
      dst.min = -1
      dst.max = 1
      dst.info = info
      return
    }

    let sinSrcMin = Math.sin(srcMin)
    let sinSrcMax = Math.sin(srcMax)

    let min = includesNegOne ? -1 : Math.min(sinSrcMin, sinSrcMax)
    let max = includesOne ? 1 : Math.max(sinSrcMin, sinSrcMax)

    if (correctRounding) {
      if (min !== -1) min = roundDown(min)
      if (max !== 1) max = roundUp(max)
    }

    dst.min = min
    dst.max = max
    dst.info = info
  }

  /**
   * Take the cosine of a fast real interval and send the result to dst
   * @param src {FastRealInterval}
   * @param dst {FastRealInterval}
   * @param correctRounding {boolean} Whether to use correct rounding so the result is mathematically guaranteed TODO
   */
  static cos (src, dst, correctRounding) {
    const pi2 = 2 * Math.PI
    const pi3 = 3 * Math.PI

    let info = src.info
    if (info === 0) {
      dst.info = 0
      return
    }

    let srcMin = src.min, srcMax = src.max
    let diff = srcMax - srcMin

    if (diff > pi2 || Number.isNaN(diff)) {
      dst.min = -1
      dst.max = 1
      dst.info = info
      return
    }

    srcMin = ((srcMin % pi2) + pi2) % pi2
    srcMax = srcMin + diff

    // Whether the range includes one and negative one
    let includesOne = srcMin < pi2 && srcMax > pi2
    let includesNegOne = (srcMin < Math.PI && srcMax > Math.PI) || (srcMin < pi3 && srcMax > pi3)

    if (includesOne && includesNegOne) {
      dst.min = -1
      dst.max = 1
      dst.info = info
      return
    }

    let cosSrcMin = Math.cos(srcMin)
    let cosSrcMax = Math.cos(srcMax)

    let min = includesNegOne ? -1 : Math.min(cosSrcMin, cosSrcMax)
    let max = includesOne ? 1 : Math.max(cosSrcMin, cosSrcMax)

    if (correctRounding) {
      if (min !== -1) min = roundDown(min)
      if (max !== 1) max = roundUp(max)
    }

    dst.min = min
    dst.max = max
    dst.info = info
  }

  /**
   * Take the tangent of a fast real interval and send the result to dst
   * @param src {FastRealInterval}
   * @param dst {FastRealInterval}
   * @param correctRounding {boolean} Whether to use correct rounding so the result is mathematically guaranteed TODO
   */
  static tan (src, dst, correctRounding) {
    const pio2 = Math.PI / 2

    let info = src.info
    if (info === 0) {
      dst.info = 0
      return
    }

    let srcMin = src.min, srcMax = src.max
    let diff = srcMax - srcMin

    if (diff > Math.PI || Number.isNaN(diff)) {
      dst.min = -Infinity
      dst.max = Infinity
      dst.info = 1
      return
    }

    srcMin = ((srcMin % Math.PI) + Math.PI) % Math.PI
    srcMax = srcMin + diff

    // Whether the range includes an undef
    let includesInf = srcMin < pio2 && srcMax > pio2

    if (includesInf) {
      dst.min = Infinity
      dst.max = -Infinity
      dst.info = 1
      return
    }

    let tanSrcMin = Math.cos(srcMin)
    let tanSrcMax = Math.cos(srcMax)

    let min = Math.min(tanSrcMin, tanSrcMax)
    let max = Math.max(tanSrcMin, tanSrcMax)

    if (correctRounding) {
      min = roundDown(min)
      max = roundUp(max)
    }

    dst.min = min
    dst.max = max
    dst.info = info
  }

  /**
   * Take the arcsine of a fast real interval and send the result to dst
   * @param src {FastRealInterval}
   * @param dst {FastRealInterval}
   * @param correctRounding {boolean} Whether to use correct rounding so the result is mathematically guaranteed
   */
  static asin (src, dst, correctRounding) {
    let info = src.info
    if (info === 0) {
      dst.info = 0
      return
    }

    let srcMin = src.min, srcMax = src.max

    if (srcMax < -1 || srcMin > 1) {
      dst.info = 0
      return
    }

    let min, max

    if (srcMin === srcMax) {
      min = max = Math.asin(srcMin)
    } else {
      if (srcMin < -1) {
        min = -Math.PI / 2
        info &= 0b010
      } else {
        min = Math.asin(srcMin)
      }

      if (srcMax > 1) {
        max = Math.PI / 2
        info &= 0b010
      } else {
        max = Math.asin(srcMax)
      }
    }

    if (correctRounding) {
      min = roundDown(min)
      max = roundUp(max)
    }

    dst.min = min
    dst.max = max
    dst.info = info
  }

  /**
   * Take the arccosine of a fast real interval and send the result to dst
   * @param src {FastRealInterval}
   * @param dst {FastRealInterval}
   * @param correctRounding {boolean} Whether to use correct rounding so the result is mathematically guaranteed
   */
  static acos (src, dst, correctRounding) {
    let info = src.info
    if (info === 0) {
      dst.info = 0
      return
    }

    let srcMin = src.min, srcMax = src.max

    if (srcMax < -1 || srcMin > 1) {
      dst.info = 0
      return
    }

    let min, max

    if (srcMin === srcMax) {
      min = max = Math.acos(srcMin)
    } else {
      if (srcMin < -1) {
        max = Math.PI
        info &= 0b010
      } else {
        max = Math.acos(srcMin)
      }

      if (srcMax > 1) {
        min = 0
        info &= 0b010
      } else {
        min = Math.acos(srcMax)
      }
    }

    if (correctRounding) {
      min = min === 0 ? min : roundDown(min)
      max = roundUp(max)
    }

    dst.min = min
    dst.max = max
    dst.info = info
  }

  /**
   * Take the arctangent of a fast real interval and send the result to dst
   * @param src {FastRealInterval}
   * @param dst {FastRealInterval}
   * @param correctRounding {boolean} Whether to use correct rounding so the result is mathematically guaranteed
   */
  static atan (src, dst, correctRounding) {
    let info = src.info
    if (info === 0) {
      dst.info = 0
      return
    }

    let srcMin = src.min, srcMax = src.max
    let min = Math.atan(srcMin)
    let max = Math.atan(srcMax)

    if (correctRounding) {
      min = roundDown(min)
      max = roundUp(max)
    }

    dst.min = min
    dst.max = max
    dst.info = info
  }

  /**
   * The power operation on two integers. This is a mathematical pow, rather than powSpecial where we try to guess that
   * numbers are rational. This function is a bit intricate because it needs to take care of a lot of cases. 0^0 = 0.
   * @param src1 {FastRealInterval}
   * @param src2 {FastRealInterval}
   * @param dst {FastRealInterval}
   * @param correctRounding {boolean}
   */
  static pow (src1, src2, dst, correctRounding) {
    let info = src1.info & src2.info
    if (info === 0) {
      dst.info = 0
      return
    }

    let s1min = src1.min, s1max = src1.max, s2min = src2.min, s2max = src2.max

    // First special case: exponent is a single number
    if (s2min === s2max) {
      let exp = s2min
      let containsZero = (s1min <= 0 && s1max >= 0)

      if (exp === 0) { // exponent 0
        dst.min = 1
        dst.max = 1
        dst.info = info

        return
      }

      // There are six cases to consider: x^2-like, x^3-like, sqrt(x)-like, 1/x-like, 1/x^2-like, and 1/sqrt(x)-like.
      // Suppose those cases are enumerated 0 through 5. Then positive even integers -> 0, positive odd integers -> 1,
      // negative odd integers -> 3, negative even integers -> 4, positive numbers -> 2, negative numbers -> 5.
      if (Number.isInteger(exp)) {
        if (containsZero) {
          if (exp < 0) {
            // negative even integers: minimum is the pow of the maximum
            if (exp % 2 === 0) {
              // 1/x^2
                dst.min = Math.pow(Math.max(Math.abs(s1min), Math.abs(s1max)), exp)
                dst.max = Infinity
                dst.info = info & 0b010
            } else {
              // Odd integers: if contains zero, contains an asymptote
                // 1/x
                dst.min = Infinity
                dst.max = Infinity
                dst.info = info & 0b010
            }

            return
          } else if (exp % 2 === 0) {
              // x^2
              dst.min = 0
              let max = Math.pow(Math.max(Math.abs(s1min), Math.abs(s1max)), exp)

              if (correctRounding)
                max = roundUp(max)

              dst.max = max
              dst.info = info
            return
          }
        } // containsZero
      } else {
        // Exponent is not an integer

        // Totally in the undefined region
        let isDefined = s1max > 0
        if (!isDefined) {
          dst.info = 0
          return
        }

        if (containsZero) {
          let min=0, max=0

          if (exp < 0) {
            // 1/sqrt(x)
            max = Infinity
            min = Math.pow(s1max, exp)
            if (correctRounding)
              min = roundDown(min)
          } else {
            min = 0
            max = Math.pow(s1max, exp)
            if (correctRounding)
              max = roundUp(max)
          }

          dst.min = min
          dst.max = max
          dst.info = info & 0b010
        }
      }

      // If we've fallen through to here, pow is monotonic and defined
      let powSrcMin = Math.pow(s1min, exp), powSrcMax = Math.pow(s1max, exp)
      let min = Math.min(powSrcMin, powSrcMax)
      let max = Math.max(powSrcMin, powSrcMax)

      if (correctRounding) {
        min = roundDown(min)
        max = roundUp(max)
      }

      dst.min = min
      dst.max = max
      dst.info = info

      return
    } // single-valued exponent

    // Second special case: denominator is a single number
    if (s1min === s1max) {
      let base = s1min

      if (base === 0) {
        let containsZero = s2max >= 0 && s2min <= 0

        dst.min = 0
        dst.max = containsZero ? 1 : 0 // 0^0 = 1
        dst.info = info & (containsZero ? 0b011 : 0b111)

        return
      } else if (base === 1) {
        dst.min = 1
        dst.max = 1
        dst.info = info

        return
      } else if (base === -1) {
        dst.min = -1
        dst.max = 1
        dst.info = info & 0b010

        return
      }

      // negative bases are weird. They have two branches depending on the denominator of the power they're being
      // raised to... so we deal with it :)

      let min=0, max=0

      if (base < -1) {
        // Shape: (-2)^x
        let m = Math.pow(base, s2max)

        min = -m
        max = m
        info &= 0b010
      } else if (base < 0) {
        // Shape: (-1/2)^x
        let m = Math.pow(base, s2min)

        min = -m
        max = m
        info &= 0b010
      } else if (base < 1) {
        // Monotonically decreasing
        min = Math.pow(base, s2max)
        max = Math.pow(base, s2min)
      } else {
        // Monotonically increasing
        min = Math.pow(base, s2min)
        max = Math.pow(base, s2max)
      }

      if (correctRounding) {
        min = roundDown(min)
        max = roundUp(max)
      }

      dst.min = min
      dst.max = max
      dst.info = info

      return
    }

    // If we've gotten here, things are a bit tricky. The key is that the minimum may be -Infinity, 0, or the minimum of
    // evaluated pows, and the maximum may be 0, Infinity, or the maximum of evaluated pows. Because this is a fast
    // real interval we don't have to get deep into the weeds of which are the actual attainable intervals (though that
    // isn't *too* hard)

    let hasAsymptote = s2min <= 0 && 0 <= s2max && s1min <= 0
    if (hasAsymptote) {
      dst.min = -Infinity
      dst.max = Infinity
      dst.info = info & 0b010

      return
    }

    // Things are potentially undefined iff the denominator has negative numbers.
    let isAllDefined = s1min < 0
    if (isAllDefined) info &= 0b010

    let minPow = Infinity, maxPow = -Infinity

    let ps1mins2min = Math.pow(Math.abs(s1min), s2min)
    let ps1mins2max = Math.pow(Math.abs(s1min), s2max)
    let ps1maxs2min = Math.pow(Math.abs(s1max), s2min)
    let ps1maxs2max = Math.pow(Math.abs(s1max), s2max)

    minPow = Math.min(minPow, ps1mins2min)
    maxPow = Math.max(maxPow, ps1mins2min)
    minPow = Math.min(minPow, ps1mins2max)
    maxPow = Math.max(maxPow, ps1mins2max)

    if (s1min < 0) {
      minPow = Math.min(minPow, -ps1mins2min)
      maxPow = Math.max(maxPow, -ps1mins2min)
      minPow = Math.min(minPow, -ps1mins2max)
      maxPow = Math.max(maxPow, -ps1mins2max)
    }

    minPow = Math.min(minPow, ps1maxs2min)
    maxPow = Math.max(maxPow, ps1maxs2min)
    minPow = Math.min(minPow, ps1maxs2max)
    maxPow = Math.max(maxPow, ps1maxs2max)

    if (s2min < 0) {
      minPow = Math.min(minPow, -ps1maxs2min)
      maxPow = Math.max(maxPow, -ps1maxs2min)
      minPow = Math.min(minPow, -ps1maxs2max)
      maxPow = Math.max(maxPow, -ps1maxs2max)
    }

    if (correctRounding) {
      minPow = roundDown(minPow)
      maxPow = roundUp(maxPow)
    }

    dst.min = minPow
    dst.max = maxPow
    dst.info = info
  }
}
