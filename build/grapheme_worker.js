'use strict';

const Jobs = [];

function addJob(job) {
  Jobs.push(job);
}

function getJob(id) {
  for (let i = 0; i < Jobs.length; ++i) {
    let job = Jobs[i];

    if (job.id === id)
      return job
  }

  return null
}

function removeJob(job) {
  let index = Jobs.indexOf(job);

  if (index !== -1)
    Jobs.splice(index, 1);
}

function tickJobs() {
  let time = Date.now() + 5;

  while (Date.now() < time && Jobs.length !== 0) {
    let job = Jobs[0];

    if (job)
      job.tick();
    else
      return
  }
}

setInterval(tickJobs, 1);

class WorkerJob {
  constructor(id) {
    this.id = id;
  }

  error(err) {
    postMessage({type: "error", error: err, jobID: this.id});

    removeJob(this);
  }

  result(res, transferables) {
    postMessage({type: "result", data: res, jobID: this.id}, transferables);

    removeJob(this);
  }

  progress(completed) {
    postMessage({type: "progress", progress: completed, jobID: this.id});
  }
}

class Vec2 {
  constructor (x, y) {
    if (x.x) {
      this.x = x.x;
      this.y = x.y;
    } else if (Array.isArray(x)) {
      this.x = x[0];
      this.y = x[1];
    } else {
      this.x = x;
      this.y = y;
    }
  }

  clone() {
    return new Vec2(this.x, this.y)
  }

  set(v) {
    this.x = v.x;
    this.y = v.y;
  }

  subtract(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this
  }

  multiply(s) {
    this.x *= s;
    this.y *= s;
    return this
  }

  hasNaN() {
    return isNaN(this.x) || isNaN(this.y)
  }

  scale(s) {
    return this.multiply(s)
  }

  divide(s) {
    this.x /= s;
    this.y /= s;
    return this
  }

  asArray() {
    return [this.x, this.y]
  }

  length() {
    return Math.hypot(this.x, this.y)
  }

  unit() {
    return this.clone().divide(this.length())
  }

  distanceTo(v) {
    return Math.hypot(this.x - v.x, this.y - v.y)
  }

  distanceSquaredTo(v) {
    return (this.x - v.x) ** 2 + (this.y - v.y) ** 2
  }

  cross(v) {
    return this.x * v.x + this.y * v.y
  }

  rotate(angle, about=Origin) {
    let c = Math.cos(angle), s = Math.sin(angle);

    if (about === Origin) {
      let x = this.x, y = this.y;

      this.x = x * c - y * s;
      this.y = y * c + x * s;
    } else {
      let x = this.x, y = this.y;

      this.subtract(about).rotate(angle).add(about);
    }

    return this
  }

  rotateDeg(angle_deg, about=Origin) {
    this.rotate(angle_deg / 180 * 3.14159265359, about);

    return this
  }
}
const Origin = new Vec2(0,0);

class BoundingBox {
  //_width;
  //_height;

  draw(canvasCtx) {
    canvasCtx.beginPath();
    canvasCtx.rect(this.top_left.x, this.top_left.y, this.width, this.height);
    canvasCtx.stroke();
  }

  constructor(top_left=new Vec2(0,0), width=640, height=480) {
    this.top_left = top_left;

    this.width = width;
    this.height = height;
  }

  get width() {
    return this._width
  }

  get height() {
    return this._height
  }

  set width(w) {
    if (w < 0)
      throw new Error("Invalid bounding box width")
    this._width = w;
  }

  set height(h) {
    if (h < 0)
      throw new Error("Invalid bounding box height")
    this._height = h;
  }

  setTL(top_left) {
    this.top_left = top_left;
    return this
  }

  area() {
    return this.width * this.height
  }

  set cx(cx) {
    this.top_left.x = cx - this.width / 2;
  }

  set cy(cy) {
    this.top_left.y = cy - this.height / 2;
  }

  get cx() {
    return this.top_left.x + this.width / 2
  }

  get cy() {
    return this.top_left.y + this.height / 2
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    return this
  }

  clone() {
    return new BoundingBox(this.top_left.clone(), this.width, this.height)
  }

  padLeft(x) {
    this.width -= x;
    this.top_left.x += x;
    return this
  }

  padRight(x) {
    this.width -= x;
    return this
  }

  padTop(y) {
    this.height -= y;
    this.top_left.y += y;
    return this
  }

  padBottom(y) {
    this.height -= y;
    return this
  }

