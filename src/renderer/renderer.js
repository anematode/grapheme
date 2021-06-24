/**
 * Grapheme's renderer is going to be pretty monolithic, with a lot of interdependent moving parts. As such, I'm going
 * to keep it mostly contained within one class, perhaps with some helper classes. Doing so will also help eliminate
 * fluff and make optimization easy and expressive.
 *
 * On the surface, Grapheme's rendering sequence is simple: the renderer traverses through the scene, calls
 * getRenderingInfo() on every element, compiles a list of all the instructions (which look something like
 * "draw this set of triangles", "draw this text"), and runs them all, returning the final product. But if the rendering
 * pipeline were so simple, there would be little point in using WebGL at all. Why not just use Canvas2D? Why learn such
 * a ridiculous API? The name of the game is parallelism and optimization. Where WebGL excels at is low-level control
 * and rapid parallel computation. Its weaknesses are in a lack of intrinsic functions (lacking text, for example) and
 * high complexity and verbosity,
 *
 * Imagine we did indeed render a scene instruction by instruction. We come across a line, so we switch to the polyline
 * program, load in the vertices into a buffer, and drawArrays -- draw it to the canvas. We then come across a piece of
 * text. WebGL cannot render text, so we switch over to a Canvas2D context and draw a piece of text onto a blank canvas.
 * We then load the blank canvas as a texture into WebGL and switch to the text program, loading in a set of vertices
 * specifying where the text is, and calling drawArrays. We then come across a couple hundred polylines in a row. For
 * each polyline, we copy its data to the buffer and render it.
 *
 * This is madness. There are two serious problems here. One is that loading buffers and textures is slow, for various
 * reasons. Another is that parallelism is seriously lacking. We have to call drawArrays several hundred times for those
 * polylines, and each call has a large constant time overhead.
 *
 * The renderer thus has several difficult jobs: minimizing buffer and texture loading, and combining consecutive calls
 * into one large drawArrays call. Accomplishing these jobs (and a few more) requires somewhat intricate algorithms,
 * which should of course be designed to allow more esoteric draw calls -- for a Mandelbrot set, say -- to still be
 * handled with consistency. There is no perfect solution, but there are certainly gains to be made. As with the props
 * of Grapheme elements, the problem is made easier by high-level abstraction. The renderer should produce a comparable
 * result when optimized, compared to when every call is made individually. (They need not be exactly the same, for
 * reasons that will become apparent.)
 *
 * Even more annoying is that the WebGL context may suddenly crash and all its buffers and programs lost in the ether.
 * The renderer thus has to be able to handle such data loss without indefinitely screwing up the rendering process. So
 * I have my work cut out, but that's exciting.
 *
 * The current thinking is a z-index based system with heuristic reallocation of changing and unchanging buffers. Given
 * a list of elements and each element's instructions, we are allowed to rearrange the instructions under certain
 * conditions: 1. instructions are drawn in order of z-index and 2. specific instructions within a given z-index may
 * specify that they must be rendered in the order in which they appear in the instruction list. The latter condition
 * allows deterministic ordering of certain instructions on the same z-index, which is useful when that suborder does
 * matter (like when two instructions for a given element are intended to be one on top of the other). Otherwise, the
 * instructions may be freely rearranged and (importantly) combined into larger operations that look the same.
 *
 * Already, such a sorting system is very helpful. Text elements generally specify a z-index of Infinity, while
 * gridlines might specify a z-index of 0 to be behind most things, and a draggable point might have an index of 20. A
 * simple algorithm to render a static image is to sort by z-index, then within each z-index group triangle draw calls
 * with the same color together, and group text draw calls together. We then proceed to render each z-index's grouped
 * calls in order.
 *
 * For a static scene, such a rendering system would work great. But in a dynamic scene, constantly reoptimizing the
 * entire scene as a result of changing some inconsequential little geometry would be stupid. Ideally, changing a little
 * geometry would merely update a single buffer or subsection of a buffer. Yet some changes do require a complete re-
 * distribution of instructions; if the scene's size doubled, for example, and all the elements changed substantially.
 * We can certainly cache information from the previous rendering process of a scene, but what do we cache? How do we
 * ensure stability and few edge cases? How do we deal with context loss?
 *
 * The first step is to understand exactly what instructions are. *Anonymous* instructions have a type, some data, and
 * an element id (which element it originated from). *Normal* instructions have a type, some data, an element id, an
 * instruction id, and a version. The point of normal instructions is to represent a sort of "draw concept", where after
 * an update, that instruction may have changed slightly, but will still have the same id. The instruction associated
 * with a function plot, for example, will have some numerical ID, and when the plot changes somehow, the version will
 * increase, but the numerical ID will remain the same. Conceptually, this means that the instruction to draw the
 * function plot has been rewritten, and the old data is basically irrelevant -- and buffers associated with that
 * data can and should be reused or reallocated.
 *
 * Anonymous instructions, on the other hand, have no identical concept of "versioning". Anonymous instructions are
 * entirely reallocated or deleted every time their element updates. These instructions are generally used to indicate
 * instructions which are very prone to change and where its values should be tied solely to the element updating.
 */

