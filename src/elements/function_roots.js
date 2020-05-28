import { find_roots } from './function_plot_algorithm'
import { InspectablePoint } from './inspectable_point'
import { StandardLabelFunction } from './gridlines'

class FunctionPoints extends GraphemeElement {
  constructor(params={}) {
    super(params)

    this.points = []
  }

  update() {
    this.points = []

    const coords = this.plot.transform.coords

    let roots = find_roots(coords.x1, coords.x2)

    for (let i = 0; i < roots.length; i += 2) {
      let x = roots[i]
      let y = 0

      let point = new InspectablePoint({position: new Vec2(x, y)})

      point.labelText = "(" + StandardLabelFunction(x) + ", 0)"
    }
  }
}

export { FunctionPoints }