  pad(paddings={}) {
    if (paddings.left) {
      this.padLeft(paddings.left);
    }
    if (paddings.right) {
      this.padRight(paddings.right);
    }
    if (paddings.top) {
      this.padTop(paddings.top);
    }
    if (paddings.bottom) {
      this.padBottom(paddings.bottom);
    }

    return this
  }

  get x1() {
    return this.top_left.x
  }

  get x2() {
    return this.top_left.x + this.width
  }

  set x1(x) {
    this.top_left.x = x;
  }

  set x2(x) {
    this.width = x - this.top_left.x;
  }

  get y1() {
    return this.top_left.y
  }

  get y2() {
    return this.top_left.y + this.height
  }

  set y1(y) {
    this.top_left.y = y;
  }

  set y2(y) {
    this.height = y - this.top_left.y;
  }

  getBoxVertices() {
    return [this.x1, this.y1, this.x2, this.y1, this.x2, this.y2, this.x1, this.y2, this.x1, this.y1]
  }

  getPath() {
    let path = new Path2D();

    path.rect(this.x1, this.y1, this.width, this.height);

    return path
  }

  clip(ctx) {
    ctx.clip(this.getPath());
  }
}

const EMPTY = new BoundingBox(new Vec2(0,0), 0, 0);

// This file defines some common utilities that Grapheme uses!

// A list of all extant Grapheme Universes
const Universes = [];

// Assert that a statement is true, and throw an error if it's not
function assert (statement, error = 'Unknown error') {
  if (!statement) throw new Error(error)
}

const isWorker = typeof window === "undefined";

// Non-stupid mod function
function mod (n, m) {
  return ((n % m) + m) % m
}

if (typeof window === "undefined")
  self.window = self;

// device pixel ratio... duh
let dpr = window.devicePixelRatio;

function updateDPR () {
  if (dpr !== window.devicePixelRatio) {
    dpr = window.devicePixelRatio;

    // Tell the babies that the device pixel ratio has changed
    Universes.forEach(context => context.triggerEvent('dprchanged'));
  }
}

// Periodically check whether the dpr has changed
setInterval(updateDPR, 100);

// Import the Grapheme CSS file for canvas styling
function importGraphemeCSS () {
  try {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = '../build/grapheme.css'; // oof, must change l8r

    document.getElementsByTagName('HEAD')[0].appendChild(link);
  } catch (e) {
    console.error('Could not import Grapheme CSS');
    throw e
  }
}

if (!isWorker)
  importGraphemeCSS();

let empty_canvas = window.OffscreenCanvas ? new window.OffscreenCanvas(1, 1) : document.createElement('canvas');
let empty_canvas_ctx = empty_canvas.getContext('2d');

function zeroFill (number, width) {
  width -= number.toString().length;
  if (width > 0) {
    return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number
  }
  return number + '' // always return a string
}

