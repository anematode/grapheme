import { BeastJob } from './beast_job'

let id = 1

function getJobID() {
  return id++
}

/**
 * Posted messages will be of the following forms:
 * {type: "create", jobID: 2, jobType: "calculatePolylineVertices", data: { ... }}
 * {type: "cancel", jobID: 2}
 * {type: "cancelAll"}
 * Received messages will be of the following forms:
 * {type: "result", jobID: 2, data: { ... }}
 * {type: "error", jobID: 2, error: ... }
 * {type: "progress", jobID: 2, progress: 0.3}
 */
class Beast {
  constructor() {
    this.worker = new Worker("../build/grapheme_worker.js")
    this.worker.onmessage = message => this.receiveMessage(message)

    this.jobs = []
  }

  cancelAll() {
    this.jobs.forEach(job => this.cancelJob(job))

    this.worker.postMessage({type: "cancelAll"})
  }

  receiveMessage(message) {
    let data = message.data

    let id = data.jobID
    let job = this.getJob(id)

    if (!job)
      return

    switch (data.type) {
      case "result":
        job.resolve(data.data)

        this._removeJob(job)

        return
      case "error":
        job.reject(data.error)

        this._removeJob(job)

        return
      case "progress":
        if (job.progress)
          job.progress(data.progress)

        return
    }
  }

  job(type, data, progressCallback=null, transferables=[]) {
    let id = getJobID()

    this.worker.postMessage({type: "create", jobID: id, data, jobType: type}, transferables)

    let job = new BeastJob(this, id, progressCallback)
    this.jobs.push(job)

    return job
  }

  getJob(id) {
    for (let i = 0; i < this.jobs.length; ++i) {
      let job = this.jobs[i]

      if (job.id === id)
        return job
    }
  }

  cancelJob(job, reason="Job cancelled") {
    console.log("cancelled job " + job.id)
    this.worker.postMessage({type: "cancel", jobID: job.id})

    job.reject(reason)

    this._removeJob(job)
  }

  _removeJob(job) {
    let index = this.jobs.indexOf(job)

    if (index !== -1) {
      this.jobs.splice(index, 1)
    }
  }
}

export { Beast }
