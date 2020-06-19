import { Element as GraphemeElement } from "../core/grapheme_element"

class ConwaysGameOfLifeElement extends GraphemeElement {
  constructor(params={}) {
    super(params)

    const {
      size = {
        x: 200,
        y: 200
      }
    } = params

    this.setSize(size.x, size.y)
  }

  setSize(x, y) {
    this.cells = new Uint8Array(x * y)
    this.width = x
    this.height = y
  }

  setCell(x, y, value) {
    this.cells[x*this.height+y] = value
  }

  tickGame() {
    const cells = this.cells

    if (!this.new_cells) {
      this.new_cells = new Uint8Array(this.width * this.height)
    }

    let new_cells = this.new_cells
    new_cells.set(cells)

    for (let i = 0; i < this.width; ++i) {
      for (let j = 0; j < this.height; ++j) {
        let neighborCount = 0

        for (let x = -1; x <= 1; ++x) {
          if (i+x < 0 || i+x >= this.width) {
            continue
          }

          for (let y = -1; y <= 1; ++y) {
            if ((x === 0 && y === 0) || (j+y < 0 || j+y >= this.height)) {
              continue
            }

            if (cells[(x+i) * this.height + (y+j)]) {
              neighborCount++
            }
          }
        }

        if (neighborCount === 3) {
          new_cells[i * this.height + j] = 1
        } else if (neighborCount < 2) {
          new_cells[i * this.height + j] = 0
        } else if (neighborCount > 3) {
          new_cells[i * this.height + j] = 0
        }
      }
    }

    this.cells.set(new_cells)
  }

  render(info) {
    super.render(info)

    const ctx = info.ctx

    let simpleTransform = this.plot.transform.getPlotToPixelTransform()

    let {x_m, y_m, x_b, y_b} = simpleTransform

    ctx.fillStyle="green"

    ctx.save()
    this.plot.transform.box.clip(ctx)

    for (let i = 0; i < this.width; ++i) {
      let offset = i * this.height
      for (let j = 0; j < this.height; ++j) {
        let cell = this.cells[offset + j]

        if (cell) {
          ctx.fillRect(x_m * i + x_b, y_m * j + y_b, x_m, y_m)
        }
      }
    }

    ctx.restore()
  }
}

export { ConwaysGameOfLifeElement }