function GeometryASMFunctionsCreate (stdlib, foreign, buffer) {
  'use asm';

  var sqrt = stdlib.Math.sqrt;
  var abs = stdlib.Math.abs;
  var atan2 = stdlib.Math.atan2;
  var values = new stdlib.Float64Array(buffer);
  var Infinity = stdlib.Infinity;
  var PI = stdlib.Math.PI;

  function hypot (x, y) {
    x = +x;
    y = +y;

    var quot = 0.0;

    if (+x == +0.0) {
      return abs(y)
    }

    quot = y / x;

    return abs(x) * sqrt(1.0 + quot * quot)
  }

  function point_line_segment_distance (px, py, ax, ay, bx, by) {
    // All input values are floats
    px = +px;
    py = +py;
    ax = +ax;
    ay = +ay;
    bx = +bx;
    by = +by;

    var t = 0.0, tx = 0.0, ty = 0.0, d = 0.0, xd = 0.0, yd = 0.0;

    if (ax == bx) {
      if (ay == by) {
        return +hypot(px - ax, py - ay)
      }
    }

    xd = bx - ax;
    yd = by - ay;

    t = (xd * (px - ax) + yd * (py - ay)) / (xd * xd + yd * yd);

    if (t < 0.0) {
      t = 0.0;
    } else if (t > 1.0) {
      t = 1.0;
    }

    tx = ax + t * (bx - ax);
    ty = ay + t * (by - ay);

    d = +hypot(px - tx, py - ty);

    return d
  }

  function point_line_segment_min_distance (px, py, start, end) {
    px = +px;
    py = +py;
    start = start | 0;
    end = end | 0;

    var p = 0, q = 0, min_distance = 0.0, distance = 0.0;
    min_distance = Infinity;

    for (p = start << 3, q = ((end - 2) << 3); (p | 0) < (q | 0); p = (p + 16) | 0) {
      distance = +point_line_segment_distance(px, py, +values[p >> 3], +values[(p + 8) >> 3], +values[(p + 16) >> 3], +values[(p + 24) >> 3]);

      if (distance < min_distance) {
        min_distance = distance;
      }
    }

    return min_distance
  }

  function point_line_segment_closest (px, py, ax, ay, bx, by) {
    // All input values are floats
    px = +px;
    py = +py;
    ax = +ax;
    ay = +ay;
    bx = +bx;
    by = +by;

    var t = 0.0, tx = 0.0, ty = 0.0, xd = 0.0, yd = 0.0;

    if (ax == bx) {
      if (ay == by) {
        values[0] = +ax;
        values[1] = +ay;

        return +hypot(px - ax, py - ay)
      }
    }

    xd = bx - ax;
    yd = by - ay;

    t = (xd * (px - ax) + yd * (py - ay)) / (xd * xd + yd * yd);

    if (t < 0.0) {
      t = 0.0;
    } else if (t > 1.0) {
      t = 1.0;
    }

    tx = ax + t * (bx - ax);
    ty = ay + t * (by - ay);

    values[0] = +tx;
    values[1] = +ty;

    return +hypot(px - tx, py - ty)
  }

  function point_line_segment_min_closest (px, py, start, end) {
    px = +px;
    py = +py;
    start = start | 0;
    end = end | 0;

    var p = 0, q = 0, min_distance = 0.0, distance = 0.0, cx = 0.0, cy = 0.0;
    min_distance = Infinity;

    for (p = start << 3, q = ((end - 2) << 3); (p | 0) < (q | 0); p = (p + 16) | 0) {
      distance = +point_line_segment_closest(px, py, +values[p >> 3], +values[(p + 8) >> 3], +values[(p + 16) >> 3], +values[(p + 24) >> 3]);

      if (distance < min_distance) {
        min_distance = distance;
        cx = +values[0];
        cy = +values[1];
      }
    }

    values[0] = +cx;
    values[1] = +cy;

    return +min_distance
  }

  function min (x, y) {
    x = +x;
    y = +y;

    if (x < y) {
      return x
    }
    return y
  }

  function angle_between (x1, y1, x2, y2, x3, y3) {
    x1 = +x1;
    y1 = +y1;
    x2 = +x2;
    y2 = +y2;
    x3 = +x3;
    y3 = +y3;

    return atan2(y3 - y1, x3 - x1) - atan2(y2 - y1, x2 - x1)
  }

  // Returns 0 if no refinement needed, 1 if left refinement, 2 if right refinement, 3 if both refinment
  function needs_refinement (x1, y1, x2, y2, x3, y3, threshold) {
    x1 = +x1;
    y1 = +y1;
    x2 = +x2;
    y2 = +y2;
    x3 = +x3;
    y3 = +y3;
    threshold = +threshold;

    var angle = 0.0;

    angle = +angle_between(x2, y2, x1, y1, x3, y3);
    angle = +min(abs(angle - PI), abs(angle + PI));

    if (angle > threshold) {
      return 3
    }

    if (y2 != y2) {
      if (y3 == y3) {
        return 3
      }
      if (y1 == y1) {
        return 3
      }
    }

    if (y3 != y3) {
      if (y2 == y2) {
        return 3
      }
    }

    if (y1 != y1) {
      if (y2 == y2) {
        return 3
      }
    }

    return 0
  }

  function angles_between (start, end, threshold, aspectRatio) {
    start = start | 0;
    end = end | 0;
    threshold = +threshold;
    aspectRatio = +aspectRatio;

    var p = 0, q = 0, res = 0, indx = 0;

    for (p = (start + 2) << 3, q = ((end - 2) << 3); (p | 0) < (q | 0); p = (p + 16) | 0) {
      res = needs_refinement(+values[(p - 16) >> 3],
        +(values[(p - 8) >> 3] * aspectRatio),
        +values[p >> 3],
        +(values[(p + 8) >> 3] * aspectRatio),
        +values[(p + 16) >> 3],
        +(values[(p + 24) >> 3] * aspectRatio),
        +threshold) | 0;

      indx = (((p - 4) >> 1)) | 0;

      values[indx >> 3] = +(res | 0);
    }
  }

  return {
    angles_between: angles_between,
    point_line_segment_min_distance: point_line_segment_min_distance,
    point_line_segment_min_closest: point_line_segment_min_closest,
    needs_refinement: needs_refinement
  }
}

