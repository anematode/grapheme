import { Label2D } from './label'
import { Vec2 } from '../math/vec'
import { BoundingBox} from '../math/bounding_box'

const directionPrecedence = ["N", "S", "W", "E", "SW", "SE", "NW", "NE"]

/**
 * Label which automatically figures out where to be placed to have the label shown well.
 */
class SmartLabel extends Label2D {
  constructor(params={}) {
    super(params)

    this.objectBox = null
    this.forceDir = null
    this.renderTop = true
  }

  computeAnchorPoint(dir) {
    const box = this.objectBox

    let y = 0
    let x = 0

    switch (dir) {
      case "W": case "E":
        y = 1
        break
      case "NW": case "NE": case "N":
        y = 0
        break
      case "SW": case "SE": case "S":
        y = 2
        break
    }
    switch (dir) {
      case "NW": case "W": case "SW":
        x = 0
        break
      case "N": case "S":
        x = 1
        break
      case "NE": case "E": case "SE":
        x = 2
        break
    }

    let pos_x = box.x1 + box.width * x / 2
    let pos_y = box.y1 + box.height * y / 2

    return {pos: new Vec2(pos_x, pos_y), reference_x: x, reference_y: y, pos_x, pos_y}
  }

  computeTranslatedBoundingBox(bbox, dir) {
    if (!this.objectBox)
      return

    let bboxc = bbox.clone()

    let anchorInfo = this.computeAnchorPoint(dir)

    let x = 0, y = 0

    switch (anchorInfo.reference_x) {
      case 0:
        x = anchorInfo.pos_x - bbox.width
        break
      case 1:
        x = anchorInfo.pos_x - bbox.width / 2
        break
      case 2:
        x = anchorInfo.pos_x
        break
    }

    switch (anchorInfo.reference_y) {
      case 0:
        y = anchorInfo.pos_y - bbox.height
        break
      case 1:
        y = anchorInfo.pos_y - bbox.height / 2
        break
      case 2:
        y = anchorInfo.pos_y
        break
    }

    bboxc.top_left = new Vec2(x, y)

    return bboxc
  }

  render(info, force=false) {
    if (this.renderTop && !force) {
      info.smartLabelManager.renderTopLabel(this)
      return
    }

    let bbox = this.boundingBoxNaive()

    let dir = this.forceDir
    const sS = this.style.shadowSize

    if (!this.forceDir) {
      let min_area = Infinity

      if (info.smartLabelManager && !this.forceDir) {
        for (let direction of directionPrecedence) {
          let bbox_computed = this.computeTranslatedBoundingBox(bbox, direction)

          let area = info.smartLabelManager.getIntersectingArea(bbox_computed)

          if (area <= min_area) {
            dir = direction
            min_area = area
          }
        }
      }
    }

    let computed = this.computeTranslatedBoundingBox(bbox, dir).pad({
      top: -sS,
      bottom: -sS,
      left: -sS,
      right: -sS
    })

    let anchor_info = this.computeAnchorPoint(dir)

    this.style.dir = dir
    this.position = new Vec2(anchor_info.pos_x, anchor_info.pos_y)

    info.smartLabelManager.addBox(computed)

    super.render(info)
  }
}

export { SmartLabel }
