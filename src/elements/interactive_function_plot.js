import { FunctionPlot2D } from './function_plot'
import { PointElement } from './point'
import { Element as GraphemeElement } from "../core/grapheme_element"
import { Vec2 } from '../math/vec'
import { Label2D } from './label'
import { StandardLabelFunction } from "./gridlines"
import { Colors } from '../other/color'
import { LabeledPoint } from './labeled_point'
import { Label2DStyle } from '../styles/label_style'

class FunctionPlot2DInspectionPoint extends LabeledPoint {
  constructor(params={}) {
    super(params)
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

    this.inspectionPointLingers = true
    this.inspectionPointLabelStyle = new Label2DStyle({dir: "NE", fontSize: 14, shadowColor: Colors.WHITE, shadowSize: 2})
  }

  setFunction(func) {
    super.setFunction(func)

    this.removeInspectionPoint()
  }

  removeInspectionPoint() {
    if (this.inspectionPoint)
      this.remove(this.inspectionPoint)
    this.inspectionPoint = null
  }

  update() {
    super.update()

    if (this.inspectionPoint)
      this.inspectionPoint.point.style.fill = this.pen.color
  }

  set inspectionEnabled (value) {
    if (value) {
      this.interactivityEnabled = true
    }

    if (this.inspectionEnabled === value) {
      return
    }

    let inspLeo = 0;

    if (value) {
      this.inspectionListeners['interactive-mousedown'] = this.inspectionListeners['interactive-drag'] = (evt) => {
        inspLeo = 0
        let position = evt.pos

        if (!this.polyline) {
          return
        }

        let closestPoint = this.polyline.closestTo(position)
        let x = this.plot.transform.pixelToPlotX(closestPoint.x)
        let y = this.function(x)

        if (!this.inspectionPoint) {
          this.inspectionPoint = new FunctionPlot2DInspectionPoint({
            position: { x, y },
            labelStyle: this.inspectionPointLabelStyle
          })

          this.inspectionPoint.point.style.fill = this.pen.color

          this.add(this.inspectionPoint)
        } else {
          this.inspectionPoint.position = new Vec2(x, y)
        }

        return true
      }

      this.inspectionListeners['mouseup'] = (evt) => {
        if (!this.inspectionPointLingers)
          this.removeInspectionPoint()
      }

      this.inspectionListeners["click"] = (evt) => {
        if (this.inspectionPointLingers && inspLeo > 0)
          this.removeInspectionPoint()
        inspLeo++
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
