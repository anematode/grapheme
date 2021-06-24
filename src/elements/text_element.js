
import {Element} from "../core/element.js"
import {Vec2} from "../math/vec/vec2.js"
import {constructInterface} from "../core/interface.js"
import {Colors, TextStyle} from "../styles/definitions.js"

let textElementInterface = constructInterface({
  interface: {
    style: { description: "The style of the text.", setAs: "user", merge: true },
    position: { description: "The position of the text.", conversion: { type: "Vec2" }, target: "pos" },
    text: { description: "The string of text.", typecheck: "string" }
  },
  internal: {
    pos: { type: "Vec2", computed: "none" },
    style: { type: "TextStyle", computed: "user", compose: true, default: TextStyle.default }
  }
})


export class TextElement extends Element {
  getInterface () {
    return textElementInterface
  }

  _update () {
    this.defaultComputeProps()
    this.internal.renderInfo = { instructions: { type: "text", text: this.props.get("text"), pos: this.props.get("pos"), style: this.props.get("style") }}
  }
}
