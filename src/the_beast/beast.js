import { getJobID, Job } from './job'

class Beast {
  constructor() {
    this.worker = new Worker("../build/grapheme_worker.js")

    this.worker.onmessage = (evt) => {
      this.onMessage(evt)
    }

    this.jobs = []
  }

  cancelJob(job) {
    this.worker.postMessage({job: "cancel", jobID: job.id})
    this.removeJob(job)
  }

  removeJob(job) {
    let index = this.jobs.indexOf(job)

    if (index !== -1) {
      this.jobs.splice(index, 1)
    }
  }

  onMessage(evt) {
    const data = evt.data

    switch (data.response) {
      case "error":
        this.jobs.forEach(job => {
          if (job.id === data.jobID) {
            job.error(data.data)
          }
        })
        break
      case "progress":
        this.jobs.forEach(job => {
          if (job.id === data.jobID) {
            job.triggerEvent("progress", data.data)

            if (data.data.progress === 1) {
              this.removeJob(job)
            }
          }
        })
        break
      default:
        throw new Error("HUH?")
    }
  }

  createJob(type, data) {
    let id = getJobID()

    this.worker.postMessage({job: type, jobID: id, data})

    let job = new Job(this, id)

    this.jobs.push(job)

    return job
  }

  terminate() {
    this.jobs.forEach(job => job.cancel())
    this.jobs = []

    this.worker.terminate()
  }
}

export { Beast }
