/**
 * @file Definition of the {@link RealFunctions}, or functions outside of the built-in <i>Math</i> that accept
 * floating-point numbers as arguments.
 */
import * as BASIC_ARITHMETIC from './basic_arithmetic.js'
import { gamma, lnGamma, factorial } from './gamma.js'
import { pow } from './pow.js'

/**
 * Functions that accept double-precision floating point numbers as arguments. Common functions not here are likely
 * provided by Math, so use those instead. Note that {@link RealFunctions.pow} is functionally different than
 * <i>Math.pow</i>.
 * @namespace RealFunctions
 */
const RealFunctions = Object.freeze({
  ...BASIC_ARITHMETIC,
  Gamma: gamma,
  LnGamma: lnGamma,
  Factorial: factorial,
  Pow: pow
})

export { RealFunctions }
