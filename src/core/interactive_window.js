import { Window as GraphemeWindow } from './grapheme_window'

class InteractiveWindow extends GraphemeWindow {
  constructor (graphemeContext, params = {}) {
    super(graphemeContext, params)
  }
}

export { InteractiveWindow }