import {TextRenderer} from "./text_renderer.js"
import {Colors, Pen} from "../styles/definitions.js"
import {SceneGraph} from "./scene_graph.js"

// Functions taken from Mozilla docs
function createShaderFromSource (gl, shaderType, shaderSource) {
  const shader = gl.createShader(shaderType)

  gl.shaderSource(shader, shaderSource)
  gl.compileShader(shader)

  const succeeded = gl.getShaderParameter(shader, gl.COMPILE_STATUS)

  if (succeeded) return shader
  const err = new Error(gl.getShaderInfoLog(shader))

  gl.deleteShader(shader)
  throw err
}

function createGLProgram (gl, vertexShader, fragShader) {
  const program = gl.createProgram()

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragShader)

  gl.linkProgram(program)

  const succeeded = gl.getProgramParameter(program, gl.LINK_STATUS)

  if (succeeded) return program
  const err = new Error(gl.getProgramInfoLog(program))

  gl.deleteProgram(program)
  throw err
}

const MonochromaticGeometryProgram = {
  vert: `
precision highp float;
attribute vec2 vertexPosition;
// Transforms a vertex from pixel coordinates to clip space
uniform vec2 xyScale;
vec2 displacement = vec2(-1, 1);
         
void main() {
   gl_Position = vec4(vertexPosition * xyScale + displacement, 0, 1);
}`,
  frag: `precision highp float;
uniform vec4 color;
        
void main() {
   gl_FragColor = color;
}`
}

const MulticolorGeometryProgram = [`
precision highp float;
attribute vec2 vertexPosition;
attribute vec4 vertexColor;

varying vec4 fragmentColor;

// Transforms a vertex from pixel coordinates to clip space
uniform vec2 xyScale;

vec2 displacement = vec2(-1, 1);
         
void main() {
   gl_Position = vec4(vertexPosition * xyScale + displacement, 0, 1);
   fragmentColor = vertexColor;
}`, `
precision highp float;
varying vec4 fragmentColor;
  
void main() {
   gl_FragColor = fragmentColor;
}`,

  ["vertexPosition", "vertexColor"], ["xyScale"]
]

const TextProgram = { vert: `
precision highp float;
attribute vec2 vertexPosition;
attribute vec2 texCoords;
        
uniform vec2 xyScale;
uniform vec2 textureSize;
        
varying vec2 texCoord;
vec2 displace = vec2(-1, 1);
         
void main() {
  gl_Position = vec4(vertexPosition * xyScale + displace, 0, 1);
  texCoord = texCoords / textureSize;
}`, frag: `
precision highp float;
        
uniform vec4 color;
uniform sampler2D textAtlas;
        
varying vec2 texCoord;
        
void main() {
  gl_FragColor = texture2D(textAtlas, texCoord);
}`}

/**
 * Currently accepted draw calls:
 *
 * Triangle strip: { type: "triangle_strip", vertices: Float32Array, color: { r: (int), g: (int), b: (int), a: (int) } }
 * Debug: { type: "debug" }
 * Text: { type: "text", font: (string), x: (float), y: (float), color: { r: ... } }
 */

export class WebGLRenderer {
  constructor () {
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl2")

    /**
     * The main rendering buffer
     * @type {HTMLCanvasElement}
     */
    this.canvas = canvas

    /**
     * The renderer's WebGL context. Assuming WebGL2 for now
     * @type {WebGLRenderingContext}
     */
    this.gl = gl

    /**
     * Map between scene ids and known information about them
     * @type {Map<string, {}>}
     */
    this.sceneCaches = new Map()

    /**
     * A mapping between program names and valid programs. When the context is lost, this map is reset
     * @type {Map<string, { glProgram: WebGLProgram, attribs: {}, uniforms: {} }>}
     */
    this.programs = new Map()

    this.buffers = new Map()

    this.textures = new Map()

    this.vaos = new Map()

    this.textRenderer = new TextRenderer()
  }

