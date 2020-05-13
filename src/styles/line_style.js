import { Color } from '../other/color'

class LineStyle {
  constructor (params = {}) {
    const {
      color = new Color(),
      thickness = 2, // in CSS pixels
      dashPattern = [], // lengths of alternating dashes
      dashOffset = 0, // length of dash offset
      endcap = 'round', // endcap, among "butt", "round", "square"
      endcapRes = 0.3, // angle between consecutive endcap roundings, only used in WebGL
      join = 'miter', // join type, among "miter", "round", "bevel"
      joinRes = 0.3, // angle between consecutive join roundings
      useNative = true, // whether to use native line drawing, only used in WebGL
      arrowhead = null, // arrowhead to draw
      arrowLocations = [] // possible values of locations to draw: "start", "substart", "end", "subend"
    } = params

    this.color = color
    this.thickness = thickness
    this.dashPattern = dashPattern
    this.dashOffset = dashOffset
    this.endcap = endcap
    this.endcapRes = endcapRes
    this.join = join
    this.joinRes = joinRes
    this.useNative = useNative
    this.arrowhead = arrowhead
    this.arrowLocations = arrowLocations
  }

  clone() {
    let copy = new LineStyle(this)
    copy.color = this.color.clone()
  }

  prepareContext (ctx) {
    ctx.fillStyle = ctx.strokeStyle = this.color.hex()
    ctx.lineWidth = this.thickness
    ctx.setLineDash(this.dashPattern)
    ctx.lineDashOffset = this.dashOffset
    ctx.miterLimit = this.thickness / Math.cos(this.joinRes / 2)
    ctx.lineCap = this.endcap
    ctx.lineJoin = this.join
  }
}

export { LineStyle }
