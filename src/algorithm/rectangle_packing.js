
// A rather common operation for generating texture atlases and the like.

// Takes in an array of rectangles and returns a packing of those rectangles as a list of x and y coordinates
// The code fucking sucks, whatever, I just want text working ASAP
// TODO: Chazelle packing
export function packRectangles (rectangles) {
  // For now, just find the maximum size and repeat that.
  let rectWidth = 0, rectHeight = 0
  for (const rectangle of rectangles) {
    rectWidth = Math.max(rectWidth, rectangle.w)
    rectHeight = Math.max(rectHeight, rectangle.h)
  }

  let rectangleCount = rectangles.length
  let sqrtRectangleCount = Math.floor(Math.sqrt(rectangleCount))

  // The question is what arrangement of rectangles brings us to the smallest (by area) total bounding rectangle that
  // has sides that are both powers of two. We consider rectangles of the ratios 2:1, 1:1 and 1:2.

  const totalArea = rectWidth * rectHeight * rectangleCount
  let nextPowerOfTwo = Math.ceil(Math.floor(Math.log2(totalArea)))
  let textureWidth, textureHeight
  let rectXCount, rectYCount

  function tryPacking (width, height) {
    if (textureWidth) return

    const minYCount = Math.floor(height / rectHeight)
    let minXCount = Math.floor(width / rectWidth)

    let correspondingXCount = Math.ceil(rectangleCount / minYCount)

    if (correspondingXCount <= minXCount) {
      // Then a packing of minYCount rectangles tall and correspondingXCount rectangles wide will suffice, in a bounding
      // box of textureWidth x textureHeight

      textureWidth = width
      textureHeight = height
      rectYCount = minYCount
      rectXCount = correspondingXCount
    }
  }

  while (!textureWidth) {
    if (nextPowerOfTwo % 2 !== 0) {
      let width = 1 << (nextPowerOfTwo / 2)
      let height = 1 << (nextPowerOfTwo / 2 + 1)

      tryPacking(width, height)
      tryPacking(height, width)
    } else {
      const sideLen = 1 << (nextPowerOfTwo / 2)
      tryPacking(sideLen, sideLen)
    }

    nextPowerOfTwo++
  }

  let rects = []

  for (let i = 0; i < rectangleCount; ++i) {
    let x = i % rectXCount
    let y = Math.floor(i / rectXCount)
    let rect = rectangles[i]

    rects.push({x: x * rectWidth, y: y * rectHeight, w: rect.w, h: rect.h })
  }

  return { width: textureWidth, height: textureHeight, rects }
}

export class DynamicRectanglePacker {
  constructor () {
    // Given rectangles of some ids, packs them, allowing for rectangles to be deleted and new ones to be added after
    // a previous packing

    // Maps rectangle ids to rectangles { x, y, w, h }
    this.rects = new Map()

    this.packingBoundary = []
    this.packingMaxX = 0
    this.packingMaxY = 0

    this.queue = []
  }

  /**
   * Reset the packer
   */
  clear () {
    this.rects.clear()
  }

  // Queue a rectangle of some width and height
  queueRectangle (id, width, height) {
    this.queue.push({ id, w: width, h: height})
  }