  /**
   * Create and link a program and store it in the form { glProgram, attribs, uniforms }, where glProgram is the
   * underlying program and attribs and uniforms are a dictionary of attributes and uniforms from the program. The
   * attributes are given as an object, of manually assigned indices
   * @param programName {string}
   * @param vertexShaderSource {string}
   * @param fragShaderSource {string}
   * @param attributeBindings {{}}
   * @param uniformNames {string[]}
   * @return  {{glProgram: WebGLProgram, attribs: {}, uniforms: {}}} The program
   */
  createProgram (programName, vertexShaderSource, fragShaderSource, attributeBindings={}, uniformNames=[]) {
    this.deleteProgram(programName)

    const { gl } = this

    const glProgram = createGLProgram(gl,
      createShaderFromSource(gl, gl.VERTEX_SHADER, vertexShaderSource),
      createShaderFromSource(gl, gl.FRAGMENT_SHADER, fragShaderSource))

    for (let name in attributeBindings) {
      let loc = attributeBindings[name]

      gl.bindAttribLocation(glProgram, loc, name)
    }

    const uniforms = {}
    for (const name of uniformNames) {
      uniforms[name] = gl.getUniformLocation(glProgram, name)
    }

    const program = { glProgram, attribs: attributeBindings, uniforms }
    this.programs.set(programName, program)

    return program
  }

  /**
   * Get the program of a given name, returning undefined if it does not exist
   * @param programName {string}
   * @returns {{glProgram: WebGLProgram, attribs: {}, uniforms: {}}}
   */
  getProgram (programName) {
    return this.programs.get(programName)
  }

  /**
   * Delete a program, including the underlying GL program
   * @param programName {string}
   */
  deleteProgram (programName) {
    const program = this.getProgram(programName)

    if (program) {
      this.gl.deleteProgram(program.glProgram)
      this.programs.delete(programName)
    }
  }

  getTexture (textureName) {
    return this.textures.get(textureName)
  }

  deleteTexture (textureName) {
    let texture = this.getTexture(textureName)

    if (texture !== undefined) {
      this.gl.deleteTexture(this.getTexture(textureName))
      this.textures.delete(textureName)
    }
  }

  createTexture (textureName) {
    this.deleteTexture(textureName)
    const texture = this.gl.createTexture()

    this.textures.set(textureName, texture)
    return texture
  }

  getBuffer (bufferName) {
    return this.buffers.get(bufferName)
  }

  createBuffer (bufferName) {
    let buffer = this.getBuffer(bufferName)

    if (!buffer) {
      buffer = this.gl.createBuffer()
      this.buffers.set(bufferName, buffer)
    }

    return buffer
  }

  deleteBuffer (bufferName) {
    const buffer = this.getBuffer(bufferName)

    if (buffer !== undefined) {
      this.buffers.delete(bufferName)
      this.gl.deleteBuffer(buffer)
    }
  }

  getVAO (vaoName) {
    return this.vaos.get(vaoName)
  }

  createVAO (vaoName) {
    let vao = this.getVAO(vaoName)

    if (!vao) {
      vao = this.gl.createVertexArray()
      this.vaos.set(vaoName, vao)
    }

    return vao
  }

  deleteVAO (vaoName) {
    const vao = this.getVAO(vaoName)

    if (vao !== undefined) {
      this.vaos.delete(vaoName)
      this.gl.deleteVertexArray(vao)
    }
  }

  monochromaticGeometryProgram () {
    let program = this.getProgram("__MonochromaticGeometry")

    if (!program) {
      const programDesc = MonochromaticGeometryProgram
      program = this.createProgram("__MonochromaticGeometry",
        programDesc.vert,
        programDesc.frag,
        { vertexPosition: 0 }, ['xyScale', 'color'])
    }

    return program
  }

  textProgram () {
    let program = this.getProgram("__Text")

    if (!program) {
      const programDesc = TextProgram
      program = this.createProgram("__Text",
        programDesc.vert,
        programDesc.frag,
        { vertexPosition: 0, texCoords: 1}, ["textureSize", "xyScale", "textAtlas", "color"])
    }

    return program
  }

