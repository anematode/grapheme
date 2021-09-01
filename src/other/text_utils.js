import { Vec2 } from '../math/vec/vec2.js'
import { BoundingBox } from '../math/bounding_box.js'

let canvas, ctx
function initCanvas () {
  if (canvas) return

  canvas = document.createElement('canvas')
  ctx = canvas.getContext('2d')
}

/**
 *
 * @param text {string}
 * @param textStyle {TextStyle}
 * @returns {BoundingBox}
 */
export function measureText (text, textStyle) {
  initCanvas()

  let font = textStyle.font
  let fontSize = textStyle.fontSize ?? 12
  let shadowDiameter = 2 * (textStyle.shadowRadius ?? 0)

  if (!font || !fontSize) throw new Error('Invalid text style')

  ctx.font = `${fontSize}px ${font}`
  let m = ctx.measureText(text)

  let w = m.width + shadowDiameter
  let h = (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + shadowDiameter

  return new BoundingBox(0, 0, w, h)
}

export function toDir (obj) {
  if (obj instanceof Vec2) {
    return obj
  } else if (typeof obj === "string") {
    switch (obj) {
      case "N": return new Vec2(0, -1)
      case "S": return new Vec2(0, 1)
      case "W": return new Vec2(1, 0)
      case "E": return new Vec2(-1, 0)
      case "NE": return new Vec2(-1, -1)
      case "NW": return new Vec2(1, -1)
      case "SE": return new Vec2(-1, 1)
      case "SW": return new Vec2(1, 1)
      case "C": return new Vec2(0, 0)
    }
  } else if (typeof obj === "undefined") {
    return new Vec2(0, 0)
  } else {
    throw new TypeError("Invalid direction")
  }
}

export function calculateRectShift (rect, dir, spacing) {
  dir = toDir(dir)

  let shiftX = dir.x * rect.w / 2, shiftY = dir.y * rect.h / 2
  let shiftLen = Math.hypot(shiftX, shiftY)

  let scaleSpacing = (shiftLen === 0) ? 0 : (shiftLen + spacing) / shiftLen

  shiftX *= scaleSpacing
  shiftY *= scaleSpacing

  shiftX += -rect.w / 2
  shiftY += -rect.h / 2

  return new BoundingBox(rect.x + shiftX, rect.y + shiftY, rect.w, rect.h)
}

/**
 * Generate a text location, using an anchor, direction and spacing. This system is inspired by Asymptote Vector
 * Graphics, where dir might be something like 'N' and the text would shift itself by that much in the north direction
 * @param text {string} Text of the instruction
 * @param textStyle {TextStyle} Style of the text
 * @param anchor {Vec2} Location of the text's anchor
 * @param dir {Vec2|string} Direction in which to shift the text. <1, 1> means shifting the text's bounding box so that the
 * box's top left corner is on the anchor, <0, 1> means shifting so that the anchor is on the text's top midpoint
 * @param spacing {number} Number of extra pixels to add to the shift
 * @returns {BoundingBox} Bounding box of the text
 */
export function genTextRect (text, textStyle, anchor, dir, spacing=1) {
  let rect = measureText(text, textStyle)

  rect.x = anchor.x
  rect.y = anchor.y

  return calculateRectShift(rect, dir, spacing)
}

export function genTextInstruction (text, textStyle, anchor, dir, spacing=1) {
  return {
    type: 'text',
    text: text,
    pos: genTextRect(text, textStyle, anchor, dir, spacing).tl(),
    style: textStyle
  }
}
