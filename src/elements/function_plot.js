import { Pen } from '../styles/pen'
import { InteractiveElement } from "../core/interactive_element"
import { Colors } from '../other/color'
import { adaptively_sample_1d, sample_1d } from '../math/function_plot_algorithm'
import * as utils from "../core/utils"
import { adaptPolyline } from '../math/adapt_polyline'
import { WebGLPolyline } from './webgl_polyline'
import { getFunctionName } from '../core/utils'
import { defineFunction, getFunction, undefineFunction } from '../ast/user_defined'
import { getIntervals, RealInterval } from '../math/real_interval/interval'

// Allowed plotting modes:
// rough = linear sample, no refinement
// fine = linear sample with refinement

class FunctionPlot2D extends InteractiveElement {
  constructor(params={}) {
    super(params)

    const {
      plotPoints = "auto",
      plottingMode = "fine"
    } = params

    this.plotPoints = plotPoints
    this.plottingMode = plottingMode
    this.quality = 1
    this.plottingAxis = 'x'
    this.maxDepth = 4

    this.function = (x) => x
    this.functionName = getFunctionName()

    this.pen = new Pen({color: Colors.RED, useNative: false, thickness: 2})
    this.polyline = null

    this.addEventListener("plotcoordschanged", () => this.markUpdate())

    this.interactivityEnabled = true
  }

  setFunction(func, variable='x') {
    defineFunction(this.functionName, func, [variable])

    this.function = getFunction(this.functionName).evaluate
    this.markUpdate()
  }

  isClick(position) {
    if (!this.polyline)
      return false
    return this.polyline.distanceFrom(position) < this.polyline.pen.thickness * 2
  }

  updateLight(adaptThickness=true) {
    let transform = this.plot.transform

    this.previousTransform = transform.clone()

    adaptPolyline(this.polyline, this.previousTransform, transform, adaptThickness)
  }

  setAxis(axis) {
    if (axis !== 'x' && axis !== 'y')
      throw new Error("Axis should be x or y, not " + axis + ".")

    this.plottingAxis = axis
    this.markUpdate()
  }

  updateAsync(info, progress) {
    if (this.polyline) {
      this.polyline.glVertices = null

      this.polyline.needsBufferCopy = true
    }

    return super.updateAsync(info, progress)
  }

  update(info) {
    super.update()

    let transform = this.plot.transform

    this.previousTransform = transform.clone()

    let { coords, box } = transform

    let plotPoints = this.plotPoints

    let width = this.plottingAxis === 'x' ? box.width : box.height

    if (plotPoints === "auto") {
      plotPoints = this.quality * width
    }

    let vertices = []
    let x1 = this.plottingAxis === 'x' ? coords.x1 : coords.y2
    let x2 = this.plottingAxis === 'x' ? coords.x2 : coords.y1

    let forceNormalPlot = false

    try {
      if (this.plottingMode === "rough") {
        let points = width * this.quality

        vertices = sample_1d(x1, x2, this.function, points)
      } else if (this.plottingMode === "interval") {
        let intervalFunc = getFunction(this.functionName).evaluateInterval
        if (!intervalFunc)
          forceNormalPlot = true

        let points = width * Math.max(this.quality, 1)
        let space = (x2 - x1) / (2 * points)
        let prevY = 0

        for (let i = -1; i <= points; ++i) {
          let x = i / points * (x2 - x1) + x1
          let minX = x - space, maxX = x + space

          let interval = intervalFunc(new RealInterval(minX, maxX))

          if (!interval.defMax || isNaN(interval.min) || isNaN(interval.max)) {
            vertices.push(NaN, NaN)
            prevY = NaN
          } else {
            let intervals = getIntervals(interval)

            if (intervals.length === 0)
              continue

            let closestIntervalI = -1
            let dist = Infinity
            let cow = 0

            intervals.forEach((int, i) => {
              let distMx = Math.abs(int.max - prevY)
              let distMn = Math.abs(int.min - prevY)

              if (distMx < dist) {
                cow=0
                dist = distMx
                closestIntervalI = i
              }

              if (distMn < dist) {
                cow=1
                dist=distMn
                closestIntervalI = i
              }
            })

            if (closestIntervalI !== -1) {
              let firstInterval = intervals[closestIntervalI]

              let min = utils.bound(firstInterval.min)
              let max = utils.bound(firstInterval.max)

              if (cow === 0) {
                vertices.push(minX, max)

                vertices.push(maxX, min)
                prevY = min
              } else {
                vertices.push(minX, min)

                vertices.push(maxX, max)
                prevY = max
              }
            }

            intervals.forEach((int, i) => {
              if (i === closestIntervalI)
                return

              let max = utils.bound(int.max)

              vertices.push(NaN, NaN, x, utils.bound(int.min), x, max, NaN, NaN)

              prevY = max
            })
          }
        }
      }

      if (this.plottingMode === "fine" || forceNormalPlot) {
        vertices = adaptively_sample_1d(x1, x2, this.function,
          width * this.quality, transform.getAspect(), this.plottingAxis === 'x' ? coords.height / box.height : coords.width / box.width, this.maxDepth)
      }
    } catch (e) {
      console.log(e)
    }

    if (this.plottingAxis !== 'x') {
      for (let i = 0; i < vertices.length; i += 2) {
        let tmp = vertices[i]
        vertices[i] = vertices[i + 1]
        vertices[i + 1] = tmp
      }
    }

    this.plot.transform.plotToPixelArr(vertices)

    if (!this.polyline) {
      this.polyline = new WebGLPolyline({
        pen: this.pen,
        alwaysUpdate: false
      })
    }

    this.polyline.vertices = vertices
    this.polyline.update(info)
  }

  render(info) {
    if (!this.polyline)
      return

    info.scissorPlot(true)
    this.polyline.render(info)

    info.scissorPlot(false)

    this.renderChildren(info)
  }

  destroy() {
    if (this.polyline)
      this.polyline.destroy()

    undefineFunction(this.functionName)
  }
}

export { FunctionPlot2D }
