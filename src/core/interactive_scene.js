import {Scene} from "./scene.js"
import {constructInterface} from "./interface.js"
import {deepClone} from "./utils.js"
import {Vec2} from "../math/vec/vec2.js"

let sceneInterface = Scene.prototype.getInterface()

let interactiveSceneInterface = {
  interface: {
    ...sceneInterface.description.interface,
    interactivity: {typecheck: {type: "boolean"}}
  },
  internal: {
    ...sceneInterface.description.internal,
    interactivity: {type: "boolean", computed: "default", default: true}
  }
}


interactiveSceneInterface = constructInterface(interactiveSceneInterface)

/**
 * A scene endowed with an actual DOM element.
 */
export class InteractiveScene extends Scene {
  init (params) {
    super.init(params)

    this.domElement = document.createElement("canvas")
    this.bitmapRenderer = this.domElement.getContext("bitmaprenderer")
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
    let listeners = this.internal.interactivityListeners = {}

    // Convert mouse event coords (which are relative to the top left corner of the page) to canvas coords
    const getSceneCoords = evt => {
      let rect = this.domElement.getBoundingClientRect()
      return new Vec2(evt.clientX - rect.x, evt.clientY - rect.y)
    }

    ;[ "mousedown", "mousemove", "mouseup", "wheel" ].forEach(eventName => {
      let listener

      if (eventName === "wheel") {
        listener = evt => {
          this.triggerEvent(eventName, { pos: getSceneCoords(evt), deltaY: evt.deltaY })
          evt.preventDefault()
        }
      } else {
        listener = evt => {
          this.triggerEvent(eventName, { pos: getSceneCoords(evt) })
          evt.preventDefault()
        }
      }

      this.domElement.addEventListener(eventName, listeners[eventName] = listener)
    })
  }

  toggleInteractivity () {
    let internal = this.internal
    let interactivity = this.props.get("interactivity")

    if (!!internal.interactivityListeners !== interactivity) {
      interactivity ? this.#enableInteractivityListeners() : this.#disableInteractivityListeners()
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
    const { width, height, dpr } = this.props.proxy
    const { domElement } = this

    domElement.width = width * dpr
    domElement.height = height * dpr

    domElement.style.width = width + 'px'
    domElement.style.height = height + 'px'
  }
}
