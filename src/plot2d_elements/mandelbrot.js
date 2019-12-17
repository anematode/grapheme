import { Plot2DElement } from '../core/plot2d_element'
import * as utils from '../core/utils.js'

function defaultMandelbrotColorFunction (iterations, r) {
  if (iterations === -1) {
    return [0, 0, 0, 255]
  } else {
    return [255, 255, 255, 255]
  }
}

class Mandelbrot extends Plot2DElement {
  constructor (params = {}) {
    super(params)

    this.alwaysUpdate = false

    this.imgData = false

    this.smoothColoring = true

    this.getColor = defaultMandelbrotColorFunction

    this.samples = 1

    this.pxWidth = 0
    this.pxHeight = 0

    this.iterations = 100
  }

  update () {
    this.pxWidth = this.plot.plottingBox.width * utils.dpr
    this.pxHeight = this.plot.plottingBox.height * utils.dpr

    const imgData = this.window.canvasCtx.createImageData(this.pxWidth, this.pxHeight)

    const pc = this.plot.plotCoords
    const iterations = this.iterations

    for (let j = 0; j < this.pxHeight; ++j) {
      const y = pc.height * j / this.pxHeight + pc.y1
      for (let i = 0; i < this.pxHeight; ++i) {
        const x = pc.width * i / this.pxWidth + pc.x1

        const index = 4 * (this.pxWidth * j + i)

        let xt = x
        let yt = y
        let mag2 = xt * xt + yt * yt
        let iter = 0

        while (mag2 < 4 && iter < iterations) {
          const xtt = xt

          xt = xt * xt - yt * yt + x
          yt = 2 * xtt * yt + y
          mag2 = xt * xt + yt * yt

          iter += 1
        }

        if (iter === iterations) {
          iter = -1
        }

        const color = this.getColor(iter, mag2 - 4)

        imgData.data[index] = color[0]
        imgData.data[index + 1] = color[1]
        imgData.data[index + 2] = color[2]
        imgData.data[index + 3] = color[3]
      }
    }

    this.imgData = imgData
  }

  render (renderInfo) {
    if (this.imgData) {
      const ctx = renderInfo.canvasCtx
      ctx.save()
      ctx.resetTransform()

      ctx.putImageData(this.imgData, utils.dpr * this.plot.plottingBox.x1, utils.dpr * this.plot.plottingBox.y1)
      ctx.restore()
    }
  }
}

export { Mandelbrot }
