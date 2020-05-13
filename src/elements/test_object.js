import {Element as GraphemeElement} from "../core/grapheme_element"

class TestObject extends GraphemeElement {
  constructor() {
    super()
  }

  render(renderInfo) {
    super.render(renderInfo)

    this.plot.plotBox.draw(renderInfo.canvasCtx)
  }
}

export {TestObject}
