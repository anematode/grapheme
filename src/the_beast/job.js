import { assert } from '../core/utils'
import {Beast } from './beast'

let id = 0

function getJobID() {
  return id++
}

class Job {
  constructor(beast, id) {
    assert(beast instanceof Beast)

    this.beast = beast
    this.id = id

    this.eventListeners = {}
  }

  addEventListener(type, callback) {
    if (!this.eventListeners[type])
      this.eventListeners[type] = [callback]
    else
      this.eventListeners[type].push(callback)
  }

  triggerEvent(type, evt) {
    this.eventListeners[type] ? this.eventListeners[type].forEach(callback => callback(evt)) : null
  }

  progress(callback) {
    this.addEventListener("progress", callback)
    return this
  }

  finished(callback) {
    this.addEventListener("finished", callback)
    return this
  }

  cancelled(callback) {
    this.addEventListener("cancel", callback)
    return this
  }

  onError(callback) {
    this.addEventListener("error", callback)
  }

  error(err) {
    if (this.eventListeners["error"].length > 0) {
      this.triggerEvent("error")
    } else {
      throw new Error(err)
    }
  }

  cancel() {
    this.beast.cancelJob(this)
    this.triggerEvent("cancel")
  }
}

export {Job, getJobID}
