import { Color } from '../color'
import { ARROW_TYPES, arrowDrawers, ARROW_LOCATION_TYPES } from './arrows'
import { Simple2DGeometry } from './simple_geometry'
import * as utils from '../utils'

// list of endcap types
const ENDCAP_TYPES = {
  NONE: 0,
  ROUND: 1,
  SQUARE: 2
}

// list of join types
const JOIN_TYPES = {
  NONE: 0,
  ROUND: 1,
  MITER: 2,
  DYNAMIC: 3
}

// Check whether x is an integer in the range [min, max]
function integerInRange (x, min, max) {
  return utils.isInteger(x) && min <= x && x <= max
}

// Find the next power of two after x
function nextPowerOfTwo (x) {
  return 2 ** Math.ceil(Math.log2(x))
}

// minimum angle in radians between roundings in a polyline
const MIN_RES_ANGLE = 0.05

// Parameters for the expanding/contracting float array for polyline
const MIN_SIZE = 16
const MAX_SIZE = 2 ** 24

/**
PolylineElement draws a sequence of line segments connecting points. Put the points
as ordered pairs, in CANVAS COORDINATES, in polyline.vertices. To disconnect
points, intersperse them with two consecutive NaNs.

For example, [100, 100, 500, 500, 505, 500, NaN, NaN, 100, 150, 500, 150] draws
a line from (100,100)->(500,500)->(505,500), then from (100,150)->(500,150).

Other parameters:
*/
class PolylineElement extends Simple2DGeometry {
  constructor (params = {}) {
    super(params)

    const {
      vertices = [],
      useNative = false
    } = params

    // Array (or FloatArray) storing the pairs of vertices which are to be connected.
    // To prevent a join, put two NaNs in a row.
    this.vertices = vertices

    // Whether or not to use native GL.LINE_STRIP
    this.useNative = useNative

    // Contains useful style information
    this.style = {}
    const style = this.style

    // color is a property of Simple2DGeometry, but we want it to be accessible
    // in style
    Object.defineProperty(style, 'color', {
      get: () => this.color,
      set: (color) => { this.color = color }
    })

    // If params.style, merge it with the defaults and send it to this.style
    utils.mergeDeep(style, {
      color: new Color(0, 0, 0, 255), // Color of the polyline
      thickness: 2, // Thickness in CSS pixels
      endcapType: 1, // The type of endcap to be used (refer to the ENDCAPS enum)
      endcapRes: 0.4, // The resolution of the endcaps in radians. Namely, the angle between consecutive roundings
      joinType: 3, // The type of join between consecutive line segments (refer to the JOIN_TYPES enum)
      joinRes: 0.4, // angle in radians between consecutive roundings, including in dynamic mode
      arrowLocations: -1, // Location of arrows (default is none)
      arrowType: 0 // Type of arrows to be drawn
    }, params.style || {})

    // used internally for gl vertices
    this.glVertices = null
    this.glVerticesCount = 0
  }

  static get ENDCAP_TYPES () {
    return ENDCAP_TYPES
  }

  static get JOIN_TYPES () {
    return JOIN_TYPES
  }

  static get ARROW_TYPES () {
    return ARROW_TYPES
  }

  static get ARROW_LOCATION_TYPES () {
    return ARROW_LOCATION_TYPES
  }

  updateGeometries () {
    // Calculate the vertices
    if (!this.useNative) {
      this.calculateTriangles()
    } else {
      this.calculateNativeLines()
    }
  }

