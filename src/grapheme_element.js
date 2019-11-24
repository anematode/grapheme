import { Window as GraphemeWindow } from "./grapheme_window";
import * as utils from "./utils";

/**
A GraphemeElement is a part of a GraphemeWindow. It has a certain precedence
(i.e. the order in which it will be drawn onto the GL portion and the 2D canvas portion.)
*/
class GraphemeElement {
  constructor(window, params={}) {
    utils.checkType(window, GraphemeWindow)

    this.window = window;
    this.context = window.context;

    // precedence is a number from -Infinity to Infinity.
    this.precedence = utils.select(params.precedence, 0);

    this.window.addElement(this);
  }

  render(elementInfo) {

  }

  destroy() {
    let elements = this.context.elements;
    let index = elements.indexOf(this);

    if (index !== -1) {
      elements.splice(index, 1);
    }
  }
}

export { GraphemeElement as Element };