let heap = new ArrayBuffer(0x200000);
let stdlib = {
  Math: Math,
  Float64Array: Float64Array,
  Infinity: Infinity
};
var GeometryASMFunctions = GeometryASMFunctionsCreate(stdlib, null, heap);

// Credit to cortijon on StackOverflow! Thanks bro/sis
function getLineIntersection (p0_x, p0_y, p1_x, p1_y, p2_x, p2_y, p3_x, p3_y) {
  let s1_x, s1_y, s2_x, s2_y;

  s1_x = p1_x - p0_x;
  s1_y = p1_y - p0_y;
  s2_x = p3_x - p2_x;
  s2_y = p3_y - p2_y;

  const s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / (-s2_x * s1_y + s1_x * s2_y);
  const t = (s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / (-s2_x * s1_y + s1_x * s2_y);

  if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
    // Collision detected
    const intX = p0_x + (t * s1_x);
    const intY = p0_y + (t * s1_y);

    return [intX, intY]
  }

  return null
}

function lineSegmentIntersectsBox(x1, y1, x2, y2, box_x1, box_y1, box_x2, box_y2) {
  // Return the component of the line segment that resides inside a box with boundaries x in (box_x1 .. box_x2), y in
  // (box_y1 .. box_y2), which may potentially be the entire line segment.

  let pt1InBox = box_x1 <= x1 && x1 <= box_x2 && box_y1 <= y1 && y1 <= box_y2;
  let pt2InBox = box_x1 <= x2 && x2 <= box_x2 && box_y1 <= y2 && y2 <= box_y2;

  if (pt1InBox && pt2InBox) {
    // The line segment is entirely in the box

    return [x1, y1, x2, y2]
  }

  // Infinities cause weird problems with getLineIntersection, so we just approximate them lol
  if (x1 === Infinity)
    x1 = 1e6;
  else if (x1 === -Infinity)
    x1 = -1e6;
  if (x2 === Infinity)
    x2 = 1e6;
  else if (x2 === -Infinity)
    x2 = -1e6;
  if (y1 === Infinity)
    y1 = 1e6;
  else if (y1 === -Infinity)
    y1 = -1e6;
  if (y2 === Infinity)
    y2 = 1e6;
  else if (y2 === -Infinity)
    y2 = -1e6;

  let int1 = getLineIntersection(x1, y1, x2, y2, box_x1, box_y1, box_x2, box_y1);
  let int2 = getLineIntersection(x1, y1, x2, y2, box_x2, box_y1, box_x2, box_y2);
  let int3 = getLineIntersection(x1, y1, x2, y2, box_x2, box_y2, box_x1, box_y2);
  let int4 = getLineIntersection(x1, y1, x2, y2, box_x1, box_y2, box_x1, box_y1);

  if (!(int1 || int2 || int3 || int4) && !pt1InBox && !pt2InBox) {
    // If there are no intersections and the points are outside the box, that means none of the segment is inside the
    // box, so we can return null

    return null
  }

  let intersections = [int1, int2, int3, int4];

  if (!pt1InBox && !pt2InBox) {

    // Both points are outside of the box, but the segment intersects the box. I'm frustrated! We must RESTRICT by finding the pair of intersections with
    // maximal separation. This deals with annoying corner cases. Thankfully this code doesn't need to be too efficient
    // since this is a rare case.

    let maximalSeparationSquared = -1;
    let n_x1, n_y1, n_x2, n_y2;

    for (let i = 0; i < 3; ++i) {
      let i1 = intersections[i];
      if (i1) {
        for (let j = i + 1; j < 4; ++j) {
          let i2 = intersections[j];
          if (i2) {
            let dist = (i2[0] - i1[0]) ** 2 + (i2[1] - i1[1]) ** 2;

            if (dist > maximalSeparationSquared) {
              maximalSeparationSquared = dist;
              n_x1 = i1[0];
              n_y1 = i1[1];
              n_x2 = i2[0];
              n_y2 = i2[1];
            }
          }
        }
      }
    }

    // Swap the order if necessary. We need the result of this calculation to be in the same order as the points
    // that went in, since this will be used in the dashed line logic.
    if (((n_x1 < n_x2) === (x1 > x2)) || ((n_y1 < n_y2) === (y1 > y2))) {
      let tmp = n_x1;
      n_x1 = n_x2;
      n_x2 = tmp;

      tmp = n_y1;
      n_y1 = n_y2;
      n_y2 = tmp;
    }

    return [n_x1, n_y1, n_x2, n_y2]
  }


  if (pt1InBox) {
    for (let i = 0; i < 4; ++i) {
      let intersection = intersections[i];

      if (intersection)
        return [x1, y1, intersection[0], intersection[1]]
    }
  } else if (pt2InBox) {
    for (let i = 0; i < 4; ++i) {
      let intersection = intersections[i];

      if (intersection)
        return [intersection[0], intersection[1], x2, y2]
    }
  }

  return [x1, y1, x2, y2]
}

