import { FunctionPlot2D } from './function_plot'
import { PointElement } from './point'
import { Element as GraphemeElement } from "../core/grapheme_element"
import { Vec2 } from '../math/vec'
import { Label2D } from './label'
import { StandardLabelFunction } from "./gridlines"
import { Colors } from '../other/color'

class FunctionPlot2DInspectionPoint extends GraphemeElement {
  constructor (params = {}) {
    super()

    this.position = params.position instanceof Vec2 ? params.position : new Vec2(params.position)

    this.point = new PointElement()
    this.label = new Label2D({style: {dir: "NE", fontSize: 14, shadowColor: Colors.WHITE, shadowSize: 2}})
  }

  update () {
    let position = this.plot.transform.plotToPixel(this.position)
    this.point.position = position
    this.label.position = position.clone().add(new Vec2(1, -1).scale(1.4 * this.point.radius))

    if (this.position)
      this.label.text = "(" + this.position.asArray().map(StandardLabelFunction).join(', ') + ')'
  }

  render (info) {
    super.render(info)

    this.point.render(info)
    this.label.render(info)
  }
}

/**
 * Function plot intended for use in a graphing calculator setting
 */
class InteractiveFunctionPlot2D extends FunctionPlot2D {
  constructor (params = {}) {
    super(params)

    this.inspectionListeners = {}

    this.inspectionEnabled = true
    this.inspectionPoint = null
    this.smoothInspectionPointMovement = true
  }

  set inspectionEnabled (value) {
    if (value) {
      this.interactivityEnabled = true
    }

    if (this.inspectionEnabled === value) {
      return
    }

    if (value) {
      this.inspectionListeners['interactive-mousedown'] = this.inspectionListeners['interactive-drag'] = (evt) => {
        let position = evt.pos

        if (!this.polyline) {
          return
        }

        let closestPoint = this.polyline.closestTo(position)
        let x = this.plot.transform.pixelToPlotX(closestPoint.x)
        let y = this.function(x)

        if (!this.inspectionPoint) {
          this.inspectionPoint = new FunctionPlot2DInspectionPoint({
            position: { x, y }
          })

          this.add(this.inspectionPoint)
        } else {
          this.inspectionPoint.position = new Vec2(x, y)
        }

        return true
      }

      this.inspectionListeners['mouseup'] = (evt) => {

        if (this.inspectionPoint)
          this.remove(this.inspectionPoint)
        this.inspectionPoint = null
      }

      for (let key in this.inspectionListeners) {
        this.addEventListener(key, this.inspectionListeners[key])
      }
    } else {
      for (let key in this.inspectionListeners) {
        this.removeEventListener(key, this.inspectionListeners[key])
      }

      if (this.inspectionPoint) {
        this.remove(this.inspectionPoint)
      }

      this.inspectionListeners = {}
    }
  }
}

export { InteractiveFunctionPlot2D }
