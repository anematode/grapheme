import { Scene } from './scene.js'
import { constructInterface } from './interface.js'
import { deepClone } from './utils.js'
import { Vec2 } from '../math/vec/vec2.js'
import { calculateRectShift } from '../other/text_utils.js'
import { BoundingBox } from '../math/bounding_box.js'

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

  setHTMLElements (instructions) {
    let internal = this.internal, htmlElements
    let that = this // huzzah

    if (!internal.htmlElements) internal.htmlElements = []
    htmlElements = internal.htmlElements

    // A latex element is of the form { type: "html" | "latex", content: "...", pos: Vec2, domElement: (div), w: (number), h: (number), claimed: false }
    htmlElements.forEach(elem => elem.claimed = false)

    function addElementToDOM (html) {
      let div = document.createElement("div")
      div.innerHTML = html

      div.style.position = "absolute"
      div.style.left = div.style.top = '0'
      div.style.visibility = "none"

      that.domElement.appendChild(div)

      let rect = div.getBoundingClientRect()
      return { div, rect }
    }

    function addElement (html, pos, dir, spacing) {
      let { div, rect } = addElementToDOM(html)

      let shiftedRect = calculateRectShift(new BoundingBox(pos.x, pos.y, rect.width, rect.height), dir, spacing)

      div.style.left = shiftedRect.x + 'px'
      div.style.top = shiftedRect.y + 'px'

      return { pos: new Vec2(shiftedRect.x, shiftedRect.y), domElement: div, w: rect.width, h: rect.height, claimed: true }
    }

    main: for (const instruction of instructions) {
      if (instruction.type === "latex") {
        let { pos, dir, spacing } = instruction

        for (const elem of htmlElements) {
          if (elem.claimed || elem.type !== "latex" || elem.content !== instruction.content) continue

          // then the element's latex content is the same, so we calculate the new position. Note we reuse the old
          // width/height values so that getBoundingClientRect() is only called once
          let shiftedRect = calculateRectShift(new BoundingBox(pos.x, pos.y, elem.w, elem.h), dir, spacing)

          pos = shiftedRect.tl()
          if (elem.pos.x !== pos.x || elem.pos.y !== pos.y) { // need to move the element
            elem.domElement.style.left = shiftedRect.x + 'px'
            elem.domElement.style.top = shiftedRect.y + 'px'

            elem.pos = pos
          }

          elem.claimed = true
          continue main
        }

        console.log('hi')

        // No latex element exists that's unclaimed and has the same content, so we create one
        let elem = addElement(instruction.html, pos, dir, spacing)

        elem.type = "latex"
        elem.content = instruction.content

        htmlElements.push(elem)
      } else {
        // ignore for now
      }
    }

    // Destroy unclaimed html elements
    this.internal.htmlElements = htmlElements.filter(elem => {
      let claimed = elem.claimed

      if (!claimed) {
        this.domElement.removeChild(elem.domElement)
      }

      return claimed
    })
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
