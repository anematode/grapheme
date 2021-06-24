import {Element} from "../core/element.js"


class Cow extends Element {
  constructor (params) {
    super(params)
  }

  computeProps () {
    const { props } = this

    this.defaultInheritProps()
  }
}
