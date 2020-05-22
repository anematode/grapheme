import { Element as GraphemeElement } from './grapheme_element'

/** @class Used semantically to group elements */
class GraphemeGroup extends GraphemeElement {
  constructor (params = {}) {
    super(params)
  }
}

export { GraphemeGroup as Group }
