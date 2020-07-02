import * as BasicArithmeticFunctions from "./basic_arithmetic"
import * as PowFunctions from "./pow"
import * as TrigFunctions from "./trig_functions"
import Exp from './exp'
import Cis from './cis'
import * as LnFunctions from "./log.js"
import * as HyperbolicTrigFunctions from "./hyperbolic_trig_functions"
import * as InverseTrigFunctions from "./inverse_trig"
import * as InverseHyperbolicFunctions from "./inverse_hyperbolic"
import Gamma from "./gamma"
import Digamma from "./digamma"
import Trigamma from "./trigamma"
import Polygamma from "./polygamma"

const ComplexFunctions = Object.freeze({
  ...BasicArithmeticFunctions, ...PowFunctions, Exp, Cis, ...TrigFunctions, ...LnFunctions,
  ...HyperbolicTrigFunctions, ...InverseTrigFunctions, ...InverseHyperbolicFunctions,
  Gamma, Digamma, Trigamma, Polygamma
})

export { ComplexFunctions }
