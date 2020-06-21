import { calculatePolylineVertices } from '../math/polyline_vertices'
import { PolylineVerticesJob } from './polyline_vertices_job'

let JOBS = []

function tickJobs() {
  JOBS.forEach(job => job.tick())

  if (JOBS.some(job => job.finished))
    JOBS = JOBS.filter(job => !job.finished)
}

function removeJob(job) {
  let index = JOBS.indexOf(job)

  if (index !== -1) {
    JOBS.splice(index, 1)
  }
}

function getJob(id) {
  for (let i = 0; i < JOBS.length; ++i) {
    if (JOBS[i].id === id) {
      return JOBS[i]
    }
  }

  return null
}

function cancelJob(id) {
  let job = getJob(id)
  if (job) {
    job.cancel()

    removeJob(job)
  }
}

const JobClasses = {
  "calculatePolylineVertices": PolylineVerticesJob
}

function createJob(type, id, data) {
  let jobClass = JobClasses[type]

  if (!jobClass) {
    postMessage({ jobID: id, response: "error", note: "Job class not found"})
    return
  }

  let job = new jobClass(id, data)

  JOBS.push(job)

  return job
}

onmessage = function (evt) {
  const data = evt.data
  const id = data.jobID
  const jobType = data.job
  const jobData = data.data

  if (data.job === "cancel") {
    cancelJob(id)
    return
  }

  createJob(jobType, id, jobData)
}

setInterval(() => {
  tickJobs()
}, 1)


// { job: "calculatePolylineVertices", jobID: 0, data: { vertices: [ ... ], pen: { ... } } }
// { job: "defineFunction", jobID: 1, data: { func: ASTNode.toJSON(), exportedVariables: ['x', 'y'] }}
// { job: "deleteFunction", jobID: 2, data: { functionID: 1 }}
// { job: "calculatePolylineVertices", jobID: 3, data: { pen: pen.toJSON(), vertices: [ ... ]}}
// { job: "generateContours2", jobID: 4, data: { functionID: 1, box: { ... }}}
// { job: "adaptivelySample1D", jobID: 5, data: { functionID: 1, xmin: -1, xmax: 1, ... }}
// { job: "sample1D", jobID: 6, ... }
// { job: "cancel", jobID: 1 }

// { jobID: 0, response: "progress", data: { complete: 0.525 }}
// { jobID: 0, response: "progress", data: { complete: 1 }}
// { jobID: 0, response: "finished", data: { vertices: [ ... ] } }
