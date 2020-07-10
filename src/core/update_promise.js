
// new UpdatePromise(
class UpdatePromise extends Promise {
  constructor(executor) {
    super(executor)

    this.jobs = []
    this.timeouts = []
  }

  static get [Symbol.species]() {
    return Promise
  }

  get [Symbol.toStringTag]() {
    return "UpdatePromise"
  }

  cancel() {
    this.jobs.forEach(job => job.cancel())
    this.timeouts.forEach(timeout => clearTimeout(timeout))


  }
}