  calculateTriangles () {
    // Conditions to just say there are 0 vertices and exit early
    if (this.style.thickness <= 0 ||
        !integerInRange(this.style.endcapType, 0, 1) ||
        !integerInRange(this.style.joinType, 0, 3) ||
        this.style.endcapRes < MIN_RES_ANGLE ||
        this.style.joinRes < MIN_RES_ANGLE ||
        this.vertices.length <= 3) {
      this.glVerticesCount = 0
      return
    }

    // If glVertices isn't an array, make it an array with size MIN_SIZE
    if (!this.glVertices) {
      this.glVertices = new Float32Array(MIN_SIZE)
    }

    // The vertices that WebGL would use
    let glVertices = this.glVertices

    let glVerticesIndex = 0 // the array position we are on (2x which vertex we're on)
    let needToDupeVertex = false // whether we need to duplicate the CURRENT vertex

    // if glVerticesIndex > glVerticesThreshold, we need to expand glVertices
    let glVerticesThreshold = glVertices.length - 2

    // To allow this to be accessed within addVertex
    const that = this

    // Push a GL vertex back
    function addVertex (x, y) {
      if (glVerticesIndex > glVerticesThreshold) {
        // Not enough space in the FloatArray, reallocate one with twice the size

        const newFloatArray = new Float32Array(2 * glVertices.length)
        newFloatArray.set(glVertices) // copy over the old data

        that.glVertices = newFloatArray
        glVertices = that.glVertices

        // Update the new threshold
        glVerticesThreshold = glVertices.length - 2
      }

      // Set the next two entries to x and y
      glVertices[glVerticesIndex] = x
      glVerticesIndex += 1
      glVertices[glVerticesIndex] = y
      glVerticesIndex += 1

      // If we need to duplicate the CURRENT vertex, do it again
      if (needToDupeVertex) {
        needToDupeVertex = false
        addVertex(x, y)
      }
    }

    // Duplicate the LAST vertex immediately
    function duplicateVertex () {
      addVertex(glVertices[glVerticesIndex - 2], glVertices[glVerticesIndex - 1])
    }

    const arrowType = this.style.arrowType
    const arrowDrawer = arrowDrawers[arrowType]

    function drawArrow (...args) {
      // isStarting = true if it is a starting endcap, false if it is an
      // ending endcap

      if (arrowType === -1) { // custom arrow type
        that.customArrowDrawer(addVertex, ...args)
      } else {
        // Draw using one of the defined arrow drawers
        arrowDrawer(addVertex, ...args)
      }
    }

    // The vertices of the polyline
    const vertices = this.vertices

    // Number of polyline vertex coordinates
    const coordinateCount = vertices.length

    // Thickness of the polyline from the edge to the center. We divide it by two
    // because this.style.thickness is considered to be the total width of the line
    const th = this.style.thickness / 2

    // Type of endcap to draw, angular resolution of endcap, join type of joins, angular resolution of joins
    const { endcapType, endcapRes, joinType, joinRes } = this.style

    // Arrow locations
    const arrowLocations = this.style.arrowLocations

    // Threshold distance from the corner of the miter to the center of the join
    // which would imply that the corner should be ROUNDED, in DYNAMIC mode.
    // That is, if the miter length is larger than this quantity, we should round
    // the vertex instead
    const maxMiterLength = th / Math.cos(joinRes / 2)

    // Lots of variables
    let x2, x3, y2, y3, v2x, v2y, v2l

    x2 = NaN
    x3 = NaN

    y2 = NaN
    y3 = NaN

    for (let i = 0; i <= coordinateCount; i += 2) {
      // [x1, y1] = previous vertex (p1), [x2, y2] = current (p2), [x3, y3] = next (p3)
      // If any of these is NaN, that vertex is considered undefined
      const x1 = x2
      x2 = x3
      x3 = (i === coordinateCount) ? NaN : vertices[i]

      const y1 = y2
      y2 = y3
      y3 = (i === coordinateCount) ? NaN : vertices[i + 1]

      if (i === 0) {
        continue
      }

      // Shift the previous values of (v2x, v2y) back to (v1x, v1y), so that
      // (v1x, v1y) is the vector from (x2, y2) to (x1, y1). Note the order in
      // those points; this is why it is negated.
      const v1x = -v2x
      const v1y = -v2y

      // (v2x, v2y) is the vector from (x2, y2) to (x3, y3)
      v2x = x3 - x2
      v2y = y3 - y2

      // Give v2l's value to v1l
      const v1l = v2l

      // v2l is the length of vector (v2x, v2y)
      v2l = Math.hypot(v2x, v2y)

      // Whether a starting endcap should be emitted. Note that x !== x <-> isNaN(x)
      const isStartingEndcap = Number.isNaN(x1)
      const isEndingEndcap = Number.isNaN(x3)

      // If we need to emit a (starting or ending) endcap. Note that we emit
      // a starting endcap when p1 is undefined, and thus the endcap should be
      // on p2 facing away from p3. We emit an ending endcap when p3 is undefined,
      // and thus the endcap should be on p2, facing away from p1
      if (isStartingEndcap || isEndingEndcap) {
        // (duX, duY) is a vector of length th (thickness) from the center of the endcap
        // facing towards the rest of the (semicircular) endcap. That is, it
        // is facing towards the bulb of the endcap, not away from it. Illustration
        // for an ending endcap:
        //
        //  p1 -> • ------------ •) <- p2, endcap
        //  (duX, duY) = -->

        let duX, duY

        if (isEndingEndcap) {
          // Multiplying by th / v1l makes the vector length th, while preserving
          // its direction
          duX = -v1x * th / v1l
          duY = -v1y * th / v1l
        } else {
          duX = v2x * th / v2l
          duY = v2y * th / v2l
        }

        // If we can't create an endcap because of various undefined coordinates,
        // just give up. This might happen if x2 is defined but y2 is not, something
        // like that.
        if (Number.isNaN(duX) || Number.isNaN(duY)) continue

        if (isStartingEndcap) {
          // check if we should draw an arrow

          const ALT = ARROW_LOCATION_TYPES
          if (arrowLocations === ALT.ARROW_B || // if arrows at starting endcaps
              arrowLocations === ALT.ARROW_FB || // if arrows at all endcaps
              ((arrowLocations === ALT.ARROW_B_START_ONLY || // if arrow at beginning
              arrowLocations === ALT.ARROW_FB_ENDS_ONLY) && i === 2)) {
            // TODO: more nuanced drawing methods
            drawArrow(x2, y2, x3, y3, th, duX, duY, true)

            continue
          }
        }

        if (isEndingEndcap) {
          // check if we should draw an arrow
          const ALT = ARROW_LOCATION_TYPES
          if (arrowLocations === ALT.ARROW_F || // if arrows at ending endcaps
              arrowLocations === ALT.ARROW_FB || // if arrows at all endcaps
              ((arrowLocations === ALT.ARROW_F_END_ONLY || // if arrow at end
              arrowLocations === ALT.ARROW_FB_ENDS_ONLY) && i === coordinateCount)) {
            // TODO: more nuanced drawing methods
            drawArrow(x2, y2, x1, y1, th, duX, duY, false)

            continue
          }
        }

        // Two starting vertices of the endcap. Note that these are (x2, y2) ± (duY, -duX);
        // the second vector is rotated 90 degrees counterclockwise from (duY, duX).
        addVertex(x2 + duY, y2 - duX)
        addVertex(x2 - duY, y2 + duX)

        // Code for making a rounded endcap
        if (endcapType === 1) {
          // Starting theta value
          const theta = Math.atan2(duY, duX) + (isStartingEndcap ? Math.PI / 2 : 3 * Math.PI / 2)

          // Number of steps needed so that the angular resolution is smaller than or
          // equal to endcapRes
          const stepsNeeded = Math.ceil(Math.PI / endcapRes)

          // (cX, cY) is a fixed point; in fact, they are the last vertex before
          // this loop. This defines a point on the boundary of the semicircle
          // to which a "triangle fan" can be drawn which fills in the entire
          // semicircle.
          const cX = x2 - duY
          const cY = y2 + duX

          // Iterate through each step
          for (let i = 1; i <= stepsNeeded; ++i) {
            // Calculate an intermediate angle
            const thetaC = theta + i / stepsNeeded * Math.PI

            // Vertex on the circle subtending that intermediate angle
            addVertex(x2 + th * Math.cos(thetaC), y2 + th * Math.sin(thetaC))
            addVertex(cX, cY)
          }
        }

        continue
      }

      // If the middle vertex is undefined, we need to duplicate the previous and next
      // gl vertices. This creates a degenerate (0-width) triangle which disconnects the
      // two triangle strips. To duplicate the previous vertex, we use duplicateVertex().
      // To duplicate the next vertex, we set needToDupeVertex = true, which will
      // duplicate the next call to addVertex.
      if (Number.isNaN(x2)) {
        duplicateVertex()
        needToDupeVertex = true
      } else {
        // all vertices are defined, time to draw a joiner!
        if (joinType === 2 || joinType === 3) {
          // find the angle bisectors of the angle formed by v1 = p1 -> p2 and v2 = p2 -> p3
          // After this section of code, (b1x, b1y) is a unit vector bisecting
          // the vectors (v1x, v1y) and (v2x, v2y)
          let b1x = v2l * v1x + v1l * v2x
          let b1y = v2l * v1y + v1l * v2y
          let scale = 1 / Math.hypot(b1x, b1y)

          // If the scale is infinite, that means b1x = b1y = 0, so the vectors
          // are opposite each other. We thus choose a vector perpendicular to both
          // vectors because that bisects the 180 degree angle they subtend
          if (scale === Infinity || scale === -Infinity) {
            b1x = -v1y
            b1y = v1x
            scale = 1 / Math.hypot(b1x, b1y)
          }

          // Scale it to be a unit vector
          b1x *= scale
          b1y *= scale

          // Set scale to the length of a miter. (b1x, b1y) is now in the direction
          // of a proper miter, but we multiply it by this value to make it the correct
          // length.
          scale = th * v1l / (b1x * v1y - b1y * v1x)

          if (joinType === 2 || (Math.abs(scale) < maxMiterLength)) {
            // if the length of the miter is massive and we're in dynamic mode,
            // we reject this if statement and do a rounded join. More precisely,
            // |scale| exceeds maxMiterLength when the angle between the two vectors
            // is greater than the angular resolution mandated by joinRes.

            // Scale by the length of a miter
            b1x *= scale
            b1y *= scale

            // Add the two miter vertices. This is all that is necessary to join
            // the vertices, since both points lie on the infinite rectangles determined
            // by each of the pairs ((x1, y1), (x2, y2)) and ((x2, y2), (x3, y3)).
            addVertex(x2 - b1x, y2 - b1y)
            addVertex(x2 + b1x, y2 + b1y)

            continue
          }
        }

        // These are scaling factors associated with scaling the displacement vectors
        // (v1x, v1y) and (v2x, v2y) to have length th (thickness)
        const puFactor = -th / v1l
        const nuFactor = th / v2l

        // Add two points which end the current rectangle. This is all we need
        // if there is no join to be computed (i.e. if the join mode is NONE)
        addVertex(x2 + puFactor * v1y, y2 - puFactor * v1x)
        addVertex(x2 - puFactor * v1y, y2 + puFactor * v1x)

        if (joinType === 1 || joinType === 3) {
          // If the join type is round or dynamic, we need to make a rounded join.
          // a1 and a2 are angles associated with the direction of where the rounded
          // join should start and end.
          const a1 = Math.atan2(v1y, v1x) - Math.PI / 2
          const a2 = Math.atan2(v2y, v2x) - Math.PI / 2

          // If the join is a right turn viewed from above, we flip a2 by adding π
          // if left turn, flip a1 by adding π

          let startA, endA

          // The below condition is satisfied when the join is a left turn
          if (utils.mod(a1 - a2, 2 * Math.PI) < Math.PI) {
            // starting angle is a1 + π, ending angle is a2
            startA = Math.PI + a1
            endA = a2
          } else {
            // starting angle is a2 + π, ending angle is a1
            startA = Math.PI + a2
            endA = a1
          }

          // The absolute angle subtended by endA and startA
          // TODO: not sure if the mod function here is necessary
          const angleSubtended = utils.mod(endA - startA, 2 * Math.PI)

          // The number of angle steps needed to make sure the angular resolution
          // is less than or equal to joinRes
          const stepsNeeded = Math.ceil(angleSubtended / joinRes)

          for (let i = 0; i <= stepsNeeded; ++i) {
            // For every intermediate angle
            const thetaC = startA + angleSubtended * i / stepsNeeded

            // Add a point on the circular sector, then connect back to (x2, y2)
            // to create a "circular fan"
            addVertex(x2 + th * Math.cos(thetaC), y2 + th * Math.sin(thetaC))
            addVertex(x2, y2)
          }
        }

        // Add the starting vertices for the next rectangle!
        addVertex(x2 + nuFactor * v2y, y2 - nuFactor * v2x)
        addVertex(x2 - nuFactor * v2y, y2 + nuFactor * v2x)
      }
    }

    // If the number of glVertices we computed is less than four times the total buffer size,
    // we reallocate the buffer to be two times the next power of two after the number of
    // glVertices we compute. This prevents excess memory from being forever wasted by
    // a polyline history with lots of vertices.
    if (glVerticesIndex * 4 < glVertices.length) {
      const newFloatArray = new Float32Array(Math.min(Math.max(MIN_SIZE,
        2 * nextPowerOfTwo(glVerticesIndex)), MAX_SIZE))

      // Copy old values to the new float array
      newFloatArray.set(glVertices.subarray(0, glVerticesIndex))

      glVertices = this.glVertices = newFloatArray
    }

    // Set the number of glVertices to be used later when rendered with gl!
    this.glVerticesCount = Math.ceil(glVerticesIndex / 2)
  }