  /**
   * Resize and clear the canvas, only clearing if the dimensions haven't changed, since the buffer will be erased.
   * @param width
   * @param height
   * @param dpr
   * @param clear {Color}
   */
  clearAndResizeCanvas (width, height, dpr=1, clear=Colors.TRANSPARENT) {
    const { canvas } = this

    this.dpr = dpr
    width *= dpr
    height *= dpr

    if (canvas.width === width && canvas.height === height) {
      this.clearCanvas(clear)
    } else {
      canvas.width = width
      canvas.height = height

      // lol, use the given background color
      if (clear.r || clear.g || clear.b || clear.a) {
        this.clearCanvas(clear)
      }
    }

    this.gl.viewport(0, 0, width, height)
  }

  clearCanvas (clearColor) {
    const { gl } = this

    gl.clearColor(clearColor.r / 255, clearColor.g / 255, clearColor.b / 255, clearColor.a / 255)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  getXYScale () {
    return [ 2 / this.canvas.width, -2 / this.canvas.height ]
  }

  renderScene (scene, log=false) {
    scene.updateAll()

    const graph = new SceneGraph()
    graph.renderer = this

    let startTime = performance.now()
    let globalStartTime = startTime
    graph.constructFromScene(scene)
    let endTime = performance.now()

    if (log) console.log(`Construction time: ${endTime - startTime}ms`)

    startTime = performance.now()
    graph.computeInstructions()
    endTime = performance.now()

    if (log) console.log(`Instruction compute time: ${endTime - startTime}ms`)

    startTime = performance.now()
    graph.compile()
    endTime = performance.now()

    if (log) console.log(`Instruction compile time: ${endTime - startTime}ms`)

    const { gl } = this

    let scissorTest = false
    let scissorBox = null

    // Contains instructions for how to reset the state back to how it was before a context was entered
    const contexts = []

    const setScissor = (enabled, box) => {
      scissorTest = enabled
      scissorBox = box

      if (enabled) {
        gl.enable(gl.SCISSOR_TEST)
      } else {
        gl.disable(gl.SCISSOR_TEST)
      }

      if (box) {
        // GL scissoring is from bottom left corner, not top left
        gl.scissor(box.x, this.canvas.height - box.y - box.h, box.w, box.h)
      }
    }

    startTime = performance.now()

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    graph.forEachCompiledInstruction(instruction => {
      let drawMode = 0
      switch (instruction.type) {
        case "scene": {
          const { dims, backgroundColor } = instruction

          this.clearAndResizeCanvas(dims.canvasWidth, dims.canvasHeight, dims.dpr, backgroundColor)
          contexts.push(null)

          break
        }
        case "scissor": {
          contexts.push({ type: "set_scissor", enable: scissorTest, scissor: scissorBox })
          setScissor(true, instruction.scissor)

          break
        }
        case "text": {
          const program = this.textProgram()
          gl.useProgram(program.glProgram)

          gl.bindVertexArray(this.getVAO(instruction.vao))

          let { id: atlasID, width: atlasWidth, height: atlasHeight } = graph.resources.textAtlas
          let texture = this.getTexture(atlasID)

          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, texture)

          gl.uniform1i(program.uniforms.textAtlas, 0)
          gl.uniform2f(program.uniforms.textureSize, atlasWidth, atlasHeight)
          gl.uniform2fv(program.uniforms.xyScale, this.getXYScale())

          gl.drawArrays(gl.TRIANGLE_STRIP, 0, instruction.vertexCount)

          break
        }

        case "triangle_strip": // LOL
          drawMode++
        case "triangles":
          drawMode++
        case "line_strip":
          drawMode += 2
        case "lines":
          drawMode++
         {
          const program = this.monochromaticGeometryProgram()
          gl.useProgram(program.glProgram)

          gl.bindVertexArray(this.getVAO(instruction.vao))
          const color = instruction.color

          gl.uniform4f(program.uniforms.color, color.r / 255, color.g / 255, color.b / 255, color.a / 255)
          gl.uniform2fv(program.uniforms.xyScale, this.getXYScale())

          gl.drawArrays(drawMode, 0, instruction.vertexCount)
          break
        }
        case "pop_context": {
          const popped = contexts.pop()

          if (!popped) break

          switch (popped.type) {
            case "set_scissor": {
              setScissor(popped.enabled, popped.scissor)
              break
            }
          }

          break
        }
        default:
          throw new Error(`Unknown instruction type ${instruction.type}`)
      }
    })

    endTime = performance.now()
    if (log) console.log(`Render time: ${endTime - globalStartTime}ms`)

    graph.destroy()
  }

  renderDOMScene (scene) {
    this.renderScene(scene)

    createImageBitmap(this.canvas).then(bitmap => {
      scene.bitmapRenderer.transferFromImageBitmap(bitmap)
    })
  }
}
