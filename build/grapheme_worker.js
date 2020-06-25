'use strict';

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

const isWorker = typeof self !== "undefined";

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

// Parameters for the expanding/contracting float array for polyline
const MIN_SIZE = 16;

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
  }
}

function convertTriangleStrip(vertices, pen) {
  if (pen.thickness <= 0 ||
    pen.endcapRes < MIN_RES_ANGLE ||
    pen.joinRes < MIN_RES_ANGLE ||
    vertices.length <= 3) {

    return {glVertices: null, vertexCount: 0}
  }

  let glVertices = new Float32Array(MIN_SIZE);

  let index = 0;
  let arraySize = glVertices.length - 2;

  function addVertex (x, y) {
    if (index > arraySize) {
      // not enough space!!!!

      let newArr = new Float32Array(2 * glVertices.length);
      newArr.set(glVertices);

      glVertices = newArr;
      arraySize = glVertices.length - 2;
    }

    glVertices[index++] = x;
    glVertices[index++] = y;
  }

  let origVertexCount = vertices.length / 2;

  let th = pen.thickness;
  let maxMiterLength = th / Math.cos(pen.joinRes / 2);

  let endcap = ENDCAP_TYPES[pen.endcap];
  let join = JOIN_TYPES[pen.join];

  if (endcap === undefined || join === undefined) {
    throw new Error("Undefined endcap or join.")
  }

  let x1, x2, x3, y1, y2, y3;
  let v1x, v1y, v2x, v2y, v1l, v2l, b1_x, b1_y, scale, nu_x, nu_y, pu_x, pu_y, dis;

  for (let i = 0; i < origVertexCount; ++i) {
    x1 = (i !== 0) ? vertices[2 * i - 2] : NaN; // Previous vertex
    x2 = vertices[2 * i]; // Current vertex
    x3 = (i !== origVertexCount - 1) ? vertices[2 * i + 2] : NaN; // Next vertex

    y1 = (i !== 0) ? vertices[2 * i - 1] : NaN; // Previous vertex
    y2 = vertices[2 * i + 1]; // Current vertex
    y3 = (i !== origVertexCount - 1) ? vertices[2 * i + 3] : NaN; // Next vertex

    if (isNaN(x2) || isNaN(y2)) {
      addVertex(NaN, NaN);
    }

    if (isNaN(x1) || isNaN(y1)) { // starting endcap
      let nu_x = x3 - x2;
      let nu_y = y3 - y2;
      let dis = Math.hypot(nu_x, nu_y);

      if (dis < 0.001) {
        nu_x = 1;
        nu_y = 0;
      } else {
        nu_x /= dis;
        nu_y /= dis;
      }

      if (isNaN(nu_x) || isNaN(nu_y)) {
        continue
      } // undefined >:(

      if (endcap === 1) {
        // rounded endcap
        let theta = Math.atan2(nu_y, nu_x) + Math.PI / 2;
        let steps_needed = Math.ceil(Math.PI / pen.endcapRes);

        let o_x = x2 - th * nu_y, o_y = y2 + th * nu_x;

        for (let i = 1; i <= steps_needed; ++i) {
          let theta_c = theta + i / steps_needed * Math.PI;

          addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c));
          addVertex(o_x, o_y);
        }
        continue
      } else {
        // no endcap
        addVertex(x2 + th * nu_y, y2 - th * nu_x);
        addVertex(x2 - th * nu_y, y2 + th * nu_x);
        continue
      }
    }

    if (isNaN(x3) || isNaN(y3)) { // ending endcap
      let pu_x = x2 - x1;
      let pu_y = y2 - y1;
      let dis = Math.hypot(pu_x, pu_y);

      if (dis < 0.001) {
        pu_x = 1;
        pu_y = 0;
      } else {
        pu_x /= dis;
        pu_y /= dis;
      }

      if (isNaN(pu_x) || isNaN(pu_y)) {
        continue
      } // undefined >:(

      addVertex(x2 + th * pu_y, y2 - th * pu_x);
      addVertex(x2 - th * pu_y, y2 + th * pu_x);

      if (endcap === 1) {
        let theta = Math.atan2(pu_y, pu_x) + 3 * Math.PI / 2;
        let steps_needed = Math.ceil(Math.PI / pen.endcapRes);

        let o_x = x2 - th * pu_y, o_y = y2 + th * pu_x;

        for (let i = 1; i <= steps_needed; ++i) {
          let theta_c = theta + i / steps_needed * Math.PI;

          addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c));
          addVertex(o_x, o_y);
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

      v1l = Math.hypot(v1x, v1y);
      v2l = Math.hypot(v2x, v2y);

      b1_x = v2l * v1x + v1l * v2x, b1_y = v2l * v1y + v1l * v2y;
      scale = 1 / Math.hypot(b1_x, b1_y);

      if (scale === Infinity || scale === -Infinity) {
        b1_x = -v1y;
        b1_y = v1x;
        scale = 1 / Math.hypot(b1_x, b1_y);
      }

      b1_x *= scale;
      b1_y *= scale;

      scale = th * v1l / (b1_x * v1y - b1_y * v1x);

      if (join === 2 || (Math.abs(scale) < maxMiterLength)) {
        // if the length of the miter is massive and we're in dynamic mode, we exit pen if statement and do a rounded join
        if (scale === Infinity || scale === -Infinity) {
          scale = 1;
        }

        b1_x *= scale;
        b1_y *= scale;

        addVertex(x2 - b1_x, y2 - b1_y);
        addVertex(x2 + b1_x, y2 + b1_y);

        continue
      }
    }

    nu_x = x3 - x2;
    nu_y = y3 - y2;
    dis = Math.hypot(nu_x, nu_y);

    if (dis < 0.001) {
      nu_x = 1;
      nu_y = 0;
    } else {
      nu_x /= dis;
      nu_y /= dis;
    }

    pu_x = x2 - x1;
    pu_y = y2 - y1;
    dis = Math.hypot(pu_x, pu_y);

    if (dis === 0) {
      pu_x = 1;
      pu_y = 0;
    } else {
      pu_x /= dis;
      pu_y /= dis;
    }

    addVertex(x2 + th * pu_y, y2 - th * pu_x);
    addVertex(x2 - th * pu_y, y2 + th * pu_x);

    if (join === 1 || join === 3) {
      let a1 = Math.atan2(-pu_y, -pu_x) - Math.PI / 2;
      let a2 = Math.atan2(nu_y, nu_x) - Math.PI / 2;

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

        addVertex(x2 + th * Math.cos(theta_c), y2 + th * Math.sin(theta_c));
        addVertex(x2, y2);
      }
    }

    addVertex(x2 + th * nu_y, y2 - th * nu_x);
    addVertex(x2 - th * nu_y, y2 + th * nu_x);
  }

  return {
    glVertices,
    vertexCount: Math.ceil(index / 2)
  }
}

