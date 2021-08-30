import { Element } from '../core/element.js'
import { constructInterface } from '../core/interface.js'
import { TextStyle } from '../styles/definitions.js'
import { toDir } from '../other/text_utils.js'
import { Vec2 } from '../math/vec/vec2.js'
import { katex } from '../../deps/katex.js'

const latexElementInterface = constructInterface({
  interface: {
    position: {
      description: 'The position of the latex element.',
      conversion: { type: 'Vec2' },
      target: 'pos'
    },
    latex: { description: 'The latex code to be displayed.', typecheck: 'string' },
    dir: { description: 'Alignment direction; "E" is east, a vector is a vector', conversion: toDir },
    spacing: { description: 'How much extra spacing to provide', typecheck: 'number' }
  },
  internal: {
    pos: { type: 'Vec2', computed: 'none' },
    style: {
      type: 'TextStyle',
      computed: 'user',
      compose: true,
      default: TextStyle.default
    },
    dir: { type: 'Vec2', computed: 'default', default: new Vec2(0, 0) },
    spacing: { type: 'number', computed: 'default', default: 0 }
  }
})

function getLatexSizeAndHTML (content) {
  let html = katex.renderToString(content)
  let div = document.createElement("div")

  div.style.visibility = "hidden"
  div.style.position = "absolute"
  div.style.top = "0"
  div.style.left = "0"

  div.innerHTML = html

  document.body.appendChild(div)
  let rect = div.getBoundingClientRect()
  div.remove()

  return { html, rect }
}

export class LatexElement extends Element {
  constructor (params) {
    super(params)
  }

  getInterface () {
    return latexElementInterface
  }

  _update () {
    let code = this.props.get("latex")
    let pos = this.props.get("pos")
    let dir = this.props.get("dir") ?? "C"
    let spacing = this.props.get("spacing") ?? 0

    if (!code || !pos) {
      this.internal.renderInfo = null
      return
    }

    if (this.props.hasChanged("latex")) {
      this.internal.rect = getLatexSizeAndHTML(code).rect
    }

    this.internal.renderInfo = {
      instructions: {
        type: "latex",
        latex: code,
        pos: pos,
        dir,
        spacing
      }
    }
  }
}
