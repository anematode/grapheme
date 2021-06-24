import * as BasicArithmeticFunctions from "./basic_arithmetic"
import * as PowFunctions from "./pow"
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
const ComplexFunctions = Object.freeze({
  ...BasicArithmeticFunctions, ...PowFunctions, /*Exp, Cis, ...TrigFunctions, ...LnFunctions,
  ...HyperbolicTrigFunctions, ...InverseTrigFunctions, ...InverseHyperbolicFunctions,
  Gamma, Digamma, Trigamma, Polygamma, LnGamma, Zeta, Eta, ...MiscSpecial, ...ExpIntegrals, ...TrigIntegrals, ...Erfs*/
})

export { ComplexFunctions }
