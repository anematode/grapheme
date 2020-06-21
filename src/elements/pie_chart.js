import { Element as GraphemeElement} from "../core/grapheme_element"
import { Colors } from '../other/color'
import { Label2DStyle } from '../styles/label_style'
import { Label2D } from './label'
import { expressQuantityPP } from '../core/utils'
import { Vec2 } from '../math/vec'

const PieColors = ["SALMON", "STEELBLUE", "LAVENDER", "MEDIUMORCHID", "INDIGO", "THISTLE", "AZURE", "TAN", "CORNSILK", "MISTYROSE", "DIMGRAY"]

class PieChart extends GraphemeElement {
  constructor(params={}) {
    super(params)

    this.box = null
    this.sectors = [
      {name: "Nitrogen", value: 780840 / 1e6},
      {name: "Oxygen", value: 209460 / 1e6},
      {name: "Argon", value: 9340 / 1e6},
      {name: "Carbon dioxide", value: 413.32 / 1e6},
      {name: "Neon", value: 18.18 / 1e6},
      {name: "Helium", value: 5.24 / 1e6},
      {name: "Methane", value: 1.87 / 1e6},
      {name: "Krypton", value: 1.14 / 1e6}
    ]

    this.critical_angles = {
      "stop_labeling" : 3,
      "label_outside" : 15
    }

    this.label_function = (name, value) => {
      return name + ": " + expressQuantityPP(value)
    }

    this.label_style = new Label2DStyle({color: Colors.BLACK, fontSize: 20})
    this.label_ratio = 0.7
    this.label_padding = 15

    this.starting_angle = 90 // degrees counterclockwise from x axis

    this._paths = []
    this._labels = []
  }

  update() {
    super.update()

    let box = this.box

    if (!box) {
      box = this.plot.transform.box
    }

    let radius = Math.min(box.width, box.height) / 2
    let totalValue = 0

    for (let i = 0; i < this.sectors.length; ++i) {
      let sector = this.sectors[i]
      if (!sector.value) {
        totalValue += 1
      } else {
        totalValue += sector.value
      }
    }

    let theta = -this.starting_angle / 180 * Math.PI
    let cx = box.cx
    let cy = box.cy

    this._paths = []
    this._labels = []

    for (let i = 0; i < this.sectors.length; ++i) {
      let sector = this.sectors[i]
      let value = sector.value
      if (!value) {
        value = 1
      }

      let angle = value / totalValue * 2 * Math.PI
      let angleDeg = angle / Math.PI * 180

      if (angleDeg > this.critical_angles.stop_labeling) {
        let label_angle = theta + angle / 2
        let r = radius * this.label_ratio

        if (angleDeg < this.critical_angles.label_outside) {
          r = radius + this.label_padding
        }

        let x = cx + r * Math.cos(label_angle)
        let y = cy + r * Math.sin(label_angle)

        let pos = new Vec2(x, y)

        let label = new Label2D({style: this.label_style, position: pos})
        label.text = this.label_function(sector.name, sector.value)

        this._labels.push(label)
      } else {
        // Don't label
      }

      let path = new Path2D()
      path.moveTo(cx, cy)
      path.lineTo(cx + radius * Math.cos(theta), cy + radius * Math.sin(theta))
      path.arc(cx, cy, radius, theta, theta+angle)
      path.closePath()

      this._paths.push(path)

      theta += angle
    }
  }

  render(info) {
    super.render(info)

    const ctx = info.ctx

    let colorIndx = 0

    function getSubstituteColor() {
      let color = Colors[PieColors[colorIndx]]

      colorIndx++

      if (colorIndx >= PieColors.length)
        colorIndx = 0

      return color
    }

    for (let i = 0; i < this.sectors.length; ++i) {
      let path = this._paths[i]

      if (path) {
        let color = this.sectors[i].color
        if (!color)
          color = getSubstituteColor()

        ctx.fillStyle = color.hex()
        ctx.fill(path)
      }
    }

    for (let i = 0; i < this._labels.length; ++i) {
      this._labels[i].render(info)
    }
  }
}

export {PieChart}
