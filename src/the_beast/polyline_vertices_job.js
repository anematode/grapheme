import { calculatePolylineVertices } from '../math/polyline_vertices'
import { BeastJob } from './beast_job'

class PolylineVerticesJob extends BeastJob {
  constructor(id, data) {
    super(id)

    this.vertices = data.vertices
    this.pen = data.pen
    this.box = data.box
  }

  _tick() {
    let result = calculatePolylineVertices(this.vertices, this.pen, this.box)

    let arr = result.glVertices = result.glVertices.subarray(0, result.vertexCount * 2)

    this.sendFinished(result, [arr.buffer])
  }
}

export { PolylineVerticesJob }
