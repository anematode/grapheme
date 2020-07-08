
const Jobs = []

function addJob(job) {
  Jobs.push(job)
}

function getJob(id) {
  for (let i = 0; i < Jobs.length; ++i) {
    let job = Jobs[i]

    if (job.id === id)
      return job
  }

  return null
}

function removeJob(job) {
  let index = Jobs.indexOf(job)

  if (index !== -1)
    Jobs.splice(index, 1)
}

function tickJobs() {
  let time = Date.now() + 5

  while (Date.now() < time && Jobs.length !== 0) {
    let job = Jobs[0]

    if (job)
      job.tick()
    else
      return
  }
}

setInterval(tickJobs, 1)


export { Jobs, addJob, removeJob, getJob }