function fastHypot(x, y) {
  return Math.sqrt(x * x + y * y)
}

const MAX_VERTICES = 1e6;

/**
 * Convert a polyline into another polyline, but with dashes.
 * @param vertices {Array} The vertices of the polyline.
 * @param pen {Pen} The polyline's pen
 * @param box {BoundingBox}
 * @returns {Array}
 */
function getDashedPolyline(vertices, pen, box) {
  let dashPattern = pen.dashPattern;

  if (dashPattern.length % 2 === 1) {
    // If the dash pattern is odd in length, concat it to itself
    dashPattern = dashPattern.concat(dashPattern);
  }

  let dashOffset = pen.dashOffset;
  let patternLength = dashPattern.reduce((a, b) => a + b);

  if (patternLength < 2 || dashPattern.some(dashLen => dashLen < 0))
    return vertices

  let currentOffset = dashOffset;
  let currentIndex, currentLesserOffset;

  recalculateOffset(0); // calculate the needed index

  let result = [];

  let box_x1 = box.x1, box_x2 = box.x2, box_y1 = box.y1, box_y2 = box.y2;

  function recalculateOffset(length) {
    if (length > 1e6) { // If there's an absurdly long segment, we just pretend the length is 0
      length = 0;
    }

    currentOffset += length;
    currentOffset %= patternLength;

    let sum = 0, i, lesserOffset;
    for (i = 0; i < dashPattern.length; ++i) {
      sum += dashPattern[i];

      if (currentOffset < sum) {
        lesserOffset = dashPattern[i] - sum + currentOffset;
        break
      }
    }

    if (i === dashPattern.length)
      --i;

    currentIndex = i;
    currentLesserOffset = lesserOffset;
  }

  function generateDashes(x1, y1, x2, y2) {
    let length = fastHypot(x2 - x1, y2 - y1);
    let i = currentIndex;
    let totalLen = 0, _;
    for (_ = 0; _ < MAX_VERTICES; _++) {
      let componentLen = dashPattern[i] - currentLesserOffset;
      let endingLen = componentLen + totalLen;

      let inDash = i % 2 === 0;

      if (endingLen < length) {
        if (!inDash)
          result.push(NaN, NaN);

        let r = endingLen / length;

        result.push(x1 + (x2 - x1) * r, y1 + (y2 - y1) * r);

        if (inDash)
          result.push(NaN, NaN);

        ++i;
        i %= dashPattern.length;

        currentLesserOffset = 0;
      } else {
        if (inDash)
          result.push(x2, y2);

        break
      }

      totalLen += componentLen;
    }

    if (_ === MAX_VERTICES)
      console.log(x1, y1, x2, y2);

    recalculateOffset(length);
  }

  if (currentIndex % 2 === 0) {
    // We're beginning with a dash, so start it off
    result.push(vertices[0], vertices[1]);
  }

  for (let i = 0; i < vertices.length - 2; i += 2) {
    let x1 = vertices[i];
    let y1 = vertices[i+1];
    let x2 = vertices[i+2];
    let y2 = vertices[i+3];

    if (isNaN(x1) || isNaN(y1)) {
      currentOffset = dashOffset;
      recalculateOffset(0);

      result.push(NaN, NaN);

      continue
    }

    if (isNaN(x2) || isNaN(y2)) {
      continue
    }

    let length = fastHypot(x2 - x1, y2 - y1);
    let intersect = lineSegmentIntersectsBox(x1, y1, x2, y2, box_x1, box_y1, box_x2, box_y2);

    if (!intersect) {
      recalculateOffset(length);
      continue
    }

    let pt1Contained = (intersect[0] === x1 && intersect[1] === y1);
    let pt2Contained = (intersect[2] === x2 && intersect[3] === y2);

    if (!pt1Contained) {
      recalculateOffset(fastHypot(x1 - intersect[0], y1 - intersect[1]));
    }

    generateDashes(intersect[0], intersect[1], intersect[2], intersect[3]);

    if (!pt2Contained) {
      recalculateOffset(fastHypot(x2 - intersect[2], y2 - intersect[3]));
    }

    if (result.length > MAX_VERTICES)
      return result
  }

  return result
}

