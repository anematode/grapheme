import { removeJob } from './worker_job_manager'

class WorkerJob {
  constructor(id) {
    this.id = id
  }

  error(err) {
    postMessage({type: "error", error: err, jobID: this.id})

    removeJob(this)
  }

  result(res, transferables) {
    postMessage({type: "result", data: res, jobID: this.id}, transferables)

    removeJob(this)
  }

  progress(completed) {
    postMessage({type: "progress", progress: completed, jobID: this.id})
  }
}

export { WorkerJob }
