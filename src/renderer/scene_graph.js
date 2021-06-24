
// Given a top-level scene, construct a bunch of information about the scene, outputting a map of context ids ->
// context information and rendering instructions. This is what actually does most of the work regarding optimization
// and the like; the renderer just *runs* the instructions and keeps track of the used buffers.

// Map: id -> { parent, elem id, info, children: [{ child: id, instructions: [] }, { , version, ... }

import {getStringID, getVersionID} from "../core/utils.js"
import {convertTriangleStrip} from "../algorithm/polyline_triangulation.js"
import {
  generateRectangleDebug,
  generateRectangleTriangleStrip,
  getActualTextLocation
} from "../algorithm/misc_geometry.js"
import {BoundingBox} from "../math/bounding_box.js"
import {Colors} from "../styles/definitions.js"

/**
 * Validate, shallow clone instructions and change their zIndex, et cetera
 * @param instruction
 */
function adjustInstruction (instruction) {
  const type = instruction.type
  if (!type) throw new Error("Instruction does not have a type. Erroneous instruction: " + JSON.stringify(instruction))

  let out = Object.assign({}, instruction)
  let zIndex = out.zIndex
  let escapeContext = out.escapeContext

  // Fill in zIndex value for sorting
  if (zIndex === undefined) {
    if (type === "text") {
      out.zIndex = Infinity
    } else {
      out.zIndex = 0
    }
  }

  if (escapeContext === undefined) {
    // Default text value
    if (type === "text") {
      out.escapeContext = "top"
    }
  } else if (escapeContext) {
    // Validate
    if (typeof escapeContext !== "string") {
      throw new Error("Instruction has an invalid escape context value. Erroneous instruction: " + JSON.stringify(instruction))
    }
  }

  return out
}

/**
 * Return whether a given context is the correct context to escape to, depending on what information is provided.
 * @param context
 * @param escapeContext
 */
function matchEscapeContext (context, escapeContext) {
  if (typeof escapeContext === "string") {
    return context.id === escapeContext
  } else if (typeof escapeContext === "object") {
    let type = escapeContext.type

    if (!type) throw new Error("escapeContext has insufficient information to determine which context to escape to")
    return context.info.type !== type
  } else {
    throw new TypeError(`Invalid escapeContext value ${escapeContext}`)
  }
}

export class SceneGraph {
  constructor () {
    /**
     * Mapping of <context id> -> <context info>, where contexts are specific subsets of the rendering sequence created
     * by certain groups that allow for operations to be applied to multiple elements. Example: a plot may create a
     * context to scissor element within its boundaries. The context info also contains rendering instructions for that
     * context (incl. buffers and such). The scene graph contains a lot of information!
     * @type {Map<string, {}>}
     */
    this.contextMap = new Map()

    this.id = getStringID()

    /**
     * The renderer this graph is attached to. Certain instructions don't need the renderer to be involved, so this
     * is optional allowing for static analysis of scenes detached from any specific renderer.
     * @type {WebGLRenderer|null}
     */
    this.renderer = null

    /**
     * Resources used by this scene graph
     * @type {{}}
     */
    this.resources = {
      textures: {},
      buffers: {}
    }
  }

  destroyAll () {
    this.contextMap.clear()
  }

  /**
   * Construct a graph from scratch
   * @param scene
   * @returns {*}
   */
  constructFromScene (scene) {
    this.destroyAll()
    const contextMap = this.contextMap

    let topContext = { parent: null, id: "top", info: { type: "top" }, children: [], contextDepth: 0 }
    contextMap.set("top", topContext)

    let currentContext = topContext
    let contextDepth = 0

    recursivelyBuild(scene)

    // Recurse through the scene elements, not yet handling zIndex and escapeContext
    function recursivelyBuild (elem) {
      let children = elem.children
      let info = elem.getRenderingInfo()

      let instructions = info?.instructions
      let contexts = info?.contexts

      let initialContext = currentContext

      if (contexts) {
        // Time to build contexts
        contexts = Array.isArray(contexts) ? contexts : [ contexts ]

        for (const c of contexts) {
          contextDepth++

          let newContext = {
            type: "context",
            id: c.id ?? (elem.id + '-' + getVersionID()),
            parent: currentContext,
            children: [],
            info: c,
            zIndex: c.zIndex ?? 0,
            contextDepth,
            escapeContext: (c.type === "escapeContext") ? c.escapeContext : null
          }

          contextMap.set(newContext.id, newContext)

          currentContext.children.push(newContext)
          currentContext = newContext
        }
      }

      if (instructions) {
        instructions = Array.isArray(instructions) ? instructions : [ instructions ]

        currentContext.children.push({
          id: elem.id,
          instructions
        })
      }

      if (children) {
        let childrenLen = children.length
        for (let i = 0; i < childrenLen; ++i) {
          recursivelyBuild(children[i])
        }
      }

      currentContext = initialContext
      contextDepth = currentContext.contextDepth
    }

    return this
  }

