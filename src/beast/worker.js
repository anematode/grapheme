import { PolylineVerticesJob } from './jobs/polyline_vertices_job'

import { addJob, removeJob, Jobs, getJob } from './worker_job_manager'

let JobConstructors = {
  "calculatePolylineVertices": PolylineVerticesJob
}

self.onmessage = (message) => {
  let data = message.data
  let id = data.jobID

  switch (data.type) {
    case "cancelAll":
      Jobs.length = 0
      break
    case "cancel":
      removeJob(getJob(id))
      break
    case "create":
      let constructor = JobConstructors[data.jobType]

      if (!constructor)
        postMessage({type: "error", jobID: id, error: "Invalid constructor " + data.jobType})

      let job = new constructor(id, data.data)

      addJob(job)
  }
}
