var Grapheme = (function (exports) {
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

    setComponents(x, y) {
      this.x = x;
      this.y = y;
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

  const boundingBoxTransform = {
    X: (x, box1, box2, flipX) => {
      if (Array.isArray(x) || isTypedArray(x)) {
        for (let i = 0; i < x.length; ++i) {
          let fractionAlong = (x[i] - box1.x1) / box1.width;

          if (flipX)
            fractionAlong = 1 - fractionAlong;

          x[i] = fractionAlong * box2.width + box2.x1;
        }
        return x
      } else {
        return boundingBoxTransform.X([x], box1, box2, flipX)[0]
      }
    },
    Y: (y, box1, box2, flipY) => {
      if (Array.isArray(y) || isTypedArray(y)) {
        for (let i = 0; i < y.length; ++i) {
          let fractionAlong = (y[i] - box1.y1) / box1.height;

          if (flipY)
            fractionAlong = 1 - fractionAlong;

          y[i] = fractionAlong * box2.height + box2.y1;
        }
        return y
      } else {
        return boundingBoxTransform.Y([y], box1, box2, flipY)[0]
      }
    },
    XY: (xy, box1, box2, flipX, flipY) => {
      if (Array.isArray(xy) || isTypedArray(x)) {
        for (let i = 0; i < xy.length; i += 2) {
          let fractionAlong = (xy[i] - box1.x1) / box1.width;

          if (flipX)
            fractionAlong = 1 - fractionAlong;

          xy[i] = fractionAlong * box2.width + box2.x1;

          fractionAlong = (xy[i+1] - box1.y1) / box1.height;

          if (flipY)
            fractionAlong = 1 - fractionAlong;

          xy[i+1] = fractionAlong * box2.height + box2.y1;
        }
        return xy
      } else {
        throw new Error("No")
      }
    },
    getReducedTransform(box1, box2, flipX, flipY) {
      let x_m = 1 / box1.width;
      let x_b = - box1.x1 / box1.width;

      if (flipX) {
        x_m *= -1;
        x_b = 1 - x_b;
      }

      x_m *= box2.width;
      x_b *= box2.width;
      x_b += box2.x1;

      let y_m = 1 / box1.height;
      let y_b = - box1.y1 / box1.height;

      if (flipY) {
        y_m *= -1;
        y_b = 1 - y_b;
      }

      y_m *= box2.height;
      y_b *= box2.height;
      y_b += box2.y1;

      return {x_m, x_b, y_m, y_b}
    }
  };

  const EMPTY = new BoundingBox(new Vec2(0,0), 0, 0);

  function intersectBoundingBoxes(box1, box2) {
    let x1 = Math.max(box1.x1, box2.x1);
    let y1 = Math.max(box1.y1, box2.y1);
    let x2 = Math.min(box1.x2, box2.x2);
    let y2 = Math.min(box1.y2, box2.y2);

    if (x2 < x1) {
      return EMPTY.clone()
    }

    if (y2 < y1) {
      return EMPTY.clone()
    }

    let width = x2 - x1;
    let height = y2 - y1;

    return new BoundingBox(new Vec2(x1, y1), width, height)
  }

  /**
   * Represents a complex number, with a real part and an imaginary part both represented by floats.
   */

  class Complex$1 {
    /**
     * Construct a new complex number.
     * @param re The real part of the complex number.
     * @param im The imaginary part of the complex number.
     */
    constructor(re, im=0) {
      this.re = re;
      this.im = im;
    }

    /**
     * Get i.
     * @returns {Complex} i.
     * @constructor
     */
    static get I() {
      return new Complex$1(0, 1)
    }

    /**
     * Get 1.
     * @returns {Complex} 1.
     * @constructor
     */
    static get One() {
      return new Complex$1(1, 0)
    }

    /**
     * Return the complex argument (principal value) corresponding to the complex number.
     * @returns {number} The complex argument Arg(z).
     */
    arg() {
      return Math.atan2(this.im, this.re)
    }

    /**
     * Returns |z|.
     * @returns {number} The complex magnitude |z|.
     */
    magnitude() {
      return Math.hypot(this.re, this.im)
    }

    /**
     * Returns |z|^2.
     * @returns {number} The square of the complex magnitude |z|^2.
     */
    magnitudeSquared() {
      return this.re * this.re + this.im * this.im
    }

    /**
     * Returns z bar.
     * @returns {Complex} The conjugate of z.
     */
    conj() {
      return new Complex$1(this.re, -this.im)
    }

    /**
     * Clone this complex number.
     * @returns {Complex} Clone of z.
     */
    clone() {
      return new Complex$1(this.re, this.im)
    }

    /**
     * Scale this complex number by the real factor r.
     * @param r {number} The scaling factor.
     */
    scale(r) {
      return new Complex$1(this.re * r, this.im * r)
    }

    /**
     * Check whether this complex number is equal to another.
     * @param z {Complex} Complex number to compare with.
     */
    equals(z) {
      return (this.re === z.re) && (this.im === z.im)
    }

    /**
     * Return a complex number pointing in the same direction, with magnitude 1.
     * @returns {Complex}
     */
    normalize() {
      let mag = this.magnitude();

      return this.scale(1 / mag)
    }
  }

  /**
   * Returns a + b.
   * @param a {Complex}
   * @param b {Complex}
   * @returns {Complex}
   */
  const Add = (a, b) => {
    return new Complex$1(a.re + b.re, a.im + b.im)
  };

  /**
   * Returns a * b.
   * @param a {Complex}
   * @param b {Complex}
   * @returns {Complex}
   */
  const Multiply = (a, b) => {
    return new Complex$1(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re)
  };

  /**
   * Returns a / b.
   * @param a {Complex}
   * @param b {Complex}
   * @returns {Complex}
   */
  const Divide = (a, b) => {
    let div = b.magnitudeSquared();

    return Multiply(a, b.conj()).scale(1 / div)
  };

  /**
   * Returns a - b.
   * @param a {Complex}
   * @param b {Complex}
   * @returns {Complex}
   */
  const Subtract = (a, b) => {
    return new Complex$1(a.re - b.re, a.im - b.im)
  };

  /**
   * Returns Re(z).
   * @param z
   * @returns {number}
   */
  const Re = (z) => {
    return z.re
  };

  /**
   * Returns Im(z)
   * @param z
   * @returns {number}
   */
  const Im = (z) => {
    return z.im
  };

  const Construct = (a, b=0) => {
    return new Complex$1(a, b)
  };

  const piecewise = (val1, cond, ...args) => {
    if (cond)
      return val1
    if (args.length === 0) {
      if (cond === undefined)
        return val1
      else
        return new Complex$1(0)
    }

    return piecewise(...args)
  };

  const Abs = (z) => {
    return z.magnitudeSquared()
  };

  const IsFinite = (z) => {
    return isFinite(z.re) && isFinite(z.im)
  };

  const Piecewise = piecewise;

  var BasicArithmeticFunctions = /*#__PURE__*/Object.freeze({
    Add: Add,
    Multiply: Multiply,
    Divide: Divide,
    Subtract: Subtract,
    Re: Re,
    Im: Im,
    Construct: Construct,
    Abs: Abs,
    IsFinite: IsFinite,
    Piecewise: Piecewise
  });

  function multiplyPolynomials(coeffs1, coeffs2, degree) {
    let ret = [];
    for (let i = 0; i <= degree; ++i) {
      ret.push(0);
    }

    for (let i = 0; i < coeffs1.length; ++i) {
      for (let j = 0; j < coeffs2.length; ++j) {
        ret[i + j] += coeffs1[i] * coeffs2[j];
      }
    }

    return ret
  }

  class SingleVariablePolynomial {
    constructor(coeffs=[0]) {
      // Order: first is constant, second is linear, etc.
      this.coeffs = coeffs;
    }

    _evaluateFloat(x) {
      let coeffs = this.coeffs;
      let prod = 1;
      let sum = 0;

      for (let i = 0; i < coeffs.length; ++i) {
        sum += coeffs[i] * prod;

        prod *= x;
      }

      return sum
    }

    evaluateComplex(z) {
      let coeffs = this.coeffs;
      let prod = Complex$1.One;
      let sum = new Complex$1(0);

      for (let i = 0; i < coeffs.length; ++i) {
        let coeff = coeffs[i];

        let component = Multiply(new Complex$1(coeff), prod);

        prod = Multiply(prod, z);
      }

      return sum
    }

    evaluate(x) {
      let coeffs = this.coeffs;
      let prod = 1;
      let sum = 0;

      for (let i = 0; i < coeffs.length; ++i) {
        let coeff = coeffs[i];


        if (coeff !== 0)
          sum += coeff * prod;

        prod *= x;

      }

      return sum
    }

    degree() {
      return this.coeffs.length - 1
    }

    derivative() {
      let newCoeffs = [];
      const coeffs = this.coeffs;

      for (let i = 1; i < coeffs.length; ++i) {
        let coeff = coeffs[i];

        newCoeffs.push(i * coeff);
      }

      return new SingleVariablePolynomial(newCoeffs)
    }

    clone() {
      return new SingleVariablePolynomial(this.coeffs.slice())
    }

    add(poly) {
      let coeffs = this.coeffs;
      let otherCoeffs = poly.coeffs;

      for (let i = 0; i < otherCoeffs.length; ++i) {
        coeffs[i] = (coeffs[i] ? coeffs[i] : 0) + otherCoeffs[i];
      }

      return this
    }

    subtract(poly) {
      const coeffs = this.coeffs;
      const otherCoeffs = poly.coeffs;

      for (let i = 0; i < otherCoeffs.length; ++i) {
        coeffs[i] = (coeffs[i] ? coeffs[i] : 0) - otherCoeffs[i];
      }

      return this
    }

    multiplyScalar(s) {
      const coeffs = this.coeffs;

      for (let i = 0; i < coeffs.length; ++i) {
        coeffs[i] *= s;
      }

      return this
    }

    multiply(poly) {
      this.coeffs = multiplyPolynomials(poly.coeffs, this.coeffs, poly.degree() + this.degree());
      return this
    }

    integral() {
      // TODO
    }
  }

  // Credit to https://stackoverflow.com/questions/15454183/how-to-make-a-function-that-computes-the-factorial-for-numbers-with-decimals!! Thank you so much

  var g = 7;
  var LANCZOS_COEFFICIENTS = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  var INTEGER_FACTORIALS = [
    1,
    1,
    2,
    6,
    24,
    120,
    720,
    5040,
    40320,
    362880,
    3628800,
    39916800,
    479001600,
    6227020800,
    87178291200,
    1307674368000,
    20922789888000,
    355687428096000,
    6402373705728000,
    121645100408832000,
    2432902008176640000,
    51090942171709440000,
    1.1240007277776077e+21,
    2.585201673888498e+22,
    6.204484017332394e+23,
    1.5511210043330986e+25,
    4.0329146112660565e+26,
    1.0888869450418352e+28,
    3.0488834461171384e+29,
    8.841761993739701e+30,
    2.6525285981219103e+32,
    8.222838654177922e+33,
    2.631308369336935e+35,
    8.683317618811886e+36,
    2.9523279903960412e+38,
    1.0333147966386144e+40,
    3.719933267899012e+41,
    1.3763753091226343e+43,
    5.23022617466601e+44,
    2.0397882081197442e+46,
    8.159152832478977e+47,
    3.3452526613163803e+49,
    1.4050061177528798e+51,
    6.041526306337383e+52,
    2.6582715747884485e+54,
    1.1962222086548019e+56,
    5.5026221598120885e+57,
    2.5862324151116818e+59,
    1.2413915592536073e+61,
    6.082818640342675e+62,
    3.0414093201713376e+64,
    1.5511187532873822e+66,
    8.065817517094388e+67,
    4.2748832840600255e+69,
    2.308436973392414e+71,
    1.2696403353658276e+73,
    7.109985878048635e+74,
    4.052691950487722e+76,
    2.350561331282879e+78,
    1.3868311854568986e+80,
    8.320987112741392e+81,
    5.075802138772248e+83,
    3.146997326038794e+85,
    1.98260831540444e+87,
    1.2688693218588417e+89,
    8.247650592082472e+90,
    5.443449390774431e+92,
    3.647111091818868e+94,
    2.4800355424368305e+96,
    1.711224524281413e+98,
    1.197857166996989e+100,
    8.504785885678622e+101,
    6.123445837688608e+103,
    4.4701154615126834e+105,
    3.3078854415193856e+107,
    2.480914081139539e+109,
    1.8854947016660498e+111,
    1.4518309202828584e+113,
    1.1324281178206295e+115,
    8.946182130782973e+116,
    7.156945704626378e+118,
    5.797126020747366e+120,
    4.75364333701284e+122,
    3.945523969720657e+124,
    3.314240134565352e+126,
    2.8171041143805494e+128,
    2.4227095383672724e+130,
    2.107757298379527e+132,
    1.8548264225739836e+134,
    1.6507955160908452e+136,
    1.4857159644817607e+138,
    1.3520015276784023e+140,
    1.24384140546413e+142,
    1.1567725070816409e+144,
    1.0873661566567424e+146,
    1.0329978488239052e+148,
    9.916779348709491e+149,
    9.619275968248206e+151,
    9.426890448883242e+153,
    9.33262154439441e+155,
    9.33262154439441e+157,
    9.425947759838354e+159,
    9.614466715035121e+161,
    9.902900716486175e+163,
    1.0299016745145622e+166,
    1.0813967582402903e+168,
    1.1462805637347078e+170,
    1.2265202031961373e+172,
    1.3246418194518284e+174,
    1.4438595832024928e+176,
    1.5882455415227421e+178,
    1.7629525510902437e+180,
    1.9745068572210728e+182,
    2.2311927486598123e+184,
    2.543559733472186e+186,
    2.925093693493014e+188,
    3.3931086844518965e+190,
    3.969937160808719e+192,
    4.6845258497542883e+194,
    5.574585761207603e+196,
    6.689502913449124e+198,
    8.09429852527344e+200,
    9.875044200833598e+202,
    1.2146304367025325e+205,
    1.5061417415111404e+207,
    1.8826771768889254e+209,
    2.372173242880046e+211,
    3.012660018457658e+213,
    3.8562048236258025e+215,
    4.9745042224772855e+217,
    6.466855489220472e+219,
    8.471580690878817e+221,
    1.118248651196004e+224,
    1.4872707060906852e+226,
    1.992942746161518e+228,
    2.6904727073180495e+230,
    3.659042881952547e+232,
    5.01288874827499e+234,
    6.917786472619486e+236,
    9.615723196941086e+238,
    1.346201247571752e+241,
    1.89814375907617e+243,
    2.6953641378881614e+245,
    3.8543707171800706e+247,
    5.550293832739301e+249,
    8.047926057471987e+251,
    1.17499720439091e+254,
    1.7272458904546376e+256,
    2.5563239178728637e+258,
    3.808922637630567e+260,
    5.7133839564458505e+262,
    8.627209774233235e+264,
    1.3113358856834518e+267,
    2.006343905095681e+269,
    3.089769613847349e+271,
    4.789142901463391e+273,
    7.47106292628289e+275,
    1.1729568794264138e+278,
    1.8532718694937338e+280,
    2.946702272495037e+282,
    4.714723635992059e+284,
    7.590705053947215e+286,
    1.2296942187394488e+289,
    2.0044015765453015e+291,
    3.2872185855342945e+293,
    5.423910666131586e+295,
    9.003691705778433e+297,
    1.5036165148649983e+300,
    2.526075744973197e+302,
    4.2690680090047027e+304,
    7.257415615307994e+306
  ];

  function gamma$1 (z) {

    // Define gamma specially for integral values
    if (z % 1 === 0) {
      if (z <= 0) {
        return Infinity
      }

      let res = INTEGER_FACTORIALS[Math.round(z - 1)];

      if (!res) {
        return Infinity
      }

      return res
    }

    if (z < 0.5) {
      return Math.PI / (Math.sin(Math.PI * z) * gamma$1(1 - z))
    } else {
      z -= 1;

      var x = LANCZOS_COEFFICIENTS[0];
      for (var i = 1; i < g + 2; i++) {
        x += LANCZOS_COEFFICIENTS[i] / (z + i);
      }

      var t = z + g + 0.5;
      return Math.sqrt(2 * Math.PI) * Math.pow(t, (z + 0.5)) * Math.exp(-t) * x
    }
  }

  function ln_gamma (z) {
    if (z < 0.5) {
      // Compute via reflection formula
      let reflected = ln_gamma(1 - z);

      return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - reflected
    } else {
      z -= 1;

      var x = LANCZOS_COEFFICIENTS[0];
      for (var i = 1; i < g + 2; i++) {
        x += LANCZOS_COEFFICIENTS[i] / (z + i);
      }

      var t = z + g + 0.5;

      return Math.log(2 * Math.PI) / 2 + Math.log(t) * (z + 0.5) - t + Math.log(x)
    }
  }

  function polygamma (m, z) {
    if (m % 1 !== 0 || m < 0) {
      return NaN
    }

    if (m === 0) {
      return digamma(z)
    }

    if (m === 1) {
      return trigamma(z)
    }

    let sign = (m % 2 === 0) ? -1 : 1;
    let numPoly = getPolygammaNumeratorPolynomial(m);

    if (z < 0.5) {
      if (z % 1 === 0)
        return Infinity

      // Reflection formula, see https://en.wikipedia.org/wiki/Polygamma_function#Reflection_relation
      // psi_m(z) = pi ^ (m+1) * numPoly(cos(pi z)) / (sin ^ (m+1) (pi z)) + (-1)^(m+1) psi_m(1-z)

      return -(Math.pow(Math.PI, m + 1) * numPoly.evaluate(Math.cos(Math.PI * z)) /
        (Math.pow(Math.sin(Math.PI * z), m+1)) + sign * polygamma(m, 1 - z))
    } else if (z < 8) {
      // Recurrence relation
      // psi_m(z) = psi_m(z+1) + (-1)^(m+1) * m! / z^(m+1)

      return polygamma(m, z+1) + sign * gamma$1(m + 1) / Math.pow(z, m+1)
    }

    // Series representation

    let sum = 0;
    for (let i = 0; i < 200; ++i) {
      sum += 1 / Math.pow(z + i, m + 1);
    }

    return sign * gamma$1(m + 1) * sum

  }

  const GREGORY_COEFFICIENTS = [
    1.0, 0.5, -0.08333333333333333, 0.041666666666666664, -0.02638888888888889, 0.01875, -0.014269179894179895, 0.01136739417989418, -0.00935653659611993, 0.00789255401234568, -0.006785849984634707, 0.005924056412337663, -0.005236693257950285, 0.004677498407042265, -0.004214952239005473, 0.003826899553211884, -0.0034973498453499175, 0.0032144964313235674, -0.0029694477154582097, 0.002755390299436716, -0.0025670225450072377, 0.0024001623785907204, -0.0022514701977588703, 0.0021182495272954456, -0.001998301255043453, 0.0018898154636786972, -0.0017912900780718936, 0.0017014689263700736, -0.0016192940490963672, 0.0015438685969283421, -0.0014744276890609623, 0.001410315320613454, -0.0013509659123128112, 0.0012958894558251668, -0.0012446594681088444, 0.0011969031579517945, -0.001152293347825886, 0.0011105417984181721, -0.001071393661516785, 0.0010346228462800521, -0.0010000281292566525, 0.0009674298734228264, -0.0009366672485567989, 0.0009075958663860963, -0.0008800857605298948, 0.000854019654366952, -0.0008292914703794421, 0.0008058050428513827, -0.0007834730024921167, 0.0007622158069590723, -0.0007419608956386516, 0.0007226419506180641, -0.0007041982487069233, 0.000686574091772996, -0.0006697183046421545, 0.0006535837914580035, -0.0006381271427651654, 0.0006233082867224927, -0.0006090901788092055, 0.0005954385251909118, -0.0005823215355902033, 0.0005697097020796109, -0.0005575756007007343, 0.0005458937132267388, -0.0005346402667379662, 0.0005237930889818988, -0.0005133314777471911, 0.0005032360827036401, -0.0004934887983513816, 0.00048407266688788627, -0.00047497178994440343, 0.00046617124826760925, -0.00045765702853009814, 0.00044941595654733894, -0.0004414356362607454, 0.0004337043939182513, -0.00042621122694664064, 0.00041894575706506086, -0.0004118981872376783, 0.0004050592621061756, -0.00039842023158052236, 0.0003919728172997837, -0.0003857091817042604, 0.00037962189948642086, -0.00037370393121133474, 0.0003679485989179907, -0.0003623495635312948, 0.0003569008039309683, -0.0003515965975382364, 0.0003464315022943173, -0.00034140033991647036, 0.0003364981803279027, -0.00033172032716728803, 0.00032706230429215997, -0.0003225198431980953, 0.000318088871282497, -0.000313765500888013, 0.00030954601906624203, -0.0003054268780074607, 0.00030140468608670396, -0.00029747619948069663, 0.0002936383143139141
  ];

  let PolygammaNumeratorPolynomials = [new SingleVariablePolynomial([0, 1])];

  let POLY1 = new SingleVariablePolynomial([0, 1]);
  let POLY2 = new SingleVariablePolynomial([-1, 0, 1]);

  function getPolygammaNumeratorPolynomial(n) {
    let poly = PolygammaNumeratorPolynomials[n];
    if (poly)
      return poly

    if (n > 10000)
      return new SingleVariablePolynomial([0])

    if (n > 20) {
      // to prevent stack overflow issues
      for (let i = 0; i < n; ++i) {
        getPolygammaNumeratorPolynomial(i);
      }
    }

    return PolygammaNumeratorPolynomials[n] =
      getPolygammaNumeratorPolynomial(n - 1).clone().multiplyScalar(-n).multiply(POLY1).add(
        getPolygammaNumeratorPolynomial(n - 1).derivative().multiply(POLY2)
      )
  }

  function digamma (z) {
    if (z < 0.5) {
      // psi(1-x) - psi(x) = pi cot(pi x)
      // psi(x) = psi(1-x) - pi cot (pi x)

      return digamma(1 - z) - Math.PI / Math.tan(Math.PI * z)
    } else if (z < 15) {
      // psi(x+1) = psi(x) + 1/x
      // psi(x) = psi(x+1) - 1/x

      let sum = 0;

      while (z < 15) {
        sum += 1 / z;

        z += 1;
      }

      return digamma(z) - sum
    }

    let egg = 1;
    let sum = Math.log(z);

    for (let n = 1; n < 15; ++n) {
      let coeff = Math.abs(GREGORY_COEFFICIENTS[n]);

      egg *= ((n-1) ? (n-1) : 1);
      egg /= z + n - 1;

      sum -= coeff * egg;
    }

    return sum
  }

  function trigamma(z) {
    if (z < 0.5) {
      if (z % 1 === 0) {
        return Infinity
      }

      // psi_1(1-z) + psi_1(z) = pi^2 / (sin^2 pi z)
      // psi_1(z) = pi^2 / (sin^2 pi z) - psi_1(1-z)

      return (Math.PI * Math.PI) / (Math.sin(Math.PI * z) ** 2) - trigamma(1-z)
    } else if (z < 20) {
      // psi_1(z+1) = psi_1(z) - 1/z^2
      // psi_1(z) = psi_1(z+1) + 1/z^2

      let sum = 0;

      while (z < 20) {
        sum += 1 / (z * z);

        z += 1;
      }

      return trigamma(z) + sum
    }

    return 1 / z + 1 / (2 * z**2) + 1 / (6 * z**3) - 1 / (30 * z**5) + 1/(42 * z**7) - 1/(30 * z**9) + 5/(66 * z**11) - 691 / (2730 * z**13) + 7 / (6 * z**15)
  }

  function factorial(z) {
    return gamma$1(z + 1)
  }

  // This file defines some common utilities that Grapheme uses!

  // A list of all extant Grapheme Universes
  const Universes = [];

  // this function takes in a variadic list of arguments and returns the first
  // one that's not undefined
  function select (opt1, ...opts) {
    if (opts.length === 0) { // if there are no other options, choose the first
      return opt1
    }
    if (opt1 === undefined) { // if the first option is undefined, proceed
      return select(...opts)
    }

    // If the first option is valid, return it
    return opt1
  }

  // Assert that a statement is true, and throw an error if it's not
  function assert (statement, error = 'Unknown error') {
    if (!statement) throw new Error(error)
  }

  // Check that an object is of a given type
  function checkType (obj, type) {
    assert(obj instanceof type, `Object must be instance of ${type}`);
  }

  // Check if two objects are... deeply equal
  // https://stackoverflow.com/questions/201183/how-to-determine-equality-for-two-javascript-objects
  function deepEquals (x, y) {
    const ok = Object.keys;
    const tx = typeof x;
    const ty = typeof y;
    return x && y && tx === 'object' && tx === ty ? (
      ok(x).length === ok(y).length &&
      ok(x).every((key) => deepEquals(x[key], y[key]))
    ) : (x === y)
  }

  // The following functions are self-explanatory.

  function isInteger (z) {
    return Number.isInteger(z) // didn't know about this lol
  }

  function isNonnegativeInteger (z) {
    return Number.isInteger(z) && z >= 0
  }

  function isPositiveInteger (z) {
    return Number.isInteger(z) && z > 0
  }

  function isNonpositiveInteger (z) {
    return Number.isInteger(z) && z <= 0
  }

  function isNegativeInteger (z) {
    return Number.isInteger(z) && z < 0
  }

  function isTypedArray (arr) {
    return !!(arr.buffer instanceof ArrayBuffer && arr.BYTES_PER_ELEMENT)
  }

  const isWorker = typeof window === "undefined";

  // https://stackoverflow.com/a/34749873
  function isObject (item) {
    return (item && typeof item === 'object' && !Array.isArray(item))
  }

  // This merges the characteristics of two objects, typically parameters
  // or styles or something like that
  // https://stackoverflow.com/a/34749873
  function mergeDeep (target, ...sources) {
    if (!sources.length) return target
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return mergeDeep(target, ...sources)
  }

  // Check if two numbers are within epsilon of each other
  function isApproxEqual (v, w, eps = 1e-5) {
    return Math.abs(v - w) < eps
  }

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

  // This function takes in a GL rendering context, a type of shader (fragment/vertex),
  // and the GLSL source code for that shader, then returns the compiled shader
  function createShaderFromSource (gl, shaderType, shaderSourceText) {
    // create an (empty) shader of the provided type
    const shader = gl.createShader(shaderType);

    // set the source of the shader to the provided source
    gl.shaderSource(shader, shaderSourceText);

    // compile the shader!! piquant
    gl.compileShader(shader);

    // get whether the shader compiled properly
    const succeeded = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (succeeded) {
      return shader // return it if it compiled properly
    }

    // delete the shader to free it from memory
    gl.deleteShader(shader);

    // throw an error with the details of why the compilation failed
    throw new Error(gl.getShaderInfoLog(shader))
  }

  // This function takes in a GL rendering context, the fragment shader, and the vertex shader,
  // and returns a compiled program.
  function createGLProgram (gl, vertShader, fragShader) {
    // create an (empty) GL program
    const program = gl.createProgram();

    // link the vertex shader
    gl.attachShader(program, vertShader);

    // link the fragment shader
    gl.attachShader(program, fragShader);

    // compile the program
    gl.linkProgram(program);

    // get whether the program compiled properly
    const succeeded = gl.getProgramParameter(program, gl.LINK_STATUS);

    if (succeeded) {
      return program
    }

    // delete the program to free it from memory
    gl.deleteProgram(program);

    // throw an error with the details of why the compilation failed
    throw new Error(gl.getProgramInfoLog(program))
  }

  function generateUUID () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const
        v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16)
    })
  }

  let empty_canvas = window.OffscreenCanvas ? new window.OffscreenCanvas(1, 1) : document.createElement('canvas');
  let empty_canvas_ctx = empty_canvas.getContext('2d');

  function measureText (text, font) {
    if (empty_canvas_ctx.font !== font) {
      empty_canvas_ctx.font = font;
    }
    let metrics = empty_canvas_ctx.measureText(text);

    return new BoundingBox(new Vec2(0, 0), metrics.width, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)
  }

  // Delete buffers with the given name from all Grapheme Universes
  function deleteBuffersNamed (bufferNames) {
    if (Array.isArray(bufferNames)) {
      for (let i = 0; i < bufferNames.length; ++i) {
        deleteBuffersNamed(bufferNames[i]);
      }
      return
    }

    Universes.forEach((universe) => {
      universe.glManager.deleteBuffer(bufferNames);
    });
  }

  let x$1 = 0;

  function getRenderID () {
    x$1 += 1;
    return x$1
  }

  function roundToCanvasPixel (x) {
    return Math.round(x - 0.5) + 0.5
  }

  function flattenVectors (arr) {
    let flattened = [];

    for (let i = 0; i < arr.length; ++i) {
      let item = arr[i];
      if (item.x !== undefined) {
        flattened.push(item.x);
        flattened.push(item.y);
      } else if (Array.isArray(item)) {
        flattened.push(item[0]);
        flattened.push(item[1]);
      } else {
        flattened.push(item);
      }
    }

    return flattened
  }

  function zeroFill (number, width) {
    width -= number.toString().length;
    if (width > 0) {
      return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number
    }
    return number + '' // always return a string
  }

  function removeUniverse (context) {
    let index = this.Universes.indexOf(context);

    if (index !== -1) {
      this.Universes.splice(index, 1);
    }
  }

  function beautifyFloat (f, prec = 12) {
    let strf = f.toFixed(prec);
    if (strf.includes('.')) {
      return strf.replace(/\.?0+$/g, '')
    } else {
      return strf
    }
  }

  function expressQuantityPP (quantity) {
    if (quantity > 0.01) {
      return beautifyFloat(quantity * 100, 6) + '%'
    } else if (quantity > 1e-6) {
      return beautifyFloat(quantity * 1e6, 6) + ' ppm'
    } else if (quantity > 1e-9) {
      return beautifyFloat(quantity * 1e9, 6) + ' ppb'
    } else if (quantity > 1e-12) {
      return beautifyFloat(quantity * 1e12, 6) + ' ppt'
    } else if (quantity > 1e-15) {
      return beautifyFloat(quantity * 1e12, 6) + ' ppq'
    } else {
      return '0'
    }
  }

  const gcd = function (a, b) {
    if (!b) {
      return a
    }

    return gcd(b, a % b)
  };

  const benchmark = function (callback, iterations = 100, output = console.log) {
    let start = performance.now();

    for (let i = 0; i < iterations; ++i) {
      callback(i);
    }

    let duration = performance.now() - start;

    output(`Function ${callback.name} took ${duration / iterations} ms per call.`);
  };

  function removeDuplicates(arr) {
    return [... new Set(arr)]
  }

  // Credit to https://github.com/gustf/js-levenshtein/blob/master/index.js
  const levenshtein = (function()
  {
    function _min(d0, d1, d2, bx, ay)
    {
      return d0 < d1 || d2 < d1
        ? d0 > d2
          ? d2 + 1
          : d0 + 1
        : bx === ay
          ? d1
          : d1 + 1;
    }

    return function(a, b)
    {
      if (a === b) {
        return 0;
      }

      if (a.length > b.length) {
        var tmp = a;
        a = b;
        b = tmp;
      }

      var la = a.length;
      var lb = b.length;

      while (la > 0 && (a.charCodeAt(la - 1) === b.charCodeAt(lb - 1))) {
        la--;
        lb--;
      }

      var offset = 0;

      while (offset < la && (a.charCodeAt(offset) === b.charCodeAt(offset))) {
        offset++;
      }

      la -= offset;
      lb -= offset;

      if (la === 0 || lb < 3) {
        return lb;
      }

      var x = 0;
      var y;
      var d0;
      var d1;
      var d2;
      var d3;
      var dd;
      var dy;
      var ay;
      var bx0;
      var bx1;
      var bx2;
      var bx3;

      var vector = [];

      for (y = 0; y < la; y++) {
        vector.push(y + 1);
        vector.push(a.charCodeAt(offset + y));
      }

      var len = vector.length - 1;

      for (; x < lb - 3;) {
        bx0 = b.charCodeAt(offset + (d0 = x));
        bx1 = b.charCodeAt(offset + (d1 = x + 1));
        bx2 = b.charCodeAt(offset + (d2 = x + 2));
        bx3 = b.charCodeAt(offset + (d3 = x + 3));
        dd = (x += 4);
        for (y = 0; y < len; y += 2) {
          dy = vector[y];
          ay = vector[y + 1];
          d0 = _min(dy, d0, d1, bx0, ay);
          d1 = _min(d0, d1, d2, bx1, ay);
          d2 = _min(d1, d2, d3, bx2, ay);
          dd = _min(d2, d3, dd, bx3, ay);
          vector[y] = dd;
          d3 = d2;
          d2 = d1;
          d1 = d0;
          d0 = dy;
        }
      }

      for (; x < lb;) {
        bx0 = b.charCodeAt(offset + (d0 = x));
        dd = ++x;
        for (y = 0; y < len; y += 2) {
          dy = vector[y];
          vector[y] = dd = _min(dy, d0, dd, bx0, vector[y + 1]);
          d0 = dy;
        }
      }

      return dd;
    };
  })();

  function getFunctionName() {
    return '$' + getRenderID()
  }

  function wait(ms) {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, ms);
    })
  }

  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const BINOMIAL_TABLE = new Float64Array([0, 0, 0.6931471805599453, 1.791759469228055, 3.1780538303479458, 4.787491742782046, 6.579251212010101, 8.525161361065415, 10.60460290274525, 12.801827480081469, 15.104412573075516, 17.502307845873887, 19.987214495661885, 22.552163853123425, 25.19122118273868, 27.89927138384089, 30.671860106080672, 33.50507345013689, 36.39544520803305, 39.339884187199495, 42.335616460753485, 45.38013889847691, 48.47118135183523, 51.60667556776438, 54.78472939811232, 58.00360522298052, 61.261701761002, 64.55753862700634, 67.88974313718154, 71.25703896716801, 74.65823634883016, 78.0922235533153, 81.55795945611504, 85.05446701758152, 88.58082754219768, 92.1361756036871, 95.7196945421432, 99.33061245478743, 102.96819861451381, 106.63176026064346, 110.32063971475739, 114.0342117814617, 117.77188139974507, 121.53308151543864, 125.3172711493569, 129.12393363912722, 132.95257503561632, 136.80272263732635, 140.67392364823425, 144.5657439463449, 148.47776695177302, 152.40959258449735, 156.3608363030788, 160.3311282166309, 164.32011226319517, 168.32744544842765,  172.3527971391628, 176.39584840699735, 180.45629141754378, 184.53382886144948, 188.6281734236716, 192.7390472878449, 196.86618167289, 201.00931639928152, 205.1681994826412, 209.34258675253685, 213.53224149456327, 217.73693411395422, 221.95644181913033, 226.1905483237276, 230.43904356577696, 234.70172344281826, 238.97838956183432, 243.2688490029827, 247.57291409618688, 251.8904022097232, 256.22113555000954, 260.5649409718632, 264.9216497985528, 269.2910976510198, 273.6731242856937, 278.0675734403661, 282.4742926876304, 286.893133295427, 291.3239500942703, 295.76660135076065, 300.22094864701415, 304.6868567656687, 309.1641935801469, 313.65282994987905, 318.1526396202093, 322.66349912672615, 327.1852877037752, 331.7178871969285, 336.26118197919845, 340.815058870799, 345.37940706226686, 349.95411804077025, 354.5390855194408, 359.1342053695754, 363.73937555556347]);
  const binomComputed = BINOMIAL_TABLE.length;

  function nCrFloat(n, k) {
    if (Number.isInteger(n) && Number.isInteger(k) && n >= 0 && k >= 0 && n < binomComputed && k < binomComputed)
      return Math.exp(BINOMIAL_TABLE[n] - BINOMIAL_TABLE[n-k] - BINOMIAL_TABLE[k]);
    else return Math.exp(ln_gamma(n) - ln_gamma(n - k) - ln_gamma(k))
  }

  function nCr(n, k) {
    let result = 1;

    for (let i = 1; i <= k; i++) {
      result *= (n + 1 - i) / i;
    }

    return result;
  }

  const eulerGamma = 0.57721566490153286060;

  var utils = /*#__PURE__*/Object.freeze({
    benchmark: benchmark,
    gcd: gcd,
    expressQuantityPP: expressQuantityPP,
    zeroFill: zeroFill,
    measureText: measureText,
    generateUUID: generateUUID,
    createShaderFromSource: createShaderFromSource,
    createGLProgram: createGLProgram,
    Universes: Universes,
    removeUniverse: removeUniverse,
    mod: mod,
    get dpr () { return dpr; },
    select: select,
    assert: assert,
    checkType: checkType,
    deepEquals: deepEquals,
    isInteger: isInteger,
    isNonnegativeInteger: isNonnegativeInteger,
    isNonpositiveInteger: isNonpositiveInteger,
    isNegativeInteger: isNegativeInteger,
    isPositiveInteger: isPositiveInteger,
    isTypedArray: isTypedArray,
    mergeDeep: mergeDeep,
    isApproxEqual: isApproxEqual,
    deleteBuffersNamed: deleteBuffersNamed,
    getRenderID: getRenderID,
    flattenVectors: flattenVectors,
    roundToCanvasPixel: roundToCanvasPixel,
    removeDuplicates: removeDuplicates,
    isWorker: isWorker,
    levenshtein: levenshtein,
    getFunctionName: getFunctionName,
    wait: wait,
    getRandomInt: getRandomInt,
    nCrFloat: nCrFloat,
    nCr: nCr,
    eulerGamma: eulerGamma
  });

  /**
   @class GLResourceManager stores GL resources on a per-context basis. This allows the
   separation of elements and their drawing buffers in a relatively complete way.
   It is given a gl context to operate on, and creates programs in manager.programs
   and buffers in manager.buffers. programs and buffers are simply key-value pairs
   which objects can create (and destroy) as they please.
   */
  class GLResourceManager {
    /**
     * Construct a GLResourceManager
     * @param gl {WebGLRenderingContext} WebGL context the manager will have dominion over
     */
    constructor (gl) {
      // WebGL rendering context
      this.gl = gl;

      // Compiled programs and created buffers
      this.programs = {};
      this.buffers = {};
    }

    /**
     * Compile a program and store it in this.programs
     * @param programName {string} Name of the program, used to identify the program
     * @param vertexShaderSource {string} Source code of the vertex shader
     * @param fragmentShaderSource {string} Source code of the fragment shader
     * @param vertexAttributeNames {Array} Array of vertex attribute names
     * @param uniformNames {Array} Array of uniform names
     */
    compileProgram (programName, vertexShaderSource, fragmentShaderSource,
                    vertexAttributeNames = [], uniformNames = []) {
      if (this.hasProgram(programName)) {
        // if this program name is already taken, delete the old one
        this.deleteProgram(programName);
      }

      const { gl } = this;

      // The actual gl program itself
      const glProgram = createGLProgram(gl,
        createShaderFromSource(gl, gl.VERTEX_SHADER, vertexShaderSource),
        createShaderFromSource(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));

      // pairs of uniform names and their respective locations
      const uniforms = {};
      for (let i = 0; i < uniformNames.length; ++i) {
        const uniformName = uniformNames[i];

        uniforms[uniformName] = gl.getUniformLocation(glProgram, uniformName);
      }

      // pairs of vertex attribute names and their respective locations
      const vertexAttribs = {};
      for (let i = 0; i < vertexAttributeNames.length; ++i) {
        const vertexAttribName = vertexAttributeNames[i];

        vertexAttribs[vertexAttribName] = gl.getAttribLocation(glProgram, vertexAttribName);
      }

      this.programs[programName] = {
        program: glProgram,
        uniforms,
        attribs: vertexAttribs
      };
    }

    /**
     * Create a buffer with a certain name, typically including a WebGLElement's id
     * @param bufferName {string} Name of the buffer
     */
    createBuffer (bufferName) {
      // If buffer already exists, return
      if (this.hasBuffer(bufferName)) return

      const { gl } = this;

      // Create a new buffer
      this.buffers[bufferName] = gl.createBuffer();
    }

    /**
     * Delete buffer with given name
     * @param bufferName {string} Name of the buffer
     */
    deleteBuffer (bufferName) {
      if (!this.hasBuffer(bufferName)) return

      const buffer = this.getBuffer(bufferName);
      const { gl } = this;

      // Delete the buffer from GL memory
      gl.deleteBuffer(buffer);
      delete this.buffers[bufferName];
    }

    /**
     * Delete a program
     * @param programName {string} Name of the program to be deleted
     */
    deleteProgram (programName) {
      if (!this.hasProgram(programName)) return

      const programInfo = this.programs[programName];
      this.gl.deleteProgram(programInfo.program);

      // Remove the key from this.programs
      delete this.programs[programName];
    }

    /**
     * Retrieve a buffer with a given name, and create it if it does not already exist
     * @param bufferName Name of the buffer
     * @returns {WebGLBuffer} Corresponding buffer
     */
    getBuffer (bufferName) {
      if (!this.hasBuffer(bufferName)) this.createBuffer(bufferName);
      return this.buffers[bufferName]
    }

    /**
     * Retrieve program from storage
     * @param programName {string} Name of the program
     * @returns {Object} Object of the form {program, uniforms, vertexAttribs}
     */
    getProgram (programName) {
      return this.programs[programName]
    }

    /**
     * Whether this manager has a buffer with a given name
     * @param bufferName Name of the buffer
     * @returns {boolean} Whether this manager has a buffer with that name
     */
    hasBuffer (bufferName) {
      return !!this.buffers[bufferName]
    }

    /**
     * Whether a program with programName exists
     * @param programName {string} Name of the program
     * @returns {boolean} Whether that program exists
     */
    hasProgram (programName) {
      return !!this.programs[programName]
    }
  }

  /** @class GraphemeUniverse Universe for plots to live in. Allows WebGL rendering, variables, etc. */
  class GraphemeUniverse {
    /**
     * Construct a new GraphemeUniverse.
     * @constructor
     */
    constructor () {
      // Add this to the list of all extant universes
      Universes.push(this);

      // List of canvases using this universe
      /** @private */ this.canvases = [];

      // Canvas to draw
      /** @private */ this.glCanvas = window.OffscreenCanvas ? new window.OffscreenCanvas(1, 1) : document.createElement('canvas');

      // gl context
      /** @public */ this.gl = this.glCanvas.getContext('webgl');

      // gl manager
      /** @public */ this.glManager = new GLResourceManager(this.gl);

      if (!this.gl) {
        throw new Error('Grapheme needs WebGL to run! Sorry.')
      }
    }

    /**
     * Set the size of the canvas to width and height. This is used internally; the user should never have to call it.
     * @param width {number} The width of the canvas.
     * @param height {number} The height of the canvas.
     * @private
     */
    _setSize (width, height) {
      const glCanvas = this.glCanvas;

      glCanvas.width = width;
      glCanvas.height = height;
    }

    /**
     * Add canvas to this universe
     * @param canvas {GraphemeCanvas} Canvas to add to this universe
     */
    add (canvas) {
      if (canvas.universe !== this) {
        throw new Error('Canvas already part of a universe')
      }
      if (this.isChild(canvas)) {
        throw new Error('Canvas is already added to this universe')
      }

      this.canvases.push(canvas);
    }

    /**
     * Clear the WebGL canvas for rendering.
     */
    clear () {
      let gl = this.gl;

      // Set the clear color to transparent black
      gl.clearColor(0, 0, 0, 0);

      // Clear the canvas
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    /**
     * Copy the contents of the WebGL canvas on top of the plot canvas
     * @param canvas {GraphemeCanvas}
     */
    copyToCanvas (canvas) {
      const ctx = canvas.ctx;

      // Set the canvas transform to identity (since this.glCanvas does not factor in the device pixel ratio)
      ctx.resetTransform();

      // Draw the glCanvas to the plot canvas with drawImage
      ctx.drawImage(this.glCanvas, 0, 0);

      // Reset the canvas transform
      canvas.resetCanvasCtxTransform();
    }

    /**
     * Destroy this universe and all of its canvases
     */
    destroy () {
      // Remove universe from list of universes handled by utils
      removeUniverse(this);

      // Destroy all child canvases
      this.canvases.forEach(canvas => canvas.destroy());
    }

    /**
     * Expand the canvas to fit the max dimensions of all governed canvases. Called every time a canvas is rendered, so it
     * ought to be fast.
     */
    expandToFit () {
      let maxWidth = 1;
      let maxHeight = 1;

      for (let i = 0; i < this.canvases.length; ++i) {
        let canvas = this.canvases[i];

        // Set max dims. Note we use canvasWidth/Height instead of width/height because glCanvas does not factor in dpr.
        if (canvas.canvasWidth > maxWidth) {
          maxWidth = canvas.canvasWidth;
        }
        if (canvas.canvasHeight > maxHeight) {
          maxHeight = canvas.canvasHeight;
        }
      }

      this._setSize(maxWidth, maxHeight);
    }

    /**
     * Whether canvas is a child of this universe
     * @param canvas Canvas to test
     * @returns {boolean} Whether canvas is a child
     */
    isChild (canvas) {
      return this.canvases.indexOf(canvas) !== -1
    }

    /**
     * Remove canvas from this universe
     * @param canvas Canvas to remove
     */
    remove (canvas) {
      let index = this.canvases.indexOf(canvas);

      if (index !== -1) {
        this.canvases.splice(index, 1);
      }
    }

    /**
     * Trigger an event on all child canvases
     * @param type {string} The type of the event
     * @param event {Object} The event to pass to canvases
     * @returns {boolean} Whether an event handler stopped propagation.
     */
    triggerEvent (type, event) {
      // Trigger event in all canvases
      for (let i = 0; i < this.canvases.length; ++i) {
        if (this.canvases[i].triggerEvent(type, event)) {
          // Stop if event stopped propagation
          return true
        }
      }

      return false
    }
  }

  // The DefaultUniverse is the default universe that plots use. Other universes can be used by creating them, then passing
  // them in the constructor to the plot. Because the number of WebGL contexts per page is limited to six, it's best to just
  // use the DefaultUniverse; an unlimited number of plots can use the same universe, and the number of Canvas2DRendering
  // contexts per page is not capped.
  const DefaultUniverse = new GraphemeUniverse();

  /** @class GraphemeElement A component of Grapheme that supports a update() function, which prepares it for the rendering
   * stage, and a render() function which renders the element to a GraphemeCanvas. It also has children, used for grouping
   * elements together. */
  class GraphemeElement {
    constructor ({
      precedence = 0,
      alwaysUpdate = true
    } = {}) {
      // Used to sort which element is drawn first. A lower precedence means it will be drawn first and appear on the bottom
      /** @public */ this.precedence = precedence;

      // The parent of this element
      /** @public */ this.parent = null;

      // The plot this element belongs to
      /** @public */ this.plot = null;

      // Whether update() needs to be called before render()
      /** @public */ this.needsUpdate = true;

      // Custom event listeners
      /** @private */ this.eventListeners = {};

      // Children of this element
      /** @public */ this.children = [];

      // Whether this element is visible
      /** @public */ this.visible = true;
    }

    /**
     * Append elements to this element as children
     * @param element {GraphemeElement} Element to add
     * @param elements Parameter pack, elements to add
     */
    add (element, ...elements) {
      // Make sure this operation is valid
      checkType(element, GraphemeElement);

      if (element.parent !== null)
        throw new Error('Element is already a child of some element.')

      if (this.hasChild(element, true))
        throw new Error('Element is already a child of this group.')

      // Set element parent and plot
      element.parent = this;
      element.setPlot(this.plot);

      // Add element to children
      this.children.push(element);

      // Potentially recurse
      if (elements.length > 0) {
        this.add(...elements);
      }
    }

    /**
     * Add event listener to this element
     * @param type {string} Event type to listen for
     * @param callback {UserDefinedFunction} UserDefinedFunction to call
     */
    addEventListener (type, callback) {
      const listenerArray = this.eventListeners[type];

      if (!listenerArray) {
        // If the array doesn't exist yet, create it
        this.eventListeners[type] = [callback];
      } else {
        listenerArray.push(callback);
      }
    }

    applyToChildren(func, recursive=true) {
      func(this);

      if (recursive) {
        this.children.forEach(child => child.applyToChildren(func, true));
      } else {
        this.children.forEach(func);
      }
    }

    /**
     * Destroy this element. Also, destroy all children of this element.
     */
    destroy () {
      // Destroy all children
      this.children.forEach((child) => child.destroy());

      // Remove this element from its parent
      if (this.parent)
        this.parent.remove(this);

      // Set plot to null (modifying all children as well)
      this.setPlot(null);
    }

    /**
     * Return whether element is a child, potentially not an immediate child, of this element
     * @param element {GraphemeElement} The element to check.
     * @param recursive {boolean} Whether to check all children, not just immediate children
     * @returns {boolean} Whether element is a child of this.
     */
    hasChild (element, recursive = true) {
      // If we should recurse, check if this has the child, then check all children
      if (recursive) {
        if (this.hasChild(element, false)) return true
        return this.children.some((child) => child.hasChild(element, recursive))
      }

      // If not recursive, check whether children includes element
      return this.children.includes(element)
    }

    /**
     * Return whether element is an immediate child of this element; in other words, whether this.children.includes(elem).
     * @param element {GraphemeElement} The element to check.
     * @returns {boolean} Whether the element is an immediate child.
     */
    isChild (element) {
      return this.hasChild(element, false)
    }

    markUpdate() {
      this.needsUpdate = true;
    }

    /**
     * Remove elements from this
     * @param element {GraphemeElement} Element to remove
     * @param elements Parameter pack, elements to remove
     */
    remove (element, ...elements) {
      checkType(element, GraphemeElement);

      if (this.hasChild(element, false)) {
        // if element is an immediate child, remove it
        // get index of the element
        const index = this.children.indexOf(element);

        // Remove it from this.children
        this.children.splice(index, 1);

        // Orphanize the element
        element.parent = null;
        element.setPlot(null);
      }

      // Deal with parameter pack
      if (elements.length > 0) {
        this.remove(...elements);
      }
    }

    /**
     * Remove all children from this. Optimized for removing all children by not requiring successive calls to
     * this.remove
     */
    removeAllChildren() {
      // Set parent/plot of all children to null
      this.children.forEach(child => {
        child.parent = null;
        child.setPlot(null);
      });

      // Empty children array
      this.children = [];
    }

    /**
     * Remove event listener from this element
     * @param type {string} Event type listened for
     * @param callback {UserDefinedFunction} Callback to remove
     */
    removeEventListener(type, callback) {
      const listenerArray = this.eventListeners[type];
      if (listenerArray) {
        // Find the callback in the list of listeners and remove it
        let index = listenerArray.indexOf(callback);
        if (index !== -1)
          listenerArray.splice(index, 1);
      }
    }

    /**
     * Render this element to a plot.
     * @param info The rendering info
     * @param info.ctx CanvasRenderingContext2D to draw to
     * @param info.plot The plot we are drawing onto
     * @param info.labelManager The LabelManager of the plot
     * @param info.beforeNormalRender The callback for elements that don't use WebGL.
     */
    render (info) {
      info.beforeNormalRender();

      // Render this element's children
      this.renderChildren(info);
    }

    /**
     * Render all the children of this element.
     * @param info The information to be passed to the children.
     */
    renderChildren(info) {
      // Sort children by precedence
      this.sortChildren();

      // Render all children
      this.children.forEach((child) => child.render(info));
    }

    /**
     * Set this.plot to the plot containing this element
     * @param plot {Plot2D} The plot to set it to
     */
    setPlot(plot) {
      this.plot = plot;

      // Set it for all children as well
      this.children.forEach(child => child.setPlot(plot));
    }

    /**
     * Sort the children of this GraphemeElement
     */
    sortChildren () {
      // Sort the children by their precedence value
      this.children.sort((x, y) => x.precedence - y.precedence);
    }

    /**
     * Trigger an event. If it returns true, some event listener returned true, which will stop the propagation of the event.
     * @param type The name of the event, e.g. "plotcoordschanged"
     * @param event The event itself, either a default event or a custom event.
     * @returns {boolean} Whether some event returned true.
     */
    triggerEvent (type, event) {
      this.sortChildren();

      // If child events should be triggered last, trigger all of this element's events first
      if (this.triggerChildEventsLast && this.eventListeners[type]) {
        let res = this.eventListeners[type].some(listener => listener(event));
        if (res)
          // Stop if event stopped propagation
          return true
      }

      // Trigger event in all children
      for (let i = 0; i < this.children.length; ++i) {
        if (this.children[i].triggerEvent(type, event)) {
          // Stop if event stopped propagation
          return true
        }
      }

      // If child events should not be triggered last, trigger all of this element's events first
      if (!this.triggerChildEventsLast && this.eventListeners[type]) {
        let res = this.eventListeners[type].some(listener => listener(event));
        if (res)
          // Stop if event stopped propagation
          return true
      }

      return false
    }

    /**
     * UserDefinedFunction called to update for rendering.
     */
    update () {
      this.needsUpdate = false;
    }

    /**
     * Update asynchronously. If this is not specially defined by derived classes, it defaults to just calling update() directly
     */
    updateAsync(info, progress=null) {
      if (this.updateTimeout)
        clearTimeout(this.updateTimeout);

      return new Promise((resolve, reject) => {
        this.needsUpdate = false;

        this.updateTimeout = setTimeout(() => {
          this.update(info);

          if (progress)
            progress(1);

          resolve("done");
        }, 0);
      })
    }
  }

  /** @class GraphemeGroup
   * Used semantically to group elements. All elements already support this.children.
   * */
  class GraphemeGroup extends GraphemeElement {
    constructor (params = {}) {
      super(params);
    }
  }

  /** @class LabelManager
   * Manage the labels of a domElement, meant to be the container div of a grapheme window.
   * Remove old labels and retrieve elements for reuse by labels. */
  class LabelManager {
    constructor (container) {
      // Pass it the dom element div for grapheme_window
      /** @public */ this.container = container;

      // Mapping from Label keys to {renderID: the last render ID, domElement: html element to use}
      /** @private */ this.labels = new Map();

      // The current render ID
      /** @private */ this.currentRenderID = -1;
    }

    /**
     * Remove labels with an old render ID.
     */
    removeOldLabels () {
      const labels = this.labels;

      labels.forEach((labelInfo, label) => {
        // Delete labels who don't have the correct render ID
        if (labelInfo.renderID !== this.currentRenderID) {
          labelInfo.domElement.remove();

          labels.delete(label);
        }
      });
    }

    /**
     * Get dom element corresponding to a given label.
     * @param label {BasicLabel}
     */
    getElement (label) {
      // Retrieve label info
      const labelInfo = this.labels.get(label);

      let element;

      if (!labelInfo) {
        // Create a div for the label to use
        element = document.createElement('div');
        element.classList.add('grapheme-label');

        this.container.appendChild(element);

        // Update label info
        this.labels.set(label, { renderID: this.currentRenderID, domElement: element });
      } else {
        element = labelInfo.domElement;

        // Update render ID
        labelInfo.renderID = this.currentRenderID;
      }

      return element
    }
  }

  /** @class GraphemeCanvas A viewable instance of Grapheme. Provides the information required for rendering to canvas,
   * as well as domElement, which is a canvas element to be added to the canvas. */
  class GraphemeCanvas extends GraphemeGroup {
    /**
     * Creates a GraphemeCanvas.
     * @constructor
     * @param universe {GraphemeUniverse} Universe this canvas will be a part of
     */
    constructor (universe=DefaultUniverse) {
      super();

      if (!(universe instanceof GraphemeUniverse))
        throw new Error("Given universe not instance of Grapheme.Universe")

      this.universe = universe;

      // Add this canvas to the given universe
      this.universe.add(this);

      // Element to be put into the webpage
      /** @public */ this.domElement = document.createElement('div');

      // The canvas of a GraphemeCanvas
      /** @private */ this.canvas = document.createElement('canvas');

      // Append the canvas to the dom element
      this.domElement.appendChild(this.canvas);

      // Enable CSS stuff
      this.canvas.classList.add('grapheme-canvas');
      this.domElement.classList.add('grapheme-window');

      // CanvasRenderingContext2D for this GraphemeCanvas
      /** @public */ this.ctx = this.canvas.getContext('2d');

      // If no context, throw an error
      if (!this.ctx)
        throw new Error("This browser doesn't support 2D canvas, which is required for Grapheme. Please get a competent browser.")

      // Label manager for LaTeX-enabled labels
      /** @private */ this.labelManager = new LabelManager(this.domElement);

      // Set the default size to 640 by 480 in CSS pixels
      this.setSize(640, 480);

      // When the device pixel ratio changes, resize the canvas accordingly
      this.addEventListener("dprchanged", () => {
        this.setSize(this.width, this.height);
      });

      // Object containing information to be passed to rendered elements defined by derived classes
      /** @protected */ this.extraInfo = {};

      // If we update asynchronously, how long to wait before forcing render. If less than 0, don't do this.
      this.forceRenderAfter = -1;

      // Whether on render() we update asynchronously
      this.updateAsynchronously = false;
    }

    /**
     * Get the width of the canvas in displayed pixels (not CSS pixels).
     * @returns {number} The width of the canvas.
     */
    get canvasWidth () {
      return this.canvas.width
    }

    /**
     * Set the width of the canvas in displayed pixels
     * @private
     * @param width The desired width of the canvas.
     */
    set canvasWidth (width) {
      // Round it to an integer and make sure it's in a reasonable range
      width = Math.round(width);
      assert(isPositiveInteger(width) && width < 16384, 'Canvas width must be in range [1,16383].');

      this.canvas.width = width;
    }

    /**
     * Get the height of the canvas in displayed pixels (not CSS pixels).
     * @returns {number} The height of the canvas.
     */
    get canvasHeight () {
      return this.canvas.height
    }

    /**
     * Set the height of the canvas in displayed pixels
     * @private
     * @param height The desired height of the canvas.
     */
    set canvasHeight (height) {
      height = Math.round(height);
      assert(isPositiveInteger(height) && height < 16384, 'Canvas height must be in range [1,16383].');

      this.canvas.height = height;
    }

    /**
     * Clear the canvas
     */
    clear () {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }

    /**
     * Destroy this GraphemeCanvas
     */
    destroy () {
      // Destroy the DOM element
      this.domElement.remove();

      // Remove this canvas from context
      this.universe.remove(this);

      // Destroy the elements too, if desired
      super.destroy();

      // Delete some references to allow memory to be freed immediately
      delete this.canvas;
      delete this.ctx;
      delete this.domElement;
      delete this.labelManager;
    }

    /**
     * Get a bounding box corresponding to the entire canvas
     * @returns {BoundingBox} The canvas bounding box
     */
    getCanvasBox () {
      return new BoundingBox(new Vec2(0, 0), this.width, this.height)
    }

    updateChildren(info, criteria) {
      this.applyToChildren((child) => {
          if (criteria(child)) {
            child.update(info);
          }
        }, true);
    }

    updateChildrenAsync(info, criteria) {
      let cows = [];

      this.applyToChildren((child) => {
        if (criteria(child)) {
          let async = child.updateAsync(info);
          cows.push(async);
        }
      }, true);

      return Promise.allSettled(cows)
    }

    /**
     * Render this GraphemeCanvas. Unlike other elements, it does not take in an "info" argument. This function
     * constructs the information needed to render the child elements.
     */
    render () {
      // Expand the universe's canvas to fit its windows, in case it is too small
      this.universe.expandToFit();

      const { labelManager, ctx } = this;
      const plot = this;

      // Whether the universe's canvas needs to be copied over
      let needsWebGLCopy = false;

      // UserDefinedFunction called before an element that doesn't use WebGL is rendered
      const beforeNormalRender = () => {
        if (needsWebGLCopy) {
          // Copy the universe's canvas over
          this.universe.copyToCanvas(this);

          // Mark the copy as done
          needsWebGLCopy = false;

          // Clear the universe's canvas for future renders
          this.universe.clear();
        }
      };

      const beforeWebGLRender = () => {
        // Set the viewport of the universe to the entire canvas. Note that the universe canvas is not
        // scaled with the device pixel ratio, so we must use this.canvasWidth/Height instead of this.width/height.
        this.universe.gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);

        // Mark that a copy is needed
        needsWebGLCopy = true;
      };

      // Set ID of this render. This is used to remove DOM elements from a previous render.
      labelManager.currentRenderID = getRenderID();

      const extraInfo = this.extraInfo ? this.extraInfo : {};

      // Info to be passed to rendered elements; the object passed as "info" in render(info).
      const info = {
        labelManager, // the label manager
        ctx, // The canvas context to draw to
        plot, // The plot we are drawing
        beforeNormalRender, // Callback for elements that don't use WebGL
        beforeWebGLRender, // Callback for elements that use WebGL
        universe: this.universe, // The universe to draw to (for WebGL stuff)
        ...extraInfo
      };

      const doRender = () => {

        // Clear the canvas
        this.clear();

        // Reset the rendering context transform
        this.resetCanvasCtxTransform();

        // If this class defines a beforeRender function, call it
        if (this.beforeRender)
          this.beforeRender(info);

        // Render all children
        super.render(info);

        // If this class defines an after render function, call it
        if (this.afterRender)
          this.afterRender(info);

        // Copy over the canvas if necessary
        beforeNormalRender();

        // Get rid of old labels

        labelManager.removeOldLabels();
      };

      if (this.updateAsynchronously) {
        let updatePromise;

        if (this.forceRenderAfter <= 0) {
          updatePromise = this.updateChildrenAsync(info, child => child.needsUpdate);
        } else {
          updatePromise = Promise.race([
            this.updateChildrenAsync(info, child => child.needsUpdate),
            wait(this.forceRenderAfter)
          ]);
        }

        updatePromise.then(doRender);
      } else {
        this.updateChildren(info, child => child.needsUpdate);

        doRender();
      }
    }

    /**
     * Resets the context's transform to scale up by the device pixel ratio
     */
    resetCanvasCtxTransform () {
      const ctx = this.ctx;

      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    }

    /**
     * Set the size of this GraphemeCanvas. Note that width and height are in CSS pixels.
     * @param width Desired width of canvas.
     * @param height Desired height of canvas.
     */
    setSize (width, height) {
      /** @public */ this.width = width;
      /** @public */ this.height = height;

      // Update the actual canvas's size, factoring in the device pixel ratio
      this.canvasWidth = this.width * dpr;
      this.canvasHeight = this.height * dpr;

      // Set the canvas's display using CSS
      const canvas = this.canvas;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Scale up by device pixel ratio
      this.resetCanvasCtxTransform();

      // Trigger the resize event to let elements know to update
      this.triggerEvent("resize", {width, height});
    }
  }

  /**
   * @class Keyboard Keeps track of the held keys on a keyboard and allows for listeners to be attached to said keys.
   */
  class Keyboard {
    /**
     * Construct a Keyboard tracker.
     * @constructor
     * @param domElement The element to attach listeners to
     */
    constructor (domElement) {
      // Element to attach listeners to
      /** @public */ this.element = domElement;

      // Dictionary of pressed keys
      /** @public */ this.keys = {};

      // listeners on the dom element
      /** @private */ this.domListeners = {};

      // user-defined event listeners
      /** @private */ this.eventListeners = {};

      // whether the keyboard is enabled
      this.enabled = true;
    }

    /**
     * Get whether the keyboard is enabled
     * @returns {boolean}
     */
    get enabled () {
      // Check whether there are any listeners
      return Object.keys(this.domListeners).length !== 0
    }

    /**
     * Enabled or disable the keyboard
     * @param value {boolean} Whether the keyboard should be enabled
     */
    set enabled (value) {
      if (value === this.enabled) {
        return
      }

      if (value) {
        // Enable the keyboard

        this.element.addEventListener('keydown', this.domListeners.keydown = (evt) => {
          this.onKeyDown(evt);
        });

        this.element.addEventListener('keyup', this.domListeners.keyup = (evt) => {
          this.onKeyUp(evt);
        });

        this.element.addEventListener('keypress', this.domListeners.keypress = (evt) => {
          this.onKeyPress(evt);
        });
      } else {
        // Disable the keyboard

        let listeners = this.domListeners;

        this.element.removeEventListener('keyup', listeners.keyup);
        this.element.removeEventListener('keydown', listeners.keydown);
        this.element.removeEventListener('keypress', listeners.keypress);
      }
    }

    /**
     * Add an event listener to this keyboard
     * @param name {string} The event to listen for
     * @param callback {UserDefinedFunction} The function to call
     */
    addEventListener (name, callback) {
      let listeners = this.eventListeners[name];

      if (!listeners) {
        listeners = this.eventListeners[name] = [];
      }

      listeners.push(callback);
    }

    /**
     * Detach event listeners if necessary and change the element to listen to
     * @param newElem Element to attach listeners to
     */
    changeElementTo (newElem) {
      let value = this.enabled;
      this.enabled = false;

      this.element = newElem;

      this.enabled = value;
    }

    /**
     * Callback for key down
     * @param evt {KeyboardEvent}
     * @private
     */
    onKeyDown (evt) {
      let key = evt.key;

      this.keys[key] = true;

      this.triggerEvent('keydown-' + key, evt);
    }

    /**
     * Callback for key press
     * @param evt {KeyboardEvent}
     * @private
     */
    onKeyPress (evt) {
      let key = evt.key;

      this.triggerEvent('keypress-' + key, evt);
    }

    /**
     * Callback for key up
     * @param evt {KeyboardEvent}
     * @private
     */
    onKeyUp (evt) {
      let key = evt.key;

      this.keys[key] = false;

      this.triggerEvent('keyup-' + key, evt);
    }

    /**
     * Remove an event listener from this keyboard
     * @param name {string} The event to listen for
     * @param callback {UserDefinedFunction} The callback function
     */
    removeEventListener (name, callback) {
      let listeners = this.eventListeners[name];

      let index = listeners.indexOf(callback);

      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }

    /**
     * Trigger an event.
     * @param name {string} Name of the event
     * @param event The event to pass to event listeners
     * @returns {boolean} Whether an event returned true
     */
    triggerEvent (name, event) {
      let listeners = this.eventListeners[name];

      return listeners && listeners.some(listener => listener(event))
    }
  }

  // List of events to listen for
  const mouseEvents = ['click', 'mousemove', 'mousedown', 'mouseup', 'wheel'];
  const touchEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
  const pointerEvents = ['pointerdown', 'pointerup', 'pointermove'];

  /**
   * @class InteractiveCanvas Canvas that supports interactivity events.
   * The callbacks are given above, and the events have the following structure:
   * {pos: new Vec2(... pixel coordinates of mouse event in canvas ...), rawEvent: ... raw mouse event ...}
   */
  class InteractiveCanvas extends GraphemeCanvas {
    /**
     * Construct an interactive canvas
     * @param universe {GraphemeUniverse} The universe to add this canvas to
     */
    constructor (universe = DefaultUniverse) {
      super(universe);

      // Used for tracking key presses
      this.keyboard = new Keyboard(window /* attach listeners to window */);

      // Used for listening to mouse/touch events
      this.interactivityListeners = {};

      // Whether interactivity is enabled
      this.interactivityEnabled = true;
    }

    /**
     * Get whether interactivity is enabled
     * @returns {boolean} Whether interactivity is enabled
     */
    get interactivityEnabled () {
      return Object.keys(this.interactivityListeners).length !== 0
    }

    /**
     * Set whether interactivity is enabled
     * @param enable Whether interactivity is enabled
     */
    set interactivityEnabled (enable) {
      if (enable) {
        // Add interactivity listeners for each mouse event
        mouseEvents.forEach(evtName => {
          let callback = (evt) => {
            // Calculate where the click is
            let rect = this.domElement.getBoundingClientRect();
            let pos = new Vec2(evt.clientX - rect.left, evt.clientY - rect.top);

            // Trigger the event
            this.triggerEvent(evtName, {
              pos,
              rawEvent: evt
            });

            // Prevent the default action e.g. scrolling
            evt.preventDefault();
          };

          // Store the listener
          this.interactivityListeners[evtName] = callback;

          // Add the listener
          this.domElement.addEventListener(evtName, callback);
        });

        // For each pointer event
        pointerEvents.forEach(evtName => {
          // Handle pointer events
          this.domElement.addEventListener(evtName,
            this.interactivityListeners[evtName] = (event) => this.handlePointer(event));
        });

        // For each touch event
        touchEvents.forEach(evtName => {
          // Handle touch events
          this.domElement.addEventListener(evtName,
            this.interactivityListeners[evtName] = (event) => this.handleTouch(event));
        });
      } else {
        // Remove all interactivity listeners
        [...mouseEvents, ...pointerEvents, ...touchEvents].forEach(evtName => {
          this.domElement.removeEventListener(evtName, this.interactivityListeners[evtName]);
        });

        this.interactivityListeners = {};
      }

      // Set whether the keyboard is enabled
      this.keyboard.enabled = enable;
    }

    /**
     * Handle pointer events.
     * @param event {PointerEvent} Pointer event
     * @todo
     */
    handlePointer (event) {
      if (event.type === 'pointerup') ; else if (event.type === 'pointermove') ;
    }

    /**
     * Handle touch events by converting them to corresponding mouse events
     * @param event {TouchEvent} The touch event.
     */
    handleTouch (event) {
      // Credit to https://stackoverflow.com/questions/1517924/javascript-mapping-touch-events-to-mouse-events

      let touches = event.changedTouches,
        first = touches[0],
        type = '';
      switch (event.type) {
        case 'touchstart':
          type = 'mousedown';
          break
        case 'touchmove':
          type = 'mousemove';
          break
        case 'touchend':
          type = 'mouseup';
          break
        default:
          return
      }

      let simulatedEvent = document.createEvent('MouseEvent');
      simulatedEvent.initMouseEvent(type, true, true, window, 1,
        first.screenX, first.screenY,
        first.clientX, first.clientY, false,
        false, false, false, 0, null);

      first.target.dispatchEvent(simulatedEvent);
      event.preventDefault();

      if (type === 'mouseup') {
        // also emit a click event

        simulatedEvent = document.createEvent('MouseEvent');
        simulatedEvent.initMouseEvent('click', true, true, window, 1,
          first.screenX, first.screenY,
          first.clientX, first.clientY, false,
          false, false, false, 0, null);

        first.target.dispatchEvent(simulatedEvent);
        event.preventDefault();
      }
    }
  }

  class Plot2DTransform {
    constructor(params={}) {
      this.box = params.box ? new BoundingBox(params.box) : new BoundingBox(new Vec2(0,0), this.width, this.height);
      this.coords = params.coords ? new BoundingBox(params.coords) : new BoundingBox(new Vec2(-5, -5), 10, 10);

      this.plot = params.plot;

      this.preserveAspectRatio = true;
      this.aspectRatio = 1; // Preserve the ratio coords.width / box.width

      this.allowDragging = true;
      this.allowScrolling = true;

      this.mouseDown = false;
      this.mouseAt = null;

      this.correctAspectRatio();
    }

    getPixelToPlotTransform() {
      // Returns the transform {x_m, x_b, y_m, y_b}

      return boundingBoxTransform.getReducedTransform(this.box, this.coords, false, true)
    }

    getPlotToPixelTransform() {
      // Returns the inverse transform of this.getPixelToPlotTransform()

      return boundingBoxTransform.getReducedTransform(this.coords, this.box, false, true)
    }

    correctAspectRatio() {
      if (this.preserveAspectRatio) {
        let cx = this.coords.cx, cy = this.coords.cy;

        this.coords.width = this.aspectRatio / this.box.height * this.box.width * this.coords.height;

        this._centerOn(new Vec2(cx, cy));

        if (this.plot)
          this.plot.triggerEvent("plotcoordschanged");
      }
    }

    getAspect() {
      // ratio between y axis and x axis

      return this.box.height / this.box.width * this.coords.width / this.coords.height
    }

    _centerOn(v) {
      this.coords.cx = v.x;
      this.coords.cy = v.y;
    }

    centerOn(v, ...args) {
      if (v instanceof Vec2) {
        this._centerOn(v);
      } else {
        this.centerOn(new Vec2(v, ...args));
      }

      this.correctAspectRatio();
      if (this.plot)
        this.plot.triggerEvent("plotcoordschanged");
    }

    translate(v, ...args) {
      if (v instanceof Vec2) {
        this.coords.top_left.add(v);

        if (this.plot)
          this.plot.triggerEvent("plotcoordschanged");
      } else {
        this.translate(new Vec2(v, ...args));
      }
    }

    zoomOn(factor, v = new Vec2(0,0), ...args) {
      if (this.allowScrolling) {
        let pixel_s = this.plotToPixel(v);

        this.coords.width *= factor;
        this.coords.height *= factor;

        this._internal_coincideDragPoints(v, pixel_s);
      }
    }

    _internal_coincideDragPoints(p1, p2) {
      this.translate(this.pixelToPlot(p2).subtract(p1).scale(-1));
    }

    _coincideDragPoints(p1, p2) {
      if (this.allowDragging) {
        this._internal_coincideDragPoints(p1, p2);
      }
    }

    pixelToPlotX(x) {
      return boundingBoxTransform.X(x, this.box, this.coords)
    }

    pixelToPlotY(y) {
      return boundingBoxTransform.Y(y, this.box, this.coords, true)
    }

    pixelToPlot(xy) {
      return new Vec2(boundingBoxTransform.XY(flattenVectors([xy]), this.box, this.coords, false, true))
    }

    plotToPixelX(x) {
      return boundingBoxTransform.X(x, this.coords, this.box)
    }

    plotToPixelY(y) {
      return boundingBoxTransform.Y(y, this.coords, this.box, true)
    }

    plotToPixel(xy) {
      return new Vec2(boundingBoxTransform.XY(flattenVectors([xy]), this.coords, this.box, false, true))
    }

    plotToPixelArr(arr) {
      let {x_m, x_b, y_m, y_b} = this.getPlotToPixelTransform();

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = x_m * arr[i] + x_b;
        arr[i+1] = y_m * arr[i+1] + y_b;
      }
    }

    pixelToPlotArr(arr) {
      let {x_m, x_b, y_m, y_b} = this.getPixelToPlotTransform();

      for (let i = 0; i < arr.length; i += 2) {
        arr[i] = x_m * arr[i] + x_b;
        arr[i+1] = y_m * arr[i+1] + y_b;
      }
    }

    clone() {
      let transform = new Plot2DTransform();
      transform.box = this.box.clone();
      transform.coords = this.coords.clone();
      return transform
    }
  }

  class SmartLabelManager {
    constructor(plot) {
      this.plot = plot;

      this.labelBoundingBoxes = [];
      this.labels = [];

      this.antipadding = 1000;
    }

    getIntersectingArea(bbox) {
      let area = 0;

      for (let box of this.labelBoundingBoxes) {
        area += intersectBoundingBoxes(bbox, box).area();
      }

      return area
    }

    addBox(box) {
      this.labelBoundingBoxes.push(box);
    }

    reset() {
      this.labelBoundingBoxes = [];
      this.labels = [];

      let box = this.plot.getCanvasBox();

      this.labelBoundingBoxes.push(new BoundingBox(box.top_left.clone().subtract(new Vec2(this.antipadding, this.antipadding)), this.antipadding * 2 + box.width, this.antipadding));
      this.labelBoundingBoxes.push(new BoundingBox(new Vec2(box.x1 - this.antipadding, box.y2), this.antipadding * 2 + box.width, this.antipadding));
      this.labelBoundingBoxes.push(new BoundingBox(box.top_left.clone().subtract(new Vec2(this.antipadding, 0)), this.antipadding, box.height));
      this.labelBoundingBoxes.push(new BoundingBox(new Vec2(box.x2, box.y1), this.antipadding, box.height));
    }

    drawBoundingBoxes(ctx) {
      ctx.fillStyle = "red";

      for (let box of this.labelBoundingBoxes) {
        ctx.fill(box.getPath());
      }
    }

    renderTopLabel(label) {
      this.labels.push(label);
    }

    renderLabels(info) {
      this.labels.forEach(label => label.render(info, true));
    }
  }

  /**
   * @class Plot2D
   * A generic plot in two dimensions, including a transform from plot coordinates to pixel coordinates.
   * Padding of the plot is determined by padding.top, padding.left, etc.. Interactivity like scrolling and dragging are
   * enabled via enableDrag and enableScroll.
   */
  class Plot2D extends InteractiveCanvas {
    /**
     * Construct a new Plot2D
     * @param universe {GraphemeUniverse} The universe that the plot will use
     * @constructor
     */
    constructor (universe = DefaultUniverse) {
      super(universe);

      // This is the plot of itself. Meta!
      this.plot = this;

      // The amount of padding on all sides of the plot, which determines the plotting box along with the canvas's size
      /** @public */ this.padding = {
        top: 40,
        right: 40,
        left: 40,
        bottom: 40
      };

      // The transformation from plot coordinates to pixels
      /** @public */ this.transform = new Plot2DTransform({ plot: this });

      // Whether to allow movement by dragging and scrolling
      /** @public */ this.enableDrag = true;
      /** @public */ this.enableScroll = true;

      // smartLabelManager, used to keep track of smart label positions and keep them from intersecting
      this.extraInfo.smartLabelManager = new SmartLabelManager(this);
      this.extraInfo.scissorPlot = (bool) => {
        const gl = this.universe.gl;
        const box = this.transform.box;

        if (bool) {
          gl.enable(gl.SCISSOR_TEST);
          gl.scissor(box.top_left.x * dpr,
            box.top_left.y * dpr,
            box.width * dpr,
            box.height * dpr);
        } else {
          gl.disable(gl.SCISSOR_TEST);
        }
      };

      // Add event listeners for mouse events
      this.addEventListener('mousedown', evt => this.mouseDown(evt));
      this.addEventListener('mouseup', evt => this.mouseUp(evt));
      this.addEventListener('mousemove', evt => this.mouseMove(evt));
      this.addEventListener('wheel', evt => this.wheel(evt));

      // When the plot changes in size, correct the transform aspect ratio
      this.addEventListener('resize', evt => {
        this.calculateTransform();
        this.transform.correctAspectRatio();
      });

      // Timeout to check for "plotcoordslingered"
      let timeout = -1;

      this.addEventListener('plotcoordschanged', evt => {
        clearTimeout(timeout);

        // If plot coords haven't changed in 500 milliseconds, fire plotcoordslingered event
        timeout = setTimeout(() => {
          this.triggerEvent('plotcoordslingered');
        }, 500);
      });

      // When the space key is pressed, trigger the plot's events before the children's events,
      // which means that all mouse events except for those attached to the plot won't be called.
      this.keyboard.addEventListener('keydown- ', () => {
        this.triggerChildEventsLast = true;
      });

      // When the space key is released, reset
      this.keyboard.addEventListener('keyup- ', () => {
        this.triggerChildEventsLast = false;
      });

      // Calculate the transform so it's valid from the start
      this.update();
    }

    /**
     * Called after each render, used to display labels that have indicated they want to be displayed on top
     * of everything. This overrides the usual precedence system.
     * @param info {Object} render info
     */
    afterRender (info) {
      this.extraInfo.smartLabelManager.renderLabels(info);
    }

    /**
     * Called before each render. We reset the smart label manager's tracking of label positions.
     * clearing the bounding boxes for the labels to take up.
     * @param info {Object} (unused)
     */
    beforeRender (info) {
      this.extraInfo.scissorPlot(false);

      this.extraInfo.smartLabelManager.reset();
    }

    /**
     * Calculate the plotting box, based on the canvas size and this.padding
     */
    calculateTransform () {
      this.transform.box = this.getCanvasBox().pad(this.padding);
    }

    /**
     * Handle mouse down events.
     * @param evt {Object} Event to handle
     * @returns {boolean} Returns true to stop propagation.
     */
    mouseDown (evt) {
      // Set where the mouse went down, in PLOT coordinates
      this.mouseDownPos = this.transform.pixelToPlot(evt.pos);
      return true
    }

    /**
     * Handle mouse move events.
     * @param evt {Object} Event to handle
     * @returns {boolean} Returns true to stop propagation.
     */
    mouseMove (evt) {
      // If the mouse is down
      if (this.mouseDownPos) {
        // If drag is enabled
        if (this.enableDrag)
        // Move the location of the event to the original mouse down position
        {
          this.transform._coincideDragPoints(this.mouseDownPos, evt.pos);
        }

        return true
      }
    }

    /**
     * Handle mouse up events.
     * @param evt {Object} Event to handle
     * @returns {boolean} Returns true to stop propagation.
     */
    mouseUp (evt) {
      // Mark the mouse as up
      this.mouseDownPos = null;
      return true
    }

    /**
     * Update function
     */
    update () {
      super.update();

      // Update the transform (the position of the plotting box)
      this.calculateTransform();
    }

    /**
     * Handle wheel events.
     * @param evt {Object} Event to handle
     * @returns {boolean} Returns true to stop propagation
     */
    wheel (evt) {
      let scrollY = evt.rawEvent.deltaY;

      if (this.enableScroll) {
        this.transform.zoomOn(Math.exp(scrollY / 1000), this.transform.pixelToPlot(evt.pos));
      }

      return true
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

  // all colors represented as object {r: x, g: x, b: x, a: x}. 0 <= r,g,b,a <= 255,
  // not necessarily integers
  function rgb (r, g, b) {
    return new Color({ r, g, b })
  }

  function rgba (r, g, b, a = 255) {
    return new Color({
      r, g, b, a
    })
  }

  const Colors = {
  get LIGHTSALMON() { return rgb(255,160,122); },
  get SALMON() { return rgb(250,128,114); },
  get DARKSALMON() { return rgb(233,150,122); },
  get LIGHTCORAL() { return rgb(240,128,128); },
  get INDIANRED() { return rgb(205,92,92); },
  get CRIMSON() { return rgb(220,20,60); },
  get FIREBRICK() { return rgb(178,34,34); },
  get RED() { return rgb(255,0,0); },
  get DARKRED() { return rgb(139,0,0); },
  get CORAL() { return rgb(255,127,80); },
  get TOMATO() { return rgb(255,99,71); },
  get ORANGERED() { return rgb(255,69,0); },
  get GOLD() { return rgb(255,215,0); },
  get ORANGE() { return rgb(255,165,0); },
  get DARKORANGE() { return rgb(255,140,0); },
  get LIGHTYELLOW() { return rgb(255,255,224); },
  get LEMONCHIFFON() { return rgb(255,250,205); },
  get LIGHTGOLDENRODYELLOW() { return rgb(250,250,210); },
  get PAPAYAWHIP() { return rgb(255,239,213); },
  get MOCCASIN() { return rgb(255,228,181); },
  get PEACHPUFF() { return rgb(255,218,185); },
  get PALEGOLDENROD() { return rgb(238,232,170); },
  get KHAKI() { return rgb(240,230,140); },
  get DARKKHAKI() { return rgb(189,183,107); },
  get YELLOW() { return rgb(255,255,0); },
  get LAWNGREEN() { return rgb(124,252,0); },
  get CHARTREUSE() { return rgb(127,255,0); },
  get LIMEGREEN() { return rgb(50,205,50); },
  get LIME() { return rgb(0, 255, 0); },
  get FORESTGREEN() { return rgb(34,139,34); },
  get GREEN() { return rgb(0,128,0); },
  get DARKGREEN() { return rgb(0,100,0); },
  get GREENYELLOW() { return rgb(173,255,47); },
  get YELLOWGREEN() { return rgb(154,205,50); },
  get SPRINGGREEN() { return rgb(0,255,127); },
  get MEDIUMSPRINGGREEN() { return rgb(0,250,154); },
  get LIGHTGREEN() { return rgb(144,238,144); },
  get PALEGREEN() { return rgb(152,251,152); },
  get DARKSEAGREEN() { return rgb(143,188,143); },
  get MEDIUMSEAGREEN() { return rgb(60,179,113); },
  get SEAGREEN() { return rgb(46,139,87); },
  get OLIVE() { return rgb(128,128,0); },
  get DARKOLIVEGREEN() { return rgb(85,107,47); },
  get OLIVEDRAB() { return rgb(107,142,35); },
  get LIGHTCYAN() { return rgb(224,255,255); },
  get CYAN() { return rgb(0,255,255); },
  get AQUA() { return rgb(0,255,255); },
  get AQUAMARINE() { return rgb(127,255,212); },
  get MEDIUMAQUAMARINE() { return rgb(102,205,170); },
  get PALETURQUOISE() { return rgb(175,238,238); },
  get TURQUOISE() { return rgb(64,224,208); },
  get MEDIUMTURQUOISE() { return rgb(72,209,204); },
  get DARKTURQUOISE() { return rgb(0,206,209); },
  get LIGHTSEAGREEN() { return rgb(32,178,170); },
  get CADETBLUE() { return rgb(95,158,160); },
  get DARKCYAN() { return rgb(0,139,139); },
  get TEAL() { return rgb(0,128,128); },
  get POWDERBLUE() { return rgb(176,224,230); },
  get LIGHTBLUE() { return rgb(173,216,230); },
  get LIGHTSKYBLUE() { return rgb(135,206,250); },
  get SKYBLUE() { return rgb(135,206,235); },
  get DEEPSKYBLUE() { return rgb(0,191,255); },
  get LIGHTSTEELBLUE() { return rgb(176,196,222); },
  get DODGERBLUE() { return rgb(30,144,255); },
  get CORNFLOWERBLUE() { return rgb(100,149,237); },
  get STEELBLUE() { return rgb(70,130,180); },
  get ROYALBLUE() { return rgb(65,105,225); },
  get BLUE() { return rgb(0,0,255); },
  get MEDIUMBLUE() { return rgb(0,0,205); },
  get DARKBLUE() { return rgb(0,0,139); },
  get NAVY() { return rgb(0,0,128); },
  get MIDNIGHTBLUE() { return rgb(25,25,112); },
  get MEDIUMSLATEBLUE() { return rgb(123,104,238); },
  get SLATEBLUE() { return rgb(106,90,205); },
  get DARKSLATEBLUE() { return rgb(72,61,139); },
  get LAVENDER() { return rgb(230,230,250); },
  get THISTLE() { return rgb(216,191,216); },
  get PLUM() { return rgb(221,160,221); },
  get VIOLET() { return rgb(238,130,238); },
  get ORCHID() { return rgb(218,112,214); },
  get FUCHSIA() { return rgb(255,0,255); },
  get MAGENTA() { return rgb(255,0,255); },
  get MEDIUMORCHID() { return rgb(186,85,211); },
  get MEDIUMPURPLE() { return rgb(147,112,219); },
  get BLUEVIOLET() { return rgb(138,43,226); },
  get DARKVIOLET() { return rgb(148,0,211); },
  get DARKORCHID() { return rgb(153,50,204); },
  get DARKMAGENTA() { return rgb(139,0,139); },
  get PURPLE() { return rgb(128,0,128); },
  get INDIGO() { return rgb(75,0,130); },
  get PINK() { return rgb(255,192,203); },
  get LIGHTPINK() { return rgb(255,182,193); },
  get HOTPINK() { return rgb(255,105,180); },
  get DEEPPINK() { return rgb(255,20,147); },
  get PALEVIOLETRED() { return rgb(219,112,147); },
  get MEDIUMVIOLETRED() { return rgb(199,21,133); },
  get WHITE() { return rgb(255,255,255); },
  get SNOW() { return rgb(255,250,250); },
  get HONEYDEW() { return rgb(240,255,240); },
  get MINTCREAM() { return rgb(245,255,250); },
  get AZURE() { return rgb(240,255,255); },
  get ALICEBLUE() { return rgb(240,248,255); },
  get GHOSTWHITE() { return rgb(248,248,255); },
  get WHITESMOKE() { return rgb(245,245,245); },
  get SEASHELL() { return rgb(255,245,238); },
  get BEIGE() { return rgb(245,245,220); },
  get OLDLACE() { return rgb(253,245,230); },
  get FLORALWHITE() { return rgb(255,250,240); },
  get IVORY() { return rgb(255,255,240); },
  get ANTIQUEWHITE() { return rgb(250,235,215); },
  get LINEN() { return rgb(250,240,230); },
  get LAVENDERBLUSH() { return rgb(255,240,245); },
  get MISTYROSE() { return rgb(255,228,225); },
  get GAINSBORO() { return rgb(220,220,220); },
  get LIGHTGRAY() { return rgb(211,211,211); },
  get SILVER() { return rgb(192,192,192); },
  get DARKGRAY() { return rgb(169,169,169); },
  get GRAY() { return rgb(128,128,128); },
  get DIMGRAY() { return rgb(105,105,105); },
  get LIGHTSLATEGRAY() { return rgb(119,136,153); },
  get SLATEGRAY() { return rgb(112,128,144); },
  get DARKSLATEGRAY() { return rgb(47,79,79); },
  get BLACK() { return rgb(0,0,0); },
  get CORNSILK() { return rgb(255,248,220); },
  get BLANCHEDALMOND() { return rgb(255,235,205); },
  get BISQUE() { return rgb(255,228,196); },
  get NAVAJOWHITE() { return rgb(255,222,173); },
  get WHEAT() { return rgb(245,222,179); },
  get BURLYWOOD() { return rgb(222,184,135); },
  get TAN() { return rgb(210,180,140); },
  get ROSYBROWN() { return rgb(188,143,143); },
  get SANDYBROWN() { return rgb(244,164,96); },
  get GOLDENROD() { return rgb(218,165,32); },
  get PERU() { return rgb(205,133,63); },
  get CHOCOLATE() { return rgb(210,105,30); },
  get SADDLEBROWN() { return rgb(139,69,19); },
  get SIENNA() { return rgb(160,82,45); },
  get BROWN() { return rgb(165,42,42); },
  get MAROON() { return rgb(128,0,0); },
  get RANDOM() { var keys = Object.keys(Colors); return Colors[keys[ keys.length * Math.random() << 0]]; }
  };

  const validDirs = ['C', 'N', 'S', 'W', 'E', 'NW', 'NE', 'SW', 'SE'];
  const labelClasses = validDirs.map(s => 'grapheme-label-' + s);

  class BasicLabelStyle {
    constructor (params = {}) {
      const {
        mode = 'latex', // valid values: latex, html
        dir = 'C' // valid values:
      } = params;

      this.mode = mode;
      this.dir = dir;
    }

    labelClass () {
      let dir = this.dir;

      if (!validDirs.includes(dir)) {
        dir = 'C';
      }

      return 'grapheme-label-' + this.dir
    }

    setLabelClass (labelElement) {
      const labelClass = this.labelClass();

      if (!labelElement.classList.contains(labelClass)) {
        labelElement.classList.remove(...labelClasses);
        labelElement.classList.add(labelClass);
      }
    }
  }

  class Label2DStyle extends BasicLabelStyle {
    // TODO: rotation
    constructor (params = {}) {
      const {
        color = new Color(),
        fontSize = 12,
        fontFamily = 'Helvetica',
        shadowColor = new Color(),
        shadowSize = 0
      } = params;
      super(params);

      this.mode = "2d";
      this.color = color;
      this.fontSize = fontSize;
      this.fontFamily = fontFamily;
      this.shadowColor = shadowColor;
      this.shadowSize = shadowSize;
    }

    drawText(ctx, text, x, y) {
      this.prepareContextTextStyle(ctx);

      if (this.shadowSize) {
        this.prepareContextShadow(ctx);
        ctx.strokeText(text, x, y);
      }

      this.prepareContextFill(ctx);
      ctx.fillText(text, x, y);

    }

    prepareContextTextAlignment (ctx) {
      let dir = this.dir;

      let textBaseline;
      let textAlign;

      if (!validDirs.includes(dir)) {
        dir = 'C';
      }

      // text align
      switch (dir) {
        case 'C': case 'N': case 'S':
          textAlign = 'center';
          break
        case 'NW': case 'W': case 'SW':
          textAlign = 'right';
          break
        case 'NE': case 'E': case 'SE':
          textAlign = 'left';
          break
      }

      // text baseline
      switch (dir) {
        case 'C': case 'W': case 'E':
          textBaseline = 'middle';
          break
        case 'SW': case 'S': case 'SE':
          textBaseline = 'top';
          break
        case 'NW': case 'N': case 'NE':
          textBaseline = 'bottom';
          break
      }

      ctx.textBaseline = textBaseline;
      ctx.textAlign = textAlign;
    }

    prepareContextTextStyle (ctx) {
      this.prepareContextTextAlignment(ctx);
      ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    }

    prepareContextShadow (ctx) {
      ctx.strokeStyle = this.shadowColor.hex();
      ctx.lineWidth = this.shadowSize * 2;
    }

    prepareContextFill (ctx) {
      ctx.fillStyle = this.color.hex();
    }
  }

  class LabelBase extends GraphemeElement {
    constructor (params = {}) {
      super(params);

      const {
        text = '',
        position = new Vec2(0, 0)
      } = params;

      this.text = text;
      this.position = position;
    }
  }

  // Creates html element of the form
  // <div class="label label-S" > this.text ... </div>
  class BasicLabel extends LabelBase {
    constructor (params = {}) {
      super(params);

      this.style = params.style ? params.style : new BasicLabelStyle(params.style || {});
    }

    render (info) {
      const { text, position } = this;
      const mode = this.style.mode;

      const labelElement = renderInfo.labelManager.getElement(this);

      this.style.setLabelClass(labelElement);

      labelElement.style.top = position.y + 'px';
      labelElement.style.left = position.x + 'px';

      const oldLatex = labelElement.getAttribute('latex-content');

      if (mode === 'latex') {
        // latex-content stores the latex to be rendered to this node, which means
        // that if it is equal to text, it does not need to be recomputed, only maybe
        // moved in some direction
        if (oldLatex !== text) {
          labelElement.setAttribute('latex-content', text);
          // eslint-disable-next-line no-undef
          katex.render(text, labelElement, { throwOnError: false });
        }
      } else {
        if (oldLatex) { labelElement.removeAttribute('latex-content'); }

        labelElement.innerHTML = text;
      }
    }
  }

  class Label2D extends LabelBase {
    constructor (params) {
      super(params);

      this.style = (params.style instanceof Label2DStyle) ? params.style : new Label2DStyle(params.style || {});
    }

    boundingBoxNaive() {
      return measureText(this.text, `${this.style.fontSize}px ${this.style.fontFamily}`)
    }

    render(info) {
      super.render(info);

      this.style.drawText(info.ctx, this.text, this.position.x, this.position.y);
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

    function fastAtan2(y, x) {
      y = +y;
      x = +x;

      var abs_x = 0.0, abs_y = 0.0, a = 0.0, s = 0.0, r = 0.0;

      abs_x = abs(x);
      abs_y = abs(y);

      a = abs_x < abs_y ? abs_x / abs_y : abs_y / abs_x;
      s = a * a;
      r = ((-0.0464964749 * s + 0.15931422) * s - 0.327622764) * s * a + a;

      if (abs_y > abs_x)
        r = 1.57079637 - r;
      if (x < 0.0)
        r = 3.14159265 - r;
      if (y < 0.0)
        r = -r;

      return r
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

      return +fastAtan2(y3 - y1, x3 - x1) - +fastAtan2(y2 - y1, x2 - x1)
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

  function _point_line_segment_compute (px, py, polyline_vertices, func) {
    if (polyline_vertices.length < 4) {
      return Infinity
    }

    let f64 = ASMViews.f64;
    let is_typed_array = polyline_vertices instanceof Float64Array || polyline_vertices instanceof Float32Array;

    if (polyline_vertices.length > BufferSizes.f64) {
      let i, j, min_distance = Infinity;

      for (i = 0; i < polyline_vertices.length / BufferSizes.f64 + 1; ++i) {
        let offset = i * BufferSizes.f64;
        let cnt = polyline_vertices.length - offset;
        let elem_c = Math.min(BufferSizes.f64, cnt);

        if (is_typed_array) {
          f64.set(polyline_vertices.subarray(offset, offset + elem_c));
        } else {
          for (j = 0; j < elem_c; ++j) {
            f64[j] = polyline_vertices[offset + j];
          }
        }

        let distance = func(px, py, 0, elem_c);

        if (distance < min_distance) {
          min_distance = distance;
        }
      }

      return min_distance
    }

    let i;

    if (is_typed_array) {
      ASMViews.f64.set(polyline_vertices);
    } else {
      for (i = 0; i < polyline_vertices.length; ++i) {
        ASMViews.f64[i] = polyline_vertices[i];
      }
    }

    return func(px, py, 0, polyline_vertices.length)
  }

  function pointLineSegmentMinDistance (px, py, polyline_vertices) {
    return _point_line_segment_compute(px, py, polyline_vertices, GeometryASMFunctions.point_line_segment_min_distance)
  }

  function pointLineSegmentClosest (px, py, polyline_vertices) {
    let distance = _point_line_segment_compute(px, py, polyline_vertices, GeometryASMFunctions.point_line_segment_min_closest);

    let x = ASMViews.f64[0];
    let y = ASMViews.f64[1];

    return {
      x,
      y,
      distance
    }
  }

  function anglesBetween (polyline_vertices, threshold = 0.03, aspectRatio = 1) {
    if (polyline_vertices.length >= BufferSizes.f64) {
      throw new Error('Polyline too numerous')
    }

    if (polyline_vertices instanceof Float32Array || polyline_vertices instanceof Float64Array) {
      ASMViews.f64.set(polyline_vertices);
    }

    let i;

    for (i = 0; i < polyline_vertices.length; ++i) {
      ASMViews.f64[i] = polyline_vertices[i];
    }

    GeometryASMFunctions.angles_between(0, i, threshold, aspectRatio);

    return ASMViews.f64.subarray(0, i / 2 - 2)
  }

  let heap = new ArrayBuffer(0x200000);
  let stdlib = {
    Math: Math,
    Float64Array: Float64Array,
    Infinity: Infinity
  };

  let ASMViews = { f64: new Float64Array(heap) };
  let BufferSizes = { f64: ASMViews.f64.length };
  var GeometryASMFunctions = GeometryASMFunctionsCreate(stdlib, null, heap);

  /**
   * Test whether three points are in counterclockwise order
   * @param x1
   * @param y1
   * @param x2
   * @param y2
   * @param x3
   * @param y3
   * @returns {boolean}
   */
  function pointsCCW (x1, y1, x2, y2, x3, y3) {
    return (y3 - y1) * (x2 - x1) > (y2 - y1) * (x3 - x1)
  }

  /**
   * Returns whether two line segments (namely, (x1, y1) -- (x2, y2) and (x3, y3) -- (x4, y4)) intersect
   * @param x1
   * @param y1
   * @param x2
   * @param y2
   * @param x3
   * @param y3
   * @param x4
   * @param y4
   */
  function lineSegmentIntersect (x1, y1, x2, y2, x3, y3, x4, y4) {
    return (pointsCCW(x1, y1, x3, y3, x4, y4) !== pointsCCW(x2, y2, x3, y3, x4, y4)) && (pointsCCW(x1, y1, x2, y2, x3, y3) !== pointsCCW(x1, y1, x2, y2, x4, y4))
  }

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

  class PolylineBase extends GraphemeElement {
    constructor (params = {}) {
      super(params);

      let {
        pen,
        vertices = []
      } = params;

      if (!(pen instanceof Pen)) {
        pen = new Pen(pen || {});
      }

      this.pen = pen;
      this.vertices = vertices;
    }
  }


  class PolylineElement extends PolylineBase {
    constructor (params = {}) {
      super(params);

      this.mainPath = null;
    }

    update () {
      super.update();
      const path = new Path2D();
      this.mainPath = path;

      let vertices = this.vertices;

      if (this.vertices[0] && (this.vertices[0].x || Array.isArray(this.vertices[0]))) {
        vertices = flattenVectors(vertices);
      }

      // Nothing to draw
      if (vertices.length < 4) {
        return
      }

      const coordinateCount = vertices.length;

      let x2 = NaN;
      let x3 = NaN;

      let y2 = NaN;
      let y3 = NaN;

      for (let i = 0; i <= coordinateCount; i += 2) {
        // [x1, y1] = previous vertex (p1), [x2, y2] = current (p2), [x3, y3] = next (p3)
        // If any of these is NaN, that vertex is considered undefined
        const x1 = x2;
        x2 = x3;
        x3 = (i === coordinateCount) ? NaN : vertices[i];
        y2 = y3;
        y3 = (i === coordinateCount) ? NaN : vertices[i + 1];

        if (i === 0) continue

        const isStartingEndcap = Number.isNaN(x1);

        if (isStartingEndcap) {
          path.moveTo(x2, y2);
        } else {
          path.lineTo(x2, y2);
        }
      }
    }

    isClick(point) {
      return this.distanceFrom(point) < Math.max(this.pen.thickness / 2, 2)
    }

    distanceFrom(point) {
      return pointLineSegmentMinDistance(point.x, point.y, this.vertices)
    }

    closestTo(point) {
      return pointLineSegmentClosest(point.x, point.y, this.vertices)
    }

    render (info) {
      super.render(info);

      if (!this.pen.visible || !this.mainPath)
        return

      const ctx = info.ctx;

      this.pen.prepareContext(ctx);

      ctx.stroke(this.mainPath);
    }
  }

  const desiredDemarcationSeparation = 50;

  // Array of potential demarcations [a,b], where the small demarcations are spaced every b * 10^n and the big ones are spaced every a * 10^n
  const StandardDemarcations = [[1, 0.2], [1, 0.25], [2, 0.5]];

  function get_demarcation(start, end, distance) {

    let lowestError = Infinity;
    let bestDemarcation;
    let dist = end - start;

    let desiredDemarcationCount = distance / desiredDemarcationSeparation;
    let desiredDemarcationSize = dist / desiredDemarcationCount;

    for (let demarcation of StandardDemarcations) {
      let a = demarcation[0];
      let b = demarcation[1];

      let power = Math.round(Math.log10(desiredDemarcationSize / b));
      let minorSize = 10 ** power * b;

      let err = Math.abs(desiredDemarcationSize - minorSize);
      if (err < lowestError) {
        lowestError = err;
        bestDemarcation = {power, major: a, minor: b};
      }
    }

    return bestDemarcation
  }

  function* demarcate(start, end, demarcation) {
    let modulus = demarcation.major / demarcation.minor;

    let factor = 10 ** demarcation.power * demarcation.minor;

    let start_i = Math.ceil(start / factor);
    let end_i = Math.ceil(end / factor);

    for (let i = start_i; i < end_i; ++i) {
      let pos = factor * i;

      if (pos === 0) {
        yield {pos, type: "axis"};
      } else if (i % modulus === 0) {
        yield {pos, type: "major"};
      } else {
        yield {pos, type: "minor"};
      }
    }
  }

  const GridlineStrategizers = {
    Standard: function* (start1, end1, distance1, start2, end2, distance2) {
      let eggRatio = (end1 - start1) / (end2 - start2) * distance2 / distance1;
      let forceSameDemarcations = Math.abs(eggRatio - 1) < 0.3;

      let demarcationX = get_demarcation(start1, end1, distance1);

      let demarcationY;
      if (forceSameDemarcations) {
        demarcationY = demarcationX;
      } else {
        demarcationY = get_demarcation(start2, end2, distance2);
      }

      for (let x_marker of demarcate(start1, end1, demarcationX)) {
        yield Object.assign(x_marker, {dir: 'x'});
      }

      for (let y_marker of demarcate(start2, end2, demarcationY)) {
        yield Object.assign(y_marker, {dir: 'y'});
      }
    }
  };

  const directionPrecedence = ["N", "S", "W", "E", "SW", "SE", "NW", "NE"];

  /**
   * Label which automatically figures out where to be placed to have the label shown well.
   */
  class SmartLabel extends Label2D {
    constructor(params={}) {
      super(params);

      this.objectBox = null;
      this.forceDir = null;
      this.renderTop = true;
    }

    computeAnchorPoint(dir) {
      const box = this.objectBox;

      let y = 0;
      let x = 0;

      switch (dir) {
        case "W": case "E":
          y = 1;
          break
        case "NW": case "NE": case "N":
          y = 0;
          break
        case "SW": case "SE": case "S":
          y = 2;
          break
      }
      switch (dir) {
        case "NW": case "W": case "SW":
          x = 0;
          break
        case "N": case "S":
          x = 1;
          break
        case "NE": case "E": case "SE":
          x = 2;
          break
      }

      let pos_x = box.x1 + box.width * x / 2;
      let pos_y = box.y1 + box.height * y / 2;

      return {pos: new Vec2(pos_x, pos_y), reference_x: x, reference_y: y, pos_x, pos_y}
    }

    computeTranslatedBoundingBox(bbox, dir) {
      if (!this.objectBox)
        return

      let bboxc = bbox.clone();

      let anchorInfo = this.computeAnchorPoint(dir);

      let x = 0, y = 0;

      switch (anchorInfo.reference_x) {
        case 0:
          x = anchorInfo.pos_x - bbox.width;
          break
        case 1:
          x = anchorInfo.pos_x - bbox.width / 2;
          break
        case 2:
          x = anchorInfo.pos_x;
          break
      }

      switch (anchorInfo.reference_y) {
        case 0:
          y = anchorInfo.pos_y - bbox.height;
          break
        case 1:
          y = anchorInfo.pos_y - bbox.height / 2;
          break
        case 2:
          y = anchorInfo.pos_y;
          break
      }

      bboxc.top_left = new Vec2(x, y);

      return bboxc
    }

    render(info, force=false) {

      if (!this.objectBox)
        return

      const smartLabelManager = info.smartLabelManager;

      if (this.renderTop && !force) {
        smartLabelManager.renderTopLabel(this);
        return
      }

      let bbox = this.boundingBoxNaive();


      let dir = this.forceDir;
      const sS = this.style.shadowSize;

      if (!this.forceDir) {
        let min_area = Infinity;

        if (smartLabelManager && !this.forceDir) {
          for (let direction of directionPrecedence) {
            let bbox_computed = this.computeTranslatedBoundingBox(bbox, direction);

            let area = smartLabelManager.getIntersectingArea(bbox_computed);

            if (area <= min_area) {
              dir = direction;
              min_area = area;
            }
          }
        }
      }

      let computed = this.computeTranslatedBoundingBox(bbox, dir).pad({
        top: -sS,
        bottom: -sS,
        left: -sS,
        right: -sS
      });

      let anchor_info = this.computeAnchorPoint(dir);

      this.style.dir = dir;
      this.position = new Vec2(anchor_info.pos_x, anchor_info.pos_y);

      smartLabelManager.addBox(computed);

      super.render(info);
    }
  }

  /* Unicode characters for exponent signs */
  const exponent_reference = {
    '-': String.fromCharCode(8315),
    '0': String.fromCharCode(8304),
    '1': String.fromCharCode(185),
    '2': String.fromCharCode(178),
    '3': String.fromCharCode(179),
    '4': String.fromCharCode(8308),
    '5': String.fromCharCode(8309),
    '6': String.fromCharCode(8310),
    '7': String.fromCharCode(8311),
    '8': String.fromCharCode(8312),
    '9': String.fromCharCode(8313)
  };

  /* Convert a digit into its exponent form */
  function convert_char(c) {
    return exponent_reference[c];
  }

  /* Convert an integer into its exponent form (of Unicode characters) */
  function exponentify(integer) {
    let stringi = integer + '';
    let out = '';

    for (let i = 0; i < stringi.length; ++i) {
      out += convert_char(stringi[i]);
    }

    return out;
  }

  // Credit: https://stackoverflow.com/a/20439411
  /* Turns a float into a pretty float by removing dumb floating point things */
  function beautifyFloat$1(f, prec=12) {
    let strf = f.toFixed(prec);
    if (strf.includes('.')) {
      return strf.replace(/\.?0+$/g,'');
    } else {
      return strf;
    }
  }

  function isApproxEqual$1(v, w, eps=1e-5) {
    return Math.abs(v - w) < eps;
  }

  const CDOT = String.fromCharCode(183);

  const StandardLabelFunction = x => {
    if (x === 0) return "0"; // special case
    else if (Math.abs(x) < 1e5 && Math.abs(x) > 1e-5)
      // non-extreme floats displayed normally
      return beautifyFloat$1(x);
    else {
      // scientific notation for the very fat and very small!

      let exponent = Math.floor(Math.log10(Math.abs(x)));
      let mantissa = x / (10 ** exponent);

      let prefix = (isApproxEqual$1(mantissa, 1) ? '' :
        (beautifyFloat$1(mantissa, 8) + CDOT));
      let exponent_suffix = "10" + exponentify(exponent);

      return prefix + exponent_suffix;
    }
  };

  /*
   * @class Gridlines A set of gridlines for a Plot2D
   */
  class Gridlines extends GraphemeElement {
    constructor(params={}) {
      super(params);

      this.strategizer = GridlineStrategizers.Standard;
      this.label_function = StandardLabelFunction;

      this.label_positions = ["dynamic"];
      this.label_types = ["axis", "major"];
      this.label_style = new Label2DStyle({fontSize: 14, shadowSize: 3, shadowColor: Colors.WHITE});
      this.label_padding = 5;

      this._labels = [];

      this.pens = {
        "axis": new Pen({thickness: 3}),
        "major": new Pen({thickness: 1}),
        "minor": new Pen({thickness: 0.5}),
        "box": new Pen({thickness: 2})
      };

      this._polylines = {};

      this.addEventListener("plotcoordschanged", () => this.markUpdate());
    }

    updateAsync(info) {
      this.update(info);
    }

    update(info) {
      super.update();

      let transform = this.plot.transform;
      let plotCoords = transform.coords;
      let plotBox = transform.box;

      this._labels = [];

      const markers = this.strategizer(plotCoords.x1, plotCoords.x2, plotBox.width, plotCoords.y1, plotCoords.y2, plotBox.height);

      let polylines = this._polylines = {};
      let computed_label_styles = {};

      let label_padding = this.label_padding;

      const addLabel = (marker_pos, style, position) => {
        let label = new Label2D({style, text: this.label_function(marker_pos), position});

        this._labels.push(label);
      };

      const getLabelStyle = (name, construct) => {
        if (computed_label_styles[name]) {
          return computed_label_styles[name]
        } else {
          let label_style = computed_label_styles[name] = new Label2DStyle(this.label_style);

          construct(label_style);
          return label_style
        }
      };

      const dynamic = this.label_positions.includes("dynamic");

      for (let marker of markers) {
        if (marker.dir === 'x') {
          let polyline = polylines[marker.type];

          if (!polyline)
            polyline = polylines[marker.type] = new PolylineElement({ pen: this.pens[marker.type] });

          let x_coord = roundToCanvasPixel(transform.plotToPixelX(marker.pos));
          let sy = plotBox.y1, ey = plotBox.y2;

          polyline.vertices.push(x_coord, sy, x_coord, ey, NaN, NaN);

          if (this.label_types.includes(marker.type)) {
            let axisPosition = transform.plotToPixelY(0);
            let axisInRange = (transform.box.y1 <= axisPosition && axisPosition <= transform.box.y2);
            let axis = this.label_positions.includes("axis") || (dynamic && axisInRange);

            let top = this.label_positions.includes("top");
            let bottom = this.label_positions.includes("bottom");
            let top_in = this.label_positions.includes("top-in") || (dynamic && axisPosition < transform.box.y1);
            let bottom_in = this.label_positions.includes("bottom-in") || (dynamic && axisPosition > transform.box.y2);

            if (top) {
              let style = getLabelStyle("top", (style) => style.dir = "N");

              addLabel(marker.pos, style, new Vec2(x_coord, sy - label_padding));
            }

            if (bottom) {
              let style = getLabelStyle("bottom", (style) => style.dir = "S");

              addLabel(marker.pos, style, new Vec2(x_coord, ey + label_padding));
            }

            if (bottom_in) {
              let style_name = "bottom-" + marker.type;

              let style = getLabelStyle(style_name, (style) => {
                style.dir = (marker.type === "axis") ? "NW" : "N";
              });

              addLabel(marker.pos, style, new Vec2(x_coord - ((marker.type === "axis") ? label_padding : 0), ey - label_padding));
            }

            if (top_in) {
              let style_name = "top-" + marker.type;

              let style = getLabelStyle(style_name, (style) => {
                style.dir = (marker.type === "axis") ? "SW" : "S";
              });

              addLabel(marker.pos, style, new Vec2(x_coord - ((marker.type === "axis") ? label_padding : 0), sy + label_padding));
            }

            if (axis && axisInRange) {
              let style_name = "x-axis-" + marker.type;

              let style = getLabelStyle(style_name, (style) => {
                style.dir = (marker.type === "axis") ? "SW" : "S";
              });

              addLabel(marker.pos, style, new Vec2(x_coord - ((marker.type === "axis") ? label_padding : 0), axisPosition + label_padding));
            }
          }
        } else if (marker.dir === 'y') {
          let polyline = polylines[marker.type];

          if (!polyline) {
            polyline = polylines[marker.type] = new PolylineElement({pen: this.pens[marker.type]});
          }

          let y_coord = roundToCanvasPixel(transform.plotToPixelY(marker.pos));
          let sx = plotBox.x1, ex = plotBox.x2;

          polyline.vertices.push(sx, y_coord, ex, y_coord, NaN, NaN);

          if (this.label_types.includes(marker.type)) {
            let axisPosition = transform.plotToPixelX(0);
            let axisInRange = (transform.box.x1 <= axisPosition && axisPosition <= transform.box.x2);
            let axis = this.label_positions.includes("axis") || (dynamic && axisInRange);

            let left = this.label_positions.includes("left");
            let right = this.label_positions.includes("right");
            let left_in = this.label_positions.includes("left-in") || (dynamic && axisPosition < transform.box.x1);
            let right_in = this.label_positions.includes("right-in") || (dynamic && axisPosition > transform.box.x2);

            if (left) {
              let style = getLabelStyle("left", (style) => style.dir = "W");

              addLabel(marker.pos, style, new Vec2(sx - label_padding, y_coord));
            }

            if (right) {
              let style = getLabelStyle("right", (style) => style.dir = "E");

              addLabel(marker.pos, style, new Vec2(ex + label_padding, y_coord));
            }

            if (left_in) {
              let style_name = "left-" + marker.type;

              let style = getLabelStyle(style_name, (style) => {
                style.dir = (marker.type === "axis") ? "SE" : "E";
              });

              addLabel(marker.pos, style, new Vec2(sx + label_padding, y_coord + ((marker.type === "axis") ? label_padding : 0)));
            }

            if (right_in) {
              let style_name = "right-" + marker.type;

              let style = getLabelStyle(style_name, (style) => {
                style.dir = (marker.type === "axis") ? "SW" : "W";
              });

              addLabel(marker.pos, style, new Vec2(ex - label_padding, y_coord + ((marker.type === "axis") ? label_padding : 0)));
            }

            if (axis && axisInRange) {
              let style_name = "y-axis-" + marker.type;

              let style = getLabelStyle(style_name, (style) => {
                style.dir = (marker.type === "axis") ? "SW" : "W";
              });

              addLabel(marker.pos, style, new Vec2(axisPosition - label_padding, y_coord + ((marker.type === "axis") ? label_padding : 0)));
            }
          }
        }
      }

      if (this.pens["box"]) {
        polylines["box"] = new PolylineElement({vertices: plotBox.getBoxVertices(), pen: this.pens["box"]});
      }

      for (let key in polylines) {
        polylines[key].update(info);
      }
    }

    render(info) {
      super.render(info);

      for (let key in this._polylines) {
        if (this._polylines.hasOwnProperty(key)) {

          this._polylines[key].render(info);
        }
      }

      for (let label of this._labels) {
        label.render(info);
      }
    }
  }

  class ConwaysGameOfLifeElement extends GraphemeElement {
    constructor(params={}) {
      super(params);

      const {
        size = {
          x: 200,
          y: 200
        }
      } = params;

      this.setSize(size.x, size.y);
    }

    setSize(x, y) {
      this.cells = new Uint8Array(x * y);
      this.width = x;
      this.height = y;
    }

    setCell(x, y, value) {
      this.cells[x*this.height+y] = value;
    }

    tickGame() {
      const cells = this.cells;

      if (!this.new_cells) {
        this.new_cells = new Uint8Array(this.width * this.height);
      }

      let new_cells = this.new_cells;
      new_cells.set(cells);

      for (let i = 0; i < this.width; ++i) {
        for (let j = 0; j < this.height; ++j) {
          let neighborCount = 0;

          for (let x = -1; x <= 1; ++x) {
            if (i+x < 0 || i+x >= this.width) {
              continue
            }

            for (let y = -1; y <= 1; ++y) {
              if ((x === 0 && y === 0) || (j+y < 0 || j+y >= this.height)) {
                continue
              }

              if (cells[(x+i) * this.height + (y+j)]) {
                neighborCount++;
              }
            }
          }

          if (neighborCount === 3) {
            new_cells[i * this.height + j] = 1;
          } else if (neighborCount < 2) {
            new_cells[i * this.height + j] = 0;
          } else if (neighborCount > 3) {
            new_cells[i * this.height + j] = 0;
          }
        }
      }

      this.cells.set(new_cells);
    }

    render(info) {
      super.render(info);

      const ctx = info.ctx;

      let simpleTransform = this.plot.transform.getPlotToPixelTransform();

      let {x_m, y_m, x_b, y_b} = simpleTransform;

      ctx.fillStyle="green";

      ctx.save();
      this.plot.transform.box.clip(ctx);

      for (let i = 0; i < this.width; ++i) {
        let offset = i * this.height;
        for (let j = 0; j < this.height; ++j) {
          let cell = this.cells[offset + j];

          if (cell) {
            ctx.fillRect(x_m * i + x_b, y_m * j + y_b, x_m, y_m);
          }
        }
      }

      ctx.restore();
    }
  }

  function fastHypot(x, y) {
    return Math.sqrt(x * x + y * y)
  }

  const MAX_VERTICES = 1e7;

  /**
   * Convert a polyline into another polyline, but with dashes.
   * @param vertices {Array} The vertices of the polyline.
   * @param pen {Pen} The polyline's pen
   * @param box {BoundingBox}
   * @returns {Array}
   */
  function* getDashedPolyline(vertices, pen, box, chunkSize=256000) {
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

    let chunkPos = 0;

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

      chunkPos++;
      generateDashes(intersect[0], intersect[1], intersect[2], intersect[3]);

      chunkPos++;

      if (chunkPos >= chunkSize) {
        yield i / vertices.length;

        chunkPos = 0;
      }

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

  function nextPowerOfTwo (x) {
    return 2 ** Math.ceil(Math.log2(x))
  }

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
    let generator = asyncCalculatePolylineVertices(vertices, pen, box);

    while (true) {
      let ret = generator.next();

      if (ret.done)
        return ret.value
    }
  }

  function* asyncCalculatePolylineVertices(vertices, pen, box) {
    if (pen.dashPattern.length === 0) {
      // No dashes to draw
      let generator = convertTriangleStrip(vertices, pen);

      while (true) {
        let ret = generator.next();

        if (ret.done)
          return ret.value
        else
          yield ret.value;
      }
    } else {
      let gen1 = getDashedPolyline(vertices, pen, box);
      let ret;

      while (true) {
        ret = gen1.next();

        if (ret.done)
          break
        else
          yield ret.value / 2;
      }

      let gen2 = convertTriangleStrip(ret.value, pen);

      while (true) {
        let ret = gen2.next();

        if (ret.done)
          return ret.value
        else
          yield ret.value / 2 + 0.5;
      }
    }
  }

  function* convertTriangleStrip(vertices, pen, chunkSize=256000) {
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
    let chunkPos = 0;

    for (let i = 0; i < origVertexCount; ++i) {
      chunkPos++;

      if (chunkPos >= chunkSize) {
        yield i / origVertexCount;

        chunkPos = 0;
      }

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

  /**
   * @class WebGLElement An element that supports WebGL rendering.
   */
  class WebGLElement extends GraphemeElement {
    /**
     * Construct a new WebGLElement
     * @param params Parameters
     */
    constructor (params = {}) {
      super(params);

      // id used for things like WebGL buffers
      /** @protected */ this.id = generateUUID();
    }

    /**
     *
     * @param info {Object} The render info
     * @param info.beforeWebGLRender {UserDefinedFunction} Prepare the universe for WebGL drawing
     */
    render (info) {
      // Call beforeWebGLRender()
      info.beforeWebGLRender();

      // Sort this element's children. We don't want to call super.render() because that will run beforeNormalRender
      this.sortChildren();

      // Render all children
      this.children.forEach(child => child.render(info));
    }
  }

  // this vertex shader is used for basic 2d geometries
  const vertexShaderSource = `// set the float precision of the shader to medium precision
precision mediump float;
// a vector containing the 2D position of the vertex
attribute vec2 v_position;
uniform vec2 xy_scale;
vec2 displace = vec2(-1, 1);
void main() {
  // set the vertex's resultant position
  gl_Position = vec4(v_position * xy_scale + displace, 0, 1);
}`;

  const fragmentShaderSource = `// set the float precision of the shader to medium precision
precision mediump float;
// vec4 containing the color of the line to be drawn
uniform vec4 line_color;
void main() {
  gl_FragColor = line_color;
}`;

  class Simple2DWebGLGeometry extends WebGLElement {
    constructor(params={}) {
      super(params);

      this.color = new Color();

      this.glVertices = null;

      this.renderMode = "triangles"; // allowed values: points, line_strip, line_loop, lines, triangle_strip, triangle_fan, triangles
      this.needsBufferCopy = true;
    }

    get glVertices() {
      return this.vertices
    }

    set glVertices(verts) {
      this.vertices = verts;

      this.needsBufferCopy = true;
    }

    render(info) {
      if (!this.visible || !this.glVertices || this.glVertices.length === 0)
        return

      super.render(info);

      const glManager = info.universe.glManager;
      const gl = info.universe.gl;

      let program = glManager.getProgram('simple-2d-geometry');

      if (!program) {
        glManager.compileProgram('simple-2d-geometry', vertexShaderSource, fragmentShaderSource, ['v_position'], ['line_color', 'xy_scale']);
        program = glManager.getProgram('simple-2d-geometry');
      }

      let buffer = glManager.getBuffer(this.id);

      let vertices = this.glVertices;
      let vertexCount = this.glVertexCount ? this.glVertexCount : vertices.length / 2;

      // tell webgl to start using the gridline program
      gl.useProgram(program.program);
      // bind our webgl buffer to gl.ARRAY_BUFFER access point
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

      let color = this.color;
      // set the vec4 at colorLocation to (r, g, b, a)
      // divided by 255 because webgl likes [0.0, 1.0]
      gl.uniform4f(program.uniforms.line_color, color.r / 255, color.g / 255, color.b / 255, color.a / 255);
      gl.uniform2f(program.uniforms.xy_scale,
        2 / info.plot.width,
        -2 / info.plot.height);

      // copy our vertex data to the GPU
      if (this.needsBufferCopy) {
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW /* means we will rewrite the data often */);

        this.needsBufferCopy = false;
      }

      // enable the vertices location attribute to be used in the program
      gl.enableVertexAttribArray(program.attribs.v_position);
      // tell it that the width of vertices is 2 (since it's x,y), that it's floats,
      // that it shouldn't normalize floats, and something i don't understand
      gl.vertexAttribPointer(program.attribs.v_position, 2, gl.FLOAT, false, 0, 0);

      let renderMode = 0;

      switch (this.renderMode) {
        case "points":
          renderMode = gl.POINTS;
          break
        case "line_strip":
          renderMode = gl.LINE_STRIP;
          break
        case "line_loop":
          renderMode = gl.LINE_LOOP;
          break
        case "lines":
          renderMode = gl.LINES;
          break
        case "triangle_strip":
          renderMode = gl.TRIANGLE_STRIP;
          break
        case "triangle_fan":
          renderMode = gl.TRIANGLE_FAN;
          break
        case "triangles":
          renderMode = gl.TRIANGLES;
          break
      }

      // draw the vertices
      gl.drawArrays(renderMode, 0, vertexCount);
    }

    destroy () {
      deleteBuffersNamed(this.id);
    }
  }

  // polyline primitive in Cartesian coordinates
  // has thickness, vertex information, and color stuff
  class WebGLPolyline extends GraphemeElement {
    constructor (params = {}) {
      super(params);

      this.vertices = params.vertices ? params.vertices : []; // x,y values in pixel space
      this.pen = params.pen ? params.pen : new Pen();

      this.geometry = new Simple2DWebGLGeometry();
    }

    _calculateTriangles (box) {
      let result = calculatePolylineVertices(this.vertices, this.pen, box);

      this.geometry.glVertices = result.glVertices;
    }

    _calculateNativeLines (box) {
      let vertices = this.vertices;

      if (this.pen.dashPattern.length !== 0) {
        vertices = getDashedPolyline(vertices, this.pen, box);
      }

      let glVertices = new Float32Array(vertices.length);

      if (Array.isArray(vertices)) {
        for (let i = 0; i < vertices.length; ++i) {
          glVertices[i] = vertices[i];
        }
      } else {
        glVertices.set(vertices);
      }

      this.geometry.glVertices = glVertices;
    }

    updateAsync(progress) {

    }

    update (info) {
      super.update();

      let box, thickness = this.pen.thickness;

      if (info) {
        box = info.plot.getCanvasBox().pad({
          left: -thickness,
          right: -thickness,
          top: -thickness,
          bottom: -thickness
        });
      } else {
        // ANNOYING! This should never be the case these days
        box = new BoundingBox(new Vec2(0, 0), 8192, 8192).pad({
          left: -thickness,
          right: -thickness,
          top: -thickness,
          bottom: -thickness
        });
      }

      if (this.pen.useNative) {
        // use native LINE_STRIP for extreme speed
        this._calculateNativeLines(box);
      } else {

        this._calculateTriangles(box);
      }

      this.geometry.needsBufferCopy = true;
    }

    isClick (point) {
      return this.distanceFrom(point) < Math.max(this.pen.thickness / 2, 2)
    }

    distanceFrom (point) {
      return pointLineSegmentMinDistance(point.x, point.y, this.vertices)
    }

    closestTo (point) {
      return pointLineSegmentClosest(point.x, point.y, this.vertices)
    }

    render (info) {
      super.render(info);

      this.geometry.color = this.pen.color;

      if (this.pen.useNative) {
        this.geometry.renderMode = "line_strip";
      } else {
        this.geometry.renderMode = "triangle_strip";
      }

      this.geometry.render(info);
    }

    destroy () {
      this.geometry.destroy();
    }
  }

  class TreeElement extends GraphemeElement {
    constructor(params={}) {
      super(params);

      this.root = null;

      this.pen = new Pen();

      this.polyline = new WebGLPolyline({pen: this.pen});

      this.label_style = new Label2DStyle({shadowSize: 5, shadowColor: Colors.WHITE});
      this.getTextOfNode = (node) => {
        return node.getText()
      };

      this.vertices = [];
      this.labels = [];
    }

    update(info) {
      super.update();

      this.vertices = [];
      this.labels = [];

      let flattened_nodes = [];
      let node_positions = [];

      this.root.applyAll((child, depth) => {
        if (!flattened_nodes[depth]) {
          flattened_nodes[depth] = [];
        }

        let flat_array = flattened_nodes[depth];
        flat_array.push(child);
      });

      for (let depth = 0; depth < flattened_nodes.length; ++depth) {
        let nodes = flattened_nodes[depth];

        node_positions[depth] = nodes.map((node, i) => {
          let x = (i - nodes.length / 2);
          let y = -depth;

          return new Vec2(x, y)
        });
      }

      function getNodePosition(node) {
        for (let depth = 0; depth < flattened_nodes.length; ++depth) {
          let nodes = flattened_nodes[depth];

          for (let i = 0; i < nodes.length; ++i) {
            if (nodes[i] === node) {
              return node_positions[depth][i]
            }
          }
        }
      }

      for (let depth = 0; depth < flattened_nodes.length; ++depth) {
        let nodes = flattened_nodes[depth];
        let positions = node_positions[depth];

        nodes.forEach((node, i) => {
          let parentPos = getNodePosition(node.parent);

          if (parentPos)
            this.vertices.push(positions[i].x, positions[i].y, parentPos.x, parentPos.y, NaN, NaN);

          this.labels.push(new Label2D({
            style: this.label_style,
            text: this.getTextOfNode(node),
            position: this.plot.transform.plotToPixel(positions[i])
          }));
        });
      }

      const polyline = this.polyline;

      polyline.vertices = this.vertices;

      this.plot.transform.plotToPixelArr(polyline.vertices);

      polyline.update(info);

    }

    render(info) {
      super.render(info);

      this.polyline.render(info);

      this.labels.forEach(label => label.render(info));
    }
  }

  // Interactive event names
  const listenerKeys = ['click', 'mousemove', 'mousedown', 'mouseup', 'wheel'];

  /** @class InteractiveElement An element which takes up space in a plot and supports an "isClick" function.
   * Used exclusively for 2D plots (3D plots will have a raycasting system).
   */
  class InteractiveElement extends GraphemeElement {
    /**
     * Construct an InteractiveElement
     * @param params {Object}
     * @param params.interactivityEnabled {boolean} Whether interactivity is enabled
     * @param params.precedence See base class.
     * @param params.alwaysUpdate See base class.
     */
    constructor (params = {}) {
      super(params);

      const {
        interactivityEnabled = false
      } = params;

      this.interactivityEnabled = interactivityEnabled;
      this.interactivityListeners = {};
    }

    /**
     * Get whether interactivity is enabled
     * @returns {boolean} Whether interactivity is enabled
     */
    get interactivityEnabled () {
      return this.interactivityListeners && Object.keys(this.interactivityListeners).length !== 0
    }

    /**
     * Set whether interactivity is enabled.
     * @param value {boolean}
     */
    set interactivityEnabled (value) {
      if (this.interactivityEnabled === value) {
        return
      }

      let listeners = this.interactivityListeners;

      if (value) {
        // Enable interactivity

        // Warn if the element is added to a non-interactive canvas
        if (this.plot && !(this.plot instanceof InteractiveCanvas)) {
          console.warn('Interactive element in a non-interactive canvas');
        }

        // The position on the canvas of where the mouse was pressed. null if the mouse is not currently pressed.
        let mouseDownPos = null;

        // Whether the previous mousemove was on the element
        let prevIsClick = false;

        listenerKeys.forEach(key => {
          let callback = (evt) => {
            // Elide mouse moves
            if (key === 'mousemove' && !this._hasMouseMoveInteractivityListeners() && !mouseDownPos) {
              return
            }

            let eventPos = evt.pos;

            // Whether the event occurred on this element
            let isClick = this.isClick(eventPos);

            // Whether to stop propagation
            let stopPropagation = false;

            // Trigger mouse on and mouse off events
            if (isClick && !prevIsClick) {
              if (this.triggerEvent('interactive-mouseon', evt)) {
                stopPropagation = true;
              }
            } else if (!isClick && prevIsClick) {
              if (this.triggerEvent('interactive-mouseoff', evt)) {
                stopPropagation = true;
              }
            }

            // Set whether the previous mouse move is on the element
            if (key === 'mousemove' && isClick) {
              prevIsClick = true;
            } else if (key === 'mousemove' && !isClick) {
              prevIsClick = false;
            }

            if (isClick) {
              if (this.triggerEvent('interactive-' + key, evt)) {
                stopPropagation = true;
              }
            }

            // Trigger drag events
            if (key === 'mousemove') {
              if (mouseDownPos) {
                // return to allow the prevention of propagation
                if (this.triggerEvent('interactive-drag', { start: mouseDownPos, ...evt })) {
                  stopPropagation = true;
                }
              }
            } else if (key === 'mousedown' && isClick) {
              // Set the position of the mouse
              mouseDownPos = eventPos;
            } else if (key === 'mouseup') {
              // Prevent the mouse from
              mouseDownPos = null;
            }

            return stopPropagation
          };

          this.addEventListener(key, callback);
          listeners[key] = callback;
        });

      } else {
        // Disable interactivity
        for (let key in this.interactivityListeners) {
          if (this.interactivityListeners.hasOwnProperty(key)) {
            this.removeEventListener(key, listeners[key]);
          }
        }

        this.interactivityListeners = {};
      }
    }

    /**
     * Whether this element has interactivity listeners to fire when the mouse moves and is not pressed down. Used
     * internally to elide calls to isClick when the element would do nothing even if it returned true.
     * @returns {boolean}
     * @private
     */
    _hasMouseMoveInteractivityListeners () {
      const listeners = this.interactivityListeners;

      return !!(listeners['interactive-mouseon'] || listeners['interactive-mouseoff'] || listeners['interactivity-mousemove'])
    }

    /**
     * Derived classes need to define this function
     * @param position
     */
    isClick (position) {
      throw new Error("isClick unimplemented for InteractiveElement")
    }
  }

  let MAX_DEPTH = 10;
  let MAX_POINTS = 1e6;

  // TODO: Stop this function from making too many points
  function adaptively_sample_1d(start, end, func, initialPoints=500,
    aspectRatio = 1, yRes = 0, maxDepth=MAX_DEPTH,
    angle_threshold=0.1, depth=0,
    includeEndpoints=true, ptCount=0) {
    if (depth > maxDepth || start === undefined || end === undefined || isNaN(start) || isNaN(end))
      return new Float64Array([NaN, NaN])

    let vertices = sample_1d(start, end, func, initialPoints, includeEndpoints);

    let angles = new Float32Array(anglesBetween(vertices, angle_threshold, aspectRatio));

    let final_vertices = new Float64Array(16);
    let index = 0;
    let maxSize = final_vertices.length - 2;

    function expandArray(size=-1) {
      let newArr = new Float64Array((size === -1) ? final_vertices.length * 2 : size);
      newArr.set(final_vertices);

      final_vertices = newArr;

      maxSize = final_vertices.length - 2;
    }

    function addVertex(x, y) {
      if (index > maxSize) {
        expandArray();
      }

      final_vertices[index++] = x;
      final_vertices[index++] = y;
    }

    function addVertices(arr) {
      let totalLen = index + arr.length;

      if (totalLen >= final_vertices.length) {
        expandArray(nextPowerOfTwo(totalLen));
      }

      final_vertices.set(arr, index);
      index += arr.length;
    }

    for (let i = 0; i < vertices.length; i += 2) {
      let angle_i = i / 2;

      if (angles[angle_i] === 3 || angles[angle_i - 1] === 3) { //&& Math.abs(vertices[i+1] - vertices[i+3]) > yRes / 2) {
        let vs = adaptively_sample_1d(vertices[i], vertices[i + 2], func, 3, aspectRatio, yRes, maxDepth, angle_threshold, depth + 1, true, ptCount);

        addVertices(vs);

        if (index > MAX_POINTS)
          return final_vertices.subarray(0, index)
      } else {
        addVertex(vertices[i], vertices[i+1]);
      }
    }

    return final_vertices.subarray(0, index)
  }

  function sample_1d(start, end, func, points=500, includeEndpoints=true) {
    let vertices = [];

    for (let i = 1 - includeEndpoints; i <= points - (1 - includeEndpoints); ++i) {
      let x = start + i * (end - start) / points;
      vertices.push(x, func(x));
    }

    return vertices
  }

  function find_roots(start, end, func, derivative, initialPoints = 500, iterations=10, accuracy=0.001) {
    let res = (end - start) / initialPoints;

    let points = [];

    initialPoints--;

    // Initial guesses
    for (let i = 0; i <= initialPoints; ++i) {
      let fraction = i / initialPoints;

      let x = start + (end - start) * fraction;
      points.push(x, func(x));
    }

    function iterateRoots() {
      for (let i = 0; i < points.length; i += 2) {
        if (Math.abs(points[i+1]) < accuracy)
          continue

        let x = points[i];
        let slope = derivative(x);

        let y = points[i+1];

        let new_x = x - y / slope;

        points[i] = new_x;
        points[i+1] = func(new_x);
      }
    }

    for (let i = 0; i < iterations; ++i)
      iterateRoots();

    let keptRoots = [];

    for (let i = 0; i < points.length; i += 2) {
      // remove roots which are in an area of many 0s

      let x = points[i];

      if (Math.abs(func(x - res)) < accuracy || Math.abs(func(x + res)) < accuracy)
        continue

      keptRoots.push(x, points[i+1]);
    }

    points = [];

    for (let i = 0; i < keptRoots.length; i += 2) {
      let x = keptRoots[i];

      let keepRoot = true;

      for (let j = 0; j < points.length; ++j) {
        // check if there is a root close by

        if (Math.abs(points[j] - x) < res) {
          // already a root nearby

          keepRoot = false;
          break
        }
      }

      if (keepRoot) {
        points.push(x, keptRoots[i+1]);
      }
    }

    return points
  }

  function adaptPolyline(polyline, oldTransform, newTransform, adaptThickness=true) {
    let arr = polyline._internal_polyline._gl_triangle_strip_vertices;

    let newland = oldTransform.getPixelToPlotTransform();
    let harvey = newTransform.getPlotToPixelTransform();

    let x_m = harvey.x_m * newland.x_m;
    let x_b = harvey.x_m * newland.x_b + harvey.x_b;
    let y_m = harvey.y_m * newland.y_m;
    let y_b = harvey.y_m * newland.y_b + harvey.y_b;

    let length = arr.length;

    for (let i = 0; i < length; i += 2) {
      arr[i] = x_m * arr[i] + x_b;
      arr[i+1] = y_m * arr[i+1] + y_b;
    }

    let ratio = oldTransform.coords.width / newTransform.coords.width;

    if (adaptThickness) {
      for (let i = 0; i < arr.length; i += 4) {
        let ax = arr[i];
        let ay = arr[i + 1];
        let bx = arr[i + 2];
        let by = arr[i + 3];

        let vx = (bx - ax) / 2 * (1 - ratio);
        let vy = (by - ay) / 2 * (1 - ratio);

        arr[i] = ax + vx;
        arr[i + 1] = ay + vy;
        arr[i + 2] = bx - vx;
        arr[i + 3] = by - vy;
      }
    }

    polyline._internal_polyline.needsBufferCopy = true;
  }

  // Types: "bool", "int", "real", "complex", "vec2", "vec3", "vec4", "mat2", "mat3", "mat4", "real_list", "complex_list", "real_interval", "complex_interval"

  const TYPES = ["bool", "int", "real", "complex", "vec2", "vec3", "vec4", "mat2", "mat3", "mat4", "real_list", "complex_list", "real_interval", "complex_interval"];

  function isValidType(typename) {
    return TYPES.includes(typename)
  }

  function throwInvalidType(typename) {
    if (!isValidType(typename)) {

      let didYouMean = "";

      let distances = TYPES.map(type => levenshtein(typename, type));
      let minDistance = Math.min(...distances);

      if (minDistance < 2) {
        didYouMean = "Did you mean " + TYPES[distances.indexOf(minDistance)] + "?";
      }

      throw new Error(`Unrecognized type ${typename}; valid types are ${TYPES.join(', ')}. ${didYouMean}`)
    }
  }

  class OperatorDefinition {
    constructor(params={}) {
      this.returns = params.returns || "real";

      throwInvalidType(this.returns);

      let evaluate = params.evaluate;

      if (params.noGraphemePrefix)
        this.evaluate = evaluate;
      else
        this.evaluate = ((isWorker || evaluate.startsWith("Grapheme")) ? "" : "Grapheme.") + evaluate;
    }
  }

  function castableIntoMultiple(signature1, signature2) {
    return (signature1.length === signature2.length) && signature1.every((type, index) => castableInto(type, signature2[index]))
  }

  class NormalDefinition extends OperatorDefinition {
    constructor(params={}) {
      super(params);

      this.signature = params.signature;
      if (!Array.isArray(this.signature))
        throw new Error("Given signature is not an array")

      this.signature.forEach(throwInvalidType);

    }

    signatureWorks(signature) {
      return castableIntoMultiple(signature, this.signature)
    }

    getDefinition(signature) {
      return this
    }
  }

  class VariadicDefinition extends OperatorDefinition {
    constructor(params={}) {
      super(params);

      this.initialSignature = params.initialSignature;
      this.repeatingSignature = params.repeatingSignature;

      this.initialSignature.forEach(throwInvalidType);
      this.repeatingSignature.forEach(throwInvalidType);
    }

    getSignatureOfLength(len) {
      let signature = this.initialSignature.slice();

      while (signature.length < len) {
        signature.push(...this.repeatingSignature);
      }

      return signature
    }

    signatureWorks(signature) {
      let len = signature.length;

      if (len < this.initialSignature.length)
        return false

      let compSig = this.getSignatureOfLength(len);
      if (!compSig)
        return false

      return castableIntoMultiple(signature, compSig)
    }

    getDefinition(signature) {
      let sig = this.getSignatureOfLength(signature.length);

      return new NormalDefinition({
        signature: sig,
        returns: this.returns,
        evaluate: this.evaluate,
        desc: this.desc
      })
    }
  }

  function castableInto(from, into) {
    if (from === into)
      return true

    let summarizedTypecasts = SummarizedTypecasts[from];

    if (!summarizedTypecasts)
      return false

    return summarizedTypecasts.includes(into)
  }

  function getCastingFunction(from, into) {
    if (!castableInto(from, into))
      throw new Error("Cannot cast from type " + from + " into " + into + ".")

    let casts = Typecasts[from];

    for (let cast of casts) {
      if (cast.returns === into)
        return cast.evaluate
    }
  }

  class TypecastDefinition extends OperatorDefinition {
    constructor(params={}) {
      super(params);
    }
  }

  const Typecasts = {
    'int': [
      new TypecastDefinition({
        returns: 'real',
        evaluate: "Typecasts.Identity"
      }),
      new TypecastDefinition({
        returns: 'complex',
        evaluate: "Typecasts.RealToComplex"
      })
    ],
    'real': [
      new TypecastDefinition({
        returns: 'complex',
        evaluate: "Typecasts.RealToComplex"
      })
    ],
    'real_interval': [
      new TypecastDefinition({
        returns: 'complex_interval',
        evaluate: "Typecasts.RealIntervalToComplexInterval"
      })
    ]
  };

  const SummarizedTypecasts = {};

  for (let type in Typecasts) {
    if (Typecasts.hasOwnProperty(type)) {
      SummarizedTypecasts[type] = Typecasts[type].map(cast => cast.returns);
    }
  }

  function constructTrigDefinitions(name, funcName) {
    return [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions." + funcName,
        desc: "Returns the " + name + " of the real number x."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions." + funcName,
        desc: "Returns the " + name + " of the complex number z."
      })
    ]
  }

  const Operators = {
    '*': [
      new NormalDefinition({
        signature: ["int", "int"],
        returns: "int",
        evaluate: "RealFunctions.Multiply",
        desc: "Returns the product of two integers."
      }),
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Multiply",
        desc: "Returns the product of two real numbers."
      }),
      new NormalDefinition({
        signature: ["complex", "complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Multiply",
        desc: "Returns the product of two complex numbers."
      })
    ],
    '+': [
      new NormalDefinition({
        signature: ["int", "int"],
        returns: "int",
        evaluate: "RealFunctions.Add",
        desc: "Returns the sum of two integers."
      }),
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Add",
        desc: "Returns the sum of two real numbers."
      }),
      new NormalDefinition({
        signature: ["complex", "complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Add",
        desc: "Returns the sum of two complex numbers."
      }),
      new NormalDefinition({
        signature: ["vec2", "vec2"],
        returns: "vec2",
        evaluate: "VectorFunctions.Add",
        desc: "Returns the sum of two 2-dimensional vectors."
      })
    ],
    '-': [
      new NormalDefinition({
        signature: ["int", "int"],
        returns: "int",
        evaluate: "RealFunctions.Subtract",
        desc: "Returns the difference of two integers."
      }),
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Subtract",
        desc: "Returns the difference of two real numbers."
      }),
      new NormalDefinition({
        signature: ["complex", "complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Subtract",
        desc: "Returns the difference of two complex numbers."
      }),
      new NormalDefinition({
        signature: ["vec2", "vec2"],
        returns: "vec2",
        evaluate: "VectorFunctions.Subtract",
        desc: "Returns the sum of two 2-dimensional vectors."
      })
    ],
    '/': [
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Divide",
        desc: "Returns the quotient of two real numbers."
      }),
      new NormalDefinition({
        signature: ["complex", "complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Divide",
        desc: "Returns the quotient of two real numbers."
      })
    ],
    "complex": [
      new NormalDefinition({
        signature: ["real"],
        returns: "complex",
        evaluate: "ComplexFunctions.Construct",
        desc: "complex(a) casts a real number to a complex number."
      }),
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "complex",
        evaluate: "ComplexFunctions.Construct",
        desc: "complex(a, b) returns the complex number a + bi."
      })
    ],
    "sin": constructTrigDefinitions("sine", "Sin"),
    "cos": constructTrigDefinitions("cosine", "Cos"),
    "tan": constructTrigDefinitions("tangent", "Tan"),
    "csc": constructTrigDefinitions("cosecant", "Csc"),
    "sec": constructTrigDefinitions("secant", "Sec"),
    "cot": constructTrigDefinitions("cotangent", "Cot"),
    "asin": constructTrigDefinitions("inverse sine", "Arcsin"),
    "acos": constructTrigDefinitions("inverse cosine", "Arccos"),
    "atan": constructTrigDefinitions("inverse tangent", "Arctan"),
    "acsc": constructTrigDefinitions("inverse cosecant", "Arccsc"),
    "asec": constructTrigDefinitions("inverse secant", "Arcsec"),
    "acot": constructTrigDefinitions("inverse cotangent", "Arccot"),
    "sinh": constructTrigDefinitions("hyperbolic sine", "Sinh"),
    "cosh": constructTrigDefinitions("hyperbolic cosine", "Cosh"),
    "tanh": constructTrigDefinitions("hyperbolic tangent", "Tanh"),
    "csch": constructTrigDefinitions("hyperbolic cosecant", "Csch"),
    "sech": constructTrigDefinitions("hyperbolic secant", "Sech"),
    "coth": constructTrigDefinitions("hyperbolic cotangent", "Coth"),
    "asinh": constructTrigDefinitions("inverse hyperbolic sine", "Arcsinh"),
    "acosh": constructTrigDefinitions("inverse hyperbolic cosine", "Arccosh"),
    "atanh": constructTrigDefinitions("inverse hyperbolic tangent", "Arctanh"),
    "acsch": constructTrigDefinitions("inverse hyperbolic cosecant", "Arccsch"),
    "asech": constructTrigDefinitions("inverse hyperbolic secant", "Arcsech"),
    "acoth": constructTrigDefinitions("inverse hyperbolic cotangent", "Arccoth"),
    "Im": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Im",
        desc: "Im(r) returns the imaginary part of r, i.e. 0."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "real",
        evaluate: "ComplexFunctions.Im",
        desc: "Im(z) returns the imaginary part of z."
      })
    ],
    "Re": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Re",
        desc: "Re(r) returns the real part of r, i.e. r."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "real",
        evaluate: "ComplexFunctions.Re",
        desc: "Re(z) returns the real part of z."
      })
    ],
    "gamma": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Gamma",
        desc: "Evaluates the gamma function at r."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Gamma",
        desc: "Evaluates the gamma function at z."
      })
    ],
    '^': [
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Pow",
        desc: "Evaluates a^b, undefined for negative b. If you want to evaluate something like a^(1/5), use pow_rational(a, 1, 5)."
      }),
      new NormalDefinition({
        signature: ["complex", "complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Pow",
        desc: "Returns the principal value of z^w."
      })
    ],
    "pow_rational": [
      new NormalDefinition({
        signature: ["real", "int", "int"],
        returns: "real",
        evaluate: "RealFunctions.PowRational"
      })
    ],
    "digamma": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Digamma",
        desc: "Evaluates the digamma function at r."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Digamma",
        desc: "Evaluates the digamma function at z."
      })
    ],
    "trigamma": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Trigamma",
        desc: "Evaluates the trigamma function at r."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Trigamma",
        desc: "Evaluates the trigamma function at z."
      })
    ],
    "polygamma": [
      new NormalDefinition({
        signature: ["int", "real"],
        returns: "real",
        evaluate: "RealFunctions.Polygamma",
        desc: "polygamma(n, r) evaluates the nth polygamma function at r."
      }),
      new NormalDefinition({
        signature: ["int", "complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Polygamma",
        desc: "polygamma(n, z) evaluates the nth polygamma function at z."
      })
    ],
    "sqrt": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Sqrt",
        desc: "sqrt(r) returns the square root of r. NaN if r < 0."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Sqrt",
        desc: "sqrt(z) returns the principal branch of the square root of z."
      })
    ],
    "cbrt": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Cbrt",
        desc: "cbrt(r) returns the cube root of r. NaN if r < 0."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Cbrt",
        desc: "cbrt(z) returns the principal branch of the cube root of z."
      })
    ],
    "ln": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Ln",
        desc: "ln(r) returns the natural logarithm of r. NaN if r < 0."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Ln",
        desc: "ln(z) returns the principal value of the natural logarithm of z."
      })
    ],
    "log10": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Log10",
        desc: "log10(r) returns the base-10 logarithm of r. NaN if r < 0."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Log10",
        desc: "log10(z) returns the principal value of base-10 logarithm of z."
      })
    ],
    "log2": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Log2",
        desc: "log2(r) returns the base-2 logarithm of r. NaN if r < 0."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Log2",
        desc: "log2(z) returns the principal value of base-2 logarithm of z."
      })
    ],
    "piecewise": [
      new VariadicDefinition({
        initialSignature: [],
        repeatingSignature: ["real", "bool"],
        returns: "real",
        evaluate: "RealFunctions.Piecewise",
        desc: "piecewise(a, cond1, b, cond2 ... ) returns a if cond1 is true, b if cond2 is true, and so forth, and 0 otherwise."
      }),
      new VariadicDefinition({
        initialSignature: ["real"],
        repeatingSignature: ["bool", "real"],
        returns: "real",
        evaluate: "RealFunctions.Piecewise",
        desc: "piecewise(a, cond1, b, cond2, ..., default) returns a if cond1 is true, b if cond2 is true, and so forth, and default otherwise."
      }),
      new VariadicDefinition({
        initialSignature: [],
        repeatingSignature: ["complex", "bool"],
        returns: "complex",
        evaluate: "ComplexFunctions.Piecewise",
        desc: "piecewise(a, cond1, b, cond2 ... ) returns a if cond1 is true, b if cond2 is true, and so forth, and 0 otherwise."
      }),
      new VariadicDefinition({
        initialSignature: ["complex"],
        repeatingSignature: ["bool", "complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Piecewise",
        desc: "piecewise(a, cond1, b, cond2, ..., default) returns a if cond1 is true, b if cond2 is true, and so forth, and default otherwise."
      }),
    ],
    "ifelse": [
      new NormalDefinition({
        signature: ["real", "bool", "real"],
        returns: "real",
        evaluate: "RealFunctions.Piecewise",
        desc: "ifelse(a, cond, b) returns a if cond is true, and b otherwise"
      }),
      new NormalDefinition({
        signature: ["complex", "bool", "complex"],
        returns: "real",
        evaluate: "RealFunctions.Piecewise",
        desc: "ifelse(a, cond, b) returns a if cond is true, and b otherwise"
      })
    ],
    "cchain": [
      new VariadicDefinition({
        initialSignature: ["real"],
        repeatingSignature: ["int", "real"],
        returns: "real",
        evaluate: "RealFunctions.CChain",
        desc: "Used internally to describe comparison chains (e.x. 0 < a < b < 1)"
      })
    ],
    "<": [
      new NormalDefinition( {
        signature: ["real", "real"],
        returns: "bool",
        evaluate: "RealFunctions.Cmp.LessThan",
        desc: "Returns a < b."
      })
    ],
    ">": [
      new NormalDefinition( {
        signature: ["real", "real"],
        returns: "bool",
        evaluate: "RealFunctions.Cmp.GreaterThan",
        desc: "Returns a > b."
      })
    ],
    "<=": [
      new NormalDefinition( {
        signature: ["real", "real"],
        returns: "bool",
        evaluate: "RealFunctions.Cmp.LessEqualThan",
        desc: "Returns a <= b."
      })
    ],
    ">=": [
      new NormalDefinition( {
        signature: ["real", "real"],
        returns: "bool",
        evaluate: "RealFunctions.Cmp.GreaterEqualThan",
        desc: "Returns a >= b."
      })
    ],
    "==": [
      new NormalDefinition( {
        signature: ["real", "real"],
        returns: "bool",
        evaluate: "RealFunctions.Cmp.Equal",
        desc: "Returns a == b."
      })
    ],
    "!=": [
      new NormalDefinition( {
        signature: ["real", "real"],
        returns: "bool",
        evaluate: "RealFunctions.Cmp.NotEqual",
        desc: "Returns a != b."
      })
    ],
    "euler_phi": [
      new NormalDefinition({
        signature: ["int"],
        returns: "int",
        evaluate: "eulerPhi",
        desc: "Returns Euler's totient function evaluated at an integer n."
      })
    ],
    "floor": [
      new NormalDefinition({
        signature: ["real"],
        returns: "int",
        evaluate: "RealFunctions.Floor",
        desc: "Returns the floor of a real number r."
      })
    ],
    "ceil": [
      new NormalDefinition({
        signature: ["real"],
        returns: "int",
        evaluate: "RealFunctions.Ceil",
        desc: "Returns the ceiling of a real number r."
      })
    ],
    "riemann_zeta": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Zeta",
        desc: "Returns the Riemann zeta function of a real number r."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Zeta",
        desc: "Returns the Riemann zeta function of a complex number r."
      })
    ],
    "dirichlet_eta": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Eta",
        desc: "Returns the Dirichlet eta function of a real number r."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Eta",
        desc: "Returns the Dirichlet eta function of a complex number r."
      })
    ],
    "mod": [
      new NormalDefinition({
        signature: ["int", "int"],
        returns: "int",
        evaluate: "RealFunctions.Mod",
        desc: "Returns a modulo b."
      }),
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Mod",
        desc: "Returns a modulo b."
      })
    ],
    "frac": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Frac",
        desc: "Returns the fractional part of x."
      })
    ],
    "sign": [
      new NormalDefinition({
        signature: ["real"],
        returns: "int",
        evaluate: "RealFunctions.Sign",
        desc: "Returns the sign of x: 1 if x > 0, 0 if x == 0 and -1 otherwise."
      })
    ],
    "round": [
      new NormalDefinition({
        signature: ["real"],
        returns: "int",
        evaluate: "RealFunctions.Round",
        desc: "Returns the nearest integer to x. Note that if |x| > " + Number.MAX_SAFE_INTEGER + " this may not be accurate."
      })
    ],
    "trunc": [
      new NormalDefinition({
        signature: ["real"],
        returns: "int",
        evaluate: "RealFunctions.Trunc",
        desc: "Removes the fractional part of x."
      })
    ],
    "is_finite": [
      new NormalDefinition({
        signature: ["real"],
        returns: "bool",
        evaluate: "RealFunctions.IsFinite",
        desc: "Returns true if the number is finite and false if it is -Infinity, Infinity, or NaN"
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "bool",
        evaluate: "ComplexFunctions.IsFinite",
        desc: "Returns true if the number is finite and false if it is undefined or infinite"
      })
    ],
    "not": [
      new NormalDefinition({
        signature: ["bool"],
        returns: "bool",
        evaluate: "!",
        noGraphemePrefix: true,
        desc: "Returns the logical negation of b."
      })
    ],
    "and": [
      new NormalDefinition({
        signature: ["bool", "bool"],
        returns: "bool",
        evaluate: "BooleanFunctions.And",
        desc: "Returns true if a and b are true, and false otherwise."
      })
    ],
    "or": [
      new NormalDefinition({
        signature: ["bool", "bool"],
        returns: "bool",
        evaluate: "BooleanFunctions.Or",
        desc: "Returns true if a or b are true, and false otherwise."
      })
    ],
    "Ei": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Ei",
        desc: "Returns the exponential integral of x."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Ei",
        desc: "Returns the exponential integral of z."
      })
    ],
    "li": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Li",
        desc: "Returns the logarithmic integral of x."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Li",
        desc: "Returns the logarithmic integral of z."
      })
    ],
    "sinc": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Sinc",
        desc: "Returns the sinc function of x."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Sinc",
        desc: "Returns the sinc function of x."
      })
    ],
    "Si": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Si",
        desc: "Returns the sine integral of x."
      })
    ],
    "Ci": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Ci",
        desc: "Returns the cosine integral of x."
      })
    ],
    "erf": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Erf",
        desc: "Returns the error function of x."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Erf",
        desc: "Returns the error function of z."
      })
    ],
    "erfc": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Erfc",
        desc: "Returns the complementary error function of x."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Erfc",
        desc: "Returns the complementary error function of z."
      })
    ],
    "inverse_erf": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.InverseErf",
        desc: "Returns the inverse error function of x."
      })
    ],
    "inverse_erfc": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.InverseErfc",
        desc: "Returns the inverse complementary error function of x."
      })
    ],
    "gcd": [
      new NormalDefinition({
        signature: ["int", "int"],
        returns: "int",
        evaluate: "RealFunctions.Gcd",
        desc: "Returns the greatest common divisor of a and b."
      })
    ],
    "lcm": [
      new NormalDefinition({
        signature: ["int", "int"],
        returns: "int",
        evaluate: "RealFunctions.Lcm",
        desc: "Returns the least common multiple of a and b."
      })
    ],
    "fresnel_S": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.FresnelS",
        desc: "Return the integral from 0 to x of sin(x^2)."
      })
    ],
    "fresnel_C": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.FresnelC",
        desc: "Return the integral from 0 to x of cos(x^2)."
      })
    ],
    "product_log": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.ProductLog",
        desc: "Return the principal branch of the product log of x (also known as the Lambert W function or W0(x))."
      }),
      new NormalDefinition({
        signature: ["int", "real"],
        returns: "real",
        evaluate: "RealFunctions.ProductLogBranched",
        desc: "Return the nth branch of the product log of x (also known as the Lambert W function or W0(x)). n can be 0 or -1."
      })
    ],
    "elliptic_K": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.EllipticK",
        desc: "Return the complete elliptic integral K(x)."
      })
    ],
    "elliptic_E": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.EllipticE",
        desc: "Return the complete elliptic integral E(x)."
      })
    ],
    "agm": [
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Agm",
        desc: "Return the arithmetic geometric mean of a and b."
      })
    ],
    "abs": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Abs",
        desc: "Return the absolute value of r."
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "real",
        evaluate: "ComplexFunctions.Abs",
        desc: "Return the magnitude of z."
      })
    ],
    "vec2": [
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "vec2",
        evaluate: "VectorFunctions.Construct",
        desc: "Construct a new vec2."
      })
    ],
    "vec": [
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "vec2",
        evaluate: "VectorFunctions.Construct",
        desc: "Construct a new vec2."
      })
    ],
    "dot": [
      new NormalDefinition({
        signature: ["vec2", "vec2"],
        returns: "real",
        evaluate: "VectorFunctions.Dot",
        desc: "Find the dot product of vectors v and w."
      })
    ]
  };

  function processExportedVariables(exportedVariables) {
    if (typeof exportedVariables === "string")
      return [[exportedVariables, "real"]]
    for (let i = 0; i < exportedVariables.length; ++i) {
      let pair = exportedVariables[i];

      if (typeof pair === "string") {
        exportedVariables[i] = [pair, "real"];
      }
    }

    return exportedVariables
  }

  class UserDefinedFunction {
    constructor(name, node, exportedVariables=['x']) {
      this.name = name;

      this.node = node;

      this.exportedVariables = processExportedVariables(exportedVariables);

      this.definition = null;

      this.update();
    }

    getVariableTypesAsDict() {
      let dict = {};

      for (let pair of this.exportedVariables) {
        dict[pair[0]] = pair[1];
      }

      return dict
    }

    getSignature() {
      return this.exportedVariables.map(pair => pair[1])
    }

    getVariables() {
      return this.exportedVariables.map(pair => pair[0])
    }

    update() {
      this.usable = false;

      this.node.resolveTypes(this.getVariableTypesAsDict());
      this.evaluate = this.node.compile(this.getVariables());

      const returnType = this.node.returnType;

      if (!returnType)
        throw new Error("Was not able to find a return type for function " + this.name + ".")

      this.definition = new NormalDefinition({
        signature: this.getSignature(),
        returns: returnType,
        evaluate: "Functions." + this.name + '.evaluate'
      });
      this.returnType = returnType;

      this.usable = true;
    }
  }

  class UserDefinedVariable extends UserDefinedFunction {
    constructor(name, node) {
      super(name, node, []);
    }

    update() {
      super.update();

      this.usable = false;

      this.value = this.evaluate();

      this.usable = true;
    }
  }

  // List of operators (currently)
  // +, -, *, /, ^,

  const comparisonOperators = ['<', '>', '<=', '>=', '!=', '=='];

  class ASTNode {
    constructor (params = {}) {
      const {
        parent = null,
        children = [],
        returnType = null
      } = params;

      this.children = children;
      this.parent = parent;
      this.returnType = returnType;
    }

    _getCompileText(exportedVariables=['x']) {
      return this.children[0]._getCompileText(exportedVariables)
    }

    applyAll (func, depth = 0, childrenFirst=false) {
      if (!childrenFirst)
        func(this, depth);

      this.children.forEach(child => {
        if (child.applyAll) {
          child.applyAll(func, depth + 1, childrenFirst);
        }
      });

      if (childrenFirst)
        func(this, depth);
    }

    compile(exportedVariables) {
      if (!this.returnType) {
        throw new Error("Need to call resolveTypes before compiling node.")
      }

      let compileText = this._getCompileText(exportedVariables);

      return new Function(...exportedVariables, "return " + compileText)
    }

    compileInterval(exportedVariables) {
      if (!this.returnType) {
        throw new Error("Need to call resolveTypes before compiling node.")
      }

      this.applyAll(child => {
        if (child.definition && !child.definition.evaluateInterval) {
          throw new Error("Operator " + child.operator + " cannot be evaluated intervallicly.")
        }
      });

      let compileText = this._getIntervalCompileText(exportedVariables);

      return new Function(...exportedVariables, "return " + compileText)
    }

    derivative(variable) {
      return this.children[0].derivative(variable)
    }

    clone () {
      return new ASTNode({
        children: this.children.map(child => child.clone()),
        returnType: this.returnType
      })
    }

    getDependencies() {
      let varDependencies = new Set();
      let funcDependencies = new Set();

      this.applyAll(child => {
        if (child instanceof VariableNode) {
          varDependencies.add(child.name);
        } else if (child instanceof OperatorNode) {
          funcDependencies.add();
        }
      });
    }

    getText () {
      return '(node)'
    }

    hasChildren () {
      return this.children.length !== 0
    }

    isConstant () {
      return this.children.every(child => child.isConstant())
    }

    latex (parens = true) {
      let latex = this.children.map(child => child.latex()).join('');

      if (parens) {
        return String.raw`\left(${latex}\right)`
      }

      return latex
    }

    needsParentheses () {
      return !(this.children.length <= 1 && (!this.children[0] || !this.children[0].hasChildren()))
    }

    resolveTypes(givenTypes) {
      this.children.forEach(child => child.resolveTypes(givenTypes));

      this.returnType = this.children[0].returnType;
    }

    setParents () {
      this.applyAll(child => {
        if (child.children) {
          child.children.forEach(subchild => subchild.parent = child);
        }
      });
    }

    toJSON () {
      return {
        type: 'node',
        children: this.children.map(child => child.toJSON()),
        returnType: this.returnType
      }
    }

    type () {
      return 'node'
    }
  }

  const greek = ['alpha', 'beta', 'gamma', 'Gamma', 'delta', 'Delta', 'epsilon', 'zeta', 'eta', 'theta', 'Theta', 'iota', 'kappa', 'lambda', 'Lambda', 'mu', 'nu', 'xi', 'Xi', 'pi', 'Pi', 'rho', 'Rho', 'sigma', 'Sigma', 'tau', 'phi', 'Phi', 'chi', 'psi', 'Psi', 'omega', 'Omega'];

  function substituteGreekLetters (string) {
    if (greek.includes(string)) {
      return '\\' + string
    }

    return string
  }

  class VariableNode extends ASTNode {
    constructor (params = {}) {
      super();

      const {
        name = 'x'
      } = params;

      this.name = name;
    }

    _getCompileText(exportedVariables) {
      if (comparisonOperators.includes(this.name))
        return `"${this.name}"`
      if (exportedVariables.includes(this.name))
        return this.name
      else
        return (isWorker ? '' : "Grapheme.") + "Variables." + this.name + ".value"
    }

    clone () {
      return new VariableNode({ name: this.name })
    }

    derivative(variable) {
      if (this.name === variable)
        return new ConstantNode({value: 1})
      else
        return new ConstantNode({value: 0})
    }

    getText () {
      return this.name
    }

    isConstant () {
      return false
    }

    latex () {
      if (comparisonOperators.includes(this.name)) {
        switch (this.name) {
          case '>':
          case '<':
            return this.name
          case '>=':
            return '\\geq '
          case '<=':
            return '\\leq '
          case '==':
            return '='
          case '!=':
            return '\\neq '
        }
      }

      return substituteGreekLetters(this.name)
    }

    resolveTypes(typeInfo) {
      if (typeInfo[this.name]) {
        this.returnType = typeInfo[this.name];
        return
      }

      let variable = getVariable(this.name);

      if (variable) {
        if (variable.returnType) {
          this.returnType = variable.returnType;
        } else {
          throw new Error("UserDefinedVariable " + this.name + " is defined but has unknown type. Please properly define the variable.")
        }
      } else {
        throw new Error("Cannot resolve variable " + this.name + ". Please define it.")
      }

    }

    toJSON () {
      return {
        type: 'variable',
        name: this.name,
        returnType: this.returnType
      }
    }

    type () {
      return 'variable'
    }
  }

  const OperatorSynonyms = {
    'arcsinh': 'asinh',
    'arsinh': 'asinh',
    'arccosh': 'acosh',
    'arcosh': 'acosh',
    'arctanh': 'atanh',
    'artanh': 'atanh',
    'arcsech': 'asech',
    'arccsch': 'acsch',
    'arccoth': 'acoth',
    'arsech': 'asech',
    'arcsch': 'acsch',
    'arcoth': 'acoth',
    'arcsin': 'asin',
    'arsin': 'asin',
    'arccos': 'acos',
    'arcos': 'acos',
    'arctan': 'atan',
    'artan': 'atan',
    'arcsec': 'asec',
    'arccsc': 'acsc',
    'arccot': 'acot',
    'arsec': 'asec',
    'arcsc': 'acsc',
    'arcot': 'acot',
    'log': 'ln'
  };

  class OperatorNode extends ASTNode {
    constructor (params = {}) {
      super(params);

      const {
        operator = '^'
      } = params;

      this.operator = operator;
      this.definition = null;
    }

    _getCompileText(exportedVariables) {
      if (!this.definition)
        throw new Error("huh")

      const definition = this.definition;

      return this.definition.evaluate + "(" + this.children.map((child, index) => {
        let text = child._getCompileText(exportedVariables);

        if (child.returnType !== definition.signature[index]) {
          let func = getCastingFunction(child.returnType, definition.signature[index]);

          text = func + '(' + text + ')';
        }

        return text
      }).join(',') + ")"
    }

    clone () {
      let node = new OperatorNode({ operator: this.operator });

      node.children = this.children.map(child => child.clone());

      return node
    }

    derivative(variable) {
      if (!this.definition.derivative) {
        throw new Error("Cannot take derivative of operator " + this.operator + ".")
      }

      return this.definition.derivative(variable, ...this.children)
    }

    getText () {
      return this.operator
    }

    latex () {
      return getLatex(this)
    }

    resolveTypes(typeInfo={}) {
      super.resolveTypes(typeInfo);

      let signature = this.getChildrenSignature();

      if (Functions[this.operator]) {
        let func = Functions[this.operator];

        const funcSig = func.definition.signature;

        if (castableIntoMultiple(signature, funcSig)) {
          this.definition = func.definition;
          this.returnType = func.returnType;
          return
        } else {
          throw new Error("Given signature " + signature + " is not castable into function " + this.operator + ", signature " + funcSig + '.')
        }
      }

      let potentialDefinitions = Operators[this.operator];

      if (!potentialDefinitions) {
        throw new Error("Unknown operation " + this.operator + ".")
      }

      for (let definition of potentialDefinitions) {
        if (definition.signatureWorks(signature)) {
          this.definition = definition.getDefinition(signature);
          this.returnType = definition.returns;

          return
        }
      }

      throw new Error("Could not find a suitable definition for " + this.operator + "(" + signature.join(', ') + ').')
    }

    getChildrenSignature() {
      return this.children.map(child => child.returnType)
    }

    toJSON () {
      return {
        type: 'operator',
        operator: this.operator,
        children: this.children.map(child => child.toJSON())
      }
    }

    type () {
      return 'operator'
    }
  }

  class ConstantNode extends ASTNode {
    constructor (params = {}) {
      super();

      const {
        value = 0,
        text = '',
        invisible = false
      } = params;

      this.value = value;
      this.text = text ? text : StandardLabelFunction(value);
      this.invisible = invisible;
    }

    _getCompileText(exportedVariables) {
      return this.value
    }

    clone () {
      return new ConstantNode({
        value: this.value,
        invisible: this.invisible,
        text: this.text,
        returnType: this.returnType
      })
    }

    getText () {
      return this.invisible ? '' : this.text
    }

    isConstant () {
      return true
    }

    latex () {
      return this.getText()
    }

    resolveTypes(givenTypes) {
      if (Number.isInteger(this.value))
        this.returnType = "int";
      else this.returnType = "real";
    }

    toJSON () {
      return {
        value: this.value,
        text: this.text,
        invisible: this.invisible,
        returnType: this.returnType,
        type: 'constant'
      }
    }

    type () {
      return 'constant'
    }
  }

  // a * b - c * d ^ g

  let operator_regex = /^[*\-\/+^]|^[<>]=?|^[=!]=|^and|^or/;
  let function_regex = /^([a-zA-Z_][a-zA-Z0-9_]*)\(/;
  let constant_regex = /^-?[0-9]*\.?[0-9]*e?[0-9]+/;
  let variable_regex = /^[a-zA-Z_][a-zA-Z0-9_]*/;
  let paren_regex = /^[()\[\]]/;
  let comma_regex = /^,/;

  function get_angry_at(string, index=0, message="I'm angry!") {
    let spaces = "";

    for (let i = 0; i < index; ++i)
      spaces += " ";

    throw new Error(message + " at index " + index + ":\n" + string + "\n" + spaces + "^")
  }

  function check_parens_balanced(string) {
    let stack = [];

    let i;
    let err = false;
    for (i = 0; i < string.length; ++i) {
      let chr = string[i];

      if (chr === '(') {
        stack.push('(');
      } else if (chr === '[') {
        stack.push('[');
      } else if (chr === ')' || chr === ']') {
        if (stack.length === 0) {
          err = true;
          break
        }

        if (chr === ')') {
          let pop = stack.pop();

          if (pop !== '(') {
            err = true;
            break
          }
        } else {
          let pop = stack.pop();

          if (pop !== '[') {
            err = true;
            break
          }
        }
      }
    }

    if (stack.length !== 0)
      err = true;

    if (err) {

      get_angry_at(string, i, "Unbalanced parentheses/brackets");
    }

  }

  function* tokenizer(string) {
    // what constitutes a token? a sequence of n letters, one of the operators *-/+^, parentheses or brackets

    string = string.trimEnd();

    let i = 0;
    let prev_len = string.length;

    let original_string = string;

    while (string) {
      string = string.trim();

      i += prev_len - string.length;
      prev_len = string.length;

      let match;

      do {
        match = string.match(paren_regex);

        if (match) {
          yield {
            type: "paren",
            paren: match[0],
            index: i
          };
          break
        }

        match = string.match(operator_regex);

        if (match) {
          yield {
            type: "operator",
            op: match[0],
            index: i
          };
          break
        }

        match = string.match(constant_regex);

        if (match) {
          yield {
            type: "constant",
            value: match[0],
            index: i
          };
          break
        }

        match = string.match(comma_regex);

        if (match) {
          yield {
            type: "comma",
            index: i
          };
          break
        }

        match = string.match(function_regex);

        if (match) {
          yield {
            type: "function",
            name: match[1],
            index: i
          };

          yield {
            type: "paren",
            paren: '(',
            index: i + match[1].length
          };

          break
        }

        match = string.match(variable_regex);

        if (match) {
          yield {
            type: "variable",
            name: match[0],
            index: i
          };

          break
        }

        get_angry_at(original_string, i, "Unrecognized token");
      } while (false)

      let len = match[0].length;

      string = string.slice(len);
    }
  }

  function check_valid(string, tokens) {
    for (let i = 0; i < tokens.length - 1; ++i) {
      let token1 = tokens[i];
      let token2 = tokens[i+1];

      if ((token1.type === "operator" || token1.type === "comma") && (token2.type === "operator" || token2.type === "comma") &&
        (!(token2.op === '-' && token2.op === '+') || i === tokens.length - 2))
        get_angry_at(string, token2.index, "No consecutive operators/commas");
      if (token1.paren === "(" && token2.paren === ")")
        get_angry_at(string, token2.index, "No empty parentheses");
      if (token1.paren === "[" && token2.paren === "]")
        get_angry_at(string, token2.index, "No empty brackets");
      if (token1.type === "operator" && token2.paren === ")")
        get_angry_at(string, token2.index, "No operator followed by closing parenthesis");
      if (token1.type === "operator" && token2.paren === "]")
        get_angry_at(string, token2.index, "No operator followed by closing bracket");
      if (token1.type === "comma" && token2.paren === ")")
        get_angry_at(string, token2.index, "No comma followed by closing parenthesis");
      if (token1.type === "comma" && token2.paren === "]")
        get_angry_at(string, token2.index, "No comma followed by closing bracket");
      if (token1.paren === '(' && token2.type === "comma")
        get_angry_at(string, token2.index, "No comma after starting parenthesis");
      if (token1.paren === '[' && token2.type === "comma")
        get_angry_at(string, token2.index, "No comma after starting bracket");
    }

    if (tokens[0].type === "comma" || (tokens[0].type === "operator" && !(tokens[0].op === '-' || tokens[0].op === '+')))
      get_angry_at(string, 0, "No starting comma/operator");

    const last_token = tokens[tokens.length - 1];
    if (last_token.type === "comma" || last_token.type === "operator")
      get_angry_at(string, tokens.length - 1, "No ending comma/operator");
  }

  function find_paren_indices(children) {
    let start_paren_index = -1;

    for (let i = 0; i < children.length; ++i) {
      let child = children[i];

      if (child.paren === '(' || child.paren === '[')
        start_paren_index = i;

      if ((child.paren === ')' || child.paren === ']') && start_paren_index !== -1)
        return [start_paren_index, i]
    }
  }

  function parse_tokens(tokens) {
    for (let i = 0; i < tokens.length; ++i) {
      let token = tokens[i];

      switch (token.type) {
        case "constant":
          tokens[i] = new ConstantNode({value: parseFloat(token.value), text: token.value});
          break
        case "variable":
          tokens[i] = new VariableNode({name: token.name});
          break
      }
    }

    let root = new ASTNode();
    root.children = tokens;

    let parens_remaining = true;

    while (parens_remaining) {
      parens_remaining = false;

      root.applyAll(child => {
        if (!(child instanceof ASTNode))
          return

        let indices = find_paren_indices(child.children);


        if (indices) {
          parens_remaining = true;

          let new_node = new ASTNode();
          new_node.children = child.children.slice(indices[0] + 1, indices[1]);
          child.children = child.children.slice(0, indices[0]).concat([
            new_node
          ]).concat(child.children.slice(indices[1] + 1));
        }
      });
    }

    root.applyAll(child => {
      let children = child.children;

      if (children) {
        let first_child = children[0];

        if (first_child) {
          if (first_child.op === '+' || first_child.op === '-') {
            children.splice(0, 0, new ConstantNode({value: 0, invisible: true}));
          }
        }
      }
    });

    let functions_remaining = true;

    while (functions_remaining) {
      functions_remaining = false;

      root.applyAll(child => {
        let children = child.children;

        if (children) {
          for (let i = 0; i < children.length; ++i) {
            let child_test = children[i];

            if (child_test.type === "function") {
              let synonym = OperatorSynonyms[child_test.name];

              let function_node = new OperatorNode({ operator: synonym ? synonym : child_test.name });

              children[i] = function_node;

              function_node.children = children[i + 1].children;

              functions_remaining = true;

              children.splice(i + 1, 1);
              return
            }
          }
        }
      });
    }

    let unary_remaining = true;

    while (unary_remaining) {
      unary_remaining = false;

      root.applyAll(child => {
        let children = child.children;

        for (let i = 0; i < children.length - 2; ++i) {
          let child1 = children[i];
          let child2 = children[i + 1];

          if (child1.op && (child2.op === '-' || child2.op === '+')) {
            const egg = new OperatorNode({
              operator: "*",
              children: [
                new ConstantNode({ value: child2.op === '-' ? -1 : 1 }),
                children[i + 2]
              ]
            });

            child.children = children.slice(0, i + 1).concat([egg]).concat(children.slice(i + 3));
            unary_remaining = true;

            return
          }
        }
      });
    }

    function combineOperators(operators) {
      let operators_remaining = true;

      while (operators_remaining) {
        operators_remaining = false;

        root.applyAll(child => {
          let children = child.children;

          for (let i = 0; i < children.length; ++i) {
            let child_test = children[i];

            if (operators.includes(child_test.op)) {
              let new_node = new OperatorNode({operator: child_test.op});

              new_node.children = [children[i-1],children[i+1]];

              child.children = children.slice(0, i-1).concat([new_node]).concat(children.slice(i+2));
              operators_remaining = true;

              return
            }
          }
        });
      }
    }

    combineOperators(['^']);
    combineOperators(['*','/']);
    combineOperators(['-','+']);

    const comparisonOperators = ['<', '<=', '==', '!=', '>=', '>'];

    // CChain
    let cchain_remaining = true;
    while (cchain_remaining) {
      cchain_remaining = false;

      root.applyAll(child => {
        const children = child.children;
        let cchain_found = false;

        for (let i = 0; i < children.length; ++i) {
          if (comparisonOperators.includes(children[i].op)) {
            let j;
            for (j = i + 2; j < children.length; j += 2) {
              if (comparisonOperators.includes(children[j].op)) {
                cchain_found = true;
              } else {
                break
              }
            }

            if (cchain_found) {
              child.children = children.slice(0, i-1).concat(new OperatorNode({
                operator: "cchain",
                children: children.slice(i-1, j).map(child => child.op ? new VariableNode({name: child.op}) : child)
              })).concat(children.slice(j));

              cchain_remaining = true;

              return

            }
          }
        }
      });
    }

    combineOperators(comparisonOperators);
    combineOperators(["and", "or"]);

    root.applyAll(child => {
      if (child.children) {
        child.children = child.children.filter(child => child.type !== "comma");
      }
    });

    root.setParents();

    return root
  }

  function parseString(string) {
    check_parens_balanced(string);

    let tokens = [];

    for (let token of tokenizer(string)) {
      tokens.push(token);
    }

    check_valid(string, tokens);

    return parse_tokens(tokens)
  }

  const Variables = {};
  const Functions = {};

  const RESERVED_VARIABLES = [];
  const RESERVED_FUNCTIONS = Object.keys(Operators);

  function defineVariable(variableName, node) {
    if (Variables[variableName])
      undefineVariable(variableName);
    if (RESERVED_VARIABLES.includes(variableName))
      throw new Error("The variable " + variableName + " is reserved by Grapheme. Please choose a different name.")

    if (typeof node === 'string')
      node = parseString(node);

    return Variables[variableName] = new UserDefinedVariable(variableName, node)
  }

  function defineFunction(funcName, node, exportedVariables=[["x", "real"]]) {
    if (Functions[funcName])
      undefineFunction(funcName);
    if (RESERVED_FUNCTIONS.includes(funcName))
      throw new Error("The function " + funcName + " is reserved by Grapheme. Please choose a different name.")

    if (typeof node === 'string')
      node = parseString(node);

    return Functions[funcName] = new UserDefinedFunction(funcName, node, exportedVariables)
  }

  function undefineVariable(variableName) {
    if (RESERVED_VARIABLES.includes(variableName))
      throw new Error("The variable " + variableName + " is reserved by Grapheme, and cannot be undefined.")
    delete Variables[variableName];
  }

  function undefineFunction(funcName) {
    if (RESERVED_FUNCTIONS.includes(funcName))
      throw new Error("The function " + funcName + " is reserved by Grapheme, and cannot be undefined.")
    delete Functions[funcName];
  }

  function getFunction(funcName) {
    return Functions[funcName]
  }

  function getVariable(varName) {
    return Variables[varName]
  }

  // Allowed plotting modes:
  // rough = linear sample, no refinement
  // fine = linear sample with refinement

  class FunctionPlot2D extends InteractiveElement {
    constructor(params={}) {
      super(params);

      const {
        plotPoints = "auto",
        plottingMode = "fine"
      } = params;

      this.plotPoints = plotPoints;
      this.plottingMode = plottingMode;
      this.quality = 1;
      this.plottingAxis = 'x';
      this.maxDepth = 4;

      this.function = (x) => x;
      this.functionName = getFunctionName();

      this.pen = new Pen({color: Colors.RED, useNative: false, thickness: 2});
      this.polyline = null;

      this.addEventListener("plotcoordschanged", () => this.markUpdate());

      this.interactivityEnabled = true;
    }

    setFunction(func, variable='x') {
      defineFunction(this.functionName, func, [variable]);

      this.function = getFunction(this.functionName).evaluate;
      this.markUpdate();
    }

    isClick(position) {
      if (!this.polyline)
        return false
      return this.polyline.distanceFrom(position) < this.polyline.pen.thickness * 2
    }

    updateLight(adaptThickness=true) {
      let transform = this.plot.transform;

      this.previousTransform = transform.clone();

      adaptPolyline(this.polyline, this.previousTransform, transform, adaptThickness);
    }

    setAxis(axis) {
      if (axis !== 'x' && axis !== 'y')
        throw new Error("Axis should be x or y, not " + axis + ".")

      this.plottingAxis = axis;
      this.markUpdate();
    }

    updateAsync(info, progress) {
      if (this.polyline) {
        this.polyline.glVertices = null;

        this.polyline.needsBufferCopy = true;
      }

      return super.updateAsync(info, progress)
    }

    update(info) {
      super.update();

      let transform = this.plot.transform;

      this.previousTransform = transform.clone();

      let { coords, box } = transform;

      let plotPoints = this.plotPoints;

      let width = this.plottingAxis === 'x' ? box.width : box.height;

      if (plotPoints === "auto") {
        plotPoints = this.quality * width;
      }

      let vertices = [];
      let x1 = this.plottingAxis === 'x' ? coords.x1 : coords.y2;
      let x2 = this.plottingAxis === 'x' ? coords.x2 : coords.y1;

      if (this.plottingMode === "rough") {
        let points = width * this.quality;

        vertices = sample_1d(x1, x2, this.function, points);
      } else {
        vertices = adaptively_sample_1d(x1, x2, this.function,
          width * this.quality, transform.getAspect(), this.plottingAxis === 'x' ? coords.height / box.height : coords.width / box.width, this.maxDepth);
      }

      if (this.plottingAxis !== 'x') {
        for (let i = 0; i < vertices.length; i += 2) {
          let tmp = vertices[i];
          vertices[i] = vertices[i + 1];
          vertices[i + 1] = tmp;
        }
      }

      this.plot.transform.plotToPixelArr(vertices);

      if (!this.polyline) {
        this.polyline = new WebGLPolyline({
          pen: this.pen,
          alwaysUpdate: false
        });
      }

      this.polyline.vertices = vertices;
      this.polyline.update(info);
    }

    render(info) {
      if (!this.polyline)
        return

      info.scissorPlot(true);
      this.polyline.render(info);

      info.scissorPlot(false);

      this.renderChildren(info);
    }

    destroy() {
      if (this.polyline)
        this.polyline.destroy();

      undefineFunction(this.functionName);
    }
  }

  const PieColors = ["SALMON", "STEELBLUE", "LAVENDER", "MEDIUMORCHID", "INDIGO", "THISTLE", "AZURE", "TAN", "CORNSILK", "MISTYROSE", "DIMGRAY"];

  class PieChart extends GraphemeElement {
    constructor(params={}) {
      super(params);

      this.box = null;
      this.sectors = [
        {name: "Nitrogen", value: 780840 / 1e6},
        {name: "Oxygen", value: 209460 / 1e6},
        {name: "Argon", value: 9340 / 1e6},
        {name: "Carbon dioxide", value: 413.32 / 1e6},
        {name: "Neon", value: 18.18 / 1e6},
        {name: "Helium", value: 5.24 / 1e6},
        {name: "Methane", value: 1.87 / 1e6},
        {name: "Krypton", value: 1.14 / 1e6}
      ];

      this.critical_angles = {
        "stop_labeling" : 3,
        "label_outside" : 15
      };

      this.label_function = (name, value) => {
        return name + ": " + expressQuantityPP(value)
      };

      this.label_style = new Label2DStyle({color: Colors.BLACK, fontSize: 20});
      this.label_ratio = 0.7;
      this.label_padding = 15;

      this.starting_angle = 90; // degrees counterclockwise from x axis

      this._paths = [];
      this._labels = [];
    }

    update() {
      super.update();

      let box = this.box;

      if (!box) {
        box = this.plot.transform.box;
      }

      let radius = Math.min(box.width, box.height) / 2;
      let totalValue = 0;

      for (let i = 0; i < this.sectors.length; ++i) {
        let sector = this.sectors[i];
        if (!sector.value) {
          totalValue += 1;
        } else {
          totalValue += sector.value;
        }
      }

      let theta = -this.starting_angle / 180 * Math.PI;
      let cx = box.cx;
      let cy = box.cy;

      this._paths = [];
      this._labels = [];

      for (let i = 0; i < this.sectors.length; ++i) {
        let sector = this.sectors[i];
        let value = sector.value;
        if (!value) {
          value = 1;
        }

        let angle = value / totalValue * 2 * Math.PI;
        let angleDeg = angle / Math.PI * 180;

        if (angleDeg > this.critical_angles.stop_labeling) {
          let label_angle = theta + angle / 2;
          let r = radius * this.label_ratio;

          if (angleDeg < this.critical_angles.label_outside) {
            r = radius + this.label_padding;
          }

          let x = cx + r * Math.cos(label_angle);
          let y = cy + r * Math.sin(label_angle);

          let pos = new Vec2(x, y);

          let label = new Label2D({style: this.label_style, position: pos});
          label.text = this.label_function(sector.name, sector.value);

          this._labels.push(label);
        }

        let path = new Path2D();
        path.moveTo(cx, cy);
        path.lineTo(cx + radius * Math.cos(theta), cy + radius * Math.sin(theta));
        path.arc(cx, cy, radius, theta, theta+angle);
        path.closePath();

        this._paths.push(path);

        theta += angle;
      }
    }

    render(info) {
      super.render(info);

      const ctx = info.ctx;

      let colorIndx = 0;

      function getSubstituteColor() {
        let color = Colors[PieColors[colorIndx]];

        colorIndx++;

        if (colorIndx >= PieColors.length)
          colorIndx = 0;

        return color
      }

      for (let i = 0; i < this.sectors.length; ++i) {
        let path = this._paths[i];

        if (path) {
          let color = this.sectors[i].color;
          if (!color)
            color = getSubstituteColor();

          ctx.fillStyle = color.hex();
          ctx.fill(path);
        }
      }

      for (let i = 0; i < this._labels.length; ++i) {
        this._labels[i].render(info);
      }
    }
  }

  // Inspired by tween.js!

  // list of all active interpolations. They are stored in the following form:
  // {object, property, startTime, endTime, interpolationFunction}
  let extantInterpolations = [];

  const SIGMOID_C = 0.964027580075816;

  // An interpolation function is a function from [0,1] to [0,1] such that f(0) = 0 and f(1) = 1
  const Interpolations = {
    LINEAR: x => Math.min(Math.max(x, 0), 1),
    QUADRATIC: x => x < 0 ? 0 : (x > 1 ? 1 : x * x),
    CUBIC: x => x < 0 ? 0 : (x > 1 ? 1 : x * x * x),
    QUARTIC: x => x < 0 ? 0 : (x > 1 ? 1 : x * x * x * x),
    INVERTED_QUADRATIC: x => x < 0 ? 0 : (x > 1 ? 1 : (1 - (x - 1) ** 2)),
    INVERTED_CUBIC: x => x < 0 ? 0 : (x > 1 ? 1 : (1 - (x - 1) ** 3)),
    INVERTED_QUARTIC: x => x < 0 ? 0 : (x > 1 ? 1 : (1 - (x - 1) ** 4)),
    INVERTED_CIRCULAR: x => x < 0 ? 0 : (x > 1 ? 1 : (1-Math.sqrt(1-x*x))),
    CIRCULAR: x => x < 0 ? 0 : (x > 1 ? 1 : (Math.sqrt(1 - (x - 1)  ** 2))),
    SIGMOID: x => x < 0 ? 0 : (x > 1 ? 1 : (Math.tanh(4 * x - 2) / (2 * SIGMOID_C) + 0.5))
  };

  function removeFinishedInterpolations() {
    let time = Date.now();

    for (let i = 0; i < extantInterpolations.length; ++i) {
      if (extantInterpolations[i].end < time + 1000) {
        extantInterpolations.splice(i, 1);
        --i;
      }
    }
  }

  // We store
  function update() {
    extantInterpolations.forEach(interpolation => interpolation.tick());

    removeFinishedInterpolations();
  }

  class GraphemeInterpolation {
    constructor(object) {
      this.object = object;

      this.duration = -1;
      this.interpolationFunction = Interpolations.LINEAR;

      this.values = {};

      this.startTime = -1;
      this.endTime = -1;

      this.onUpdate = [];
      this.onComplete = [];
    }

    to(values, duration) {
      for (let key in values) {
        let value = values[key];

        this.values[key] = {start: values[key], end: value};
      }

      this.duration = duration;

      return this
    }

    cancel() {
      let index = extantInterpolations.indexOf(this);

      if (index !== -1) {
        extantInterpolations.splice(index, 1);
      }

      return this
    }

    setInterpolation(func) {
      this.interpolationFunction = func;
      return this
    }

    start() {
      if (this.duration < 0) {
        throw new Error("You need to set a valid duration")
      }

      if (extantInterpolations.some(egg => egg.object === this.object))
        extantInterpolations = extantInterpolations.filter(egg => egg.object !== this.object);

      this.startTime = Date.now();
      this.endTime = this.startTime + this.duration;

      for (let key in this.values) {
        this.values[key].start = this.object[key];
      }

      extantInterpolations.push(this);

      return this
    }

    tick() {
      let time = Date.now();
      let fractionCompleted = (time - this.startTime) / this.duration;

      if (fractionCompleted >= 1) {
        fractionCompleted = 1;
      }

      for (let key in this.values) {
        let value = this.values[key];

        this.object[key] = this.interpolationFunction(fractionCompleted) * (value.end - value.start) + value.start;
      }

      this.onUpdate.forEach(callback => callback(this.object));

      if (fractionCompleted >= 1) {
        this.onComplete.forEach(callback => callback(this.object));

        this.cancel();
      }
    }

    update(func) {
      this.onUpdate.push(func);
      return this
    }

    complete(func) {
      this.onComplete.push(func);
      return this
    }
  }

  function interpolate(...args) {
    return new GraphemeInterpolation(...args)
  }

  let _interpolationsEnabled = true;

  function updateInterpolations() {

    update();

    requestAnimationFrame(updateInterpolations);
  }

  updateInterpolations();

  // Huge, huge credit to the creators of earcut.js: https://github.com/mapbox/earcut
  // Licensed under the ISC license.

  function earcut(data, holeIndices, dim) {

    dim = dim || 2;

    var hasHoles = holeIndices && holeIndices.length,
      outerLen = hasHoles ? holeIndices[0] * dim : data.length,
      outerNode = linkedList(data, 0, outerLen, dim, true),
      triangles = [];

    if (!outerNode || outerNode.next === outerNode.prev) return triangles;

    var minX, minY, maxX, maxY, x, y, invSize;

    if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);

    // if the shape is not too simple, we'll use z-order curve hash later; calculate polygon bbox
    if (data.length > 80 * dim) {
      minX = maxX = data[0];
      minY = maxY = data[1];

      for (var i = dim; i < outerLen; i += dim) {
        x = data[i];
        y = data[i + 1];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }

      // minX, minY and invSize are later used to transform coords into integers for z-order calculation
      invSize = Math.max(maxX - minX, maxY - minY);
      invSize = invSize !== 0 ? 1 / invSize : 0;
    }

    earcutLinked(outerNode, triangles, dim, minX, minY, invSize);

    return triangles;
  }

  // create a circular doubly linked list from polygon points in the specified winding order
  function linkedList(data, start, end, dim, clockwise) {
    var i, last;

    if (clockwise === (signedArea(data, start, end, dim) > 0)) {
      for (i = start; i < end; i += dim) last = insertNode(i, data[i], data[i + 1], last);
    } else {
      for (i = end - dim; i >= start; i -= dim) last = insertNode(i, data[i], data[i + 1], last);
    }

    if (last && equals(last, last.next)) {
      removeNode(last);
      last = last.next;
    }

    return last;
  }

  // eliminate colinear or duplicate points
  function filterPoints(start, end) {
    if (!start) return start;
    if (!end) end = start;

    var p = start,
      again;
    do {
      again = false;

      if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
        removeNode(p);
        p = end = p.prev;
        if (p === p.next) break;
        again = true;

      } else {
        p = p.next;
      }
    } while (again || p !== end);

    return end;
  }

  // main ear slicing loop which triangulates a polygon (given as a linked list)
  function earcutLinked(ear, triangles, dim, minX, minY, invSize, pass) {
    if (!ear) return;

    // interlink polygon nodes in z-order
    if (!pass && invSize) indexCurve(ear, minX, minY, invSize);

    var stop = ear,
      prev, next;

    // iterate through ears, slicing them one by one
    while (ear.prev !== ear.next) {
      prev = ear.prev;
      next = ear.next;

      if (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear)) {
        // cut off the triangle
        triangles.push(prev.i / dim);
        triangles.push(ear.i / dim);
        triangles.push(next.i / dim);

        removeNode(ear);

        // skipping the next vertex leads to less sliver triangles
        ear = next.next;
        stop = next.next;

        continue;
      }

      ear = next;

      // if we looped through the whole remaining polygon and can't find any more ears
      if (ear === stop) {
        // try filtering points and slicing again
        if (!pass) {
          earcutLinked(filterPoints(ear), triangles, dim, minX, minY, invSize, 1);

          // if this didn't work, try curing all small self-intersections locally
        } else if (pass === 1) {
          ear = cureLocalIntersections(filterPoints(ear), triangles, dim);
          earcutLinked(ear, triangles, dim, minX, minY, invSize, 2);

          // as a last resort, try splitting the remaining polygon into two
        } else if (pass === 2) {
          splitEarcut(ear, triangles, dim, minX, minY, invSize);
        }

        break;
      }
    }
  }

  // check whether a polygon node forms a valid ear with adjacent nodes
  function isEar(ear) {
    var a = ear.prev,
      b = ear,
      c = ear.next;

    if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

    // now make sure we don't have other points inside the potential ear
    var p = ear.next.next;

    while (p !== ear.prev) {
      if (pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
        area(p.prev, p, p.next) >= 0) return false;
      p = p.next;
    }

    return true;
  }

  function isEarHashed(ear, minX, minY, invSize) {
    var a = ear.prev,
      b = ear,
      c = ear.next;

    if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

    // triangle bbox; min & max are calculated like this for speed
    var minTX = a.x < b.x ? (a.x < c.x ? a.x : c.x) : (b.x < c.x ? b.x : c.x),
      minTY = a.y < b.y ? (a.y < c.y ? a.y : c.y) : (b.y < c.y ? b.y : c.y),
      maxTX = a.x > b.x ? (a.x > c.x ? a.x : c.x) : (b.x > c.x ? b.x : c.x),
      maxTY = a.y > b.y ? (a.y > c.y ? a.y : c.y) : (b.y > c.y ? b.y : c.y);

    // z-order range for the current triangle bbox;
    var minZ = zOrder(minTX, minTY, minX, minY, invSize),
      maxZ = zOrder(maxTX, maxTY, minX, minY, invSize);

    var p = ear.prevZ,
      n = ear.nextZ;

    // look for points inside the triangle in both directions
    while (p && p.z >= minZ && n && n.z <= maxZ) {
      if (p !== ear.prev && p !== ear.next &&
        pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
        area(p.prev, p, p.next) >= 0) return false;
      p = p.prevZ;

      if (n !== ear.prev && n !== ear.next &&
        pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
        area(n.prev, n, n.next) >= 0) return false;
      n = n.nextZ;
    }

    // look for remaining points in decreasing z-order
    while (p && p.z >= minZ) {
      if (p !== ear.prev && p !== ear.next &&
        pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
        area(p.prev, p, p.next) >= 0) return false;
      p = p.prevZ;
    }

    // look for remaining points in increasing z-order
    while (n && n.z <= maxZ) {
      if (n !== ear.prev && n !== ear.next &&
        pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
        area(n.prev, n, n.next) >= 0) return false;
      n = n.nextZ;
    }

    return true;
  }

  // go through all polygon nodes and cure small local self-intersections
  function cureLocalIntersections(start, triangles, dim) {
    var p = start;
    do {
      var a = p.prev,
        b = p.next.next;

      if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {

        triangles.push(a.i / dim);
        triangles.push(p.i / dim);
        triangles.push(b.i / dim);

        // remove two nodes involved
        removeNode(p);
        removeNode(p.next);

        p = start = b;
      }
      p = p.next;
    } while (p !== start);

    return filterPoints(p);
  }

  // try splitting polygon into two and triangulate them independently
  function splitEarcut(start, triangles, dim, minX, minY, invSize) {
    // look for a valid diagonal that divides the polygon into two
    var a = start;
    do {
      var b = a.next.next;
      while (b !== a.prev) {
        if (a.i !== b.i && isValidDiagonal(a, b)) {
          // split the polygon in two by the diagonal
          var c = splitPolygon(a, b);

          // filter colinear points around the cuts
          a = filterPoints(a, a.next);
          c = filterPoints(c, c.next);

          // run earcut on each half
          earcutLinked(a, triangles, dim, minX, minY, invSize);
          earcutLinked(c, triangles, dim, minX, minY, invSize);
          return;
        }
        b = b.next;
      }
      a = a.next;
    } while (a !== start);
  }

  // link every hole into the outer loop, producing a single-ring polygon without holes
  function eliminateHoles(data, holeIndices, outerNode, dim) {
    var queue = [],
      i, len, start, end, list;

    for (i = 0, len = holeIndices.length; i < len; i++) {
      start = holeIndices[i] * dim;
      end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
      list = linkedList(data, start, end, dim, false);
      if (list === list.next) list.steiner = true;
      queue.push(getLeftmost(list));
    }

    queue.sort(compareX);

    // process holes from left to right
    for (i = 0; i < queue.length; i++) {
      eliminateHole(queue[i], outerNode);
      outerNode = filterPoints(outerNode, outerNode.next);
    }

    return outerNode;
  }

  function compareX(a, b) {
    return a.x - b.x;
  }

  // find a bridge between vertices that connects hole with an outer ring and and link it
  function eliminateHole(hole, outerNode) {
    outerNode = findHoleBridge(hole, outerNode);
    if (outerNode) {
      var b = splitPolygon(outerNode, hole);

      // filter collinear points around the cuts
      filterPoints(outerNode, outerNode.next);
      filterPoints(b, b.next);
    }
  }

  // David Eberly's algorithm for finding a bridge between hole and outer polygon
  function findHoleBridge(hole, outerNode) {
    var p = outerNode,
      hx = hole.x,
      hy = hole.y,
      qx = -Infinity,
      m;

    // find a segment intersected by a ray from the hole's leftmost point to the left;
    // segment's endpoint with lesser x will be potential connection point
    do {
      if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
        var x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);
        if (x <= hx && x > qx) {
          qx = x;
          if (x === hx) {
            if (hy === p.y) return p;
            if (hy === p.next.y) return p.next;
          }
          m = p.x < p.next.x ? p : p.next;
        }
      }
      p = p.next;
    } while (p !== outerNode);

    if (!m) return null;

    if (hx === qx) return m; // hole touches outer segment; pick leftmost endpoint

    // look for points inside the triangle of hole point, segment intersection and endpoint;
    // if there are no points found, we have a valid connection;
    // otherwise choose the point of the minimum angle with the ray as connection point

    var stop = m,
      mx = m.x,
      my = m.y,
      tanMin = Infinity,
      tan;

    p = m;

    do {
      if (hx >= p.x && p.x >= mx && hx !== p.x &&
        pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {

        tan = Math.abs(hy - p.y) / (hx - p.x); // tangential

        if (locallyInside(p, hole) &&
          (tan < tanMin || (tan === tanMin && (p.x > m.x || (p.x === m.x && sectorContainsSector(m, p)))))) {
          m = p;
          tanMin = tan;
        }
      }

      p = p.next;
    } while (p !== stop);

    return m;
  }

  // whether sector in vertex m contains sector in vertex p in the same coordinates
  function sectorContainsSector(m, p) {
    return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
  }

  // interlink polygon nodes in z-order
  function indexCurve(start, minX, minY, invSize) {
    var p = start;
    do {
      if (p.z === null) p.z = zOrder(p.x, p.y, minX, minY, invSize);
      p.prevZ = p.prev;
      p.nextZ = p.next;
      p = p.next;
    } while (p !== start);

    p.prevZ.nextZ = null;
    p.prevZ = null;

    sortLinked(p);
  }

  // Simon Tatham's linked list merge sort algorithm
  // http://www.chiark.greenend.org.uk/~sgtatham/algorithms/listsort.html
  function sortLinked(list) {
    var i, p, q, e, tail, numMerges, pSize, qSize,
      inSize = 1;

    do {
      p = list;
      list = null;
      tail = null;
      numMerges = 0;

      while (p) {
        numMerges++;
        q = p;
        pSize = 0;
        for (i = 0; i < inSize; i++) {
          pSize++;
          q = q.nextZ;
          if (!q) break;
        }
        qSize = inSize;

        while (pSize > 0 || (qSize > 0 && q)) {

          if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) {
            e = p;
            p = p.nextZ;
            pSize--;
          } else {
            e = q;
            q = q.nextZ;
            qSize--;
          }

          if (tail) tail.nextZ = e;
          else list = e;

          e.prevZ = tail;
          tail = e;
        }

        p = q;
      }

      tail.nextZ = null;
      inSize *= 2;

    } while (numMerges > 1);

    return list;
  }

  // z-order of a point given coords and inverse of the longer side of data bbox
  function zOrder(x, y, minX, minY, invSize) {
    // coords are transformed into non-negative 15-bit integer range
    x = 32767 * (x - minX) * invSize;
    y = 32767 * (y - minY) * invSize;

    x = (x | (x << 8)) & 0x00FF00FF;
    x = (x | (x << 4)) & 0x0F0F0F0F;
    x = (x | (x << 2)) & 0x33333333;
    x = (x | (x << 1)) & 0x55555555;

    y = (y | (y << 8)) & 0x00FF00FF;
    y = (y | (y << 4)) & 0x0F0F0F0F;
    y = (y | (y << 2)) & 0x33333333;
    y = (y | (y << 1)) & 0x55555555;

    return x | (y << 1);
  }

  // find the leftmost node of a polygon ring
  function getLeftmost(start) {
    var p = start,
      leftmost = start;
    do {
      if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) leftmost = p;
      p = p.next;
    } while (p !== start);

    return leftmost;
  }

  // check if a point lies within a convex triangle
  function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
    return (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 &&
      (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 &&
      (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0;
  }

  // check if a diagonal between two polygon nodes is valid (lies in polygon interior)
  function isValidDiagonal(a, b) {
    return a.next.i !== b.i && a.prev.i !== b.i && !intersectsPolygon(a, b) && // dones't intersect other edges
      (locallyInside(a, b) && locallyInside(b, a) && middleInside(a, b) && // locally visible
        (area(a.prev, a, b.prev) || area(a, b.prev, b)) || // does not create opposite-facing sectors
        equals(a, b) && area(a.prev, a, a.next) > 0 && area(b.prev, b, b.next) > 0); // special zero-length case
  }

  // signed area of a triangle
  function area(p, q, r) {
    return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  }

  // check if two points are equal
  function equals(p1, p2) {
    return p1.x === p2.x && p1.y === p2.y;
  }

  // check if two segments intersect
  function intersects(p1, q1, p2, q2) {
    var o1 = sign(area(p1, q1, p2));
    var o2 = sign(area(p1, q1, q2));
    var o3 = sign(area(p2, q2, p1));
    var o4 = sign(area(p2, q2, q1));

    if (o1 !== o2 && o3 !== o4) return true; // general case

    if (o1 === 0 && onSegment(p1, p2, q1)) return true; // p1, q1 and p2 are collinear and p2 lies on p1q1
    if (o2 === 0 && onSegment(p1, q2, q1)) return true; // p1, q1 and q2 are collinear and q2 lies on p1q1
    if (o3 === 0 && onSegment(p2, p1, q2)) return true; // p2, q2 and p1 are collinear and p1 lies on p2q2
    if (o4 === 0 && onSegment(p2, q1, q2)) return true; // p2, q2 and q1 are collinear and q1 lies on p2q2

    return false;
  }

  // for collinear points p, q, r, check if point q lies on segment pr
  function onSegment(p, q, r) {
    return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
  }

  function sign(num) {
    return num > 0 ? 1 : num < 0 ? -1 : 0;
  }

  // check if a polygon diagonal intersects any polygon segments
  function intersectsPolygon(a, b) {
    var p = a;
    do {
      if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i &&
        intersects(p, p.next, a, b)) return true;
      p = p.next;
    } while (p !== a);

    return false;
  }

  // check if a polygon diagonal is locally inside the polygon
  function locallyInside(a, b) {
    return area(a.prev, a, a.next) < 0 ?
      area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 :
      area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
  }

  // check if the middle point of a polygon diagonal is inside the polygon
  function middleInside(a, b) {
    var p = a,
      inside = false,
      px = (a.x + b.x) / 2,
      py = (a.y + b.y) / 2;
    do {
      if (((p.y > py) !== (p.next.y > py)) && p.next.y !== p.y &&
        (px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x))
        inside = !inside;
      p = p.next;
    } while (p !== a);

    return inside;
  }

  // link two polygon vertices with a bridge; if the vertices belong to the same ring, it splits polygon into two;
  // if one belongs to the outer ring and another to a hole, it merges it into a single ring
  function splitPolygon(a, b) {
    var a2 = new Node(a.i, a.x, a.y),
      b2 = new Node(b.i, b.x, b.y),
      an = a.next,
      bp = b.prev;

    a.next = b;
    b.prev = a;

    a2.next = an;
    an.prev = a2;

    b2.next = a2;
    a2.prev = b2;

    bp.next = b2;
    b2.prev = bp;

    return b2;
  }

  // create a node and optionally link it with previous one (in a circular doubly linked list)
  function insertNode(i, x, y, last) {
    var p = new Node(i, x, y);

    if (!last) {
      p.prev = p;
      p.next = p;

    } else {
      p.next = last.next;
      p.prev = last;
      last.next.prev = p;
      last.next = p;
    }
    return p;
  }

  function removeNode(p) {
    p.next.prev = p.prev;
    p.prev.next = p.next;

    if (p.prevZ) p.prevZ.nextZ = p.nextZ;
    if (p.nextZ) p.nextZ.prevZ = p.prevZ;
  }

  function Node(i, x, y) {
    // vertex index in coordinates array
    this.i = i;

    // vertex coordinates
    this.x = x;
    this.y = y;

    // previous and next vertex nodes in a polygon ring
    this.prev = null;
    this.next = null;

    // z-order curve value
    this.z = null;

    // previous and next nodes in z-order
    this.prevZ = null;
    this.nextZ = null;

    // indicates whether this is a steiner point
    this.steiner = false;
  }

  // return a percentage difference between the polygon area and its triangulation area;
  // used to verify correctness of triangulation
  earcut.deviation = function (data, holeIndices, dim, triangles) {
    var hasHoles = holeIndices && holeIndices.length;
    var outerLen = hasHoles ? holeIndices[0] * dim : data.length;

    var polygonArea = Math.abs(signedArea(data, 0, outerLen, dim));
    if (hasHoles) {
      for (var i = 0, len = holeIndices.length; i < len; i++) {
        var start = holeIndices[i] * dim;
        var end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
        polygonArea -= Math.abs(signedArea(data, start, end, dim));
      }
    }

    var trianglesArea = 0;
    for (i = 0; i < triangles.length; i += 3) {
      var a = triangles[i] * dim;
      var b = triangles[i + 1] * dim;
      var c = triangles[i + 2] * dim;
      trianglesArea += Math.abs(
        (data[a] - data[c]) * (data[b + 1] - data[a + 1]) -
        (data[a] - data[b]) * (data[c + 1] - data[a + 1]));
    }

    return polygonArea === 0 && trianglesArea === 0 ? 0 :
      Math.abs((trianglesArea - polygonArea) / polygonArea);
  };

  function signedArea(data, start, end, dim) {
    var sum = 0;
    for (var i = start, j = end - dim; i < end; i += dim) {
      sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
      j = i;
    }
    return sum;
  }

  // turn a polygon in a multi-dimensional array form (e.g. as in GeoJSON) into a form Earcut accepts
  earcut.flatten = function (data) {
    var dim = data[0][0].length,
      result = {vertices: [], holes: [], dimensions: dim},
      holeIndex = 0;

    for (var i = 0; i < data.length; i++) {
      for (var j = 0; j < data[i].length; j++) {
        for (var d = 0; d < dim; d++) result.vertices.push(data[i][j][d]);
      }
      if (i > 0) {
        holeIndex += data[i - 1].length;
        result.holes.push(holeIndex);
      }
    }
    return result;
  };

  class Glyph {
    constructor(vertices) {
      const triangulation = earcut(vertices);
      const triDraw = [];

      for (let i = 0; i < triangulation.length; ++i) {
        let pt = triangulation[i];

        triDraw.push(vertices[2 * pt], vertices[2 * pt + 1]);
      }

      this.triangulation = new Float32Array(triDraw);
    }

    scale(s) {
      const vertices = this.triangulation;

      for (let i = 0; i < vertices.length; ++i) {
        vertices[i] *= s;
      }

      return this
    }

    translate(x, y) {
      const vertices = this.triangulation;

      for (let i = 0; i < vertices.length; i += 2) {
        vertices[i] += x;
        vertices[i+1] += y;
      }

      return this
    }

    rotate(angle) {
      const vertices = this.triangulation;

      let c = Math.cos(angle), s = Math.sin(angle);

      for (let i = 0; i < vertices.length; i += 2) {
        let x = vertices[i];
        let y = vertices[i + 1];

        vertices[i] = x * c - y * s;
        vertices[i + 1] = y * c + x * s;
      }

      return this
    }


    clone() {
      let glyph = new Glyph([]);

      glyph.triangulation = new Float32Array(this.triangulation);

      return glyph
    }
  }

  function regularPolygonGlyph(sides) {
    let vertices = [];

    for (let i = 0; i <= sides; ++i) {
      let angle = 2 * Math.PI * i / sides - Math.PI / 2;

      vertices.push(5 * Math.cos(angle), 5 * Math.sin(angle));
    }

    return new Glyph(vertices)
  }

  function alternatingPolygonGlyph(radii, sides) {
    let vertices = [];
    let radCount = radii.length;

    for (let i = 0; i <= sides; ++i) {
      let angle = 2 * Math.PI * i / sides - Math.PI / 2;

      let radius = radii[i % radCount];

      vertices.push(radius * Math.cos(angle), radius * Math.sin(angle));
    }

    return new Glyph(vertices)
  }

  const Glyphs = {
    CIRCLE: regularPolygonGlyph(10),
    TRIANGLE: regularPolygonGlyph(3),
    SQUARE: regularPolygonGlyph(4),
    PENTAGON: regularPolygonGlyph(5),
    X: new Glyph([1, 0, 5, 4, 4, 5, 0, 1, -4, 5, -5, 4, -1, 0, -5, -4, -4, -5, 0, -1, 4, -5, 5, -4, 1, 0]),
    STAR: alternatingPolygonGlyph([10, 4], 10)
  };

  class PointElement extends GraphemeElement {
    constructor(params={}) {
      super(params);

      let position = params.position ? params.position : new Vec2(0, 0);

      if (!position instanceof Vec2) {
        position = new Vec2(position);
      }

      this.position = position;
      this.pixelPosition = new Vec2(0, 0);
      this.geometry = new Simple2DWebGLGeometry();
      this.radius = 5;
      this.glyph = params.glyph ? params.glyph : Glyphs.CIRCLE;

      this.addEventListener("plotcoordschanged", () => {
        this.markUpdate();
      });
    }

    get color() {
      return this.geometry.color
    }

    set color(v) {
      this.geometry.color = v;
    }

    isClick(pos) {
      return this.position.distanceSquaredTo(pos) <= (2 + this.radius + (this.style.doStroke ? this.style.pen.thickness : 0)) ** 2
    }

    update(info) {
      super.update(info);

      const plot = info.plot;

      let pixelPos = this.pixelPosition = plot.transform.plotToPixel(this.position);

      this.geometry.glVertices = this.glyph.clone().translate(pixelPos.x, pixelPos.y).triangulation;
    }

    render(info) {
      super.render(info);

      this.geometry.render(info);
    }

    getBBox() {
      let cx = this.pixelPosition.x;
      let cy = this.pixelPosition.y;

      let box = new BoundingBox();

      box.height = box.width = this.radius * 1.4;

      box.cx = cx;
      box.cy = cy;

      return box
    }
  }

  class LabeledPoint extends PointElement {
    constructor (params = {}) {
      super(params);

      const labelStyle = params.labelStyle ? params.labelStyle : {dir: "NE", fontSize: 14, shadowColor: Colors.WHITE, shadowSize: 2};

      this.label = new SmartLabel({style: labelStyle});

      this.add(this.label);
    }

    update (info) {
      super.update(info);

      this.label.objectBox = this.getBBox();
    }
  }

  class FunctionPlot2DInspectionPoint extends LabeledPoint {
    constructor(params={}) {
      super(params);
    }
  }

  /**
   * UserDefinedFunction plot intended for use in a graphing calculator setting
   */
  class InteractiveFunctionPlot2D extends FunctionPlot2D {
    constructor (params = {}) {
      super(params);

      this.inspListeners = {};

      this.inspectionEnabled = true;

      this.inspPt = null;

      this.inspectionPointLingers = true;
      this.inspPtLabelStyle = new Label2DStyle({dir: "NE", fontSize: 14, shadowColor: Colors.WHITE, shadowSize: 2});
    }

    setFunction(func) {
      super.setFunction(func);

      this.removeInspectionPoint();
    }

    removeInspectionPoint() {
      if (this.inspPt)
        this.remove(this.inspPt);
      this.inspPt = null;
    }

    update(info) {
      super.update(info);
    }

    set inspectionEnabled (value) {
      if (value)
        this.interactivityEnabled = true;

      if (this.inspectionEnabled === value)
        return

      let inspLeo = 0;

      if (value) {
        this.inspListeners['interactive-mousedown'] = this.inspListeners['interactive-drag'] = (evt) => {
          inspLeo = 0;
          let position = evt.pos;

          if (!this.polyline) {
            return
          }

          let closestPoint = this.polyline.closestTo(position);
          let x = this.plot.transform.pixelToPlotX(closestPoint.x);
          let y = this.function(x);

          if (!this.inspPt) {
            this.inspPt = new FunctionPlot2DInspectionPoint({
              position: { x, y },
              labelStyle: this.inspPtLabelStyle
            });

            this.inspPt.color = this.pen.color;
            this.inspPt.glyph = this.inspPt.glyph.clone().scale(0.75);

            this.add(this.inspPt);
          } else {
            let pos = new Vec2(x, y);

            this.inspPos = pos;

            let inspPt = this.inspPt;
            inspPt.position = pos;

            inspPt.label.text = "(" + pos.asArray().map(StandardLabelFunction).join(', ') + ')';
          }

          this.inspPt.markUpdate();

          return true
        };

        this.inspListeners["click"] = (evt) => {
          if (this.inspectionPointLingers && inspLeo > 0)
            this.removeInspectionPoint();
          inspLeo++;
        };

        for (let key in this.inspListeners) {
          this.addEventListener(key, this.inspListeners[key]);
        }
      } else {
        for (let key in this.inspListeners) {
          this.removeEventListener(key, this.inspListeners[key]);
        }

        if (this.inspPt) {
          this.remove(this.inspPt);
        }

        this.inspListeners = {};
      }
    }
  }

  const REPRESENTATION_LENGTH = 20;
  const MAX_DENOM = 1e7;

  function get_continued_fraction(f) {
    let representation = [];

    let k = Math.floor(f);

    representation.push(k);

    f -= k;

    let reprs = 0;

    while (++reprs < REPRESENTATION_LENGTH) {
      let cont = Math.floor(1 / f);

      if (cont === Infinity) {
        return representation
      }

      if (cont < 0) {
        return representation
      }

      representation.push(cont);

      f = 1 / f - cont;
    }


    return representation
  }

  function get_rational(x) {
    if (x === 0) {
      return 0
    }

    let repr = get_continued_fraction(x);

    let lastIndx = -1;

    for (let i = 1; i < repr.length; ++i) {
      if (repr[i] > MAX_DENOM) {
        lastIndx = i;
      }
    }

    if (lastIndx !== -1) {
      repr.length = lastIndx;
    }

    if (repr.length === REPRESENTATION_LENGTH) {
      // "irrational number"
      return [NaN, NaN]
    }

    // evaluate the continued fraction

    let n = 1, d = 0;
    for (let i = repr.length - 1; i >= 0; --i) {
      let val = repr[i];

      let tmp = d;
      d = n;
      n = tmp;

      n += val * d;
    }

    return [n, d]
  }

  // An interval is defined as a series of six values, namely two floating point values, two booleans for domain tracking, and two booleans for continuity tracking.

  class Interval {
    constructor(min, max, defMin=true, defMax=true, contMin=true, contMax=true) {
      this.min = min;
      this.max = max;
      this.defMin = defMin;
      this.defMax = defMax;
      this.contMin = contMin;
      this.contMax = contMax;
    }

    isExact() {
      return this.min === this.max
    }

    isSet() {
      return false
    }

    pretty() {
      return `(${this.min}, ${this.max}), <${this.defMin}, ${this.defMax}>, <${this.contMin}, ${this.contMax}>`
    }

    clone() {
      return new Interval(this.min, this.max, this.defMin, this.defMax, this.contMin, this.contMax)
    }

    contains(x) {
      return this.min <= x && x <= this.max
    }

    containsNeighborhoodOf(x) {
      return this.min < x && x < this.max
    }

    intersects(i) {
      if (i.isSet()) {
        return getIntervals(i).some(interval => this.intersects(interval))
      } else {
        return (i.contains(this.min) || i.contains(this.max) || this.contains(i.min))
      }
    }
  }

  class IntervalSet {
    constructor(intervals=[]) {
      this.intervals = intervals;
    }

    get min() {
      return Math.min.apply(null, this.intervals.map(interval => interval.min))
    }

    get max() {
      return Math.max.apply(null, this.intervals.map(interval => interval.max))
    }

    get defMin() {
      return !!Math.min.apply(null, this.intervals.map(interval => interval.defMin))
    }

    get defMax() {
      return !!Math.max.apply(null, this.intervals.map(interval => interval.defMax))
    }

    get contMin() {
      return !!Math.min.apply(null, this.intervals.map(interval => interval.contMin))
    }

    get contMax() {
      return !!Math.max.apply(null, this.intervals.map(interval => interval.contMax))
    }

    mergeIntervals() {

    }

    isSet() {
      return true
    }

    isExact() {
      return this.min === this.max
    }

    contains(x) {
      return this.intervals.some(i => i.contains(x))
    }

    containsNeighborhoodOf(x) {
      return this.intervals.some(i => i.containsNeighborhoodOf(x))
    }

    intersects(i) {
      return this.intervals.some(interval => interval.intersects(i))
    }
  }

  function getIntervals(i) {
    if (i.isSet()) {
      return i.intervals
    } else {
      return [i]
    }
  }

  function ADD(i1, i2) {
    let isSet1 = i1.isSet();
    let isSet2 = i2.isSet();

    if (isSet1 || isSet2) {
      let left = getIntervals(i1);
      let right = getIntervals(i2);

      let intervals = [];

      left.forEach(i => {
        right.forEach(j => {
          intervals.push(ADD(i, j));
        });
      });

      return new IntervalSet(intervals)
    } else {
      return new Interval(i1.min + i2.min, i1.max + i2.max,
        i1.defMin && i2.defMin, i1.defMax && i2.defMax,
        i1.contMin && i2.contMin, i1.contMax && i2.contMax)
    }
  }

  function MULTIPLY(i1, i2) {
    let isSet1 = i1.isSet();
    let isSet2 = i2.isSet();

    if (isSet1 || isSet2) {
      let left = getIntervals(i1);
      let right = getIntervals(i2);

      let intervals = [];

      left.forEach(i => {
        right.forEach(j => {
          intervals.push(MULTIPLY(i, j));
        });
      });

      return new IntervalSet(intervals)
    } else {
      let prod1 = i1.min * i2.min;
      let prod2 = i1.min * i2.max;
      let prod3 = i1.max * i2.min;
      let prod4 = i1.max * i2.max;

      return new Interval(Math.min(prod1, prod2, prod3, prod4),
        Math.max(prod1, prod2, prod3, prod4),
        i1.defMin && i2.defMin, i1.defMax && i2.defMax,
        i1.contMin && i2.contMin, i1.contMax && i2.contMax)
    }
  }

  function SUBTRACT(i1, i2) {
    let isSet1 = i1.isSet();
    let isSet2 = i2.isSet();

    if (isSet1 || isSet2) {
      let left = getIntervals(i1);
      let right = getIntervals(i2);

      let intervals = [];

      left.forEach(i => {
        right.forEach(j => {
          intervals.push(SUBTRACT(i, j));
        });
      });

      return new IntervalSet(intervals)
    } else {
      return new Interval(i1.min - i2.max, i1.max - i2.min,
        i1.defMin && i2.defMin, i1.defMax && i2.defMax,
        i1.contMin && i2.contMin, i1.contMax && i2.contMax)
    }
  }

  function DIVIDE(i1, i2) {
    let isSet1 = i1.isSet();
    let isSet2 = i2.isSet();

    if (isSet1 || isSet2) {
      let left = getIntervals(i1);
      let right = getIntervals(i2);

      let intervals = [];

      left.forEach(i => {
        right.forEach(j => {
          getIntervals(DIVIDE(i, j)).forEach(k => intervals.push(k));
        });
      });

      return new IntervalSet(intervals)
    } else {
      return MULTIPLY(i1, RECIPROCAL(i2))
    }
  }

  function RECIPROCAL(i1) {
    let isSet = i1.isSet();

    if (isSet) {
      let intervals = [];

      i1.intervals.forEach(interval => getIntervals(RECIPROCAL(interval)).forEach(i => intervals.push(i)));

      return new IntervalSet(intervals)
    } else {
      let min = i1.min;
      let max = i1.max;

      let defMin = i1.defMin, defMax = i1.defMax, contMin = i1.contMin, contMax = i1.contMax;

      if (0 < min || max < 0) {
        let valMin = 1 / min;
        let valMax = 1 / max;

        return new Interval(Math.min(valMin, valMax), Math.max(valMin, valMax), defMin, defMax, contMin, contMax)
      } else if (max === 0) {
        return new Interval(-Infinity, 1 / min, defMin, defMax, contMin, contMax)
      } else if (min === 0) {
        return new Interval(1 / max, Infinity, defMin, defMax, contMin, contMax)
      } else {
        // 0 contained in the interval

        let interval1 = new Interval(-Infinity, 1 / min, defMin, defMax, contMin, contMax);
        let interval2 = new Interval(1 / max, Infinity, defMin, defMax, contMin, contMax);

        return new IntervalSet([interval1, interval2])
      }
    }
  }

  function CONST(a) {
    return new Interval(a, a)
  }

  function int_pow(b, n) {
    let prod = 1;
    for (let i = 0; i < n; ++i) {
      prod *= b;
    }
    return prod
  }

  // N is an integer
  function POW_N(i1, n) {
    let isSet = i1.isSet();

    if (isSet) {
      let intervals = [];

      i1.intervals.forEach(interval => getIntervals(POW_N(interval, n)).forEach(i => intervals.push(i)));

      return new IntervalSet(intervals)
    } else {
      // x^0 = 1
      if (n === 0) {
        return new Interval(1, 1, i1.defMin, i1.defMax, true, true)
      } else if (n === 1) {
        // identity function
        return i1.clone()
      } else if (n === -1) {
        return RECIPROCAL(i1)
      }

      if (n > 1) {
        // Positive integers
        // if even, then there is a turning point at x = 0. If odd, monotonically increasing
        // always continuous and well-defined

        let min = i1.min;
        let max = i1.max;

        let minPowed, maxPowed;

        if (n === 2) {
          minPowed = min * min;
          maxPowed = max * max;
        } else if (n === 3) {
          minPowed = min * min * min;
          maxPowed = max * max * max;
        } else {
          minPowed = int_pow(min, n);
          maxPowed = int_pow(max, n);
        }

        let defMin = i1.defMin;
        let defMax = i1.defMax;
        let contMin = i1.contMin;
        let contMax = i1.contMax;

        if (!(n & 1)) {
          let maxValue = Math.max(minPowed, maxPowed);
          if (min <= 0 && 0 <= max) { // if 0 is included, then it's just [0, max(min^n, max^n)]
            return new Interval(0, maxValue, defMin, defMax, contMin, contMax)
          } else {
            // if 0 is not included, then it's [min(min^n, max^n), max(min^n, max^n)]
            let minValue = Math.min(minPowed, maxPowed);

            return new Interval(minValue, maxValue, defMin, defMax, contMin, contMax)
          }
        } else {
          // Monotonically increasing, so it's [min^n, max^n]

          return new Interval(minPowed, maxPowed, defMin, defMax, contMin, contMax)
        }
      } else {
        // Negative integers, utilize reciprocal function
        return RECIPROCAL(POW_N(i1, -n))
      }
    }
  }

  // r is a real number
  function POW_R(i1, r) {
    let min = i1.min;
    let max = i1.max;

    if (max < 0) {
      // UserDefinedFunction is totally undefined
      return new Interval(0, 0, false, false, i1.contMin, i1.contMax)
    } else if (min < 0) {
      // 0 included in range, so the function is partially undefined
      let defMin = false;
      let defMax = i1.defMax;
      let contMin = i1.contMin;
      let contMax = i1.contMax;

      let bound = Math.pow(max, r);

      if (r < 0) {
        // Monotonically decreasing, infinite maximum, max^r minimum

        return new Interval(bound, Infinity, defMin, defMax, contMin, contMax)
      } else {
        // Monotonically increasing, 0 minimum, max^r maximum

        return new Interval(0, bound, defMin, defMax, contMin, contMax)
      }
    } else {
      // function is totally defined and continuous

      let minPowed = Math.pow(min, r);
      let maxPowed = Math.pow(max, r);

      let minValue = Math.min(minPowed, maxPowed);
      let maxValue = Math.max(minPowed, maxPowed);

      return new Interval(minValue, maxValue, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
    }
  }

  function SQRT(i1) {
    if (i1.isSet()) {
      let intervals = [];

      i1.intervals.forEach(interval => getIntervals(SQRT(interval)).forEach(i => intervals.push(i)));

      return new IntervalSet(intervals)
    } else {
      return POW_R(i1, 1/2)
    }
  }

  function CBRT(i1) {
    if (i1.isSet()) {
      let intervals = [];

      i1.intervals.forEach(interval => getIntervals(CBRT(interval)).forEach(i => intervals.push(i)));

      return new IntervalSet(intervals)
    } else {
      return POW_RATIONAL(i1, 1, 3)
    }
  }

  function POW_RATIONAL(i1, p, q) {
    if (i1.isSet()) {
      let intervals = [];

      i1.intervals.forEach(interval => getIntervals(POW_RATIONAL(interval, p, q)).forEach(i => intervals.push(i)));

      return new IntervalSet(intervals)
    } else {
      // Assuming p and q are reduced

      if (p === 0) {
        return POW_N(i1, 0)
      }

      if (!(q & 1)) {
        // If the denominator is even then we can treat it like a real number
        return POW_R(i1, p / q)
      }

      let min = i1.min, max = i1.max;
      let r = p / q;
      let absMinPowed = Math.pow(Math.abs(min), r);
      let absMaxPowed = Math.pow(Math.abs(max), r);

      // continuous and well-defined everywhere

      let defMin = i1.defMin;
      let defMax = i1.defMax;
      let contMin = i1.contMin;
      let contMax = i1.contMax;

      let minAttained = Math.min(absMinPowed, absMaxPowed);
      let maxAttained = Math.max(absMinPowed, absMaxPowed);

      if (!(p & 1) && min < 0) {
        minAttained *= -1;
      }

      if (!(p & 1)) {
        if (p > 0) {
          // p / q with even, positive p and odd q
          // Continuous

          if (min < 0 && 0 < max) {
            // if 0 contained, then the minimum attained value is 0

            return new Interval(0, maxAttained, defMin, defMax, contMin, contMax)
          } else {
            return new Interval(minAttained, maxAttained, defMin, defMax, contMin, contMax)
          }

        } else {
          {
            // Totally continuous and monotonic
            return new Interval(minAttained, maxAttained, defMin, defMax, contMin, contMax)
          }
        }
      } else {
        if (p > 0) {
          // p / q with odd, positive p and odd q
          // Continuous, monotonically increasing everywhere

          console.log(minAttained, maxAttained);

          return new Interval(minAttained, maxAttained, defMin, defMax, contMin, contMax)
        } else {
          // p / q with odd, negative p and odd q
          // Always decreasing, discontinuous at x = 0

          if (min < 0 && 0 < max) {
            let interval1 = new Interval(-Infinity, minAttained, defMin, defMax, contMin, contMax);
            let interval2 = new Interval(maxAttained, Infinity, defMin, defMax, contMin, contMax);

            return new IntervalSet([interval1, interval2])
          }
        }
      }
    }
  }

  function POW_B(b, i1) {
    if (i1.isExact()) {
      let ret = Math.pow(b, i1.min);

      return new Interval(ret, ret, i1.defMin, i1.defMax, true, true)
    }

    if (b < 0) {
      // TODO add strange branching
      return new Interval(0, 0, false, false, true, true)
    } else if (b === 0) {
      return new Interval(0, 0, i1.defMin, i1.defMax, true, true)
    } else if (b === 1) {
      return new Interval(1, 1, i1.defMin, i1.defMax, true, true)
    } else {
      // continuous, monotonic, always defined
      let minPowed = Math.pow(b, i1.min);
      let maxPowed = Math.pow(b, i1.max);

      let minValue = Math.min(minPowed, maxPowed);
      let maxValue = Math.max(minPowed, maxPowed);

      return new Interval(minValue, maxValue, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
    }
  }

  function cmpZero(min, max) {
    if (min >= 0) {
      return 1
    } else if (max > 0) {
      return 0
    } else {
      return -1
    }
  }

  function ignoreNaNMin(...args) {
    let min = Infinity;
    for (let i = 0; i < args.length; ++i) {
      let val = args[i];

      if (val < min) {
        min = val;
      }
    }

    return min
  }

  function ignoreNaNMax(...args) {
    let max = -Infinity;
    for (let i = 0; i < args.length; ++i) {
      let val = args[i];

      if (val > max) {
        max = val;
      }
    }

    return max
  }

  function POW(i1, i2) {
    let isSet = i1.isSet() || i2.isSet();

    if (isSet) {
      let left = getIntervals(i1);
      let right = getIntervals(i2);

      let intervals = [];

      left.forEach(i => {
        right.forEach(j => {
          getIntervals(POW(i, j)).forEach(k => intervals.push(k));
        });
      });

      return new IntervalSet(intervals)
    } else {
      if (i2.isExact()) {
        if (Number.isInteger(i2.min)) {
          return POW_N(i1, i2.min)
        } else {
          return POW_R(i1, i2.min)
        }
      }

      if (i1.isExact()) {
        return POW_B(i1.min, i2)
      }

      let i1min = i1.min, i1max = i1.max, i2min = i2.min, i2max = i2.max;

      // This is a rather complex algorithm, so I must document it!!
      // We wish to find the intervals of the set [i1min, i1max] ^ [i2min, i2max].
      // We should treat the exponent as a real number, not as a rational number (since that case is
      // the dominion of POW_RATIONAL). That means that there are two branches for negative base.
      // We split up the cases depending on the position of i1, i2 relative to 0.

      let i1Pos = cmpZero(i1min, i1max);

      let powMinMin = Math.pow(i1min, i2min);
      let powMinMax = Math.pow(i1min, i2max);
      let powMaxMin = Math.pow(i1max, i2min);
      let powMaxMax = Math.pow(i1max, i2max);

      let defMin = i1.defMin && i2.defMin;
      let defMax = i1.defMax && i2.defMax;
      let contMin = i1.contMin && i2.contMin;
      let contMax = i1.contMax && i2.contMax;

      let endpointMinAttained = ignoreNaNMin(powMinMin, powMinMax, powMaxMin, powMaxMax);
      let endpointMaxAttained = ignoreNaNMax(powMinMin, powMinMax, powMaxMin, powMaxMax);

      // Nine cases
      if (i1Pos === 1) {
        // In these three cases, everything is continuous and monotonic and thus defined by the endpoints

        return new Interval(endpointMinAttained, endpointMaxAttained, defMin, defMax, contMin, contMax)
      } else if (i1Pos === 0) {
        // Discontinuities due to branching involved
        // Recurse into two subcases

        let int1 = POW(new Interval(0, i1max, i1.defMin, i1.defMax, i1.contMin, i1.contMax), i2);
        let int2 = POW(new Interval(i1min, 0, i1.defMin, i1.defMax, i1.contMin, i1.contMax), i2);

        return new IntervalSet([int1, ...int2.intervals])
      } else if (i1Pos === -1) {
        let powMinMin = Math.pow(Math.abs(i1min), i2min);
        let powMinMax = Math.pow(Math.abs(i1min), i2max);
        let powMaxMin = Math.pow(Math.abs(i1max), i2min);
        let powMaxMax = Math.pow(Math.abs(i1max), i2max);


        let minAttained = Math.min(powMinMin, powMinMax, powMaxMin, powMaxMax);
        let maxAttained = Math.max(powMinMin, powMinMax, powMaxMin, powMaxMax);

        // Not continuous over any interval
        let int1 = new Interval(-maxAttained, -minAttained, false, defMax, false, false);
        let int2 = new Interval(minAttained, maxAttained, false, defMax, false, false);

        return new IntervalSet([int1, int2])
      }
    }
  }

  function MAX(i1, i2, ...args) {
    if (args.length > 0) {
      return MAX(i1, MAX(i2, ...args))
    }

    let min = Math.max(i1.min, i2.min);
    let max = Math.max(i1.max, i2.max);
    let defMin = i1.defMin && i2.defMin;
    let defMax = i1.defMax && i2.defMax;
    let contMin = i1.contMin && i2.contMin;
    let contMax = i1.contMax || i2.contMax;

    return new Interval(min, max, defMin, defMax, contMin, contMax)
  }

  function MIN(i1, i2, ...args) {
    if (args.length > 0) {
      return MIN(i1, MIN(i2, ...args))
    }

    let min = Math.min(i1.min, i2.min);
    let max = Math.min(i1.max, i2.max);
    let defMin = i1.defMin && i2.defMin;
    let defMax = i1.defMax && i2.defMax;
    let contMin = i1.contMin && i2.contMin;
    let contMax = i1.contMax || i2.contMax;

    return new Interval(min, max, defMin, defMax, contMin, contMax)
  }

  const YES = new Interval(1, 1);
  const YESNT = new Interval(0, 1);
  const NO = new Interval(0, 0);

  function invertBooleanInterval(i) {
    if (i.min === 0 && i.max === 0) {
      return new Interval(1, 1, i.defMin, i.defMax, i.contMin, i.contMax)
    } else if (i.max === 1 && i.max === 1) {
      return new Interval(0, 0, i.defMin, i.defMax, i.contMin, i.contMax)
    } else {
      return new Interval(0, 1, i.defMin, i.defMax, i.contMin, i.contMax)
    }
  }

  function LESS_THAN(i1, i2) {
    let ret;
    if (i1.max < i2.min) {
      ret = YES.clone();
    } else if (i2.max < i1.min) {
      ret = NO.clone();
    } else {
      ret = YESNT.clone();
    }

    ret.defMin = i1.defMin && i2.defMin;
    ret.defMax = i1.defMax && i2.defMax;
    ret.contMin = i1.contMin && i2.contMin;
    ret.contMax = i1.contMax || i2.contMax;

    return ret
  }

  function GREATER_THAN(i1, i2) {
    return LESS_THAN(i2, i1)
  }

  function LESS_EQUAL_THAN(i1, i2) {
    let ret;
    if (i1.max <= i2.min) {
      ret = YES.clone();
    } else if (i2.max <= i1.min) {
      ret = NO.clone();
    } else {
      ret = YESNT.clone();
    }

    ret.defMin = i1.defMin && i2.defMin;
    ret.defMax = i1.defMax && i2.defMax;
    ret.contMin = i1.contMin && i2.contMin;
    ret.contMax = i1.contMax || i2.contMax;

    return ret
  }

  function GREATER_EQUAL_THAN(i1, i2) {
    return LESS_EQUAL_THAN(i2, i1)
  }

  function EQUAL(i1, i2) {
    let ret;

    if (i1.isExact() && i2.isExact()) {
      if (i1.min === i2.min) {
        ret = YES.clone();
      } else {
        ret = NO.clone();
      }
    }

    if (i1.intersects(i2)) {
      ret = YESNT.clone();
    } else {
      ret = NO.clone();
    }

    ret.defMin = i1.defMin && i2.defMin;
    ret.defMax = i1.defMax && i2.defMax;
    ret.contMin = i1.contMin && i2.contMin;
    ret.contMax = i1.contMax || i2.contMax;

    return ret
  }

  function NOT_EQUAL(i1, i2) {
    return invertBooleanInterval(EQUAL(i1, i2))
  }

  function IFELSE(i1, cond, i2) {
    if (cond.min === 1) {
      return i1
    } else if (cond.min === 0 && cond.max === 1) {
      return new IntervalSet([i1, i2])
    } else {
      return i2
    }
  }

  function PIECEWISE(cond, i1, ...args) {
    if (!i1)
      return cond
    if (!cond)
      return new Interval(0, 0, true, true, true, true)
    if (cond.min === 1) {
      return i1
    } else if (cond.max === 0) {
      return PIECEWISE(...args)
    } else {
      // yesnt
      return new IntervalSet([i1, ...getIntervals(PIECEWISE(...args))])
    }
  }

  const GAMMA_MIN_X = 1.4616321449683623412626595423257213284681962040064463512959884085987864403538018102430749927337255;
  const GAMMA_MIN_Y = 0.8856031944108887002788159005825887332079515336699034488712001659;

  function GAMMA(i1) {
    if (i1.min < 0) {
      return new Interval(-Infinity, Infinity, false, i1.defMax, false, i1.contMax)
    }

    let y1 = gamma(i1.min), y2 = gamma(i1.max);
    let min = Math.min(y1, y2);
    let max = Math.max(y1, y2);

    if (i1.max < GAMMA_MIN_X) {

      return new Interval(min, max, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
    } else if (i1.min < GAMMA_MIN_X && GAMMA_MIN_X < i1.max) {
      return new Interval(GAMMA_MIN_Y, max, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
    } else {
      return new Interval(min, max, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
    }
  }

  function DIGAMMA(i1) {
    let min = i1.min, max = i1.max;

    if (min > 0) {
      let minVal = digamma(min);
      let maxVal = digamma(max);

      return new Interval(minVal, maxVal, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
    }

    let minInt = Math.floor(min), maxInt = Math.ceil(max);
    let intDiff = maxInt - minInt;

    if (intDiff === 0) {
      // Then min === max

      return new Interval(0, 0, false, false, i1.contMin, i1.contMax)
    }

    let minVal = digamma(min);
    let maxVal = digamma(max);

    if (intDiff === 1) {
      // Monotonically increasing
      return new Interval(minVal, maxVal, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
    }

    return new Interval(-Infinity, Infinity, false, i1.defMax, false, i1.contMax)
  }

  function TRIGAMMA(i1) {
    let min = i1.min, max = i1.max;

    if (max < 0)
      return new Interval(8.8, Infinity, false, i1.defMax, false, i1.contMax)
    if (min < 0) {
      return new Interval(0, Infinity, false, i1.defMax, false, i1.contMax)
    } else {
      let minVal = trigamma(max), maxVal = trigamma(min);
      return new Interval(minVal, maxVal, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
    }
  }

  function POLYGAMMA(n, i1) {
    return new Interval(-Infinity, Infinity, false, i1.defMax, false, i1.contMax)
  }

  // Frankly, I don't know how this code works. I wrote it a long time ago
  function SIN(i1) {
    let min = i1.min, max = i1.max;

    if (max - min >= 2 * Math.PI) { // If the length is more than a full period, return [-1, 1]
      return new Interval(-1, 1, i1.defMin, i1.defMax, i1.contMin, i1.contMax)
    }

    let a_rem_2p = mod(i1.min, 2 * Math.PI);
    let b_rem_2p = mod(i1.max, 2 * Math.PI);

    let min_rem = Math.min(a_rem_2p, b_rem_2p);
    let max_rem = Math.max(a_rem_2p, b_rem_2p);

    let contains_1 = (min_rem < Math.PI / 2) && (max_rem > Math.PI / 2);
    let contains_n1 = (min_rem < 3 * Math.PI / 2 && max_rem > 3 * Math.PI / 2);

    if (b_rem_2p < a_rem_2p) {
      contains_1 = !contains_1;
      contains_n1 = !contains_n1;
    }

    if (contains_1 && contains_n1)
      return new Interval(-1, 1, i1.defMin, i1.defMax, i1.contMin, i1.contMax)

    let sa = Math.sin(a_rem_2p), sb = Math.sin(b_rem_2p);
    return new Interval(contains_n1 ? -1 : Math.min(sa, sb), contains_1 ? 1 : Math.max(sa, sb),
      i1.defMin, i1.defMax, i1.contMin, i1.contMax);
  }

  const PI_OVER_TWO = CONST(Math.PI / 2);
  const ONE = CONST(1);

  function COS(i1) {
    return SIN(ADD(i1, PI_OVER_TWO))
  }

  function TAN(i1) {
    return DIVIDE(SIN(i1), COS(i1))
  }

  function SEC(i1) {
    return DIVIDE(ONE, COS(i1))
  }

  function CSC(i1) {
    return DIVIDE(ONE, SIN(i1))
  }

  function COT(i1) {
    return DIVIDE(COS(i1), SIN(i1))
  }

  function ASIN(i1) {
    if (i1.max < -1 || i1.min > 1) {
      return new Interval(0, 0, false, false, true, true)
    }

    if (i1.max <= 1 && i1.min >= -1) { // Defined everywhere
      return new Interval(Math.asin(i1.min), Math.asin(i1.max), i1.defMin, i1.defMax, i1.contMin, i1.contMax)
    }

    let tmp = i1.clone();
    tmp.max = Math.min(1, tmp.max);
    tmp.min = Math.max(-1, tmp.min);

    let res = ASIN(tmp);
    res.defMin = false;

    return res
  }

  const NEGATIVE_ONE = CONST(-1);

  function ACOS(i1) {
    return ADD(ASIN(MULTIPLY(i1, NEGATIVE_ONE)), PI_OVER_TWO)
  }

  function ASEC(i1) {
    return ACOS(RECIPROCAL(i1))
  }

  function ACSC(i1) {
    return ASIN(RECIPROCAL(i1))
  }

  function ACOT(i1) {
    // Monotonically decreasing everywhere
    return new Interval(ExtraFunctions.Arccot(i1.max), ExtraFunctions.Arccot(i1.min), i1.defMin, i1.defMax, i1.contMin, i1.contMax)
  }

  function SINH(i1) {
    // Monotonically increasing everywhere
    return new Interval(Math.sinh(i1.min), Math.sinh(i1.max), i1.defMin, i1.defMax, i1.contMin, i1.contMax)
  }

  function COSH(i1) {
    // Flips direction at (x, y) = (0, 1)
    let val1 = Math.cosh(i1.min), val2 = Math.cosh(i1.max);

    if (i1.min <= 0 && 0 <= i1.max) {
      // if 0 is contained
      return new Interval(1, Math.max(val1, val2), i1.defMin, i1.defMax, i1.contMin, i1.contMax)
    }

    return new Interval(Math.min(val1, val2), Math.max(val1, val2), i1.defMin, i1.defMax, i1.contMin, i1.contMax)
  }

  function TANH(i1) {
    // Monotonically increasing everywhere
    return new Interval(Math.tanh(i1.min), Math.tanh(i1.max), i1.defMin, i1.defMax, i1.contMin, i1.contMax)
  }

  function SECH(i1) {
    return RECIPROCAL(COSH(i1))
  }

  function CSCH(i1) {
    return RECIPROCAL(SINH(i1))
  }

  function COTH(i1) {
    return RECIPROCAL(TANH(i1))
  }

  function ASINH(i1) {
    // Monotonically increasing
    return new Interval(Math.asinh(i1.min), Math.asinh(i1.max), i1.defMin, i1.defMax, i1.contMin, i1.contMax)
  }

  function ACOSH(i1) {
    // Monotonically increasing, undefined for x < 1

    if (i1.max < 1) {
      return new Interval(0, 0, false, false, true, true)
    }

    let defMin = i1.min >= 1;

    let min = i1.min;
    if (!defMin)
      min = 1;

    return new Interval(Math.acosh(min), Math.acosh(i1.max), i1.defMin && defMin, i1.defMax, i1.contMin, i1.contMax)
  }

  function ATANH(i1) {
    // Monotonically increasing

    let max = Math.min(i1.max, 1);
    let min = Math.max(i1.min, -1);

    let defMin = i1.max === max && i1.min === min;

    return new Interval(Math.atanh(min), Math.atanh(max), i1.defMin && defMin, i1.defMax, i1.contMin, i1.contMax)
  }

  function ASECH(i1) {
    // Monotonically decreasing

    return ACOSH(RECIPROCAL(i1))
  }

  function ACSCH(i1) {
    return ASINH(RECIPROCAL(i1))
  }

  function ACOTH(i1) {
    return ATANH(RECIPROCAL(i1))
  }

  function CCHAIN(i1, compare, i2, ...args) {
    if (!i2)
      return YES.clone()

    let res;
    switch (compare) {
      case "<":
        res = LESS_THAN(i1, i2);
        break
      case ">":
        res = GREATER_THAN(i1, i2);
        break
      case "<=":
        res = LESS_EQUAL_THAN(i1, i2);
        break
      case ">=":
        res = GREATER_EQUAL_THAN(i1, i2);
        break
      case "!=":
        res = NOT_EQUAL(i1, i2);
        break
      case "==":
        res = EQUAL(i1, i2);
        break
      default:
        throw new Error("huh")
    }

    if (!res.max)
      return NO.clone()

    if (args.length > 0) {
      let ret = CCHAIN(val2, ...args);

      if (ret.min && res.min) {
        return YES.clone()
      } else if (!ret.max || !res.max) {
        return NO.clone()
      } else {
        return YESNT.clone()
      }
    }
  }


  const IntervalFunctions = Object.freeze({
    '+': ADD, '*': MULTIPLY, '/': DIVIDE, '-': SUBTRACT, '^': POW, 'pow_rational': POW_RATIONAL, 'sqrt': SQRT, 'cbrt': CBRT,
    '<': LESS_THAN, '>': GREATER_THAN, '<=': LESS_EQUAL_THAN, '>=': GREATER_EQUAL_THAN, '==': EQUAL, '!=': NOT_EQUAL,
    'gamma': GAMMA, 'digamma': DIGAMMA, 'trigamma': TRIGAMMA, 'polygamma': POLYGAMMA, 'sin': SIN, 'cos': COS, 'tan': TAN,
    'cchain': CCHAIN, 'sec': SEC, 'csc': CSC, 'cot': COT, 'asin': ASIN, 'acos': ACOS, 'atan': TAN, 'asec': ASEC, 'acsc': ACSC,
    'acot': ACOT, 'sinh': SINH, 'cosh': COSH, 'tanh': TANH, 'sech': SECH, 'csch': CSCH, 'coth': COTH, 'asinh': ASINH,
    'acosh': ACOSH, 'atanh': ATANH, 'acsch': ACSCH, 'asech': ASECH, 'acoth': ACOTH, 'ifelse': IFELSE, 'piecewise': PIECEWISE,
    'max': MAX, 'min': MIN
  });

  function generateContours2(func, curvatureFunc, xmin, xmax, ymin, ymax, searchDepth=7, renderingQuality=8, maxDepth=16) {
    let polyline = [];

    function add_contour_segment(x1, y1, x2, y2) {
      polyline.push(x1, y1, x2, y2, NaN, NaN);
    }

    function create_tree(depth, xmin, xmax, ymin, ymax, fxy, fxY, fXY, fXy) {
      let needs_subdivide = depth < searchDepth;

      if (depth <= maxDepth && !needs_subdivide) {
        let signxy = Math.sign(fxy);
        let signxY = Math.sign(fxY);
        let signXY = Math.sign(fXY);
        let signXy = Math.sign(fXy);

        // Search for contours
        if (signxy !== signxY || signxY !== signXY || signXY !== signXy) {
          let minDim = Math.min(xmax - xmin, ymax - ymin);
          let radius = Math.abs(curvatureFunc((xmax + xmin) / 2, (ymax + ymin) / 2));

          if (depth < maxDepth && radius < renderingQuality * minDim) {
            // subdivide
            needs_subdivide = true;
          } else {
            let side1 = signxy !== signxY;
            let side2 = signxY !== signXY;
            let side3 = signXY !== signXy;
            let side4 = signXy !== signxy;

            let side1x, side3x, side2y, side4y;
            let side1y, side3y, side2x, side4x;

            if (side1) {
              let side1a = Math.abs(fxy);
              let side1b = Math.abs(fxY);
              let side1ratio = side1a / (side1a + side1b);
              side1x = xmin;
              side1y = ymin + side1ratio * (ymax - ymin);
            }

            if (side3) {
              let side3a = Math.abs(fXy);
              let side3b = Math.abs(fXY);
              let side3ratio = side3a / (side3a + side3b);
              side3x = xmax;
              side3y = ymin + side3ratio * (ymax - ymin);
            }

            if (side2) {
              let side2a = Math.abs(fxY);
              let side2b = Math.abs(fXY);
              let side2ratio = side2a / (side2a + side2b);
              side2x = xmin + side2ratio * (xmax - xmin);
              side2y = ymax;
            }

            if (side4) {
              let side4a = Math.abs(fxy);
              let side4b = Math.abs(fXy);
              let side4ratio = side4a / (side4a + side4b);
              side4x = xmin + side4ratio * (xmax - xmin);
              side4y = ymin;
            }

            if (side1 && side2 && side3 && side4) {
              // Saddle point

              add_contour_segment(side1x, side1y, side3x, side3y);
              add_contour_segment(side2x, side2y, side4x, side4y);

              return
            }

            if (side1 && side3) {
              add_contour_segment(side1x, side1y, side3x, side3y);
              return
            }

            if (side2 && side4) {
              add_contour_segment(side2x, side2y, side4x, side4y);
              return
            }

            if (side1 && side2) {
              add_contour_segment(side1x, side1y, side2x, side2y);
            } else if (side2 && side3) {
              add_contour_segment(side3x, side3y, side2x, side2y);
            } else if (side3 && side4) {
              add_contour_segment(side3x, side3y, side4x, side4y);
            } else if (side4 && side1) {
              add_contour_segment(side1x, side1y, side4x, side4y);
            }
          }
        } else {
          // no contour, return
          return
        }
      }

      if (needs_subdivide) {
        // subdivide
        let midX = (xmin + xmax) / 2;
        let midY = (ymin + ymax) / 2;

        let mxmyCorner = func(midX, midY);
        let mxyCorner = func(midX, ymin);
        let mxYCorner = func(midX, ymax);
        let xmyCorner = func(xmin, midY);
        let XmyCorner = func(xmax, midY);

        create_tree(depth + 1, xmin, midX, ymin, midY, fxy, xmyCorner, mxmyCorner, mxyCorner);
        create_tree(depth + 1, xmin, midX, midY, ymax, xmyCorner, fxY, mxYCorner, mxmyCorner);
        create_tree(depth + 1, midX, xmax, ymin, midY, mxyCorner, mxmyCorner, XmyCorner, fXy);
        create_tree(depth + 1, midX, xmax, midY, ymax, mxmyCorner, mxYCorner, fXY, XmyCorner);
      }
    }

    let xyCorner = func(xmin, ymin);
    let xYCorner = func(xmin, ymax);
    let XYCorner = func(xmax, ymax);
    let XyCorner = func(xmax, ymin);

    create_tree(0, xmin, xmax, ymin, ymax, xyCorner, xYCorner, XYCorner, XyCorner);

    return polyline
  }

  /**
   * Plots an equation of x and y of the form equation(x,y) = 0.
   */
  class EquationPlot2D extends InteractiveElement {
    constructor(params={}) {
      super(params);

      this.equation = parseString("x^2+y");

      this.updateFunc();

      const disp = this.displayedElement = new WebGLPolyline();

      disp.pen.useNative = false;
      disp.pen.endcap = "butt";
      disp.pen.color = Colors.RED;

      this.addEventListener("plotcoordschanged", () => this.markUpdate());
    }

    setEquation(text) {
      if (typeof text === "string") {
        this.equation = parseString(text);
      } else if (text instanceof ASTNode) {
        this.equation = text;
      } else {
        throw new Error("Given equation is not text or AST")
      }

      this.updateFunc();
    }

    updateLight(adaptThickness=false) {
      if (!this.plot)
        return

      let transform = this.plot.transform;
      let previousTransform = this.previousTransform;
      let polyline = this.displayedElement;

      adaptPolyline(polyline, previousTransform, transform, adaptThickness);

      this.previousTransform = transform.clone();
    }

    updateFunc() {
      let exportedVariables = ['x', 'y'];

      let eqn = this.equation.compile(exportedVariables).func;
      let interval = this.equation.compileInterval(exportedVariables).func;
      //let real = this.equation.compileReal(exportedVariables)

      let fxNode = this.equation.derivative('x');
      let fyNode = this.equation.derivative('y');
      let fxxNode = fxNode.derivative('x');
      let fxyNode = fxNode.derivative('y');
      let fyyNode = fyNode.derivative('y');

      let fx = fxNode.compile(exportedVariables).func;
      let fy = fyNode.compile(exportedVariables).func;
      let fxx = fxxNode.compile(exportedVariables).func;
      let fxy = fxyNode.compile(exportedVariables).func;
      let fyy = fyyNode.compile(exportedVariables).func;

      let curvatureFunc = (x, y) => {
        let fxV = fx(x, y), fyV = fy(x, y), fxxV = fxx(x, y), fxyV = fxy(x,y), fyyV = fyy(x, y);
        let fxVSq = fxV * fxV, fyVSq = fyV * fyV;

        return (fxVSq + fyVSq) ** 1.5 / (fyVSq * fxxV - 2 * fxV * fyV * fxyV + fxVSq * fyyV)
      };

      this.compiledFunctions = {
        eqn,
        interval,
        curvatureFunc
      };
    }

    update(info) {
      super.update();

      if (this.plot) {
        let coords = this.plot.transform.coords;
        let vertices = generateContours2(this.compiledFunctions.eqn, this.compiledFunctions.curvatureFunc, coords.x1, coords.x2, coords.y1, coords.y2);

        this.plot.transform.plotToPixelArr(vertices);

        this.displayedElement.vertices = vertices;
        this.displayedElement.update(info);

        this.previousTransform = this.plot.transform.clone();
      }
    }

    render(info) {
      if (this.visible) {
        const gl = info.universe.gl;
        const box = info.plot.transform.box;

        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(box.top_left.x * dpr,
          box.top_left.y * dpr,
          box.width * dpr,
          box.height * dpr);

        this.displayedElement.render(info);

        gl.disable(gl.SCISSOR_TEST);
      }
    }
  }

  // Takes in a function of arity 2, as well as (x1, y1, x2, y2) the box to plot in and xDivide yDivide, the number of
  // times to divide in each direction
  function intervalEqFindBoxes(func, x1, y1, x2, y2, xDivide, yDivide) {
    let rectangles = [];

    while (true) {
      if (xDivide === 0 && yDivide === 0) {
        break
      }

      // mode 0 means divide into four, mode 1 means divide along x, mode 2 means divide along y
      let dividingMode = 0;

      if (yDivide > xDivide) {
        dividingMode = 2;
        ++xDivide;
      } else if (yDivide < xDivide) {
        dividingMode = 1;
        ++yDivide;
      }

      --xDivide;
      --yDivide;

      let new_rectangles = [];

      for (let i = 0; i < rectangles.length; i += 4) {
        let x1 = rectangles[i], y1 = rectangles[i+1], x2 = rectangles[i+2], y2 = rectangles[i+3];
        if (dividingMode === 0) {
          let xm = (x1 + x2) / 2;
          let ym = (y1 + y2) / 2;

          let xInt1 = new Interval(x1, xm);
          let xInt2 = new Interval(xm, x2);
          let yInt1 = new Interval(y1, ym);
          let yInt2 = new Interval(ym, y2);

          if (func(xInt1, yInt1).contains(0)) {
            new_rectangles.push(x1, xm, y1, ym);
          }

          if (func(xInt1, yInt2).contains(0)) {
            new_rectangles.push(x1, xm, ym, y2);
          }

          if (func(xInt2, yInt2).contains(0)) {
            new_rectangles.push(xm, x2, ym, y2);
          }

          if (func(xInt2, yInt1).contains(0)) {
            new_rectangles.push(xm, x2, y1, ym);
          }
        } else if (dividingMode === 1) {
          let xm = (x1 + x2) / 2;

          let xInt1 = new Interval(x1, xm);
          let xInt2 = new Interval(xm, x2);

          let yInt = new Interval(y1, y2);

          if (func(xInt1, yInt).contains(0)) {
            new_rectangles.push(x1, xm, y1, y2);
          }

          if (func(xInt2, yInt).contains(0)) {
            new_rectangles.push(xm, x2, y1, y2);
          }
        } else if (dividingMode === 2) {
          let ym = (y1 + y2) / 2;

          let yInt1 = new Interval(y1, ym);
          let yInt2 = new Interval(ym, y2);

          let xInt = new Interval(x1, x2);

          if (func(xInt, yInt1).contains(0)) {
            new_rectangles.push(x1, x2, y1, ym);
          }

          if (func(xInt, yInt2).contains(0)) {
            new_rectangles.push(x1, x2, ym, y2);
          }
        }
      }

      rectangles = new_rectangles;
    }

    return rectangles
  }

  /**
   * Returns e^(i theta) for real theta.
   * @param theta {number}
   * @returns {Complex} cis(theta)
   */
  const Cis = (theta) => {
    // For real theta
    let c = Math.cos(theta);
    let s = Math.sin(theta);

    return new Complex$1(c, s)
  };

  /**
   * Returns e^z for complex z.
   * @param z {Complex}
   * @returns {Complex}
   */
  const Exp = (z) => {
    let magnitude = Math.exp(z.re);

    let angle = z.im;

    return Cis(angle).scale(magnitude)
  };

  /**
   * Return the principal value of z^w.
   * @param z {Complex}
   * @param w {Complex}
   * @returns {Complex}
   */
  const Pow = (z, w) => {
    return Exp(Multiply(w, new Complex$1(Math.log(z.magnitude()), z.arg())))
  };

  /**
   * Multivalued version of z^w.
   * @param z {Complex}
   * @param w {Complex}
   * @param branch {number}
   * @returns {Complex}
   */
  const PowBranched = (z, w, branch=0) => {
    return Multiply(Pow(z, w), Exp(Multiply(Complex$1.I, w.scale(2 * Math.PI * branch))))
  };

  /**
   * z^r, where r is a real number.
   * @param z {Complex}
   * @param r {number}
   * @returns {Complex}
   */
  const PowR = (z, r) => {
    return Pow(z, new Complex$1(r))
  };

  const PowZ = (r, z) => {
    if (r === 0)
      return new Complex$1(0)

    return Exp(Multiply(z, new Complex$1(Math.log(Math.abs(r)), r > 0 ? 0 : Math.PI)))
  };

  /**
   * z^r, where r is a real number, branched.
   * @param z {Complex}
   * @param r {number}
   * @param branch {number}
   * @returns {Complex}
   */
  const PowRBranched = (z, r, branch=0) => {
    return PowBranched(z, new Complex$1(r), branch)
  };

  /**
   * Returns z^n, where n is a positive integer
   * @param z {Complex} The base of the exponentiation.
   * @param n {number} Positive integer, exponent.
   * @returns {Complex}
   */
  const PowN = (z, n) => {
    if (n === 0) {
      return new Complex$1(1, 0)
    } else if (n === 1) {
      return z.clone()
    } else if (n === -1) {
      return z.conj().scale(1 / z.magnitudeSquared())
    } else if (n === 2) {
      return Multiply(z, z)
    }

    let mag = z.magnitude();
    let angle = z.arg();

    let newMag = Math.pow(mag, n);
    let newAngle = angle * n;

    return Cis(newAngle).scale(newMag)
  };

  /**
   * Returns the principal value of sqrt(z).
   * @param z {Complex}
   * @returns {Complex}
   */
  const Sqrt = (z) => {
    // Handle real z specially
    if (Math.abs(z.im) < 1e-17) {
      let r = z.re;

      if (r >= 0) {
        return new Complex$1(Math.sqrt(r))
      } else {
        return new Complex$1(0, Math.sqrt(-r))
      }
    }

    let r = z.magnitude();

    let zR = Add(z, new Complex$1(r)).normalize();

    return zR.scale(Math.sqrt(r))
  };

  /**
   * Branched version of Sqrt(z).
   * @param z {Complex}
   * @param branch {number}
   * @returns {Complex}
   */
  const SqrtBranched = (z, branch=0) => {
    if (branch % 2 === 0) {
      return Sqrt(z)
    } else {
      return Multiply(new Complex$1(-1, 0), Sqrt(z))
    }
  };

  /**
   * Principal value of cbrt(z).
   * @param z {Complex}
   * @returns {Complex}
   */
  const Cbrt = (z) => {
    return PowR(z, 1/3)
  };

  /**
   * Multivalued version of Cbrt(z).
   * @param z {Complex}
   * @param branch {number}
   * @returns {Complex}
   */
  const CbrtBranched = (z, branch=0) => {
    return PowRBranched(z, 1/3, branch)
  };

  var PowFunctions = /*#__PURE__*/Object.freeze({
    Pow: Pow,
    PowBranched: PowBranched,
    PowR: PowR,
    PowZ: PowZ,
    PowRBranched: PowRBranched,
    PowN: PowN,
    Sqrt: Sqrt,
    SqrtBranched: SqrtBranched,
    Cbrt: Cbrt,
    CbrtBranched: CbrtBranched
  });

  // sin(a+bi) = sin a cosh b + i cos a sinh b
  const Sin = (z) => {
    let a = z.re, b = z.im;
    let sinA = Math.sin(a);
    let cosA = Math.cos(a);

    let sinhB = Math.sinh(b);
    let coshB = Math.sqrt(1 + sinhB * sinhB);

    return new Complex$1(sinA * coshB, cosA * sinhB)
  };

  // cos(a+bi) = cos a cosh b - i sin a sinh b
  const Cos = (z) => {
    let a = z.re, b = z.im;
    let sinA = Math.sin(a);
    let cosA = Math.cos(a);

    let sinhB = Math.sinh(b);
    let coshB = Math.sqrt(1 + sinhB * sinhB);

    return new Complex$1(cosA * coshB, -sinA * sinhB)
  };

  // tan(a+bi) = (tan a + i tanh b) / (1 - i tan a tanh b)
  const Tan = (z) => {
    let a = z.re, b = z.im;

    let tanA = Math.tan(a);
    let tanhB = Math.tanh(b);

    return Divide(new Complex$1(tanA, tanhB), new Complex$1(1, -tanA * tanhB))
  };

  // sec(a+bi) = 1 / cos(a+bi)
  const Sec = (z) => {
    return Divide(Complex$1.One, Cos(z))
  };

  // csc(a+bi) = 1 / sin(a+bi)
  const Csc = (z) => {
    return Divide(Complex$1.One, Sin(z))
  };

  // sec(a+bi) = 1 / cos(a+bi)
  const Cot = (z) => {
    return Divide(Complex$1.One, Tan(z))
  };

  var TrigFunctions = /*#__PURE__*/Object.freeze({
    Sin: Sin,
    Cos: Cos,
    Tan: Tan,
    Sec: Sec,
    Csc: Csc,
    Cot: Cot
  });

  /**
   * Returns ln(z), where ln is the natural logarithm.
   * @param z {Complex}
   * @returns {Complex}
   */
  const Ln = (z) => {
    let mag = Math.log(z.magnitude());
    let theta = z.arg();

    return new Complex$1(mag, theta)
  };

  /**
   * The multivalued version of ln(z). In other words, if ln(z) is the principal value of ln(z), it returns
   * ln(z) + 2 * pi * i * branch, where branch is an integer.
   * @param z {Complex}
   * @param branch {number}
   * @returns {Complex}
   */
  const LnBranched = (z, branch=0) => {
    return Add(Ln(z), Complex$1.I.scale(2 * Math.PI * branch))
  };

  /* Alias for Ln */
  const Log = Ln;

  /* Alias for LnBranched */
  const LogBranched = LnBranched;

  // Constants
  const LN10 = Math.log(10);
  const LN2 = Math.log(2);

  /**
   * log10(z) (principal value)
   * @param z {Complex}
   * @returns {Complex}
   */
  const Log10 = (z) => {
    return Ln(z).scale(1 / LN10)
  };

  /**
   * log10(z) (branched)
   * @param z {Complex}
   * @returns {Complex}
   */
  const Log10Branched = (z, branch=0) => {
    return LnBranched(z, branch).scale(1 / LN10)
  };

  /**
   * log2(z) (principal value)
   * @param z {Complex}
   * @returns {Complex}
   */
  const Log2 = (z) => {
    return Ln(z).scale(1 / LN2)
  };

  /**
   * log2(z) (branched)
   * @param z {Complex}
   * @returns {Complex}
   */
  const Log2Branched = (z, branch=0) => {
    return LnBranched(z, branch).scale(1 / LN2)
  };

  /**
   * Log base b of z
   * @param b {Complex}
   * @param z {Complex}
   * @returns {Complex}
   */
  const LogB = (b, z) => {
    if (b.equals(z))
      return Complex$1.One

    return Divide(Ln(z), Ln(b))
  };

  /**
   * Log base b of z, multivalued
   * @param b {Complex}
   * @param z {Complex}
   * @param branch {number} Integer, which branch to evaluate
   * @returns {Complex}
   */
  const LogBBranched = (b, z, branch=0) => {
    if (branch === 0 && b.equals(z))
      return Complex$1.One

    return Divide(LnBranched(z, branch), LnBranched(b, branch))
  };

  var LnFunctions = /*#__PURE__*/Object.freeze({
    Ln: Ln,
    LnBranched: LnBranched,
    Log: Log,
    LogBranched: LogBranched,
    Log10: Log10,
    Log10Branched: Log10Branched,
    Log2: Log2,
    Log2Branched: Log2Branched,
    LogB: LogB,
    LogBBranched: LogBBranched
  });

  /**
   * Returns sinh(z).
   * @param z {Complex}
   * @returns {Complex}
   */
  const Sinh = (z) => {
    let a = z.re, b = z.im;

    let sinhA = Math.sinh(a);
    let coshA = Math.sqrt(1 + sinhA * sinhA);

    let sinB = Math.sin(b);
    let cosB = Math.cos(b);

    return new Complex$1(sinhA * cosB, coshA * sinB)
  };

  /**
   * Returns cosh(z).
   * @param z {Complex}
   * @returns {Complex}
   */
  const Cosh = (z) => {
    let a = z.re, b = z.im;

    let sinhA = Math.sinh(a);
    let coshA = Math.sqrt(1 + sinhA * sinhA);

    let sinB = Math.sin(b);
    let cosB = Math.cos(b);

    return new Complex$1(coshA * cosB, sinhA * sinB)
  };

  /**
   * Returns tanh(z).
   * @param z {Complex}
   * @returns {Complex}
   */
  const Tanh = (z) => {
    let a = 2 * z.re, b = 2 * z.im;

    let sinhA = Math.sinh(a);
    let coshA = Math.sqrt(1 + sinhA * sinhA);

    let sinB = Math.sin(b);
    let cosB = Math.cos(b);

    return new Complex$1(sinhA, sinB).scale(1 / (coshA + cosB))
  };

  /**
   * Returns sech(z).
   * @param z {Complex}
   * @returns {Complex}
   */
  const Sech = (z) => {
    return Divide(Complex$1.One, Cosh(z))
  };

  /**
   * Returns csch(z).
   * @param z {Complex}
   * @returns {Complex}
   */
  const Csch = (z) => {
    return Divide(Complex$1.One, Sinh(z))
  };

  /**
   * Returns coth(z).
   * @param z {Complex}
   * @returns {Complex}
   */
  const Coth = (z) => {
    return Divide(Complex$1.One, Tanh(z))
  };

  var HyperbolicTrigFunctions = /*#__PURE__*/Object.freeze({
    Sinh: Sinh,
    Cosh: Cosh,
    Tanh: Tanh,
    Sech: Sech,
    Csch: Csch,
    Coth: Coth
  });

  // arcsin(z) = -i * ln(i * z + sqrt(1 - z^2))
  const Arcsin = (z) => Multiply(Complex$1.I.scale(-1), // -i
    Ln(Add(Multiply(Complex$1.I, z),                              // i * z
      Sqrt(Subtract(Complex$1.One, Multiply(z, z))))));            // sqrt(1 - z^2

  // arccos(z) = pi/2 + i * ln(i * z + sqrt(1 - z^2))
  const Arccos = (z) => Add(new Complex$1(Math.PI / 2), // pi / 2
    Multiply(Complex$1.I, Ln(Add(Multiply(Complex$1.I, z),           // i * ln(iz
      Sqrt(Subtract(Complex$1.One, Multiply(z, z)))))));            // + sqrt(1 - z^2)

  // arctan(z) = i/2 * ln( (i+z) / (1-z) )
  const Arctan = (z) => Multiply(Complex$1.I.scale(1/2),  // i / 2
    Ln(Divide(Add(Complex$1.I, z), Subtract(Complex$1.I, z))));      // ln( (i+z) / (1-z) )

  // arcsec(z) = arccos(1 / z)
  const Arcsec = (z) => Arccos(Divide(Complex$1.One, z));

  // arccsc(z) = arcsin(1 / z)
  const Arccsc = (z) => Arcsin(Divide(Complex$1.One, z));

  // arccot(z) = pi / 2 - arctan(z)
  const Arccot = (z) => Subtract(new Complex$1(Math.PI / 2), Arctan(z));

  // Branched variants of the inverse trig functions
  const ArcsinBranched = (z, branch=0) => {
    return Add(Arcsin(z), new Complex$1(2 * Math.PI * branch))
  };

  const ArccosBranched = (z, branch=0) => {
    return Add(Arccos(z), new Complex$1(2 * Math.PI * branch))
  };

  const ArctanBranched = (z, branch=0) =>
    Add(Arctan(z), new Complex$1(Math.PI * branch));

  const ArcsecBranched = (z, branch=0) => ArccosBranched(Divide(Complex$1.One, z), branch);

  const ArccscBranched = (z, branch=0) => ArcsinBranched(Divide(Complex$1.One, z), branch);

  const ArccotBranched = (z, branch=0) =>
    Subtract(new Complex$1(Math.PI / 2), ArctanBranched(z, -branch));

  var InverseTrigFunctions = /*#__PURE__*/Object.freeze({
    Arcsin: Arcsin,
    Arccos: Arccos,
    Arctan: Arctan,
    Arcsec: Arcsec,
    Arccsc: Arccsc,
    Arccot: Arccot,
    ArcsinBranched: ArcsinBranched,
    ArccosBranched: ArccosBranched,
    ArctanBranched: ArctanBranched,
    ArcsecBranched: ArcsecBranched,
    ArccscBranched: ArccscBranched,
    ArccotBranched: ArccotBranched
  });

  // arcsinh(z) = ln(z + sqrt(z^2 + 1))
  const Arcsinh = (z) => Ln(Add(z, Sqrt(Add(Multiply(z, z), Complex$1.One))));

  // arccosh(z) = ln(z + sqrt(z^2 - 1))
  const Arccosh = (z) => Ln(Add(z, Multiply(Sqrt(Add(z, Complex$1.One)), Sqrt(Subtract(z, Complex$1.One)))));

  // arctanh(z) = 1/2 * ln( (1+z) / (1-z) )
  const Arctanh = (z) => Ln(Divide(Add(Complex$1.One, z), Subtract(Complex$1.One, z))).scale(1/2);

  const Arcsech = (z) => Arccosh(Divide(Complex$1.One, z));

  // arccsch(z) = arcsinh(1/z)
  const Arccsch = (z) => Arcsinh(Divide(Complex$1.One, z));

  // arccoth(z) = arctanh(1/z)
  const Arccoth = (z) => Arctanh(Divide(Complex$1.One, z));

  // Branched variants of the normal functions
  // arcsinh(z) = ln(z + sqrt(z^2 + 1))
  const ArcsinhBranched = (z, branch=0) =>
    LnBranched(Add(z, Sqrt(Add(Multiply(z, z), Complex$1.One))), branch);

  // arccosh(z) = ln(z + sqrt(z^2 - 1))
  const ArccoshBranched = (z, branch=0) =>
    LnBranched(Add(z, Multiply(Sqrt(Add(z, Complex$1.One)), Sqrt(Subtract(z, Complex$1.One)))), branch);

  // arctanh(z) = 1/2 * ln( (1+z) / (1-z) )
  const ArctanhBranched = (z, branch=0) =>
    LnBranched(Divide(Add(Complex$1.One, z), Subtract(Complex$1.One, z)), branch).scale(1/2);

  const ArcsechBranched = (z, branch=0) => ArccoshBranched(Divide(Complex$1.One, z), branch);

  // arccsch(z) = arcsinh(1/z)
  const ArccschBranched = (z, branch=0) => ArcsinhBranched(Divide(Complex$1.One, z), branch);

  // arccoth(z) = arctanh(1/z)
  const ArccothBranched = (z, branch=0) => ArctanhBranched(Divide(Complex$1.One, z), branch);

  var InverseHyperbolicFunctions = /*#__PURE__*/Object.freeze({
    Arcsinh: Arcsinh,
    Arccosh: Arccosh,
    Arctanh: Arctanh,
    Arcsech: Arcsech,
    Arccsch: Arccsch,
    Arccoth: Arccoth,
    ArcsinhBranched: ArcsinhBranched,
    ArccoshBranched: ArccoshBranched,
    ArctanhBranched: ArctanhBranched,
    ArcsechBranched: ArcsechBranched,
    ArccschBranched: ArccschBranched,
    ArccothBranched: ArccothBranched
  });

  function Gamma(z) {
    if (z.re < 1/2) {
      // Gamma(z) * Gamma(1-z) = pi / sin(pi * z)
      // Gamma(z) = pi / sin(pi * z) / Gamma(1-z)

      return Divide(new Complex$1(Math.PI), Multiply(Sin(z.scale(Math.PI)), Gamma(Subtract(Complex$1.One, z))))
    }

    if (Math.abs(z.im) < 1e-17) {
      return new Complex$1(gamma$1(z.re))
    }

    // We use the Lanczos approximation for the factorial function.
    z.re -= 1;
    let x = new Complex$1(LANCZOS_COEFFICIENTS[0]);

    let newZ = z.clone();
    let re, im, mag2;

    for (let i = 1; i < LANCZOS_COEFFICIENTS.length; ++i) {
      let coeff = LANCZOS_COEFFICIENTS[i];

      newZ.re += 1;

      re = newZ.re * coeff;
      im = -newZ.im * coeff;

      mag2 = newZ.magnitudeSquared();

      re /= mag2;
      im /= mag2;

      x.re += re;
      x.im += im;
    }

    let t = z.clone();
    t.re += LANCZOS_COEFFICIENTS.length - 1.5;

    return Multiply(new Complex$1(Math.sqrt(2 * Math.PI)),
      Multiply(x, Multiply(
        Pow(t, Add(z, new Complex$1(0.5))),
        Exp(t.scale(-1)))))
  }

  /**
   * Evaluates the digamma function of z.
   * @param z {Complex}
   * @return {Complex}
   */
  function Digamma(z) {
    if (z.re < 0.5) {
      // psi(1-x) - psi(x) = pi cot(pi x)
      // psi(x) = psi(1-x) - pi cot (pi x)

      return Subtract(Digamma(Subtract(Complex$1.One, z)), Cot(z.scale(Math.PI)).scale(Math.PI))
    } else if (z.re < 15) {
      // psi(x+1) = psi(x) + 1/x
      // psi(x) = psi(x+1) - 1/x

      let sum = new Complex$1(0);
      let one = Complex$1.One;

      while (z.re < 15) {
        let component = Divide(one, z);

        z.re += 1;

        sum.re += component.re;
        sum.im += component.im;
      }

      return Subtract(Digamma(z), sum)
    }

    let egg = new Complex$1(1);
    let sum = Ln(z);

    for (let n = 1; n < 15; ++n) {
      let coeff = Math.abs(GREGORY_COEFFICIENTS[n]);

      egg = Divide(Multiply(egg, new Complex$1(((n-1) ? (n-1) : 1))), Add(z, new Complex$1(n - 1)));

      sum.re -= coeff * egg.re;
      sum.im -= coeff * egg.im;
    }

    return sum
  }

  let coeffs = [[1, 1], [2, 1 / 2], [3, 1 / 6], [5, 1 / 30], [7, 1 / 42], [9, 1 / 30], [11, 5 / 66], [13, 691 / 2730], [15, 7 / 6]];

  /**
   *
   * @param z
   * @returns {Complex}
   */
  function Trigamma(z) {
    if (Math.abs(z.im) < 1e-17)
      return new Complex$1(trigamma(z.re))

    if (z.re < 0.5) {
      // psi_1(1-z) + psi_1(z) = pi^2 / (sin^2 pi z)
      // psi_1(z) = pi^2 / (sin^2 pi z) - psi_1(1-z)

      return Subtract(Divide(new Complex$1(Math.PI * Math.PI), PowN(Sin(z.scale(Math.PI)), 2)), Trigamma(Subtract(Complex$1.One, z)))
    } else if (z.re < 20) {
      // psi_1(z+1) = psi_1(z) - 1/z^2
      // psi_1(z) = psi_1(z+1) + 1/z^2

      let sum = new Complex$1(0);

      while (z.re < 20) {
        let component = PowN(z, -2);

        z.re += 1;

        sum.re += component.re;
        sum.im += component.im;
      }

      return Add(Trigamma(z), sum)
    }

    let sum = new Complex$1(0);

    for (let coeffPair of coeffs) {
      let pow = coeffPair[0];
      let coeff = coeffPair[1];

      let part = Multiply(new Complex$1(coeff), PowN(z, -pow));

      sum.re += part.re;
      sum.im += part.im;
    }

    return sum
  }

  /**
   * Returns polygamma(m, z), where polygamma is the mth logarithmic derivative of the gamma function.
   * @param m {number}
   * @param z {Complex}
   * @returns {Complex}
   */
  function Polygamma(m, z) {
    if (m < 0)
      return new Complex$1(NaN, NaN)
    if (m % 1 !== 0)
      return new Complex$1(NaN, NaN)

    if (m === 0)
      return Digamma(z)
    else if (m === 1)
      return Trigamma(z)

    let sign = (m % 2 === 0) ? -1 : 1;
    let numPoly = getPolygammaNumeratorPolynomial(m);

    if (z < 0.5) {
      if (z % 1 === 0)
        return new Complex$1(Infinity)

      // Reflection formula, see https://en.wikipedia.org/wiki/Polygamma_function#Reflection_relation
      // psi_m(z) = pi ^ (m+1) * numPoly(cos(pi z)) / (sin ^ (m+1) (pi z)) + (-1)^(m+1) psi_m(1-z)

      return Multiply(new Complex$1(-1), Divide(numPoly.evaluateComplex(Cos(z.scale(Math.PI))).scale(Math.pow(Math.PI, m + 1)),
        (PowN(Sin(z.scale(Math.PI)), m+1)) + sign * Polygamma(m, Subtract(Complex$1.One, z))))
    } else if (z < 8) {
      // Recurrence relation
      // psi_m(z) = psi_m(z+1) + (-1)^(m+1) * m! / z^(m+1)

      return Add(Polygamma(m, z+1), Divide(new Complex$1(sign * gamma$1(m + 1)), PowN(z, m+1)))
    }

    // Series representation

    let sum = new Complex$1(0);

    for (let i = 0; i < 200; ++i) {
      let component = Divide(Complex$1.One, PowN(Add(z, new Complex$1(i)), m + 1));
      sum.re += component.re;
      sum.im += component.im;
    }

    return Multiply(new Complex$1(sign * gamma$1(m + 1)), sum)
  }

  const logPi = Math.log(Math.PI);
  const logSqrt2Pi = Math.log(2 * Math.PI) / 2;

  function LnGamma (z) {
    if (Math.abs(z.im) < 1e-17) {
      return new Complex$1(ln_gamma(z.re))
    }

    if (z.re < 0.5) {
      // Compute via reflection formula
      let reflected = LnGamma(Subtract(Complex$1.One, z));

      return Subtract(Subtract(new Complex$1(logPi), Ln(Sin(Multiply(new Complex$1(Math.PI), z)))), reflected)
    } else {
      z.re -= 1;

      const g = 7;

      var x = new Complex$1(LANCZOS_COEFFICIENTS[0]);

      for (var i = 1; i < g + 2; i++) {
        let component = Divide(new Complex$1(LANCZOS_COEFFICIENTS[i]), Add(z, new Complex$1(i)));

        x.re += component.re;
        x.im += component.im;
      }

      var t = Add(z, new Complex$1(g + 0.5));

      return Add(new Complex$1(logSqrt2Pi), Add(Subtract(Multiply(Ln(t), Add(z, new Complex$1(0.5))), t), Ln(x)))
    }
  }

  const ZETA_N = 30;
  const ZETA_COEFFS = [];

  for (let k = 0; k <= ZETA_N; ++k) {
    let value = 0;

    for (let j = k; j <= ZETA_N; ++j) {
      value += gamma$1(ZETA_N + j - 1) * 4 ** j / gamma$1(ZETA_N - j) / gamma$1(2 * j);
    }

    value *= ZETA_N;

    ZETA_COEFFS.push(value);
  }

  function zeta(r) {
    if (r === 1)
      return Infinity

    if (r % 2 === 0 && r < 0)
      return 0

    if (r < 0.5) {
      // zeta(s) = 2 ^ s * pi ^ (s - 1) * sin( pi * s / 2 ) * gamma( 1 - s ) * zeta( 1 - s )

      return 2 ** r * Math.PI ** (r - 1) * Math.sin(Math.PI * r / 2) * gamma$1(1 - r) * zeta(1 - r)
    }

    if (r === 0.5) {
      return -1.4603545088095868
    }

    let seriesSum = 0;
    let sign = 1;

    for (let k = 0; k < ZETA_N; ++k) {
      seriesSum += sign * ZETA_COEFFS[k+1] / ((k+1) ** r);

      sign *= -1;
    }

    return seriesSum / (ZETA_COEFFS[0] * (1 - 2 ** (1 - r)))
  }

  function eta(r) {
    return (1 - 2 ** (1 - r)) * zeta(r)
  }

  zeta.coeffs = ZETA_COEFFS;
  zeta.n = ZETA_N;

  let ZETA_COEFFS$1 = zeta.coeffs;
  let ZETA_N$1 = zeta.n;

  function Chi(s) {
    let powers = Multiply(PowZ(2, s), PowZ(Math.PI, Subtract(s, new Complex$1(1))));

    let sine = Sin(s.scale(Math.PI / 2));

    let gamma = Gamma(Subtract(new Complex$1(1), s));

    return Multiply(powers, Multiply(sine, gamma))
  }

  function RiemannSiegel(z) {
    let t = z.im;
    let m = 10;

    let chiS = Chi(z);

    let sum = new Complex$1(0);

    let mZ = z.scale(-1);

    for (let n = 1; n <= m; ++n) {
      let component = PowZ(n, mZ);

      sum.re += component.re;
      sum.im += component.im;
    }

    let secondSum = new Complex$1(0);

    let oneMz = Subtract(z, new Complex$1(1));

    for (let n = 1; n <= m; ++n) {
      let component = PowZ(n, oneMz);

      secondSum.re += component.re;
      secondSum.im += component.im;
    }

    secondSum = Multiply(chiS, secondSum);

    return Add(sum, secondSum)
  }

  // Implementation of the riemann zeta function for complex numbers

  function Zeta(z) {
    if (Math.abs(z.im) < 1e-17)
      return new Complex$1(zeta(z.re))

    if (z.re < 0.5) {
      // Reflection formula

      return Multiply(Chi(z), Zeta(Subtract(new Complex$1(1), z)))
    }

    if (0 <= z.re && z.re <= 1 && Math.abs(z.im) > 48.005150881167159727942472749427) {
      return RiemannSiegel(z)
    }

    // series time

    let seriesSum = new Complex$1(0);

    let sign = new Complex$1(1);

    for (let k = 0; k < ZETA_N$1; ++k) {
      let component = Divide(sign, PowZ(k + 1, z)).scale(ZETA_COEFFS$1[k + 1]);

      seriesSum.re += component.re;
      seriesSum.im += component.im;

      sign.re *= -1;
    }

    return Divide(seriesSum, Multiply(new Complex$1(ZETA_COEFFS$1[0]), Subtract(new Complex$1(1), PowZ(2, Subtract(new Complex$1(1), z)))))
  }

  // Dirichlet eta function
  function Eta(z) {
    return Multiply(Zeta(z), Subtract(new Complex$1(1), PowZ(2, Subtract(new Complex$1(1), z))))
  }

  const Sinc = (x) => {
    if (x.re === 0 && x.im === 0)
      return new Complex(1)

    return Divide(Sin(x), x)
  };

  const NormSinc = (x) => {
    return Sinc(x.scale(Math.PI))
  };

  var MiscSpecial = /*#__PURE__*/Object.freeze({
    Sinc: Sinc,
    NormSinc: NormSinc
  });

  const EI_COEFFS = [];

  function getEiCoeff(n) {
    for (let i = EI_COEFFS.length; i <= n; ++i) {
      let sum = 0;

      for (let k = 0; k <= Math.floor((n - 1) / 2); ++k) {
        sum += 1 / (2 * k + 1);
      }

      EI_COEFFS[i] = sum;
    }

    return EI_COEFFS[n]
  }

  function E1(x) {
    if (x === 0)
      return Infinity
    // see https://www.sciencedirect.com/science/article/pii/S0022169499001845?via%3Dihub
    if (x > 0) {
      const q = 20 / 47 * x ** xPow;
      const h = 1 / (1 + x * Math.sqrt(x)) + hInf * q / (1 + q);

      return Math.exp(-x) / (G + (1 - G) * Math.exp(-x / (1 - G))) * Math.log(1 + G / x - (1 - G) / (h + b * x) ** 2)
    } else {
      return -ei(-x)
    }
  }

  const G = Math.exp(-eulerGamma);
  const b = Math.sqrt(2 * (1 - G) / (G * (2 - G)));
  const hInf = (1-G) * (G * G - 6 * G + 12) / (3 * G * (2 - G) ** 2 * b);
  const xPow = Math.sqrt(31 / 26);

  // The exponential integral Ei(x).
  // E1(z) = euler_gamma + ln(z) + exp(z / 2) * sum((-1)^(n-1) x^n / (n! 2^(n-1)) * sum(1 / (2k + 1) for k in [0, floor((n-1)/2)]) for n in [1, infinity])
  function ei(x) {
    if (x === 0)
      return -Infinity

    if (x < 0) {
      return -E1(-x)
    } else {
      let sum = 0;

      let z = 1, component = 0;

      let terms = Math.min(100, Math.max(4 * x ** 0.75, 8));

      for (let n = 1; n < terms; ++n) {
        z *= x / n;

        component = z * getEiCoeff(n);

        z *= -1 / 2;

        sum += component;
      }

      return eulerGamma + Math.log(x) + Math.exp(x / 2) * sum
    }
  }

  // The logarithmic integral li(x).
  function li(x) {
    return ei(Math.log(x))
  }

  const Ei = (z) => {
    if (z.im < 1e-17)
      return new Complex$1(ei(z.re))

    let sum = new Complex$1(0);
    let accum = new Complex$1(1);

    let terms = Math.min(Math.max(4 * z.magnitudeSquared() ** 0.375, 8), 100);

    for (let n = 1; n < terms; ++n) {
      accum = Multiply(accum, z.scale(1/n));

      let component = accum.scale(getEiCoeff(n));

      accum.re *= -0.5;
      accum.im *= -0.5;

      sum.re += component.re;
      sum.im += component.im;
    }

    return Add(new Complex$1(eulerGamma), Add(Ln(z), Multiply(Exp(z.scale(0.5)), sum)))
  };

  const Li = (z) => {
    return Ei(Ln(z))
  };

  var ExpIntegrals = /*#__PURE__*/Object.freeze({
    Ei: Ei,
    Li: Li
  });

  function Si(z) {
    throw new Error("unimplemented")
  }

  function Ci(z) {
    throw new Error("unimplemented")``
  }

  var TrigIntegrals = /*#__PURE__*/Object.freeze({
    Si: Si,
    Ci: Ci
  });

  const p = 0.3275911;
  const ERF_POLY = new SingleVariablePolynomial([0, 0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429]);

  function erf(x) {
    if (x === 0)
      return 0
    if (x < 0)
      return -erf(-x)

    let t = 1 / (1 + p * x);

    return 1 - ERF_POLY.evaluate(t) * Math.exp(- x * x)
  }

  function erfc(x) {
    return 1 - erf(x)
  }

  function fmaf(x, y, a) {
    return x * y + a
  }


  // Credit to https://stackoverflow.com/questions/27229371/inverse-error-function-in-c
  function inverseErf(x) {
    if (x === 0)
      return 0

    let p = 0, r = 0, t = 0;
    t = - x * x + 1;
    t = Math.log(t);

    if (Math.abs(t) > 6.125) { // maximum ulp error = 2.35793
      p = 3.03697567e-10; //  0x1.4deb44p-32
      p = fmaf (p, t,  2.93243101e-8); //  0x1.f7c9aep-26
      p = fmaf (p, t,  1.22150334e-6); //  0x1.47e512p-20
      p = fmaf (p, t,  2.84108955e-5); //  0x1.dca7dep-16
      p = fmaf (p, t,  3.93552968e-4); //  0x1.9cab92p-12
      p = fmaf (p, t,  3.02698812e-3); //  0x1.8cc0dep-9
      p = fmaf (p, t,  4.83185798e-3); //  0x1.3ca920p-8
      p = fmaf (p, t, -2.64646143e-1); // -0x1.0eff66p-2
      p = fmaf (p, t,  8.40016484e-1); //  0x1.ae16a4p-1
    } else { // maximum ulp error = 2.35456
      p =              5.43877832e-9;  //  0x1.75c000p-28
      p = fmaf (p, t,  1.43286059e-7); //  0x1.33b458p-23
      p = fmaf (p, t,  1.22775396e-6); //  0x1.49929cp-20
      p = fmaf (p, t,  1.12962631e-7); //  0x1.e52bbap-24
      p = fmaf (p, t, -5.61531961e-5); // -0x1.d70c12p-15
      p = fmaf (p, t, -1.47697705e-4); // -0x1.35be9ap-13
      p = fmaf (p, t,  2.31468701e-3); //  0x1.2f6402p-9
      p = fmaf (p, t,  1.15392562e-2); //  0x1.7a1e4cp-7
      p = fmaf (p, t, -2.32015476e-1); // -0x1.db2aeep-3
      p = fmaf (p, t,  8.86226892e-1); //  0x1.c5bf88p-1
    }

    r = x * p;

    return r;

  }

  function inverseErfc(x) {
    return inverseErf(1 - x)
  }

  function fk(k, x, y, cosXY, sinXY) {
    return 2 * x * (1 - cosXY * Math.cosh(k * y)) + k * sinXY * Math.sinh(k * y)
  }

  function gk(k, x, y, cosXY, sinXY) {
    return 2 * x * sinXY * Math.cosh(k * y) + k * cosXY * Math.sinh(k * y)
  }

  function ErfSubcall(x, y) {

    let xy2 = 2 * x * y;
    let cosxy2 = Math.cos(xy2);
    let sinxy2 = Math.sin(xy2);

    let expX2 = Math.exp(- x * x);

    let cmp1 = new Complex$1(erf(x));
    let cmp2 = new Complex$1(1 - cosxy2, sinxy2).scale(expX2 / (2 * Math.PI * x));

    let sum = new Complex$1(0);
    let terms = Math.min(Math.max(10 * Math.abs(y), 10), 100);

    for (let k = 1; k < terms; ++k) {
      let component = new Complex$1(fk(k, x, y, cosxy2, sinxy2), gk(k, x, y, cosxy2, sinxy2)).scale(Math.exp(- k * k / 4) / (k * k + 4 * x * x));

      sum.re += component.re;
      sum.im += component.im;
    }

    return Add(cmp1, Add(cmp2, sum.scale(2 / Math.PI * expX2)))
  }

  function Erf(z) {
    if (z.im < 1e-17)
      return new Complex$1(erf(z.re))

    let x = z.re, y = z.im;

    return ErfSubcall(x, y)
  }

  function Erfc(z) {
    return Erf(Subtract(new Complex$1(1), z))
  }

  var Erfs = /*#__PURE__*/Object.freeze({
    Erf: Erf,
    Erfc: Erfc
  });

  /**
   * Complex functions!
   */
  const ComplexFunctions = Object.freeze({
    ...BasicArithmeticFunctions, ...PowFunctions, Exp, Cis, ...TrigFunctions, ...LnFunctions,
    ...HyperbolicTrigFunctions, ...InverseTrigFunctions, ...InverseHyperbolicFunctions,
    Gamma, Digamma, Trigamma, Polygamma, LnGamma, Zeta, Eta, ...MiscSpecial, ...ExpIntegrals, ...TrigIntegrals, ...Erfs
  });

  const Multiply$1 = (a, b) => a * b;

  const Add$1 = (a, b) => a + b;

  const Subtract$1 = (a, b) => a - b;

  const Divide$1 = (a, b) => a / b;

  const Ln$1 = Math.log;

  const Log$1 = Ln$1;

  const Log2$1 = Math.log2;

  const Log10$1 = Math.log10;

  const Sin$1 = Math.sin;

  const Cos$1 = Math.cos;

  const Tan$1 = Math.tan;

  const Sec$1 = x => 1 / Math.cos(x);

  const Csc$1 = x => 1 / Math.sin(x);

  const Cot$1 = x => 1 / Math.tan(x);

  const Arcsin$1 = Math.asin;

  const Arccos$1 = Math.acos;

  const Arctan$1 = Math.atan;

  const Arcsec$1 = x => Math.acos(1 / x);

  const Arccsc$1 = x => Math.asin(1 / x);

  const Sinh$1 = Math.sinh;

  const Cosh$1 = Math.cosh;

  const Tanh$1 = Math.tanh;

  const Sech$1 = x => 1 / Math.cosh(x);

  const Csch$1 = x => 1 / Math.sinh(x);

  const Coth$1 = x => 1 / Math.tanh(x);

  const Arcsinh$1 = Math.asinh;

  const Arccosh$1 = Math.acosh;

  const Arctanh$1 = Math.atanh;

  const Arcsech$1 = x => Math.acosh( 1 / x);

  const Arccsch$1 = x => Math.asinh(1 / x);

  const Arccoth$1 = x => Math.atanh(1 / x);

  var BasicFunctions = /*#__PURE__*/Object.freeze({
    Multiply: Multiply$1,
    Add: Add$1,
    Subtract: Subtract$1,
    Divide: Divide$1,
    Ln: Ln$1,
    Log: Log$1,
    Log2: Log2$1,
    Log10: Log10$1,
    Sin: Sin$1,
    Cos: Cos$1,
    Tan: Tan$1,
    Sec: Sec$1,
    Csc: Csc$1,
    Cot: Cot$1,
    Arcsin: Arcsin$1,
    Arccos: Arccos$1,
    Arctan: Arctan$1,
    Arcsec: Arcsec$1,
    Arccsc: Arccsc$1,
    Sinh: Sinh$1,
    Cosh: Cosh$1,
    Tanh: Tanh$1,
    Sech: Sech$1,
    Csch: Csch$1,
    Coth: Coth$1,
    Arcsinh: Arcsinh$1,
    Arccosh: Arccosh$1,
    Arctanh: Arctanh$1,
    Arcsech: Arcsech$1,
    Arccsch: Arccsch$1,
    Arccoth: Arccoth$1
  });

  let SiP1 = new SingleVariablePolynomial([1, -4.54393409816329991e-2, 1.15457225751016682e-3, -1.41018536821330254e-5, 9.43280809438713025e-8, -3.53201978997168357e-10, 7.08240282274875911e-12, -6.05338212010422477e-16]);
  let SiQ1 = new SingleVariablePolynomial([1, 1.01162145739225565e-2, 4.99175116169755106e-5, 1.55654986308745614e-7, 3.28067571055789734e-10, 4.5049097575386581e-13, 3.21107051193712168e-16]);
  let CiP1 = new SingleVariablePolynomial([-0.25, 7.51851524438898291e-3, -1.27528342240267686e-4, 1.05297363846239184e-6, -4.68889508144848019e-9, 1.06480802891189243e-11, -9.93728488857585407e-15]);
  let CiQ1 = new SingleVariablePolynomial([1, 1.1592605689110735e-2, 6.72126800814254432e-5, 2.55533277086129636e-7, 6.97071295760958946e-10, 1.38536352772778619e-12, 1.89106054713059759e-15, 1.39759616731376855e-18]);
  let FP1 = new SingleVariablePolynomial([1, 7.44437068161936700618e2, 1.96396372895146869801e5, 2.37750310125431834034e7, 1.43073403821274636888e9, 4.33736238870432522765e10, 6.40533830574022022911e11, 4.20968180571076940208e12, 1.00795182980368574617e13, 4.94816688199951963482e12, 4.94701168645415959931e11]);
  let FQ1 = new SingleVariablePolynomial([1, 7.46437068161927678031e2, 1.97865247031583951450e5, 2.41535670165126845144e7, 1.47478952192985464958e9, 4.58595115847765779830e10, 7.08501308149515401563e11, 5.06084464593475076774e12, 1.43468549171581016479e13, 1.11535493509914254097e13]);
  let GP1 = new SingleVariablePolynomial([1, 8.1359520115168615e2, 2.35239181626478200e5, 3.12557570795778731e7, 2.06297595146763354e9, 6.83052205423625007e10, 1.09049528450362786e12, 7.57664583257834349e12, 1.81004487464664575e13, 6.43291613143049485e12,
    -1.36517137670871689e12]);
  let GQ1 = new SingleVariablePolynomial([1, 8.19595201151451564e2, 2.40036752835578777e5, 3.26026661647090822e7, 2.23355543278099360e9, 7.87465017341829930e10, 1.39866710696414565e12, 1.17164723371736605e13, 4.01839087307656620e13, 3.99653257887490811e13]);


  function f(x) {
    let recip = 1 / x;
    let recipSq = recip * recip;

    return recip * FP1.evaluate(recipSq) / FQ1.evaluate(recipSq)
  }

  function g$1(x) {
    let recipSq = 1 / (x * x);

    return recipSq * GP1.evaluate(recipSq) / GQ1.evaluate(recipSq)
  }

  function Si$1(x) {
    if (x === 0)
      return 0

    if (x < 0)
      return -Si$1(-x)

    if (x <= 4) {
      // PADE APPROXIMANT

      let xSq = x * x;

      return x * SiP1.evaluate(xSq) / SiQ1.evaluate(xSq)
    } else {
      return Math.PI / 2 - f(x) * Math.cos(x) - g$1(x) * Math.sin(x)
    }
  }

  function Ci$1(x) {
    if (x === 0)
      return -Infinity

    if (x < 0)
      return Ci$1(-x)

    if (x <= 4) {
      // PADE APPROXIMANT
      let xSq = x * x;

      return eulerGamma + Math.log(x) + xSq * CiP1.evaluate(xSq) / CiQ1.evaluate(xSq)
    } else {
      return f(x) * Math.sin(x) - g$1(x) * Math.cos(x)
    }
  }

  const sqrtPi2 = Math.sqrt(Math.PI / 2);
  const sqrt2Pi = Math.sqrt(2 * Math.PI);
  const sqrt8Pi = Math.sqrt(8 * Math.PI);

  function LargeS(x) {
    let xSq = x * x;
    return sqrtPi2 * (Math.sign(x) / 2 - (Math.cos(xSq) / (x * sqrt2Pi) + Math.sin(xSq) / (x * xSq * sqrt8Pi)))
  }

  function LargeC(x) {
    let xSq = x * x;
    return sqrtPi2 * (Math.sign(x) / 2 + (Math.sin(xSq) / (x * sqrt2Pi) + Math.cos(xSq) / (x * xSq * sqrt8Pi)))
  }

  function SmallS(x) {
    let sum = 0;

    let z = x * x * x;
    let xPow = z * x;

    for (let n = 0; n < 50; ++n) {
      if (n !== 0)
        z /= 2 * n * (2 * n + 1);

      let component = z / (4 * n + 3);

      sum += component;

      z *= xPow;

      z *= -1;

      if (Math.abs(component) < 1e-6)
        break
    }

    return sum
  }

  function SmallC(x) {
    let sum = 0;

    let z = x;
    let xPow = x * x * x * x;

    for (let n = 0; n < 50; ++n) {
      if (n !== 0)
        z /= 2 * n * (2 * n - 1);

      let component = z / (4 * n + 1);

      sum += component;

      z *= xPow;

      z *= -1;

      if (Math.abs(component) < 1e-6)
        break
    }

    return sum
  }

  function S(x) {
    if (Math.abs(x) > 5)
      return LargeS(x)
    return SmallS(x)
  }

  function C$1(x) {
    if (Math.abs(x) > 5)
      return LargeC(x)
    return SmallC(x)
  }

  function seriesEval(r) {
    const c = [
      -1.0,
      2.331643981597124203363536062168,
      -1.812187885639363490240191647568,
      1.936631114492359755363277457668,
      -2.353551201881614516821543561516,
      3.066858901050631912893148922704,
      -4.175335600258177138854984177460,
      5.858023729874774148815053846119,
      -8.401032217523977370984161688514,
      12.250753501314460424,
      -18.100697012472442755,
      27.029044799010561650];

    const t_8 = c[8] + r * (c[9] + r * (c[10] + r * c[11]));
    const t_5 = c[5] + r * (c[6] + r * (c[7] + r * t_8));
    const t_1 = c[1] + r * (c[2] + r * (c[3] + r * (c[4] + r * t_5)));
    return c[0] + r * t_1;
  }

  function approxProductLog(x) {
    if (x > 1) {
      let logX = Math.log(x);

      return logX - Math.log(logX)
    }

    return 0
  }

  function approxProductLogM1(x) {
    if (x < -1.0e-6) {
      // Calculate via series

      let q = x - RECIP_E;

      let r = - Math.sqrt(q);

      return seriesEval(r)
    } else {
      // Calculate via logs

      let L1 = Math.log(-x);
      let L2 = Math.log(-L1);

      return L1 - L2 + L2 / L1
    }
  }

  function halley(x, w, iters=8) {
    for (let i = 0; i < 8; ++i) {
      let eW = Math.exp(w);

      w = w - (w * eW - x) / (eW * (w + 1) - (w + 2) * (w * eW - x) / (2 * w + 2));
    }

    return w
  }

  const RECIP_E = -1 / Math.exp(1);

  function productLog(x) {

    if (x < RECIP_E)
      return NaN

    // see https://mathworld.wolfram.com/LambertW-Function.html
      let w = approxProductLog(x);

      // Compute via Halley's method

    return halley(x, w)
  }

  function productLogBranched(k, x) {
    if (k === 0)
      return productLog(x)
    else if (k === -1) {
      if (x === 0)
        return Infinity

      if (RECIP_E <= x && x < 0) {
        let w = approxProductLogM1(x);

        return halley(x, w)
      }

      return NaN
    }

    return NaN
  }

  // Arithmetic geometric mean

  const MAX_ITERS = 20;

  // Credit to Rosetta Code
  function agm(a0, g0, tolerance=1e-17) {
    let an = a0, gn = g0;
    let i = 0;

    while (Math.abs(an - gn) > tolerance && i < MAX_ITERS) {
      i++;

      let tmp = an;
      an = (an + gn) / 2;
      gn = Math.sqrt(tmp * gn);
    }
    return an;
  }

  function pochhammer(q, n) {
    if (n === 0)
      return 1
    if (n === 1)
      return q

    let prod = 1;
    for (let i = 0; i < n; ++i) {
      prod *= q;
      q++;
    }

    return prod
  }

  function hypergeometric(a, b, c, z, terms=40) {
    let prod = 1;
    let sum = 0;

    if (Number.isInteger(c) && c <= 0)
      return NaN

    for (let n = 0; n < terms; ++n) {
      sum += prod;

      prod *= a * b;
      prod /= c;

      a++;
      b++;
      c++;

      prod /= n + 1;

      prod *= z;
    }

    return sum
  }

  function ellipticK(k) {
    const absK = Math.abs(k);

    if (absK > 1)
      return NaN

    if (absK === 1)
      return Infinity

    return Math.PI / 2 / agm(1, Math.sqrt(1 - k * k))
  }


  function ellipticE(k) {
    let absK = Math.abs(k);

    if (absK > 1)
      return NaN
    else if (absK === 1)
      return 1

    return Math.PI / 2 * hypergeometric(1/2, -1/2, 1, k * k)
  }

  function ellipticPi(n, k) {

  }

  const piecewise$1 = (val1, cond, ...args) => {
    if (cond)
      return val1
    if (args.length === 0) {
      if (cond === undefined)
        return val1
      else
        return 0
    }

    return piecewise$1(...args)
  };

  const cchain = (val1, comparison, val2, ...args) => {
    switch (comparison) {
      case "<":
        if (val1 >= val2)
          return false
        break
      case ">":
        if (val1 <= val2)
          return false
        break
      case "<=":
        if (val1 > val2)
          return false
        break
      case ">=":
        if (val1 < val2)
          return false
        break
      case "==":
        if (val1 !== val2)
          return false
        break
      case "!=":
        if (val1 === val2)
          return false
        break
    }

    if (args.length === 0)
      return true
    else
      return cchain(val2, ...args)
  };

  const ExtraFunctions$1 = {
    Sqrt: Math.sqrt,
    Cbrt: Math.cbrt,
    Log2: Math.log2,
    Log10: Math.log10,
    Ln: Math.log,
    LogB: (b, v) => {
      return Math.log(v) / Math.log(b)
    },
    Factorial: (a) => {
      return ExtraFunctions$1.Gamma(a + 1)
    },
    Gamma: (a) => {
      return gamma$1(a)
    },
    LnGamma: (a) => {
      return ln_gamma(a)
    },
    Digamma: (a) => {
      return digamma(a)
    },
    Trigamma: (a) => {
      return trigamma(a)
    },
    Polygamma: (n, a) => {
      return polygamma(n, a)
    },
    Arccot: (z) => {
      let t = Math.atan(1 / z);

      if (t < 0) {
        t += Math.PI;
      }

      return t
    },
    PowRational: (x, p, q) => {
      // Calculates x ^ (p / q), where p and q are integers

      if (p === 0) {
        return 1
      }

      let GCD = gcd(p, q);

      if (GCD !== 1) {
        p /= GCD;
        q /= GCD;
      }

      if (x >= 0) {
        return Math.pow(x, p / q)
      } else {
        if (mod(q, 2) === 0)
          return NaN

        let ret = Math.pow(-x, p / q);
        if (mod(p, 2) === 0) {
          return ret
        } else {
          return -ret
        }
      }
    },
    Pow: (x, r) => {
      return Math.pow(x, r)
    },
    Im: (x) => {
      return 0
    },
    Re: (x) => {
      return x
    },
    Mod: (n, m) => {
      return ((n % m) + m) % m
    },
    Piecewise: piecewise$1,
    CChain: cchain,
    Cmp: {
      LessThan: (a, b) => a < b,
      GreaterThan: (a, b) => a > b,
      LessEqualThan: (a, b) => a <= b,
      GreaterEqualThan: (a, b) => a >= b,
      Equal: (a,b) => a === b,
      NotEqual: (a,b) => a !== b
    },
    Logic: {
      And: (a, b) => a && b,
      Or: (a, b) => a || b
    },
    Floor: Math.floor,
    Ceil: Math.ceil,
    Zeta: zeta,
    Eta: eta,
    Frac: (x) => x - Math.floor(x),
    Sign: Math.sign,
    Round: Math.round,
    Trunc: Math.trunc,
    IsFinite: isFinite,
    Ei: ei,
    Li: li,
    Sinc: (x) => x === 0 ? 1 : Math.sin(x) / x,
    NormSinc: (x) => ExtraFunctions$1.Sinc(x * Math.PI),
    Si: Si$1,
    Ci: Ci$1,
    Erf: erf,
    Erfc: erfc,
    Gcd: (a, b) => gcd(Math.abs(a), Math.abs(b)),
    Lcm: (a, b) => a * b / ExtraFunctions$1.Gcd(a, b),
    FresnelS: S,
    FresnelC: C$1,
    InverseErf: inverseErf,
    InverseErfc: inverseErfc,
    ProductLog: productLog,
    ProductLogBranched: productLogBranched,
    EllipticE: ellipticE,
    EllipticK: ellipticK,
    EllipticPi: ellipticPi,
    Agm: agm,
    Abs: Math.abs
  };

  const RealFunctions = {...BasicFunctions, ...ExtraFunctions$1};

  class ComplexInterval {
    constructor(reMin, reMax, imMin, imMax) {
      this.reMin = reMin;
      this.reMax = reMax;
      this.imMin = imMin;
      this.imMax = imMax;
    }
  }

  const Typecasts$1 = {
    RealToComplex: (r) => new Complex$1(r),
    RealArrayToComplexArray: (arr) => arr.map(elem => new Complex$1(elem)),
    RealIntervalToComplexInterval: (int) => new ComplexInterval(int.min, int.max, 0, 0),
    Identity: (r) => r
  };

  class BeastJob extends Promise {
    constructor(beast, id, progressCallback=null) {
      if (beast instanceof Function) {
        return super(beast)
      }

      let resolveFunc, rejectFunc;

      super((resolve, reject) => {
        resolveFunc = resolve;
        rejectFunc = reject;
      });

      this.resolve = resolveFunc;
      this.reject = rejectFunc;
      this.progress = progressCallback;
      this.beast = beast;
      this.id = id;
    }

    static get [Symbol.species]() {
      return Promise
    }

    get [Symbol.toStringTag]() {
      return "BeastJob"
    }

    cancel() {
      this.reject("Job cancelled");

      this.beast.cancelJob(this);
    }
  }

  let id = 1;

  function getJobID() {
    return id++
  }

  /**
   * Posted messages will be of the following forms:
   * {type: "create", jobID: 2, jobType: "calculatePolylineVertices", data: { ... }}
   * {type: "cancel", jobID: 2}
   * {type: "cancelAll"}
   * Received messages will be of the following forms:
   * {type: "result", jobID: 2, data: { ... }}
   * {type: "error", jobID: 2, error: ... }
   * {type: "progress", jobID: 2, progress: 0.3}
   */
  class Beast {
    constructor() {
      this.worker = new Worker("../build/grapheme_worker.js");
      this.worker.onmessage = message => this.receiveMessage(message);

      this.jobs = [];
    }

    cancelAll() {
      this.jobs.forEach(job => this.cancelJob(job));

      this.worker.postMessage({type: "cancelAll"});
    }

    receiveMessage(message) {
      let data = message.data;

      let id = data.jobID;
      let job = this.getJob(id);

      if (!job)
        return

      switch (data.type) {
        case "result":
          job.resolve(data.data);

          this._removeJob(job);

          return
        case "error":
          job.reject(data.error);

          this._removeJob(job);

          return
        case "progress":
          if (job.progress)
            job.progress(data.progress);

          return
      }
    }

    job(type, data, progressCallback=null, transferables=[]) {
      let id = getJobID();

      this.worker.postMessage({type: "create", jobID: id, data, jobType: type}, transferables);

      let job = new BeastJob(this, id, progressCallback);
      this.jobs.push(job);

      return job
    }

    getJob(id) {
      for (let i = 0; i < this.jobs.length; ++i) {
        let job = this.jobs[i];

        if (job.id === id)
          return job
      }
    }

    cancelJob(job, reason="Job cancelled") {
      console.log("cancelled job " + job.id);
      this.worker.postMessage({type: "cancel", jobID: job.id});

      job.reject(reason);

      this._removeJob(job);
    }

    _removeJob(job) {
      let index = this.jobs.indexOf(job);

      if (index !== -1) {
        this.jobs.splice(index, 1);
      }
    }
  }

  class Dataset2D extends GraphemeElement {
    constructor(params={}) {
      super(params);

      this.glyph = Glyphs.CIRCLE;

      this.points = [];
      this.pixelPoints = [];
      this.useNative = false;

      this.geometry = new Simple2DWebGLGeometry();

      this.addEventListener("plotcoordschanged", () => this.markUpdate());
    }

    get color() {
      return this.geometry.color
    }

    set color(v) {
      this.geometry.color = v;
    }

    update(info) {
      super.update(info);

      const points = this.pixelPoints = this.points.slice();

      info.plot.transform.plotToPixelArr(points);

      if (this.useNative) {
        this.geometry.glVertices = new Float32Array(points);
        this.geometry.renderMode = "points";
      } else {
        let triangulation = this.glyph.triangulation;
        let triVertices = new Float32Array(triangulation.length * this.points.length / 2);

        let index = 0;

        for (let i = 0; i < points.length; i += 2) {
          let x = points[i];
          let y = points[i + 1];

          for (let j = 0; j < triangulation.length; j += 2) {
            triVertices[index++] = triangulation[j] + x;
            triVertices[index++] = triangulation[j + 1] + y;
          }
        }

        this.geometry.glVertices = triVertices;
        this.geometry.renderMode = "triangles";
      }

      this.geometry.color = this.color;
    }

    render(info) {
      info.scissorPlot(true);

      super.render(info);

      this.geometry.render(info);

      info.scissorPlot(false);
    }

    distanceFrom(v) {
      let minDis = Infinity;

      for (let i = 0; i < this.pixelPoints.length; i += 2) {
        let x = this.pixelPoints[i];
        let y = this.pixelPoints[i + 1];

        let xd = v.x - x, yd = v.y - y;

        let disSquared = xd * xd + yd * yd;

        if (disSquared < minDis)
          minDis = disSquared;
      }

      return minDis
    }

    destroy() {
      this.geometry.destroy();
    }
  }

  let unsafeToSquare = Math.floor(Math.sqrt(Number.MAX_SAFE_INTEGER));

  function addMod(a, b, m) {
    // Returns (a + b) % m

    let sum = a + b;

    let result = sum % m;

    if (sum < Number.MAX_SAFE_INTEGER)
      return result

    let signature = ((a % 8) + (b % 8)) % 8;

    let sumMod = sum % 8;

    for (let i = -2; i <= 2; ++i) {
      if ((sumMod + i) % 8 === signature) {
        let ret = result + i;

        if (ret > m)
          ret = (result - m) + i; // prevent overflow

        return ret
      }
    }
  }

  function mulMod(a, b, m) {
    if (m === 0)
      return 0

    let prod = a * b;

    if (prod < Number.MAX_SAFE_INTEGER)
      return prod % m

    let y = 0;
    let result = a;

    while (b > 1) {
      if (b % 2 === 0) {
        result = addMod(result, result, m);

        b /= 2;
      } else {
        y = addMod(result, y, m);
        result = addMod(result, result, m);

        b = (b - 1) / 2;
      }
    }

    return addMod(result, y, m)
  }

  function squareMod(b, m) {
    // Computes (b * b % m)

    return mulMod(b, b, m)
  }

  function expModLargeB(b, exponent, m) {
    let y = 1;

    while (exponent > 1) {
      if (exponent % 2 === 0) {
        b = squareMod(b, m);

        exponent /= 2;
      } else {
        y = mulMod(y, b, m);
        b = squareMod(b, m);

        exponent = (exponent - 1) / 2;
      }
    }

    return (b * y) % m
  }

  function expMod(b, exponent, m) {
    if (exponent === 0)
      return 1

    if (b >= unsafeToSquare || m >= unsafeToSquare) {
      return expModLargeB(b, exponent, m)
    }

    let y = 1;

    while (exponent > 1) {
      if (exponent % 2 === 0) {
        b *= b;
        b %= m;

        exponent /= 2;
      } else {
        y *= b;
        b *= b;

        y %= m;
        b %= m;

        exponent = (exponent - 1) / 2;
      }
    }

    return (b * y) % m
  }

  function _isPrimeTrialDivision(p) {
    let sqrtP = Math.ceil(Math.sqrt(p));

    for (let i = 23; i <= sqrtP + 1; i += 2) {
      if (p % i === 0)
        return false
    }

    return true
  }

  function jacobi(n, k) {
    if (!(k > 0 && k % 2 === 1))
      throw new Error("Invalid (n, k)")

    n = n % k;

    let t = 1;

    while (n !== 0) {
      while (n % 2 === 0) {
        n /= 2;

        let r = k % 8;
        if (r === 3 || r === 5) {
          t = -t;
        }
      }

      let tmp = k;
      k = n;
      n = tmp;

      if (n % 4 === 3 && k % 4 === 3) {
        t = -t;
      }

      n = n % k;
    }

    if (k === 1)
      return t

    return 0
  }

  function _isProbablePrimeMillerRabin(p, base=2) {
    let pm1 = p - 1;
    let pm1div = pm1;
    let d, r = 0;

    while (true) {
      if (pm1div % 2 === 0) {
        pm1div /= 2;

        r++;
      } else {
        d = pm1div;
        break
      }
    }

    let x = expMod(base, d, p);

    if (x === 1 || x === pm1)
      return true

    for (let i = 0; i < r - 1; ++i) {
      x = squareMod(x, p);

      if (x === pm1)
        return true
    }

    return false
  }

  function isPerfectSquare(p) {
    let h = p & 0xF;

    if (h > 9)
      return false

    if (h !== 2 && h !== 3 && h !== 5 && h !== 6 && h !== 7 && h !== 8) {
      let t = Math.floor(Math.sqrt(p) + 0.5);
      return t * t === p
    }

    return false
  }

  function _isPrimeLarge(p) {
    let bases;

    if (p < 2047)
      bases = [2];
    else if (p < 1373653)
      bases = [2, 3];
    else if (p < 9080191)
      bases = [31, 73];
    else if (p < 25326001)
      bases = [2, 3, 5];
    else if (p < 3215031751)
      bases = [2, 3, 5, 7];
    else if (p < 4759123141)
      bases = [2, 7, 61];
    else if (p < 1122004669633)
      bases = [2, 13, 23, 1662803];
    else if (p < 2152302898747)
      bases = [2, 3, 5, 7, 11];
    else if (p < 3474749660383)
      bases = [2, 3, 5, 7, 11, 13];
    else if (p < 341550071728321)
      bases = [2, 3, 5, 7, 11, 13, 17];
    else
      bases = [2, 3, 5, 7, 11, 13, 17, 19, 23];

    return bases.every(base => _isProbablePrimeMillerRabin(p, base))
  }

  /*

    if (isPerfectSquare(p))
      return false

    let D

    for (let i = 0; i < 1; ++i) {
      let potentialD = (i % 2 === 0) ? 5 + 2 * i : -5 - 2 * i

      if (jacobi(potentialD, p) === -1) {
        D = potentialD
        break
      }
    }

    if (!D) // too powerful
      return false

    let P = 1, Q = (1 - D) / 4

    return _isProbablePrimeLucas(p, D, P, Q)
   */

  let smallPrimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223];

  function isPrime(p) {
    if (!Number.isInteger(p) || p < 2)
      return false

    // Test for small primes
    for (let i = 0; i < smallPrimes.length; ++i) {
      let prime = smallPrimes[i];

      if (p === prime)
        return true
      if (p % prime === 0)
        return false
    }

    if (p < 150) {
      return _isPrimeTrialDivision(p)
    } else {
      return _isPrimeLarge(p)
    }
  }

  function pollardBrent(n) {
    let y = getRandomInt(1, n-1), c = getRandomInt(1, n-1), m = getRandomInt(1, n-1);
    let g = 1, r = 1, q = 1, x, ys;

    while (g === 1) {
      x = y;

      for (let i = 0; i < r; ++i) {
        y = addMod(squareMod(y, n), c, n);
      }

      let k = 0;
      while (k < r && g === 1) {
        ys = y;

        let iMax = Math.min(m, r-k);

        for (let i = 0; i < iMax; ++i) {
          y = addMod(squareMod(y, n), c, n);

          q = mulMod(q, Math.abs(x - y), n);
        }

        g = gcd(q, n);
        k += m;
      }

      r *= 2;
    }

    if (g === n) {
      while (true) {
        ys = addMod(squareMod(ys, n), c, n);
        g = gcd(Math.abs(x - ys), n);

        if (g > 1)
          break
      }
    }

    return g
  }

  function factor(n) {
    if (Math.abs(n) > Number.MAX_SAFE_INTEGER)
      throw new Error("Number to factor is too large to be represented by a JS Number")

    n = Math.floor(n);

    if (n === 0)
      return [0]
    if (n === 1)
      return [1]

    let factors = [];

    if (n < 0) {
      factors.push(-1);
      n = -n;
    }

    for (let i = 0; i < smallPrimes.length; ++i) {
      let prime = smallPrimes[i];

      while (true) {
        if (n % prime === 0) {
          factors.push(prime);

          n /= prime;
        } else {
          break
        }
      }

      if (n === 1)
        break
    }

    if (n === 1)
      return factors

    while (true) {
      let factor = pollardBrent(n);

      if (n === factor) {
        factors.push(factor);

        break
      } else {
        n /= factor;

        factors.push(factor);
      }
    }

    factors.sort((a, b) => a - b);

    return factors
  }

  function distinctFactors(n) {
    return Array.from(new Set(factor(n)))
  }

  function eulerPhi(n) {
    let factors = distinctFactors(n);

    let prod = 1;

    prod *= n;

    for (let i = 0; i < factors.length; ++i) {
      let factor = factors[i];

      // This order of evaluation prevents overflow
      prod /= factor;
      prod *= factor - 1;
    }

    return prod
  }

  const MAX_BERNOULLI = 1e4;

  const BERNOULLI_N_NUMBERS = new Float64Array(MAX_BERNOULLI);
  let BERNOULLI_N_INDEX = 0;

  function computeBernoulli(index) {
    for (let i = BERNOULLI_N_INDEX; i <= index; ++i) {
      let value = i === 0 ? 1 : 0;

      for (let j = 0; j < i; ++j) {
        value -= nCr(i, j) * BERNOULLI_N_NUMBERS[j] / (i - j + 1);
      }

      BERNOULLI_N_NUMBERS[i] = value;
    }

    BERNOULLI_N_INDEX = index + 1;
  }

  function bernoulliN(n) {
    if (n > MAX_BERNOULLI) {
      // Okay, that's a bit much
      throw new Error("Excessive n")
    }

    if (n < BERNOULLI_N_INDEX)
      return BERNOULLI_N_NUMBERS[n]

    computeBernoulli(n);

    return BERNOULLI_N_NUMBERS[n]
  }

  function bernoulliP(n) {
    if (n === 1)
      return 0.5

    return bernoulliN(n)
  }

  const bernoulli = bernoulliP;

  const BooleanFunctions = {
    And: (a, b) => a && b,
    Or: (a, b) => a || b
  };

  const Add$2 = (v1, v2) => {
    return new Vec2(v1.x + v2.x, v1.y + v2.y)
  };

  const Subtract$2 = (v1, v2) => {
    return new Vec2(v1.x - v2.x, v1.y - v2.y)
  };

  const Dot = (v1, v2) => {
    return v1.x * v2.x + v1.y * v2.y
  };

  const Construct$1 = (x, y) => {
    return new Vec2(x, y)
  };

  var BasicArithmetic = /*#__PURE__*/Object.freeze({
    Add: Add$2,
    Subtract: Subtract$2,
    Dot: Dot,
    Construct: Construct$1
  });

  const VectorFunctions = {
    ...BasicArithmetic
  };

  class ParametricPlot2D extends InteractiveElement {
    constructor(params={}) {
      super(params);

      this.function = null;
      this.functionName = getFunctionName();

      this.polyline = new WebGLPolyline();
      this.samples = 1000;

      this.rangeStart = -20;
      this.rangeEnd = 20;
      
      this.addEventListener("plotcoordschanged", () => this.markUpdate());
    }

    get pen() {
      return this.polyline.pen
    }

    set pen(pen) {
      this.polyline.pen = pen;
    }

    setFunction(func, variable='x') {
      defineFunction(this.functionName, func, [variable]);

      this.function = getFunction(this.functionName).evaluate;
      this.markUpdate();
    }

    render(info) {
      this.polyline.render(info);
    }

    update(info) {
      super.update(info);

      if (!this.function)
        return

      let vertices = this.polyline.vertices = [];

      const samples = this.samples;
      const rangeStart = this.rangeStart, rangeEnd = this.rangeEnd;
      const func = this.function;

      for (let i = 0; i <= samples; ++i) {
        let frac = i / samples;

        let t = rangeStart + (rangeEnd - rangeStart) * frac;

        let res = func(t);

        vertices.push(res.x, res.y);
      }

      info.plot.transform.plotToPixelArr(vertices);

      console.log("hi");

      this.polyline.update(info);
    }

    destroy() {
      this.polyline.destroy();
    }
  }

  exports.ASTNode = ASTNode;
  exports.BasicLabel = BasicLabel;
  exports.Beast = Beast;
  exports.BeastJob = BeastJob;
  exports.BooleanFunctions = BooleanFunctions;
  exports.BoundingBox = BoundingBox;
  exports.Color = Color;
  exports.Colors = Colors;
  exports.Complex = Complex$1;
  exports.ComplexFunctions = ComplexFunctions;
  exports.ConstantNode = ConstantNode;
  exports.ConwaysGameOfLifeElement = ConwaysGameOfLifeElement;
  exports.Dataset2D = Dataset2D;
  exports.DefaultUniverse = DefaultUniverse;
  exports.EquationPlot2D = EquationPlot2D;
  exports.FresnelC = C$1;
  exports.FresnelS = S;
  exports.FunctionPlot2D = FunctionPlot2D;
  exports.Functions = Functions;
  exports.GREGORY_COEFFICIENTS = GREGORY_COEFFICIENTS;
  exports.Glyph = Glyph;
  exports.Glyphs = Glyphs;
  exports.GridlineStrategizers = GridlineStrategizers;
  exports.Gridlines = Gridlines;
  exports.Group = GraphemeGroup;
  exports.INTEGER_FACTORIALS = INTEGER_FACTORIALS;
  exports.InteractiveFunctionPlot2D = InteractiveFunctionPlot2D;
  exports.Interpolations = Interpolations;
  exports.Interval = Interval;
  exports.IntervalFunctions = IntervalFunctions;
  exports.IntervalSet = IntervalSet;
  exports.LANCZOS_COEFFICIENTS = LANCZOS_COEFFICIENTS;
  exports.Label2D = Label2D;
  exports.LabeledPoint = LabeledPoint;
  exports.OperatorNode = OperatorNode;
  exports.OperatorSynonyms = OperatorSynonyms;
  exports.ParametricPlot2D = ParametricPlot2D;
  exports.Pen = Pen;
  exports.PieChart = PieChart;
  exports.Plot2D = Plot2D;
  exports.PolylineBase = PolylineBase;
  exports.PolylineElement = PolylineElement;
  exports.RESERVED_FUNCTIONS = RESERVED_FUNCTIONS;
  exports.RESERVED_VARIABLES = RESERVED_VARIABLES;
  exports.RealFunctions = RealFunctions;
  exports.StandardLabelFunction = StandardLabelFunction;
  exports.TreeElement = TreeElement;
  exports.Typecasts = Typecasts$1;
  exports.Universe = GraphemeUniverse;
  exports.VariableNode = VariableNode;
  exports.Variables = Variables;
  exports.Vec2 = Vec2;
  exports.VectorFunctions = VectorFunctions;
  exports.WebGLPolyline = WebGLPolyline;
  exports._interpolationsEnabled = _interpolationsEnabled;
  exports.adaptively_sample_1d = adaptively_sample_1d;
  exports.addMod = addMod;
  exports.agm = agm;
  exports.anglesBetween = anglesBetween;
  exports.asyncCalculatePolylineVertices = asyncCalculatePolylineVertices;
  exports.bernoulli = bernoulli;
  exports.bernoulliN = bernoulliN;
  exports.bernoulliP = bernoulliP;
  exports.boundingBoxTransform = boundingBoxTransform;
  exports.calculatePolylineVertices = calculatePolylineVertices;
  exports.defineFunction = defineFunction;
  exports.defineVariable = defineVariable;
  exports.digamma = digamma;
  exports.distinctFactors = distinctFactors;
  exports.ei = ei;
  exports.erf = erf;
  exports.erfc = erfc;
  exports.eta = eta;
  exports.eulerPhi = eulerPhi;
  exports.expMod = expMod;
  exports.factor = factor;
  exports.factorial = factorial;
  exports.fastHypot = fastHypot;
  exports.find_roots = find_roots;
  exports.gamma = gamma$1;
  exports.getDashedPolyline = getDashedPolyline;
  exports.getEiCoeff = getEiCoeff;
  exports.getFunction = getFunction;
  exports.getLineIntersection = getLineIntersection;
  exports.getPolygammaNumeratorPolynomial = getPolygammaNumeratorPolynomial;
  exports.getVariable = getVariable;
  exports.get_continued_fraction = get_continued_fraction;
  exports.get_rational = get_rational;
  exports.hypergeometric = hypergeometric;
  exports.interpolate = interpolate;
  exports.intersectBoundingBoxes = intersectBoundingBoxes;
  exports.intervalEqFindBoxes = intervalEqFindBoxes;
  exports.inverseErf = inverseErf;
  exports.inverseErfc = inverseErfc;
  exports.isPerfectSquare = isPerfectSquare;
  exports.isPrime = isPrime;
  exports.jacobi = jacobi;
  exports.li = li;
  exports.lineSegmentIntersect = lineSegmentIntersect;
  exports.lineSegmentIntersectsBox = lineSegmentIntersectsBox;
  exports.ln_gamma = ln_gamma;
  exports.mulMod = mulMod;
  exports.nextPowerOfTwo = nextPowerOfTwo;
  exports.parseString = parseString;
  exports.pochhammer = pochhammer;
  exports.pointLineSegmentClosest = pointLineSegmentClosest;
  exports.pointLineSegmentMinDistance = pointLineSegmentMinDistance;
  exports.polygamma = polygamma;
  exports.regularPolygonGlyph = regularPolygonGlyph;
  exports.rgb = rgb;
  exports.rgba = rgba;
  exports.sample_1d = sample_1d;
  exports.squareMod = squareMod;
  exports.tokenizer = tokenizer;
  exports.trigamma = trigamma;
  exports.undefineFunction = undefineFunction;
  exports.undefineVariable = undefineVariable;
  exports.utils = utils;
  exports.zeta = zeta;

  return exports;

}({}));
Grapheme.defineVariable('i', Grapheme.parseString("complex(0, 1)"))
Grapheme.defineVariable('pi', Grapheme.parseString("3.141592653589793238"))
Grapheme.defineVariable('e', Grapheme.parseString("2.71828182845904523536"))
Grapheme.defineVariable('euler_gamma', Grapheme.parseString("0.57721566490153286060"))
Grapheme.defineVariable('<', Grapheme.parseString("1"))
Grapheme.defineVariable('>', Grapheme.parseString("1"))
Grapheme.defineVariable('<=', Grapheme.parseString("1"))
Grapheme.defineVariable('>=', Grapheme.parseString("1"))
Grapheme.defineVariable('!=', Grapheme.parseString("1"))
Grapheme.defineVariable('==', Grapheme.parseString("1"))

Grapheme.RESERVED_VARIABLES.push('i', 'x', 'y', 'z', 'pi', 'e')
