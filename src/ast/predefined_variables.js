import { defineVariable, RESERVED_VARIABLES } from './user_defined'
import { parseString } from './parse_string'

defineVariable('i', parseString("complex(0, 1)"))
defineVariable('pi', parseString("3.141592653589793238"))
defineVariable('e', parseString("2.71828182845904523536"))
defineVariable('euler_gamma', parseString("0.57721566490153286060"))
defineVariable('<', parseString("1"))
defineVariable('>', parseString("1"))
defineVariable('<=', parseString("1"))
defineVariable('>=', parseString("1"))
defineVariable('!=', parseString("1"))
defineVariable('==', parseString("1"))

RESERVED_VARIABLES.push('i', 'x', 'y', 'z', 'pi', 'e')
