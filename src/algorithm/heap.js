

// Thanks Emscripten for the names!

// Scratch buffer for large operations where the length of the resultant array is unknown. There is no "malloc" here, so
// operations should copy their result to a new array once they are done (which should be relatively fast, since
// it's just a memcpy)
let HEAP = new ArrayBuffer(0x1000000)
let HEAPF32 = new Float32Array(HEAP)
let HEAPF64 = new Float64Array(HEAP)

export { HEAPF32, HEAPF64 }
