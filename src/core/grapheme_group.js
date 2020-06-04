import { Element as GraphemeElement } from './grapheme_element'

/** @class GraphemeGroup
 * Used semantically to group elements. All elements already support this.children.
 * */
class GraphemeGroup extends GraphemeElement {
  constructor (params = {}) {
    super(params)
  }
}

export { GraphemeGroup as Group }