const ENDCAP_TYPES = {
  'butt': 0,
  'round': 1,
  'square': 0 // Need to implement
};
const JOIN_TYPES = {
  'bevel': 0,
  'miter': 3,
  'round': 1,
  'dynamic': 3
};

const MIN_RES_ANGLE = 0.05; // minimum angle in radians between roundings in a polyline
const B = 4 / Math.PI;
const C = -4 / (Math.PI ** 2);

function fastSin(x) { // crude, but good enough for this

  x %= 6.28318530717;

  if (x < -3.14159265)
    x += 6.28318530717;
  else
  if (x > 3.14159265)
    x -= 6.28318530717;


  return B * x + C * x * ((x < 0) ? -x : x)
}

function fastCos(x) {
  return fastSin(x + 1.570796326794)
}

function fastAtan2(y, x) {
  let abs_x = x < 0 ? -x : x;
  let abs_y = y < 0 ? -y : y;

  let a = abs_x < abs_y ? abs_x / abs_y : abs_y / abs_x;
  let s = a * a;
  let r = ((-0.0464964749 * s + 0.15931422) * s - 0.327622764) * s * a + a;

  if (abs_y > abs_x)
    r = 1.57079637 - r;
  if (x < 0)
    r = 3.14159265 - r;
  if (y < 0)
    r = -r;

  return r
}

/**
 * Convert an array of polyline vertices into a Float32Array of vertices to be rendered using WebGL.
 * @param vertices {Array} The vertices of the polyline.
 * @param pen {Object} A JSON representation of the pen. Could also be the pen object itself.
 * @param box {BoundingBox} The bounding box of the plot, used to optimize line dashes
 */
function calculatePolylineVertices(vertices, pen, box) {
  if (pen.dashPattern.length === 0) {
    // No dashes to draw
    return convertTriangleStrip(vertices, pen);
  } else {
    return convertTriangleStrip(getDashedPolyline(vertices, pen, box), pen)
  }
}

