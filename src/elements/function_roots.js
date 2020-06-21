import { find_roots } from './function_plot_algorithm'
import { InspectablePoint } from './inspectable_point'
import { StandardLabelFunction } from './gridlines'
import { parse_string } from '../function_ast/parse_string'

class FunctionPoints extends GraphemeElement {
  constructor(params={}) {
    super(params)

    this.points = []

    this.func = parse_string("x^2")

    this.updateDerivatives()
  }

  updateDerivatives() {

    let first = this.func.derivative('x')
    let second = first.derivative('x')

    this.derivatives = {
      zeroth: this.func.compile(),
      first: first.compile(),
      second: second.compile()
    }
  }

  update() {
    super.update()

    this.points = this.points.filter(point => point.selected === true)

    this.removeAllChildren()

    const coords = this.plot.transform.coords
    const box = this.plot.transform.box

    let roots = find_roots(coords.x1, coords.x2, this.derivatives.zeroth, this.derivatives.first,
      box.width, 10, coords.height / box.height, this.points.map(point => point.position.x))

    for (let i = 0; i < roots.length; i += 2) {
      let x = roots[i]
      let y = 0

      let point = new InspectablePoint({position: new Vec2(x, y)})

      point.labelText = "(" + StandardLabelFunction(x) + ", 0)"
    }

    this.points.forEach(point => this.add(point))
  }
}

export { FunctionPoints }
