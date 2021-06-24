

// CREDIT to the authors of https://github.com/mapbox/tiny-sdf. I made some modifications.

import {packRectangles} from "../algorithm/rectangle_packing.js"

const INF = 1e20

export class TinySDF {
  constructor({
                fontSize = 24,
                buffer = 3,
                radius = 8,
                cutoff = 0.25,
                fontFamily = 'sans-serif',
                fontWeight = 'normal'
              }) {
    this.buffer = buffer;
    this.cutoff = cutoff;
    this.radius = radius;

    // make the canvas size big enough to both have the specified buffer around the glyph
    // for "halo", and account for some glyphs possibly being larger than their font size
    const size = this.size = fontSize + buffer * 4;

    const canvas = this._createCanvas(size);
    const ctx = this.ctx = canvas.getContext('2d');
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left'; // Necessary so that RTL text doesn't have different alignment
    ctx.fillStyle = 'black';

    // temporary arrays for the distance transform
    this.gridOuter = new Float64Array(size * size);
    this.gridInner = new Float64Array(size * size);
    this.f = new Float64Array(size);
    this.z = new Float64Array(size + 1);
    this.v = new Uint16Array(size);
  }

  _createCanvas(size) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    return canvas;
  }

  getMetrics(char) {
    const {
      width: glyphAdvance,
      actualBoundingBoxAscent,
      actualBoundingBoxDescent,
      actualBoundingBoxLeft,
      actualBoundingBoxRight
    } = this.ctx.measureText(char);

    // The integer/pixel part of the top alignment is encoded in metrics.glyphTop
    // The remainder is implicitly encoded in the rasterization
    const glyphTop = Math.floor(actualBoundingBoxAscent);
    const glyphLeft = 0;

    // If the glyph overflows the canvas size, it will be clipped at the bottom/right
    const glyphWidth = Math.min(this.size - this.buffer, Math.ceil(actualBoundingBoxRight - actualBoundingBoxLeft));
    const glyphHeight = Math.min(this.size - this.buffer, Math.ceil(actualBoundingBoxAscent) + Math.ceil(actualBoundingBoxDescent));

    const width = glyphWidth + 2 * this.buffer;
    const height = glyphHeight + 2 * this.buffer;

    return {width, height, glyphWidth, glyphHeight, glyphTop, glyphLeft, glyphAdvance};
  }

  draw(char, metrics = this.getMetrics(char)) {
    const {width, height, glyphWidth, glyphHeight, glyphTop} = metrics;

    const len = width * height;
    const data = new Uint8ClampedArray(len);
    const glyph = {data, ...metrics};
    if (glyphWidth === 0 || glyphHeight === 0) return glyph;

    const {ctx, buffer, gridInner, gridOuter} = this;
    ctx.clearRect(buffer, buffer, glyphWidth, glyphHeight);
    ctx.fillText(char, buffer, buffer + glyphTop + 1);
    const imgData = ctx.getImageData(buffer, buffer, glyphWidth, glyphHeight);

    // Initialize grids outside the glyph range to alpha 0
    gridOuter.fill(INF, 0, len);
    gridInner.fill(0, 0, len);

    for (let y = 0; y < glyphHeight; y++) {
      for (let x = 0; x < glyphWidth; x++) {
        const a = imgData.data[4 * (y * glyphWidth + x) + 3] / 255; // alpha value
        if (a === 0) continue; // empty pixels

        const j = (y + buffer) * width + x + buffer;

        if (a === 1) { // fully drawn pixels
          gridOuter[j] = 0;
          gridInner[j] = INF;

        } else { // aliased pixels
          const d = 0.5 - a;
          gridOuter[j] = d > 0 ? d * d : 0;
          gridInner[j] = d < 0 ? d * d : 0;
        }
      }
    }

    edt(gridOuter, width, height, this.f, this.v, this.z);
    edt(gridInner, width, height, this.f, this.v, this.z);

    for (let i = 0; i < len; i++) {
      const d = Math.sqrt(gridOuter[i]) - Math.sqrt(gridInner[i]);
      data[i] = Math.round(255 - 255 * (d / this.radius + this.cutoff));
    }

    return glyph;
  }
}

// 2D Euclidean squared distance transform by Felzenszwalb & Huttenlocher https://cs.brown.edu/~pff/papers/dt-final.pdf
function edt(data, width, height, f, v, z) {
  for (let x = 0; x < width; x++) edt1d(data, x, width, height, f, v, z);
  for (let y = 0; y < height; y++) edt1d(data, y * width, 1, width, f, v, z);
}

// 1D squared distance transform
function edt1d(grid, offset, stride, length, f, v, z) {
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  f[0] = grid[offset];

  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do {
      const r = v[k];
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);

    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }

  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    const qr = q - r;
    grid[offset + q * stride] = f[r] + qr * qr;
  }
}

// For now we'll just do printable ASCII. Everything else will be dropped
let desiredChars = ''

for (let i = 33; i < 127; ++i)
  desiredChars += String.fromCharCode(i)

export function getTextSDFInformation (params={}) {
  // Parameters are fontSize, buffer, radius, cutoff, fontFamily, and fontWeight. space is dealt with separately
  const sdf = new TinySDF(params)

  const chars = desiredChars.split('')
  const charData = []

  for (const char of chars) {
    charData.push(sdf.draw(char))
  }

  const charPacking = packRectangles(charData.map(char => ({ w: char.width, h: char.height })))

  const { width, height, rects } = charPacking

  const atlas = new Uint8ClampedArray(width * height)

  // The text is generally going to be inverted, so

  function pasteIntoAtlas (data /* Uint8ClampedArray */, pasteX, pasteY, dataWidth, dataHeight) {
    // Do it row by row, so go to y for the first element, draw dataWidth elements, then skip down

    let i = 0

    for (let y = pasteY; y < pasteY + dataHeight; ++y) {
      let offset = width/2 * y + pasteX/2
      for (let pos = offset; pos < offset + dataWidth; ++pos) {
        atlas[offset + pos] = data[i]
        ++i
      }
    }
  }

  for (let i = 0; i < chars.length; ++i) {
    let data = charData[i]
    let rect = rects[i]

    pasteIntoAtlas(data.data, rect.x, rect.y, data.width, data.height)

    data.atlasX = rect.x
    data.atlasY = rect.y
  }

  chars.push(' ')
  charData.push({ glyphAdvance: sdf.ctx.measureText(' ').width })

  const retData = {}

  for (let i = 0; i < chars.length; ++i) {
    retData[chars[i]] = charData[i]
  }

  return {
    // Current structure: Each glyph is given a rectangle on the texture with bounds (atlasX, atlasY) +
    charData: retData,
    atlas,
    atlasWidth: width,
    atlasHeight: height
  }
}