  pack () {
    // Sorted by area. In the case of text, sorting by height might make more sense
    const rectsToPack = this.queue.sort((r1, r2) => (r1.w * r1.h - r2.w * r2.h))

    // The packing boundary is the minimal "step function" that encompasses the rectangles already allocated. Yes, I know
    // this is an abysmal heuristic, but I'm busy and I will make a better one later. It is represented as a list of
    // x and y values, alternating, starting from the bottom left. We are packing rectangles in the top left, so x
    // will be monotonically increasing and y will be monotonically decreasing.
    let packingBoundary = []

    let { packingMaxX: maxX, packingMaxY: maxY } = this

    for (const rect of rectsToPack) {
      // We find the position of the rectangle where the placement would expand the sum of the dims the least, which will make
      // the positioning generally gravitate towards a square. This means examining each concave corner.
      let bestPositionX, bestPositionY, bestMaxX, bestMaxY, bestMinDimSum = Infinity, cornerIndex

      let rectW = rect.w, rectH = rect.h

      if (packingBoundary.length === 0) {
        bestPositionX = bestPositionY = 0
        bestMaxX = rectW
        bestMaxY = rectH
        bestMinDimSum = rectW + rectH
      } else {
        bestPositionX = 0
        bestPositionY = maxY

        let x = 0, y = maxY

        for (let i = 0; i <= packingBoundary.length; i += 2) {
          // x, y is the corner in question
          let rectMaxX = x + rectW
          let rectMaxY = y + rectH

          let dimSum = Math.max(rectMaxX + rectMaxY, maxX + maxY)

          if (dimSum < bestMinDimSum) {
            bestMinDimSum = dimSum
            bestMaxX = rectMaxX
            bestMaxY = rectMaxY
            cornerIndex = i
          }

          if (dimSum === maxX + maxY) break
          if (i === packingBoundary.length) break

          let xd = packingBoundary[i], yd = packingBoundary[i + 1]

          x += xd
          y += yd
        }
      }

      // Recalculating the boundary, adding a rectangle at (bestPositionX, bestPositionY) with width (rectW, rectH),
      // expanding the total boundary to a size of (bestMaxX, bestMaxY)

      let xd = 0, yd = 0
      for (let i = cornerIndex; i <= packingBoundary.length; ++i) {
        if (xd >= rectW) {

        }

        xd += packingBoundary[i]
        yd += packingBoundary[i+1]
      }
    }
  }
}


// Credit to the authors of github.com/mapbox/potpack. I will be writing a better version soon
export function potpack(boxes) {

  // calculate total box area and maximum box width
  let area = 0;
  let maxWidth = 0;

  for (const box of boxes) {
    area += box.w * box.h;
    maxWidth = Math.max(maxWidth, box.w);
  }

  // sort the boxes for insertion by height, descending
  boxes.sort((a, b) => b.h - a.h);

  // aim for a squarish resulting container,
  // slightly adjusted for sub-100% space utilization
  const startWidth = Math.max(Math.ceil(Math.sqrt(area / 0.95)), maxWidth);

  // start with a single empty space, unbounded at the bottom
  const spaces = [{x: 0, y: 0, w: startWidth, h: Infinity}];

  let width = 0;
  let height = 0;

  for (const box of boxes) {
    // look through spaces backwards so that we check smaller spaces first
    for (let i = spaces.length - 1; i >= 0; i--) {
      const space = spaces[i];

      // look for empty spaces that can accommodate the current box
      if (box.w > space.w || box.h > space.h) continue;

      // found the space; add the box to its top-left corner
      // |-------|-------|
      // |  box  |       |
      // |_______|       |
      // |         space |
      // |_______________|
      box.x = space.x;
      box.y = space.y;

      height = Math.max(height, box.y + box.h);
      width = Math.max(width, box.x + box.w);

      if (box.w === space.w && box.h === space.h) {
        // space matches the box exactly; remove it
        const last = spaces.pop();
        if (i < spaces.length) spaces[i] = last;

      } else if (box.h === space.h) {
        // space matches the box height; update it accordingly
        // |-------|---------------|
        // |  box  | updated space |
        // |_______|_______________|
        space.x += box.w;
        space.w -= box.w;

      } else if (box.w === space.w) {
        // space matches the box width; update it accordingly
        // |---------------|
        // |      box      |
        // |_______________|
        // | updated space |
        // |_______________|
        space.y += box.h;
        space.h -= box.h;

      } else {
        // otherwise the box splits the space into two spaces
        // |-------|-----------|
        // |  box  | new space |
        // |_______|___________|
        // | updated space     |
        // |___________________|
        spaces.push({
          x: space.x + box.w,
          y: space.y,
          w: space.w - box.w,
          h: box.h
        });
        space.y += box.h;
        space.h -= box.h;
      }
      break;
    }
  }

  return {
    w: width, // container width
    h: height, // container height
    fill: (area / (width * height)) || 0 // space utilization
  };
}
