import {Element} from "../core/element.js"
import {constructInterface} from "../core/interface.js"
import {DefaultStyles, Pen} from "../styles/definitions.js"

const polylineInterface = constructInterface({
  pen: { setAs: "user", setMerge: true, getAs: "real", description: "The pen used to draw the polyline." },
  vertices: { conversion: "f32_vec2_array", description: "The vertices of the polyline." }
})

export class PolylineElement extends Element {
  _update () {
    const { props } = this

    if (props.hasChanged("pen")) {
      let pen = Pen.compose(DefaultStyles.Pen, props.getUserValue("pen"))

      props.set("pen", pen)
    }
  }

  getInterface () {
    return polylineInterface
  }

  getRenderingInfo () {
    let { vertices, pen } = this.props.proxy
    if (!vertices || !pen) return

    return { type: "polyline", vertices, pen }
  }
}