function convertTriangleStrip(vertices, pen) {
  if (pen.thickness <= 0 ||
    pen.endcapRes < MIN_RES_ANGLE ||
    pen.joinRes < MIN_RES_ANGLE ||
    vertices.length <= 3) {

    return {glVertices: null, vertexCount: 0}
  }

  let glVertices = [];

  let origVertexCount = vertices.length / 2;

  let th = pen.thickness / 2;
  let maxMiterLength = th / fastCos(pen.joinRes / 2);

  let endcap = ENDCAP_TYPES[pen.endcap];
  let join = JOIN_TYPES[pen.join];

  if (endcap === undefined || join === undefined) {
    throw new Error("Undefined endcap or join.")
  }

  let x1, x2, x3, y1, y2, y3;
  let v1x, v1y, v2x, v2y, v1l, v2l, b1_x, b1_y, scale, dis;

  for (let i = 0; i < origVertexCount; ++i) {
    x1 = (i !== 0) ? vertices[2 * i - 2] : NaN; // Previous vertex
    x2 = vertices[2 * i]; // Current vertex
    x3 = (i !== origVertexCount - 1) ? vertices[2 * i + 2] : NaN; // Next vertex

    y1 = (i !== 0) ? vertices[2 * i - 1] : NaN; // Previous vertex
    y2 = vertices[2 * i + 1]; // Current vertex
    y3 = (i !== origVertexCount - 1) ? vertices[2 * i + 3] : NaN; // Next vertex

    if (isNaN(x2) || isNaN(y2)) {
      glVertices.push(NaN, NaN);
    }

    if (isNaN(x1) || isNaN(y1)) { // starting endcap
      v2x = x3 - x2;
      v2y = y3 - y2;

      v2l = fastHypot(v2x, v2y);

      if (v2l < 0.001) {
        v2x = 1;
        v2y = 0;
      } else {
        v2x /= v2l;
        v2y /= v2l;
      }

      if (isNaN(v2x) || isNaN(v2y)) {
        continue
      } // undefined >:(

      if (endcap === 1) {
        // rounded endcap
        let theta = fastAtan2(v2y, v2x) + Math.PI / 2;
        let steps_needed = Math.ceil(Math.PI / pen.endcapRes);

        let o_x = x2 - th * v2y, o_y = y2 + th * v2x;

        for (let i = 1; i <= steps_needed; ++i) {
          let theta_c = theta + i / steps_needed * Math.PI;

          glVertices.push(x2 + th * fastCos(theta_c), y2 + th * fastSin(theta_c), o_x, o_y);
        }
        continue
      } else {
        // no endcap
        glVertices.push(x2 + th * v2y, y2 - th * v2x, x2 - th * v2y, y2 + th * v2x);
        continue
      }
    }

    if (isNaN(x3) || isNaN(y3)) { // ending endcap
      v1x = x2 - x1;
      v1y = y2 - y1;

      v1l = v2l;

      if (v1l < 0.001) {
        v1x = 1;
        v1y = 0;
      } else {
        v1x /= v1l;
        v1y /= v1l;
      }

      if (isNaN(v1x) || isNaN(v1y)) {
        continue
      } // undefined >:(

      glVertices.push(x2 + th * v1y, y2 - th * v1x, x2 - th * v1y, y2 + th * v1x);

      if (endcap === 1) {
        let theta = fastAtan2(v1y, v1x) + 3 * Math.PI / 2;
        let steps_needed = Math.ceil(Math.PI / pen.endcapRes);

        let o_x = x2 - th * v1y, o_y = y2 + th * v1x;

        for (let i = 1; i <= steps_needed; ++i) {
          let theta_c = theta + i / steps_needed * Math.PI;

          glVertices.push(x2 + th * fastCos(theta_c), y2 + th * fastSin(theta_c), o_x, o_y);
        }
      }

      continue
    }

    // all vertices are defined, time to draw a joinerrrrr
    if (join === 2 || join === 3) {
      // find the two angle bisectors of the angle formed by v1 = p1 -> p2 and v2 = p2 -> p3

      v1x = x1 - x2;
      v1y = y1 - y2;
      v2x = x3 - x2;
      v2y = y3 - y2;

      v1l = v2l;
      v2l = fastHypot(v2x, v2y);

      b1_x = v2l * v1x + v1l * v2x, b1_y = v2l * v1y + v1l * v2y;
      scale = 1 / fastHypot(b1_x, b1_y);

      if (scale === Infinity || scale === -Infinity) {
        b1_x = -v1y;
        b1_y = v1x;
        scale = 1 / fastHypot(b1_x, b1_y);
      }

      b1_x *= scale;
      b1_y *= scale;

      scale = th * v1l / (b1_x * v1y - b1_y * v1x);

      if (join === 2 || (Math.abs(scale) < maxMiterLength)) {
        // if the length of the miter is massive and we're in dynamic mode, we exit this if statement and do a rounded join
        b1_x *= scale;
        b1_y *= scale;

        glVertices.push(x2 - b1_x, y2 - b1_y, x2 + b1_x, y2 + b1_y);

        continue
      }
    }

    v2x = x3 - x2;
    v2y = y3 - y2;
    dis = fastHypot(v2x, v2y);

    if (dis < 0.001) {
      v2x = 1;
      v2y = 0;
    } else {
      v2x /= dis;
      v2y /= dis;
    }

    v1x = x2 - x1;
    v1y = y2 - y1;
    dis = fastHypot(v1x, v1y);

    if (dis === 0) {
      v1x = 1;
      v1y = 0;
    } else {
      v1x /= dis;
      v1y /= dis;
    }

    glVertices.push(x2 + th * v1y, y2 - th * v1x, x2 - th * v1y, y2 + th * v1x);

    if (join === 1 || join === 3) {
      let a1 = fastAtan2(-v1y, -v1x) - Math.PI / 2;
      let a2 = fastAtan2(v2y, v2x) - Math.PI / 2;

      // if right turn, flip a2
      // if left turn, flip a1

      let start_a, end_a;

      if (mod(a1 - a2, 2 * Math.PI) < Math.PI) {
        // left turn
        start_a = Math.PI + a1;
        end_a = a2;
      } else {
        start_a = Math.PI + a2;
        end_a = a1;
      }

      let angle_subtended = mod(end_a - start_a, 2 * Math.PI);
      let steps_needed = Math.ceil(angle_subtended / pen.joinRes);

      for (let i = 0; i <= steps_needed; ++i) {
        let theta_c = start_a + angle_subtended * i / steps_needed;

        glVertices.push(x2 + th * fastCos(theta_c), y2 + th * fastSin(theta_c), x2, y2);
      }
    }

    glVertices.push(x2 + th * v2y, y2 - th * v2x, x2 - th * v2y, y2 + th * v2x);
  }

  return {
    glVertices: new Float32Array(glVertices),
    vertexCount: glVertices.length / 2
  }
}

// Implementation of basic color functions
// Could use a library, but... good experience for me too

