import { Vec2 } from '../math/vec2'

// Some functions to draw arrows

/**
 * TriangularArrow - Constructs a triangular arrow with specified dimensions.
 *
 * @param  {number} arrowLenScale   How many times the thickness of the line the length of the arrow should be
 * @param  {number} arrowWidthScale How many times the thickness of the line the width of the arrow should be
 * @param  {Function} addVertex     Function to call when adding a vertex
 * @param  {number} x2              description
 * @param  {number} y2              description
 * @param  {number} xa              description
 * @param  {number} ya              description
 * @param  {number} th              HALF the thickness of the line this arrow is connected to.
 * @param  {number} duX             description
 * @param  {number} duY             description
 * @param  {number} isStarting      description
 * @return {type}                 description
 */
function TriangularArrow (arrowLenScale, arrowWidthScale, addVertex, x2, y2, xa, ya, th, duX, duY, isStarting) {
  // Constructs a "triangular arrow" on (x2, y2) facing away from (xa, ya)
  const arrowLen = 2 * th * arrowLenScale
  const arrowWidth = th * arrowWidthScale

  let v1x = xa - x2
  let v1y = ya - y2
  const v1l = Math.hypot(v1x, v1y)

  if (v1l === 0) return // yeah, I'm not dealing with that

  v1x /= v1l
  v1y /= v1l

  // (abx, aby) is base of the arrow
  const abx = x2 + v1x * arrowLen
  const aby = y2 + v1y * arrowLen

  const av1x = abx + v1y * arrowWidth
  const av1y = aby - v1x * arrowWidth

  const av2x = abx - v1y * arrowWidth
  const av2y = aby + v1x * arrowWidth

  function addArrowBaseVertices () {
    addVertex(abx + duY, aby - duX)
    addVertex(abx - duY, aby + duX)
  }

  if (!isStarting) addArrowBaseVertices()

  addVertex(x2, y2)
  addVertex(av1x, av1y)
  addVertex(av2x, av2y)

  if (isStarting) addArrowBaseVertices()
}

function ArrowFromPattern (pattern, addVertex, x2, y2, xa, ya, th, duX, duY, isStarting) {
  // The way this works is we take an array of points to feed to TRIANGLE_STRIP,
  // from an idealized arrowhead with vertex at (0, 0) and facing from the right
  // (pointing left) on a line with th = 1. We then rotate, translate and scale this arrowhead
  // to the desired position, thickness and orientation.
  // The last vertex is special, specifying the "base" of the arrow where it will connect
  // to the rest of the polyline.

  const vertices = pattern

  const angleToRotate = Math.atan2(ya - y2, xa - x2)
  const scaleFactor = th
  const translationVector = new Vec2(x2, y2)

  for (let i = 0; i < vertices.length; ++i) {
    // trickery to add the last vertex first when on the ending endcap
    const realI = isStarting ? i : ((i === 0) ? vertices.length - 1 : i - 1)

    // transformed vertex
    const transV = vertices[realI].rotate(angleToRotate).scale(scaleFactor).add(translationVector)

    if (realI === vertices.length - 1) {
      // last vertex, add base of arrow

      // duplicate this vertex to fully detach it from the arrowhead
      // depending on whether this is a starting or ending arrowhead, duplicate the
      // first or second vertex
      let times = 2

      do {
        addVertex(transV.x + duY, transV.y - duX)
        times -= 1
        // eslint-disable-next-line no-unmodified-loop-condition
      } while (isStarting && times > 0)

      do {
        addVertex(transV.x - duY, transV.y + duX)
        times -= 1
        // eslint-disable-next-line no-unmodified-loop-condition
      } while (!isStarting && times > 0)
    } else {
      // add the vertex normally
      addVertex(transV.x, transV.y)
    }
  }
}

function StandardArrow (...args) {
  TriangularArrow(15 / 2, 5, ...args)
}

function SquatArrow (...args) {
  TriangularArrow(4, 5, ...args)
}

const SQRT2 = Math.SQRT2

function generateSkeletonPattern (size = 1, count = 3) {
  const pattern = []
  const len = size * 5

  for (let i = 0; i < count; ++i) {
    const x = i * 4

    pattern.push(new Vec2(x, 0), new Vec2(x, 0), new Vec2(x + len, len), new Vec2(x + len + SQRT2, len - SQRT2),
      new Vec2(x + 2, 0), new Vec2(x, 0), new Vec2(x + len + SQRT2, -len + SQRT2), new Vec2(x + len, -len),
      new Vec2(x, 0), new Vec2(x, 0))
  }

  pattern.push(new Vec2(2, 0))

  return pattern
}

function SkeletonArrowFunctionFactory (size, count) {
  const pattern = generateSkeletonPattern(size, count)
  return function (...args) {
    ArrowFromPattern(pattern, ...args)
  }
}

// list of built-in arrow types
const ARROW_TYPES = {
  CUSTOM: -1,
  STANDARD: 0,
  SQUAT: 1,
  SHORT_SKELETON: 2,
  SHORT_SKELETON2: 3,
  SHORT_SKELETON3: 4,
  LONG_SKELETON: 5,
  LONG_SKELETON2: 6,
  LONG_SKELETON3: 7
}

const arrowDrawers = {
  0: StandardArrow,
  1: SquatArrow,
  2: SkeletonArrowFunctionFactory(1, 1),
  3: SkeletonArrowFunctionFactory(1, 2),
  4: SkeletonArrowFunctionFactory(1, 3),
  5: SkeletonArrowFunctionFactory(2, 1),
  6: SkeletonArrowFunctionFactory(2, 2),
  7: SkeletonArrowFunctionFactory(2, 3)
}

// Length of arrow in pixels for a line with th=1
const arrowLengths = {};

(function () {
  // Calculate the arrow lengths experimentally!!

  // fake addVertex which keeps track of the max X value
  let maxX
  const addVertex = (x, y) => {
    if (x > maxX) { maxX = x }
  }

  for (const key in arrowDrawers) {
    const drawer = arrowDrawers[key]
    maxX = 0

    // "draw" the arrow head in the untransformed direction, with th=1
    drawer(addVertex, 0, 0, 1, 0, 1, 0, 0, true)

    // record the length
    arrowLengths[key] = maxX
  }
})()

// list of arrow position types
const ARROW_LOCATION_TYPES = {
  NONE: -1,
  ARROW_F: 0, // arrow on every ending endcap
  ARROW_B: 1, // arrow on every starting endcap
  ARROW_FB: 2, // arrow on every endcap
  ARROW_F_END_ONLY: 3, // arrow on the end of the whole path
  ARROW_B_START_ONLY: 4, // arrow at the start of the whole path
  ARROW_FB_ENDS_ONLY: 5 // arrows at both ends of the path
}

export { ARROW_TYPES, arrowDrawers, arrowLengths, ARROW_LOCATION_TYPES }
