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

  function gamma (z) {

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

    if (z < -100) {
      return 0
    }

    if (z < 0.5) {
      return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z))
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

      return polygamma(m, z+1) + sign * gamma(m + 1) / Math.pow(z, m+1)
    }

    // Series representation

    let sum = 0;
    for (let i = 0; i < 200; ++i) {
      sum += 1 / Math.pow(z + i, m + 1);
    }

    return sign * gamma(m + 1) * sum

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
    return gamma(z + 1)
  }

  function upperIncompleteGamma(a, z) {

  }

  function lowerIncompleteGamma(a, z) {

  }

  const DIGAMMA_ZEROES = new Float64Array([
    -999.8641415089419,
    -998.8641241405903,
    -997.8641067506742,
    -996.8640893391462,
    -995.8640719059583,
    -994.8640544510583,
    -993.8640369744014,
    -992.8640194759327,
    -991.8640019556082,
    -990.8639844133729,
    -989.8639668491812,
    -988.8639492629803,
    -987.8639316547205,
    -986.8639140243538,
    -985.8638963718242,
    -984.8638786970857,
    -983.8638610000871,
    -982.8638432807736,
    -981.863825539097,
    -980.8638077750059,
    -979.8637899884483,
    -978.8637721793708,
    -977.8637543477224,
    -976.8637364934516,
    -975.8637186165059,
    -974.8637007168327,
    -973.8636827943793,
    -972.8636648490926,
    -971.8636468809198,
    -970.8636288898075,
    -969.8636108757023,
    -968.8635928385506,
    -967.8635747782989,
    -966.8635566948932,
    -965.8635385882794,
    -964.8635204584034,
    -963.8635023052109,
    -962.8634841286473,
    -961.8634659286556,
    -960.8634477051825,
    -959.8634294581735,
    -958.8634111875734,
    -957.863392893324,
    -956.8633745753713,
    -955.8633562336604,
    -954.8633378681327,
    -953.863319478733,
    -952.8633010654065,
    -951.8632826280921,
    -950.8632641667383,
    -949.8632456812821,
    -948.8632271716721,
    -947.8632086378451,
    -946.8631900797487,
    -945.8631714973201,
    -944.8631528905048,
    -943.8631342592435,
    -942.8631156034755,
    -941.8630969231455,
    -940.863078218193,
    -939.863059488557,
    -938.8630407341809,
    -937.8630219550047,
    -936.8630031509687,
    -935.8629843220101,
    -934.8629654680714,
    -933.8629465890918,
    -932.862927685011,
    -931.8629087557676,
    -930.862889801301,
    -929.8628708215494,
    -928.8628518164516,
    -927.8628327859459,
    -926.8628137299703,
    -925.8627946484629,
    -924.8627755413614,
    -923.8627564086033,
    -922.862737250126,
    -921.8627180658649,
    -920.8626988557576,
    -919.8626796197416,
    -918.8626603577537,
    -917.862641069728,
    -916.8626217556005,
    -915.8626024153091,
    -914.8625830487873,
    -913.8625636559698,
    -912.8625442367947,
    -911.8625247911915,
    -910.8625053191003,
    -909.8624858204504,
    -908.8624662951804,
    -907.8624467432194,
    -906.8624271645058,
    -905.862407558968,
    -904.8623879265425,
    -903.8623682671624,
    -902.8623485807562,
    -901.8623288672603,
    -900.8623091266062,
    -899.8622893587242,
    -898.8622695635457,
    -897.8622497410036,
    -896.8622298910286,
    -895.8622100135515,
    -894.8621901085025,
    -893.8621701758121,
    -892.8621502154102,
    -891.8621302272265,
    -890.8621102111907,
    -889.8620901672319,
    -888.8620700952794,
    -887.8620499952619,
    -886.862029867108,
    -885.8620097107463,
    -884.8619895261047,
    -883.8619693131114,
    -882.8619490716909,
    -881.8619288017729,
    -880.8619085032852,
    -879.861888176153,
    -878.8618678203013,
    -877.8618474356598,
    -876.8618270221507,
    -875.8618065797016,
    -874.8617861082375,
    -873.8617656076826,
    -872.8617450779625,
    -871.8617245190012,
    -870.8617039307222,
    -869.861683313052,
    -868.8616626659093,
    -867.8616419892215,
    -866.8616212829116,
    -865.8616005468991,
    -864.8615797811085,
    -863.8615589854622,
    -862.8615381598822,
    -861.8615173042894,
    -860.8614964186039,
    -859.8614755027475,
    -858.8614545566411,
    -857.8614335802051,
    -856.8614125733594,
    -855.8613915360237,
    -854.8613704681175,
    -853.8613493695598,
    -852.861328240268,
    -851.8613070801619,
    -850.8612858891597,
    -849.8612646671799,
    -848.8612434141401,
    -847.8612221299542,
    -846.8612008145423,
    -845.8611794678216,
    -844.8611580897049,
    -843.8611366801109,
    -842.8611152389549,
    -841.8610937661505,
    -840.8610722616152,
    -839.8610507252606,
    -838.8610291570037,
    -837.8610075567573,
    -836.8609859244335,
    -835.860964259949,
    -834.8609425632137,
    -833.8609208341404,
    -832.8608990726431,
    -831.8608772786332,
    -830.8608554520218,
    -829.8608335927186,
    -828.8608117006362,
    -827.8607897756849,
    -826.8607678177749,
    -825.8607458268158,
    -824.860723802717,
    -823.8607017453877,
    -822.8606796547365,
    -821.8606575306721,
    -820.8606353731013,
    -819.8606131819317,
    -818.8605909570718,
    -817.8605686984288,
    -816.8605464059087,
    -815.860524079415,
    -814.8605017188574,
    -813.8604793241395,
    -812.8604568951653,
    -811.8604344318425,
    -810.8604119340703,
    -809.8603894017581,
    -808.8603668348045,
    -807.8603442331159,
    -806.8603215965943,
    -805.8602989251397,
    -804.860276218657,
    -803.8602534770473,
    -802.8602307002083,
    -801.8602078880438,
    -800.8601850404535,
    -799.8601621573373,
    -798.8601392385945,
    -797.8601162841238,
    -796.860093293824,
    -795.8600702675931,
    -794.8600472053288,
    -793.8600241069288,
    -792.86000097229,
    -791.8599778013091,
    -790.8599545938825,
    -789.8599313499036,
    -788.8599080692692,
    -787.8598847518751,
    -786.8598613976146,
    -785.8598380063803,
    -784.8598145780693,
    -783.8597911125692,
    -782.8597676097784,
    -781.8597440695835,
    -780.8597204918815,
    -779.8596968765586,
    -778.8596732235088,
    -777.8596495326229,
    -776.859625803787,
    -775.8596020368933,
    -774.8595782318307,
    -773.8595543884875,
    -772.8595305067512,
    -771.8595065865089,
    -770.8594826276476,
    -769.8594586300543,
    -768.8594345936151,
    -767.8594105182149,
    -766.8593864037389,
    -765.859362250072,
    -764.8593380570986,
    -763.8593138247027,
    -762.8592895527669,
    -761.8592652411713,
    -760.8592408898015,
    -759.8592164985383,
    -758.8591920672604,
    -757.8591675958528,
    -756.8591430841896,
    -755.859118532156,
    -754.8590939396265,
    -753.8590693064825,
    -752.8590446326024,
    -751.8590199178593,
    -750.858995162134,
    -749.8589703653023,
    -748.8589455272397,
    -747.858920647821,
    -746.85889572692,
    -745.8588707644122,
    -744.8588457601711,
    -743.8588207140696,
    -742.8587956259801,
    -741.8587704957733,
    -740.858745323322,
    -739.858720108497,
    -738.8586948511689,
    -737.8586695512065,
    -736.8586442084774,
    -735.8586188228534,
    -734.8585933941993,
    -733.8585679223843,
    -732.8585424072742,
    -731.8585168487357,
    -730.858491246633,
    -729.8584656008337,
    -728.8584399111985,
    -727.8584141775931,
    -726.8583883998812,
    -725.8583625779248,
    -724.858336711585,
    -723.8583108007225,
    -722.858284845199,
    -721.8582588448742,
    -720.8582327996077,
    -719.858206709258,
    -718.8581805736817,
    -717.8581543927374,
    -716.8581281662824,
    -715.8581018941729,
    -714.8580755762632,
    -713.8580492124074,
    -712.8580228024625,
    -711.8579963462779,
    -710.8579698437104,
    -709.8579432946082,
    -708.8579166988268,
    -707.8578900562121,
    -706.8578633666177,
    -705.8578366298929,
    -704.8578098458843,
    -703.8577830144399,
    -702.8577561354081,
    -701.8577292086351,
    -700.8577022339665,
    -699.8576752112474,
    -698.857648140322,
    -697.8576210210341,
    -696.8575938532268,
    -695.8575666367407,
    -694.8575393714175,
    -693.8575120570995,
    -692.8574846936261,
    -691.8574572808338,
    -690.8574298185655,
    -689.8574023066534,
    -688.8573747449398,
    -687.8573471332553,
    -686.8573194714392,
    -685.8572917593254,
    -684.857263996745,
    -683.8572361835328,
    -682.8572083195209,
    -681.8571804045404,
    -680.8571524384215,
    -679.8571244209938,
    -678.8570963520864,
    -677.8570682315269,
    -676.857040059143,
    -675.8570118347612,
    -674.8569835582043,
    -673.8569552292996,
    -672.8569268478719,
    -671.8568984137396,
    -670.85686992673,
    -669.8568413866597,
    -668.8568127933534,
    -667.8567841466256,
    -666.8567554462984,
    -665.8567266921893,
    -664.8566978841139,
    -663.856669021887,
    -662.856640105325,
    -661.856611134242,
    -660.8565821084508,
    -659.8565530277637,
    -658.856523891992,
    -657.8564947009442,
    -656.8564654544309,
    -655.8564361522617,
    -654.8564067942433,
    -653.85637738018,
    -652.8563479098815,
    -651.8563183831469,
    -650.8562887997851,
    -649.8562591595944,
    -648.8562294623785,
    -647.8561997079385,
    -646.856169896073,
    -645.8561400265789,
    -644.8561100992555,
    -643.8560801138992,
    -642.8560500703054,
    -641.8560199682684,
    -640.8559898075806,
    -639.8559595880342,
    -638.8559293094219,
    -637.8558989715342,
    -636.8558685741567,
    -635.8558381170811,
    -634.8558076000919,
    -633.8557770229769,
    -632.8557463855176,
    -631.855715687501,
    -630.8556849287085,
    -629.8556541089187,
    -628.8556232279143,
    -627.8555922854741,
    -626.8555612813758,
    -625.8555302153959,
    -624.8554990873101,
    -623.8554678968926,
    -622.8554366439147,
    -621.8554053281509,
    -620.8553739493727,
    -619.8553425073447,
    -618.8553110018414,
    -617.8552794326242,
    -616.8552477994635,
    -615.8552161021215,
    -614.855184340361,
    -613.8551525139458,
    -612.8551206226359,
    -611.8550886661909,
    -610.8550566443687,
    -609.8550245569263,
    -608.8549924036197,
    -607.8549601842033,
    -606.8549278984297,
    -605.8548955460489,
    -604.8548631268146,
    -603.8548306404723,
    -602.8547980867729,
    -601.8547654654586,
    -600.8547327762781,
    -599.8547000189736,
    -598.8546671932847,
    -597.8546342989546,
    -596.8546013357217,
    -595.8545683033241,
    -594.8545352014979,
    -593.8545020299783,
    -592.8544687884962,
    -591.854435476786,
    -590.8544020945791,
    -589.8543686416003,
    -588.8543351175817,
    -587.8543015222449,
    -586.8542678553177,
    -585.8542341165216,
    -584.8542003055762,
    -583.8541664222031,
    -582.8541324661202,
    -581.8540984370437,
    -580.8540643346888,
    -579.854030158769,
    -578.8539959089945,
    -577.8539615850757,
    -576.8539271867234,
    -575.8538927136407,
    -574.8538581655362,
    -573.8538235421096,
    -572.8537888430659,
    -571.8537540681043,
    -570.8537192169206,
    -569.8536842892134,
    -568.8536492846775,
    -567.8536142030059,
    -566.8535790438893,
    -565.853543807016,
    -564.8535084920754,
    -563.8534730987546,
    -562.8534376267326,
    -561.8534020756975,
    -560.8533664453242,
    -559.8533307352948,
    -558.8532949452851,
    -557.8532590749693,
    -556.8532231240196,
    -555.8531870921066,
    -554.8531509788993,
    -553.8531147840648,
    -552.8530785072687,
    -551.8530421481746,
    -550.8530057064393,
    -549.852969181727,
    -548.8529325736893,
    -547.8528958819852,
    -546.8528591062664,
    -545.8528222461813,
    -544.8527853013802,
    -543.8527482715095,
    -542.8527111562136,
    -541.8526739551324,
    -540.8526366679081,
    -539.8525992941792,
    -538.8525618335784,
    -537.8525242857419,
    -536.8524866502976,
    -535.8524489268774,
    -534.8524111151069,
    -533.8523732146091,
    -532.8523352250065,
    -531.852297145919,
    -530.852258976963,
    -529.8522207177542,
    -528.8521823679062,
    -527.8521439270268,
    -526.8521053947252,
    -525.8520667706052,
    -524.8520280542718,
    -523.8519892453235,
    -522.8519503433573,
    -521.8519113479699,
    -520.8518722587539,
    -519.851833075298,
    -518.8517937971903,
    -517.8517544240174,
    -516.8517149553593,
    -515.8516753907969,
    -514.8516357299056,
    -513.8515959722616,
    -512.8515561174356,
    -511.85151616499576,
    -510.85147611450776,
    -509.8514359655352,
    -508.8513957176387,
    -507.8513553703769,
    -506.8513149233016,
    -505.8512743759674,
    -504.85123372792043,
    -503.85119297870915,
    -502.8511521278756,
    -501.85111117495916,
    -500.85107011949657,
    -499.85102896102194,
    -498.85098769906676,
    -497.85094633315975,
    -496.85090486282184,
    -495.85086328757933,
    -494.8508216069453,
    -493.85077982043873,
    -492.85073792757055,
    -491.8506959278489,
    -490.85065382077926,
    -489.8506116058639,
    -488.85056928260235,
    -487.85052685048606,
    -486.8504843090126,
    -485.85044165766453,
    -484.85039889593116,
    -483.8503560232928,
    -482.8503130392271,
    -481.8502699432083,
    -480.85022673470763,
    -479.85018341319324,
    -478.8501399781258,
    -477.8500964289686,
    -476.8500527651745,
    -475.8500089861986,
    -474.8499650914886,
    -473.84992108048897,
    -472.8498769526405,
    -471.849832707381,
    -470.84978834414443,
    -469.8497438623559,
    -468.84969926144595,
    -467.8496545408315,
    -466.84960969993136,
    -465.84956473815873,
    -464.8495196549223,
    -463.849474449627,
    -462.84942912167133,
    -461.8493836704531,
    -460.84933809536415,
    -459.84929239579253,
    -458.84924657111856,
    -457.8492006207234,
    -456.84915454398123,
    -455.8491083402614,
    -454.8490620089271,
    -453.84901554934237,
    -452.84896896086025,
    -451.84892224283453,
    -450.8488753946103,
    -449.84882841552843,
    -448.84878130492666,
    -447.84873406213666,
    -446.8486866864871,
    -445.8486391772993,
    -444.8485915338905,
    -443.8485437555717,
    -442.8484958416515,
    -441.8484477914315,
    -440.8483996042086,
    -439.8483512792736,
    -438.8483028159119,
    -437.8482542134064,
    -436.8482054710316,
    -435.8481565880559,
    -434.84810756374566,
    -433.8480583973594,
    -432.84800908814833,
    -431.84795963536317,
    -430.8479100382433,
    -429.84786029602674,
    -428.84781040794235,
    -427.84776037321376,
    -426.84771019105943,
    -425.8476598606926,
    -424.8476093813204,
    -423.8475587521395,
    -422.84750797234614,
    -421.84745704112754,
    -420.8474059576646,
    -419.84735472113243,
    -418.84730333069905,
    -417.84725178552503,
    -416.847200084767,
    -415.84714822757354,
    -414.84709621308536,
    -413.8470440404376,
    -412.8469917087592,
    -411.84693921717,
    -410.84688656478545,
    -409.84683375071,
    -408.8467807740457,
    -407.8467276338849,
    -406.84667432931155,
    -405.84662085940363,
    -404.84656722323257,
    -403.8465134198609,
    -402.84645944834256,
    -401.8464053077247,
    -400.8463509970477,
    -399.8462965153451,
    -398.84624186163575,
    -397.8461870349393,
    -396.84613203426204,
    -395.8460768586033,
    -394.84602150695474,
    -393.84596597829517,
    -392.8459102716029,
    -391.84585438584156,
    -390.8457983199671,
    -389.84574207292775,
    -388.84568564366407,
    -387.84562903110276,
    -386.84557223416766,
    -385.8455152517692,
    -384.84545808280956,
    -383.84540072618285,
    -382.8453431807705,
    -381.84528544544884,
    -380.84522751908037,
    -379.8451694005188,
    -378.84511108860926,
    -377.8450525821883,
    -376.8449938800755,
    -375.8449349810881,
    -374.84487588402897,
    -373.8448165876918,
    -372.8447570908551,
    -371.8446973922952,
    -370.84463749077037,
    -369.8445773850296,
    -368.84451707381214,
    -367.84445655584705,
    -366.84439582984623,
    -365.84433489451675,
    -364.844273748551,
    -363.84421239062846,
    -362.84415081941887,
    -361.84408903357826,
    -360.844027031752,
    -359.84396481257215,
    -358.84390237465715,
    -357.8438397166152,
    -356.8437768370386,
    -355.84371373451023,
    -354.8436504075962,
    -353.84358685485245,
    -352.8435230748192,
    -351.84345906602465,
    -350.8433948269827,
    -349.8433303561916,
    -348.8432656521391,
    -347.8432007132936,
    -346.84313553811336,
    -345.8430701250396,
    -344.8430044725017,
    -343.8429385789102,
    -342.8428724426611,
    -341.8428060621371,
    -340.8427394357045,
    -339.84267256171296,
    -338.8426054384953,
    -337.84253806437033,
    -336.8424704376402,
    -335.8424025565889,
    -334.84233441948334,
    -333.8422660245756,
    -332.84219737009914,
    -331.84212845427,
    -330.8420592752856,
    -329.84198983132796,
    -328.8419201205567,
    -327.8418501411177,
    -326.8417798911357,
    -325.84170936871527,
    -324.8416385719453,
    -323.84156749889127,
    -322.8414961476016,
    -321.84142451610535,
    -320.8413526024089,
    -319.84128040449843,
    -318.8412079203423,
    -317.8411351478839,
    -316.8410620850485,
    -315.8409887297391,
    -314.84091507983214,
    -313.84084113318954,
    -312.8407668876465,
    -311.8406923410138,
    -310.8406174910831,
    -309.8405423356191,
    -308.84046687236577,
    -307.8403910990388,
    -306.84031501333413,
    -305.84023861292013,
    -304.84016189543985,
    -303.840084858512,
    -302.8400074997281,
    -301.83992981665625,
    -300.83985180683385,
    -299.839773467773,
    -298.83969479696174,
    -297.8396157918544,
    -296.8395364498797,
    -295.8394567684418,
    -294.8393767449082,
    -293.83929637662135,
    -292.83921566089623,
    -291.8391345950118,
    -290.8390531762197,
    -289.8389714017405,
    -288.8388892687617,
    -287.8388067744407,
    -286.83872391589773,
    -285.8386406902252,
    -284.83855709447846,
    -283.8384731256811,
    -282.8383887808215,
    -281.8383040568491,
    -280.8382189506839,
    -279.8381334592042,
    -278.8380475792556,
    -277.8379613076429,
    -276.83787464113595,
    -275.8377875764629,
    -274.83770011031515,
    -273.83761223934323,
    -272.83752396015853,
    -271.8374352693279,
    -270.83734616338137,
    -269.8372566388034,
    -268.83716669203585,
    -267.8370763194764,
    -266.8369855174806,
    -265.8368942823563,
    -264.836802610367,
    -263.8367104977279,
    -262.83661794060964,
    -261.83652493513074,
    -260.8364314773629,
    -259.8363375633299,
    -258.83624318900183,
    -257.8361483502984,
    -256.8360530430881,
    -255.83595726318316,
    -254.83586100634616,
    -253.83576426827958,
    -252.83566704463524,
    -251.83556933100294,
    -250.8354711229193,
    -249.83537241585802,
    -248.8352732052361,
    -247.8351734864072,
    -246.83507325466465,
    -245.83497250523757,
    -244.8348712332918,
    -243.83476943392694,
    -242.8346671021775,
    -241.83456423300788,
    -240.83446082131715,
    -239.83435686193064,
    -238.8342523496033,
    -237.83414727902044,
    -236.83404164479003,
    -235.83393544144522,
    -234.83382866344402,
    -233.83372130516415,
    -232.83361336090564,
    -231.8335048248875,
    -230.83339569124334,
    -229.8332859540276,
    -228.83317560720263,
    -227.83306464465062,
    -226.83295306016072,
    -225.8328408474309,
    -224.83272800006898,
    -223.83261451158592,
    -222.83250037540108,
    -221.83238558483225,
    -220.8322701330992,
    -219.832154013319,
    -218.83203721850435,
    -217.8319197415656,
    -216.83180157530197,
    -215.8316827124049,
    -214.83156314545224,
    -213.83144286690776,
    -212.83132186911863,
    -211.83120014431302,
    -210.83107768459746,
    -209.83095448195513,
    -208.83083052824205,
    -207.83070581518547,
    -206.83058033437905,
    -205.83045407728528,
    -204.83032703522545,
    -203.8301991993819,
    -202.83007056079506,
    -201.82994111035913,
    -200.82981083881504,
    -199.8296797367548,
    -198.82954779461357,
    -197.82941500266693,
    -196.82928135102483,
    -195.82914682963644,
    -194.82901142827555,
    -193.82887513654597,
    -192.8287379438699,
    -191.82859983948998,
    -190.82846081246342,
    -189.8283208516565,
    -188.82817994574117,
    -187.8280380831902,
    -186.8278952522723,
    -185.8277514410502,
    -184.82760663737247,
    -183.8274608288696,
    -182.82731400294878,
    -181.8271661467881,
    -180.82701724733312,
    -179.82686729129006,
    -178.82671626511953,
    -177.82656415503112,
    -176.82641094697615,
    -175.82625662664347,
    -174.826101179454,
    -173.8259445905466,
    -172.82578684478278,
    -171.8256279267292,
    -170.8254678206554,
    -169.82530651052653,
    -168.82514397999466,
    -167.82498021238814,
    -166.824815190708,
    -165.8246488976158,
    -164.82448131542773,
    -163.82431242610224,
    -162.82414221123418,
    -161.82397065203963,
    -160.8237977293542,
    -159.82362342361472,
    -158.82344771485222,
    -157.82327058268112,
    -156.82309200628717,
    -155.82291196441332,
    -154.82273043535184,
    -153.82254739692948,
    -152.82236282649302,
    -151.82217670089784,
    -150.82198899649373,
    -149.82179968910685,
    -148.8216087540315,
    -147.82141616600902,
    -146.82122189920975,
    -145.8210259272257,
    -144.82082822304392,
    -143.82062875903017,
    -142.82042750691647,
    -141.82022443777373,
    -140.82001952199573,
    -139.81981272927834,
    -138.81960402859758,
    -137.81939338818455,
    -136.81918077550654,
    -135.81896615724148,
    -134.81874949924682,
    -133.81853076654454,
    -132.8183099232845,
    -131.818086932719,
    -130.81786175717426,
    -129.81763435802011,
    -128.817404695634,
    -127.81717272937422,
    -126.81693841753989,
    -125.8167017173356,
    -124.81646258483727,
    -123.81622097494878,
    -122.81597684136221,
    -121.81573013651774,
    -120.81548081155266,
    -119.81522881626378,
    -118.81497409905141,
    -117.81471660686915,
    -116.81445628517717,
    -115.81419307787655,
    -114.81392692726043,
    -113.81365777394822,
    -112.8133855568229,
    -111.81311021296442,
    -110.81283167757668,
    -109.81254988392277,
    -108.81226476323829,
    -107.81197624465749,
    -106.8116842551224,
    -105.81138871929983,
    -104.81108955948841,
    -103.81078669551366,
    -102.81048004463155,
    -101.81016952141559,
    -100.80985503764596,
    -99.80953650218696,
    -98.80921382086089,
    -97.80888689631563,
    -96.80855562788153,
    -95.80821991142436,
    -94.80787963918803,
    -93.80753469962848,
    -92.80718497723899,
    -91.8068303523646,
    -90.80647070100329,
    -89.80610589460537,
    -88.80573579984554,
    -87.80536027839497,
    -86.80497918666813,
    -85.80459237556802,
    -84.8041996901992,
    -83.80380096957771,
    -82.80339604630969,
    -81.80298474625805,
    -80.80256688818518,
    -79.80214228337024,
    -78.80171073519838,
    -77.80127203873474,
    -76.80082598024968,
    -75.80037233672851,
    -74.79991087533188,
    -73.79944135283701,
    -72.798963515011,
    -71.79847709596723,
    -70.79798181745181,
    -69.79747738808845,
    -68.79696350255594,
    -67.79643984071446,
    -66.79590606665133,
    -65.79536182765294,
    -64.79480675309819,
    -63.79424045325487,
    -62.79366251797551,
    -61.79307251528802,
    -60.79246998985531,
    -59.79185446130799,
    -58.79122542241777,
    -57.79058233711575,
    -56.789924638318546,
    -55.78925172555505,
    -54.788562962359514,
    -53.787857673415445,
    -52.78713514141153,
    -51.78639460358091,
    -50.78563524788078,
    -49.784856208769426,
    -48.784056562530246,
    -47.78323532207988,
    -46.78239143119587,
    -45.78152375808231,
    -44.78063108818667,
    -43.779712116147806,
    -42.77876543676861,
    -41.777789534849205,
    -40.776782773725515,
    -39.77574338229353,
    -38.77466944028408,
    -37.773558861510686,
    -36.772409374736434,
    -35.77121850174249,
    -34.7699835321264,
    -33.76870149420237,
    -32.7673691212845,
    -31.76598281245744,
    -30.764538586717748,
    -29.763032029126634,
    -28.7614582272643,
    -27.75981169582607,
    -26.75808628666094,
    -25.756275080770283,
    -24.754370257822497,
    -23.752362937384387,
    -22.750242984305284,
    -21.74799876820044,
    -20.745616863606777,
    -19.743081672589675,
    -18.740374944779376,
    -17.737475159977045,
    -16.734356723955194,
    -15.73098890633229,
    -14.72733441601871,
    -13.723347457363973,
    -12.718971025748809,
    -11.7141330612286,
    -10.708740838253798,
    -9.702672540001887,
    -8.695764163816218,
    -7.687788325031687,
    -6.678418213073365,
    -5.667162441557165,
    -4.653237761743087,
    -3.635293366437148,
    -2.6107208684442234,
    -1.573498473162773,
    -0.5040830082649158,
    1.461632144963766
  ]);

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

  let boundC = 1e30;

  function bound(x) {
    return Math.max(Math.min(x, boundC), -boundC)
  }

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
    eulerGamma: eulerGamma,
    bound: bound
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

      this.remove();

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
      if (!element) {
        return this.parent.remove(this)
      }

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

    // If we are zoomed in too far, this function will zoom in/out until the
    preventExcessiveZoom() {

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

    zoomOn(factor, v = new Vec2(this.coords.cx, this.coords.cy), ...args) {
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

    removeInfinities() {
      const vertices = this.vertices;

      if (!vertices)
        return

      for (let i = 0; i < vertices.length; ++i) {
        if (vertices[i] > 1e6) {
          vertices[i] = 1e6;
        } else if (vertices[i] < -1e6) {
          vertices[i] = -1e6;
        }
      }
    }

    get glVertices() {
      return this.vertices
    }

    set glVertices(verts) {
      this.vertices = verts;

      this.removeInfinities();
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
        return node.getTreeText()
      };

      this.vertices = [];
      this.labels = [];

      this.addEventListener("plotcoordschanged", () => this.markUpdate());
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

    let final_vertices = [];

    for (let i = 0; i < vertices.length; i += 2) {
      let angle_i = i / 2;

      if (angles[angle_i] === 3 || angles[angle_i - 1] === 3) { //&& Math.abs(vertices[i+1] - vertices[i+3]) > yRes / 2) {
        let vs = adaptively_sample_1d(vertices[i], vertices[i + 2], func, 3, aspectRatio, yRes, maxDepth, angle_threshold, depth + 1, true, ptCount);

        for (let i = 0 ; i < vs.length; ++i) {
          final_vertices.push(vs[i]);
        }

        if (final_vertices.length > MAX_POINTS)
          return final_vertices.subarray(0, index)
      } else {
        final_vertices.push(vertices[i], vertices[i+1]);
      }
    }

    return final_vertices
  }

  function sample_1d(start, end, func, points=500, includeEndpoints=true) {
    let vertices = [];

    points = Math.ceil(points);

    for (let i = 1 - includeEndpoints; i <= points - (1 - includeEndpoints); ++i) {
      let x = start + i * (end - start) / points;

      vertices.push(x, func(x));
    }

    return vertices
  }

  function adaptively_sample_parametric_1d(start, end, func, initialPoints=500, aspectRatio=1, maxDepth=MAX_DEPTH, angle_threshold=0.1, depth=0, ptCount=0) {
    if (depth > maxDepth || start === undefined || end === undefined || isNaN(start) || isNaN(end))
      return [NaN, NaN]

    let vertices = sample_parametric_1d(start, end, func, initialPoints);

    let angles = new Float32Array(anglesBetween(vertices, angle_threshold, aspectRatio));

    let final_vertices = [];

    function addVertices(arr) {
      for (let i = 0 ; i < arr.length; ++i) {
        final_vertices.push(arr[i]);
      }
    }

    let len = vertices.length;

    for (let i = 0; i < len; i += 2) {
      let angle_i = i / 2;

      if (angles[angle_i] === 3 || angles[angle_i - 1] === 3) { //&& Math.abs(vertices[i+1] - vertices[i+3]) > yRes / 2) {
        let rStart = start + i / len * (end - start), rEnd = start + (i + 2) / len * (end - start);

        let vs = adaptively_sample_parametric_1d(rStart,
          rEnd,
          func, 3,
          aspectRatio, maxDepth,
          angle_threshold, depth + 1, ptCount);

        addVertices(vs);

        if (final_vertices.length > MAX_POINTS)
          return final_vertices
      } else {
        final_vertices.push(vertices[i], vertices[i+1]);
      }
    }

    return final_vertices
  }

  function sample_parametric_1d(start, end, func, points=500, includeEndpoints=true) {
    let vertices = [];

    for (let i = 1 - includeEndpoints; i <= points - (1 - includeEndpoints); ++i) {
      let t = start + i * (end - start) / points;

      let result = func(t);

      vertices.push(result.x, result.y);
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

  const Multiply$1 = (a, b) => a * b;

  const Add$1 = (a, b) => a + b;

  const Subtract$1 = (a, b) => a - b;

  const Divide$1 = (a, b) => a / b;

  const Ln = Math.log;

  const Log = Ln;

  const Log2 = Math.log2;

  const Log10 = Math.log10;

  const Sin = Math.sin;

  const Cos = Math.cos;

  const Tan = Math.tan;

  const Sec = x => 1 / Math.cos(x);

  const Csc = x => 1 / Math.sin(x);

  const Cot = x => 1 / Math.tan(x);

  const Arcsin = Math.asin;

  const Arccos = Math.acos;

  const Arctan = Math.atan;

  const Arcsec = x => Math.acos(1 / x);

  const Arccsc = x => Math.asin(1 / x);

  const Sinh = Math.sinh;

  const Cosh = Math.cosh;

  const Tanh = Math.tanh;

  const Sech = x => 1 / Math.cosh(x);

  const Csch = x => 1 / Math.sinh(x);

  const Coth = x => 1 / Math.tanh(x);

  const Arcsinh = Math.asinh;

  const Arccosh = Math.acosh;

  const Arctanh = Math.atanh;

  const Arcsech = x => Math.acosh( 1 / x);

  const Arccsch = x => Math.asinh(1 / x);

  const Arccoth = x => Math.atanh(1 / x);

  var BasicFunctions = /*#__PURE__*/Object.freeze({
    Multiply: Multiply$1,
    Add: Add$1,
    Subtract: Subtract$1,
    Divide: Divide$1,
    Ln: Ln,
    Log: Log,
    Log2: Log2,
    Log10: Log10,
    Sin: Sin,
    Cos: Cos,
    Tan: Tan,
    Sec: Sec,
    Csc: Csc,
    Cot: Cot,
    Arcsin: Arcsin,
    Arccos: Arccos,
    Arctan: Arctan,
    Arcsec: Arcsec,
    Arccsc: Arccsc,
    Sinh: Sinh,
    Cosh: Cosh,
    Tanh: Tanh,
    Sech: Sech,
    Csch: Csch,
    Coth: Coth,
    Arcsinh: Arcsinh,
    Arccosh: Arccosh,
    Arctanh: Arctanh,
    Arcsech: Arcsech,
    Arccsch: Arccsch,
    Arccoth: Arccoth
  });

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

  const ZETA_N = 30;
  const ZETA_COEFFS = [];

  for (let k = 0; k <= ZETA_N; ++k) {
    let value = 0;

    for (let j = k; j <= ZETA_N; ++j) {
      value += gamma(ZETA_N + j - 1) * 4 ** j / gamma(ZETA_N - j) / gamma(2 * j);
    }

    value *= ZETA_N;

    ZETA_COEFFS.push(value);
  }

  function zeta(r) {
    if (r === 1)
      return Infinity

    if (r % 2 === 0 && r < 0)
      return 0

    if (r % 2 === 0 && r > 1) {
      if (r > 100)
        return 1

      let prod1 = ((r / 2 + 1) % 2 === 0 ? 1 : -1) * bernoulli(r);

      let lnProd2 = Math.log(2 * Math.PI) * r - Math.log(2) - ln_gamma(r + 1);

      return prod1 * Math.exp(lnProd2)
    }

    if (r < 0.5) {
      // zeta(s) = 2 ^ s * pi ^ (s - 1) * sin( pi * s / 2 ) * gamma( 1 - s ) * zeta( 1 - s )

      return 2 ** r * Math.PI ** (r - 1) * Math.sin(Math.PI * r / 2) * gamma(1 - r) * zeta(1 - r)
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

  function hurwitzZeta(s, v) {
  }

  zeta.coeffs = ZETA_COEFFS;
  zeta.n = ZETA_N;

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

  function Si(x) {
    if (x === 0)
      return 0

    if (x < 0)
      return -Si(-x)

    if (x <= 4) {
      // PADE APPROXIMANT

      let xSq = x * x;

      return x * SiP1.evaluate(xSq) / SiQ1.evaluate(xSq)
    } else {
      return Math.PI / 2 - f(x) * Math.cos(x) - g$1(x) * Math.sin(x)
    }
  }

  function Ci(x) {
    if (x === 0)
      return -Infinity

    if (x < 0)
      return Ci(-x)

    if (x <= 4) {
      // PADE APPROXIMANT
      let xSq = x * x;

      return eulerGamma + Math.log(x) + xSq * CiP1.evaluate(xSq) / CiQ1.evaluate(xSq)
    } else {
      return f(x) * Math.sin(x) - g$1(x) * Math.cos(x)
    }
  }

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

  agm.MAX_ITERS = MAX_ITERS;

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

  function ellipticK(m) {
    const absM = Math.abs(m);

    if (m > 1)
      return NaN

    if (absM === 1)
      return Infinity

    return Math.PI / 2 / agm(1, Math.sqrt(1 - m))
  }

  // See https://dlmf.nist.gov/19.8
  function ellipticE(m, tolerance=1e-15) {
    if (m > 1)
      return NaN
    else if (m === 1)
      return 1

    if (m > 0) {
      let an = 1, gn = Math.sqrt(1 - m);
      let cn = Math.sqrt(Math.abs(an * an - gn * gn));
      let i = 0;
      let sum = 0;

      do {
        sum += (2 ** (i - 1)) * cn * cn;

        i++;

        let tmp = an;
        an = (an + gn) / 2;
        gn = Math.sqrt(tmp * gn);

        cn = cn * cn / (4 * an);
      } while (Math.abs(an - gn) > tolerance && i < agm.MAX_ITERS)

      return Math.PI / (2 * an) * (1 - sum);
    } else if (m === 0) {
      return Math.PI / 2
    } else {
      // Note that E(-m) = sqrt(m+1) * E(m / (m+1))

      let nM = -m;

      return Math.sqrt(nM + 1) * ellipticE(nM / (nM + 1), tolerance)
    }
  }

  // Doesn't work yet
  function ellipticPi(n, m, tolerance=1e-15) {
    if (m > 1)
      return NaN
    else if (m === 1)
      return Infinity

    if (m > 0) {
      let an = 1, gn = Math.sqrt(1 - m);
      let pn = 1 - n;
      let Qn = 1;
      let i = 0;
      let sum = 0;

      do {
        sum += Qn;

        i++;

        let tmp = an;
        an = (an + gn) / 2;
        gn = Math.sqrt(tmp * gn);

        let pn2 = pn * pn;
        let angn = an * gn;

        let en = (pn2 - angn) / (pn2 + angn);

        pn = (pn2 + angn) / (2 * pn);

        Qn = 0.5 * Qn * en;

      } while (Math.abs(an - gn) > tolerance && i < agm.MAX_ITERS)

      return Math.PI / (4 * an) * (2 + n / (1 - n) * sum);
    } else if (m === 0) {
      return Math.PI / (2 * Math.sqrt(1 - n))
    } else {
      // Note that Pi(n, -m) = 1 / ((1 - n) * sqrt(m + 1)) * Pi(n / (n-1) | m / (m+1))

      let nM = -m;

      return 1 / ((1 - n) * Math.sqrt(nM + 1) * ellipticPi(n / (n - 1), nM / (nM + 1)))
    }
  }

  function ellipsePerimeter(a, b) {
    return 4 * a * ellipticE(1 - b * b / (a * a))
  }

  function ellipticEModulus(m) {
    return ellipticE(m * m)
  }

  function ellipticKModulus(m) {
    return ellipticK(m * m)
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

    return mulMod(b, y, m)
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

  function eratosthenes(n) {
    // Eratosthenes algorithm to find all primes under n
    let array = [], upperLimit = Math.sqrt(n), output = [];

    // Make an array from 2 to (n - 1)
    for (let i = 0; i < n; i++) {
      array.push(true);
    }

    // Remove multiples of primes starting from 2, 3, 5,...
    for (let i = 2; i <= upperLimit; i++) {
      if (array[i]) {
        for (var j = i * i; j < n; j += i) {
          array[j] = false;
        }
      }
    }

    // All array[i] set to true are primes
    for (let i = 2; i < n; i++) {
      if (array[i]) {
        output.push(i);
      }
    }

    return output;
  }

  function eratosthenesWithPi(n) {
    let array = new Uint8Array(n), upperLimit = Math.ceil(Math.sqrt(n)), output = [];
    let pi = [0, 0];

    array.fill(1);

    for (let i = 2; i <= upperLimit; i++) {
      if (array[i] === 1) {
        let iSquared = i * i;

        for (let j = iSquared; j < n; j += i) {
          array[j] = 0;
        }
      }
    }

    let cnt = 0;

    for (let i = 2; i < n; i++) {
      if (array[i] === 1) {
        output.push(i);
        cnt++;
      }

      pi.push(cnt);
    }

    return {primes: output, pi: new Uint32Array(pi)}
  }

  const DEFAULT_BLOCK_SIZE = 1e5;

  const phiMemo = [];
  let primes = [];

  function Phi(m, b) {
    if (b === 0)
      return m
    if (m === 0)
      return 0

    if (m >= 800) {
      return Phi(m, b - 1) - Phi(Math.floor(m / primes[b - 1]), b - 1)
    }

    let t = b * 800 + m;

    if (!phiMemo[t]) {
      phiMemo[t] = Phi(m, b - 1) - Phi(Math.floor(m / primes[b - 1]), b - 1);
    }

    return phiMemo[t]
  }

  const smallValues = [0, 0, 1, 2, 2, 3];
  let piValues;

  function computeEratosthenes(top) {
    let res = eratosthenesWithPi(top + 1);

    primes = new Uint32Array(res.primes);
    piValues = res.pi;
  }

  computeEratosthenes(1000);

  function primeCountingFunction(x) {
    if (x > 1e10)
      return li(x)

    if (x < 6)
      return smallValues[x]
    if (x < piValues.length)
      return piValues[x]

    // The square root of x
    let root2 = Math.floor(Math.sqrt(x));
    let root3 = Math.floor(x ** (1/3));

    let top = Math.floor(x / root3) + 1;

    if (top + 1 >= primes.length) {
      computeEratosthenes(top);
    }

    let a = piValues[root3 + 1], b = piValues[root2 + 1];

    let sum = 0;

    for (let i = a; i < b; ++i) {
      let p = primes[i];

      sum += piValues[Math.floor(x / p)] + 1;
    }

    let primeCnt = b - a;

    sum -= primeCnt * (piValues[primes[a]] - 1);
    sum -= primeCnt * (primeCnt + 1) / 2;

    let phi = Phi(x, a);

    return phi + a - 1 - sum
  }

  let sieveArray, piArray;

  const potPrimeIndices = new Uint8Array([0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1]);
  const indicesLength = 30;

  function meisselLehmerExtended(x) {
    if (x < 1000)
      return primeCountingFunction(x)

    // The square root of x
    let root2 = Math.floor(Math.sqrt(x));
    let root3 = Math.floor(x ** (1/3));

    let top = root3 + 2;

    if (top >= primes.length) {
      let res = eratosthenesWithPi(top + 2);

      primes = res.primes;
      piValues = res.pi;
    }

    let a = piValues[root3 + 1], b = piValues[root2 + 1];

    let BLOCK_SIZE = Math.max(a + 1, DEFAULT_BLOCK_SIZE);

    if (!sieveArray || BLOCK_SIZE > sieveArray.length) {
      sieveArray = new Uint8Array(BLOCK_SIZE);
      piArray = new ((1.01 * li(x) < 4.2e9) ? Uint32Array : Array) (BLOCK_SIZE);
    }

    let ai = root3 + 1;
    let bi = Math.ceil(x / root3) + 1;
    let egg = root2 + 1;
    let primeCnt = piValues[ai - 1], offset = ai;
    let sum = 0;
    let requiredHorses = [];

    while (true) {
      if (offset >= bi) {
        break
      }

      if (offset + BLOCK_SIZE >= bi) {
        BLOCK_SIZE = bi - offset;
      }

      let start = mod(-offset, 30);

      sieveArray.fill(0);

      for (let i = 0; i < indicesLength; ++i) {
        let index = potPrimeIndices[i];

        if (start >= i) {
          if (index)
            sieveArray[start - i] = 1;
        } else {
          break
        }
      }

      const maxI = sieveArray.length - indicesLength - start;

      let i = 0;

      for (; i < maxI; i += indicesLength) {
        let index = start + i;

        sieveArray.set(potPrimeIndices, index);
      }

      sieveArray.set(potPrimeIndices.subarray(0, (sieveArray.length % indicesLength) - start), start + i);

      for (let i = 3; i < a; ++i) {
        let p = primes[i];

        let cow = offset % p;

        let m = 0;

        if (cow === 0)
          m = offset;
        else
          m = offset - cow + p;

        for (let j = 0; j < BLOCK_SIZE; j += p) {
          let potP = j + m;

          if (potP !== p) {
            sieveArray[potP - offset] = 0;
          }
        }
      }

      for (let i = 0; i < BLOCK_SIZE; ++i) {
        if (sieveArray[i] === 1) {
          let p = i + offset;

          primeCnt++;

          if (ai <= p && p < egg) {
            sum += 1 - primeCnt;
            requiredHorses.push(Math.floor(x / p));
          }
        }

        piArray[i] = primeCnt;
      }

      for (let i = requiredHorses.length - 1; i >= 0; --i) {
        let pop = requiredHorses[i];

        if (pop < offset + BLOCK_SIZE) {
          sum += piArray[pop - offset];
        } else {
          break
        }

        requiredHorses.pop();
      }

      offset += BLOCK_SIZE;
    }

    return Phi(x, a) + a - 1 - sum
  }

  const PI2 = 2 * Math.PI;

  function Cl2(theta, threshold=1e-15) {
    if (theta === 0)
      return 0

    theta = mod(theta, PI2);

    if (theta < 1e-18)
      return 0

    let sum1 = 3 - Math.log(Math.abs(theta) * (1 - (theta / (PI2)) ** 2));
    let sum2 = 2 * Math.PI / theta * Math.log((PI2 + theta) / (2 * Math.PI - theta));
    let sum = 0;
    let prod = 1;
    let base = (theta / (2 * Math.PI)) ** 2;

    for (let n = 1; n < 20; ++n) {
      prod *= base;

      let component = (zeta(2 * n) - 1) / (n * (2 * n + 1)) * prod;

      sum += component;

      if (component < threshold) {
        break
      }
    }

    return (sum1 - sum2 + sum) * theta
  }

  // Integrate the function f from a to b in n steps using Simpson's rule
  function integrate(f, a, b, n) {
    // Indexing variable, step width
    let i, n2 = n * 2, h = (b - a) / n2;

    // Add the values of the function at the endpoints
    let sum = f(a) + f(b);

    // Add terms 1
    for (i = 1; i < n2; i += 2)
      sum += 4 * f(a + i*h);

    // Add terms 2
    for (i = 2; i < n2-1; i += 2)
      sum += 2 * f(a + i*h);

    return sum * h / 3
  }

  function integrateCow(z, terms=50) {
    return integrate(x => {
      return (x < 0.0001) ? -1 : x * digamma(x)
    }, 0, z,  terms)
  }

  function lnBarnesG(z, terms=50) {
    if (z < 0)
      return NaN

    // log G(z + 1) = (z - z^2) / 2 + z * log(2 * Math.PI) / 2 + integrateCow(z)
    // We want log G(z) of course

    z--;

    return (z - z*z) / 2 + z / 2 * Math.log(2 * Math.PI) + integrateCow(z, terms)
  }

  const BARNES_G_VALUES = [0, 1, 1, 1, 2, 12, 288, 34560, 24883200, 125411328000];

  function barnesG(z, terms=8) {
    // G(-z) = (-1)^(floor(z/2) - 1) * G(z+2) * (|sin(pi z)| / pi
    if (z < 1) {
      if (Number.isInteger(z))
        return 0

      // 2 pi log(G(1-z) / G(1+z)) = 2 pi z * log(sin pi z / pi) + Cl2(2 pi z)
      // Thus G(1-z) = G(1+z) * ( (sin(pi z) / pi)^z + exp(Cl2(2 pi z) / (2 pi)) )
      z = 1 - z;

      let z2pi = 2 * Math.PI * z;

      let base = Math.sin(Math.PI * z) / Math.PI;

      return barnesG(1 + z, terms) * (Math.sign(base) * Math.abs(base) ** z * Math.exp(Cl2(z2pi) / (2 * Math.PI)))
    }

    if (Number.isInteger(z) && z < 10) {
      return BARNES_G_VALUES[z]
    }

    return Math.exp(lnBarnesG(z, terms))
  }

  const log2Pi = Math.log(2 * Math.PI);

  function integrateLnGamma(z) {
    if (z === 1) {
      return log2Pi / 2
    }

    return z/2 * log2Pi + z * (1-z) / 2 + z * ln_gamma(z) - lnBarnesG(z+1)
  }

  function lnKFunction(z) {
    return log2Pi * ((1 - z) / 2) + (nCr(z, 2) + integrateLnGamma(z) - integrateLnGamma(1))
  }

  function KFunction(z) {
    if (z >= 0 && Number.isInteger(z)) {
      let prod = 1;

      for (let i = 0; i < z; ++i) {
        prod *= i ** i;
      }

      return prod
    }

    return Math.exp(lnKFunction(z))
  }

  const Beta = (a,b) => {
    if (a < 0 || b < 0)
      return gamma(a) * gamma(b) / gamma(a + b)
    return Math.exp(ln_gamma(a) + ln_gamma(b) - ln_gamma(a + b))
  };

  function besselJ0(z) {
    if (z < 0)
      return besselJ0(-z)

    if (z < 6) {
      let sum = 0;

      for (let m = 0; m <= 10; ++m) {
        let component = (-1) ** m / (factorial(m) ** 2) * (z/2) ** (2 * m);

        sum += component;
      }

      return sum
    }

    return Math.sqrt(2 / (Math.PI * z)) * (1 - 1/(16 * z * z) + 53/(512 * z**4)) * Math.cos(z - Math.PI/4 - 1/(8 * z) + 25/(384 * z ** 3))
  }

  function besselJ(n, z) {
    if (n === 0)
      return besselJ0(z)

    if (n < 0)
      return (n % 2 === 0 ? 1 : -1) * besselJ(-n, z)

    if (z < 0) {
      if (Number.isInteger(n)) {
        if (n % 2 === 0) {
          return besselJ(n, -z)
        } else {
          return -besselJ(n, -z)
        }
      } else return NaN
    }

    if (z < 6) {
      let sum = 0;

      for (let m = 0; m <= 10; ++m) {
        let component = (-1) ** m / (factorial(m) * factorial(m + n)) * (z/2) ** (2 * m + n);

        sum += component;
      }

      return sum
    }

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

  const ExtraFunctions = {
    Sqrt: Math.sqrt,
    Cbrt: Math.cbrt,
    Log2: Math.log2,
    Log10: Math.log10,
    Ln: Math.log,
    LogB: (b, v) => {
      return Math.log(v) / Math.log(b)
    },
    Factorial: (a) => {
      return ExtraFunctions.Gamma(a + 1)
    },
    Gamma: (a) => {
      return gamma(a)
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
    NormSinc: (x) => ExtraFunctions.Sinc(x * Math.PI),
    Si: Si,
    Ci: Ci,
    Erf: erf,
    Erfc: erfc,
    Gcd: (a, b) => gcd(Math.abs(a), Math.abs(b)),
    Lcm: (a, b) => a * b / ExtraFunctions.Gcd(a, b),
    FresnelS: S,
    FresnelC: C$1,
    InverseErf: inverseErf,
    InverseErfc: inverseErfc,
    ProductLog: productLog,
    ProductLogBranched: productLogBranched,
    EllipticE: ellipticEModulus,
    EllipticK: ellipticKModulus,
    EllipticPi: ellipticPi,
    Agm: agm,
    Abs: Math.abs,
    PrimeCount: (n) => {
      if (n <= 1) {
        return 0
      }

      return eratosthenes(n+1).length
    },
    Cl2: Cl2,
    BarnesG: barnesG,
    LnBarnesG: lnBarnesG,
    Beta: Beta,
    Exp: Math.exp,
    KFunction: KFunction,
    LnKFunction: lnKFunction,
    BesselJ: besselJ
  };

  const RealFunctions = {...BasicFunctions, ...ExtraFunctions};

  // This class represents an interval [min, max]. If defMin=defMax=true, the interval is defined for all x. If defMin=false
  // and defMax=true, then the interval may be defined for all x. If defMin=defMax=false, the interval is undefined for
  // all x. For example, sqrt([-2,-1]) would have defMin=defMax=false
  class RealInterval {
    constructor (min = 0, max = min, defMin = true, defMax = true) {
      this.min = min;
      this.max = max;
      this.defMin = defMin;
      this.defMax = defMax;
    }

    /**
     * Returns whether the interval can be represented as a single number; does it contain only one number.
     * @returns {boolean}
     */
    isExact () {
      return this.min === this.max
    }

    /**
     * Returns whether the interval is a set of intervals, aka false
     * @returns {boolean}
     */
    isSet () {
      return false
    }

    /**
     * Print out the interval nicely for analysis
     * @returns {string}
     */
    prettyPrint () {
      return `(${this.min}, ${this.max}), <${this.defMin}, ${this.defMax}>`
    }

    /**
     * Clone the interval
     * @returns {RealInterval}
     */
    clone () {
      return new RealInterval(this.min, this.max, this.defMin, this.defMax)
    }

    /**
     * Whether x is contained within the interval.
     * @param x
     */
    contains (x) {
      return this.min <= x && x <= this.max
    }

    intersects (i) {
      if (i.isSet()) {
        return getIntervals(i).some(int => this.intersects(int))
      } else {
        return i.contains(this.min) || i.contains(this.max) || this.contains(i.min)
      }
    }

    equals(i1) {
      return (this.min === i1.min && this.max === i1.max && this.defMin === i1.defMin && this.defMax === i1.defMax)
    }

    static get One () {
      return constructIntervalFromFloat(1)
    }

    static get Yes () {
      return new RealInterval(1, 1, true, true)
    }

    static get Yesnt () {
      return new RealInterval(0, 1, true, true)
    }

    static get No () {
      return new RealInterval(0, 0, true, false)
    }

    static fromNumber(d, correctRounding=true) {
      if (correctRounding && typeof d === "string") {
        // We can check whether d is exactly representable as a float
        // TODO make more general

        let f = parseFloat(d);

        if (f === parseInt(d)) {
          correctRounding = false;

          d = f;
        }
      }

      if (correctRounding)
        return constructIntervalFromFloat(d)
      else
        return new RealInterval(d, d, true, true)
    }
  }

  /**
   * Convert an Interval or an IntervalSet into a list of intervals
   * @param i
   * @returns {Array}
   */
  function getIntervals (i) {
    if (i.isSet()) {
      return i.intervals
    } else {
      return [i]
    }
  }

  /**
   * Represents a set of RealIntervals
   */
  class RealIntervalSet {
    constructor (intervals = []) {
      this.intervals = intervals;
    }

    get min () {
      return Math.min.apply(null, this.intervals.map(interval => interval.min))
    }

    get max () {
      return Math.max.apply(null, this.intervals.map(interval => interval.max))
    }

    get defMin () {
      return !!Math.min.apply(null, this.intervals.map(interval => interval.defMin))
    }

    get defMax () {
      return !!Math.max.apply(null, this.intervals.map(interval => interval.defMax))
    }

    isSet () {
      return true
    }

    isExact () {
      return this.min === this.max
    }

    contains (x) {
      return this.intervals.some(i => i.contains(x))
    }

    intersects (i) {
      return this.intervals.some(interval => interval.intersects(i))
    }
  }

  function applyTuples (callback, intervals) {
    switch (intervals.length) {
      case 0:
        return
      case 1:
        intervals[0].forEach(callback);
        break
      case 2:
        let int1 = intervals[0];
        let int2 = intervals[1];

        int1.forEach(i1 => {
          int2.forEach(i2 => {
            callback(i1, i2);
          });
        });
        break
      default:
        let remainingIntervals = intervals.slice(1);
        intervals[0].forEach(int => {
          applyTuples((...args) => {
            callback(int, ...args);
          }, remainingIntervals);
        });
    }
  }

  function wrapIntervalSetFunction (func, intervalArgCount=func.length) {
    return function (...intervals) {
      let isSet = false;
      let extraParams = intervals.slice(intervalArgCount);

      for (let i = 0; i < intervalArgCount; ++i) {
        let interval = intervals[i];

        if (interval.isSet()) {
          isSet = true;
          break
        }
      }

      if (isSet) {
        const retIntervals = [];

        const obtainedIntervals = intervals.slice(0, intervalArgCount).map(getIntervals);

        applyTuples((...ints) => {
          const result = func(...ints, ...extraParams);

          const intervals = getIntervals(result);

          for (let i = 0; i < intervals.length; ++i) {
            retIntervals.push(intervals[i]);
          }
        }, obtainedIntervals);

        return new RealIntervalSet(retIntervals)
      } else {
        return func(...intervals)
      }
    }
  }

  const floatStore = new Float64Array(1);

  const intView = new Uint32Array(floatStore.buffer);

  let correctRounding = true;

  const roundUpCorrectRounding = (x) => {
    if (x === Infinity) {
      return Infinity
    }
    if (x === -Infinity) {
      return -Number.MAX_VALUE
    }
    if (x === 0) {
      return Number.MIN_VALUE
    }
    if (isNaN(x)) {
      return NaN
    }

    if (x < 0) {
      return -roundDownCorrectRounding(-x)
    }

    floatStore[0] = x;

    let leastSignificantGroup = ++intView[0];

    if (leastSignificantGroup === 0) {
      ++intView[1];
    }

    return floatStore[0]
  };

  const roundDownCorrectRounding = (x) => {
    if (x === Infinity) {
      return Number.MAX_VALUE
    }
    if (x === -Infinity) {
      return -Infinity
    }
    if (x === 0) {
      return -Number.MIN_VALUE
    }
    if (isNaN(x)) {
      return NaN
    }

    if (x < 0) {
      return -roundUpCorrectRounding(-x)
    }

    floatStore[0] = x;

    let leastSignificantGroup = --intView[0];

    if (leastSignificantGroup === -1) {
      --intView[1];
    }

    return floatStore[0]
  };

  exports.roundUp = roundUpCorrectRounding;
  exports.roundDown = roundDownCorrectRounding;

  const identity = (x) => x;

  function toggleCorrectRounding(v) {
    if (v === correctRounding)
      return

    if (v) {
      exports.roundUp = roundUpCorrectRounding;
      exports.roundDown = roundDownCorrectRounding;
    } else {
      exports.roundUp = exports.roundDown = identity;
    }
  }

  function constructIntervalFromFloat (f) {
    return new RealInterval(exports.roundDown(f), exports.roundUp(f))
  }

  const _Add = (int1, int2) => {
    return new RealInterval(exports.roundDown(int1.min + int2.min), exports.roundUp(int1.max + int2.max), int1.defMin && int2.defMin, int1.defMax && int2.defMax)
  };

  const _Subtract = (int1, int2) => {
    return new RealInterval(exports.roundDown(int1.min - int2.max), exports.roundUp(int1.max - int2.min), int1.defMin && int2.defMin, int1.defMax && int2.defMax)
  };

  const _Multiply = (i1, i2) => {
    let prod1 = i1.min * i2.min;
    let prod2 = i1.min * i2.max;
    let prod3 = i1.max * i2.min;
    let prod4 = i1.max * i2.max;

    return new RealInterval(exports.roundDown(Math.min(prod1, prod2, prod3, prod4)),
      exports.roundUp(Math.max(prod1, prod2, prod3, prod4)),
      i1.defMin && i2.defMin, i1.defMax && i2.defMax)
  };

  const _Reciprocal = (i1) => {
    let min = i1.min;
    let max = i1.max;

    let defMin = i1.defMin, defMax = i1.defMax;

    if (0 < min || max < 0) {
      let valMin = 1 / min;
      let valMax = 1 / max;

      return new RealInterval(exports.roundDown(Math.min(valMin, valMax)), exports.roundUp(Math.max(valMin, valMax)), defMin, defMax)
    } else {
      // 0 contained in the interval

      let interval1 = new RealInterval(-Infinity, exports.roundUp(1 / min), defMin, defMax);
      let interval2 = new RealInterval(exports.roundDown(1 / max), Infinity, defMin, defMax);

      return new RealIntervalSet([interval1, interval2])
    }
  };

  const _Divide = (i1, i2) => {
    return Multiply$2(i1, _Reciprocal(i2))
  };

  const _Abs = (i1) => {
    let min = i1.min;
    let max = i1.max;

    let abs1 = Math.abs(min);
    let abs2 = Math.abs(max);

    let absMax = exports.roundUp(Math.max(abs1, abs2));

    if (max < 0 || 0 < min) {
      // 0 not in range
      let absMin = exports.roundDown(Math.min(abs1, abs2));

      return new RealInterval(absMin, absMax, i1.defMin, i1.defMax)
    } else {
      return new RealInterval(0, absMax, i1.defMin, i1.defMax)
    }
  };

  function int_pow(b, n) {
    let prod = 1;
    for (let i = 0; i < n; ++i) {
      prod *= b;
    }
    return prod
  }

  const _PowN = (i1, n) => {
    if (n === 0) {
      return new RealInterval(1, 1, i1.defMin, i1.defMax)
    } else if (n === 1) {
      // identity function
      return i1.clone()
    } else if (n === -1) {
      return _Reciprocal(i1)
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
        minPowed = exports.roundDown(min * min) * min;
        maxPowed = exports.roundUp(max * max) * max;
      } else if (n < 60) {
        minPowed = int_pow(min, n);
        maxPowed = int_pow(max, n);
      } else {
        minPowed = Math.pow(min, n);
        maxPowed = Math.pow(max, n);
      }

      let defMin = i1.defMin;
      let defMax = i1.defMax;

      if (n % 2 === 0) {
        // if n is even

        let maxValue = exports.roundUp(Math.max(minPowed, maxPowed));

        if (min <= 0 && 0 <= max) { // if 0 is included, then it's just [0, max(min^n, max^n)]
          return new RealInterval(0, maxValue, defMin, defMax)
        } else {
          // if 0 is not included, then it's [min(min^n, max^n), max(min^n, max^n)]
          let minValue = exports.roundDown(Math.min(minPowed, maxPowed));

          return new RealInterval(minValue, maxValue, defMin, defMax)
        }
      } else {
        // Monotonically increasing, so it's [min^n, max^n]

        return new RealInterval(minPowed, maxPowed, defMin, defMax)
      }
    } else {
      // Negative integers, utilize reciprocal function
      return Reciprocal(_PowN(i1, -n))
    }
  };

  // r is a real number
  function _PowR(i1, r) {
    let min = i1.min;
    let max = i1.max;

    if (max < 0) {
      // Function is totally undefined
      return new RealInterval(NaN, NaN, false, false)
    } else if (min < 0) {
      // 0 included in range, so the function is partially undefined
      let defMin = false;
      let defMax = i1.defMax;

      let bound = Math.pow(max, r);

      if (r < 0) {
        // Monotonically decreasing, infinite maximum, max^r minimum

        return new RealInterval(exports.roundDown(bound), Infinity, defMin, defMax)
      } else {
        // Monotonically increasing, 0 minimum, max^r maximum

        return new RealInterval(0, exports.roundUp(bound), defMin, defMax)
      }
    } else {
      // function is totally defined and continuous

      let minPowed = Math.pow(min, r);
      let maxPowed = Math.pow(max, r);

      let minValue = Math.min(minPowed, maxPowed);
      let maxValue = Math.max(minPowed, maxPowed);

      return new RealInterval(exports.roundDown(minValue), exports.roundUp(maxValue), i1.defMin, i1.defMax)
    }
  }

  function _Sqrt(i1) {
    return _PowR(i1, 1/2)
  }

  function _Cbrt(i1) {
    return _PowRational(i1, 1, 3)
  }

  function _PowRational(i1, p, q) {
    // Assuming p and q are reduced

    if (p === 0) {
      return _PowN(i1, 0)
    }

    let r = p / q;

    if (q % 2 === 0) {
      // If the denominator is even then we can treat it like a real number
      return _PowR(i1, r)
    }

    let min = i1.min, max = i1.max;

    let absMinPowed = Math.pow(Math.abs(min), r);
    let absMaxPowed = Math.pow(Math.abs(max), r);

    // continuous and well-defined everywhere

    let defMin = i1.defMin;
    let defMax = i1.defMax;

    let minAttained = Math.min(absMinPowed, absMaxPowed);
    let maxAttained = Math.max(absMinPowed, absMaxPowed);

    if (!(p & 1) && min < 0) {
      minAttained *= -1;
    }

    minAttained = exports.roundDown(minAttained);
    maxAttained = exports.roundUp(maxAttained);

    if (p % 2 === 0) {
      if (p > 0) {
        // p / q with even, positive p and odd q
        // Continuous

        if (min < 0 && 0 < max) {
          // if 0 contained, then the minimum attained value is 0

          return new RealInterval(0, maxAttained, defMin, defMax)
        } else {
          return new RealInterval(minAttained, maxAttained, defMin, defMax)
        }

      } else {
        // p / q with even, negative p and odd q
        // Discontinuous at x = 0

        if (min < 0 && 0 < max) {
          // if 0 contained, then the maximum attained value is Infinity and the function is discontinuous

          return new RealInterval(minAttained, Infinity, defMin, defMax)
        } else {
          // Totally continuous and monotonic
          return new RealInterval(minAttained, maxAttained, defMin, defMax)
        }
      }
    } else {
      if (p > 0) {
        // p / q with odd, positive p and odd q
        // Continuous, monotonically increasing everywhere

        return new RealInterval(minAttained, maxAttained, defMin, defMax)
      } else {
        // p / q with odd, negative p and odd q
        // Always decreasing, discontinuous at x = 0

        if (min < 0 && 0 < max) {
          let interval1 = new Interval(-Infinity, exports.roundUp(minAttained), defMin, defMax);
          let interval2 = new Interval(exports.roundDown(maxAttained), Infinity, defMin, defMax);

          return new RealIntervalSet([interval1, interval2])
        }
      }
    }
  }

  // Note that the base comes AFTER the interval!
  function _PowB(i1, b) {
    if (i1.isExact()) {
      let ret = Math.pow(b, i1.min);

      return new RealInterval(exports.roundDown(ret), exports.roundUp(ret), i1.defMin, i1.defMax)
    }

    if (b < 0) {
      // TODO add strange branching
      return new RealInterval(NaN, NaN, false, false)
    } else if (b === 0) {
      return new RealInterval(0, 0, i1.defMin, i1.defMax)
    } else if (b === 1) {
      return new RealInterval(1, 1, i1.defMin, i1.defMax)
    } else {
      // continuous, monotonic, always defined
      let minPowed = Math.pow(b, i1.min);
      let maxPowed = Math.pow(b, i1.max);

      let minValue = Math.min(minPowed, maxPowed);
      let maxValue = Math.max(minPowed, maxPowed);

      return new RealInterval(exports.roundDown(minValue), exports.roundUp(maxValue), i1.defMin, i1.defMax)
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

  function _Pow(i1, i2) {
    if (i2.isExact()) {
      if (Number.isInteger(i2.min)) {
        return _PowN(i1, i2.min)
      } else {
        return _PowR(i1, i2.min)
      }
    }

    if (i1.isExact()) {
      return _PowB(i2, i1.min)
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

    let endpointMinAttained = exports.roundDown(ignoreNaNMin(powMinMin, powMinMax, powMaxMin, powMaxMax));
    let endpointMaxAttained = exports.roundUp(ignoreNaNMax(powMinMin, powMinMax, powMaxMin, powMaxMax));

    // Nine cases
    if (i1Pos === 1) {
      // In these three cases, everything is continuous and monotonic and thus defined by the endpoints

      return new RealInterval(endpointMinAttained, endpointMaxAttained, defMin, defMax)
    } else if (i1Pos === 0) {
      // Discontinuities due to branching involved
      // Recurse into two subcases

      let int1 = _Pow(new RealInterval(0, i1max, i1.defMin, i1.defMax), i2);
      let int2 = _Pow(new RealInterval(i1min, 0, i1.defMin, i1.defMax), i2);

      return new RealIntervalSet([int1, ...getIntervals(int2)])
    } else if (i1Pos === -1) {
      let powMinMin = Math.pow(Math.abs(i1min), i2min);
      let powMinMax = Math.pow(Math.abs(i1min), i2max);
      let powMaxMin = Math.pow(Math.abs(i1max), i2min);
      let powMaxMax = Math.pow(Math.abs(i1max), i2max);

      let minAttained = exports.roundDown(Math.min(powMinMin, powMinMax, powMaxMin, powMaxMax));
      let maxAttained = exports.roundUp(Math.max(powMinMin, powMinMax, powMaxMin, powMaxMax));

      // Not continuous over any interval
      let int1 = new RealInterval(-maxAttained, -minAttained, false, defMax);
      let int2 = new RealInterval(minAttained, maxAttained, false, defMax);

      return new RealIntervalSet([int1, int2])
    }
  }

  function Min(i1, i2, ...args) {
    if (args.length > 0) {
      return Min(i1, Min(i2, ...args))
    }

    let min = Math.min(i1.min, i2.min);
    let max = Math.min(i1.max, i2.max);
    let defMin = i1.defMin && i2.defMin;
    let defMax = i1.defMax && i2.defMax;

    return new RealInterval(min, max, defMin, defMax)
  }

  function Max(i1, i2, ...args) {
    if (args.length > 0) {
      return Max(i1, Max(i2, ...args))
    }

    let min = Math.max(i1.min, i2.min);
    let max = Math.max(i1.max, i2.max);
    let defMin = i1.defMin && i2.defMin;
    let defMax = i1.defMax && i2.defMax;

    return new RealInterval(min, max, defMin, defMax)
  }

  function LessThan(i1, i2) {
    let ret;

    if (i1.max < i2.min) {
      ret = RealInterval.Yes;
    } else if (i2.max < i1.min) {
      ret = RealInterval.No;
    } else {
      ret = RealInterval.Yesnt;
    }

    ret.defMin = i1.defMin && i2.defMin;
    ret.defMax = i1.defMax && i2.defMax;

    return ret
  }

  function GreaterThan(i1, i2) {
    return LessThan(i2, i1)
  }

  function LessEqualThan(i1, i2) {
    let ret;

    if (i1.max <= i2.min) {
      ret = RealInterval.Yes;
    } else if (i2.max < i1.min) {
      ret = RealInterval.No;
    } else {
      ret = RealInterval.Yesnt;
    }

    ret.defMin = i1.defMin && i2.defMin;
    ret.defMax = i1.defMax && i2.defMax;

    return ret
  }

  function GreaterEqualThan(i1, i2) {
    return LessEqualThan(i2, i1)
  }

  function Equal(i1, i2) {
    let ret;

    if (i1.isExact() && i2.isExact()) {
      if (i1.min === i2.min)
        ret = RealInterval.Yes;
      else
        ret = RealInterval.No;
    } else if (i1.intersects(i2)) {
      ret = RealInterval.Yesnt;
    } else {
      ret = RealInterval.No;
    }

    ret.defMin = i1.defMin && i2.defMin;
    ret.defMax = i1.defMax && i2.defMax;

    return ret
  }

  function invertBooleanInterval(i) {
    if (i.min === 0 && i.max === 0) {
      return new RealInterval(1, 1, i.defMin, i.defMax)
    } else if (i.max === 1 && i.max === 1) {
      return new RealInterval(0, 0, i.defMin, i.defMax)
    } else {
      return new RealInterval(0, 1, i.defMin, i.defMax)
    }
  }

  function NotEqual(i1, i2) {
    return invertBooleanInterval(Equal(i1, i2))
  }

  function Re$1(i1) {
    return i1
  }

  const Cmp = {LessThan, LessEqualThan, GreaterThan, GreaterEqualThan, Equal, NotEqual};

  const Add$2 = wrapIntervalSetFunction(_Add);
  const Subtract$2 = wrapIntervalSetFunction(_Subtract);
  const Multiply$2 = wrapIntervalSetFunction(_Multiply);
  const Divide$2 = wrapIntervalSetFunction(_Divide);
  const Reciprocal = wrapIntervalSetFunction(_Reciprocal);
  const Abs$1 = wrapIntervalSetFunction(_Abs);
  const PowN = wrapIntervalSetFunction(_PowN, 1);
  const PowR = wrapIntervalSetFunction(_PowN, 1);
  const PowRational = wrapIntervalSetFunction(_PowRational, 1);
  const PowB = wrapIntervalSetFunction(_PowB, 1);
  const Pow = wrapIntervalSetFunction(_Pow);
  const Sqrt = wrapIntervalSetFunction(_Sqrt);
  const Cbrt = wrapIntervalSetFunction(_Cbrt);

  var BasicArithmeticFunctions$1 = /*#__PURE__*/Object.freeze({
    Min: Min,
    Max: Max,
    Re: Re$1,
    Cmp: Cmp,
    Add: Add$2,
    Subtract: Subtract$2,
    Multiply: Multiply$2,
    Divide: Divide$2,
    Reciprocal: Reciprocal,
    Abs: Abs$1,
    PowN: PowN,
    PowR: PowR,
    PowRational: PowRational,
    PowB: PowB,
    Pow: Pow,
    Sqrt: Sqrt,
    Cbrt: Cbrt
  });

  // Frankly, I don't know how this code works. I wrote it a long time ago
  function _Sin(i1) {
    let min = i1.min, max = i1.max;

    if (min === max) {
      let sin = Math.sin(min);

      return new RealInterval(exports.roundDown(sin), exports.roundUp(sin), i1.defMin, i1.defMax)
    }

    if (max - min >= 2 * Math.PI) { // If the length is more than a full period, return [-1, 1]
      return new RealInterval(-1, 1, i1.defMin, i1.defMax)
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
      return new RealInterval(-1, 1, i1.defMin, i1.defMax)

    let sa = Math.sin(a_rem_2p), sb = Math.sin(b_rem_2p);
    return new RealInterval(contains_n1 ? -1 : exports.roundDown(Math.min(sa, sb)), contains_1 ? 1 : exports.roundUp(Math.max(sa, sb)),
      i1.defMin, i1.defMax);
  }

  const PI_OVER_TWO = RealInterval.fromNumber(Math.PI / 2);

  function _Cos(i1) {
    return Sin$1(Add$2(i1, PI_OVER_TWO))
  }

  function _Tan(i1) {
    return Divide$2(_Sin(i1), _Cos(i1))
  }

  function _Sec(i1) {
    return Divide$2(RealInterval.One, _Cos(i1))
  }

  function _Csc(i1) {
    return Divide$2(RealInterval.One, _Sin(i1))
  }

  function _Cot(i1) {
    return Divide$2(_Cos(i1), _Sin(i1))
  }


  const Sin$1 = wrapIntervalSetFunction(_Sin);
  const Cos$1 = wrapIntervalSetFunction(_Cos);
  const Tan$1 = wrapIntervalSetFunction(_Tan);
  const Sec$1 = wrapIntervalSetFunction(_Sec);
  const Csc$1 = wrapIntervalSetFunction(_Csc);
  const Cot$1 = wrapIntervalSetFunction(_Cot);

  var TrigFunctions = /*#__PURE__*/Object.freeze({
    Sin: Sin$1,
    Cos: Cos$1,
    Tan: Tan$1,
    Sec: Sec$1,
    Csc: Csc$1,
    Cot: Cot$1
  });

  function _Ln(int1) {
    if (int1.max <= 0) {
      // Interval is wholly undefined
      return new RealInterval(NaN, NaN, false, false)
    }

    if (int1.min < 0) {
      return _Ln(new RealInterval(0, int1.max, false, int1.defMax))
    }

    return new RealInterval(exports.roundDown(Math.log(int1.min)), exports.roundUp(Math.log(int1.max)), int1.defMin, int1.defMax)
  }

  const LN10 = RealInterval.fromNumber(Math.log(10));
  const LN2 = RealInterval.fromNumber(Math.log(2));

  function _Log10(int1) {
    return Divide$2(_Ln(int1), LN10)
  }

  function _Log2(int1) {
    return Divide$2(_Ln(int1), LN2)
  }

  function _Exp(i1) {
    let min = i1.min;
    let max = i1.max;

    let expMin = exports.roundDown(Math.exp(min));
    let expMax = exports.roundUp(Math.exp(max));

    return new RealInterval(expMin, expMax, i1.defMin, i1.defMax)
  }

  const Exp = wrapIntervalSetFunction(_Exp);
  const Ln$1 = wrapIntervalSetFunction(_Ln);
  const Log10$1 = wrapIntervalSetFunction(_Log10);
  const Log2$1 = wrapIntervalSetFunction(_Log2);

  var LogFunctions = /*#__PURE__*/Object.freeze({
    Exp: Exp,
    Ln: Ln$1,
    Log10: Log10$1,
    Log2: Log2$1
  });

  const FIRST_ZERO = 1.461632144963766;

  function _Gamma(int) {
    if (int.min < 0 && int.max > 0) {
      let ints1 = _Gamma(new RealInterval(0, int.max, int.defMin, int.defMax));
      let ints2 = _Gamma(new RealInterval(int.min, 0, int.defMin, int.defMax));

      return new RealIntervalSet(getIntervals(ints1).concat(getIntervals(ints2)))
    }

    if (int.min > FIRST_ZERO) {
      return new RealInterval(gamma(int.min), gamma(int.max), int.defMin, int.defMax)
    } else if (int.min >= 0) {
      if (int.max < FIRST_ZERO) {
        let gMin = gamma(int.min), gMax = gamma(int.max);

        let max = exports.roundUp(Math.max(gMin, gMax));

        let min = exports.roundDown(Math.min(gMin, gMax));

        return new RealInterval(min, max, int.defMin, int.defMax)
      } else {
        let max = exports.roundUp(Math.max(gamma(int.min), gamma(int.max)));

        return new RealInterval(0.8856031944108887003, max, int.defMin, int.defMax)
      }
    } else {
      let minAsymptote = Math.floor(int.min);

      let zeroI = 1000+minAsymptote;
      let zero;

      for (let i = Math.max(0, zeroI - 2); i < Math.min(zeroI + 2, DIGAMMA_ZEROES.length - 1); ++i) {
        zero = DIGAMMA_ZEROES[i];

        if (zero > minAsymptote) {
          zeroI = i;
          break
        }
      }

      let nextZero = DIGAMMA_ZEROES[zeroI + 1];

      let gammaAtFirstZero = gamma(zero);
      let gammaAtNextZero = gamma(nextZero);

      let min = 0, max = 0;

      if (gammaAtFirstZero < 0) {
        if (int.min < zero && int.max > zero)
          min = gammaAtFirstZero;
        else
          min = gamma(int.min);
      } else {
        if (int.min < zero && int.max > zero)
          max = gammaAtFirstZero;
        else
          max = gamma(int.min);
      }

      if (gammaAtNextZero < 0) {
        if (int.max > nextZero)
          min = gammaAtNextZero;
        else
          min = gamma(int.max);
      } else {
        if (int.max > nextZero)
          max = gammaAtNextZero;
        else {
          if (int.max === 0)
            max = -Infinity;
          else
            max = gamma(int.max);
        }
      }

      let rMin = Math.min(min, max), rMax = Math.max(min, max);

      if (int.max <= Math.floor(nextZero) ) {
        return new RealInterval(exports.roundDown(rMin), exports.roundUp(rMax), int.defMin, int.defMax)
      } else {
        return new RealIntervalSet([
          new RealInterval(-Infinity, exports.roundUp(rMin), int.defMin, int.defMax),
          new RealInterval(exports.roundDown(rMax), Infinity, int.defMin, int.defMax)
        ])
      }
    }
  }

  function _LnGamma(int) {
    if (int.max < 0) {
      return Ln$1(Gamma(int))
    }

    if (int.min < 0 && int.max > 0) {
      return _LnGamma(new RealInterval(0, int.max, int.defMin, int.defMax))
    }

    if (int.min > FIRST_ZERO) {
      return new RealInterval(exports.roundDown(ln_gamma(int.min)), exports.roundUp(ln_gamma(int.max)), int.defMin, int.defMax)
    } else if (int.min >= 0) {
      if (int.max < FIRST_ZERO) {
        return new RealInterval(exports.roundDown(ln_gamma(int.max)), exports.roundUp(ln_gamma(int.min)), int.defMin, int.defMax)
      } else {
        return new RealInterval(ln_gamma(FIRST_ZERO), exports.roundUp(Math.max(ln_gamma(int.max), ln_gamma(int.min))), int.defMin, int.defMax)
      }
    }

    return new RealInterval(NaN, NaN, false, false)
  }

  const Gamma = wrapIntervalSetFunction(_Gamma);
  const LnGamma = wrapIntervalSetFunction(_LnGamma);

  var GammaFunctions = /*#__PURE__*/Object.freeze({
    Gamma: Gamma,
    LnGamma: LnGamma
  });

  const RealIntervalFunctions = {
    ...BasicArithmeticFunctions$1, ...TrigFunctions, ...GammaFunctions, ...LogFunctions
  };

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
  const Exp$1 = (z) => {
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
  const Pow$1 = (z, w) => {
    return Exp$1(Multiply(w, new Complex$1(Math.log(z.magnitude()), z.arg())))
  };

  /**
   * Multivalued version of z^w.
   * @param z {Complex}
   * @param w {Complex}
   * @param branch {number}
   * @returns {Complex}
   */
  const PowBranched = (z, w, branch=0) => {
    return Multiply(Pow$1(z, w), Exp$1(Multiply(Complex$1.I, w.scale(2 * Math.PI * branch))))
  };

  /**
   * z^r, where r is a real number.
   * @param z {Complex}
   * @param r {number}
   * @returns {Complex}
   */
  const PowR$1 = (z, r) => {
    return Pow$1(z, new Complex$1(r))
  };

  const PowZ = (r, z) => {
    if (r === 0)
      return new Complex$1(0)

    return Exp$1(Multiply(z, new Complex$1(Math.log(Math.abs(r)), r > 0 ? 0 : Math.PI)))
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
  const PowN$1 = (z, n) => {
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
  const Sqrt$1 = (z) => {
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
      return Sqrt$1(z)
    } else {
      return Multiply(new Complex$1(-1, 0), Sqrt$1(z))
    }
  };

  /**
   * Principal value of cbrt(z).
   * @param z {Complex}
   * @returns {Complex}
   */
  const Cbrt$1 = (z) => {
    return PowR$1(z, 1/3)
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
    Pow: Pow$1,
    PowBranched: PowBranched,
    PowR: PowR$1,
    PowZ: PowZ,
    PowRBranched: PowRBranched,
    PowN: PowN$1,
    Sqrt: Sqrt$1,
    SqrtBranched: SqrtBranched,
    Cbrt: Cbrt$1,
    CbrtBranched: CbrtBranched
  });

  // sin(a+bi) = sin a cosh b + i cos a sinh b
  const Sin$2 = (z) => {
    let a = z.re, b = z.im;
    let sinA = Math.sin(a);
    let cosA = Math.cos(a);

    let sinhB = Math.sinh(b);
    let coshB = Math.sqrt(1 + sinhB * sinhB);

    return new Complex$1(sinA * coshB, cosA * sinhB)
  };

  // cos(a+bi) = cos a cosh b - i sin a sinh b
  const Cos$2 = (z) => {
    let a = z.re, b = z.im;
    let sinA = Math.sin(a);
    let cosA = Math.cos(a);

    let sinhB = Math.sinh(b);
    let coshB = Math.sqrt(1 + sinhB * sinhB);

    return new Complex$1(cosA * coshB, -sinA * sinhB)
  };

  // tan(a+bi) = (tan a + i tanh b) / (1 - i tan a tanh b)
  const Tan$2 = (z) => {
    let a = z.re, b = z.im;

    let tanA = Math.tan(a);
    let tanhB = Math.tanh(b);

    return Divide(new Complex$1(tanA, tanhB), new Complex$1(1, -tanA * tanhB))
  };

  // sec(a+bi) = 1 / cos(a+bi)
  const Sec$2 = (z) => {
    return Divide(Complex$1.One, Cos$2(z))
  };

  // csc(a+bi) = 1 / sin(a+bi)
  const Csc$2 = (z) => {
    return Divide(Complex$1.One, Sin$2(z))
  };

  // sec(a+bi) = 1 / cos(a+bi)
  const Cot$2 = (z) => {
    return Divide(Complex$1.One, Tan$2(z))
  };

  var TrigFunctions$1 = /*#__PURE__*/Object.freeze({
    Sin: Sin$2,
    Cos: Cos$2,
    Tan: Tan$2,
    Sec: Sec$2,
    Csc: Csc$2,
    Cot: Cot$2
  });

  /**
   * Returns ln(z), where ln is the natural logarithm.
   * @param z {Complex}
   * @returns {Complex}
   */
  const Ln$2 = (z) => {
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
    return Add(Ln$2(z), Complex$1.I.scale(2 * Math.PI * branch))
  };

  /* Alias for Ln */
  const Log$1 = Ln$2;

  /* Alias for LnBranched */
  const LogBranched = LnBranched;

  // Constants
  const LN10$1 = Math.log(10);
  const LN2$1 = Math.log(2);

  /**
   * log10(z) (principal value)
   * @param z {Complex}
   * @returns {Complex}
   */
  const Log10$2 = (z) => {
    return Ln$2(z).scale(1 / LN10$1)
  };

  /**
   * log10(z) (branched)
   * @param z {Complex}
   * @returns {Complex}
   */
  const Log10Branched = (z, branch=0) => {
    return LnBranched(z, branch).scale(1 / LN10$1)
  };

  /**
   * log2(z) (principal value)
   * @param z {Complex}
   * @returns {Complex}
   */
  const Log2$2 = (z) => {
    return Ln$2(z).scale(1 / LN2$1)
  };

  /**
   * log2(z) (branched)
   * @param z {Complex}
   * @returns {Complex}
   */
  const Log2Branched = (z, branch=0) => {
    return LnBranched(z, branch).scale(1 / LN2$1)
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

    return Divide(Ln$2(z), Ln$2(b))
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
    Ln: Ln$2,
    LnBranched: LnBranched,
    Log: Log$1,
    LogBranched: LogBranched,
    Log10: Log10$2,
    Log10Branched: Log10Branched,
    Log2: Log2$2,
    Log2Branched: Log2Branched,
    LogB: LogB,
    LogBBranched: LogBBranched
  });

  /**
   * Returns sinh(z).
   * @param z {Complex}
   * @returns {Complex}
   */
  const Sinh$1 = (z) => {
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
  const Cosh$1 = (z) => {
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
  const Tanh$1 = (z) => {
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
  const Sech$1 = (z) => {
    return Divide(Complex$1.One, Cosh$1(z))
  };

  /**
   * Returns csch(z).
   * @param z {Complex}
   * @returns {Complex}
   */
  const Csch$1 = (z) => {
    return Divide(Complex$1.One, Sinh$1(z))
  };

  /**
   * Returns coth(z).
   * @param z {Complex}
   * @returns {Complex}
   */
  const Coth$1 = (z) => {
    return Divide(Complex$1.One, Tanh$1(z))
  };

  var HyperbolicTrigFunctions = /*#__PURE__*/Object.freeze({
    Sinh: Sinh$1,
    Cosh: Cosh$1,
    Tanh: Tanh$1,
    Sech: Sech$1,
    Csch: Csch$1,
    Coth: Coth$1
  });

  // arcsin(z) = -i * ln(i * z + sqrt(1 - z^2))
  const Arcsin$1 = (z) => Multiply(Complex$1.I.scale(-1), // -i
    Ln$2(Add(Multiply(Complex$1.I, z),                              // i * z
      Sqrt$1(Subtract(Complex$1.One, Multiply(z, z))))));            // sqrt(1 - z^2

  // arccos(z) = pi/2 + i * ln(i * z + sqrt(1 - z^2))
  const Arccos$1 = (z) => Add(new Complex$1(Math.PI / 2), // pi / 2
    Multiply(Complex$1.I, Ln$2(Add(Multiply(Complex$1.I, z),           // i * ln(iz
      Sqrt$1(Subtract(Complex$1.One, Multiply(z, z)))))));            // + sqrt(1 - z^2)

  // arctan(z) = i/2 * ln( (i+z) / (1-z) )
  const Arctan$1 = (z) => Multiply(Complex$1.I.scale(1/2),  // i / 2
    Ln$2(Divide(Add(Complex$1.I, z), Subtract(Complex$1.I, z))));      // ln( (i+z) / (1-z) )

  // arcsec(z) = arccos(1 / z)
  const Arcsec$1 = (z) => Arccos$1(Divide(Complex$1.One, z));

  // arccsc(z) = arcsin(1 / z)
  const Arccsc$1 = (z) => Arcsin$1(Divide(Complex$1.One, z));

  // arccot(z) = pi / 2 - arctan(z)
  const Arccot = (z) => Subtract(new Complex$1(Math.PI / 2), Arctan$1(z));

  // Branched variants of the inverse trig functions
  const ArcsinBranched = (z, branch=0) => {
    return Add(Arcsin$1(z), new Complex$1(2 * Math.PI * branch))
  };

  const ArccosBranched = (z, branch=0) => {
    return Add(Arccos$1(z), new Complex$1(2 * Math.PI * branch))
  };

  const ArctanBranched = (z, branch=0) =>
    Add(Arctan$1(z), new Complex$1(Math.PI * branch));

  const ArcsecBranched = (z, branch=0) => ArccosBranched(Divide(Complex$1.One, z), branch);

  const ArccscBranched = (z, branch=0) => ArcsinBranched(Divide(Complex$1.One, z), branch);

  const ArccotBranched = (z, branch=0) =>
    Subtract(new Complex$1(Math.PI / 2), ArctanBranched(z, -branch));

  var InverseTrigFunctions = /*#__PURE__*/Object.freeze({
    Arcsin: Arcsin$1,
    Arccos: Arccos$1,
    Arctan: Arctan$1,
    Arcsec: Arcsec$1,
    Arccsc: Arccsc$1,
    Arccot: Arccot,
    ArcsinBranched: ArcsinBranched,
    ArccosBranched: ArccosBranched,
    ArctanBranched: ArctanBranched,
    ArcsecBranched: ArcsecBranched,
    ArccscBranched: ArccscBranched,
    ArccotBranched: ArccotBranched
  });

  // arcsinh(z) = ln(z + sqrt(z^2 + 1))
  const Arcsinh$1 = (z) => Ln$2(Add(z, Sqrt$1(Add(Multiply(z, z), Complex$1.One))));

  // arccosh(z) = ln(z + sqrt(z^2 - 1))
  const Arccosh$1 = (z) => Ln$2(Add(z, Multiply(Sqrt$1(Add(z, Complex$1.One)), Sqrt$1(Subtract(z, Complex$1.One)))));

  // arctanh(z) = 1/2 * ln( (1+z) / (1-z) )
  const Arctanh$1 = (z) => Ln$2(Divide(Add(Complex$1.One, z), Subtract(Complex$1.One, z))).scale(1/2);

  const Arcsech$1 = (z) => Arccosh$1(Divide(Complex$1.One, z));

  // arccsch(z) = arcsinh(1/z)
  const Arccsch$1 = (z) => Arcsinh$1(Divide(Complex$1.One, z));

  // arccoth(z) = arctanh(1/z)
  const Arccoth$1 = (z) => Arctanh$1(Divide(Complex$1.One, z));

  // Branched variants of the normal functions
  // arcsinh(z) = ln(z + sqrt(z^2 + 1))
  const ArcsinhBranched = (z, branch=0) =>
    LnBranched(Add(z, Sqrt$1(Add(Multiply(z, z), Complex$1.One))), branch);

  // arccosh(z) = ln(z + sqrt(z^2 - 1))
  const ArccoshBranched = (z, branch=0) =>
    LnBranched(Add(z, Multiply(Sqrt$1(Add(z, Complex$1.One)), Sqrt$1(Subtract(z, Complex$1.One)))), branch);

  // arctanh(z) = 1/2 * ln( (1+z) / (1-z) )
  const ArctanhBranched = (z, branch=0) =>
    LnBranched(Divide(Add(Complex$1.One, z), Subtract(Complex$1.One, z)), branch).scale(1/2);

  const ArcsechBranched = (z, branch=0) => ArccoshBranched(Divide(Complex$1.One, z), branch);

  // arccsch(z) = arcsinh(1/z)
  const ArccschBranched = (z, branch=0) => ArcsinhBranched(Divide(Complex$1.One, z), branch);

  // arccoth(z) = arctanh(1/z)
  const ArccothBranched = (z, branch=0) => ArctanhBranched(Divide(Complex$1.One, z), branch);

  var InverseHyperbolicFunctions = /*#__PURE__*/Object.freeze({
    Arcsinh: Arcsinh$1,
    Arccosh: Arccosh$1,
    Arctanh: Arctanh$1,
    Arcsech: Arcsech$1,
    Arccsch: Arccsch$1,
    Arccoth: Arccoth$1,
    ArcsinhBranched: ArcsinhBranched,
    ArccoshBranched: ArccoshBranched,
    ArctanhBranched: ArctanhBranched,
    ArcsechBranched: ArcsechBranched,
    ArccschBranched: ArccschBranched,
    ArccothBranched: ArccothBranched
  });

  function Gamma$1(z) {
    if (z.re < 1/2) {
      // Gamma(z) * Gamma(1-z) = pi / sin(pi * z)
      // Gamma(z) = pi / sin(pi * z) / Gamma(1-z)

      return Divide(new Complex$1(Math.PI), Multiply(Sin$2(z.scale(Math.PI)), Gamma$1(Subtract(Complex$1.One, z))))
    }

    if (Math.abs(z.im) < 1e-17) {
      return new Complex$1(gamma(z.re))
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
        Pow$1(t, Add(z, new Complex$1(0.5))),
        Exp$1(t.scale(-1)))))
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

      return Subtract(Digamma(Subtract(Complex$1.One, z)), Cot$2(z.scale(Math.PI)).scale(Math.PI))
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
    let sum = Ln$2(z);

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

      return Subtract(Divide(new Complex$1(Math.PI * Math.PI), PowN$1(Sin$2(z.scale(Math.PI)), 2)), Trigamma(Subtract(Complex$1.One, z)))
    } else if (z.re < 20) {
      // psi_1(z+1) = psi_1(z) - 1/z^2
      // psi_1(z) = psi_1(z+1) + 1/z^2

      let sum = new Complex$1(0);

      while (z.re < 20) {
        let component = PowN$1(z, -2);

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

      let part = Multiply(new Complex$1(coeff), PowN$1(z, -pow));

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

      return Multiply(new Complex$1(-1), Divide(numPoly.evaluateComplex(Cos$2(z.scale(Math.PI))).scale(Math.pow(Math.PI, m + 1)),
        (PowN$1(Sin$2(z.scale(Math.PI)), m+1)) + sign * Polygamma(m, Subtract(Complex$1.One, z))))
    } else if (z < 8) {
      // Recurrence relation
      // psi_m(z) = psi_m(z+1) + (-1)^(m+1) * m! / z^(m+1)

      return Add(Polygamma(m, z+1), Divide(new Complex$1(sign * gamma(m + 1)), PowN$1(z, m+1)))
    }

    // Series representation

    let sum = new Complex$1(0);

    for (let i = 0; i < 200; ++i) {
      let component = Divide(Complex$1.One, PowN$1(Add(z, new Complex$1(i)), m + 1));
      sum.re += component.re;
      sum.im += component.im;
    }

    return Multiply(new Complex$1(sign * gamma(m + 1)), sum)
  }

  const logPi = Math.log(Math.PI);
  const logSqrt2Pi = Math.log(2 * Math.PI) / 2;

  function LnGamma$1 (z) {
    if (Math.abs(z.im) < 1e-17) {
      return new Complex$1(ln_gamma(z.re))
    }

    if (z.re < 0.5) {
      // Compute via reflection formula
      let reflected = LnGamma$1(Subtract(Complex$1.One, z));

      return Subtract(Subtract(new Complex$1(logPi), Ln$2(Sin$2(Multiply(new Complex$1(Math.PI), z)))), reflected)
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

      return Add(new Complex$1(logSqrt2Pi), Add(Subtract(Multiply(Ln$2(t), Add(z, new Complex$1(0.5))), t), Ln$2(x)))
    }
  }

  let ZETA_COEFFS$1 = zeta.coeffs;
  let ZETA_N$1 = zeta.n;

  function Chi(s) {
    let powers = Multiply(PowZ(2, s), PowZ(Math.PI, Subtract(s, new Complex$1(1))));

    let sine = Sin$2(s.scale(Math.PI / 2));

    let gamma = Gamma$1(Subtract(new Complex$1(1), s));

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

    return Divide(Sin$2(x), x)
  };

  const NormSinc = (x) => {
    return Sinc(x.scale(Math.PI))
  };

  var MiscSpecial = /*#__PURE__*/Object.freeze({
    Sinc: Sinc,
    NormSinc: NormSinc
  });

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

    return Add(new Complex$1(eulerGamma), Add(Ln$2(z), Multiply(Exp$1(z.scale(0.5)), sum)))
  };

  const Li = (z) => {
    return Ei(Ln$2(z))
  };

  var ExpIntegrals = /*#__PURE__*/Object.freeze({
    Ei: Ei,
    Li: Li
  });

  function Si$1(z) {
    throw new Error("unimplemented")
  }

  function Ci$1(z) {
    throw new Error("unimplemented")``
  }

  var TrigIntegrals = /*#__PURE__*/Object.freeze({
    Si: Si$1,
    Ci: Ci$1
  });

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
    ...BasicArithmeticFunctions, ...PowFunctions, Exp: Exp$1, Cis, ...TrigFunctions$1, ...LnFunctions,
    ...HyperbolicTrigFunctions, ...InverseTrigFunctions, ...InverseHyperbolicFunctions,
    Gamma: Gamma$1, Digamma, Trigamma, Polygamma, LnGamma: LnGamma$1, Zeta, Eta, ...MiscSpecial, ...ExpIntegrals, ...TrigIntegrals, ...Erfs
  });

  class ComplexInterval {
    constructor(reMin, reMax, imMin, imMax, defMin=true, defMax=true) {
      this.reMin = reMin;
      this.reMax = reMax;
      this.imMin = imMin;
      this.imMax = imMax;
      this.defMin = defMin;
      this.defMax = defMax;
    }
  }

  const Construct$1 = (reMin, reMax, imMin, imMax) => {
    return new ComplexInterval(reMin, reMax, imMin, imMax)
  };

  const Add$3 = (int1, int2) => {
    return new ComplexInterval(int1.reMin, int1.reMax, int2.imMin, int2.imMax, int1.defMin || int2.defMin, int1.defMax && int2.defMax)
  };

  var BasicArithmeticFunctions$2 = /*#__PURE__*/Object.freeze({
    Construct: Construct$1,
    Add: Add$3
  });

  const ComplexIntervalFunctions = {
    ...BasicArithmeticFunctions$2
  };

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

  function retrieveEvaluationFunction(str) {
    let fName = str.split('.').pop();

    const realFunctions = RealFunctions;
    const realIntervalFunctions = RealIntervalFunctions;
    const complexFunctions = ComplexFunctions;
    const complexIntervalFunctions = ComplexIntervalFunctions;

    if (str.includes("RealFunctions"))
      return realFunctions[fName]
    if (str.includes("RealIntervalFunctions"))
      return realIntervalFunctions[fName]
    if (str.includes("ComplexFunctions"))
      return complexFunctions[fName]
    if (str.includes("ComplexIntervalFunctions"))
      return complexIntervalFunctions[fName]

  }

  class OperatorDefinition {
    constructor(params={}) {
      this.returns = params.returns || "real";

      throwInvalidType(this.returns);

      if (params.latexFunc)
        this.latexFunc = params.latexFunc;

      this.latexOperator = params.latexOperator;
      this.latexType = params.latexType;
      this.latexPrecedence = params.latexPrecedence;

      let evaluate = params.evaluate;

      if (params.noGraphemePrefix)
        this.evaluate = evaluate;
      else
        this.evaluate = ((isWorker || evaluate.startsWith("Grapheme")) ? "" : "Grapheme.") + evaluate;

      this.evaluateFunc = params.evaluateFunc ? params.evaluateFunc : retrieveEvaluationFunction(this.evaluate);

      try {
        const evaluateInterval = this.evaluate.replace(/Functions/g, "IntervalFunctions");

        this.evaluateIntervalFunc = params.evaluateIntervalFunc ? params.evaluateIntervalFunc : retrieveEvaluationFunction(evaluateInterval);

        this.evaluateInterval = evaluateInterval;
      } catch (e) {

      }

      if (params.evaluateInterval) {
        this.evaluateInterval = params.evaluateInterval;
      }

      if (!params.noGraphemePrefix) {
        const evaluateInterval = this.evaluateInterval;

        this.evaluateInterval = ((isWorker || evaluateInterval.startsWith("Grapheme")) ? "" : "Grapheme.") + evaluateInterval;
      }
    }

    latex(nodes, options={}) {
      if (this.latexFunc) {
        return this.latexFunc(nodes, options)
      }
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
        evaluateInterval: this.evaluateInterval,
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
        intervalEvaluate: "RealIntervalFunctions.Multiply",
        desc: "Returns the product of two integers.",
        latexOperator: String.raw`\cdot`,
        latexType: "infix",
        latexPrecedence: 2
      }),
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Multiply",
        intervalEvaluate: "RealIntervalFunctions.Multiply",
        desc: "Returns the product of two real numbers.",
        latexOperator: String.raw`\cdot`,
        latexType: "infix",
        latexPrecedence: 2
      }),
      new NormalDefinition({
        signature: ["complex", "complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Multiply",
        intervalEvaluate: "ComplexIntervalFunctions.Multiply",
        desc: "Returns the product of two complex numbers.",
        latexOperator: String.raw`\cdot`,
        latexType: "infix",
        latexPrecedence: 2
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
        returns: "bool",
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
        desc: "Return the complete elliptic integral K(m) with parameter m = k^2."
      })
    ],
    "elliptic_E": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.EllipticE",
        desc: "Return the complete elliptic integral E(m) with parameter m = k^2."
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
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "vec2",
        evaluate: "VectorFunctions.FromComplex",
        desc: "Construct a new vec2 from the real and imaginary components of a complex number."
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
    ],
    "prime_count": [
      new NormalDefinition({
        signature: ["int"],
        returns: "int",
        evaluate: "RealFunctions.PrimeCount",
        desc: "Find the number of primes below n."
      })
    ],
    "cis": [
      new NormalDefinition({
        signature: ["real"],
        returns: "complex",
        evaluate: "ComplexFunctions.Cis",
        desc: "Returns cos(theta) + i sin(theta)."
      })
    ],
    "Cl2": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Cl2",
        desc: "Evaluates the Clausen function of x."
      })
    ],
    "beta": [
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Beta",
        desc: "Evaluates the beta function at a,b."
      })
    ],
    "exp": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Exp"
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Exp"
      })
    ],
    "ln_gamma": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.LnGamma"
      })
    ],
    "barnes_G": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.BarnesG"
      })
    ],
    "ln_barnes_G": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.LnBarnesG"
      })
    ],
    "K_function": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.KFunction"
      })
    ],
    "ln_K_function": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.LnKFunction"
      })
    ],
    "bessel_J": [
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.BesselJ"
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
      this.evaluateInterval = null;

      try {
        this.evaluateInterval = this.node.compileInterval(this.getVariables());
      } catch (e) {

      }

      const returnType = this.node.returnType;

      if (!returnType)
        throw new Error("Was not able to find a return type for function " + this.name + ".")

      this.definition = new NormalDefinition({
        signature: this.getSignature(),
        returns: returnType,
        evaluate: "Functions." + this.name + '.evaluate',
        evaluateFunc: this.evaluate,
        evaluateInterval: "Functions." + this.name + ".evaluateInterval",
        evaluateIntervalFunc: this.evaluateInterval
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

      this.value = this.evaluate();
      this.intervalValue = this.evaluateInterval();
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

    _getIntervalCompileText(exportedVariables=['x']) {
      return this.children[0]._getIntervalCompileText(exportedVariables)
    }

    evaluate(scope) {
      return this.children[0].evaluate(scope)
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

    compile(exportedVariables=[]) {
      if (!this.returnType) {
        throw new Error("Need to call resolveTypes before compiling node.")
      }

      let compileText = this._getCompileText(exportedVariables);

      return new Function(...exportedVariables, "return " + compileText)
    }

    compileInterval(exportedVariables=[]) {
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

    clone () {
      return new ASTNode({
        children: this.children.map(child => child.clone()),
        returnType: this.returnType
      })
    }

    getTreeText() {
      return this.getText() + ' -> ' + this.returnType
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

    equals(node) {
      if (this.returnType !== node.returnType)
        return false

      for (let i = 0; i < this.children.length; ++i) {
        if (!this.children[i].equals(node.children[i]))
          return false
      }

      return true
    }

    substitute(node, expr) {
      this.applyAll((n) => {
        const children = n.children;

        for (let i = 0; i < children.length; ++i) {
          const child = children[i];

          if (child.equals(node)) {
            children[i] = expr.clone();
          }
        }
      }, 0, true);

      this.setParents();
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

  class VariableNode extends ASTNode {
    constructor (params = {}) {
      super();

      const {
        name = 'x'
      } = params;

      this.name = name;
    }

    evaluate(scope) {
      const value = scope[this.name];

      if (value !== undefined) {
        return value
      }
    }

    _getCompileText(exportedVariables) {
      if (comparisonOperators.includes(this.name))
        return `"${this.name}"`
      if (exportedVariables.includes(this.name))
        return this.name
      else
        return (isWorker ? '' : "Grapheme.") + "Variables." + this.name + ".value"
    }

    _getIntervalCompileText (exportedVariables = ['x']) {
      if (comparisonOperators.includes(this.name))
        return `"${this.name}"`
      if (exportedVariables.includes(this.name))
        return this.name
      else
        return (isWorker ? '' : "Grapheme.") + "Variables." + this.name + ".intervalValue"
    }

    clone () {
      let node = new VariableNode({ name: this.name });

      node.returnType = this.returnType;

      return node
    }

    getText () {
      return this.name
    }

    isConstant () {
      return false
    }

    equals(node) {
      return (node instanceof VariableNode) && this.name === node.name && super.equals(node)
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
        this.returnType = "real"; //throw new Error("Cannot resolve variable " + this.name + ". Please define it.")
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

    _getIntervalCompileText(exportedVariables) {
      if (!this.definition)
        throw new Error("huh")

      const definition = this.definition;

      return this.definition.evaluateInterval + "(" + this.children.map((child, index) => {
        let text = child._getIntervalCompileText(exportedVariables);

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
      node.definition = this.definition;
      node.returnType = this.returnType;

      return node
    }

    derivative(variable) {
      if (!this.definition.derivative) {
        throw new Error("Cannot take derivative of operator " + this.operator + ".")
      }

      return this.definition.derivative(variable, ...this.children)
    }

    evaluate(scope) {
      return this.definition.evaluateFunc(...this.children.map(child => child.evaluate(scope)))
    }

    getText () {
      return this.operator
    }

    latex () {
      return getLatex(this)
    }

    equals(node) {
      return (node instanceof OperatorNode) && (node.definition === this.definition) && super.equals(node)
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
      super(params);

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

    _getIntervalCompileText() {
      switch (this.returnType) {
        case "bool":
          let int = this.value | 0;

          return "new Grapheme.RealInterval(" + int + "," + int + ")"
        case "real":
        case "int":
          return "new Grapheme.RealInterval(" + this.value + "," + this.value + ")"
        case "complex":
            const re = this.value.re;
            const im = this.value.im;

            return `new Grapheme.ComplexInterval(${re}, ${re}, ${im}, ${im})`
      }
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

    evaluate() {
      return this.value
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

    equals(node) {
      return node.value === this.value && super.equals(node)
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

        match = string.match(constant_regex);

        if (match) {
          yield {
            type: "constant",
            value: match[0],
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
        (!(token2.op === '-' || token2.op === '+') || i === tokens.length - 2)) {
        get_angry_at(string, token2.index, "No consecutive operators/commas");
      }
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

  function parseString(string, types={}) {
    check_parens_balanced(string);

    let tokens = [];

    for (let token of tokenizer(string)) {
      tokens.push(token);
    }

    check_valid(string, tokens);

    let node = parse_tokens(tokens).children[0];

    node.resolveTypes(types);
    node.setParents();

    return node
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

      let forceNormalPlot = false;

      try {
        if (this.plottingMode === "rough") {
          let points = width * this.quality;

          vertices = sample_1d(x1, x2, this.function, points);
        } else if (this.plottingMode === "interval") {
          let intervalFunc = getFunction(this.functionName).evaluateInterval;
          if (!intervalFunc)
            forceNormalPlot = true;

          let points = width * Math.max(this.quality, 1);
          let space = (x2 - x1) / (2 * points);
          let prevY = 0;

          for (let i = -1; i <= points; ++i) {
            let x = i / points * (x2 - x1) + x1;
            let minX = x - space, maxX = x + space;

            let interval = intervalFunc(new RealInterval(minX, maxX));

            if (!interval.defMax) {
              vertices.push(NaN, NaN);
              prevY = NaN;
            } else {
              let intervals = getIntervals(interval);

              if (intervals.length === 0)
                continue

              let closestIntervalI = -1;
              let dist = Infinity;
              let cow = 0;

              intervals.forEach((int, i) => {
                let distMx = Math.abs(int.max - prevY);
                let distMn = Math.abs(int.min - prevY);

                if (distMx < dist) {
                  cow=0;
                  dist = distMx;
                  closestIntervalI = i;
                }

                if (distMn < dist) {
                  cow=1;
                  dist=distMn;
                  closestIntervalI = i;
                }
              });

              if (closestIntervalI !== -1) {
                let firstInterval = intervals[closestIntervalI];

                let min = firstInterval.min;
                let max = firstInterval.max;

                if (cow === 0) {
                  vertices.push(minX, max);

                  vertices.push(maxX, min);
                  prevY = min;
                } else {
                  vertices.push(minX, min);

                  vertices.push(maxX, max);
                  prevY = max;
                }
              }

              intervals.forEach((int, i) => {
                if (i === closestIntervalI)
                  return

                let max = int.max;

                vertices.push(NaN, NaN, x, int.min, x, max, NaN, NaN);

                prevY = max;
              });
            }
          }

          for (let i = 0; i < vertices.length; ++i) {
            vertices[i] = bound(vertices[i]);
          }
        }

        if (this.plottingMode === "fine" || forceNormalPlot) {
          vertices = adaptively_sample_1d(x1, x2, this.function,
            width * this.quality, transform.getAspect(), this.plottingAxis === 'x' ? coords.height / box.height : coords.width / box.width, this.maxDepth);
        }
      } catch (e) {

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

      super.destroy();
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

  const BooleanFunctions = {
    And: (a, b) => a && b,
    Or: (a, b) => a || b
  };

  const Add$4 = (v1, v2) => {
    return new Vec2(v1.x + v2.x, v1.y + v2.y)
  };

  const Subtract$3 = (v1, v2) => {
    return new Vec2(v1.x - v2.x, v1.y - v2.y)
  };

  const Dot = (v1, v2) => {
    return v1.x * v2.x + v1.y * v2.y
  };

  const Construct$2 = (x, y) => {
    return new Vec2(x, y)
  };

  const FromComplex = (z) => {
    return new Vec2(z.re, z.im)
  };

  var BasicArithmetic = /*#__PURE__*/Object.freeze({
    Add: Add$4,
    Subtract: Subtract$3,
    Dot: Dot,
    Construct: Construct$2,
    FromComplex: FromComplex
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
      this.samples = 2000;

      this.rangeStart = -20;
      this.rangeEnd = 20;
      this.maxDepth = 3;
      this.plottingMode = "fine";

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
      info.scissorPlot(true);

      this.polyline.render(info);

      info.scissorPlot(false);
    }

    update(info) {
      super.update(info);

      if (!this.function)
        return

      let vertices;
      const points = this.samples;

      if (this.plottingMode === "rough") {
        vertices = this.polyline.vertices = sample_parametric_1d(this.rangeStart, this.rangeEnd, this.function, points, true);
      } else {
        vertices = this.polyline.vertices = adaptively_sample_parametric_1d(this.rangeStart, this.rangeEnd, this.function, points, info.plot.transform.getAspect(), this.maxDepth);
      }

      info.plot.transform.plotToPixelArr(vertices);

      this.polyline.update(info);
    }

    destroy() {
      this.polyline.destroy();
    }
  }

  const IntervalTypecasts = {
    Identity: (x) => x,
    RealToComplex: (int) => {
      return new ComplexInterval(int.min, int.max, 0, 0, int.defMin, int.defMax)
    }
  };

  // Copyright 2018 Google Inc.
  //
  // Licensed under the Apache License, Version 2.0 (the “License”);
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  // <https://apache.org/licenses/LICENSE-2.0>.
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an “AS IS” BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  class JSBI extends Array {
    constructor(length, sign) {
      if (length > JSBI.__kMaxLength) {
        throw new RangeError('Maximum BigInt size exceeded');
      }
      super(length);
      this.sign = sign;
    }

    static BigInt(arg) {
      if (typeof arg === 'number') {
        if (arg === 0) return JSBI.__zero();
        if ((arg | 0) === arg) {
          if (arg < 0) {
            return JSBI.__oneDigit(-arg, true);
          }
          return JSBI.__oneDigit(arg, false);
        }
        if (!Number.isFinite(arg) || Math.floor(arg) !== arg) {
          throw new RangeError('The number ' + arg + ' cannot be converted to ' +
            'BigInt because it is not an integer');
        }
        return JSBI.__fromDouble(arg);
      } else if (typeof arg === 'string') {
        const result = JSBI.__fromString(arg);
        if (result === null) {
          throw new SyntaxError('Cannot convert ' + arg + ' to a BigInt');
        }
        return result;
      } else if (typeof arg === 'boolean') {
        if (arg === true) {
          return JSBI.__oneDigit(1, false);
        }
        return JSBI.__zero();
      } else if (typeof arg === 'object') {
        if (arg.constructor === JSBI) return arg;
        const primitive = JSBI.__toPrimitive(arg);
        return JSBI.BigInt(primitive);
      }
      throw new TypeError('Cannot convert ' + arg + ' to a BigInt');
    }

    toDebugString() {
      const result = ['BigInt['];
      for (const digit of this) {
        result.push((digit ? (digit >>> 0).toString(16) : digit) + ', ');
      }
      result.push(']');
      return result.join('');
    }

    toString(radix = 10) {
      if (radix < 2 || radix > 36) {
        throw new RangeError(
          'toString() radix argument must be between 2 and 36');
      }
      if (this.length === 0) return '0';
      if ((radix & (radix - 1)) === 0) {
        return JSBI.__toStringBasePowerOfTwo(this, radix);
      }
      return JSBI.__toStringGeneric(this, radix, false);
    }

    // Equivalent of "Number(my_bigint)" in the native implementation.
    static toNumber(x) {
      const xLength = x.length;
      if (xLength === 0) return 0;
      if (xLength === 1) {
        const value = x.__unsignedDigit(0);
        return x.sign ? -value : value;
      }
      const xMsd = x.__digit(xLength - 1);
      const msdLeadingZeros = Math.clz32(xMsd);
      const xBitLength = xLength * 32 - msdLeadingZeros;
      if (xBitLength > 1024) return x.sign ? -Infinity : Infinity;
      let exponent = xBitLength - 1;
      let currentDigit = xMsd;
      let digitIndex = xLength - 1;
      const shift = msdLeadingZeros + 1;
      let mantissaHigh = (shift === 32) ? 0 : currentDigit << shift;
      mantissaHigh >>>= 12;
      const mantissaHighBitsUnset = shift - 12;
      let mantissaLow = (shift >= 12) ? 0 : (currentDigit << (20 + shift));
      let mantissaLowBitsUnset = 20 + shift;
      if (mantissaHighBitsUnset > 0 && digitIndex > 0) {
        digitIndex--;
        currentDigit = x.__digit(digitIndex);
        mantissaHigh |= (currentDigit >>> (32 - mantissaHighBitsUnset));
        mantissaLow = currentDigit << mantissaHighBitsUnset;
        mantissaLowBitsUnset = mantissaHighBitsUnset;
      }
      if (mantissaLowBitsUnset > 0 && digitIndex > 0) {
        digitIndex--;
        currentDigit = x.__digit(digitIndex);
        mantissaLow |= (currentDigit >>> (32 - mantissaLowBitsUnset));
        mantissaLowBitsUnset -= 32;
      }
      const rounding = JSBI.__decideRounding(x, mantissaLowBitsUnset,
        digitIndex, currentDigit);
      if (rounding === 1 || (rounding === 0 && (mantissaLow & 1) === 1)) {
        mantissaLow = (mantissaLow + 1) >>> 0;
        if (mantissaLow === 0) {
          // Incrementing mantissaLow overflowed.
          mantissaHigh++;
          if ((mantissaHigh >>> 20) !== 0) {
            // Incrementing mantissaHigh overflowed.
            mantissaHigh = 0;
            exponent++;
            if (exponent > 1023) {
              // Incrementing the exponent overflowed.
              return x.sign ? -Infinity : Infinity;
            }
          }
        }
      }
      const signBit = x.sign ? (1 << 31) : 0;
      exponent = (exponent + 0x3FF) << 20;
      JSBI.__kBitConversionInts[1] = signBit | exponent | mantissaHigh;
      JSBI.__kBitConversionInts[0] = mantissaLow;
      return JSBI.__kBitConversionDouble[0];
    }

    // Operations.

    static unaryMinus(x) {
      if (x.length === 0) return x;
      const result = x.__copy();
      result.sign = !x.sign;
      return result;
    }

    static bitwiseNot(x) {
      if (x.sign) {
        // ~(-x) == ~(~(x-1)) == x-1
        return JSBI.__absoluteSubOne(x).__trim();
      }
      // ~x == -x-1 == -(x+1)
      return JSBI.__absoluteAddOne(x, true);
    }

    static exponentiate(x, y) {
      if (y.sign) {
        throw new RangeError('Exponent must be positive');
      }
      if (y.length === 0) {
        return JSBI.__oneDigit(1, false);
      }
      if (x.length === 0) return x;
      if (x.length === 1 && x.__digit(0) === 1) {
        // (-1) ** even_number == 1.
        if (x.sign && (y.__digit(0) & 1) === 0) {
          return JSBI.unaryMinus(x);
        }
        // (-1) ** odd_number == -1, 1 ** anything == 1.
        return x;
      }
      // For all bases >= 2, very large exponents would lead to unrepresentable
      // results.
      if (y.length > 1) throw new RangeError('BigInt too big');
      let expValue = y.__unsignedDigit(0);
      if (expValue === 1) return x;
      if (expValue >= JSBI.__kMaxLengthBits) {
        throw new RangeError('BigInt too big');
      }
      if (x.length === 1 && x.__digit(0) === 2) {
        // Fast path for 2^n.
        const neededDigits = 1 + (expValue >>> 5);
        const sign = x.sign && ((expValue & 1) !== 0);
        const result = new JSBI(neededDigits, sign);
        result.__initializeDigits();
        // All bits are zero. Now set the n-th bit.
        const msd = 1 << (expValue & 31);
        result.__setDigit(neededDigits - 1, msd);
        return result;
      }
      let result = null;
      let runningSquare = x;
      // This implicitly sets the result's sign correctly.
      if ((expValue & 1) !== 0) result = x;
      expValue >>= 1;
      for (; expValue !== 0; expValue >>= 1) {
        runningSquare = JSBI.multiply(runningSquare, runningSquare);
        if ((expValue & 1) !== 0) {
          if (result === null) {
            result = runningSquare;
          } else {
            result = JSBI.multiply(result, runningSquare);
          }
        }
      }
      return result;
    }

    static multiply(x, y) {
      if (x.length === 0) return x;
      if (y.length === 0) return y;
      let resultLength = x.length + y.length;
      if (x.__clzmsd() + y.__clzmsd() >= 32) {
        resultLength--;
      }
      const result = new JSBI(resultLength, x.sign !== y.sign);
      result.__initializeDigits();
      for (let i = 0; i < x.length; i++) {
        JSBI.__multiplyAccumulate(y, x.__digit(i), result, i);
      }
      return result.__trim();
    }

    static divide(x, y) {
      if (y.length === 0) throw new RangeError('Division by zero');
      if (JSBI.__absoluteCompare(x, y) < 0) return JSBI.__zero();
      const resultSign = x.sign !== y.sign;
      const divisor = y.__unsignedDigit(0);
      let quotient;
      if (y.length === 1 && divisor <= 0xFFFF) {
        if (divisor === 1) {
          return resultSign === x.sign ? x : JSBI.unaryMinus(x);
        }
        quotient = JSBI.__absoluteDivSmall(x, divisor, null);
      } else {
        quotient = JSBI.__absoluteDivLarge(x, y, true, false);
      }
      quotient.sign = resultSign;
      return quotient.__trim();
    }

    static remainder(x, y) {
      if (y.length === 0) throw new RangeError('Division by zero');
      if (JSBI.__absoluteCompare(x, y) < 0) return x;
      const divisor = y.__unsignedDigit(0);
      if (y.length === 1 && divisor <= 0xFFFF) {
        if (divisor === 1) return JSBI.__zero();
        const remainderDigit = JSBI.__absoluteModSmall(x, divisor);
        if (remainderDigit === 0) return JSBI.__zero();
        return JSBI.__oneDigit(remainderDigit, x.sign);
      }
      const remainder = JSBI.__absoluteDivLarge(x, y, false, true);
      remainder.sign = x.sign;
      return remainder.__trim();
    }

    static add(x, y) {
      const sign = x.sign;
      if (sign === y.sign) {
        // x + y == x + y
        // -x + -y == -(x + y)
        return JSBI.__absoluteAdd(x, y, sign);
      }
      // x + -y == x - y == -(y - x)
      // -x + y == y - x == -(x - y)
      if (JSBI.__absoluteCompare(x, y) >= 0) {
        return JSBI.__absoluteSub(x, y, sign);
      }
      return JSBI.__absoluteSub(y, x, !sign);
    }

    static subtract(x, y) {
      const sign = x.sign;
      if (sign !== y.sign) {
        // x - (-y) == x + y
        // (-x) - y == -(x + y)
        return JSBI.__absoluteAdd(x, y, sign);
      }
      // x - y == -(y - x)
      // (-x) - (-y) == y - x == -(x - y)
      if (JSBI.__absoluteCompare(x, y) >= 0) {
        return JSBI.__absoluteSub(x, y, sign);
      }
      return JSBI.__absoluteSub(y, x, !sign);
    }

    static leftShift(x, y) {
      if (y.length === 0 || x.length === 0) return x;
      if (y.sign) return JSBI.__rightShiftByAbsolute(x, y);
      return JSBI.__leftShiftByAbsolute(x, y);
    }

    static signedRightShift(x, y) {
      if (y.length === 0 || x.length === 0) return x;
      if (y.sign) return JSBI.__leftShiftByAbsolute(x, y);
      return JSBI.__rightShiftByAbsolute(x, y);
    }

    static unsignedRightShift() {
      throw new TypeError(
        'BigInts have no unsigned right shift; use >> instead');
    }

    static lessThan(x, y) {
      return JSBI.__compareToBigInt(x, y) < 0;
    }

    static lessThanOrEqual(x, y) {
      return JSBI.__compareToBigInt(x, y) <= 0;
    }

    static greaterThan(x, y) {
      return JSBI.__compareToBigInt(x, y) > 0;
    }

    static greaterThanOrEqual(x, y) {
      return JSBI.__compareToBigInt(x, y) >= 0;
    }

    static equal(x, y) {
      if (x.sign !== y.sign) return false;
      if (x.length !== y.length) return false;
      for (let i = 0; i < x.length; i++) {
        if (x.__digit(i) !== y.__digit(i)) return false;
      }
      return true;
    }

    static notEqual(x, y) {
      return !JSBI.equal(x, y);
    }

    static bitwiseAnd(x, y) {
      if (!x.sign && !y.sign) {
        return JSBI.__absoluteAnd(x, y).__trim();
      } else if (x.sign && y.sign) {
        const resultLength = Math.max(x.length, y.length) + 1;
        // (-x) & (-y) == ~(x-1) & ~(y-1) == ~((x-1) | (y-1))
        // == -(((x-1) | (y-1)) + 1)
        let result = JSBI.__absoluteSubOne(x, resultLength);
        const y1 = JSBI.__absoluteSubOne(y);
        result = JSBI.__absoluteOr(result, y1, result);
        return JSBI.__absoluteAddOne(result, true, result).__trim();
      }
      // Assume that x is the positive BigInt.
      if (x.sign) {
        [x, y] = [y, x];
      }
      // x & (-y) == x & ~(y-1) == x &~ (y-1)
      return JSBI.__absoluteAndNot(x, JSBI.__absoluteSubOne(y)).__trim();
    }

    static bitwiseXor(x, y) {
      if (!x.sign && !y.sign) {
        return JSBI.__absoluteXor(x, y).__trim();
      } else if (x.sign && y.sign) {
        // (-x) ^ (-y) == ~(x-1) ^ ~(y-1) == (x-1) ^ (y-1)
        const resultLength = Math.max(x.length, y.length);
        const result = JSBI.__absoluteSubOne(x, resultLength);
        const y1 = JSBI.__absoluteSubOne(y);
        return JSBI.__absoluteXor(result, y1, result).__trim();
      }
      const resultLength = Math.max(x.length, y.length) + 1;
      // Assume that x is the positive BigInt.
      if (x.sign) {
        [x, y] = [y, x];
      }
      // x ^ (-y) == x ^ ~(y-1) == ~(x ^ (y-1)) == -((x ^ (y-1)) + 1)
      let result = JSBI.__absoluteSubOne(y, resultLength);
      result = JSBI.__absoluteXor(result, x, result);
      return JSBI.__absoluteAddOne(result, true, result).__trim();
    }

    static bitwiseOr(x, y) {
      const resultLength = Math.max(x.length, y.length);
      if (!x.sign && !y.sign) {
        return JSBI.__absoluteOr(x, y).__trim();
      } else if (x.sign && y.sign) {
        // (-x) | (-y) == ~(x-1) | ~(y-1) == ~((x-1) & (y-1))
        // == -(((x-1) & (y-1)) + 1)
        let result = JSBI.__absoluteSubOne(x, resultLength);
        const y1 = JSBI.__absoluteSubOne(y);
        result = JSBI.__absoluteAnd(result, y1, result);
        return JSBI.__absoluteAddOne(result, true, result).__trim();
      }
      // Assume that x is the positive BigInt.
      if (x.sign) {
        [x, y] = [y, x];
      }
      // x | (-y) == x | ~(y-1) == ~((y-1) &~ x) == -(((y-1) ~& x) + 1)
      let result = JSBI.__absoluteSubOne(y, resultLength);
      result = JSBI.__absoluteAndNot(result, x, result);
      return JSBI.__absoluteAddOne(result, true, result).__trim();
    }

    static asIntN(n, x) {
      if (x.length === 0) return x;
      if (n === 0) return JSBI.__zero();
      // If {x} has less than {n} bits, return it directly.
      if (n >= JSBI.__kMaxLengthBits) return x;
      const neededLength = (n + 31) >>> 5;
      if (x.length < neededLength) return x;
      const topDigit = x.__unsignedDigit(neededLength - 1);
      const compareDigit = 1 << ((n - 1) & 31);
      if (x.length === neededLength && topDigit < compareDigit) return x;
      // Otherwise truncate and simulate two's complement.
      const hasBit = (topDigit & compareDigit) === compareDigit;
      if (!hasBit) return JSBI.__truncateToNBits(n, x);
      if (!x.sign) return JSBI.__truncateAndSubFromPowerOfTwo(n, x, true);
      if ((topDigit & (compareDigit - 1)) === 0) {
        for (let i = neededLength - 2; i >= 0; i--) {
          if (x.__digit(i) !== 0) {
            return JSBI.__truncateAndSubFromPowerOfTwo(n, x, false);
          }
        }
        if (x.length === neededLength && topDigit === compareDigit) return x;
        return JSBI.__truncateToNBits(n, x);
      }
      return JSBI.__truncateAndSubFromPowerOfTwo(n, x, false);
    }

    static asUintN(n, x) {
      if (x.length === 0) return x;
      if (n === 0) return JSBI.__zero();
      // If {x} is negative, simulate two's complement representation.
      if (x.sign) {
        if (n > JSBI.__kMaxLengthBits) {
          throw new RangeError('BigInt too big');
        }
        return JSBI.__truncateAndSubFromPowerOfTwo(n, x, false);
      }
      // If {x} is positive and has up to {n} bits, return it directly.
      if (n >= JSBI.__kMaxLengthBits) return x;
      const neededLength = (n + 31) >>> 5;
      if (x.length < neededLength) return x;
      const bitsInTopDigit = n & 31;
      if (x.length == neededLength) {
        if (bitsInTopDigit === 0) return x;
        const topDigit = x.__digit(neededLength - 1);
        if ((topDigit >>> bitsInTopDigit) === 0) return x;
      }
      // Otherwise, truncate.
      return JSBI.__truncateToNBits(n, x);
    }

    // Operators.

    static ADD(x, y) {
      x = JSBI.__toPrimitive(x);
      y = JSBI.__toPrimitive(y);
      if (typeof x === 'string') {
        if (typeof y !== 'string') y = y.toString();
        return x + y;
      }
      if (typeof y === 'string') {
        return x.toString() + y;
      }
      x = JSBI.__toNumeric(x);
      y = JSBI.__toNumeric(y);
      if (JSBI.__isBigInt(x) && JSBI.__isBigInt(y)) {
        return JSBI.add(x, y);
      }
      if (typeof x === 'number' && typeof y === 'number') {
        return x + y;
      }
      throw new TypeError(
        'Cannot mix BigInt and other types, use explicit conversions');
    }

    static LT(x, y) {
      return JSBI.__compare(x, y, 0);
    }
    static LE(x, y) {
      return JSBI.__compare(x, y, 1);
    }
    static GT(x, y) {
      return JSBI.__compare(x, y, 2);
    }
    static GE(x, y) {
      return JSBI.__compare(x, y, 3);
    }

    static EQ(x, y) {
      while (true) {
        if (JSBI.__isBigInt(x)) {
          if (JSBI.__isBigInt(y)) return JSBI.equal(x, y);
          return JSBI.EQ(y, x);
        } else if (typeof x === 'number') {
          if (JSBI.__isBigInt(y)) return JSBI.__equalToNumber(y, x);
          if (typeof y !== 'object') return x == y;
          y = JSBI.__toPrimitive(y);
        } else if (typeof x === 'string') {
          if (JSBI.__isBigInt(y)) {
            x = JSBI.__fromString(x);
            if (x === null) return false;
            return JSBI.equal(x, y);
          }
          if (typeof y !== 'object') return x == y;
          y = JSBI.__toPrimitive(y);
        } else if (typeof x === 'boolean') {
          if (JSBI.__isBigInt(y)) return JSBI.__equalToNumber(y, +x);
          if (typeof y !== 'object') return x == y;
          y = JSBI.__toPrimitive(y);
        } else if (typeof x === 'symbol') {
          if (JSBI.__isBigInt(y)) return false;
          if (typeof y !== 'object') return x == y;
          y = JSBI.__toPrimitive(y);
        } else if (typeof x === 'object') {
          if (typeof y === 'object' && y.constructor !== JSBI) return x == y;
          x = JSBI.__toPrimitive(x);
        } else {
          return x == y;
        }
      }
    }

    static NE(x, y) {
      return !JSBI.EQ(x, y);
    }

    // Helpers.

    static __zero() {
      return new JSBI(0, false);
    }

    static __oneDigit(value, sign) {
      const result = new JSBI(1, sign);
      result.__setDigit(0, value);
      return result;
    }

    __copy() {
      const result = new JSBI(this.length, this.sign);
      for (let i = 0; i < this.length; i++) {
        result[i] = this[i];
      }
      return result;
    }

    __trim() {
      let newLength = this.length;
      let last = this[newLength - 1];
      while (last === 0) {
        newLength--;
        last = this[newLength - 1];
        this.pop();
      }
      if (newLength === 0) this.sign = false;
      return this;
    }

    __initializeDigits() {
      for (let i = 0; i < this.length; i++) {
        this[i] = 0;
      }
    }

    static __decideRounding(x, mantissaBitsUnset, digitIndex, currentDigit) {
      if (mantissaBitsUnset > 0) return -1;
      let topUnconsumedBit;
      if (mantissaBitsUnset < 0) {
        topUnconsumedBit = -mantissaBitsUnset - 1;
      } else {
        // {currentDigit} fit the mantissa exactly; look at the next digit.
        if (digitIndex === 0) return -1;
        digitIndex--;
        currentDigit = x.__digit(digitIndex);
        topUnconsumedBit = 31;
      }
      // If the most significant remaining bit is 0, round down.
      let mask = 1 << topUnconsumedBit;
      if ((currentDigit & mask) === 0) return -1;
      // If any other remaining bit is set, round up.
      mask -= 1;
      if ((currentDigit & mask) !== 0) return 1;
      while (digitIndex > 0) {
        digitIndex--;
        if (x.__digit(digitIndex) !== 0) return 1;
      }
      return 0;
    }

    static __fromDouble(value) {
      const sign = value < 0;
      JSBI.__kBitConversionDouble[0] = value;
      const rawExponent = (JSBI.__kBitConversionInts[1] >>> 20) & 0x7FF;
      const exponent = rawExponent - 0x3FF;
      const digits = (exponent >>> 5) + 1;
      const result = new JSBI(digits, sign);
      const kHiddenBit = 0x00100000;
      let mantissaHigh = (JSBI.__kBitConversionInts[1] & 0xFFFFF) | kHiddenBit;
      let mantissaLow = JSBI.__kBitConversionInts[0];
      const kMantissaHighTopBit = 20;
      // 0-indexed position of most significant bit in most significant digit.
      const msdTopBit = exponent & 31;
      // Number of unused bits in the mantissa. We'll keep them shifted to the
      // left (i.e. most significant part).
      let remainingMantissaBits = 0;
      // Next digit under construction.
      let digit;
      // First, build the MSD by shifting the mantissa appropriately.
      if (msdTopBit < kMantissaHighTopBit) {
        const shift = kMantissaHighTopBit - msdTopBit;
        remainingMantissaBits = shift + 32;
        digit = mantissaHigh >>> shift;
        mantissaHigh = (mantissaHigh << (32 - shift)) |
          (mantissaLow >>> shift);
        mantissaLow = mantissaLow << (32 - shift);
      } else if (msdTopBit === kMantissaHighTopBit) {
        remainingMantissaBits = 32;
        digit = mantissaHigh;
        mantissaHigh = mantissaLow;
      } else {
        const shift = msdTopBit - kMantissaHighTopBit;
        remainingMantissaBits = 32 - shift;
        digit = (mantissaHigh << shift) | (mantissaLow >>> (32 - shift));
        mantissaHigh = mantissaLow << shift;
      }
      result.__setDigit(digits - 1, digit);
      // Then fill in the rest of the digits.
      for (let digitIndex = digits - 2; digitIndex >= 0; digitIndex--) {
        if (remainingMantissaBits > 0) {
          remainingMantissaBits -= 32;
          digit = mantissaHigh;
          mantissaHigh = mantissaLow;
        } else {
          digit = 0;
        }
        result.__setDigit(digitIndex, digit);
      }
      return result.__trim();
    }

    static __isWhitespace(c) {
      if (c <= 0x0D && c >= 0x09) return true;
      if (c <= 0x9F) return c === 0x20;
      if (c <= 0x01FFFF) {
        return c === 0xA0 || c === 0x1680;
      }
      if (c <= 0x02FFFF) {
        c &= 0x01FFFF;
        return c <= 0x0A || c === 0x28 || c === 0x29 || c === 0x2F ||
          c === 0x5F || c === 0x1000;
      }
      return c === 0xFEFF;
    }

    static __fromString(string, radix = 0) {
      let sign = 0;
      const length = string.length;
      let cursor = 0;
      if (cursor === length) return JSBI.__zero();
      let current = string.charCodeAt(cursor);
      // Skip whitespace.
      while (JSBI.__isWhitespace(current)) {
        if (++cursor === length) return JSBI.__zero();
        current = string.charCodeAt(cursor);
      }

      // Detect radix.
      if (current === 0x2B) { // '+'
        if (++cursor === length) return null;
        current = string.charCodeAt(cursor);
        sign = 1;
      } else if (current === 0x2D) { // '-'
        if (++cursor === length) return null;
        current = string.charCodeAt(cursor);
        sign = -1;
      }

      if (radix === 0) {
        radix = 10;
        if (current === 0x30) { // '0'
          if (++cursor === length) return JSBI.__zero();
          current = string.charCodeAt(cursor);
          if (current === 0x58 || current === 0x78) { // 'X' or 'x'
            radix = 16;
            if (++cursor === length) return null;
            current = string.charCodeAt(cursor);
          } else if (current === 0x4F || current === 0x6F) { // 'O' or 'o'
            radix = 8;
            if (++cursor === length) return null;
            current = string.charCodeAt(cursor);
          } else if (current === 0x42 || current === 0x62) { // 'B' or 'b'
            radix = 2;
            if (++cursor === length) return null;
            current = string.charCodeAt(cursor);
          }
        }
      } else if (radix === 16) {
        if (current === 0x30) { // '0'
          // Allow "0x" prefix.
          if (++cursor === length) return JSBI.__zero();
          current = string.charCodeAt(cursor);
          if (current === 0x58 || current === 0x78) { // 'X' or 'x'
            if (++cursor === length) return null;
            current = string.charCodeAt(cursor);
          }
        }
      }
      // Skip leading zeros.
      while (current === 0x30) {
        if (++cursor === length) return JSBI.__zero();
        current = string.charCodeAt(cursor);
      }

      // Allocate result.
      const chars = length - cursor;
      let bitsPerChar = JSBI.__kMaxBitsPerChar[radix];
      let roundup = JSBI.__kBitsPerCharTableMultiplier - 1;
      if (chars > (1 << 30) / bitsPerChar) return null;
      const bitsMin =
        (bitsPerChar * chars + roundup) >>> JSBI.__kBitsPerCharTableShift;
      const resultLength = (bitsMin + 31) >>> 5;
      const result = new JSBI(resultLength, false);

      // Parse.
      const limDigit = radix < 10 ? radix : 10;
      const limAlpha = radix > 10 ? radix - 10 : 0;

      if ((radix & (radix - 1)) === 0) {
        // Power-of-two radix.
        bitsPerChar >>= JSBI.__kBitsPerCharTableShift;
        const parts = [];
        const partsBits = [];
        let done = false;
        do {
          let part = 0;
          let bits = 0;
          while (true) {
            let d;
            if (((current - 48) >>> 0) < limDigit) {
              d = current - 48;
            } else if ((((current | 32) - 97) >>> 0) < limAlpha) {
              d = (current | 32) - 87;
            } else {
              done = true;
              break;
            }
            bits += bitsPerChar;
            part = (part << bitsPerChar) | d;
            if (++cursor === length) {
              done = true;
              break;
            }
            current = string.charCodeAt(cursor);
            if (bits + bitsPerChar > 32) break;
          }
          parts.push(part);
          partsBits.push(bits);
        } while (!done);
        JSBI.__fillFromParts(result, parts, partsBits);
      } else {
        result.__initializeDigits();
        let done = false;
        let charsSoFar = 0;
        do {
          let part = 0;
          let multiplier = 1;
          while (true) {
            let d;
            if (((current - 48) >>> 0) < limDigit) {
              d = current - 48;
            } else if ((((current | 32) - 97) >>> 0) < limAlpha) {
              d = (current | 32) - 87;
            } else {
              done = true;
              break;
            }

            const m = multiplier * radix;
            if (m > 0xFFFFFFFF) break;
            multiplier = m;
            part = part * radix + d;
            charsSoFar++;
            if (++cursor === length) {
              done = true;
              break;
            }
            current = string.charCodeAt(cursor);
          }
          roundup = JSBI.__kBitsPerCharTableMultiplier * 32 - 1;
          const digitsSoFar = (bitsPerChar * charsSoFar + roundup) >>>
            (JSBI.__kBitsPerCharTableShift + 5);
          result.__inplaceMultiplyAdd(multiplier, part, digitsSoFar);
        } while (!done);
      }

      if (cursor !== length) {
        if (!JSBI.__isWhitespace(current)) return null;
        for (cursor++; cursor < length; cursor++) {
          current = string.charCodeAt(cursor);
          if (!JSBI.__isWhitespace(current)) return null;
        }
      }

      // Get result.
      if (sign !== 0 && radix !== 10) return null;
      result.sign = (sign === -1);
      return result.__trim();
    }

    static __fillFromParts(result, parts, partsBits) {
      let digitIndex = 0;
      let digit = 0;
      let bitsInDigit = 0;
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i];
        const partBits = partsBits[i];
        digit |= (part << bitsInDigit);
        bitsInDigit += partBits;
        if (bitsInDigit === 32) {
          result.__setDigit(digitIndex++, digit);
          bitsInDigit = 0;
          digit = 0;
        } else if (bitsInDigit > 32) {
          result.__setDigit(digitIndex++, digit);
          bitsInDigit -= 32;
          digit = part >>> (partBits - bitsInDigit);
        }
      }
      if (digit !== 0) {
        if (digitIndex >= result.length) throw new Error('implementation bug');
        result.__setDigit(digitIndex++, digit);
      }
      for (; digitIndex < result.length; digitIndex++) {
        result.__setDigit(digitIndex, 0);
      }
    }

    static __toStringBasePowerOfTwo(x, radix) {
      const length = x.length;
      let bits = radix - 1;
      bits = ((bits >>> 1) & 0x55) + (bits & 0x55);
      bits = ((bits >>> 2) & 0x33) + (bits & 0x33);
      bits = ((bits >>> 4) & 0x0F) + (bits & 0x0F);
      const bitsPerChar = bits;
      const charMask = radix - 1;
      const msd = x.__digit(length - 1);
      const msdLeadingZeros = Math.clz32(msd);
      const bitLength = length * 32 - msdLeadingZeros;
      let charsRequired =
        ((bitLength + bitsPerChar - 1) / bitsPerChar) | 0;
      if (x.sign) charsRequired++;
      if (charsRequired > (1 << 28)) throw new Error('string too long');
      const result = new Array(charsRequired);
      let pos = charsRequired - 1;
      let digit = 0;
      let availableBits = 0;
      for (let i = 0; i < length - 1; i++) {
        const newDigit = x.__digit(i);
        const current = (digit | (newDigit << availableBits)) & charMask;
        result[pos--] = JSBI.__kConversionChars[current];
        const consumedBits = bitsPerChar - availableBits;
        digit = newDigit >>> consumedBits;
        availableBits = 32 - consumedBits;
        while (availableBits >= bitsPerChar) {
          result[pos--] = JSBI.__kConversionChars[digit & charMask];
          digit >>>= bitsPerChar;
          availableBits -= bitsPerChar;
        }
      }
      const current = (digit | (msd << availableBits)) & charMask;
      result[pos--] = JSBI.__kConversionChars[current];
      digit = msd >>> (bitsPerChar - availableBits);
      while (digit !== 0) {
        result[pos--] = JSBI.__kConversionChars[digit & charMask];
        digit >>>= bitsPerChar;
      }
      if (x.sign) result[pos--] = '-';
      if (pos !== -1) throw new Error('implementation bug');
      return result.join('');
    }

    static __toStringGeneric(x, radix, isRecursiveCall) {
      const length = x.length;
      if (length === 0) return '';
      if (length === 1) {
        let result = x.__unsignedDigit(0).toString(radix);
        if (isRecursiveCall === false && x.sign) {
          result = '-' + result;
        }
        return result;
      }
      const bitLength = length * 32 - Math.clz32(x.__digit(length - 1));
      const maxBitsPerChar = JSBI.__kMaxBitsPerChar[radix];
      const minBitsPerChar = maxBitsPerChar - 1;
      let charsRequired = bitLength * JSBI.__kBitsPerCharTableMultiplier;
      charsRequired += minBitsPerChar - 1;
      charsRequired = (charsRequired / minBitsPerChar) | 0;
      const secondHalfChars = (charsRequired + 1) >> 1;
      // Divide-and-conquer: split by a power of {radix} that's approximately
      // the square root of {x}, then recurse.
      const conqueror = JSBI.exponentiate(JSBI.__oneDigit(radix, false),
        JSBI.__oneDigit(secondHalfChars, false));
      let quotient;
      let secondHalf;
      const divisor = conqueror.__unsignedDigit(0);
      if (conqueror.length === 1 && divisor <= 0xFFFF) {
        quotient = new JSBI(x.length, false);
        quotient.__initializeDigits();
        let remainder = 0;
        for (let i = x.length * 2 - 1; i >= 0; i--) {
          const input = (remainder << 16) | x.__halfDigit(i);
          quotient.__setHalfDigit(i, (input / divisor) | 0);
          remainder = (input % divisor) | 0;
        }
        secondHalf = remainder.toString(radix);
      } else {
        const divisionResult = JSBI.__absoluteDivLarge(x, conqueror, true, true);
        quotient = divisionResult.quotient;
        const remainder = divisionResult.remainder.__trim();
        secondHalf = JSBI.__toStringGeneric(remainder, radix, true);
      }
      quotient.__trim();
      let firstHalf = JSBI.__toStringGeneric(quotient, radix, true);
      while (secondHalf.length < secondHalfChars) {
        secondHalf = '0' + secondHalf;
      }
      if (isRecursiveCall === false && x.sign) {
        firstHalf = '-' + firstHalf;
      }
      return firstHalf + secondHalf;
    }

    static __unequalSign(leftNegative) {
      return leftNegative ? -1 : 1;
    }
    static __absoluteGreater(bothNegative) {
      return bothNegative ? -1 : 1;
    }
    static __absoluteLess(bothNegative) {
      return bothNegative ? 1 : -1;
    }

    static __compareToBigInt(x, y) {
      const xSign = x.sign;
      if (xSign !== y.sign) return JSBI.__unequalSign(xSign);
      const result = JSBI.__absoluteCompare(x, y);
      if (result > 0) return JSBI.__absoluteGreater(xSign);
      if (result < 0) return JSBI.__absoluteLess(xSign);
      return 0;
    }

    static __compareToNumber(x, y) {
      if (y | 0 === 0) {
        const xSign = x.sign;
        const ySign = (y < 0);
        if (xSign !== ySign) return JSBI.__unequalSign(xSign);
        if (x.length === 0) {
          if (ySign) throw new Error('implementation bug');
          return y === 0 ? 0 : -1;
        }
        // Any multi-digit BigInt is bigger than an int32.
        if (x.length > 1) return JSBI.__absoluteGreater(xSign);
        const yAbs = Math.abs(y);
        const xDigit = x.__unsignedDigit(0);
        if (xDigit > yAbs) return JSBI.__absoluteGreater(xSign);
        if (xDigit < yAbs) return JSBI.__absoluteLess(xSign);
        return 0;
      }
      return JSBI.__compareToDouble(x, y);
    }

    static __compareToDouble(x, y) {
      if (y !== y) return y; // NaN.
      if (y === Infinity) return -1;
      if (y === -Infinity) return 1;
      const xSign = x.sign;
      const ySign = (y < 0);
      if (xSign !== ySign) return JSBI.__unequalSign(xSign);
      if (y === 0) {
        throw new Error('implementation bug: should be handled elsewhere');
      }
      if (x.length === 0) return -1;
      JSBI.__kBitConversionDouble[0] = y;
      const rawExponent = (JSBI.__kBitConversionInts[1] >>> 20) & 0x7FF;
      if (rawExponent === 0x7FF) {
        throw new Error('implementation bug: handled elsewhere');
      }
      const exponent = rawExponent - 0x3FF;
      if (exponent < 0) {
        // The absolute value of y is less than 1. Only 0n has an absolute
        // value smaller than that, but we've already covered that case.
        return JSBI.__absoluteGreater(xSign);
      }
      const xLength = x.length;
      let xMsd = x.__digit(xLength - 1);
      const msdLeadingZeros = Math.clz32(xMsd);
      const xBitLength = xLength * 32 - msdLeadingZeros;
      const yBitLength = exponent + 1;
      if (xBitLength < yBitLength) return JSBI.__absoluteLess(xSign);
      if (xBitLength > yBitLength) return JSBI.__absoluteGreater(xSign);
      // Same sign, same bit length. Shift mantissa to align with x and compare
      // bit for bit.
      const kHiddenBit = 0x00100000;
      let mantissaHigh = (JSBI.__kBitConversionInts[1] & 0xFFFFF) | kHiddenBit;
      let mantissaLow = JSBI.__kBitConversionInts[0];
      const kMantissaHighTopBit = 20;
      const msdTopBit = 31 - msdLeadingZeros;
      if (msdTopBit !== ((xBitLength - 1) % 31)) {
        throw new Error('implementation bug');
      }
      let compareMantissa; // Shifted chunk of mantissa.
      let remainingMantissaBits = 0;
      // First, compare most significant digit against beginning of mantissa.
      if (msdTopBit < kMantissaHighTopBit) {
        const shift = kMantissaHighTopBit - msdTopBit;
        remainingMantissaBits = shift + 32;
        compareMantissa = mantissaHigh >>> shift;
        mantissaHigh = (mantissaHigh << (32 - shift)) | (mantissaLow >>> shift);
        mantissaLow = mantissaLow << (32 - shift);
      } else if (msdTopBit === kMantissaHighTopBit) {
        remainingMantissaBits = 32;
        compareMantissa = mantissaHigh;
        mantissaHigh = mantissaLow;
      } else {
        const shift = msdTopBit - kMantissaHighTopBit;
        remainingMantissaBits = 32 - shift;
        compareMantissa =
          (mantissaHigh << shift) | (mantissaLow >>> (32 - shift));
        mantissaHigh = mantissaLow << shift;
      }
      xMsd = xMsd >>> 0;
      compareMantissa = compareMantissa >>> 0;
      if (xMsd > compareMantissa) return JSBI.__absoluteGreater(xSign);
      if (xMsd < compareMantissa) return JSBI.__absoluteLess(xSign);
      // Then, compare additional digits against remaining mantissa bits.
      for (let digitIndex = xLength - 2; digitIndex >= 0; digitIndex--) {
        if (remainingMantissaBits > 0) {
          remainingMantissaBits -= 32;
          compareMantissa = mantissaHigh >>> 0;
          mantissaHigh = mantissaLow;
          mantissaLow = 0;
        } else {
          compareMantissa = 0;
        }
        const digit = x.__unsignedDigit(digitIndex);
        if (digit > compareMantissa) return JSBI.__absoluteGreater(xSign);
        if (digit < compareMantissa) return JSBI.__absoluteLess(xSign);
      }
      // Integer parts are equal; check whether {y} has a fractional part.
      if (mantissaHigh !== 0 || mantissaLow !== 0) {
        if (remainingMantissaBits === 0) throw new Error('implementation bug');
        return JSBI.__absoluteLess(xSign);
      }
      return 0;
    }

    static __equalToNumber(x, y) {
      if (y | 0 === y) {
        if (y === 0) return x.length === 0;
        // Any multi-digit BigInt is bigger than an int32.
        return (x.length === 1) && (x.sign === (y < 0)) &&
          (x.__unsignedDigit(0) === Math.abs(y));
      }
      return JSBI.__compareToDouble(x, y) === 0;
    }

    // Comparison operations, chosen such that "op ^ 2" reverses direction:
    // 0 - lessThan
    // 1 - lessThanOrEqual
    // 2 - greaterThan
    // 3 - greaterThanOrEqual
    static __comparisonResultToBool(result, op) {
      switch (op) {
        case 0: return result < 0;
        case 1: return result <= 0;
        case 2: return result > 0;
        case 3: return result >= 0;
      }
      throw new Error('unreachable');
    }

    static __compare(x, y, op) {
      x = JSBI.__toPrimitive(x);
      y = JSBI.__toPrimitive(y);
      if (typeof x === 'string' && typeof y === 'string') {
        switch (op) {
          case 0: return x < y;
          case 1: return x <= y;
          case 2: return x > y;
          case 3: return x >= y;
        }
      }
      if (JSBI.__isBigInt(x) && typeof y === 'string') {
        y = JSBI.__fromString(y);
        if (y === null) return false;
        return JSBI.__comparisonResultToBool(JSBI.__compareToBigInt(x, y), op);
      }
      if (typeof x === 'string' && JSBI.__isBigInt(y)) {
        x = JSBI.__fromString(x);
        if (x === null) return false;
        return JSBI.__comparisonResultToBool(JSBI.__compareToBigInt(x, y), op);
      }
      x = JSBI.__toNumeric(x);
      y = JSBI.__toNumeric(y);
      if (JSBI.__isBigInt(x)) {
        if (JSBI.__isBigInt(y)) {
          return JSBI.__comparisonResultToBool(JSBI.__compareToBigInt(x, y), op);
        }
        if (typeof y !== 'number') throw new Error('implementation bug');
        return JSBI.__comparisonResultToBool(JSBI.__compareToNumber(x, y), op);
      }
      if (typeof x !== 'number') throw new Error('implementation bug');
      if (JSBI.__isBigInt(y)) {
        // Note that "op ^ 2" reverses the op's direction.
        return JSBI.__comparisonResultToBool(JSBI.__compareToNumber(y, x),
          op ^ 2);
      }
      if (typeof y !== 'number') throw new Error('implementation bug');
      switch (op) {
        case 0: return x < y;
        case 1: return x <= y;
        case 2: return x > y;
        case 3: return x >= y;
      }
    }

    __clzmsd() {
      return Math.clz32(this[this.length - 1]);
    }

    static __absoluteAdd(x, y, resultSign) {
      if (x.length < y.length) return JSBI.__absoluteAdd(y, x, resultSign);
      if (x.length === 0) return x;
      if (y.length === 0) return x.sign === resultSign ? x : JSBI.unaryMinus(x);
      let resultLength = x.length;
      if (x.__clzmsd() === 0 || (y.length === x.length && y.__clzmsd() === 0)) {
        resultLength++;
      }
      const result = new JSBI(resultLength, resultSign);
      let carry = 0;
      let i = 0;
      for (; i < y.length; i++) {
        const yDigit = y.__digit(i);
        const xDigit = x.__digit(i);
        const rLow = (xDigit & 0xFFFF) + (yDigit & 0xFFFF) + carry;
        const rHigh = (xDigit >>> 16) + (yDigit >>> 16) + (rLow >>> 16);
        carry = rHigh >>> 16;
        result.__setDigit(i, (rLow & 0xFFFF) | (rHigh << 16));
      }
      for (; i < x.length; i++) {
        const xDigit = x.__digit(i);
        const rLow = (xDigit & 0xFFFF) + carry;
        const rHigh = (xDigit >>> 16) + (rLow >>> 16);
        carry = rHigh >>> 16;
        result.__setDigit(i, (rLow & 0xFFFF) | (rHigh << 16));
      }
      if (i < result.length) {
        result.__setDigit(i, carry);
      }
      return result.__trim();
    }

    static __absoluteSub(x, y, resultSign) {
      if (x.length === 0) return x;
      if (y.length === 0) return x.sign === resultSign ? x : JSBI.unaryMinus(x);
      const result = new JSBI(x.length, resultSign);
      let borrow = 0;
      let i = 0;
      for (; i < y.length; i++) {
        const xDigit = x.__digit(i);
        const yDigit = y.__digit(i);
        const rLow = (xDigit & 0xFFFF) - (yDigit & 0xFFFF) - borrow;
        borrow = (rLow >>> 16) & 1;
        const rHigh = (xDigit >>> 16) - (yDigit >>> 16) - borrow;
        borrow = (rHigh >>> 16) & 1;
        result.__setDigit(i, (rLow & 0xFFFF) | (rHigh << 16));
      }
      for (; i < x.length; i++) {
        const xDigit = x.__digit(i);
        const rLow = (xDigit & 0xFFFF) - borrow;
        borrow = (rLow >>> 16) & 1;
        const rHigh = (xDigit >>> 16) - borrow;
        borrow = (rHigh >>> 16) & 1;
        result.__setDigit(i, (rLow & 0xFFFF) | (rHigh << 16));
      }
      return result.__trim();
    }

    static __absoluteAddOne(x, sign, result = null) {
      const inputLength = x.length;
      if (result === null) {
        result = new JSBI(inputLength, sign);
      } else {
        result.sign = sign;
      }
      let carry = true;
      for (let i = 0; i < inputLength; i++) {
        let digit = x.__digit(i);
        if (carry) {
          const newCarry = digit === (0xFFFFFFFF | 0);
          digit = (digit + 1) | 0;
          carry = newCarry;
        }
        result.__setDigit(i, digit);
      }
      if (carry) {
        result.__setDigitGrow(inputLength, 1);
      }
      return result;
    }

    static __absoluteSubOne(x, resultLength) {
      const length = x.length;
      resultLength = resultLength || length;
      const result = new JSBI(resultLength, false);
      let borrow = true;
      for (let i = 0; i < length; i++) {
        let digit = x.__digit(i);
        if (borrow) {
          const newBorrow = digit === 0;
          digit = (digit - 1) | 0;
          borrow = newBorrow;
        }
        result.__setDigit(i, digit);
      }
      if (borrow) throw new Error('implementation bug');
      for (let i = length; i < resultLength; i++) {
        result.__setDigit(i, 0);
      }
      return result;
    }

    static __absoluteAnd(x, y, result = null) {
      let xLength = x.length;
      let yLength = y.length;
      let numPairs = yLength;
      if (xLength < yLength) {
        numPairs = xLength;
        const tmp = x;
        const tmpLength = xLength;
        x = y;
        xLength = yLength;
        y = tmp;
        yLength = tmpLength;
      }
      let resultLength = numPairs;
      if (result === null) {
        result = new JSBI(resultLength, false);
      } else {
        resultLength = result.length;
      }
      let i = 0;
      for (; i < numPairs; i++) {
        result.__setDigit(i, x.__digit(i) & y.__digit(i));
      }
      for (; i < resultLength; i++) {
        result.__setDigit(i, 0);
      }
      return result;
    }

    static __absoluteAndNot(x, y, result = null) {
      const xLength = x.length;
      const yLength = y.length;
      let numPairs = yLength;
      if (xLength < yLength) {
        numPairs = xLength;
      }
      let resultLength = xLength;
      if (result === null) {
        result = new JSBI(resultLength, false);
      } else {
        resultLength = result.length;
      }
      let i = 0;
      for (; i < numPairs; i++) {
        result.__setDigit(i, x.__digit(i) & ~y.__digit(i));
      }
      for (; i < xLength; i++) {
        result.__setDigit(i, x.__digit(i));
      }
      for (; i < resultLength; i++) {
        result.__setDigit(i, 0);
      }
      return result;
    }

    static __absoluteOr(x, y, result = null) {
      let xLength = x.length;
      let yLength = y.length;
      let numPairs = yLength;
      if (xLength < yLength) {
        numPairs = xLength;
        const tmp = x;
        const tmpLength = xLength;
        x = y;
        xLength = yLength;
        y = tmp;
        yLength = tmpLength;
      }
      let resultLength = xLength;
      if (result === null) {
        result = new JSBI(resultLength, false);
      } else {
        resultLength = result.length;
      }
      let i = 0;
      for (; i < numPairs; i++) {
        result.__setDigit(i, x.__digit(i) | y.__digit(i));
      }
      for (; i < xLength; i++) {
        result.__setDigit(i, x.__digit(i));
      }
      for (; i < resultLength; i++) {
        result.__setDigit(i, 0);
      }
      return result;
    }

    static __absoluteXor(x, y, result = null) {
      let xLength = x.length;
      let yLength = y.length;
      let numPairs = yLength;
      if (xLength < yLength) {
        numPairs = xLength;
        const tmp = x;
        const tmpLength = xLength;
        x = y;
        xLength = yLength;
        y = tmp;
        yLength = tmpLength;
      }
      let resultLength = xLength;
      if (result === null) {
        result = new JSBI(resultLength, false);
      } else {
        resultLength = result.length;
      }
      let i = 0;
      for (; i < numPairs; i++) {
        result.__setDigit(i, x.__digit(i) ^ y.__digit(i));
      }
      for (; i < xLength; i++) {
        result.__setDigit(i, x.__digit(i));
      }
      for (; i < resultLength; i++) {
        result.__setDigit(i, 0);
      }
      return result;
    }

    static __absoluteCompare(x, y) {
      const diff = x.length - y.length;
      if (diff !== 0) return diff;
      let i = x.length - 1;
      while (i >= 0 && x.__digit(i) === y.__digit(i)) i--;
      if (i < 0) return 0;
      return x.__unsignedDigit(i) > y.__unsignedDigit(i) ? 1 : -1;
    }

    static __multiplyAccumulate(multiplicand, multiplier, accumulator,
                                accumulatorIndex) {
      if (multiplier === 0) return;
      const m2Low = multiplier & 0xFFFF;
      const m2High = multiplier >>> 16;
      let carry = 0;
      let highLower = 0;
      let highHigher = 0;
      for (let i = 0; i < multiplicand.length; i++, accumulatorIndex++) {
        let acc = accumulator.__digit(accumulatorIndex);
        let accLow = acc & 0xFFFF;
        let accHigh = acc >>> 16;
        const m1 = multiplicand.__digit(i);
        const m1Low = m1 & 0xFFFF;
        const m1High = m1 >>> 16;
        const rLow = Math.imul(m1Low, m2Low);
        const rMid1 = Math.imul(m1Low, m2High);
        const rMid2 = Math.imul(m1High, m2Low);
        const rHigh = Math.imul(m1High, m2High);
        accLow += highLower + (rLow & 0xFFFF);
        accHigh += highHigher + carry + (accLow >>> 16) + (rLow >>> 16) +
          (rMid1 & 0xFFFF) + (rMid2 & 0xFFFF);
        carry = accHigh >>> 16;
        highLower = (rMid1 >>> 16) + (rMid2 >>> 16) + (rHigh & 0xFFFF) + carry;
        carry = highLower >>> 16;
        highLower &= 0xFFFF;
        highHigher = rHigh >>> 16;
        acc = (accLow & 0xFFFF) | (accHigh << 16);
        accumulator.__setDigit(accumulatorIndex, acc);
      }
      for (; carry !== 0 || highLower !== 0 || highHigher !== 0;
             accumulatorIndex++) {
        let acc = accumulator.__digit(accumulatorIndex);
        const accLow = (acc & 0xFFFF) + highLower;
        const accHigh = (acc >>> 16) + (accLow >>> 16) + highHigher + carry;
        highLower = 0;
        highHigher = 0;
        carry = accHigh >>> 16;
        acc = (accLow & 0xFFFF) | (accHigh << 16);
        accumulator.__setDigit(accumulatorIndex, acc);
      }
    }

    static __internalMultiplyAdd(source, factor, summand, n, result) {
      let carry = summand;
      let high = 0;
      for (let i = 0; i < n; i++) {
        const digit = source.__digit(i);
        const rx = Math.imul(digit & 0xFFFF, factor);
        const r0 = (rx & 0xFFFF) + high + carry;
        carry = r0 >>> 16;
        const ry = Math.imul(digit >>> 16, factor);
        const r16 = (ry & 0xFFFF) + (rx >>> 16) + carry;
        carry = r16 >>> 16;
        high = ry >>> 16;
        result.__setDigit(i, (r16 << 16) | (r0 & 0xFFFF));
      }
      if (result.length > n) {
        result.__setDigit(n++, carry + high);
        while (n < result.length) {
          result.__setDigit(n++, 0);
        }
      } else {
        if (carry + high !== 0) throw new Error('implementation bug');
      }
    }

    __inplaceMultiplyAdd(multiplier, summand, length) {
      if (length > this.length) length = this.length;
      const mLow = multiplier & 0xFFFF;
      const mHigh = multiplier >>> 16;
      let carry = 0;
      let highLower = summand & 0xFFFF;
      let highHigher = summand >>> 16;
      for (let i = 0; i < length; i++) {
        const d = this.__digit(i);
        const dLow = d & 0xFFFF;
        const dHigh = d >>> 16;
        const pLow = Math.imul(dLow, mLow);
        const pMid1 = Math.imul(dLow, mHigh);
        const pMid2 = Math.imul(dHigh, mLow);
        const pHigh = Math.imul(dHigh, mHigh);
        const rLow = highLower + (pLow & 0xFFFF);
        const rHigh = highHigher + carry + (rLow >>> 16) + (pLow >>> 16) +
          (pMid1 & 0xFFFF) + (pMid2 & 0xFFFF);
        highLower = (pMid1 >>> 16) + (pMid2 >>> 16) + (pHigh & 0xFFFF) +
          (rHigh >>> 16);
        carry = highLower >>> 16;
        highLower &= 0xFFFF;
        highHigher = pHigh >>> 16;
        const result = (rLow & 0xFFFF) | (rHigh << 16);
        this.__setDigit(i, result);
      }
      if (carry !== 0 || highLower !== 0 || highHigher !== 0) {
        throw new Error('implementation bug');
      }
    }

    static __absoluteDivSmall(x, divisor, quotient) {
      if (quotient === null) quotient = new JSBI(x.length, false);
      let remainder = 0;
      for (let i = x.length * 2 - 1; i >= 0; i -= 2) {
        let input = ((remainder << 16) | x.__halfDigit(i)) >>> 0;
        const upperHalf = (input / divisor) | 0;
        remainder = (input % divisor) | 0;
        input = ((remainder << 16) | x.__halfDigit(i - 1)) >>> 0;
        const lowerHalf = (input / divisor) | 0;
        remainder = (input % divisor) | 0;
        quotient.__setDigit(i >>> 1, (upperHalf << 16) | lowerHalf);
      }
      return quotient;
    }

    static __absoluteModSmall(x, divisor) {
      let remainder = 0;
      for (let i = x.length * 2 - 1; i >= 0; i--) {
        const input = ((remainder << 16) | x.__halfDigit(i)) >>> 0;
        remainder = (input % divisor) | 0;
      }
      return remainder;
    }

    static __absoluteDivLarge(dividend, divisor, wantQuotient, wantRemainder) {
      const n = divisor.__halfDigitLength();
      const n2 = divisor.length;
      const m = dividend.__halfDigitLength() - n;
      let q = null;
      if (wantQuotient) {
        q = new JSBI((m + 2) >>> 1, false);
        q.__initializeDigits();
      }
      const qhatv = new JSBI((n + 2) >>> 1, false);
      qhatv.__initializeDigits();
      // D1.
      const shift = JSBI.__clz16(divisor.__halfDigit(n - 1));
      if (shift > 0) {
        divisor = JSBI.__specialLeftShift(divisor, shift, 0 /* add no digits*/);
      }
      const u = JSBI.__specialLeftShift(dividend, shift, 1 /* add one digit */);
      // D2.
      const vn1 = divisor.__halfDigit(n - 1);
      let halfDigitBuffer = 0;
      for (let j = m; j >= 0; j--) {
        // D3.
        let qhat = 0xFFFF;
        const ujn = u.__halfDigit(j + n);
        if (ujn !== vn1) {
          const input = ((ujn << 16) | u.__halfDigit(j + n - 1)) >>> 0;
          qhat = (input / vn1) | 0;
          let rhat = (input % vn1) | 0;
          const vn2 = divisor.__halfDigit(n - 2);
          const ujn2 = u.__halfDigit(j + n - 2);
          while ((Math.imul(qhat, vn2) >>> 0) > (((rhat << 16) | ujn2) >>> 0)) {
            qhat--;
            rhat += vn1;
            if (rhat > 0xFFFF) break;
          }
        }
        // D4.
        JSBI.__internalMultiplyAdd(divisor, qhat, 0, n2, qhatv);
        let c = u.__inplaceSub(qhatv, j, n + 1);
        if (c !== 0) {
          c = u.__inplaceAdd(divisor, j, n);
          u.__setHalfDigit(j + n, u.__halfDigit(j + n) + c);
          qhat--;
        }
        if (wantQuotient) {
          if (j & 1) {
            halfDigitBuffer = qhat << 16;
          } else {
            q.__setDigit(j >>> 1, halfDigitBuffer | qhat);
          }
        }
      }
      if (wantRemainder) {
        u.__inplaceRightShift(shift);
        if (wantQuotient) {
          return {quotient: q, remainder: u};
        }
        return u;
      }
      if (wantQuotient) return q;
    }

    static __clz16(value) {
      return Math.clz32(value) - 16;
    }

    // TODO: work on full digits, like __inplaceSub?
    __inplaceAdd(summand, startIndex, halfDigits) {
      let carry = 0;
      for (let i = 0; i < halfDigits; i++) {
        const sum = this.__halfDigit(startIndex + i) +
          summand.__halfDigit(i) +
          carry;
        carry = sum >>> 16;
        this.__setHalfDigit(startIndex + i, sum);
      }
      return carry;
    }

    __inplaceSub(subtrahend, startIndex, halfDigits) {
      const fullSteps = (halfDigits - 1) >>> 1;
      let borrow = 0;
      if (startIndex & 1) {
        // this:   [..][..][..]
        // subtr.:   [..][..]
        startIndex >>= 1;
        let current = this.__digit(startIndex);
        let r0 = current & 0xFFFF;
        let i = 0;
        for (; i < fullSteps; i++) {
          const sub = subtrahend.__digit(i);
          const r16 = (current >>> 16) - (sub & 0xFFFF) - borrow;
          borrow = (r16 >>> 16) & 1;
          this.__setDigit(startIndex + i, (r16 << 16) | (r0 & 0xFFFF));
          current = this.__digit(startIndex + i + 1);
          r0 = (current & 0xFFFF) - (sub >>> 16) - borrow;
          borrow = (r0 >>> 16) & 1;
        }
        // Unrolling the last iteration gives a 5% performance benefit!
        const sub = subtrahend.__digit(i);
        const r16 = (current >>> 16) - (sub & 0xFFFF) - borrow;
        borrow = (r16 >>> 16) & 1;
        this.__setDigit(startIndex + i, (r16 << 16) | (r0 & 0xFFFF));
        const subTop = sub >>> 16;
        if (startIndex + i + 1 >= this.length) {
          throw new RangeError('out of bounds');
        }
        if ((halfDigits & 1) === 0) {
          current = this.__digit(startIndex + i + 1);
          r0 = (current & 0xFFFF) - subTop - borrow;
          borrow = (r0 >>> 16) & 1;
          this.__setDigit(startIndex + subtrahend.length,
            (current & 0xFFFF0000) | (r0 & 0xFFFF));
        }
      } else {
        startIndex >>= 1;
        let i = 0;
        for (; i < subtrahend.length - 1; i++) {
          const current = this.__digit(startIndex + i);
          const sub = subtrahend.__digit(i);
          const r0 = (current & 0xFFFF) - (sub & 0xFFFF) - borrow;
          borrow = (r0 >>> 16) & 1;
          const r16 = (current >>> 16) - (sub >>> 16) - borrow;
          borrow = (r16 >>> 16) & 1;
          this.__setDigit(startIndex + i, (r16 << 16) | (r0 & 0xFFFF));
        }
        const current = this.__digit(startIndex + i);
        const sub = subtrahend.__digit(i);
        const r0 = (current & 0xFFFF) - (sub & 0xFFFF) - borrow;
        borrow = (r0 >>> 16) & 1;
        let r16 = 0;
        if ((halfDigits & 1) === 0) {
          r16 = (current >>> 16) - (sub >>> 16) - borrow;
          borrow = (r16 >>> 16) & 1;
        }
        this.__setDigit(startIndex + i, (r16 << 16) | (r0 & 0xFFFF));
      }
      return borrow;
    }

    __inplaceRightShift(shift) {
      if (shift === 0) return;
      let carry = this.__digit(0) >>> shift;
      const last = this.length - 1;
      for (let i = 0; i < last; i++) {
        const d = this.__digit(i + 1);
        this.__setDigit(i, (d << (32 - shift)) | carry);
        carry = d >>> shift;
      }
      this.__setDigit(last, carry);
    }

    static __specialLeftShift(x, shift, addDigit) {
      const n = x.length;
      const resultLength = n + addDigit;
      const result = new JSBI(resultLength, false);
      if (shift === 0) {
        for (let i = 0; i < n; i++) result.__setDigit(i, x.__digit(i));
        if (addDigit > 0) result.__setDigit(n, 0);
        return result;
      }
      let carry = 0;
      for (let i = 0; i < n; i++) {
        const d = x.__digit(i);
        result.__setDigit(i, (d << shift) | carry);
        carry = d >>> (32 - shift);
      }
      if (addDigit > 0) {
        result.__setDigit(n, carry);
      }
      return result;
    }

    static __leftShiftByAbsolute(x, y) {
      const shift = JSBI.__toShiftAmount(y);
      if (shift < 0) throw new RangeError('BigInt too big');
      const digitShift = shift >>> 5;
      const bitsShift = shift & 31;
      const length = x.length;
      const grow = bitsShift !== 0 &&
        (x.__digit(length - 1) >>> (32 - bitsShift)) !== 0;
      const resultLength = length + digitShift + (grow ? 1 : 0);
      const result = new JSBI(resultLength, x.sign);
      if (bitsShift === 0) {
        let i = 0;
        for (; i < digitShift; i++) result.__setDigit(i, 0);
        for (; i < resultLength; i++) {
          result.__setDigit(i, x.__digit(i - digitShift));
        }
      } else {
        let carry = 0;
        for (let i = 0; i < digitShift; i++) result.__setDigit(i, 0);
        for (let i = 0; i < length; i++) {
          const d = x.__digit(i);
          result.__setDigit(i + digitShift, (d << bitsShift) | carry);
          carry = d >>> (32 - bitsShift);
        }
        if (grow) {
          result.__setDigit(length + digitShift, carry);
        } else {
          if (carry !== 0) throw new Error('implementation bug');
        }
      }
      return result.__trim();
    }

    static __rightShiftByAbsolute(x, y) {
      const length = x.length;
      const sign = x.sign;
      const shift = JSBI.__toShiftAmount(y);
      if (shift < 0) return JSBI.__rightShiftByMaximum(sign);
      const digitShift = shift >>> 5;
      const bitsShift = shift & 31;
      let resultLength = length - digitShift;
      if (resultLength <= 0) return JSBI.__rightShiftByMaximum(sign);
      // For negative numbers, round down if any bit was shifted out (so that
      // e.g. -5n >> 1n == -3n and not -2n). Check now whether this will happen
      // and whether itc an cause overflow into a new digit. If we allocate the
      // result large enough up front, it avoids having to do grow it later.
      let mustRoundDown = false;
      if (sign) {
        const mask = (1 << bitsShift) - 1;
        if ((x.__digit(digitShift) & mask) !== 0) {
          mustRoundDown = true;
        } else {
          for (let i = 0; i < digitShift; i++) {
            if (x.__digit(i) !== 0) {
              mustRoundDown = true;
              break;
            }
          }
        }
      }
      // If bitsShift is non-zero, it frees up bits, preventing overflow.
      if (mustRoundDown && bitsShift === 0) {
        // Overflow cannot happen if the most significant digit has unset bits.
        const msd = x.__digit(length - 1);
        const roundingCanOverflow = ~msd === 0;
        if (roundingCanOverflow) resultLength++;
      }
      let result = new JSBI(resultLength, sign);
      if (bitsShift === 0) {
        for (let i = digitShift; i < length; i++) {
          result.__setDigit(i - digitShift, x.__digit(i));
        }
      } else {
        let carry = x.__digit(digitShift) >>> bitsShift;
        const last = length - digitShift - 1;
        for (let i = 0; i < last; i++) {
          const d = x.__digit(i + digitShift + 1);
          result.__setDigit(i, (d << (32 - bitsShift)) | carry);
          carry = d >>> bitsShift;
        }
        result.__setDigit(last, carry);
      }
      if (mustRoundDown) {
        // Since the result is negative, rounding down means adding one to its
        // absolute value. This cannot overflow.
        result = JSBI.__absoluteAddOne(result, true, result);
      }
      return result.__trim();
    }

    static __rightShiftByMaximum(sign) {
      if (sign) {
        return JSBI.__oneDigit(1, true);
      }
      return JSBI.__zero();
    }

    static __toShiftAmount(x) {
      if (x.length > 1) return -1;
      const value = x.__unsignedDigit(0);
      if (value > JSBI.__kMaxLengthBits) return -1;
      return value;
    }

    static __toPrimitive(obj, hint='default') {
      if (typeof obj !== 'object') return obj;
      if (obj.constructor === JSBI) return obj;
      const exoticToPrim = obj[Symbol.toPrimitive];
      if (exoticToPrim) {
        const primitive = exoticToPrim(hint);
        if (typeof primitive !== 'object') return primitive;
        throw new TypeError('Cannot convert object to primitive value');
      }
      const valueOf = obj.valueOf;
      if (valueOf) {
        const primitive = valueOf.call(obj);
        if (typeof primitive !== 'object') return primitive;
      }
      const toString = obj.toString;
      if (toString) {
        const primitive = toString.call(obj);
        if (typeof primitive !== 'object') return primitive;
      }
      throw new TypeError('Cannot convert object to primitive value');
    }

    static __toNumeric(value) {
      if (JSBI.__isBigInt(value)) return value;
      return +value;
    }

    static __isBigInt(value) {
      return typeof value === 'object' && value.constructor === JSBI;
    }

    static __truncateToNBits(n, x) {
      const neededDigits = (n + 31) >>> 5;
      const result = new JSBI(neededDigits, x.sign);
      const last = neededDigits - 1;
      for (let i = 0; i < last; i++) {
        result.__setDigit(i, x.__digit(i));
      }
      let msd = x.__digit(last);
      if ((n & 31) !== 0) {
        const drop = 32 - (n & 31);
        msd = (msd << drop) >>> drop;
      }
      result.__setDigit(last, msd);
      return result.__trim();
    }

    static __truncateAndSubFromPowerOfTwo(n, x, resultSign) {
      const neededDigits = (n + 31) >>> 5;
      const result = new JSBI(neededDigits, resultSign);
      let i = 0;
      const last = neededDigits - 1;
      let borrow = 0;
      const limit = Math.min(last, x.length);
      for (; i < limit; i++) {
        const xDigit = x.__digit(i);
        const rLow = 0 - (xDigit & 0xFFFF) - borrow;
        borrow = (rLow >>> 16) & 1;
        const rHigh = 0 - (xDigit >>> 16) - borrow;
        borrow = (rHigh >>> 16) & 1;
        result.__setDigit(i, (rLow & 0xFFFF) | (rHigh << 16));
      }
      for (; i < last; i++) {
        result.__setDigit(i, (-borrow) | 0);
      }
      let msd = last < x.length ? x.__digit(last) : 0;
      const msdBitsConsumed = n & 31;
      let resultMsd;
      if (msdBitsConsumed === 0) {
        const rLow = 0 - (msd & 0xFFFF) - borrow;
        borrow = (rLow >>> 16) & 1;
        const rHigh = 0 - (msd >>> 16) - borrow;
        resultMsd = (rLow & 0xFFFF) | (rHigh << 16);
      } else {
        const drop = 32 - msdBitsConsumed;
        msd = (msd << drop) >>> drop;
        const minuendMsd = 1 << (32 - drop);
        const rLow = (minuendMsd & 0xFFFF) - (msd & 0xFFFF) - borrow;
        borrow = (rLow >>> 16) & 1;
        const rHigh = (minuendMsd >>> 16) - (msd >>> 16) - borrow;
        resultMsd = (rLow & 0xFFFF) | (rHigh << 16);
        resultMsd &= (minuendMsd - 1);
      }
      result.__setDigit(last, resultMsd);
      return result.__trim();
    }

    // Digit helpers.
    __digit(i) {
      return this[i];
    }
    __unsignedDigit(i) {
      return this[i] >>> 0;
    }
    __setDigit(i, digit) {
      this[i] = digit | 0;
    }
    __setDigitGrow(i, digit) {
      this[i] = digit | 0;
    }
    __halfDigitLength() {
      const len = this.length;
      if (this.__unsignedDigit(len - 1) <= 0xFFFF) return len * 2 - 1;
      return len*2;
    }
    __halfDigit(i) {
      return (this[i >>> 1] >>> ((i & 1) << 4)) & 0xFFFF;
    }
    __setHalfDigit(i, value) {
      const digitIndex = i >>> 1;
      const previous = this.__digit(digitIndex);
      const updated = (i & 1) ? (previous & 0xFFFF) | (value << 16)
        : (previous & 0xFFFF0000) | (value & 0xFFFF);
      this.__setDigit(digitIndex, updated);
    }

    static __digitPow(base, exponent) {
      let result = 1;
      while (exponent > 0) {
        if (exponent & 1) result *= base;
        exponent >>>= 1;
        base *= base;
      }
      return result;
    }

    static floatDivide(x, y) {

    }
  }

  JSBI.__kMaxLength = 1 << 25;
  JSBI.__kMaxLengthBits = JSBI.__kMaxLength << 5;
  // Lookup table for the maximum number of bits required per character of a
  // base-N string representation of a number. To increase accuracy, the array
  // value is the actual value multiplied by 32. To generate this table:
  //
  // for (let i = 0; i <= 36; i++) {
  //   console.log(Math.ceil(Math.log2(i) * 32) + ',');
  // }
  JSBI.__kMaxBitsPerChar = [
    0, 0, 32, 51, 64, 75, 83, 90, 96, // 0..8
    102, 107, 111, 115, 119, 122, 126, 128, // 9..16
    131, 134, 136, 139, 141, 143, 145, 147, // 17..24
    149, 151, 153, 154, 156, 158, 159, 160, // 25..32
    162, 163, 165, 166, // 33..36
  ];
  JSBI.__kBitsPerCharTableShift = 5;
  JSBI.__kBitsPerCharTableMultiplier = 1 << JSBI.__kBitsPerCharTableShift;
  JSBI.__kConversionChars = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
  JSBI.__kBitConversionBuffer = new ArrayBuffer(8);
  JSBI.__kBitConversionDouble = new Float64Array(JSBI.__kBitConversionBuffer);
  JSBI.__kBitConversionInts = new Int32Array(JSBI.__kBitConversionBuffer);

  function readDataset(file) {
    return fetch(file)
  }

  function testFunctionAccuracy(func, dataset) {
    return readDataset(dataset).then(output => output.json()).then(json => {
      let xL = json.x;
      let yL = json.y;

      let rms = 0;
      let samples = xL.length;
      let maxErr = -Infinity;
      let maxErrPos = 0;

      if (xL.length !== yL.length)
        throw new Error("Arrays are not of the same length")

      for (let i = 0; i < samples; ++i) {
        let x = xL[i];
        let y = yL[i];

        let calculatedY = func(x);

        let error = y - calculatedY;

        let errorRMS = (error) ** 2;

        rms += errorRMS;

        if (Math.abs(error) > maxErr) {
          maxErr = Math.abs(error);
          maxErrPos = x;
        }
      }

      rms /= samples;

      return {rms: rms, maxError: maxErr, maxErrorX: maxErrPos, samples}
    })
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
  exports.ComplexInterval = ComplexInterval;
  exports.ComplexIntervalFunctions = ComplexIntervalFunctions;
  exports.ConstantNode = ConstantNode;
  exports.ConwaysGameOfLifeElement = ConwaysGameOfLifeElement;
  exports.DIGAMMA_ZEROES = DIGAMMA_ZEROES;
  exports.Dataset2D = Dataset2D;
  exports.DefaultUniverse = DefaultUniverse;
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
  exports.IntervalTypecasts = IntervalTypecasts;
  exports.JSBI = JSBI;
  exports.KFunction = KFunction;
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
  exports.RealInterval = RealInterval;
  exports.RealIntervalFunctions = RealIntervalFunctions;
  exports.RealIntervalSet = RealIntervalSet;
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
  exports.adaptively_sample_parametric_1d = adaptively_sample_parametric_1d;
  exports.addMod = addMod;
  exports.agm = agm;
  exports.anglesBetween = anglesBetween;
  exports.asyncCalculatePolylineVertices = asyncCalculatePolylineVertices;
  exports.barnesG = barnesG;
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
  exports.ellipsePerimeter = ellipsePerimeter;
  exports.ellipticE = ellipticEModulus;
  exports.ellipticEParameter = ellipticE;
  exports.ellipticK = ellipticKModulus;
  exports.ellipticKParameter = ellipticK;
  exports.ellipticPi = ellipticPi;
  exports.eratosthenes = eratosthenes;
  exports.eratosthenesWithPi = eratosthenesWithPi;
  exports.erf = erf;
  exports.erfc = erfc;
  exports.eta = eta;
  exports.eulerPhi = eulerPhi;
  exports.expMod = expMod;
  exports.factor = factor;
  exports.factorial = factorial;
  exports.fastHypot = fastHypot;
  exports.find_roots = find_roots;
  exports.gamma = gamma;
  exports.getDashedPolyline = getDashedPolyline;
  exports.getEiCoeff = getEiCoeff;
  exports.getFunction = getFunction;
  exports.getIntervals = getIntervals;
  exports.getLineIntersection = getLineIntersection;
  exports.getPolygammaNumeratorPolynomial = getPolygammaNumeratorPolynomial;
  exports.getVariable = getVariable;
  exports.get_continued_fraction = get_continued_fraction;
  exports.get_rational = get_rational;
  exports.hurwitzZeta = hurwitzZeta;
  exports.hypergeometric = hypergeometric;
  exports.integrateLnGamma = integrateLnGamma;
  exports.interpolate = interpolate;
  exports.intersectBoundingBoxes = intersectBoundingBoxes;
  exports.inverseErf = inverseErf;
  exports.inverseErfc = inverseErfc;
  exports.isPerfectSquare = isPerfectSquare;
  exports.isPrime = isPrime;
  exports.li = li;
  exports.lineSegmentIntersect = lineSegmentIntersect;
  exports.lineSegmentIntersectsBox = lineSegmentIntersectsBox;
  exports.lnBarnesG = lnBarnesG;
  exports.lnKFunction = lnKFunction;
  exports.ln_gamma = ln_gamma;
  exports.lowerIncompleteGamma = lowerIncompleteGamma;
  exports.mulMod = mulMod;
  exports.nextPowerOfTwo = nextPowerOfTwo;
  exports.parseString = parseString;
  exports.pochhammer = pochhammer;
  exports.pointLineSegmentClosest = pointLineSegmentClosest;
  exports.pointLineSegmentMinDistance = pointLineSegmentMinDistance;
  exports.polygamma = polygamma;
  exports.primeCountingFunction = meisselLehmerExtended;
  exports.regularPolygonGlyph = regularPolygonGlyph;
  exports.rgb = rgb;
  exports.rgba = rgba;
  exports.sample_1d = sample_1d;
  exports.sample_parametric_1d = sample_parametric_1d;
  exports.squareMod = squareMod;
  exports.testFunctionAccuracy = testFunctionAccuracy;
  exports.toggleCorrectRounding = toggleCorrectRounding;
  exports.tokenizer = tokenizer;
  exports.trigamma = trigamma;
  exports.undefineFunction = undefineFunction;
  exports.undefineVariable = undefineVariable;
  exports.upperIncompleteGamma = upperIncompleteGamma;
  exports.utils = utils;
  exports.wrapIntervalSetFunction = wrapIntervalSetFunction;
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
