import { BeastFunction } from './beast_function'

const Functions = {

}

let functionID = 0

function getFunctionID() {
  return ++functionID
}

function defineFunction(nodeJSON) {
  let function_id = getFunctionID()

  Functions[function_id] = new BeastFunction(nodeJSON)

  return function_id
}

function deleteFunction(function_id) {
  delete Functions[function_id]
}

onmessage = function (evt) {

}



// { job: "defineFunction", jobID: 1, data: { func: ASTNode.toJSON(), exportedVariables: ['x', 'y'] }}
// { job: "deleteFunction", jobID: 2, data: { functionID: 1 }}
// { job: "calculatePolylineVertices", jobID: 3, data: { pen: pen.toJSON(), vertices: [ ... ]}}
// { job: "generateContours2", jobID: 4, data: { functionID: 1, box: { ... }}}
// { job: "adaptivelySample1D", jobID: 5, data: { functionID: 1, xmin: -1, xmax: 1, ... }}
// { job: "sample1D", jobID: 6, ... }
//
