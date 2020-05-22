import * as utils from './utils'

/**
 The GLResourceManager stores GL resources on a per-context basis. This allows the
 separation of elements and their drawing buffers in a relatively complete way.
 It is given a gl context to operate on, and creates programs in manager.programs
 and buffers in manager.buffers. programs and buffers are simply key-value pairs
 which objects can create (and destroy) as they please.
 It also (TODO) does some convenient gl manipulations, like setting uniforms and attrib
 arrays... because I'm sick of writing that so much
 */
class GLResourceManager {
  // Compiled programs and created buffers

  constructor (gl) {
    this.gl = gl
    this.programs = {}
    this.buffers = {}
  }

  // Compile a program and store it in this.programs
  compileProgram (programName, vertexShaderSource, fragmentShaderSource,
                  vertexAttributeNames = [], uniformNames = []) {
    if (this.hasProgram(programName)) {
      // if this program name is already taken, delete the old one
      this.deleteProgram(programName)
    }

    const { gl } = this

    // The actual gl program itself
    const glProgram = utils.createGLProgram(gl,
      utils.createShaderFromSource(gl, gl.VERTEX_SHADER, vertexShaderSource),
      utils.createShaderFromSource(gl, gl.FRAGMENT_SHADER, fragmentShaderSource))

    // pairs of uniform names and their respective locations
    const uniforms = {}
    for (let i = 0; i < uniformNames.length; ++i) {
      const uniformName = uniformNames[i]

      uniforms[uniformName] = gl.getUniformLocation(glProgram, uniformName)
    }

    // pairs of vertex attribute names and their respective locations
    const vertexAttribs = {}
    for (let i = 0; i < vertexAttributeNames.length; ++i) {
      const vertexAttribName = vertexAttributeNames[i]

      vertexAttribs[vertexAttribName] = gl.getAttribLocation(glProgram, vertexAttribName)
    }

    const programInfo = { program: glProgram, uniforms, attribs: vertexAttribs }
    this.programs[programName] = programInfo
  }

  // Return whether this has a program with that name
  hasProgram (programName) {
    return !!this.programs[programName]
  }

  // Retrieve a program to use
  getProgram (programName) {
    return this.programs[programName]
  }

  // Delete a program
  deleteProgram (programName) {
    if (!this.hasProgram(programName)) return

    {
      const programInfo = this.programs[programName]
      this.gl.deleteProgram(programInfo.program)
    }

    // Remove the key from this.programs
    delete this.programs[programName]
  }

  // Create a buffer with the given name
  createBuffer (bufferName) {
    if (this.hasBuffer(bufferName)) return

    const { gl } = this

    // Create a new buffer
    const buffer = gl.createBuffer()

    this.buffers[bufferName] = buffer
  }

  hasBuffer (bufferName) {
    return !!this.buffers[bufferName]
  }

  getBuffer (bufferName) {
    if (!this.hasBuffer(bufferName)) this.createBuffer(bufferName)
    return this.buffers[bufferName]
  }

  deleteBuffer (bufferName) {
    if (!this.hasBuffer(bufferName)) return
    const buffer = this.getBuffer(bufferName)

    // Delete the buffer from GL memory
    this.gl.deleteBuffer(buffer)
    delete this.buffers[bufferName]
  }
}

export { GLResourceManager }
