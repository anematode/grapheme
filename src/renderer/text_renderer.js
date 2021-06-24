import {packRectangles, potpack} from "../algorithm/rectangle_packing.js"
import {getVersionID, nextPowerOfTwo} from "../core/utils.js"

export class TextRenderer {
  constructor () {
    this.canvas = document.createElement("canvas")
    let ctx = this.ctx = this.canvas.getContext("2d")

    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"
  }

  /**
   * Clear out all previous text stores. In the future, when doing a dynamic text packing, this will be called sometimes
   * to do a reallocation.
   */
  clearText () {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  getMetrics (textInfo) {
    const { ctx } = this
    const { fontSize, font } = textInfo.style

    ctx.font = `${fontSize}px ${font}`

    return ctx.measureText(textInfo.text)
  }

  resizeCanvas (width, height) {
    this.canvas.width = width
    this.canvas.height = height

    const { ctx } = this

    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"
  }

  drawText (textInfos) {
    const { ctx } = this
    const padding = 2  // Extra padding to allow for various antialiased pixels to spill over

    // Sort by font to avoid excess ctx.font modifications
    textInfos.sort((c1, c2) => (c1.style.font < c2.style.font))

    // Compute where to place the text. Note that the text instructions are mutated in this process (in fact, the point
    // of this process is to provide the instruction compiler with enough info to get the correct vertices)
    const rects = []
    for (const draw of textInfos) {
      const metrics = this.getMetrics(draw)

      let shadowDiameter = 2 * draw.style.shadowRadius ?? 0

      const width = Math.ceil(metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) +
        shadowDiameter + padding
      const height = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) +
        shadowDiameter + padding

      draw.metrics = metrics
      draw.rect = { w: width, h: height }

      rects.push(draw.rect)
    }

    const { w: packedWidth, h: packedHeight } = potpack(rects)

    // Powers of two are generally nicer when working with textures
    const canvasWidth = nextPowerOfTwo(packedWidth), canvasHeight = nextPowerOfTwo(packedHeight)

    this.resizeCanvas(canvasWidth, canvasHeight)
    this.clearText()

    ctx.fillStyle = "black"

    // Each draw is now { metrics: TextMetrics, rect: {w, h, x, y}, text, style }
    for (const draw of textInfos) {
      const style = draw.style

      ctx.font = `${style.fontSize}px ${style.font}`
      const shadowRadius = draw.style.shadowRadius ?? 0

      let x = draw.rect.x + draw.metrics.actualBoundingBoxLeft + shadowRadius
      let y = draw.rect.y + draw.metrics.actualBoundingBoxAscent + shadowRadius

      // Stroke text behind the text with white
      if (shadowRadius) {
        ctx.strokeStyle = "white"
        ctx.lineWidth = shadowRadius

        ctx.strokeText(draw.text, x, y)

        ctx.fillStyle = "black"
      }

      ctx.fillText(draw.text, x, y)

      // The actual texture coordinates used should be minus the padding (which is only used for potpack)
      draw.rect.w -= padding
      draw.rect.h -= padding
    }
  }
}
