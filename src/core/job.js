
class Job extends Promise {
  constructor(func) {

    const progress = (completed) => this._triggerProgress(completed)

    super((resolve, reject) => {
      func(progress, resolve, reject)
    })

    this.startTime = Date.now()
    this.progressCallbacks = []
  }

  _triggerProgress(completed=0) {
    let time = Date.now()

    this.progressCallbacks.forEach(callback => callback(completed, this.startTime, time))
  }

  progress(callback) {
    this.progressCallbacks.push(callback)

    return this
  }
}

export { Job }
