import { FunctionPlot2D } from './function_plot'
import { PointElement } from './point'
import { Element as GraphemeElement } from "../core/grapheme_element"
import { Vec2 } from '../math/vec'

class FunctionPlot2DInspectionPoint extends GraphemeElement {
  constructor (params = {}) {
    super()

    this.position = params.position || new Vec2(0, 0)

    this.point = new PointElement()
  }

  update () {
    this.point.position = this.plot.transform.plotToPixel(this.position)
  }

  render (info) {
    super.render(info)

    this.point.render(info)
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

      this.inspectionListeners['interactive-mouseup'] = (evt) => {
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