function isValidColorComponent (x) {
  return (x >= 0 && x <= 255)
}

class Color {
  constructor ({
    r = 0, g = 0, b = 0, a = 255
  } = {}) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;

    assert([this.r, this.g, this.b, this.a].every(isValidColorComponent), 'Invalid color component');
  }

  rounded () {
    return {
      r: Math.round(this.r),
      g: Math.round(this.g),
      b: Math.round(this.b),
      a: Math.round(this.a)
    }
  }

  toJSON() {
    return {
      r: this.r,
      g: this.g,
      b: this.b,
      a: this.a
    }
  }

  hex () {
    const rnd = this.rounded();
    return `#${[rnd.r, rnd.g, rnd.b, rnd.a].map((x) => zeroFill(x.toString(16), 2)).join('')}`
  }

  glColor () {
    return {
      r: this.r / 255, g: this.g / 255, b: this.b / 255, a: this.a / 255
    }
  }

  toNumber() {
    return this.r * 0x1000000 + this.g * 0x10000 + this.b * 0x100 + this.a
  }

  clone() {
    return new Color(this)
  }
}

class Pen {
  constructor (params = {}) {
    const {
      color = new Color(),
      thickness = 2, // in CSS pixels
      dashPattern = [], // lengths of alternating dashes
      dashOffset = 0, // length of dash offset
      endcap = 'round', // endcap, among "butt", "round", "square"
      endcapRes = 1, // angle between consecutive endcap roundings, only used in WebGL
      join = 'miter', // join type, among "miter", "round", "bevel"
      joinRes = 1, // angle between consecutive join roundings
      useNative = false, // whether to use native line drawing, only used in WebGL
      arrowhead = "Normal", // arrowhead to draw
      arrowLocations = [], // possible values of locations to draw: "start", "substart", "end", "subend"
      visible = true
    } = params;

    this.color = color;
    this.thickness = thickness;
    this.dashPattern = dashPattern;
    this.dashOffset = dashOffset;
    this.endcap = endcap;
    this.endcapRes = endcapRes;
    this.join = join;
    this.joinRes = joinRes;
    this.useNative = useNative;
    this.arrowhead = arrowhead;
    this.arrowLocations = arrowLocations;
    this.visible = visible;
  }

  clone() {
    let copy = new Pen(this);
    copy.color = this.color.clone();
  }

  prepareContext (ctx) {
    ctx.fillStyle = ctx.strokeStyle = this.color.hex();
    ctx.lineWidth = this.thickness;
    ctx.setLineDash(this.dashPattern);
    ctx.lineDashOffset = this.dashOffset;
    ctx.miterLimit = this.thickness / Math.cos(this.joinRes / 2);
    ctx.lineCap = this.endcap;
    ctx.lineJoin = this.join;
  }

  toJSON () {
    return {
      color: this.color.toJSON(),
      thickness: this.thickness,
      dashPattern: this.dashPattern.slice(),
      dashOffset: this.dashOffset,
      endcap: this.endcap,
      endcapRes: this.endcapRes,
      join: this.join,
      joinRes: this.joinRes,
      useNative: this.useNative,
      arrowhead: this.arrowhead,
      arrowLocations: this.arrowLocations.slice(),
      visible: this.visible
    }
  }
}

class PolylineVerticesJob extends WorkerJob {
  constructor(id, data) {
    super(id);

    this.vertices = data.vertices;
    this.pen = data.pen ? data.pen : new Pen().toJSON();
    this.box = data.box ? new BoundingBox(data.box) : new BoundingBox(new Vec2(0, 0), 8192, 8192);

    if (!this.vertices)
      this.error("No vertices supplied");
    if (!this.pen)
      this.error("No pen supplied");
    if (!Array.isArray(this.vertices) && !ArrayBuffer.isView(this.vertices))
      this.error("Invalid vertices supplied");
  }

  tick() {
    let result = calculatePolylineVertices(this.vertices, this.pen, this.box);

    this.result(result, [result.glVertices.buffer]);
  }
}

let JobConstructors = {
  "calculatePolylineVertices": PolylineVerticesJob
};

self.onmessage = (message) => {
  let data = message.data;
  let id = data.jobID;

  switch (data.type) {
    case "cancelAll":
      Jobs.length = 0;
      break
    case "cancel":
      removeJob(getJob(id));
      break
    case "create":
      let constructor = JobConstructors[data.jobType];

      if (!constructor)
        postMessage({type: "error", jobID: id, error: "Invalid constructor " + data.jobType});

      let job = new constructor(id, data.data);

      addJob(job);
  }
};
