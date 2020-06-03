import { parse_string } from '../function_ast/parse_string'

class EquationElement extends InteractiveElement {
  constructor(params={}) {
    super(params)

    this.equation = parse_string("x")
  }
}
