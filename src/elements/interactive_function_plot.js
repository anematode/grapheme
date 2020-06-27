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

    this.inspListeners = {}

    this.inspectionEnabled = true

    this.inspPt = null
    this.inspPos = null

    this.inspectionPointLingers = true
    this.inspPtLabelStyle = new Label2DStyle({dir: "NE", fontSize: 14, shadowColor: Colors.WHITE, shadowSize: 2})
  }

  setFunction(func) {
    super.setFunction(func)

    this.removeInspectionPoint()
  }

  removeInspectionPoint() {
    if (this.inspPt)
      this.remove(this.inspPt)
    this.inspPt = null
  }

  update(info) {
    super.update(info)

    if (this.inspPt && this.inspPos) {
      this.inspPt.position = this.plot.transform.plotToPixel(this.inspPos)

      this.inspPt.style.fill = this.pen.color

      this.inspPt.markUpdate()
    }
  }

  set inspectionEnabled (value) {
    if (value)
      this.interactivityEnabled = true

    if (this.inspectionEnabled === value)
      return

    let inspLeo = 0;

    if (value) {
      this.inspListeners['interactive-mousedown'] = this.inspListeners['interactive-drag'] = (evt) => {
        inspLeo = 0
        let position = evt.pos

        if (!this.polyline) {
          return
        }

        let closestPoint = this.polyline.closestTo(position)
        let x = this.plot.transform.pixelToPlotX(closestPoint.x)
        let y = this.function(x)

        if (!this.inspPt) {
          this.inspPt = new FunctionPlot2DInspectionPoint({
            position: { x, y },
            labelStyle: this.inspPtLabelStyle
          })

          this.inspPt.style.fill = this.pen.color

          this.add(this.inspPt)
        } else {
          let pos = new Vec2(x, y)

          this.inspPos = pos

          let inspPt = this.inspPt
          inspPt.position = this.plot.transform.plotToPixel(pos)

          inspPt.label.text = "(" + pos.asArray().map(StandardLabelFunction).join(', ') + ')'
        }

        this.inspPt.markUpdate()

        return true
      }

      this.inspListeners["click"] = (evt) => {
        if (this.inspectionPointLingers && inspLeo > 0)
          this.removeInspectionPoint()
        inspLeo++
      }

      for (let key in this.inspListeners) {
        this.addEventListener(key, this.inspListeners[key])
      }
    } else {
      for (let key in this.inspListeners) {
        this.removeEventListener(key, this.inspListeners[key])
      }

      if (this.inspPt) {
        this.remove(this.inspPt)
      }

      this.inspListeners = {}
    }
  }
}

export { InteractiveFunctionPlot2D }
