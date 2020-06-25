import { Color } from '../other/color'
import * as utils from "../core/utils"

class PointCloud extends GraphemeElement {
  constructor(params={}) {
    super(params)

    const {
      color = new Color(),
      vertices = [],
      radius = 4
    } = params

    this.color = color
    this.radius = radius
    this.vertices = vertices
  }

  update() {
    super.update()

    let path = this.path = new Path2D()

    let verts = utils.flattenVectors(this.vertices)
    let {x_m, x_b, y_m, y_b} = this.plot.transform.getPlotToPixelTransform()

    for (let i = 0; i < verts.length; i += 2) {
      let x = x_m * verts[i] + x_b
      let y = y_m * verts[i+1] + y_b

      path.arc(x, y, this.radius, 0, 2 * Math.PI)
    }
  }

  render(info) {
    super.render(info)

    const ctx = info.ctx

    ctx.fillStyle = this.color.hex()
    ctx.fill(this.path)
  }

}
