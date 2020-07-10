class BeastJob extends Promise {
  constructor(beast, id, progressCallback=null) {
    if (beast instanceof Function) {
      return super(beast)
    }

    let resolveFunc, rejectFunc

    super((resolve, reject) => {
      resolveFunc = resolve
      rejectFunc = reject
    })

    this.resolve = resolveFunc
    this.reject = rejectFunc
    this.progress = progressCallback
    this.beast = beast
    this.id = id
  }

  static get [Symbol.species]() {
    return Promise
  }

  get [Symbol.toStringTag]() {
    return "BeastJob"
  }

  cancel() {
    this.reject("Job cancelled")

    this.beast.cancelJob(this)
  }
}

export { BeastJob }