  computeInstructions () {
    // For each context compute a list of instructions that the renderer should run

    const { contextMap } = this
    const contexts = Array.from(contextMap.values()).sort((a, b) => b.contextDepth - a.contextDepth)

    for (const c of contexts) {
      const children = c.children

      const instructions = []
      const escapingInstructions = []

      // eventually, instructions will have the structure {child: id, instructions: [], zIndex: (number)}. zIndex of text
      // instructions is assumed to be Infinity and unspecified zIndex is 0. For now we'll just have a flat map
      for (const child of children) {
        if (child.children) {
          // Is context
          let contextInstruction = { type: "context", id: child.id, zIndex: child.zIndex ?? 0, escapeContext: child.escapeContext }

          if (child.escapeContext) {
            escapingInstructions.push(contextInstruction)
          } else {
            instructions.push(contextInstruction)

            // Add escaped instructions
            for (const inst of child.escapingInstructions) {
              if (matchEscapeContext(c, inst.escapeContext))
                instructions.push(inst)
              else
                escapingInstructions.push(inst)
            }
          }
        } else {
          for (const instruction of child.instructions) {
            let adj = adjustInstruction(instruction)

            if (adj.escapeContext) {
              escapingInstructions.push(adj)
            } else {
              instructions.push(adj)
            }
          }
        }
      }

      c.instructions = instructions
      c.escapingInstructions = escapingInstructions
    }

    for (const c of contextMap.values()) {
      c.instructions.sort((a, b) => (a.zIndex - b.zIndex))
    }
  }

  /**
   * Execute a callback on each context of the scene graph
   * @param callback
   */
  forEachContext (callback) {
    for (const context of this.contextMap.values())
      callback(context)
  }

  /**
   * Return an array of all text instructions, to be used to generate a text texture
   * @returns {Array}
   */
  getTextInstructions () {
    let ret = []

    this.forEachContext(c => {
      const instructions = c.instructions

      for (let i = instructions.length - 1; i >= 0; --i) {
        if (instructions[i].type === "text")
          ret.push(instructions[i])
      }
    })

    return ret
  }

  loadTextAtlas (img) {
    const renderer = this.renderer
    const gl = renderer.gl

    let name = "__" + this.id + "-text"
    let texture = renderer.getTexture(name)
    let needsInitialize = !texture

    if (needsInitialize) {
      texture = renderer.createTexture(name)
    }

    gl.bindTexture(gl.TEXTURE_2D, texture)

    if (needsInitialize) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)

