import * as utils from "./utils";

/**
The GLResourceManager stores GL resources on a per-context basis. This allows the
separation of elements and their drawing buffers in a relatively complete way.

It is given a gl context to operate on, and creates programs in manager.programs
and buffers in manager.buffers. programs and buffers are simply key-value pairs
which objects can create (and destroy) as they please.
*/
class GLResourceManager {
  // Compiled programs and created buffers

  constructor(gl) {
    this.gl = gl;
    this.programs = {};
    this.buffers = {};
  }

  // Compile a program and store it in this.programs
  compileProgram(programName, vertexShaderSource, fragmentShaderSource, vertexAttributeNames=[], uniformNames=[]) {
    if (this.hasProgram(programName)) // if this program name is already taken, delete the old one
      this.deleteProgram(programName);

    let gl = this.gl;

    // The actual gl program itself
    let glProgram = utils.createGLProgram(gl,
      utils.createShaderFromSource(gl, gl.VERTEX_SHADER, vertexShaderSource),
      utils.createShaderFromSource(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));

    // pairs of uniform names and their respective locations
    let uniforms = {};
    for (let i = 0; i < uniformNames.length; ++i) {
      let uniformName = uniformNames[i];

      uniforms[uniformName] = gl.getUniformLocation(glProgram, uniformName);
    }

    // pairs of vertex attribute names and their respective locations
    let vertexAttribs = {};
    for (let i = 0; i < vertexAttributeNames.length; ++i) {
      let vertexAttribName = vertexAttributeNames[i];

      vertexAttribs[vertexAttribName] = gl.getAttribLocation(glProgram, vertexAttribName);
    }

    let programInfo = {program: glProgram, uniforms, attribs: vertexAttribs};
    this.programs[programName] = programInfo;
  }

  // Return whether this has a program with that name
  hasProgram(programName) {
    return !!this.programs[programName];
  }

  // Retrieve a program to use
  getProgram(programName) {
    return this.programs[programName];
  }

  // Delete a program
  deleteProgram(programName) {
    if (!this.hasProgram(programName)) return;

    {
      let programInfo = this.programs[programName];
      this.gl.deleteProgram(programInfo.program);
    }

    // Remove the key from this.programs
    delete this.programs[programName];
  }

  // Create a buffer with the given name
  _createBuffer(bufferName) {
    if (this.hasBuffer(bufferName)) return;

    let gl = this.gl;

    // Create a new buffer
    let buffer = gl.createBuffer();

    this.buffers[bufferName] = buffer;
  }

  hasBuffer(bufferName) {
    return !!this.buffers[bufferName];
  }

  getBuffer(bufferName) {
    if (!this.hasBuffer(bufferName))
      this._createBuffer(bufferName);
    return this.buffers[bufferName];
  }

  deleteBuffer(bufferName) {
    if (!this.hasBuffer(bufferName)) return;
    let buffer = this.getBuffer(bufferName);

    // Delete the buffer from GL memory
    this.gl.deleteBuffer(buffer);
    delete this.buffers[bufferName];
  }
}

export {GLResourceManager};
