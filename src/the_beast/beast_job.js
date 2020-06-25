class BeastJob {
  constructor(id) {
    this.id = id
    this.finished = false
    this.progress = 0
  }

  tick() {
    try {
      this._tick()
    } catch (e) {
      this.postMessage("error", e.toString())
      this.postMessage("finished", null)

      this.cancel()
    }
  }

  sendProgress(data, transferables=[]) {
    this.postMessage("progress", {progress: this.progress, ...data}, transferables)
  }

  sendFinished(data, transferables=[]) {
    this.progress = 1

    this.sendProgress(data, transferables)

    this.finished = true
  }

  postMessage(responseType, data, transferables=[]) {
    postMessage({response: responseType, jobID: this.id, data}, transferables)
  }

  cancel() {
    this.finished = true
  }
}

export {BeastJob}