    this.resources.textAtlas = { id: name, width: img.width, height: img.height }
  }

  freeCompiledInstructions (inst) {
    if (!inst) return

    for (const i of inst) {
      if (i.vao) {
        this.renderer.deleteVAO(i.vao)
      }

      if (i.buffers) {
        i.buffers.forEach(b => this.renderer.deleteBuffer(b))
      }
    }
  }

  compile () {
    // Convert context instructions into a series of renderable instructions, generating appropriate vertex arrays and
    // textures. Until this step, the scene graph is independent of the renderer.

    const renderer = this.renderer
    if (!renderer) throw new Error("Compiling a scene graph requires the graph to be attached to a renderer.")

    const gl = renderer.gl
    const textRenderer = renderer.textRenderer
    const textInstructions = this.getTextInstructions()

    if (textInstructions.length !== 0) {
      textRenderer.drawText(textInstructions)
      this.loadTextAtlas(textRenderer.canvas)
    }

    this.forEachContext (context => {
      this.freeCompiledInstructions(context.compiledInstructions)

      const instructions = context.instructions
      const compiledInstructions = []


      switch (context.info.type) {
        case "scene":
        case "scissor":
          compiledInstructions.push(context.info)
          break
      }

      // Super simple (and hella inefficient) for now
      for (const instruction of instructions) {
        switch (instruction.type) {
          case "context":
            compiledInstructions.push(instruction)
            break
          case "polyline": {
            let vertices = convertTriangleStrip(instruction.vertices, instruction.pen)
            let color = instruction.pen.color

            let buffName = context.id + '-' + getVersionID()
            let vaoName = context.id + '-' + getVersionID()

            let buff = renderer.createBuffer(buffName)
            let vao = renderer.createVAO(vaoName)

            gl.bindVertexArray(vao)

            gl.bindBuffer(gl.ARRAY_BUFFER, buff)
            gl.enableVertexAttribArray(0 /* position buffer */)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

            let compiled = {
              type: "triangle_strip",
              vao: vaoName,
              buffers: [buffName],
              vertexCount: vertices.length / 2,
              color
            }
            compiledInstructions.push(compiled)

            break
          }
          case "text": {
            let tcName = context.id + '-' + getVersionID()
            let scName = context.id + '-' + getVersionID()
            let vaoName = context.id + '-' + getVersionID()

            let textureCoords = renderer.createBuffer(tcName)
            let sceneCoords = renderer.createBuffer(scName)
            let vao = renderer.createVAO(vaoName)

            gl.bindVertexArray(vao)

            gl.bindBuffer(gl.ARRAY_BUFFER, sceneCoords)
            gl.enableVertexAttribArray(0 /* position buffer */)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

            let rect = getActualTextLocation(instruction.rect, instruction.pos)

            rect.x |= 0
            rect.y |= 0

            gl.bufferData(gl.ARRAY_BUFFER, generateRectangleTriangleStrip(rect), gl.STATIC_DRAW)

            gl.bindBuffer(gl.ARRAY_BUFFER, textureCoords)
            gl.enableVertexAttribArray(1 /* texture coords buffer */)
            gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0)

            gl.bufferData(gl.ARRAY_BUFFER, generateRectangleTriangleStrip(instruction.rect), gl.STATIC_DRAW)

            let compiled = {
              type: "text",
              vao: vaoName,
              buffers: [tcName, scName],
              vertexCount: 4,
              text: instruction.text
            }
            compiledInstructions.push(compiled)

            break
          }
          case "triangle_strip": {
            let vertices = instruction.vertices
            let color = instruction.color

            let buffName = context.id + '-' + getVersionID()
            let vaoName = context.id + '-' + getVersionID()

            let buff = renderer.createBuffer(buffName)
            let vao = renderer.createVAO(vaoName)

            gl.bindVertexArray(vao)

            gl.bindBuffer(gl.ARRAY_BUFFER, buff)
            gl.enableVertexAttribArray(0 /* position buffer */)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

            let compiled = {
              type: "triangle_strip",
              vao: vaoName,
              buffers: [buffName],
              vertexCount: vertices.length / 2,
              color
            }
            compiledInstructions.push(compiled)
            break
          }
          case "debug": {
            let buffName = context.id + '-' + getVersionID()
            let vaoName = context.id + '-' + getVersionID()

            let buff = renderer.createBuffer(buffName)
            let vao = renderer.createVAO(vaoName)

            gl.bindVertexArray(vao)

            gl.bindBuffer(gl.ARRAY_BUFFER, buff)
            gl.enableVertexAttribArray(0 /* position buffer */)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

            let vertices
            if (instruction.rect) {
              let rect = BoundingBox.fromObj(instruction.rect)
              if (!rect) throw new Error("Invalid rectangle debug instruction")

              vertices = generateRectangleDebug(rect)
            } else {
              throw new Error("Unrecognized debug instruction")
            }

            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

            let compiled = {
              type: "line_strip",
              vao: vaoName,
              buffers: [buffName],
              vertexCount: vertices.length / 2,
              color: Colors.RED
            }
            compiledInstructions.push(compiled)
            break
          }

          default:
            throw new Error(`Unsupported instruction type ${instruction.type}`)
        }
      }

      gl.bindVertexArray(null)

      compiledInstructions.push({ type: "pop_context" })

      context.compiledInstructions = compiledInstructions
    })
  }

  // Yield a list of all compiled instructions
  forEachCompiledInstruction (callback, contextID="top") {
    let ctx = this.contextMap.get(contextID)

    if (ctx.compiledInstructions) {
      for (const instruction of ctx.compiledInstructions) {
        if (instruction.type === "context") {
          this.forEachCompiledInstruction(callback, instruction.id)
        } else {
          callback(instruction)
        }
      }
    }
  }

  /**
   * Get pre-rendering info so the renderer knows what to expect. This includes, notably, text
   */
  getPreRenderingInfo () {

  }

  destroy () {
    this.forEachContext(c => this.freeCompiledInstructions(c.compiledInstructions))
  }
}
