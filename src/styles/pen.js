import { Color } from '../other/color'

class Pen {
  constructor (params = {}) {
    const {
      color = new Color(),
      thickness = 2, // in CSS pixels
      dashPattern = [], // lengths of alternating dashes
      dashOffset = 0, // length of dash offset
      endcap = 'round', // endcap, among "butt", "round", "square"
      endcapRes = 1, // angle between consecutive endcap roundings, only used in WebGL
      join = 'miter', // join type, among "miter", "round", "bevel"
      joinRes = 1, // angle between consecutive join roundings
      useNative = false, // whether to use native line drawing, only used in WebGL
      arrowhead = "Normal", // arrowhead to draw
      arrowLocations = [], // possible values of locations to draw: "start", "substart", "end", "subend"
      visible = true
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
    this.visible = visible
  }

  clone() {
    let copy = new Pen(this)
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

  toJSON () {
    return {
      color: this.color.toJSON(),
      thickness: this.thickness,
      dashPattern: this.dashPattern.slice(),
      dashOffset: this.dashOffset,
      endcap: this.endcap,
      endcapRes: this.endcapRes,
      join: this.join,
      joinRes: this.joinRes,
      useNative: this.useNative,
      arrowhead: this.arrowhead,
      arrowLocations: this.arrowLocations.slice(),
      visible: this.visible
    }
  }
}

export { Pen }
