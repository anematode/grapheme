import { constructInterface } from '../core/interface.js'
import { Figure } from './figure.js'
import { LinearPlot2DTransform, LinearPlot2DTransformConstraints } from '../math/plot_transforms.js'

let figureInterface = Figure.prototype.getInterface()
const defaultView = [-1, -1, 2, 2]

const plot2DInterface = constructInterface({
  interface: {
    ...figureInterface.description.interface
  },
  internal: {
    ...figureInterface.description.internal,

    // Transformation from pixel to graph coordinates and vice versa
    plotTransform: {
      computed: 'default',
      default: () => new LinearPlot2DTransform(0, 0, 0, 0, ...defaultView),
      evaluateDefault: true
    },

    // Whether to force the plot transform to have a specific aspect ratio
    preserveAspectRatio: { computed: 'default', default: true },

    // The aspect ratio to force
    forceAspectRatio: { computed: 'default', default: 1 },

    // Constraints on where the transform can be (min zoom, max zoom, etc.)
    transformConstraints: {
      computed: 'default',
      default: () => new LinearPlot2DTransformConstraints(),
      evaluateDefault: true
    }
  }
})

/**
 * A version of Figure which is intended for a 2D graph, and thus has an inheritable property plotTransform
 */
export class Plot2D extends Figure {
  constructor (params) {
    super(params)
  }

  getInterface () {
    return plot2DInterface
  }

  #disableInteractivityListeners () {
    let internal = this.internal
    let interactivityListeners = internal.interactivityListeners

    if (!interactivityListeners) return

    for (let listenerType in interactivityListeners) {
      let listener = interactivityListeners[listenerType]

      this.removeEventListener(listenerType, listener)
    }

    internal.interactivityListeners = null
  }

  #enableInteractivityListeners () {
    this.#disableInteractivityListeners()

    let int = this.internal,
      props = this.props
    let listeners = (this.interactivityListeners = {})

    this.addEventListener(
      'mousedown',
      (listeners.mousedown = evt => {
        int.mouseDownAt = evt.pos
        int.graphMouseDownAt = props
          .get('plotTransform')
          .pixelToGraph(int.mouseDownAt) // try to keep this constant

        int.isDragging = true
      })
    )

    this.addEventListener(
      'mouseup',
      (listeners.mousedown = () => {
        int.isDragging = false
      })
    )

    this.addEventListener(
      'mousemove',
      (listeners.mousemove = evt => {
        if (!int.isDragging) return
        let transform = props.get('plotTransform')
        let constraints = props.get('transformConstraints')
        let newTransform = transform.clone()

        // Get where the mouse is currently at and move (graphMouseDownAt) to (mouseDownAt)
        let graphMouseMoveAt = transform.pixelToGraph(evt.pos)
        let translationNeeded = int.graphMouseDownAt.sub(graphMouseMoveAt)

        newTransform.gx1 += translationNeeded.x
        newTransform.gy1 += translationNeeded.y

        newTransform = constraints.limitTransform(transform, newTransform)

        props.set(
          'plotTransform',
          newTransform,
          0 /* real */,
          2 /* deep equality */
        )
      })
    )

    // Scroll handler
    this.addEventListener(
      'wheel',
      (listeners.wheel = evt => {
        let transform = props.get('plotTransform')
        let constraints = props.get('transformConstraints')
        let newTransform = transform.clone()

        let scaleFactor = Math.exp(evt.deltaY / 1.5e5)
        let graphScrollAt = transform.pixelToGraph(evt.pos)

        // We need to scale graphBox at graphScrollAt with a scale factor. We translate it by -graphScrollAt, scale it by
        // sF, then translate it by graphScrollAt
        let graphBox = transform.graphBox()
        graphBox = graphBox
          .translate(graphScrollAt.mul(-1))
          .scale(scaleFactor)
          .translate(graphScrollAt)

        newTransform.resizeToGraphBox(graphBox)
        newTransform = constraints.limitTransform(transform, newTransform)

        props.set(
          'plotTransform',
          newTransform,
          0 /* real */,
          2 /* deep equality */
        )
      })
    )
  }

  toggleInteractivity () {
    let internal = this.internal
    let interactivity = this.props.get('interactivity')

    if (!!internal.interactivityListeners !== interactivity) {
      interactivity
        ? this.#enableInteractivityListeners()
        : this.#disableInteractivityListeners()
    }
  }

  computePlotTransform () {
    // We compute the plot transform from its current value, the plotting box, and related values which constrain the
    // plot transform (minZoom, maxZoom, preserveAspectRatio). The algorithm is as follows:

    // 1: resize the pixel box to the plotting box
    // 2: if preserveAspectRatio is true, stretch *out* from (cx, cy) as necessary to get an aspect ratio of forceAspectRatio
    // 3: To avoid some strange case where float values repeatedly cause the plot transform to change minutely because
    //    forceAspectRatio demands it, no stretching occurs if the aspect ratio is already proportionally close to the
    //    real aspect ratio
    // 4: ... other constraints ....

    const { props } = this
    let { plotTransform, plottingBox, preserveAspectRatio } = props.proxy

    plotTransform.resizeToPixelBox(plottingBox)

    if (preserveAspectRatio) {
      let graphBox = plotTransform.graphBox()
    }

    props.markChanged('plotTransform')
  }

  _update () {
    super._update()

    this.computePlotTransform()
    this.toggleInteractivity()
  }
}