class BeastJob {
  constructor(id) {
    this.id = id;
    this.finished = false;
    this.progress = 0;
  }

  tick() {
    try {
      this._tick();
    } catch (e) {
      this.postMessage("error", e.toString());
      this.postMessage("finished", null);

      this.cancel();
    }
  }

  sendProgress(data, transferables=[]) {
    this.postMessage("progress", {progress: this.progress, ...data}, transferables);
  }

  sendFinished(data, transferables=[]) {
    this.progress = 1;

    this.sendProgress(data, transferables);

    this.finished = true;
  }

  postMessage(responseType, data, transferables=[]) {
    postMessage({response: responseType, jobID: this.id, data}, transferables);
  }

  cancel() {
    this.finished = true;
  }
}

class PolylineVerticesJob extends BeastJob {
  constructor(id, data) {
    super(id);

    this.vertices = data.vertices;
    this.pen = data.pen;
    this.box = data.box;
  }

  _tick() {
    let result = calculatePolylineVertices(this.vertices, this.pen, this.box);

    let arr = result.glVertices = result.glVertices.subarray(0, result.vertexCount * 2);

    this.sendFinished(result, [arr.buffer]);
  }
}

let JOBS = [];

function tickJobs() {
  JOBS.forEach(job => job.tick());

  if (JOBS.some(job => job.finished))
    JOBS = JOBS.filter(job => !job.finished);
}

function removeJob(job) {
  let index = JOBS.indexOf(job);

  if (index !== -1) {
    JOBS.splice(index, 1);
  }
}

function getJob(id) {
  for (let i = 0; i < JOBS.length; ++i) {
    if (JOBS[i].id === id) {
      return JOBS[i]
    }
  }

  return null
}

function cancelJob(id) {
  let job = getJob(id);
  if (job) {
    job.cancel();

    removeJob(job);
  }
}

const JobClasses = {
  "calculatePolylineVertices": PolylineVerticesJob
};

function createJob(type, id, data) {
  let jobClass = JobClasses[type];

  if (!jobClass) {
    postMessage({ jobID: id, response: "error", note: "Job class not found"});
    return
  }

  let job = new jobClass(id, data);

  JOBS.push(job);

  return job
}

onmessage = function (evt) {
  const data = evt.data;
  const id = data.jobID;
  const jobType = data.job;
  const jobData = data.data;

  if (data.job === "cancel") {
    cancelJob();
    return
  }

  createJob(jobType, id, jobData);
};

setInterval(() => {
  tickJobs();
}, 1);


// { job: "calculatePolylineVertices", jobID: 0, data: { vertices: [ ... ], pen: { ... } } }
// { job: "defineFunction", jobID: 1, data: { func: ASTNode.toJSON(), exportedVariables: ['x', 'y'] }}
// { job: "deleteFunction", jobID: 2, data: { functionID: 1 }}
// { job: "calculatePolylineVertices", jobID: 3, data: { pen: pen.toJSON(), vertices: [ ... ]}}
// { job: "generateContours2", jobID: 4, data: { functionID: 1, box: { ... }}}
// { job: "adaptivelySample1D", jobID: 5, data: { functionID: 1, xmin: -1, xmax: 1, ... }}
// { job: "sample1D", jobID: 6, ... }
// { job: "cancel", jobID: 1 }

// { jobID: 0, response: "progress", data: { complete: 0.525 }}
// { jobID: 0, response: "progress", data: { complete: 1 }}
// { jobID: 0, response: "finished", data: { vertices: [ ... ] } }
