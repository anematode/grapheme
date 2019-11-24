import { Window as GraphemeWindow } from "./grapheme_window";

/**
A GraphemeElement is a part of a GraphemeWindow. It has a certain precedence
(i.e. the order in which it will be drawn onto the GL portion and the 2D canvas portion.)
*/
class GraphemeElement {
  constructor(window, params={}) {
    utils.checkType(window, GraphemeWindow);

    this.window = window;
    // precedence is a number from -Infinity to Infinity.
    this.precedence = utils.select(params.precedence, 0);
  }

  render(elementInfo) {

  }
}

export { GraphemeElement as Element };
