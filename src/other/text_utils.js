let canvas, ctx
function initCanvas () {
  if (canvas) return

  canvas = document.createElement("canvas")
  ctx = canvas.getContext("2d")
}

export function measureText (text, textStyle) {
  initCanvas()

  let font = textStyle.font
  let fontSize = textStyle.fontSize

  if (!font || !fontSize) throw new Error("Invalid text style")

  ctx.font = `${fontSize}px ${font}`
  return ctx.measureText(text)
}
