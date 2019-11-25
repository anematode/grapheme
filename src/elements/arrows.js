// Some functions to draw arrows

function TriangularArrow(arrowLenScale, arrowWidthScale, addVertex, x2, y2, xa, ya, th, duX, duY, isStarting) {
  // Constructs a "triangular arrow" on (x2, y2) facing away from (xa, ya)
  let arrowLen = th * arrowLenScale;
  let arrowWidth = th * arrowWidthScale;

  let v1x = xa - x2;
  let v1y = ya - y2;
  let v1l = Math.hypot(v1x, v1y);

  if (v1l === 0) return; // yeah, I'm not dealing with that

  v1x /= v1l;
  v1y /= v1l;

  // (abx, aby) is base of the arrow
  let abx = x2 + v1x * arrowLen;
  let aby = y2 + v1y * arrowLen;

  let av1x = abx + v1y * arrowWidth;
  let av1y = aby - v1x * arrowWidth;

  let av2x = abx - v1y * arrowWidth;
  let av2y = aby + v1x * arrowWidth;

  function addArrowBaseVertices() {
    addVertex(abx + duY, aby - duX)
    addVertex(abx - duY, aby + duX)
  }

  if (!isStarting) addArrowBaseVertices()

  addVertex(x2, y2)
  addVertex(av1x, av1y)
  addVertex(av2x, av2y)

  if (isStarting) addArrowBaseVertices()
}

function FancyArrow(addVertex, x2, y2, xa, ya, th, duX, duY, isStarting) {
  // TODO
}

function StandardArrow(...args) {
  TriangularArrow(15, 5, ...args);
}

function SquatArrow(...args) {
  TriangularArrow(8, 5, ...args);
}

// list of built-in arrow types
const ARROW_TYPES = {
  CUSTOM: -1,
  STANDARD: 0,
  SQUAT: 1
}

const arrowDrawers = {
  0: StandardArrow,
  1: SquatArrow
}

export { ARROW_TYPES, arrowDrawers };
