import { WorkerJob } from '../worker_job'
import { calculatePolylineVertices } from '../../math/polyline_triangulation'
import { BoundingBox } from '../../math/bounding_box'
import { Vec2 } from '../../math/vec'
import { Pen } from '../../styles/pen'

class PolylineVerticesJob extends WorkerJob {
  constructor(id, data) {
    super(id)

    this.vertices = data.vertices
    this.pen = data.pen ? data.pen : new Pen().toJSON()
    this.box = data.box ? new BoundingBox(data.box) : new BoundingBox(new Vec2(0, 0), 8192, 8192)

    if (!this.vertices)
      this.error("No vertices supplied")
    if (!this.pen)
      this.error("No pen supplied")
    if (!Array.isArray(this.vertices) && !ArrayBuffer.isView(this.vertices))
      this.error("Invalid vertices supplied")
  }

  tick() {
    let result = calculatePolylineVertices(this.vertices, this.pen, this.box)

    this.result(result, [result.glVertices.buffer])
  }
}

export { PolylineVerticesJob }
