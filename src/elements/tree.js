import { Element as GraphemeElement } from "../core/grapheme_element"
import { PolylineElement } from './polyline'
import { Pen } from "../styles/pen"
import { Label2DStyle } from '../styles/label_style'
import { Label2D } from './label'
import { Vec2 } from '../math/vec'
import { Colors } from '../other/color'

class TreeElement extends GraphemeElement {
  constructor(params={}) {
    super(params)

    this.root = null

    this.pen = new Pen()
    this.label_style = new Label2DStyle({shadowSize: 5, shadowColor: Colors.WHITE})
    this.getTextOfNode = (node) => {
      return node.getText()
    }

    this.vertices = []
    this.labels = []
  }

  update() {
    this.vertices = []
    this.labels = []

    let flattened_nodes = []
    let node_positions = []

    this.root.applyAll((child, depth) => {
      if (!flattened_nodes[depth]) {
        flattened_nodes[depth] = []
      }

      let flat_array = flattened_nodes[depth]
      flat_array.push(child)
    })

    for (let depth = 0; depth < flattened_nodes.length; ++depth) {
      let nodes = flattened_nodes[depth]

      node_positions[depth] = nodes.map((node, i) => {
        let x = (i - nodes.length / 2)
        let y = -depth

        return new Vec2(x, y)
      })
    }

    function getNodePosition(node) {
      for (let depth = 0; depth < flattened_nodes.length; ++depth) {
        let nodes = flattened_nodes[depth]

        for (let i = 0; i < nodes.length; ++i) {
          if (nodes[i] === node) {
            return node_positions[depth][i]
          }
        }
      }
    }

    for (let depth = 0; depth < flattened_nodes.length; ++depth) {
      let nodes = flattened_nodes[depth]
      let positions = node_positions[depth]

      nodes.forEach((node, i) => {
        let parentPos = getNodePosition(node.parent)

        if (parentPos)
          this.vertices.push(positions[i].x, positions[i].y, parentPos.x, parentPos.y, NaN, NaN)

        this.labels.push(new Label2D({
          style: this.label_style,
          text: this.getTextOfNode(node),
          position: this.plot.transform.plotToPixel(positions[i])
        }))
      })
    }

  }

  render(info) {
    super.render(info)

    let polyline = new PolylineElement({pen: this.pen})
    polyline.vertices = this.vertices.slice()

    this.plot.transform.plotToPixelArr(polyline.vertices)

    polyline.render(info)

    this.labels.forEach(label => label.render(info))
  }
}

export { TreeElement }
