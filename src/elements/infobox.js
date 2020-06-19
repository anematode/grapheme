import {Element as GraphemeElement} from "../core/grapheme_element"


class Infobox extends GraphemeElement {
  constructor() {
    super()

    this.position = {left: undefined, right: 10, top: 10, bottom: undefined}

    this.width = 100
    this.height = 100

    this.box = new BoundingBox()

    this.addEventListener("dprchanged", () => this.updateSync())
    this.addEventListener("resize", () => this.updateSync())
  }

  clearPosition() {
    this.position = {left: undefined, right: 10, top: 10, bottom: undefined}
  }

  getPosition() {

  }

  renderSync(info) {
    super.renderSync(info)
  }
}
