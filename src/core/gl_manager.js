import * as utils from './utils'

/**
 @class GLResourceManager stores GL resources on a per-context basis. This allows the
 separation of elements and their drawing buffers in a relatively complete way.
 It is given a gl context to operate on, and creates programs in manager.programs
 and buffers in manager.buffers. programs and buffers are simply key-value pairs
 which objects can create (and destroy) as they please.
 */
class GLResourceManager {
  /**
   * Construct a GLResourceManager
   * @param gl {WebGLRenderingContext} WebGL context the manager will have dominion over
   */
  constructor (gl) {
    // WebGL rendering context
    this.gl = gl

    // Compiled programs and created buffers
    this.programs = {}
    this.buffers = {}
  }

  /**
   * Compile a program and store it in this.programs
   * @param programName {string} Name of the program, used to identify the program
   * @param vertexShaderSource {string} Source code of the vertex shader
   * @param fragmentShaderSource {string} Source code of the fragment shader
   * @param vertexAttributeNames {Array} Array of vertex attribute names
   * @param uniformNames {Array} Array of uniform names
   */
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

    this.programs[programName] = {
      program: glProgram,
      uniforms,
      attribs: vertexAttribs
    }
  }

  /**
   * Whether a program with programName exists
   * @param programName {string} Name of the program
   * @returns {boolean} Whether that program exists
   */
  hasProgram (programName) {
    return !!this.programs[programName]
  }

  /**
   * Retrieve program from storage
   * @param programName {string} Name of the program
   * @returns {Object} Object of the form {program, uniforms, vertexAttribs}
   */
  getProgram (programName) {
    return this.programs[programName]
  }

  /**
   * Delete a program
   * @param programName {string} Name of the program to be deleted
   */
  deleteProgram (programName) {
    if (!this.hasProgram(programName)) return

    const programInfo = this.programs[programName]
    this.gl.deleteProgram(programInfo.program)

    // Remove the key from this.programs
    delete this.programs[programName]
  }

  /**
   * Create a buffer with a certain name, typically including a WebGLElement's id
   * @param bufferName {string} Name of the buffer
   */
  createBuffer (bufferName) {
    // If buffer already exists, return
    if (this.hasBuffer(bufferName)) return

    const { gl } = this

    // Create a new buffer
    this.buffers[bufferName] = gl.createBuffer()
  }

  /**
   * Whether this manager has a buffer with a given name
   * @param bufferName Name of the buffer
   * @returns {boolean} Whether this manager has a buffer with that name
   */
  hasBuffer (bufferName) {
    return !!this.buffers[bufferName]
  }

  /**
   * Retrieve a buffer with a given name, and create it if it does not already exist
   * @param bufferName Name of the buffer
   * @returns {WebGLBuffer} Corresponding buffer
   */
  getBuffer (bufferName) {
    if (!this.hasBuffer(bufferName)) this.createBuffer(bufferName)
    return this.buffers[bufferName]
  }

  /**
   * Delete buffer with given name
   * @param bufferName Name of the buffer
   */
  deleteBuffer (bufferName) {
    if (!this.hasBuffer(bufferName)) return
    
    const buffer = this.getBuffer(bufferName)
    const { gl } = this

    // Delete the buffer from GL memory
    gl.deleteBuffer(buffer)
    delete this.buffers[bufferName]
  }
}

export { GLResourceManager }