  calculateNativeLines () {
    const vertices = this.vertices

    // Early exit condition
    if (vertices.length <= 3) {
      this.glVerticesCount = 0
      return
    }

    // If glVertices doesn't exist yet, set it to a newly-created Float32Array
    let glVertices = this.glVertices
    if (!glVertices) {
      glVertices = this.glVertices = new Float32Array(MIN_SIZE)
    }

    // Adjust our array size as necessary.
    const undersized = glVertices.length < vertices.length
    const oversized = glVertices.length > vertices.length * 4
    if (undersized || oversized) {
      glVertices = this.glVertices = new Float32Array(Math.min(Math.max(MIN_SIZE,
        ((oversized) ? 2 : 1) * nextPowerOfTwo(vertices.length)), MAX_SIZE))
    }

    // If vertices is a plain array, we copy it manually. Otherwise, we use
    // the built in ArrayBuffer.set function for I AM SPEED
    if (Array.isArray(vertices)) {
      for (let i = 0; i < vertices.length; ++i) {
        glVertices[i] = vertices[i]
      }
    } else {
      glVertices.set(vertices)
    }

    // Set the number of vertices for gl to render!
    this.glVerticesCount = Math.ceil(vertices.length / 2)
  }

  render (renderInfo) {
    // Calculate the vertices
    if (this.alwaysUpdate) { this.updateGeometries() }

    // Potential early exit
    const vertexCount = this.glVerticesCount
    if ((this.useNative && vertexCount < 2) || (!this.useNative && vertexCount < 3)) return

    if (this.useNative) {
      this.renderMode = 'LINE_STRIP'
    } else {
      this.renderMode = 'TRIANGLE_STRIP'
    }

    super.render(renderInfo)
  }
}

export { PolylineElement }
