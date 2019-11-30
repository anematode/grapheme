import { Element as GraphemeElement } from '../grapheme_element'
import { Vec2 } from '../math/vec2'

const validDirs = ["C", "N", "S", "W", "E", "NW", "NE", "SW", "SE"]

const labelClasses = validDirs.map(s => "grapheme-label-" + s);

// Creates html element of the form
// <div class="label label-S" label-id=this.uuid render-id=renderID>
class Label extends GraphemeElement {
  constructor (params = {}) {
    super(params)

    const {
      text = '',
      mode = '',
      position = new Vec2(0, 0),
      dir = "N"
    } = params

    this.text = text
    this.mode = mode
    this.dir = dir
    this.position = position
  }

  render (renderInfo) {
    const {text, mode, position, dir} = this
    if (!validDirs.includes(dir)) {
      dir = "C"
    }

    if (mode === "2d") {
      if (!this.labelStyle)
        return

      const ctx = renderInfo.text

      let textBaseline;
      let textAlign;

      // text align
      switch (dir) {
        case "C": case "N": case "S":
          textAlign = "center"
          break;
        case "NW": case "W": case "SW":
          textAlign = "left"
          break;
        case "NE": case "E": case "SE":
          textAlign = "right"
          break;
      }

      // text baseline
      switch (dir) {
        case "C": case "W": case "E":
          textBaseline = "middle"
          break;
        case "SW": case "S": case "SE":
          textBaseline = "top"
          break;
        case "NW": case "N": case "NE":
          textBaseline = "bottom"
          break;
      }

      ctx.textBaseline = textBaseline
      ctx.textAlign = textAlign

      ctx.fillText(text, position.x, position.y)
    } else {
      let labelElement = renderInfo.labelManager.getElement(this)

      let labelClass = "grapheme-label-" + dir
      if (!labelElement.classList.contains(labelClass)) {
        labelElement.classList.remove(...labelClasses)
        labelElement.classList.add("grapheme-label-" + dir)
      }

      labelElement.style.top = position.y + "px"
      labelElement.style.left = position.x + "px"

      let oldLatex = labelElement.getAttribute("latex-content")

      if (mode === "latex") {
        // latex-content stores the latex to be rendered to this node, which means
        // that if it is equal to text, it does not need to be recomputed, only maybe
        // moved in some direction
        if (oldLatex !== text) {
          labelElement.setAttribute("latex-content", text)
          katex.render(text, labelElement, {throwOnError: false})
        }
      } else {
        if (oldLatex)
          labelElement.removeAttribute("latex-content")

        labelElement.innerHTML = text
      }
    }
  }
}

export { Label }
