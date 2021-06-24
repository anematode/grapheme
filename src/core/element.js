/**
 * @file This file specifies an Element, which is a component of a Grapheme scene. Elements are similar in design to
 * DOM elements, being nestable and having events.
 *
 * An Element has properties, which may be explicitly specified, inherited
 */

import {Eventful} from "./eventful.js"
import {getStringID, getVersionID} from "./utils.js"
import {Props} from "./props.js"
import {NullInterface} from "./interface.js"

/**
 * The element class.
 */
export class Element extends Eventful {
  constructor (params={}) {
    super()

    /**
     * Unique string id of this element
     * @type {string}
     * @property
     */
    this.id = params.id ?? getStringID()

    if (typeof this.id !== "string" || this.id.length === 0)
      throw new TypeError("The element id must be a non-empty string.")

    /**
     * The parent of this element; null if it has no parent
     * @type{Element|null}
     * @property
     */
    this.parent = null

    /**
     * The scene this element is a part of
     * @type {Scene|null}
     * @property
     */
    this.scene = null

    /**
     * Stores most of the state of the element. Similar to internal but with a lot more predefined behavior
     * @type {Props}
     * @property
     */
    this.props = new Props()

    /**
     * -1 corresponds to an element that has just been created, added, or removed. 0 corresponds to an element which
     * needs an update. 100 corresponds to a completely updated element
     * @type {number}
     */
    this.updateStage = -1

    /**
     * Used for storing intermediate results required for rendering, interactivity and other things
     * @type {Object}
     * @property
     */
    this.internal = {
      version: getVersionID()
    }

    // Call the element-defined constructor
    this.init(params)

    // Call set on remaining parameters. Corollary: constructor-only parameters should not also be parameters (no "id",
    // for example)
    this.set(params)
  }

  _update () {

  }

  apply (callback) {
    callback(this)
  }

  defaultInheritProps () {
    if (this.parent)
      this.props.inheritPropertiesFrom(this.parent.props, this.updateStage === -1)
  }

  getRenderingInfo () {
    if (this.internal.renderInfo)
      return this.internal.renderInfo
  }

  isChild (child, recursive=true) {
    return false
  }

  isScene () {
    return false
  }

  init (params) {

  }

  set (propName, value) {
    this.getInterface().set(this, propName, value)
  }

  get (propName) {
    return this.getInterface().get(this, propName)
  }

  getDict (propNames) {
    return this.getInterface().getDict(this, propNames)
  }

  /**
   * For all given properties, check which ones need to be filled in with default values.
   * @param defaults
   * @param evaluate
   */
  defaultComputeProps () {
    let inter = this.getInterface()
    const needsInitialize = this.updateStage === -1

    inter.computeProps(this.props, needsInitialize)
  }

  getInterface () {
    return NullInterface
  }

  setScene (scene) {
    this.scene = scene
  }

  stringify () {
    this.props.stringify()
  }

  update () {
    // If some properties have changed, set the update stage accordingly. We use .min in case the update stage is -1
    if (this.props.hasChangedProperties)
      this.updateStage = Math.min(this.updateStage, 0)

    if (this.updateStage === 100) return

    this._update()

    this.updateStage = 100
  }
}
