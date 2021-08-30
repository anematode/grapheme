import { Scene } from './scene.js'
import { constructInterface } from './interface.js'
import { deepClone } from './utils.js'
import { Vec2 } from '../math/vec/vec2.js'

let sceneInterface = Scene.prototype.getInterface()

let interactiveSceneInterface = {
  interface: {
    ...sceneInterface.description.interface,
    interactivity: { typecheck: { type: 'boolean' } }
  },
  internal: {
    ...sceneInterface.description.internal,
    interactivity: { type: 'boolean', computed: 'default', default: true }
  }
}

interactiveSceneInterface = constructInterface(interactiveSceneInterface)

/**
 * A scene endowed with an actual DOM element.
 */
export class InteractiveScene extends Scene {
  init (params) {
    super.init(params)

    this.domElement = document.createElement("div")
    this.domElement.style.position = "relative" // so that absolute html children are positioned relative to the div

    this.domCanvas = document.createElement('canvas')

    this.domCanvas.id = this.id

    this.domElement.appendChild(this.domCanvas)
    this.bitmapRenderer = this.domCanvas.getContext('bitmaprenderer')
  }

  #disableInteractivityListeners () {
    let internal = this.internal
    let interactivityListeners = internal.interactivityListeners

    if (!interactivityListeners) return

    for (let listenerType in interactivityListeners) {
      let listener = interactivityListeners[listenerType]

      this.domElement.removeEventListener(listenerType, listener)
    }

    internal.interactivityListeners = null
  }

  #enableInteractivityListeners () {
    this.#disableInteractivityListeners()
    let listeners = (this.internal.interactivityListeners = {})

    // Convert mouse event coords (which are relative to the top left corner of the page) to canvas coords
    const getSceneCoords = evt => {
      let rect = this.domElement.getBoundingClientRect()
      return new Vec2(evt.clientX - rect.x, evt.clientY - rect.y)
    }

    ;['mousedown', 'mousemove', 'mouseup', 'wheel'].forEach(eventName => {
      let listener

      if (eventName === 'wheel') {
        listener = evt => {
          this.triggerEvent(eventName, {
            pos: getSceneCoords(evt),
            deltaY: evt.deltaY
          })
          evt.preventDefault()
        }
      } else {
        listener = evt => {
          this.triggerEvent(eventName, { pos: getSceneCoords(evt) })
          evt.preventDefault()
        }
      }

      let elem = eventName === "mouseup" ? document : this.domElement
      elem.addEventListener(
        eventName,
        (listeners[eventName] = listener)
      )
    })
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

  _update () {
    super._update()

    this.toggleInteractivity()
    this.resizeCanvas()
  }

  getInterface () {
    return interactiveSceneInterface
  }

  resizeCanvas () {
    const { sceneDims } = this.props.proxy
    const { domCanvas } = this

    domCanvas.width = sceneDims.canvasWidth
    domCanvas.height = sceneDims.canvasHeight

    domCanvas.style.width = sceneDims.width + 'px'
    domCanvas.style.height = sceneDims.height + 'px'
  }

  addHTMLElement (element) {
    let domElement = this.domElement

    domElement.appendChild(element)
  }

  destroyHTMLElements () {
    let children = Array.from(this.domElement.children)

    for (const child of children) {
      if (child.id !== this.id) {
        child.style.visibility = "none"
        this.domElement.removeChild(child)
      }
    }
  }
}
