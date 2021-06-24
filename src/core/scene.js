import {Group} from "./group.js"
import {BoundingBox} from "../math/bounding_box.js"
import {attachGettersAndSetters, constructInterface} from "./interface.js"
import {Color, Colors} from "../styles/definitions.js"

// Example interface
const sceneInterface = constructInterface({
  interface: {
    width: {
      description: "The width of the scene",
      typecheck: {type: "integer", min: 100, max: 16384}
    },
    height: {
      description: "The height of the scene",
      typecheck: {type: "integer", min: 100, max: 16384}
    },
    dpr: {
      description: "The device pixel ratio of the scene",
      typecheck: {type: "number", min: 1 / 32, max: 32},
      //setAs: "user"
    },
    backgroundColor: {
      description: "The color of the scene background",
      setAs: "user",
      conversion: { type: "Color" }
    },
    sceneDims: {
      description: "The dimensions of the scene",
      readOnly: true
    }
  }, internal: {
    width: {type: "number", computed: "default", default: 640},
    height: {type: "number", computed: "default", default: 480},
    dpr: {type: "number", computed: "default", default: 1},
    backgroundColor: {type: "Color", computed: "user", default: Colors.TRANSPARENT},
    sceneDims: { type: "SceneDimensions", computed: "none" }
  }
})

/**
 * Passed to children as the parameter "sceneDimensions"
 */
class SceneDimensions {
  constructor (width, height, dpr) {
    this.width = width
    this.height = height
    this.dpr = dpr

    // The size of the canvas in true device pixels, rather than CSS pixels
    this.canvasWidth = this.dpr * this.width
    this.canvasHeight = this.dpr * this.height
  }

  /**
   * Get the bounding box of the entire scene.
   * @returns {BoundingBox}
   */
  getBoundingBox () {
    return new BoundingBox(0, 0, this.width, this.height)
  }
}

/**
 * Top level element in a Grapheme context. The scene has a width, height, and device pixel ratio as its defining
 * geometric patterns, and potentially other properties -- interactivity information, for example. Uniquely, every
 * element knows its scene directly as its .scene property.
 */
export class Scene extends Group {
  getInterface() {
    return sceneInterface
  }

  init () {
    this.scene = this

    this.props.setPropertyInheritance("sceneDims", true)
  }

  /**
   * Compute the internal property "sceneDimensions"
   */
  calculateSceneDimensions () {
    const { props } = this

    if (props.haveChanged(["width", "height", "dpr"])) {
      const { width, height, dpr } = props.proxy
      const sceneDimensions = new SceneDimensions(width, height, dpr)

      // Equality check of 2 for deep comparison, in case width, height, dpr have not actually changed
      props.set("sceneDims", sceneDimensions, 0 /* real */, 2 /* equality check */)
    }
  }

  updateProps () {
    this.defaultComputeProps()
    this.calculateSceneDimensions()
  }

  /**
   * Only scenes (and derived scenes) return true
   * @returns {boolean}
   */
  isScene () {
    return true
  }

  _update () {
    this.updateProps()

    this.internal.renderInfo = {
      contexts: {
        type: "scene",
        dims: this.get("sceneDims"),
        backgroundColor: this.get("backgroundColor")
      }
    }
  }

  /**
   * This function updates all the elements and is the only one with the authority to mark all properties, including
   * inheritable properties, as unchanged.
   */
  updateAll () {
    this.apply(child => { child.update() })

    // Mark the update as completed (WIP)
    this.apply(child => child.props.markGlobalUpdateComplete())
  }

}

attachGettersAndSetters (Scene.prototype, sceneInterface)
