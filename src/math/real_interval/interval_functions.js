
import * as BasicArithmeticFunctions from "./basic_arithmetic"
import * as TrigFunctions from "./trig_functions"
import * as GammaFunctions from "./gamma"
import * as LogFunctions from "./log"

export const RealIntervalFunctions = {
  ...BasicArithmeticFunctions, ...TrigFunctions, ...GammaFunctions, ...LogFunctions
}
