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

  function addStyle(styleString) {
    const style = document.createElement('style');
    style.textContent = styleString;

    window.addEventListener("load", () => document.head.append(style));
  }

  const graphemeCSS = `
.grapheme-canvas {
  z-index: 0;
  position: absolute;
  top: 0;
  left: 0;
  margin: 0;
  touch-action: none;
  -ms-touch-action: none;
  overflow: hidden;
}

.grapheme-label {
  position: absolute;
}

.grapheme-label-N {
  transform: translate(-50%, -100%);
}

.grapheme-label-NW {
  transform: translate(-100%, -100%);
}

.grapheme-label-NE {
  transform: translate(0, -100%);
}

.grapheme-label-C {
  transform: translate(-50%, -50%);
}

.grapheme-label-W {
  transform: translate(-100%, -50%);
}

.grapheme-label-SW {
  transform: translate(-100%, 0);
}

.grapheme-label-SE {

}

.grapheme-label-S {
  transform: translate(-50%, 0);
}

.grapheme-label-E {
  transform: translate(0, -50%);
}
`;

  // Import the Grapheme CSS file for canvas styling
  function importGraphemeCSS () {
    addStyle(graphemeCSS);
  }

  function importKatexCSS() {
    window.addEventListener("load", () => {
      let style = document.createElement("link");
      style.setAttribute("rel", "stylesheet");
      style.setAttribute("href", "https://cdn.jsdelivr.net/npm/katex@0.12.0/dist/katex.min.css");

      document.head.appendChild(style);
    });
  }

  if (!isWorker) {
    importGraphemeCSS();
    importKatexCSS();
  }

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

        this.triggerPlotCoordsChanged();
      }
    }

    // If we are zoomed in too far, this function will zoom in/out until the
    preventExcessiveZoom() {

    }

    getAspect() {
      // ratio between y axis and x axis

      return this.box.height / this.box.width * this.coords.width / this.coords.height
    }

    triggerPlotCoordsChanged() {
      if (this.plot)
        this.plot.triggerEvent("plotcoordschanged");
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
      this.triggerPlotCoordsChanged();
    }

    translate(v, ...args) {
      if (v instanceof Vec2) {
        this.coords.top_left.add(v);

        this.triggerPlotCoordsChanged();
      } else {
        this.translate(new Vec2(v, ...args));
      }
    }

    zoomOn(factor, v = new Vec2(this.coords.cx, this.coords.cy), ...args) {
      if (this.allowScrolling) {
        let pixel_s = this.plotToPixel(v);

        this.coords.width *= factor;
        this.coords.height *= factor;

        this._internalCoincideDragPoints(v, pixel_s);
      }
    }

    _internalCoincideDragPoints(p1, p2) {
      this.translate(this.pixelToPlot(p2).subtract(p1).scale(-1));
    }

    _coincideDragPoints(p1, p2) {
      if (this.allowDragging) {
        this._internalCoincideDragPoints(p1, p2);
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
        if (this.enableDrag) { // Move the location of the event to the original mouse down position
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
     * Set the padding on all sides to p.
     * @param p {number} The desired padding.
     */
    setPadding(p) {
      this.padding.top = this.padding.right = this.padding.left = this.padding.bottom = p;

      this.calculateTransform();
      this.transform.triggerPlotCoordsChanged();
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

    toJSON () {
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
        r: this.r / 255,
        g: this.g / 255,
        b: this.b / 255,
        a: this.a / 255
      }
    }

    toNumber () {
      return this.r * 0x1000000 + this.g * 0x10000 + this.b * 0x100 + this.a
    }

    clone () {
      return new Color(this)
    }

    static rgb (r, g, b) {
      return new Color({
        r,
        g,
        b
      })
    }

    static rgba (r, g, b, a = 255) {
      return new Color({
        r,
        g,
        b,
        a
      })
    }

    static hsl (h, s, l) {
      return new Color(hslToRgb(h, s, l))
    }

    static hsla (h, s, l, a) {
      let color = Color.hsl(h, s, l);
      color.a = 255 * a;

      return color
    }

    static fromHex (string) {
      return new Color(hexToRgb(string))
    }

    static fromCss (cssColorString) {
      function throwBadColor () {
        throw new Error("Unrecognized colour " + cssColorString)
      }

      cssColorString = cssColorString.toLowerCase().replace(/\s+/g, '');
      if (cssColorString.startsWith('#')) {
        return Color.fromHex(cssColorString)
      }

      let argsMatch = /\((.+)\)/g.exec(cssColorString);

      if (!argsMatch) {
        let color = Colors[cssColorString.toUpperCase()];

        return color ? color : throwBadColor()
      }

      let args = argsMatch[1].split(',').map(parseFloat);

      if (cssColorString.startsWith("rgb")) {
        return Color.rgb(...args.map(s => s * 255))
      } else if (cssColorString.startsWith("rgba")) {
        return Color.rgba(...args.map(s => s * 255))
      } else if (cssColorString.startsWith("hsl")) {
        return Color.hsl(...args)
      } else if (cssColorString.startsWith("hsla")) {
        return Color.hsla(...args)
      }

      throwBadColor();
    }
  }

  // Credit to https://stackoverflow.com/a/11508164/13458117
  function hexToRgb(hex) {
    let bigint = parseInt(hex.replace('#', ''), 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;

    return {r, g, b}
  }

  function hue2rgb (p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  // Credit to https://stackoverflow.com/a/9493060/13458117
  function hslToRgb (h, s, l) {
    var r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return { r: 255 * r, g: 255 * g, b: 255 * b }
  }

  const rgb = Color.rgb;

  // all colors represented as object {r: x, g: x, b: x, a: x}. 0 <= r,g,b,a <= 255,
  // not necessarily integers
  const Colors = {
    get LIGHTSALMON () {
      return rgb(255, 160, 122)
    },
    get SALMON () {
      return rgb(250, 128, 114)
    },
    get DARKSALMON () {
      return rgb(233, 150, 122)
    },
    get LIGHTCORAL () {
      return rgb(240, 128, 128)
    },
    get INDIANRED () {
      return rgb(205, 92, 92)
    },
    get CRIMSON () {
      return rgb(220, 20, 60)
    },
    get FIREBRICK () {
      return rgb(178, 34, 34)
    },
    get RED () {
      return rgb(255, 0, 0)
    },
    get DARKRED () {
      return rgb(139, 0, 0)
    },
    get CORAL () {
      return rgb(255, 127, 80)
    },
    get TOMATO () {
      return rgb(255, 99, 71)
    },
    get ORANGERED () {
      return rgb(255, 69, 0)
    },
    get GOLD () {
      return rgb(255, 215, 0)
    },
    get ORANGE () {
      return rgb(255, 165, 0)
    },
    get DARKORANGE () {
      return rgb(255, 140, 0)
    },
    get LIGHTYELLOW () {
      return rgb(255, 255, 224)
    },
    get LEMONCHIFFON () {
      return rgb(255, 250, 205)
    },
    get LIGHTGOLDENRODYELLOW () {
      return rgb(250, 250, 210)
    },
    get PAPAYAWHIP () {
      return rgb(255, 239, 213)
    },
    get MOCCASIN () {
      return rgb(255, 228, 181)
    },
    get PEACHPUFF () {
      return rgb(255, 218, 185)
    },
    get PALEGOLDENROD () {
      return rgb(238, 232, 170)
    },
    get KHAKI () {
      return rgb(240, 230, 140)
    },
    get DARKKHAKI () {
      return rgb(189, 183, 107)
    },
    get YELLOW () {
      return rgb(255, 255, 0)
    },
    get LAWNGREEN () {
      return rgb(124, 252, 0)
    },
    get CHARTREUSE () {
      return rgb(127, 255, 0)
    },
    get LIMEGREEN () {
      return rgb(50, 205, 50)
    },
    get LIME () {
      return rgb(0, 255, 0)
    },
    get FORESTGREEN () {
      return rgb(34, 139, 34)
    },
    get GREEN () {
      return rgb(0, 128, 0)
    },
    get DARKGREEN () {
      return rgb(0, 100, 0)
    },
    get GREENYELLOW () {
      return rgb(173, 255, 47)
    },
    get YELLOWGREEN () {
      return rgb(154, 205, 50)
    },
    get SPRINGGREEN () {
      return rgb(0, 255, 127)
    },
    get MEDIUMSPRINGGREEN () {
      return rgb(0, 250, 154)
    },
    get LIGHTGREEN () {
      return rgb(144, 238, 144)
    },
    get PALEGREEN () {
      return rgb(152, 251, 152)
    },
    get DARKSEAGREEN () {
      return rgb(143, 188, 143)
    },
    get MEDIUMSEAGREEN () {
      return rgb(60, 179, 113)
    },
    get SEAGREEN () {
      return rgb(46, 139, 87)
    },
    get OLIVE () {
      return rgb(128, 128, 0)
    },
    get DARKOLIVEGREEN () {
      return rgb(85, 107, 47)
    },
    get OLIVEDRAB () {
      return rgb(107, 142, 35)
    },
    get LIGHTCYAN () {
      return rgb(224, 255, 255)
    },
    get CYAN () {
      return rgb(0, 255, 255)
    },
    get AQUA () {
      return rgb(0, 255, 255)
    },
    get AQUAMARINE () {
      return rgb(127, 255, 212)
    },
    get MEDIUMAQUAMARINE () {
      return rgb(102, 205, 170)
    },
    get PALETURQUOISE () {
      return rgb(175, 238, 238)
    },
    get TURQUOISE () {
      return rgb(64, 224, 208)
    },
    get MEDIUMTURQUOISE () {
      return rgb(72, 209, 204)
    },
    get DARKTURQUOISE () {
      return rgb(0, 206, 209)
    },
    get LIGHTSEAGREEN () {
      return rgb(32, 178, 170)
    },
    get CADETBLUE () {
      return rgb(95, 158, 160)
    },
    get DARKCYAN () {
      return rgb(0, 139, 139)
    },
    get TEAL () {
      return rgb(0, 128, 128)
    },
    get POWDERBLUE () {
      return rgb(176, 224, 230)
    },
    get LIGHTBLUE () {
      return rgb(173, 216, 230)
    },
    get LIGHTSKYBLUE () {
      return rgb(135, 206, 250)
    },
    get SKYBLUE () {
      return rgb(135, 206, 235)
    },
    get DEEPSKYBLUE () {
      return rgb(0, 191, 255)
    },
    get LIGHTSTEELBLUE () {
      return rgb(176, 196, 222)
    },
    get DODGERBLUE () {
      return rgb(30, 144, 255)
    },
    get CORNFLOWERBLUE () {
      return rgb(100, 149, 237)
    },
    get STEELBLUE () {
      return rgb(70, 130, 180)
    },
    get ROYALBLUE () {
      return rgb(65, 105, 225)
    },
    get BLUE () {
      return rgb(0, 0, 255)
    },
    get MEDIUMBLUE () {
      return rgb(0, 0, 205)
    },
    get DARKBLUE () {
      return rgb(0, 0, 139)
    },
    get NAVY () {
      return rgb(0, 0, 128)
    },
    get MIDNIGHTBLUE () {
      return rgb(25, 25, 112)
    },
    get MEDIUMSLATEBLUE () {
      return rgb(123, 104, 238)
    },
    get SLATEBLUE () {
      return rgb(106, 90, 205)
    },
    get DARKSLATEBLUE () {
      return rgb(72, 61, 139)
    },
    get LAVENDER () {
      return rgb(230, 230, 250)
    },
    get THISTLE () {
      return rgb(216, 191, 216)
    },
    get PLUM () {
      return rgb(221, 160, 221)
    },
    get VIOLET () {
      return rgb(238, 130, 238)
    },
    get ORCHID () {
      return rgb(218, 112, 214)
    },
    get FUCHSIA () {
      return rgb(255, 0, 255)
    },
    get MAGENTA () {
      return rgb(255, 0, 255)
    },
    get MEDIUMORCHID () {
      return rgb(186, 85, 211)
    },
    get MEDIUMPURPLE () {
      return rgb(147, 112, 219)
    },
    get BLUEVIOLET () {
      return rgb(138, 43, 226)
    },
    get DARKVIOLET () {
      return rgb(148, 0, 211)
    },
    get DARKORCHID () {
      return rgb(153, 50, 204)
    },
    get DARKMAGENTA () {
      return rgb(139, 0, 139)
    },
    get PURPLE () {
      return rgb(128, 0, 128)
    },
    get INDIGO () {
      return rgb(75, 0, 130)
    },
    get PINK () {
      return rgb(255, 192, 203)
    },
    get LIGHTPINK () {
      return rgb(255, 182, 193)
    },
    get HOTPINK () {
      return rgb(255, 105, 180)
    },
    get DEEPPINK () {
      return rgb(255, 20, 147)
    },
    get PALEVIOLETRED () {
      return rgb(219, 112, 147)
    },
    get MEDIUMVIOLETRED () {
      return rgb(199, 21, 133)
    },
    get WHITE () {
      return rgb(255, 255, 255)
    },
    get SNOW () {
      return rgb(255, 250, 250)
    },
    get HONEYDEW () {
      return rgb(240, 255, 240)
    },
    get MINTCREAM () {
      return rgb(245, 255, 250)
    },
    get AZURE () {
      return rgb(240, 255, 255)
    },
    get ALICEBLUE () {
      return rgb(240, 248, 255)
    },
    get GHOSTWHITE () {
      return rgb(248, 248, 255)
    },
    get WHITESMOKE () {
      return rgb(245, 245, 245)
    },
    get SEASHELL () {
      return rgb(255, 245, 238)
    },
    get BEIGE () {
      return rgb(245, 245, 220)
    },
    get OLDLACE () {
      return rgb(253, 245, 230)
    },
    get FLORALWHITE () {
      return rgb(255, 250, 240)
    },
    get IVORY () {
      return rgb(255, 255, 240)
    },
    get ANTIQUEWHITE () {
      return rgb(250, 235, 215)
    },
    get LINEN () {
      return rgb(250, 240, 230)
    },
    get LAVENDERBLUSH () {
      return rgb(255, 240, 245)
    },
    get MISTYROSE () {
      return rgb(255, 228, 225)
    },
    get GAINSBORO () {
      return rgb(220, 220, 220)
    },
    get LIGHTGRAY () {
      return rgb(211, 211, 211)
    },
    get SILVER () {
      return rgb(192, 192, 192)
    },
    get DARKGRAY () {
      return rgb(169, 169, 169)
    },
    get GRAY () {
      return rgb(128, 128, 128)
    },
    get DIMGRAY () {
      return rgb(105, 105, 105)
    },
    get LIGHTSLATEGRAY () {
      return rgb(119, 136, 153)
    },
    get SLATEGRAY () {
      return rgb(112, 128, 144)
    },
    get DARKSLATEGRAY () {
      return rgb(47, 79, 79)
    },
    get BLACK () {
      return rgb(0, 0, 0)
    },
    get CORNSILK () {
      return rgb(255, 248, 220)
    },
    get BLANCHEDALMOND () {
      return rgb(255, 235, 205)
    },
    get BISQUE () {
      return rgb(255, 228, 196)
    },
    get NAVAJOWHITE () {
      return rgb(255, 222, 173)
    },
    get WHEAT () {
      return rgb(245, 222, 179)
    },
    get BURLYWOOD () {
      return rgb(222, 184, 135)
    },
    get TAN () {
      return rgb(210, 180, 140)
    },
    get ROSYBROWN () {
      return rgb(188, 143, 143)
    },
    get SANDYBROWN () {
      return rgb(244, 164, 96)
    },
    get GOLDENROD () {
      return rgb(218, 165, 32)
    },
    get PERU () {
      return rgb(205, 133, 63)
    },
    get CHOCOLATE () {
      return rgb(210, 105, 30)
    },
    get SADDLEBROWN () {
      return rgb(139, 69, 19)
    },
    get SIENNA () {
      return rgb(160, 82, 45)
    },
    get BROWN () {
      return rgb(165, 42, 42)
    },
    get MAROON () {
      return rgb(128, 0, 0)
    },
    get RANDOM () {
      var keys = Object.keys(Colors);
      return Colors[keys[keys.length * Math.random() << 0]]
    }
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

  function besselJ0 (z) {
    if (z < 0) {
      return besselJ0(-z)
    }

    if (z < 6) {
      let sum = 0;

      for (let m = 0; m <= 10; ++m) {
        let component = (-1) ** m / (factorial(m) ** 2) * (z / 2) ** (2 * m);

        sum += component;
      }

      return sum
    }

    return Math.sqrt(2 / (Math.PI * z)) * (1 - 1 / (16 * z * z) + 53 / (512 * z ** 4)) * Math.cos(z - Math.PI / 4 - 1 / (8 * z) + 25 / (384 * z ** 3))
  }

  function besselJ1 (z) {
    if (z < 0) {
      return -besselJ1(-z)
    }

    if (z < 6) {
      let sum = 0;

      for (let m = 0; m <= 10; ++m) {
        let component = (-1) ** m / (factorial(m) * factorial(m + 1)) * (z / 2) ** (2 * m + 1);

        sum += component;
      }

      return sum
    }

    return Math.sqrt(2 / (Math.PI * z)) * (1 + 3 / (16 * z * z) - 99 / (512 * z ** 4)) * Math.cos(z - 3 * Math.PI / 4 + 3 / (8 * z) - 21 / (128 * z ** 3))
  }

  function besselJNonInteger(n, z) {
    if (n === 0.5) {
      return Math.sin(z) / Math.sqrt(2 * Math.PI)
    }
  }

  // Huge credit to http://www.mhtl.uwaterloo.ca/old/courses/me3532/js/bessel.html, where most of this code comes from
  function besselJ (n, z) {
    if (n === 0) {
      return besselJ0(z)
    }

    if (n === 1) {
      return besselJ1(z)
    }

    if (n < 0) {
      return (n % 2 === 0 ? 1 : -1) * besselJ(-n, z)
    }

    if (z < 0) {
      if (Number.isInteger(n)) {
        if (n % 2 === 0) {
          return besselJ(n, -z)
        } else {
          return -besselJ(n, -z)
        }
      } else {
        return NaN
      }
    }

    if (z < 6) {
      let sum = 0;

      for (let m = 0; m <= 10; ++m) {
        let component = (-1) ** m / (factorial(m) * factorial(m + n)) * (z / 2) ** (2 * m + n);

        sum += component;
      }

      return sum
    }

    if (!Number.isInteger(n)) {
      return besselJNonInteger(n, z)
    }

    let ACC = 40.0;		// Make larger to increase accuracy.
    let BIGNO = 1.0e10;
    let BIGNI = 1.0e-10;
    let j, jsum, m, az, bj, bjm, bjp, sum, tox, ans;
    az = Math.abs(z);

    if (az === 0.0) {
      return 0.0
    } else if (az > n) {
      tox = 2.0 / az;
      bjm = besselJ0(az);
      bj = besselJ1(az);

      for (j = 1; j < n; j++) {
        bjp = j * tox * bj - bjm;
        bjm = bj;
        bj = bjp;
      }

      ans = bj;
    } else {
      tox = 2.0 / az;
      if (Math.sqrt(ACC * n) >= 0) {
        m = 2 * ((n + Math.floor(Math.sqrt(ACC * n))) / 2);
      } else {
        m = 2 * ((n + Math.ceil(Math.sqrt(ACC * n))) / 2);
      }

      jsum = 0;
      bjp = ans = sum = 0.0;
      bj = 1.0;

      for (j = m; j > 0; j--) {
        bjm = j * tox * bj - bjp;
        bjp = bj;
        bj = bjm;
        if (Math.abs(bj) > BIGNO) {
          // Keep the numbers in an acceptable float range
          bj *= BIGNI;
          bjp *= BIGNI;
          ans *= BIGNI;
          sum *= BIGNI;
        }

        if (jsum) sum += bj;
        jsum = !jsum;

        if (j === n) ans = bjp;
      }

      sum = 2.0 * sum - bj;
      ans /= sum;
    }

    return z < 0.0 && (n % 2 === 0) ? -ans : ans
  }

  function besselY0 (x) {
    let z, xx, y, ans, ans1, ans2;
    if (x < 8.0) {
      y = x * x;
      ans1 = -2957821389.0 + y * (7062834065.0 + y * (-512359803.6 + y * (10879881.29 + y * (-86327.92757 + y * 228.4622733))));
      ans2 = 40076544269.0 + y * (745249964.8 + y * (7189466.438 + y * (47447.26470 + y * (226.1030244 + y))));
      ans = (ans1 / ans2) + 0.636619772 * besselJ0(x) * Math.log(x);
    } else {
      z = 8.0/ x;
      y = z * z;
      xx = x - 0.785398164;
      ans1 = 1.0 + y * (-0.1098628627e-2 + y * (0.2734510407e-4 + y * (-0.2073370639e-5 + y * 0.2093887211e-6)));
      ans2 = -0.1562499995e-1 + y * (0.1430488765e-3 + y * (-0.6911147651e-5 + y * (0.7621095161e-6 + y * (-0.934945152e-7))));
      ans = Math.sqrt(0.636619772 / x) * (Math.sin(xx) * ans1 + z * Math.cos(xx) * ans2);
    }
    return ans
  }

  function besselY1 (x) {
    let z, xx, y, ans, ans1, ans2;
    if (x < 8.0) {
      y = x * x;
      ans1 = x * (-0.4900604943e13 + y * (0.1275274390e13 + y * (-0.5153438139e11 + y * (0.7349264551e9 + y * (-0.4237922726e7 + y * 0.8511937935e4)))));
      ans2 = 0.2499580570e14 + y * (0.4244419664e12 + y * (0.3733650367e10 + y * (0.2245904002e8 + y * (0.1020426050e6 + y * (0.3549632885e3 + y)))));
      ans = (ans1 / ans2) + 0.636619772 * (besselJ1(x) * Math.log(x) - 1.0 / x);
    } else {
      z = 8.0 / x;
      y = z * z;
      xx = x - 2.356194491;
      ans1 = 1.0 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * (-0.240337019e-6))));
      ans2 = 0.04687499995 + y * (-0.202690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.10578e-6)));
      ans = Math.sqrt(0.636619772 / x) * (Math.sin(xx) * ans1 + z * Math.cos(xx) * ans2);
    }
    return ans
  }

  function besselY (n, z) {
    if (n === 0) {
      return besselY0(z)
    } else if (n === 1) {
      return besselY1(z)
    }

    let j, by, bym, byp, tox;

    tox = 2.0 / z;
    by = besselY1(z);
    bym = besselY0(z);

    for (j = 1; j < n; j++) {
      byp = j * tox * by - bym;
      bym = by;
      by = byp;
    }

    return by
  }

  function sphericalBesselJ(n, x) {
    return Math.sqrt(Math.PI / (2 * x)) * besselJ(n + 0.5, x)
  }

  function sphericalBesselY(n, x) {
    return Math.sqrt(Math.PI / (2 * x)) * besselY(n + 0.5, x)
  }

  function polylogarithm(s, z) {
    if (s === 0) {
      return z / (1 - z)
    } else if (s === 1) {
      return - Math.log(1 - z)
    } else if (s === -1) {
      let cow = 1 - z;
      return z / (cow * cow)
    }

    if (z === 1) {
      return zeta(s)
    } else if (z === -1) {
      return -eta(s)
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
    BesselJ: besselJ,
    BesselY: besselY,
    BesselJ0: (z) => besselJ(0, z),
    BesselJ1: (z) => besselJ(1, z),
    BesselY0: (z) => besselY(0, z),
    BesselY1: (z) => besselY(1, z),
    SphericalBesselJ: sphericalBesselJ,
    SphericalBesselY: sphericalBesselY,
    Polylogarithm: polylogarithm,
    EulerPhi: eulerPhi
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

  const Typecasts = {
    RealToComplex: (r) => new Complex$1(r),
    RealArrayToComplexArray: (arr) => arr.map(elem => new Complex$1(elem)),
    RealIntervalToComplexInterval: (int) => new ComplexInterval(int.min, int.max, 0, 0),
    Identity: (r) => r
  };

  // List of operators (currently)
  // +, -, *, /, ^,

  const comparisonOperators = ['<', '>', '<=', '>=', '!=', '=='];

  function compileFunction(compileText, exportedVariables) {
    const GraphemeSubset = {
      ComplexIntervalFunctions,
      ComplexFunctions,
      RealIntervalFunctions,
      RealFunctions,
      Typecasts,
      RealInterval,
      RealIntervalSet,
      ComplexInterval,
      Vec2,
      Functions,
      Variables
    };
    
    return new Function("Grapheme", "return (" + exportedVariables.join(',') + ") => " + compileText)(GraphemeSubset)
  }

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

    getDependencies() {
      let funcs = new Set();
      let vars = new Set();

      this.applyAll((node) => {
        if (node instanceof OperatorNode) {
          funcs.add(node.operator);
        } else if (node instanceof VariableNode) {
          vars.add(node.name);
        }
      });

      funcs = Array.from(funcs).sort();
      vars = Array.from(vars).sort();


      return {funcs, vars}
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

      return compileFunction(compileText, exportedVariables)
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

      return compileFunction(compileText, exportedVariables)
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

    latex (params={}) {
      let latex = this.children.map(child => child.latex()).join('');

      return String.raw`\left(${latex}\right)`
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

      let globalVar = Grapheme.Variables[this.name];

      return globalVar.value
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

    latex(params) {
      return LatexMethods.getVariableLatex(this.name)
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
      const children = this.children;
      let params = this.children.map(child => child.evaluate(scope));
      const definition = this.definition, sig = definition.signature;

      params.forEach((param, i) => {
        if (sig[i] !== children[i].returnType) {
          params[i] = (retrieveEvaluationFunction(getCastingFunction(children[i].returnType, sig[i])))(param);
        }
      });

      return this.definition.evaluateFunc(...params)
    }

    getText () {
      return this.operator
    }

    latex (params) {
      return this.definition.latex(this.children, params)
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
      return this.invisible ? '' : LatexMethods.getConstantLatex(this)
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

  function genInfixLatex(operator) {
    return (nodes, params={}) => {
      return nodes.map(node => node.latex(params)).join(operator)
    }
  }

  function surround(str, leftToken, rightToken) {
    return "\\left\\" + leftToken + " " + str + "\\right\\" + rightToken
  }

  function multiplicationLatex(nodes, params={}) {
    return nodes.map(node => node.latex(params)).join('\\cdot ')
  }

  function additionLatex(nodes, params={}) {
    return nodes.map(node => node.latex(params)).join('+')
  }

  function subtractionLatex(nodes, params={}) {
    return nodes.map(node => node.latex(params)).join('-')
  }

  function divisionLatex(nodes, params={}) {
    return `\\frac{${nodes[0].latex(params)}}{${nodes[1].latex(params)}}`
  }

  function exponentiationLatex(nodes, params={}) {
    return String.raw`${nodes[0].latex(params)}^{${nodes[1].latex(params)}}`
  }

  function genFunctionLatex(functionName) {
    let fName = functionName[0] === '\\' ? functionName : `\\operatorname{${functionName}}`;

    return (nodes, params={}) => {
      if (nodes.length === 1) {
        if (optionalParentheses.includes(functionName) && !needsParentheses(nodes[0])) {
          return String.raw`${fName} ${nodes[0].latex(params)}`
        }
      }

      return String.raw`${fName}\left(${nodes.map(node => node.latex(params)).join(', ')}\right)`
    }
  }

  function genFunctionSubscriptLatex(functionName) {
    let fName = functionName[0] === '\\' ? functionName : `\\operatorname{${functionName}}`;

    return (nodes, params={}) => String.raw`${fName}_{${nodes[0].latex(params)}}\left(${nodes.slice(1).map(node => node.latex(params)).join(', ')}\right)`
  }

  function needsParentheses(node) {
    if (node instanceof VariableNode) {
      return false
    } else return !(node instanceof ConstantNode);
  }

  // Mapping between inequality operators and their respective latex symbols
  const inequalityOperatorSymbols = {
    '<': '<',
    '>': '>',
    '<=': '\\leq',
    '>=': '\\geq',
    '==': '=',
    '!=': '\\neq'
  };

  // Inequality
  function getInequalityOperator(str) {
    let symbol = inequalityOperatorSymbols[str];

    return symbol ? symbol : ''
  }

  // https://www.latex-tutorial.com/symbols/greek-alphabet/
  // Array.from(document.getElementsByTagName("tr")).forEach(egg => { arr.push(...egg.children[2].innerText.split(' ').filter(egg => egg[0] === '\\')) } )

  // Mapping between greek letters and their latex counterparts
  const _builtinGreekLetters = [
    "\\alpha",
    "\\beta",
    "\\gamma",
    "\\Gamma",
    "\\delta",
    "\\Delta",
    "\\epsilon",
    "\\zeta",
    "\\eta",
    "\\theta",
    "\\Theta",
    "\\iota",
    "\\kappa",
    "\\lambda",
    "\\Lambda",
    "\\mu",
    "\\nu",
    "\\omicron",
    "\\pi",
    "\\Pi",
    "\\rho",
    "\\sigma",
    "\\Sigma",
    "\\tau",
    "\\upsilon",
    "\\Upsilon",
    "\\phi",
    "\\Phi",
    "\\chi",
    "\\psi",
    "\\Psi",
    "\\omega",
    "\\Omega"
  ];

  const optionalParentheses = []

  ;["sin", "cos", "tan"].forEach(trig => {
    ["", "arc"].forEach(arc => {
      ["", "h"].forEach(hyper => {
        optionalParentheses.push(arc + trig + hyper);
      });
    });
  });

  const greekLetterSymbols = {};

  for (let letter of _builtinGreekLetters) {
    greekLetterSymbols[letter.replace(/\\/g, '')] = letter;
  }

  function replaceGreekInName(str) {
    for (let letter in greekLetterSymbols) {
      if (greekLetterSymbols.hasOwnProperty(letter)) {
        if (str === letter) {
          return greekLetterSymbols[letter]
        }
      }
    }

    return str
  }

  function getVariableLatex(str) {
    let booleanOp = inequalityOperatorSymbols[str];

    if (booleanOp)
      return booleanOp + ' '

    let components = str.split('_');

    components = components.map(str => {
      str = replaceGreekInName(str);

      if (str[0] !== '\\' && str.length > 1)
        str = String.raw`\text{${str}}`;

      return str
    });

    return components.reduceRight((a, b) => `${b}_{${a}}`)
  }


  function getConstantLatex(obj) {
    let value = obj.value;
    let text = obj.text;

    if (text)
      return text

    return value + ''
  }

  function sqrtLatex(nodes, params={}) {
    return String.raw`\sqrt{${nodes[0].latex(params)}}`
  }

  function cbrtLatex(nodes, params={}) {
    return String.raw`\sqrt[3]{${nodes[0].latex(params)}}`
  }

  function nthRootLatex(nodes, params={}) {
    return String.raw`\sqrt[${nodes[0].latex(params)}]{${nodes[1].latex(params)}}`
  }

  function polygammaLatex(nodes, params={}) {
    return String.raw`\psi^{(${nodes[0].latex(params)})}\\left(${nodes[1].latex(params)}\\right)`
  }

  function piecewiseLatex(nodes, params={}) {
    let pre = `\\begin{cases} `;

    let post;
    if (nodes.length % 2 === 0) {
      post = `0 & \\text{otherwise} \\end{cases}`;
    } else {
      post = ` \\text{otherwise} \\end{cases}`;
    }

    let latex = pre;

    for (let i = 0; i < nodes.length; i += 2) {
      let k = 0;
      for (let j = 0; j <= 1; ++j) {
        let child = nodes[i+j];

        if (!child)
          continue

        latex += child.latex(params);

        if (k === 0) {
          latex += " & ";
        } else {
          latex += " \\\\ ";
        }

        k++;
      }
    }

    latex += post;

    return latex
  }

  function cchainLatex(nodes, params={}) {
    return nodes.map(child => child.latex(params)).join('')
  }

  function floorLatex(nodes, params={}) {
    return surround(nodes[0].latex(params), "lfloor", "rfloor")
  }

  function ceilLatex(nodes, params={}) {
    return surround(nodes[0].latex(params), "lceil", "rceil")
  }

  function fractionalPartLatex(nodes, params={}) {
    return surround(nodes[0].latex(params), "{", "}")
  }

  function absoluteValueLatex(nodes, params={}) {
    return surround(nodes[0].latex(params), "lvert", "rvert")
  }

  const cmpLatex = {};

  Object.entries(inequalityOperatorSymbols).forEach(([key, value]) => {
    cmpLatex[key] = genInfixLatex(value);
  });

  const logicLatex = {
    not: (nodes, params) => {
      return "\\neg " + nodes[0].latex(params)
    },
    or: (nodes, params) => {
      return nodes.map(node => node.latex(params)).join("\\lor ")
    },
    and: (nodes, params) => {
      return nodes.map(node => node.latex(params)).join("\\land ")
    }
  };

  const LatexMethods = {
    multiplicationLatex,
    additionLatex,
    subtractionLatex,
    divisionLatex,
    exponentiationLatex,
    sqrtLatex,
    cbrtLatex,
    nthRootLatex,
    polygammaLatex,
    piecewiseLatex,
    absoluteValueLatex,
    floorLatex,
    ceilLatex,
    fractionalPartLatex,
    cchainLatex,
    replaceGreekInName,
    getInequalityOperator,
    getVariableLatex,
    genFunctionLatex,
    getConstantLatex,
    genFunctionSubscriptLatex,
    cmpLatex,
    logicLatex
  };

  const IntervalTypecasts = {
    Identity: (x) => x,
    RealToComplex: (int) => {
      return new ComplexInterval(int.min, int.max, 0, 0, int.defMin, int.defMax)
    }
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

  class OperatorDefinition {
    constructor(params={}) {
      this.returns = params.returns || "real";

      throwInvalidType(this.returns);

      if (params.latex)
        this.latex = params.latex;
      else
        this.latex = () => { throw new Error("unimplemented") };

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
        desc: this.desc,
        latex: this.latex
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

    let casts = Typecasts$1[from];

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

  const Typecasts$1 = {
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

  for (let type in Typecasts$1) {
    if (Typecasts$1.hasOwnProperty(type)) {
      SummarizedTypecasts[type] = Typecasts$1[type].map(cast => cast.returns);
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
    if (str.includes("Typecasts"))
      return Typecasts[fName]
  }

  function constructTrigDefinitions(name, funcName) {

    let latex = LatexMethods.genFunctionLatex(funcName.toLowerCase());

    return [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions." + funcName,
        desc: "Returns the " + name + " of the real number x.",
        latex
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions." + funcName,
        desc: "Returns the " + name + " of the complex number z.",
        latex
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
        latex: LatexMethods.multiplicationLatex
      }),
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Multiply",
        desc: "Returns the product of two real numbers.",
        latex: LatexMethods.multiplicationLatex
      }),
      new NormalDefinition({
        signature: ["complex", "complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Multiply",
        desc: "Returns the product of two complex numbers.",
        latex: LatexMethods.multiplicationLatex
      })
    ],
    '+': [
      new NormalDefinition({
        signature: ["int", "int"],
        returns: "int",
        evaluate: "RealFunctions.Add",
        desc: "Returns the sum of two integers.",
        latex: LatexMethods.additionLatex
      }),
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Add",
        desc: "Returns the sum of two real numbers.",
        latex: LatexMethods.additionLatex
      }),
      new NormalDefinition({
        signature: ["complex", "complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Add",
        desc: "Returns the sum of two complex numbers.",
        latex: LatexMethods.additionLatex
      }),
      new NormalDefinition({
        signature: ["vec2", "vec2"],
        returns: "vec2",
        evaluate: "VectorFunctions.Add",
        desc: "Returns the sum of two 2-dimensional vectors.",
        latex: LatexMethods.additionLatex
      })
    ],
    '-': [
      new NormalDefinition({
        signature: ["int", "int"],
        returns: "int",
        evaluate: "RealFunctions.Subtract",
        desc: "Returns the difference of two integers.",
        latex: LatexMethods.subtractionLatex
      }),
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Subtract",
        desc: "Returns the difference of two real numbers.",
        latex: LatexMethods.subtractionLatex
      }),
      new NormalDefinition({
        signature: ["complex", "complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Subtract",
        desc: "Returns the difference of two complex numbers.",
        latex: LatexMethods.subtractionLatex
      }),
      new NormalDefinition({
        signature: ["vec2", "vec2"],
        returns: "vec2",
        evaluate: "VectorFunctions.Subtract",
        desc: "Returns the sum of two 2-dimensional vectors.",
        latex: LatexMethods.subtractionLatex
      })
    ],
    '/': [
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Divide",
        desc: "Returns the quotient of two real numbers.",
        latex: LatexMethods.divisionLatex
      }),
      new NormalDefinition({
        signature: ["complex", "complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Divide",
        desc: "Returns the quotient of two real numbers.",
        latex: LatexMethods.divisionLatex
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
        desc: "Im(r) returns the imaginary part of r, i.e. 0.",
        latex: LatexMethods.genFunctionLatex("Im")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "real",
        evaluate: "ComplexFunctions.Im",
        desc: "Im(z) returns the imaginary part of z.",
        latex: LatexMethods.genFunctionLatex("Im")
      })
    ],
    "Re": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Re",
        desc: "Re(r) returns the real part of r, i.e. r.",
        latex: LatexMethods.genFunctionLatex("Re")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "real",
        evaluate: "ComplexFunctions.Re",
        desc: "Re(z) returns the real part of z.",
        latex: LatexMethods.genFunctionLatex("Re")
      })
    ],
    "gamma": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Gamma",
        desc: "Evaluates the gamma function at r.",
        latex: LatexMethods.genFunctionLatex("\\Gamma")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Gamma",
        desc: "Evaluates the gamma function at z.",
        latex: LatexMethods.genFunctionLatex("\\Gamma")
      })
    ],
    '^': [
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Pow",
        desc: "Evaluates a^b, undefined for negative b. If you want to evaluate something like a^(1/5), use pow_rational(a, 1, 5).",
        latex: LatexMethods.exponentiationLatex
      }),
      new NormalDefinition({
        signature: ["complex", "complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Pow",
        desc: "Returns the principal value of z^w.",
        latex: LatexMethods.exponentiationLatex
      })
    ],
    "digamma": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Digamma",
        desc: "Evaluates the digamma function at r.",
        latex: LatexMethods.genFunctionLatex("\\psi^{(0})")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Digamma",
        desc: "Evaluates the digamma function at z.",
        latex: LatexMethods.genFunctionLatex("\\psi^{(0})")
      })
    ],
    "trigamma": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Trigamma",
        desc: "Evaluates the trigamma function at r.",
        latex: LatexMethods.genFunctionLatex("\\psi^{(1})")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Trigamma",
        desc: "Evaluates the trigamma function at z.",
        latex: LatexMethods.genFunctionLatex("\\psi^{(1})")
      })
    ],
    "polygamma": [
      new NormalDefinition({
        signature: ["int", "real"],
        returns: "real",
        evaluate: "RealFunctions.Polygamma",
        desc: "polygamma(n, r) evaluates the nth polygamma function at r.",
        latex: LatexMethods.polygammaLatex
      }),
      new NormalDefinition({
        signature: ["int", "complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Polygamma",
        desc: "polygamma(n, z) evaluates the nth polygamma function at z.",
        latex: LatexMethods.polygammaLatex
      })
    ],
    "sqrt": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Sqrt",
        desc: "sqrt(r) returns the square root of r. NaN if r < 0.",
        latex: LatexMethods.sqrtLatex
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Sqrt",
        desc: "sqrt(z) returns the principal branch of the square root of z.",
        latex: LatexMethods.sqrtLatex
      })
    ],
    "cbrt": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Cbrt",
        desc: "cbrt(r) returns the cube root of r. NaN if r < 0.",
        latex: LatexMethods.cbrtLatex
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Cbrt",
        desc: "cbrt(z) returns the principal branch of the cube root of z.",
        latex: LatexMethods.cbrtLatex
      })
    ],
    "ln": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Ln",
        desc: "ln(r) returns the natural logarithm of r. NaN if r < 0.",
        latex: LatexMethods.genFunctionLatex("ln")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Ln",
        desc: "ln(z) returns the principal value of the natural logarithm of z.",
        latex: LatexMethods.genFunctionLatex("ln")
      })
    ],
    "log10": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Log10",
        desc: "log10(r) returns the base-10 logarithm of r. NaN if r < 0.",
        latex: LatexMethods.genFunctionLatex("log_{10}")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Log10",
        desc: "log10(z) returns the principal value of base-10 logarithm of z.",
        latex: LatexMethods.genFunctionLatex("log_{10}")
      })
    ],
    "log2": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Log2",
        desc: "log2(r) returns the base-2 logarithm of r. NaN if r < 0.",
        latex: LatexMethods.genFunctionLatex("log_{2}")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Log2",
        desc: "log2(z) returns the principal value of base-2 logarithm of z.",
        latex: LatexMethods.genFunctionLatex("log_{2}")
      })
    ],
    "piecewise": [
      new VariadicDefinition({
        initialSignature: [],
        repeatingSignature: ["real", "bool"],
        returns: "real",
        evaluate: "RealFunctions.Piecewise",
        desc: "piecewise(a, cond1, b, cond2 ... ) returns a if cond1 is true, b if cond2 is true, and so forth, and 0 otherwise.",
        latex: LatexMethods.piecewiseLatex
      }),
      new VariadicDefinition({
        initialSignature: ["real"],
        repeatingSignature: ["bool", "real"],
        returns: "real",
        evaluate: "RealFunctions.Piecewise",
        desc: "piecewise(a, cond1, b, cond2, ..., default) returns a if cond1 is true, b if cond2 is true, and so forth, and default otherwise.",
        latex: LatexMethods.piecewiseLatex
      }),
      new VariadicDefinition({
        initialSignature: [],
        repeatingSignature: ["complex", "bool"],
        returns: "complex",
        evaluate: "ComplexFunctions.Piecewise",
        desc: "piecewise(a, cond1, b, cond2 ... ) returns a if cond1 is true, b if cond2 is true, and so forth, and 0 otherwise.",
        latex: LatexMethods.piecewiseLatex
      }),
      new VariadicDefinition({
        initialSignature: ["complex"],
        repeatingSignature: ["bool", "complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Piecewise",
        desc: "piecewise(a, cond1, b, cond2, ..., default) returns a if cond1 is true, b if cond2 is true, and so forth, and default otherwise.",
        latex: LatexMethods.piecewiseLatex
      }),
    ],
    "ifelse": [
      new NormalDefinition({
        signature: ["real", "bool", "real"],
        returns: "real",
        evaluate: "RealFunctions.Piecewise",
        desc: "ifelse(a, cond, b) returns a if cond is true, and b otherwise",
        latex: LatexMethods.piecewiseLatex
      }),
      new NormalDefinition({
        signature: ["complex", "bool", "complex"],
        returns: "real",
        evaluate: "RealFunctions.Piecewise",
        desc: "ifelse(a, cond, b) returns a if cond is true, and b otherwise",
        latex: LatexMethods.piecewiseLatex
      })
    ],
    "cchain": [
      new VariadicDefinition({
        initialSignature: ["real"],
        repeatingSignature: ["int", "real"],
        returns: "bool",
        evaluate: "RealFunctions.CChain",
        desc: "Used internally to describe comparison chains (e.x. 0 < a < b < 1)",
        latex: LatexMethods.cchainLatex
      })
    ],
    "<": [
      new NormalDefinition( {
        signature: ["real", "real"],
        returns: "bool",
        evaluate: "RealFunctions.Cmp.LessThan",
        desc: "Returns a < b.",
        latex: LatexMethods.cmpLatex['<']
      })
    ],
    ">": [
      new NormalDefinition( {
        signature: ["real", "real"],
        returns: "bool",
        evaluate: "RealFunctions.Cmp.GreaterThan",
        desc: "Returns a > b.",
        latex: LatexMethods.cmpLatex['>']
      })
    ],
    "<=": [
      new NormalDefinition( {
        signature: ["real", "real"],
        returns: "bool",
        evaluate: "RealFunctions.Cmp.LessEqualThan",
        desc: "Returns a <= b.",
        latex: LatexMethods.cmpLatex['<=']
      })
    ],
    ">=": [
      new NormalDefinition( {
        signature: ["real", "real"],
        returns: "bool",
        evaluate: "RealFunctions.Cmp.GreaterEqualThan",
        desc: "Returns a >= b.",
        latex: LatexMethods.cmpLatex['>=']
      })
    ],
    "==": [
      new NormalDefinition( {
        signature: ["real", "real"],
        returns: "bool",
        evaluate: "RealFunctions.Cmp.Equal",
        desc: "Returns a == b.",
        latex: LatexMethods.cmpLatex['==']
      })
    ],
    "!=": [
      new NormalDefinition( {
        signature: ["real", "real"],
        returns: "bool",
        evaluate: "RealFunctions.Cmp.NotEqual",
        desc: "Returns a != b.",
        latex: LatexMethods.cmpLatex['!=']
      })
    ],
    "euler_phi": [
      new NormalDefinition({
        signature: ["int"],
        returns: "int",
        evaluate: "RealFunctions.EulerPhi",
        desc: "Returns Euler's totient function evaluated at an integer n.",
        latex: LatexMethods.genFunctionLatex('\\phi')
      })
    ],
    "floor": [
      new NormalDefinition({
        signature: ["real"],
        returns: "int",
        evaluate: "RealFunctions.Floor",
        desc: "Returns the floor of a real number r.",
        latex: LatexMethods.floorLatex
      })
    ],
    "ceil": [
      new NormalDefinition({
        signature: ["real"],
        returns: "int",
        evaluate: "RealFunctions.Ceil",
        desc: "Returns the ceiling of a real number r.",
        latex: LatexMethods.ceilLatex
      })
    ],
    "riemann_zeta": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Zeta",
        desc: "Returns the Riemann zeta function of a real number r.",
        latex: LatexMethods.genFunctionLatex("\\zeta")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Zeta",
        desc: "Returns the Riemann zeta function of a complex number r.",
        latex: LatexMethods.genFunctionLatex("\\zeta")
      })
    ],
    "dirichlet_eta": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Eta",
        desc: "Returns the Dirichlet eta function of a real number r.",
        latex: LatexMethods.genFunctionLatex("\\eta")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Eta",
        desc: "Returns the Dirichlet eta function of a complex number r.",
        latex: LatexMethods.genFunctionLatex("\\eta")
      })
    ],
    "mod": [
      new NormalDefinition({
        signature: ["int", "int"],
        returns: "int",
        evaluate: "RealFunctions.Mod",
        desc: "Returns a modulo b.",
        latex: LatexMethods.genFunctionLatex("mod")
      }),
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Mod",
        desc: "Returns a modulo b.",
        latex: LatexMethods.genFunctionLatex("mod")
      })
    ],
    "frac": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Frac",
        desc: "Returns the fractional part of x.",
        latex: LatexMethods.fractionalPartLatex
      })
    ],
    "sign": [
      new NormalDefinition({
        signature: ["real"],
        returns: "int",
        evaluate: "RealFunctions.Sign",
        desc: "Returns the sign of x: 1 if x > 0, 0 if x == 0 and -1 otherwise.",
        latex: LatexMethods.genFunctionLatex("sgn")
      })
    ],
    "round": [
      new NormalDefinition({
        signature: ["real"],
        returns: "int",
        evaluate: "RealFunctions.Round",
        desc: "Returns the nearest integer to x. Note that if |x| > " + Number.MAX_SAFE_INTEGER + " this may not be accurate.",
        latex: LatexMethods.genFunctionLatex("round")
      })
    ],
    "trunc": [
      new NormalDefinition({
        signature: ["real"],
        returns: "int",
        evaluate: "RealFunctions.Trunc",
        desc: "Removes the fractional part of x.",
        latex: LatexMethods.genFunctionLatex("trunc")
      })
    ],
    "is_finite": [
      new NormalDefinition({
        signature: ["real"],
        returns: "bool",
        evaluate: "RealFunctions.IsFinite",
        desc: "Returns true if the number is finite and false if it is -Infinity, Infinity, or NaN",
        latex: LatexMethods.genFunctionLatex("isFinite")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "bool",
        evaluate: "ComplexFunctions.IsFinite",
        desc: "Returns true if the number is finite and false if it is undefined or infinite",
        latex: LatexMethods.genFunctionLatex("isFinite")
      })
    ],
    "not": [
      new NormalDefinition({
        signature: ["bool"],
        returns: "bool",
        evaluate: "!",
        noGraphemePrefix: true,
        desc: "Returns the logical negation of b.",
        latex: LatexMethods.logicLatex.not
      })
    ],
    "and": [
      new NormalDefinition({
        signature: ["bool", "bool"],
        returns: "bool",
        evaluate: "BooleanFunctions.And",
        desc: "Returns true if a and b are true, and false otherwise.",
        latex: LatexMethods.logicLatex.and
      })
    ],
    "or": [
      new NormalDefinition({
        signature: ["bool", "bool"],
        returns: "bool",
        evaluate: "BooleanFunctions.Or",
        desc: "Returns true if a or b are true, and false otherwise.",
        latex: LatexMethods.logicLatex.or
      })
    ],
    "Ei": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Ei",
        desc: "Returns the exponential integral of x.",
        latex: LatexMethods.genFunctionLatex("Ei")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Ei",
        desc: "Returns the exponential integral of z.",
        latex: LatexMethods.genFunctionLatex("Ei")
      })
    ],
    "li": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Li",
        desc: "Returns the logarithmic integral of x.",
        latex: LatexMethods.genFunctionLatex("li")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Li",
        desc: "Returns the logarithmic integral of z.",
        latex: LatexMethods.genFunctionLatex("li")
      })
    ],
    "sinc": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Sinc",
        desc: "Returns the sinc function of x.",
        latex: LatexMethods.genFunctionLatex("sinc")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Sinc",
        desc: "Returns the sinc function of x.",
        latex: LatexMethods.genFunctionLatex("sinc")
      })
    ],
    "Si": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Si",
        desc: "Returns the sine integral of x.",
        latex: LatexMethods.genFunctionLatex("Si")
      })
    ],
    "Ci": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Ci",
        desc: "Returns the cosine integral of x.",
        latex: LatexMethods.genFunctionLatex("Ci")
      })
    ],
    "erf": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Erf",
        desc: "Returns the error function of x.",
        latex: LatexMethods.genFunctionLatex("erf")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Erf",
        desc: "Returns the error function of z.",
        latex: LatexMethods.genFunctionLatex("erf")
      })
    ],
    "erfc": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Erfc",
        desc: "Returns the complementary error function of x.",
        latex: LatexMethods.genFunctionLatex("erfc")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Erfc",
        desc: "Returns the complementary error function of z.",
        latex: LatexMethods.genFunctionLatex("erfc")
      })
    ],
    "inverse_erf": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.InverseErf",
        desc: "Returns the inverse error function of x.",
        latex: LatexMethods.genFunctionLatex("erf^{-1}")
      })
    ],
    "inverse_erfc": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.InverseErfc",
        desc: "Returns the inverse complementary error function of x.",
        latex: LatexMethods.genFunctionLatex("erfc^{-1}")
      })
    ],
    "gcd": [
      new NormalDefinition({
        signature: ["int", "int"],
        returns: "int",
        evaluate: "RealFunctions.Gcd",
        desc: "Returns the greatest common divisor of a and b.",
        latex: LatexMethods.genFunctionLatex("gcd")
      })
    ],
    "lcm": [
      new NormalDefinition({
        signature: ["int", "int"],
        returns: "int",
        evaluate: "RealFunctions.Lcm",
        desc: "Returns the least common multiple of a and b.",
        latex: LatexMethods.genFunctionLatex("lcm")
      })
    ],
    "fresnel_S": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.FresnelS",
        desc: "Return the integral from 0 to x of sin(x^2).",
        latex: LatexMethods.genFunctionLatex("S")
      })
    ],
    "fresnel_C": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.FresnelC",
        desc: "Return the integral from 0 to x of cos(x^2).",
        latex: LatexMethods.genFunctionLatex("C")
      })
    ],
    "product_log": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.ProductLog",
        desc: "Return the principal branch of the product log of x (also known as the Lambert W function or W0(x)).",
        latex: LatexMethods.genFunctionLatex("W_0")
      }),
      new NormalDefinition({
        signature: ["int", "real"],
        returns: "real",
        evaluate: "RealFunctions.ProductLogBranched",
        desc: "Return the nth branch of the product log of x (also known as the Lambert W function or W0(x)). n can be 0 or -1.",
        latex: LatexMethods.genFunctionSubscriptLatex("W")
      })
    ],
    "elliptic_K": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.EllipticK",
        desc: "Return the complete elliptic integral K(m) with parameter m = k^2.",
        latex: LatexMethods.genFunctionLatex("K")
      })
    ],
    "elliptic_E": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.EllipticE",
        desc: "Return the complete elliptic integral E(m) with parameter m = k^2.",
        latex: LatexMethods.genFunctionLatex("E")
      })
    ],
    "agm": [
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Agm",
        desc: "Return the arithmetic geometric mean of a and b.",
        latex: LatexMethods.genFunctionLatex("agm")
      })
    ],
    "abs": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Abs",
        desc: "Return the absolute value of r.",
        latex: LatexMethods.absoluteValueLatex
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "real",
        evaluate: "ComplexFunctions.Abs",
        desc: "Return the magnitude of z.",
        latex: LatexMethods.absoluteValueLatex
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
        desc: "Find the number of primes below n.",
        latex: LatexMethods.genFunctionLatex("\\pi")
      })
    ],
    "cis": [
      new NormalDefinition({
        signature: ["real"],
        returns: "complex",
        evaluate: "ComplexFunctions.Cis",
        desc: "Returns cos(theta) + i sin(theta).",
        latex: LatexMethods.genFunctionLatex("cis")
      })
    ],
    "Cl2": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Cl2",
        desc: "Evaluates the Clausen function of x.",
        latex: LatexMethods.genFunctionLatex("Cl_2")
      })
    ],
    "beta": [
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Beta",
        desc: "Evaluates the beta function at a,b.",
        latex: LatexMethods.genFunctionLatex("B")
      })
    ],
    "exp": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.Exp",
        latex: LatexMethods.genFunctionLatex("exp")
      }),
      new NormalDefinition({
        signature: ["complex"],
        returns: "complex",
        evaluate: "ComplexFunctions.Exp",
        latex: LatexMethods.genFunctionLatex("exp")
      })
    ],
    "ln_gamma": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.LnGamma",
        latex: LatexMethods.genFunctionLatex("\\ln \\Gamma")
      })
    ],
    "barnes_G": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.BarnesG",
        latex: LatexMethods.genFunctionLatex("G")
      })
    ],
    "ln_barnes_G": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.LnBarnesG",
        latex: LatexMethods.genFunctionLatex("\\ln \\operatorname{G}")
      })
    ],
    "K_function": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.KFunction",
        latex: LatexMethods.genFunctionLatex("K")
      })
    ],
    "ln_K_function": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.LnKFunction",
        latex: LatexMethods.genFunctionLatex("\\ln \\operatorname{K}")
      })
    ],
    "bessel_J": [
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.BesselJ",
        latex: LatexMethods.genFunctionSubscriptLatex("J")
      })
    ],
    "bessel_Y": [
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.BesselY",
        latex: LatexMethods.genFunctionSubscriptLatex("Y")
      })
    ],
    "bessel_J0": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.BesselJ0",
        latex: LatexMethods.genFunctionLatex("J_0")
      })
    ],
    "bessel_Y0": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.BesselY0",
        latex: LatexMethods.genFunctionLatex("Y_0")
      })
    ],
    "bessel_J1": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.BesselJ1",
        latex: LatexMethods.genFunctionLatex("J_1")
      })
    ],
    "bessel_Y1": [
      new NormalDefinition({
        signature: ["real"],
        returns: "real",
        evaluate: "RealFunctions.BesselY1",
        latex: LatexMethods.genFunctionLatex("Y_1")
      })
    ],
    "spherical_bessel_J": [
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.SphericalBesselJ",
        latex: LatexMethods.genFunctionSubscriptLatex("j")
      })
    ],
    "spherical_bessel_Y": [
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.SphericalBesselY",
        latex: LatexMethods.genFunctionSubscriptLatex("y")
      })
    ],
    "polylog": [
      new NormalDefinition({
        signature: ["real", "real"],
        returns: "real",
        evaluate: "RealFunctions.Polylogarithm",
        latex: LatexMethods.genFunctionSubscriptLatex("Li")
      })
    ]
  };

  /**
   * This file defines classes UserDefinedFunction and UserDefinedVariable, which represent functions and variables to be
   * defined by the user. They are constructed with a name, a node/string which is the expression, and optionally, a list
   * of exported variables which the function can be evaluated at with f.evaluate(...). The list of exported variables can
   * include type information which will be
   */

  // Convert exportedVariables into a standard form that includes variable name and type information. For example,
  // 'x' is converted to [['x', "real"]], ['x', ['y', "complex"]] is converted to [['x', "real"], ['y', "complex"]]
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

  function defineFunction(funcName, node, exportedVariables) {
    if (Functions[funcName])
      undefineFunction(funcName);
    if (RESERVED_FUNCTIONS.includes(funcName))
      throw new Error("The function " + funcName + " is reserved by Grapheme. Please choose a different name.")

    if (typeof node === 'string')
      node = parseString(node);

    if (!exportedVariables)
      exportedVariables = node.getDependencies().vars;

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

  const exports$1 = {};

  !function(t,e){"object"==typeof exports$1&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports$1?exports$1.katex=e():t.katex=e();}("undefined"!=typeof self?self:undefined,function(){return function(t){var e={};function r(a){if(e[a])return e[a].exports;var n=e[a]={i:a,l:!1,exports:{}};return t[a].call(n.exports,n,n.exports,r),n.l=!0,n.exports}return r.m=t,r.c=e,r.d=function(t,e,a){r.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:a});},r.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0});},r.t=function(t,e){if(1&e&&(t=r(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var a=Object.create(null);if(r.r(a),Object.defineProperty(a,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var n in t)r.d(a,n,function(e){return t[e]}.bind(null,n));return a},r.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return r.d(e,"a",e),e},r.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},r.p="",r(r.s=1)}([function(t,e,r){},function(t,e,r){r.r(e);r(0);var a=function(){function t(t,e,r){this.lexer=void 0,this.start=void 0,this.end=void 0,this.lexer=t,this.start=e,this.end=r;}return t.range=function(e,r){return r?e&&e.loc&&r.loc&&e.loc.lexer===r.loc.lexer?new t(e.loc.lexer,e.loc.start,r.loc.end):null:e&&e.loc},t}(),n=function(){function t(t,e){this.text=void 0,this.loc=void 0,this.noexpand=void 0,this.treatAsRelax=void 0,this.text=t,this.loc=e;}return t.prototype.range=function(e,r){return new t(r,a.range(this,e))},t}(),i=function t(e,r){this.position=void 0;var a,n="KaTeX parse error: "+e,i=r&&r.loc;if(i&&i.start<=i.end){var o=i.lexer.input;a=i.start;var s=i.end;a===o.length?n+=" at end of input: ":n+=" at position "+(a+1)+": ";var l=o.slice(a,s).replace(/[^]/g,"$&\u0332");n+=(a>15?"\u2026"+o.slice(a-15,a):o.slice(0,a))+l+(s+15<o.length?o.slice(s,s+15)+"\u2026":o.slice(s));}var h=new Error(n);return h.name="ParseError",h.__proto__=t.prototype,h.position=a,h};i.prototype.__proto__=Error.prototype;var o=i,s=/([A-Z])/g,l={"&":"&amp;",">":"&gt;","<":"&lt;",'"':"&quot;","'":"&#x27;"},h=/[&><"']/g;var m=function t(e){return "ordgroup"===e.type?1===e.body.length?t(e.body[0]):e:"color"===e.type?1===e.body.length?t(e.body[0]):e:"font"===e.type?t(e.body):e},c={contains:function(t,e){return -1!==t.indexOf(e)},deflt:function(t,e){return void 0===t?e:t},escape:function(t){return String(t).replace(h,function(t){return l[t]})},hyphenate:function(t){return t.replace(s,"-$1").toLowerCase()},getBaseElem:m,isCharacterBox:function(t){var e=m(t);return "mathord"===e.type||"textord"===e.type||"atom"===e.type},protocolFromUrl:function(t){var e=/^\s*([^\\/#]*?)(?::|&#0*58|&#x0*3a)/i.exec(t);return null!=e?e[1]:"_relative"}},u=function(){function t(t){this.displayMode=void 0,this.output=void 0,this.leqno=void 0,this.fleqn=void 0,this.throwOnError=void 0,this.errorColor=void 0,this.macros=void 0,this.minRuleThickness=void 0,this.colorIsTextColor=void 0,this.strict=void 0,this.trust=void 0,this.maxSize=void 0,this.maxExpand=void 0,this.globalGroup=void 0,t=t||{},this.displayMode=c.deflt(t.displayMode,!1),this.output=c.deflt(t.output,"htmlAndMathml"),this.leqno=c.deflt(t.leqno,!1),this.fleqn=c.deflt(t.fleqn,!1),this.throwOnError=c.deflt(t.throwOnError,!0),this.errorColor=c.deflt(t.errorColor,"#cc0000"),this.macros=t.macros||{},this.minRuleThickness=Math.max(0,c.deflt(t.minRuleThickness,0)),this.colorIsTextColor=c.deflt(t.colorIsTextColor,!1),this.strict=c.deflt(t.strict,"warn"),this.trust=c.deflt(t.trust,!1),this.maxSize=Math.max(0,c.deflt(t.maxSize,1/0)),this.maxExpand=Math.max(0,c.deflt(t.maxExpand,1e3)),this.globalGroup=c.deflt(t.globalGroup,!1);}var e=t.prototype;return e.reportNonstrict=function(t,e,r){var a=this.strict;if("function"==typeof a&&(a=a(t,e,r)),a&&"ignore"!==a){if(!0===a||"error"===a)throw new o("LaTeX-incompatible input and strict mode is set to 'error': "+e+" ["+t+"]",r);"warn"===a?"undefined"!=typeof console&&console.warn("LaTeX-incompatible input and strict mode is set to 'warn': "+e+" ["+t+"]"):"undefined"!=typeof console&&console.warn("LaTeX-incompatible input and strict mode is set to unrecognized '"+a+"': "+e+" ["+t+"]");}},e.useStrictBehavior=function(t,e,r){var a=this.strict;if("function"==typeof a)try{a=a(t,e,r);}catch(t){a="error";}return !(!a||"ignore"===a)&&(!0===a||"error"===a||("warn"===a?("undefined"!=typeof console&&console.warn("LaTeX-incompatible input and strict mode is set to 'warn': "+e+" ["+t+"]"),!1):("undefined"!=typeof console&&console.warn("LaTeX-incompatible input and strict mode is set to unrecognized '"+a+"': "+e+" ["+t+"]"),!1)))},e.isTrusted=function(t){t.url&&!t.protocol&&(t.protocol=c.protocolFromUrl(t.url));var e="function"==typeof this.trust?this.trust(t):this.trust;return Boolean(e)},t}(),p=function(){function t(t,e,r){this.id=void 0,this.size=void 0,this.cramped=void 0,this.id=t,this.size=e,this.cramped=r;}var e=t.prototype;return e.sup=function(){return d[f[this.id]]},e.sub=function(){return d[g[this.id]]},e.fracNum=function(){return d[x[this.id]]},e.fracDen=function(){return d[v[this.id]]},e.cramp=function(){return d[b[this.id]]},e.text=function(){return d[y[this.id]]},e.isTight=function(){return this.size>=2},t}(),d=[new p(0,0,!1),new p(1,0,!0),new p(2,1,!1),new p(3,1,!0),new p(4,2,!1),new p(5,2,!0),new p(6,3,!1),new p(7,3,!0)],f=[4,5,4,5,6,7,6,7],g=[5,5,5,5,7,7,7,7],x=[2,3,4,5,6,7,6,7],v=[3,3,5,5,7,7,7,7],b=[1,1,3,3,5,5,7,7],y=[0,1,2,3,2,3,2,3],w={DISPLAY:d[0],TEXT:d[2],SCRIPT:d[4],SCRIPTSCRIPT:d[6]},k=[{name:"latin",blocks:[[256,591],[768,879]]},{name:"cyrillic",blocks:[[1024,1279]]},{name:"brahmic",blocks:[[2304,4255]]},{name:"georgian",blocks:[[4256,4351]]},{name:"cjk",blocks:[[12288,12543],[19968,40879],[65280,65376]]},{name:"hangul",blocks:[[44032,55215]]}];var S=[];function M(t){for(var e=0;e<S.length;e+=2)if(t>=S[e]&&t<=S[e+1])return !0;return !1}k.forEach(function(t){return t.blocks.forEach(function(t){return S.push.apply(S,t)})});var z={leftParenInner:"M291 0 H417 V300 H291 z",rightParenInner:"M457 0 H583 V300 H457 z",doubleleftarrow:"M262 157\nl10-10c34-36 62.7-77 86-123 3.3-8 5-13.3 5-16 0-5.3-6.7-8-20-8-7.3\n 0-12.2.5-14.5 1.5-2.3 1-4.8 4.5-7.5 10.5-49.3 97.3-121.7 169.3-217 216-28\n 14-57.3 25-88 33-6.7 2-11 3.8-13 5.5-2 1.7-3 4.2-3 7.5s1 5.8 3 7.5\nc2 1.7 6.3 3.5 13 5.5 68 17.3 128.2 47.8 180.5 91.5 52.3 43.7 93.8 96.2 124.5\n 157.5 9.3 8 15.3 12.3 18 13h6c12-.7 18-4 18-10 0-2-1.7-7-5-15-23.3-46-52-87\n-86-123l-10-10h399738v-40H218c328 0 0 0 0 0l-10-8c-26.7-20-65.7-43-117-69 2.7\n-2 6-3.7 10-5 36.7-16 72.3-37.3 107-64l10-8h399782v-40z\nm8 0v40h399730v-40zm0 194v40h399730v-40z",doublerightarrow:"M399738 392l\n-10 10c-34 36-62.7 77-86 123-3.3 8-5 13.3-5 16 0 5.3 6.7 8 20 8 7.3 0 12.2-.5\n 14.5-1.5 2.3-1 4.8-4.5 7.5-10.5 49.3-97.3 121.7-169.3 217-216 28-14 57.3-25 88\n-33 6.7-2 11-3.8 13-5.5 2-1.7 3-4.2 3-7.5s-1-5.8-3-7.5c-2-1.7-6.3-3.5-13-5.5-68\n-17.3-128.2-47.8-180.5-91.5-52.3-43.7-93.8-96.2-124.5-157.5-9.3-8-15.3-12.3-18\n-13h-6c-12 .7-18 4-18 10 0 2 1.7 7 5 15 23.3 46 52 87 86 123l10 10H0v40h399782\nc-328 0 0 0 0 0l10 8c26.7 20 65.7 43 117 69-2.7 2-6 3.7-10 5-36.7 16-72.3 37.3\n-107 64l-10 8H0v40zM0 157v40h399730v-40zm0 194v40h399730v-40z",leftarrow:"M400000 241H110l3-3c68.7-52.7 113.7-120\n 135-202 4-14.7 6-23 6-25 0-7.3-7-11-21-11-8 0-13.2.8-15.5 2.5-2.3 1.7-4.2 5.8\n-5.5 12.5-1.3 4.7-2.7 10.3-4 17-12 48.7-34.8 92-68.5 130S65.3 228.3 18 247\nc-10 4-16 7.7-18 11 0 8.7 6 14.3 18 17 47.3 18.7 87.8 47 121.5 85S196 441.3 208\n 490c.7 2 1.3 5 2 9s1.2 6.7 1.5 8c.3 1.3 1 3.3 2 6s2.2 4.5 3.5 5.5c1.3 1 3.3\n 1.8 6 2.5s6 1 10 1c14 0 21-3.7 21-11 0-2-2-10.3-6-25-20-79.3-65-146.7-135-202\n l-3-3h399890zM100 241v40h399900v-40z",leftbrace:"M6 548l-6-6v-35l6-11c56-104 135.3-181.3 238-232 57.3-28.7 117\n-45 179-50h399577v120H403c-43.3 7-81 15-113 26-100.7 33-179.7 91-237 174-2.7\n 5-6 9-10 13-.7 1-7.3 1-20 1H6z",leftbraceunder:"M0 6l6-6h17c12.688 0 19.313.3 20 1 4 4 7.313 8.3 10 13\n 35.313 51.3 80.813 93.8 136.5 127.5 55.688 33.7 117.188 55.8 184.5 66.5.688\n 0 2 .3 4 1 18.688 2.7 76 4.3 172 5h399450v120H429l-6-1c-124.688-8-235-61.7\n-331-161C60.687 138.7 32.312 99.3 7 54L0 41V6z",leftgroup:"M400000 80\nH435C64 80 168.3 229.4 21 260c-5.9 1.2-18 0-18 0-2 0-3-1-3-3v-38C76 61 257 0\n 435 0h399565z",leftgroupunder:"M400000 262\nH435C64 262 168.3 112.6 21 82c-5.9-1.2-18 0-18 0-2 0-3 1-3 3v38c76 158 257 219\n 435 219h399565z",leftharpoon:"M0 267c.7 5.3 3 10 7 14h399993v-40H93c3.3\n-3.3 10.2-9.5 20.5-18.5s17.8-15.8 22.5-20.5c50.7-52 88-110.3 112-175 4-11.3 5\n-18.3 3-21-1.3-4-7.3-6-18-6-8 0-13 .7-15 2s-4.7 6.7-8 16c-42 98.7-107.3 174.7\n-196 228-6.7 4.7-10.7 8-12 10-1.3 2-2 5.7-2 11zm100-26v40h399900v-40z",leftharpoonplus:"M0 267c.7 5.3 3 10 7 14h399993v-40H93c3.3-3.3 10.2-9.5\n 20.5-18.5s17.8-15.8 22.5-20.5c50.7-52 88-110.3 112-175 4-11.3 5-18.3 3-21-1.3\n-4-7.3-6-18-6-8 0-13 .7-15 2s-4.7 6.7-8 16c-42 98.7-107.3 174.7-196 228-6.7 4.7\n-10.7 8-12 10-1.3 2-2 5.7-2 11zm100-26v40h399900v-40zM0 435v40h400000v-40z\nm0 0v40h400000v-40z",leftharpoondown:"M7 241c-4 4-6.333 8.667-7 14 0 5.333.667 9 2 11s5.333\n 5.333 12 10c90.667 54 156 130 196 228 3.333 10.667 6.333 16.333 9 17 2 .667 5\n 1 9 1h5c10.667 0 16.667-2 18-6 2-2.667 1-9.667-3-21-32-87.333-82.667-157.667\n-152-211l-3-3h399907v-40zM93 281 H400000 v-40L7 241z",leftharpoondownplus:"M7 435c-4 4-6.3 8.7-7 14 0 5.3.7 9 2 11s5.3 5.3 12\n 10c90.7 54 156 130 196 228 3.3 10.7 6.3 16.3 9 17 2 .7 5 1 9 1h5c10.7 0 16.7\n-2 18-6 2-2.7 1-9.7-3-21-32-87.3-82.7-157.7-152-211l-3-3h399907v-40H7zm93 0\nv40h399900v-40zM0 241v40h399900v-40zm0 0v40h399900v-40z",lefthook:"M400000 281 H103s-33-11.2-61-33.5S0 197.3 0 164s14.2-61.2 42.5\n-83.5C70.8 58.2 104 47 142 47 c16.7 0 25 6.7 25 20 0 12-8.7 18.7-26 20-40 3.3\n-68.7 15.7-86 37-10 12-15 25.3-15 40 0 22.7 9.8 40.7 29.5 54 19.7 13.3 43.5 21\n 71.5 23h399859zM103 281v-40h399897v40z",leftlinesegment:"M40 281 V428 H0 V94 H40 V241 H400000 v40z\nM40 281 V428 H0 V94 H40 V241 H400000 v40z",leftmapsto:"M40 281 V448H0V74H40V241H400000v40z\nM40 281 V448H0V74H40V241H400000v40z",leftToFrom:"M0 147h400000v40H0zm0 214c68 40 115.7 95.7 143 167h22c15.3 0 23\n-.3 23-1 0-1.3-5.3-13.7-16-37-18-35.3-41.3-69-70-101l-7-8h399905v-40H95l7-8\nc28.7-32 52-65.7 70-101 10.7-23.3 16-35.7 16-37 0-.7-7.7-1-23-1h-22C115.7 265.3\n 68 321 0 361zm0-174v-40h399900v40zm100 154v40h399900v-40z",longequal:"M0 50 h400000 v40H0z m0 194h40000v40H0z\nM0 50 h400000 v40H0z m0 194h40000v40H0z",midbrace:"M200428 334\nc-100.7-8.3-195.3-44-280-108-55.3-42-101.7-93-139-153l-9-14c-2.7 4-5.7 8.7-9 14\n-53.3 86.7-123.7 153-211 199-66.7 36-137.3 56.3-212 62H0V214h199568c178.3-11.7\n 311.7-78.3 403-201 6-8 9.7-12 11-12 .7-.7 6.7-1 18-1s17.3.3 18 1c1.3 0 5 4 11\n 12 44.7 59.3 101.3 106.3 170 141s145.3 54.3 229 60h199572v120z",midbraceunder:"M199572 214\nc100.7 8.3 195.3 44 280 108 55.3 42 101.7 93 139 153l9 14c2.7-4 5.7-8.7 9-14\n 53.3-86.7 123.7-153 211-199 66.7-36 137.3-56.3 212-62h199568v120H200432c-178.3\n 11.7-311.7 78.3-403 201-6 8-9.7 12-11 12-.7.7-6.7 1-18 1s-17.3-.3-18-1c-1.3 0\n-5-4-11-12-44.7-59.3-101.3-106.3-170-141s-145.3-54.3-229-60H0V214z",oiintSize1:"M512.6 71.6c272.6 0 320.3 106.8 320.3 178.2 0 70.8-47.7 177.6\n-320.3 177.6S193.1 320.6 193.1 249.8c0-71.4 46.9-178.2 319.5-178.2z\nm368.1 178.2c0-86.4-60.9-215.4-368.1-215.4-306.4 0-367.3 129-367.3 215.4 0 85.8\n60.9 214.8 367.3 214.8 307.2 0 368.1-129 368.1-214.8z",oiintSize2:"M757.8 100.1c384.7 0 451.1 137.6 451.1 230 0 91.3-66.4 228.8\n-451.1 228.8-386.3 0-452.7-137.5-452.7-228.8 0-92.4 66.4-230 452.7-230z\nm502.4 230c0-111.2-82.4-277.2-502.4-277.2s-504 166-504 277.2\nc0 110 84 276 504 276s502.4-166 502.4-276z",oiiintSize1:"M681.4 71.6c408.9 0 480.5 106.8 480.5 178.2 0 70.8-71.6 177.6\n-480.5 177.6S202.1 320.6 202.1 249.8c0-71.4 70.5-178.2 479.3-178.2z\nm525.8 178.2c0-86.4-86.8-215.4-525.7-215.4-437.9 0-524.7 129-524.7 215.4 0\n85.8 86.8 214.8 524.7 214.8 438.9 0 525.7-129 525.7-214.8z",oiiintSize2:"M1021.2 53c603.6 0 707.8 165.8 707.8 277.2 0 110-104.2 275.8\n-707.8 275.8-606 0-710.2-165.8-710.2-275.8C311 218.8 415.2 53 1021.2 53z\nm770.4 277.1c0-131.2-126.4-327.6-770.5-327.6S248.4 198.9 248.4 330.1\nc0 130 128.8 326.4 772.7 326.4s770.5-196.4 770.5-326.4z",rightarrow:"M0 241v40h399891c-47.3 35.3-84 78-110 128\n-16.7 32-27.7 63.7-33 95 0 1.3-.2 2.7-.5 4-.3 1.3-.5 2.3-.5 3 0 7.3 6.7 11 20\n 11 8 0 13.2-.8 15.5-2.5 2.3-1.7 4.2-5.5 5.5-11.5 2-13.3 5.7-27 11-41 14.7-44.7\n 39-84.5 73-119.5s73.7-60.2 119-75.5c6-2 9-5.7 9-11s-3-9-9-11c-45.3-15.3-85\n-40.5-119-75.5s-58.3-74.8-73-119.5c-4.7-14-8.3-27.3-11-40-1.3-6.7-3.2-10.8-5.5\n-12.5-2.3-1.7-7.5-2.5-15.5-2.5-14 0-21 3.7-21 11 0 2 2 10.3 6 25 20.7 83.3 67\n 151.7 139 205zm0 0v40h399900v-40z",rightbrace:"M400000 542l\n-6 6h-17c-12.7 0-19.3-.3-20-1-4-4-7.3-8.3-10-13-35.3-51.3-80.8-93.8-136.5-127.5\ns-117.2-55.8-184.5-66.5c-.7 0-2-.3-4-1-18.7-2.7-76-4.3-172-5H0V214h399571l6 1\nc124.7 8 235 61.7 331 161 31.3 33.3 59.7 72.7 85 118l7 13v35z",rightbraceunder:"M399994 0l6 6v35l-6 11c-56 104-135.3 181.3-238 232-57.3\n 28.7-117 45-179 50H-300V214h399897c43.3-7 81-15 113-26 100.7-33 179.7-91 237\n-174 2.7-5 6-9 10-13 .7-1 7.3-1 20-1h17z",rightgroup:"M0 80h399565c371 0 266.7 149.4 414 180 5.9 1.2 18 0 18 0 2 0\n 3-1 3-3v-38c-76-158-257-219-435-219H0z",rightgroupunder:"M0 262h399565c371 0 266.7-149.4 414-180 5.9-1.2 18 0 18\n 0 2 0 3 1 3 3v38c-76 158-257 219-435 219H0z",rightharpoon:"M0 241v40h399993c4.7-4.7 7-9.3 7-14 0-9.3\n-3.7-15.3-11-18-92.7-56.7-159-133.7-199-231-3.3-9.3-6-14.7-8-16-2-1.3-7-2-15-2\n-10.7 0-16.7 2-18 6-2 2.7-1 9.7 3 21 15.3 42 36.7 81.8 64 119.5 27.3 37.7 58\n 69.2 92 94.5zm0 0v40h399900v-40z",rightharpoonplus:"M0 241v40h399993c4.7-4.7 7-9.3 7-14 0-9.3-3.7-15.3-11\n-18-92.7-56.7-159-133.7-199-231-3.3-9.3-6-14.7-8-16-2-1.3-7-2-15-2-10.7 0-16.7\n 2-18 6-2 2.7-1 9.7 3 21 15.3 42 36.7 81.8 64 119.5 27.3 37.7 58 69.2 92 94.5z\nm0 0v40h399900v-40z m100 194v40h399900v-40zm0 0v40h399900v-40z",rightharpoondown:"M399747 511c0 7.3 6.7 11 20 11 8 0 13-.8 15-2.5s4.7-6.8\n 8-15.5c40-94 99.3-166.3 178-217 13.3-8 20.3-12.3 21-13 5.3-3.3 8.5-5.8 9.5\n-7.5 1-1.7 1.5-5.2 1.5-10.5s-2.3-10.3-7-15H0v40h399908c-34 25.3-64.7 57-92 95\n-27.3 38-48.7 77.7-64 119-3.3 8.7-5 14-5 16zM0 241v40h399900v-40z",rightharpoondownplus:"M399747 705c0 7.3 6.7 11 20 11 8 0 13-.8\n 15-2.5s4.7-6.8 8-15.5c40-94 99.3-166.3 178-217 13.3-8 20.3-12.3 21-13 5.3-3.3\n 8.5-5.8 9.5-7.5 1-1.7 1.5-5.2 1.5-10.5s-2.3-10.3-7-15H0v40h399908c-34 25.3\n-64.7 57-92 95-27.3 38-48.7 77.7-64 119-3.3 8.7-5 14-5 16zM0 435v40h399900v-40z\nm0-194v40h400000v-40zm0 0v40h400000v-40z",righthook:"M399859 241c-764 0 0 0 0 0 40-3.3 68.7-15.7 86-37 10-12 15-25.3\n 15-40 0-22.7-9.8-40.7-29.5-54-19.7-13.3-43.5-21-71.5-23-17.3-1.3-26-8-26-20 0\n-13.3 8.7-20 26-20 38 0 71 11.2 99 33.5 0 0 7 5.6 21 16.7 14 11.2 21 33.5 21\n 66.8s-14 61.2-42 83.5c-28 22.3-61 33.5-99 33.5L0 241z M0 281v-40h399859v40z",rightlinesegment:"M399960 241 V94 h40 V428 h-40 V281 H0 v-40z\nM399960 241 V94 h40 V428 h-40 V281 H0 v-40z",rightToFrom:"M400000 167c-70.7-42-118-97.7-142-167h-23c-15.3 0-23 .3-23\n 1 0 1.3 5.3 13.7 16 37 18 35.3 41.3 69 70 101l7 8H0v40h399905l-7 8c-28.7 32\n-52 65.7-70 101-10.7 23.3-16 35.7-16 37 0 .7 7.7 1 23 1h23c24-69.3 71.3-125 142\n-167z M100 147v40h399900v-40zM0 341v40h399900v-40z",twoheadleftarrow:"M0 167c68 40\n 115.7 95.7 143 167h22c15.3 0 23-.3 23-1 0-1.3-5.3-13.7-16-37-18-35.3-41.3-69\n-70-101l-7-8h125l9 7c50.7 39.3 85 86 103 140h46c0-4.7-6.3-18.7-19-42-18-35.3\n-40-67.3-66-96l-9-9h399716v-40H284l9-9c26-28.7 48-60.7 66-96 12.7-23.333 19\n-37.333 19-42h-46c-18 54-52.3 100.7-103 140l-9 7H95l7-8c28.7-32 52-65.7 70-101\n 10.7-23.333 16-35.7 16-37 0-.7-7.7-1-23-1h-22C115.7 71.3 68 127 0 167z",twoheadrightarrow:"M400000 167\nc-68-40-115.7-95.7-143-167h-22c-15.3 0-23 .3-23 1 0 1.3 5.3 13.7 16 37 18 35.3\n 41.3 69 70 101l7 8h-125l-9-7c-50.7-39.3-85-86-103-140h-46c0 4.7 6.3 18.7 19 42\n 18 35.3 40 67.3 66 96l9 9H0v40h399716l-9 9c-26 28.7-48 60.7-66 96-12.7 23.333\n-19 37.333-19 42h46c18-54 52.3-100.7 103-140l9-7h125l-7 8c-28.7 32-52 65.7-70\n 101-10.7 23.333-16 35.7-16 37 0 .7 7.7 1 23 1h22c27.3-71.3 75-127 143-167z",tilde1:"M200 55.538c-77 0-168 73.953-177 73.953-3 0-7\n-2.175-9-5.437L2 97c-1-2-2-4-2-6 0-4 2-7 5-9l20-12C116 12 171 0 207 0c86 0\n 114 68 191 68 78 0 168-68 177-68 4 0 7 2 9 5l12 19c1 2.175 2 4.35 2 6.525 0\n 4.35-2 7.613-5 9.788l-19 13.05c-92 63.077-116.937 75.308-183 76.128\n-68.267.847-113-73.952-191-73.952z",tilde2:"M344 55.266c-142 0-300.638 81.316-311.5 86.418\n-8.01 3.762-22.5 10.91-23.5 5.562L1 120c-1-2-1-3-1-4 0-5 3-9 8-10l18.4-9C160.9\n 31.9 283 0 358 0c148 0 188 122 331 122s314-97 326-97c4 0 8 2 10 7l7 21.114\nc1 2.14 1 3.21 1 4.28 0 5.347-3 9.626-7 10.696l-22.3 12.622C852.6 158.372 751\n 181.476 676 181.476c-149 0-189-126.21-332-126.21z",tilde3:"M786 59C457 59 32 175.242 13 175.242c-6 0-10-3.457\n-11-10.37L.15 138c-1-7 3-12 10-13l19.2-6.4C378.4 40.7 634.3 0 804.3 0c337 0\n 411.8 157 746.8 157 328 0 754-112 773-112 5 0 10 3 11 9l1 14.075c1 8.066-.697\n 16.595-6.697 17.492l-21.052 7.31c-367.9 98.146-609.15 122.696-778.15 122.696\n -338 0-409-156.573-744-156.573z",tilde4:"M786 58C457 58 32 177.487 13 177.487c-6 0-10-3.345\n-11-10.035L.15 143c-1-7 3-12 10-13l22-6.7C381.2 35 637.15 0 807.15 0c337 0 409\n 177 744 177 328 0 754-127 773-127 5 0 10 3 11 9l1 14.794c1 7.805-3 13.38-9\n 14.495l-20.7 5.574c-366.85 99.79-607.3 139.372-776.3 139.372-338 0-409\n -175.236-744-175.236z",vec:"M377 20c0-5.333 1.833-10 5.5-14S391 0 397 0c4.667 0 8.667 1.667 12 5\n3.333 2.667 6.667 9 10 19 6.667 24.667 20.333 43.667 41 57 7.333 4.667 11\n10.667 11 18 0 6-1 10-3 12s-6.667 5-14 9c-28.667 14.667-53.667 35.667-75 63\n-1.333 1.333-3.167 3.5-5.5 6.5s-4 4.833-5 5.5c-1 .667-2.5 1.333-4.5 2s-4.333 1\n-7 1c-4.667 0-9.167-1.833-13.5-5.5S337 184 337 178c0-12.667 15.667-32.333 47-59\nH213l-171-1c-8.667-6-13-12.333-13-19 0-4.667 4.333-11.333 13-20h359\nc-16-25.333-24-45-24-59z",widehat1:"M529 0h5l519 115c5 1 9 5 9 10 0 1-1 2-1 3l-4 22\nc-1 5-5 9-11 9h-2L532 67 19 159h-2c-5 0-9-4-11-9l-5-22c-1-6 2-12 8-13z",widehat2:"M1181 0h2l1171 176c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 220h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",widehat3:"M1181 0h2l1171 236c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 280h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",widehat4:"M1181 0h2l1171 296c6 0 10 5 10 11l-2 23c-1 6-5 10\n-11 10h-1L1182 67 15 340h-1c-6 0-10-4-11-10l-2-23c-1-6 4-11 10-11z",widecheck1:"M529,159h5l519,-115c5,-1,9,-5,9,-10c0,-1,-1,-2,-1,-3l-4,-22c-1,\n-5,-5,-9,-11,-9h-2l-512,92l-513,-92h-2c-5,0,-9,4,-11,9l-5,22c-1,6,2,12,8,13z",widecheck2:"M1181,220h2l1171,-176c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,153l-1167,-153h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",widecheck3:"M1181,280h2l1171,-236c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,213l-1167,-213h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",widecheck4:"M1181,340h2l1171,-296c6,0,10,-5,10,-11l-2,-23c-1,-6,-5,-10,\n-11,-10h-1l-1168,273l-1167,-273h-1c-6,0,-10,4,-11,10l-2,23c-1,6,4,11,10,11z",baraboveleftarrow:"M400000 620h-399890l3 -3c68.7 -52.7 113.7 -120 135 -202\nc4 -14.7 6 -23 6 -25c0 -7.3 -7 -11 -21 -11c-8 0 -13.2 0.8 -15.5 2.5\nc-2.3 1.7 -4.2 5.8 -5.5 12.5c-1.3 4.7 -2.7 10.3 -4 17c-12 48.7 -34.8 92 -68.5 130\ns-74.2 66.3 -121.5 85c-10 4 -16 7.7 -18 11c0 8.7 6 14.3 18 17c47.3 18.7 87.8 47\n121.5 85s56.5 81.3 68.5 130c0.7 2 1.3 5 2 9s1.2 6.7 1.5 8c0.3 1.3 1 3.3 2 6\ns2.2 4.5 3.5 5.5c1.3 1 3.3 1.8 6 2.5s6 1 10 1c14 0 21 -3.7 21 -11\nc0 -2 -2 -10.3 -6 -25c-20 -79.3 -65 -146.7 -135 -202l-3 -3h399890z\nM100 620v40h399900v-40z M0 241v40h399900v-40zM0 241v40h399900v-40z",rightarrowabovebar:"M0 241v40h399891c-47.3 35.3-84 78-110 128-16.7 32\n-27.7 63.7-33 95 0 1.3-.2 2.7-.5 4-.3 1.3-.5 2.3-.5 3 0 7.3 6.7 11 20 11 8 0\n13.2-.8 15.5-2.5 2.3-1.7 4.2-5.5 5.5-11.5 2-13.3 5.7-27 11-41 14.7-44.7 39\n-84.5 73-119.5s73.7-60.2 119-75.5c6-2 9-5.7 9-11s-3-9-9-11c-45.3-15.3-85-40.5\n-119-75.5s-58.3-74.8-73-119.5c-4.7-14-8.3-27.3-11-40-1.3-6.7-3.2-10.8-5.5\n-12.5-2.3-1.7-7.5-2.5-15.5-2.5-14 0-21 3.7-21 11 0 2 2 10.3 6 25 20.7 83.3 67\n151.7 139 205zm96 379h399894v40H0zm0 0h399904v40H0z",baraboveshortleftharpoon:"M507,435c-4,4,-6.3,8.7,-7,14c0,5.3,0.7,9,2,11\nc1.3,2,5.3,5.3,12,10c90.7,54,156,130,196,228c3.3,10.7,6.3,16.3,9,17\nc2,0.7,5,1,9,1c0,0,5,0,5,0c10.7,0,16.7,-2,18,-6c2,-2.7,1,-9.7,-3,-21\nc-32,-87.3,-82.7,-157.7,-152,-211c0,0,-3,-3,-3,-3l399351,0l0,-40\nc-398570,0,-399437,0,-399437,0z M593 435 v40 H399500 v-40z\nM0 281 v-40 H399908 v40z M0 281 v-40 H399908 v40z",rightharpoonaboveshortbar:"M0,241 l0,40c399126,0,399993,0,399993,0\nc4.7,-4.7,7,-9.3,7,-14c0,-9.3,-3.7,-15.3,-11,-18c-92.7,-56.7,-159,-133.7,-199,\n-231c-3.3,-9.3,-6,-14.7,-8,-16c-2,-1.3,-7,-2,-15,-2c-10.7,0,-16.7,2,-18,6\nc-2,2.7,-1,9.7,3,21c15.3,42,36.7,81.8,64,119.5c27.3,37.7,58,69.2,92,94.5z\nM0 241 v40 H399908 v-40z M0 475 v-40 H399500 v40z M0 475 v-40 H399500 v40z",shortbaraboveleftharpoon:"M7,435c-4,4,-6.3,8.7,-7,14c0,5.3,0.7,9,2,11\nc1.3,2,5.3,5.3,12,10c90.7,54,156,130,196,228c3.3,10.7,6.3,16.3,9,17c2,0.7,5,1,9,\n1c0,0,5,0,5,0c10.7,0,16.7,-2,18,-6c2,-2.7,1,-9.7,-3,-21c-32,-87.3,-82.7,-157.7,\n-152,-211c0,0,-3,-3,-3,-3l399907,0l0,-40c-399126,0,-399993,0,-399993,0z\nM93 435 v40 H400000 v-40z M500 241 v40 H400000 v-40z M500 241 v40 H400000 v-40z",shortrightharpoonabovebar:"M53,241l0,40c398570,0,399437,0,399437,0\nc4.7,-4.7,7,-9.3,7,-14c0,-9.3,-3.7,-15.3,-11,-18c-92.7,-56.7,-159,-133.7,-199,\n-231c-3.3,-9.3,-6,-14.7,-8,-16c-2,-1.3,-7,-2,-15,-2c-10.7,0,-16.7,2,-18,6\nc-2,2.7,-1,9.7,3,21c15.3,42,36.7,81.8,64,119.5c27.3,37.7,58,69.2,92,94.5z\nM500 241 v40 H399408 v-40z M500 435 v40 H400000 v-40z"},A=function(){function t(t){this.children=void 0,this.classes=void 0,this.height=void 0,this.depth=void 0,this.maxFontSize=void 0,this.style=void 0,this.children=t,this.classes=[],this.height=0,this.depth=0,this.maxFontSize=0,this.style={};}var e=t.prototype;return e.hasClass=function(t){return c.contains(this.classes,t)},e.toNode=function(){for(var t=document.createDocumentFragment(),e=0;e<this.children.length;e++)t.appendChild(this.children[e].toNode());return t},e.toMarkup=function(){for(var t="",e=0;e<this.children.length;e++)t+=this.children[e].toMarkup();return t},e.toText=function(){var t=function(t){return t.toText()};return this.children.map(t).join("")},t}(),T=function(t){return t.filter(function(t){return t}).join(" ")},B=function(t,e,r){if(this.classes=t||[],this.attributes={},this.height=0,this.depth=0,this.maxFontSize=0,this.style=r||{},e){e.style.isTight()&&this.classes.push("mtight");var a=e.getColor();a&&(this.style.color=a);}},C=function(t){var e=document.createElement(t);for(var r in e.className=T(this.classes),this.style)this.style.hasOwnProperty(r)&&(e.style[r]=this.style[r]);for(var a in this.attributes)this.attributes.hasOwnProperty(a)&&e.setAttribute(a,this.attributes[a]);for(var n=0;n<this.children.length;n++)e.appendChild(this.children[n].toNode());return e},q=function(t){var e="<"+t;this.classes.length&&(e+=' class="'+c.escape(T(this.classes))+'"');var r="";for(var a in this.style)this.style.hasOwnProperty(a)&&(r+=c.hyphenate(a)+":"+this.style[a]+";");for(var n in r&&(e+=' style="'+c.escape(r)+'"'),this.attributes)this.attributes.hasOwnProperty(n)&&(e+=" "+n+'="'+c.escape(this.attributes[n])+'"');e+=">";for(var i=0;i<this.children.length;i++)e+=this.children[i].toMarkup();return e+="</"+t+">"},N=function(){function t(t,e,r,a){this.children=void 0,this.attributes=void 0,this.classes=void 0,this.height=void 0,this.depth=void 0,this.width=void 0,this.maxFontSize=void 0,this.style=void 0,B.call(this,t,r,a),this.children=e||[];}var e=t.prototype;return e.setAttribute=function(t,e){this.attributes[t]=e;},e.hasClass=function(t){return c.contains(this.classes,t)},e.toNode=function(){return C.call(this,"span")},e.toMarkup=function(){return q.call(this,"span")},t}(),I=function(){function t(t,e,r,a){this.children=void 0,this.attributes=void 0,this.classes=void 0,this.height=void 0,this.depth=void 0,this.maxFontSize=void 0,this.style=void 0,B.call(this,e,a),this.children=r||[],this.setAttribute("href",t);}var e=t.prototype;return e.setAttribute=function(t,e){this.attributes[t]=e;},e.hasClass=function(t){return c.contains(this.classes,t)},e.toNode=function(){return C.call(this,"a")},e.toMarkup=function(){return q.call(this,"a")},t}(),O=function(){function t(t,e,r){this.src=void 0,this.alt=void 0,this.classes=void 0,this.height=void 0,this.depth=void 0,this.maxFontSize=void 0,this.style=void 0,this.alt=e,this.src=t,this.classes=["mord"],this.style=r;}var e=t.prototype;return e.hasClass=function(t){return c.contains(this.classes,t)},e.toNode=function(){var t=document.createElement("img");for(var e in t.src=this.src,t.alt=this.alt,t.className="mord",this.style)this.style.hasOwnProperty(e)&&(t.style[e]=this.style[e]);return t},e.toMarkup=function(){var t="<img  src='"+this.src+" 'alt='"+this.alt+"' ",e="";for(var r in this.style)this.style.hasOwnProperty(r)&&(e+=c.hyphenate(r)+":"+this.style[r]+";");return e&&(t+=' style="'+c.escape(e)+'"'),t+="'/>"},t}(),R={"\xee":"\u0131\u0302","\xef":"\u0131\u0308","\xed":"\u0131\u0301","\xec":"\u0131\u0300"},E=function(){function t(t,e,r,a,n,i,o,s){this.text=void 0,this.height=void 0,this.depth=void 0,this.italic=void 0,this.skew=void 0,this.width=void 0,this.maxFontSize=void 0,this.classes=void 0,this.style=void 0,this.text=t,this.height=e||0,this.depth=r||0,this.italic=a||0,this.skew=n||0,this.width=i||0,this.classes=o||[],this.style=s||{},this.maxFontSize=0;var l=function(t){for(var e=0;e<k.length;e++)for(var r=k[e],a=0;a<r.blocks.length;a++){var n=r.blocks[a];if(t>=n[0]&&t<=n[1])return r.name}return null}(this.text.charCodeAt(0));l&&this.classes.push(l+"_fallback"),/[\xee\xef\xed\xec]/.test(this.text)&&(this.text=R[this.text]);}var e=t.prototype;return e.hasClass=function(t){return c.contains(this.classes,t)},e.toNode=function(){var t=document.createTextNode(this.text),e=null;for(var r in this.italic>0&&((e=document.createElement("span")).style.marginRight=this.italic+"em"),this.classes.length>0&&((e=e||document.createElement("span")).className=T(this.classes)),this.style)this.style.hasOwnProperty(r)&&((e=e||document.createElement("span")).style[r]=this.style[r]);return e?(e.appendChild(t),e):t},e.toMarkup=function(){var t=!1,e="<span";this.classes.length&&(t=!0,e+=' class="',e+=c.escape(T(this.classes)),e+='"');var r="";for(var a in this.italic>0&&(r+="margin-right:"+this.italic+"em;"),this.style)this.style.hasOwnProperty(a)&&(r+=c.hyphenate(a)+":"+this.style[a]+";");r&&(t=!0,e+=' style="'+c.escape(r)+'"');var n=c.escape(this.text);return t?(e+=">",e+=n,e+="</span>"):n},t}(),L=function(){function t(t,e){this.children=void 0,this.attributes=void 0,this.children=t||[],this.attributes=e||{};}var e=t.prototype;return e.toNode=function(){var t=document.createElementNS("http://www.w3.org/2000/svg","svg");for(var e in this.attributes)Object.prototype.hasOwnProperty.call(this.attributes,e)&&t.setAttribute(e,this.attributes[e]);for(var r=0;r<this.children.length;r++)t.appendChild(this.children[r].toNode());return t},e.toMarkup=function(){var t="<svg";for(var e in this.attributes)Object.prototype.hasOwnProperty.call(this.attributes,e)&&(t+=" "+e+"='"+this.attributes[e]+"'");t+=">";for(var r=0;r<this.children.length;r++)t+=this.children[r].toMarkup();return t+="</svg>"},t}(),P=function(){function t(t,e){this.pathName=void 0,this.alternate=void 0,this.pathName=t,this.alternate=e;}var e=t.prototype;return e.toNode=function(){var t=document.createElementNS("http://www.w3.org/2000/svg","path");return this.alternate?t.setAttribute("d",this.alternate):t.setAttribute("d",z[this.pathName]),t},e.toMarkup=function(){return this.alternate?"<path d='"+this.alternate+"'/>":"<path d='"+z[this.pathName]+"'/>"},t}(),D=function(){function t(t){this.attributes=void 0,this.attributes=t||{};}var e=t.prototype;return e.toNode=function(){var t=document.createElementNS("http://www.w3.org/2000/svg","line");for(var e in this.attributes)Object.prototype.hasOwnProperty.call(this.attributes,e)&&t.setAttribute(e,this.attributes[e]);return t},e.toMarkup=function(){var t="<line";for(var e in this.attributes)Object.prototype.hasOwnProperty.call(this.attributes,e)&&(t+=" "+e+"='"+this.attributes[e]+"'");return t+="/>"},t}();function H(t){if(t instanceof E)return t;throw new Error("Expected symbolNode but got "+String(t)+".")}var F={"AMS-Regular":{32:[0,0,0,0,.25],65:[0,.68889,0,0,.72222],66:[0,.68889,0,0,.66667],67:[0,.68889,0,0,.72222],68:[0,.68889,0,0,.72222],69:[0,.68889,0,0,.66667],70:[0,.68889,0,0,.61111],71:[0,.68889,0,0,.77778],72:[0,.68889,0,0,.77778],73:[0,.68889,0,0,.38889],74:[.16667,.68889,0,0,.5],75:[0,.68889,0,0,.77778],76:[0,.68889,0,0,.66667],77:[0,.68889,0,0,.94445],78:[0,.68889,0,0,.72222],79:[.16667,.68889,0,0,.77778],80:[0,.68889,0,0,.61111],81:[.16667,.68889,0,0,.77778],82:[0,.68889,0,0,.72222],83:[0,.68889,0,0,.55556],84:[0,.68889,0,0,.66667],85:[0,.68889,0,0,.72222],86:[0,.68889,0,0,.72222],87:[0,.68889,0,0,1],88:[0,.68889,0,0,.72222],89:[0,.68889,0,0,.72222],90:[0,.68889,0,0,.66667],107:[0,.68889,0,0,.55556],160:[0,0,0,0,.25],165:[0,.675,.025,0,.75],174:[.15559,.69224,0,0,.94666],240:[0,.68889,0,0,.55556],295:[0,.68889,0,0,.54028],710:[0,.825,0,0,2.33334],732:[0,.9,0,0,2.33334],770:[0,.825,0,0,2.33334],771:[0,.9,0,0,2.33334],989:[.08167,.58167,0,0,.77778],1008:[0,.43056,.04028,0,.66667],8245:[0,.54986,0,0,.275],8463:[0,.68889,0,0,.54028],8487:[0,.68889,0,0,.72222],8498:[0,.68889,0,0,.55556],8502:[0,.68889,0,0,.66667],8503:[0,.68889,0,0,.44445],8504:[0,.68889,0,0,.66667],8513:[0,.68889,0,0,.63889],8592:[-.03598,.46402,0,0,.5],8594:[-.03598,.46402,0,0,.5],8602:[-.13313,.36687,0,0,1],8603:[-.13313,.36687,0,0,1],8606:[.01354,.52239,0,0,1],8608:[.01354,.52239,0,0,1],8610:[.01354,.52239,0,0,1.11111],8611:[.01354,.52239,0,0,1.11111],8619:[0,.54986,0,0,1],8620:[0,.54986,0,0,1],8621:[-.13313,.37788,0,0,1.38889],8622:[-.13313,.36687,0,0,1],8624:[0,.69224,0,0,.5],8625:[0,.69224,0,0,.5],8630:[0,.43056,0,0,1],8631:[0,.43056,0,0,1],8634:[.08198,.58198,0,0,.77778],8635:[.08198,.58198,0,0,.77778],8638:[.19444,.69224,0,0,.41667],8639:[.19444,.69224,0,0,.41667],8642:[.19444,.69224,0,0,.41667],8643:[.19444,.69224,0,0,.41667],8644:[.1808,.675,0,0,1],8646:[.1808,.675,0,0,1],8647:[.1808,.675,0,0,1],8648:[.19444,.69224,0,0,.83334],8649:[.1808,.675,0,0,1],8650:[.19444,.69224,0,0,.83334],8651:[.01354,.52239,0,0,1],8652:[.01354,.52239,0,0,1],8653:[-.13313,.36687,0,0,1],8654:[-.13313,.36687,0,0,1],8655:[-.13313,.36687,0,0,1],8666:[.13667,.63667,0,0,1],8667:[.13667,.63667,0,0,1],8669:[-.13313,.37788,0,0,1],8672:[-.064,.437,0,0,1.334],8674:[-.064,.437,0,0,1.334],8705:[0,.825,0,0,.5],8708:[0,.68889,0,0,.55556],8709:[.08167,.58167,0,0,.77778],8717:[0,.43056,0,0,.42917],8722:[-.03598,.46402,0,0,.5],8724:[.08198,.69224,0,0,.77778],8726:[.08167,.58167,0,0,.77778],8733:[0,.69224,0,0,.77778],8736:[0,.69224,0,0,.72222],8737:[0,.69224,0,0,.72222],8738:[.03517,.52239,0,0,.72222],8739:[.08167,.58167,0,0,.22222],8740:[.25142,.74111,0,0,.27778],8741:[.08167,.58167,0,0,.38889],8742:[.25142,.74111,0,0,.5],8756:[0,.69224,0,0,.66667],8757:[0,.69224,0,0,.66667],8764:[-.13313,.36687,0,0,.77778],8765:[-.13313,.37788,0,0,.77778],8769:[-.13313,.36687,0,0,.77778],8770:[-.03625,.46375,0,0,.77778],8774:[.30274,.79383,0,0,.77778],8776:[-.01688,.48312,0,0,.77778],8778:[.08167,.58167,0,0,.77778],8782:[.06062,.54986,0,0,.77778],8783:[.06062,.54986,0,0,.77778],8785:[.08198,.58198,0,0,.77778],8786:[.08198,.58198,0,0,.77778],8787:[.08198,.58198,0,0,.77778],8790:[0,.69224,0,0,.77778],8791:[.22958,.72958,0,0,.77778],8796:[.08198,.91667,0,0,.77778],8806:[.25583,.75583,0,0,.77778],8807:[.25583,.75583,0,0,.77778],8808:[.25142,.75726,0,0,.77778],8809:[.25142,.75726,0,0,.77778],8812:[.25583,.75583,0,0,.5],8814:[.20576,.70576,0,0,.77778],8815:[.20576,.70576,0,0,.77778],8816:[.30274,.79383,0,0,.77778],8817:[.30274,.79383,0,0,.77778],8818:[.22958,.72958,0,0,.77778],8819:[.22958,.72958,0,0,.77778],8822:[.1808,.675,0,0,.77778],8823:[.1808,.675,0,0,.77778],8828:[.13667,.63667,0,0,.77778],8829:[.13667,.63667,0,0,.77778],8830:[.22958,.72958,0,0,.77778],8831:[.22958,.72958,0,0,.77778],8832:[.20576,.70576,0,0,.77778],8833:[.20576,.70576,0,0,.77778],8840:[.30274,.79383,0,0,.77778],8841:[.30274,.79383,0,0,.77778],8842:[.13597,.63597,0,0,.77778],8843:[.13597,.63597,0,0,.77778],8847:[.03517,.54986,0,0,.77778],8848:[.03517,.54986,0,0,.77778],8858:[.08198,.58198,0,0,.77778],8859:[.08198,.58198,0,0,.77778],8861:[.08198,.58198,0,0,.77778],8862:[0,.675,0,0,.77778],8863:[0,.675,0,0,.77778],8864:[0,.675,0,0,.77778],8865:[0,.675,0,0,.77778],8872:[0,.69224,0,0,.61111],8873:[0,.69224,0,0,.72222],8874:[0,.69224,0,0,.88889],8876:[0,.68889,0,0,.61111],8877:[0,.68889,0,0,.61111],8878:[0,.68889,0,0,.72222],8879:[0,.68889,0,0,.72222],8882:[.03517,.54986,0,0,.77778],8883:[.03517,.54986,0,0,.77778],8884:[.13667,.63667,0,0,.77778],8885:[.13667,.63667,0,0,.77778],8888:[0,.54986,0,0,1.11111],8890:[.19444,.43056,0,0,.55556],8891:[.19444,.69224,0,0,.61111],8892:[.19444,.69224,0,0,.61111],8901:[0,.54986,0,0,.27778],8903:[.08167,.58167,0,0,.77778],8905:[.08167,.58167,0,0,.77778],8906:[.08167,.58167,0,0,.77778],8907:[0,.69224,0,0,.77778],8908:[0,.69224,0,0,.77778],8909:[-.03598,.46402,0,0,.77778],8910:[0,.54986,0,0,.76042],8911:[0,.54986,0,0,.76042],8912:[.03517,.54986,0,0,.77778],8913:[.03517,.54986,0,0,.77778],8914:[0,.54986,0,0,.66667],8915:[0,.54986,0,0,.66667],8916:[0,.69224,0,0,.66667],8918:[.0391,.5391,0,0,.77778],8919:[.0391,.5391,0,0,.77778],8920:[.03517,.54986,0,0,1.33334],8921:[.03517,.54986,0,0,1.33334],8922:[.38569,.88569,0,0,.77778],8923:[.38569,.88569,0,0,.77778],8926:[.13667,.63667,0,0,.77778],8927:[.13667,.63667,0,0,.77778],8928:[.30274,.79383,0,0,.77778],8929:[.30274,.79383,0,0,.77778],8934:[.23222,.74111,0,0,.77778],8935:[.23222,.74111,0,0,.77778],8936:[.23222,.74111,0,0,.77778],8937:[.23222,.74111,0,0,.77778],8938:[.20576,.70576,0,0,.77778],8939:[.20576,.70576,0,0,.77778],8940:[.30274,.79383,0,0,.77778],8941:[.30274,.79383,0,0,.77778],8994:[.19444,.69224,0,0,.77778],8995:[.19444,.69224,0,0,.77778],9416:[.15559,.69224,0,0,.90222],9484:[0,.69224,0,0,.5],9488:[0,.69224,0,0,.5],9492:[0,.37788,0,0,.5],9496:[0,.37788,0,0,.5],9585:[.19444,.68889,0,0,.88889],9586:[.19444,.74111,0,0,.88889],9632:[0,.675,0,0,.77778],9633:[0,.675,0,0,.77778],9650:[0,.54986,0,0,.72222],9651:[0,.54986,0,0,.72222],9654:[.03517,.54986,0,0,.77778],9660:[0,.54986,0,0,.72222],9661:[0,.54986,0,0,.72222],9664:[.03517,.54986,0,0,.77778],9674:[.11111,.69224,0,0,.66667],9733:[.19444,.69224,0,0,.94445],10003:[0,.69224,0,0,.83334],10016:[0,.69224,0,0,.83334],10731:[.11111,.69224,0,0,.66667],10846:[.19444,.75583,0,0,.61111],10877:[.13667,.63667,0,0,.77778],10878:[.13667,.63667,0,0,.77778],10885:[.25583,.75583,0,0,.77778],10886:[.25583,.75583,0,0,.77778],10887:[.13597,.63597,0,0,.77778],10888:[.13597,.63597,0,0,.77778],10889:[.26167,.75726,0,0,.77778],10890:[.26167,.75726,0,0,.77778],10891:[.48256,.98256,0,0,.77778],10892:[.48256,.98256,0,0,.77778],10901:[.13667,.63667,0,0,.77778],10902:[.13667,.63667,0,0,.77778],10933:[.25142,.75726,0,0,.77778],10934:[.25142,.75726,0,0,.77778],10935:[.26167,.75726,0,0,.77778],10936:[.26167,.75726,0,0,.77778],10937:[.26167,.75726,0,0,.77778],10938:[.26167,.75726,0,0,.77778],10949:[.25583,.75583,0,0,.77778],10950:[.25583,.75583,0,0,.77778],10955:[.28481,.79383,0,0,.77778],10956:[.28481,.79383,0,0,.77778],57350:[.08167,.58167,0,0,.22222],57351:[.08167,.58167,0,0,.38889],57352:[.08167,.58167,0,0,.77778],57353:[0,.43056,.04028,0,.66667],57356:[.25142,.75726,0,0,.77778],57357:[.25142,.75726,0,0,.77778],57358:[.41951,.91951,0,0,.77778],57359:[.30274,.79383,0,0,.77778],57360:[.30274,.79383,0,0,.77778],57361:[.41951,.91951,0,0,.77778],57366:[.25142,.75726,0,0,.77778],57367:[.25142,.75726,0,0,.77778],57368:[.25142,.75726,0,0,.77778],57369:[.25142,.75726,0,0,.77778],57370:[.13597,.63597,0,0,.77778],57371:[.13597,.63597,0,0,.77778]},"Caligraphic-Regular":{32:[0,0,0,0,.25],65:[0,.68333,0,.19445,.79847],66:[0,.68333,.03041,.13889,.65681],67:[0,.68333,.05834,.13889,.52653],68:[0,.68333,.02778,.08334,.77139],69:[0,.68333,.08944,.11111,.52778],70:[0,.68333,.09931,.11111,.71875],71:[.09722,.68333,.0593,.11111,.59487],72:[0,.68333,.00965,.11111,.84452],73:[0,.68333,.07382,0,.54452],74:[.09722,.68333,.18472,.16667,.67778],75:[0,.68333,.01445,.05556,.76195],76:[0,.68333,0,.13889,.68972],77:[0,.68333,0,.13889,1.2009],78:[0,.68333,.14736,.08334,.82049],79:[0,.68333,.02778,.11111,.79611],80:[0,.68333,.08222,.08334,.69556],81:[.09722,.68333,0,.11111,.81667],82:[0,.68333,0,.08334,.8475],83:[0,.68333,.075,.13889,.60556],84:[0,.68333,.25417,0,.54464],85:[0,.68333,.09931,.08334,.62583],86:[0,.68333,.08222,0,.61278],87:[0,.68333,.08222,.08334,.98778],88:[0,.68333,.14643,.13889,.7133],89:[.09722,.68333,.08222,.08334,.66834],90:[0,.68333,.07944,.13889,.72473],160:[0,0,0,0,.25]},"Fraktur-Regular":{32:[0,0,0,0,.25],33:[0,.69141,0,0,.29574],34:[0,.69141,0,0,.21471],38:[0,.69141,0,0,.73786],39:[0,.69141,0,0,.21201],40:[.24982,.74947,0,0,.38865],41:[.24982,.74947,0,0,.38865],42:[0,.62119,0,0,.27764],43:[.08319,.58283,0,0,.75623],44:[0,.10803,0,0,.27764],45:[.08319,.58283,0,0,.75623],46:[0,.10803,0,0,.27764],47:[.24982,.74947,0,0,.50181],48:[0,.47534,0,0,.50181],49:[0,.47534,0,0,.50181],50:[0,.47534,0,0,.50181],51:[.18906,.47534,0,0,.50181],52:[.18906,.47534,0,0,.50181],53:[.18906,.47534,0,0,.50181],54:[0,.69141,0,0,.50181],55:[.18906,.47534,0,0,.50181],56:[0,.69141,0,0,.50181],57:[.18906,.47534,0,0,.50181],58:[0,.47534,0,0,.21606],59:[.12604,.47534,0,0,.21606],61:[-.13099,.36866,0,0,.75623],63:[0,.69141,0,0,.36245],65:[0,.69141,0,0,.7176],66:[0,.69141,0,0,.88397],67:[0,.69141,0,0,.61254],68:[0,.69141,0,0,.83158],69:[0,.69141,0,0,.66278],70:[.12604,.69141,0,0,.61119],71:[0,.69141,0,0,.78539],72:[.06302,.69141,0,0,.7203],73:[0,.69141,0,0,.55448],74:[.12604,.69141,0,0,.55231],75:[0,.69141,0,0,.66845],76:[0,.69141,0,0,.66602],77:[0,.69141,0,0,1.04953],78:[0,.69141,0,0,.83212],79:[0,.69141,0,0,.82699],80:[.18906,.69141,0,0,.82753],81:[.03781,.69141,0,0,.82699],82:[0,.69141,0,0,.82807],83:[0,.69141,0,0,.82861],84:[0,.69141,0,0,.66899],85:[0,.69141,0,0,.64576],86:[0,.69141,0,0,.83131],87:[0,.69141,0,0,1.04602],88:[0,.69141,0,0,.71922],89:[.18906,.69141,0,0,.83293],90:[.12604,.69141,0,0,.60201],91:[.24982,.74947,0,0,.27764],93:[.24982,.74947,0,0,.27764],94:[0,.69141,0,0,.49965],97:[0,.47534,0,0,.50046],98:[0,.69141,0,0,.51315],99:[0,.47534,0,0,.38946],100:[0,.62119,0,0,.49857],101:[0,.47534,0,0,.40053],102:[.18906,.69141,0,0,.32626],103:[.18906,.47534,0,0,.5037],104:[.18906,.69141,0,0,.52126],105:[0,.69141,0,0,.27899],106:[0,.69141,0,0,.28088],107:[0,.69141,0,0,.38946],108:[0,.69141,0,0,.27953],109:[0,.47534,0,0,.76676],110:[0,.47534,0,0,.52666],111:[0,.47534,0,0,.48885],112:[.18906,.52396,0,0,.50046],113:[.18906,.47534,0,0,.48912],114:[0,.47534,0,0,.38919],115:[0,.47534,0,0,.44266],116:[0,.62119,0,0,.33301],117:[0,.47534,0,0,.5172],118:[0,.52396,0,0,.5118],119:[0,.52396,0,0,.77351],120:[.18906,.47534,0,0,.38865],121:[.18906,.47534,0,0,.49884],122:[.18906,.47534,0,0,.39054],160:[0,0,0,0,.25],8216:[0,.69141,0,0,.21471],8217:[0,.69141,0,0,.21471],58112:[0,.62119,0,0,.49749],58113:[0,.62119,0,0,.4983],58114:[.18906,.69141,0,0,.33328],58115:[.18906,.69141,0,0,.32923],58116:[.18906,.47534,0,0,.50343],58117:[0,.69141,0,0,.33301],58118:[0,.62119,0,0,.33409],58119:[0,.47534,0,0,.50073]},"Main-Bold":{32:[0,0,0,0,.25],33:[0,.69444,0,0,.35],34:[0,.69444,0,0,.60278],35:[.19444,.69444,0,0,.95833],36:[.05556,.75,0,0,.575],37:[.05556,.75,0,0,.95833],38:[0,.69444,0,0,.89444],39:[0,.69444,0,0,.31944],40:[.25,.75,0,0,.44722],41:[.25,.75,0,0,.44722],42:[0,.75,0,0,.575],43:[.13333,.63333,0,0,.89444],44:[.19444,.15556,0,0,.31944],45:[0,.44444,0,0,.38333],46:[0,.15556,0,0,.31944],47:[.25,.75,0,0,.575],48:[0,.64444,0,0,.575],49:[0,.64444,0,0,.575],50:[0,.64444,0,0,.575],51:[0,.64444,0,0,.575],52:[0,.64444,0,0,.575],53:[0,.64444,0,0,.575],54:[0,.64444,0,0,.575],55:[0,.64444,0,0,.575],56:[0,.64444,0,0,.575],57:[0,.64444,0,0,.575],58:[0,.44444,0,0,.31944],59:[.19444,.44444,0,0,.31944],60:[.08556,.58556,0,0,.89444],61:[-.10889,.39111,0,0,.89444],62:[.08556,.58556,0,0,.89444],63:[0,.69444,0,0,.54305],64:[0,.69444,0,0,.89444],65:[0,.68611,0,0,.86944],66:[0,.68611,0,0,.81805],67:[0,.68611,0,0,.83055],68:[0,.68611,0,0,.88194],69:[0,.68611,0,0,.75555],70:[0,.68611,0,0,.72361],71:[0,.68611,0,0,.90416],72:[0,.68611,0,0,.9],73:[0,.68611,0,0,.43611],74:[0,.68611,0,0,.59444],75:[0,.68611,0,0,.90138],76:[0,.68611,0,0,.69166],77:[0,.68611,0,0,1.09166],78:[0,.68611,0,0,.9],79:[0,.68611,0,0,.86388],80:[0,.68611,0,0,.78611],81:[.19444,.68611,0,0,.86388],82:[0,.68611,0,0,.8625],83:[0,.68611,0,0,.63889],84:[0,.68611,0,0,.8],85:[0,.68611,0,0,.88472],86:[0,.68611,.01597,0,.86944],87:[0,.68611,.01597,0,1.18888],88:[0,.68611,0,0,.86944],89:[0,.68611,.02875,0,.86944],90:[0,.68611,0,0,.70277],91:[.25,.75,0,0,.31944],92:[.25,.75,0,0,.575],93:[.25,.75,0,0,.31944],94:[0,.69444,0,0,.575],95:[.31,.13444,.03194,0,.575],97:[0,.44444,0,0,.55902],98:[0,.69444,0,0,.63889],99:[0,.44444,0,0,.51111],100:[0,.69444,0,0,.63889],101:[0,.44444,0,0,.52708],102:[0,.69444,.10903,0,.35139],103:[.19444,.44444,.01597,0,.575],104:[0,.69444,0,0,.63889],105:[0,.69444,0,0,.31944],106:[.19444,.69444,0,0,.35139],107:[0,.69444,0,0,.60694],108:[0,.69444,0,0,.31944],109:[0,.44444,0,0,.95833],110:[0,.44444,0,0,.63889],111:[0,.44444,0,0,.575],112:[.19444,.44444,0,0,.63889],113:[.19444,.44444,0,0,.60694],114:[0,.44444,0,0,.47361],115:[0,.44444,0,0,.45361],116:[0,.63492,0,0,.44722],117:[0,.44444,0,0,.63889],118:[0,.44444,.01597,0,.60694],119:[0,.44444,.01597,0,.83055],120:[0,.44444,0,0,.60694],121:[.19444,.44444,.01597,0,.60694],122:[0,.44444,0,0,.51111],123:[.25,.75,0,0,.575],124:[.25,.75,0,0,.31944],125:[.25,.75,0,0,.575],126:[.35,.34444,0,0,.575],160:[0,0,0,0,.25],163:[0,.69444,0,0,.86853],168:[0,.69444,0,0,.575],172:[0,.44444,0,0,.76666],176:[0,.69444,0,0,.86944],177:[.13333,.63333,0,0,.89444],184:[.17014,0,0,0,.51111],198:[0,.68611,0,0,1.04166],215:[.13333,.63333,0,0,.89444],216:[.04861,.73472,0,0,.89444],223:[0,.69444,0,0,.59722],230:[0,.44444,0,0,.83055],247:[.13333,.63333,0,0,.89444],248:[.09722,.54167,0,0,.575],305:[0,.44444,0,0,.31944],338:[0,.68611,0,0,1.16944],339:[0,.44444,0,0,.89444],567:[.19444,.44444,0,0,.35139],710:[0,.69444,0,0,.575],711:[0,.63194,0,0,.575],713:[0,.59611,0,0,.575],714:[0,.69444,0,0,.575],715:[0,.69444,0,0,.575],728:[0,.69444,0,0,.575],729:[0,.69444,0,0,.31944],730:[0,.69444,0,0,.86944],732:[0,.69444,0,0,.575],733:[0,.69444,0,0,.575],915:[0,.68611,0,0,.69166],916:[0,.68611,0,0,.95833],920:[0,.68611,0,0,.89444],923:[0,.68611,0,0,.80555],926:[0,.68611,0,0,.76666],928:[0,.68611,0,0,.9],931:[0,.68611,0,0,.83055],933:[0,.68611,0,0,.89444],934:[0,.68611,0,0,.83055],936:[0,.68611,0,0,.89444],937:[0,.68611,0,0,.83055],8211:[0,.44444,.03194,0,.575],8212:[0,.44444,.03194,0,1.14999],8216:[0,.69444,0,0,.31944],8217:[0,.69444,0,0,.31944],8220:[0,.69444,0,0,.60278],8221:[0,.69444,0,0,.60278],8224:[.19444,.69444,0,0,.51111],8225:[.19444,.69444,0,0,.51111],8242:[0,.55556,0,0,.34444],8407:[0,.72444,.15486,0,.575],8463:[0,.69444,0,0,.66759],8465:[0,.69444,0,0,.83055],8467:[0,.69444,0,0,.47361],8472:[.19444,.44444,0,0,.74027],8476:[0,.69444,0,0,.83055],8501:[0,.69444,0,0,.70277],8592:[-.10889,.39111,0,0,1.14999],8593:[.19444,.69444,0,0,.575],8594:[-.10889,.39111,0,0,1.14999],8595:[.19444,.69444,0,0,.575],8596:[-.10889,.39111,0,0,1.14999],8597:[.25,.75,0,0,.575],8598:[.19444,.69444,0,0,1.14999],8599:[.19444,.69444,0,0,1.14999],8600:[.19444,.69444,0,0,1.14999],8601:[.19444,.69444,0,0,1.14999],8636:[-.10889,.39111,0,0,1.14999],8637:[-.10889,.39111,0,0,1.14999],8640:[-.10889,.39111,0,0,1.14999],8641:[-.10889,.39111,0,0,1.14999],8656:[-.10889,.39111,0,0,1.14999],8657:[.19444,.69444,0,0,.70277],8658:[-.10889,.39111,0,0,1.14999],8659:[.19444,.69444,0,0,.70277],8660:[-.10889,.39111,0,0,1.14999],8661:[.25,.75,0,0,.70277],8704:[0,.69444,0,0,.63889],8706:[0,.69444,.06389,0,.62847],8707:[0,.69444,0,0,.63889],8709:[.05556,.75,0,0,.575],8711:[0,.68611,0,0,.95833],8712:[.08556,.58556,0,0,.76666],8715:[.08556,.58556,0,0,.76666],8722:[.13333,.63333,0,0,.89444],8723:[.13333,.63333,0,0,.89444],8725:[.25,.75,0,0,.575],8726:[.25,.75,0,0,.575],8727:[-.02778,.47222,0,0,.575],8728:[-.02639,.47361,0,0,.575],8729:[-.02639,.47361,0,0,.575],8730:[.18,.82,0,0,.95833],8733:[0,.44444,0,0,.89444],8734:[0,.44444,0,0,1.14999],8736:[0,.69224,0,0,.72222],8739:[.25,.75,0,0,.31944],8741:[.25,.75,0,0,.575],8743:[0,.55556,0,0,.76666],8744:[0,.55556,0,0,.76666],8745:[0,.55556,0,0,.76666],8746:[0,.55556,0,0,.76666],8747:[.19444,.69444,.12778,0,.56875],8764:[-.10889,.39111,0,0,.89444],8768:[.19444,.69444,0,0,.31944],8771:[.00222,.50222,0,0,.89444],8776:[.02444,.52444,0,0,.89444],8781:[.00222,.50222,0,0,.89444],8801:[.00222,.50222,0,0,.89444],8804:[.19667,.69667,0,0,.89444],8805:[.19667,.69667,0,0,.89444],8810:[.08556,.58556,0,0,1.14999],8811:[.08556,.58556,0,0,1.14999],8826:[.08556,.58556,0,0,.89444],8827:[.08556,.58556,0,0,.89444],8834:[.08556,.58556,0,0,.89444],8835:[.08556,.58556,0,0,.89444],8838:[.19667,.69667,0,0,.89444],8839:[.19667,.69667,0,0,.89444],8846:[0,.55556,0,0,.76666],8849:[.19667,.69667,0,0,.89444],8850:[.19667,.69667,0,0,.89444],8851:[0,.55556,0,0,.76666],8852:[0,.55556,0,0,.76666],8853:[.13333,.63333,0,0,.89444],8854:[.13333,.63333,0,0,.89444],8855:[.13333,.63333,0,0,.89444],8856:[.13333,.63333,0,0,.89444],8857:[.13333,.63333,0,0,.89444],8866:[0,.69444,0,0,.70277],8867:[0,.69444,0,0,.70277],8868:[0,.69444,0,0,.89444],8869:[0,.69444,0,0,.89444],8900:[-.02639,.47361,0,0,.575],8901:[-.02639,.47361,0,0,.31944],8902:[-.02778,.47222,0,0,.575],8968:[.25,.75,0,0,.51111],8969:[.25,.75,0,0,.51111],8970:[.25,.75,0,0,.51111],8971:[.25,.75,0,0,.51111],8994:[-.13889,.36111,0,0,1.14999],8995:[-.13889,.36111,0,0,1.14999],9651:[.19444,.69444,0,0,1.02222],9657:[-.02778,.47222,0,0,.575],9661:[.19444,.69444,0,0,1.02222],9667:[-.02778,.47222,0,0,.575],9711:[.19444,.69444,0,0,1.14999],9824:[.12963,.69444,0,0,.89444],9825:[.12963,.69444,0,0,.89444],9826:[.12963,.69444,0,0,.89444],9827:[.12963,.69444,0,0,.89444],9837:[0,.75,0,0,.44722],9838:[.19444,.69444,0,0,.44722],9839:[.19444,.69444,0,0,.44722],10216:[.25,.75,0,0,.44722],10217:[.25,.75,0,0,.44722],10815:[0,.68611,0,0,.9],10927:[.19667,.69667,0,0,.89444],10928:[.19667,.69667,0,0,.89444],57376:[.19444,.69444,0,0,0]},"Main-BoldItalic":{32:[0,0,0,0,.25],33:[0,.69444,.11417,0,.38611],34:[0,.69444,.07939,0,.62055],35:[.19444,.69444,.06833,0,.94444],37:[.05556,.75,.12861,0,.94444],38:[0,.69444,.08528,0,.88555],39:[0,.69444,.12945,0,.35555],40:[.25,.75,.15806,0,.47333],41:[.25,.75,.03306,0,.47333],42:[0,.75,.14333,0,.59111],43:[.10333,.60333,.03306,0,.88555],44:[.19444,.14722,0,0,.35555],45:[0,.44444,.02611,0,.41444],46:[0,.14722,0,0,.35555],47:[.25,.75,.15806,0,.59111],48:[0,.64444,.13167,0,.59111],49:[0,.64444,.13167,0,.59111],50:[0,.64444,.13167,0,.59111],51:[0,.64444,.13167,0,.59111],52:[.19444,.64444,.13167,0,.59111],53:[0,.64444,.13167,0,.59111],54:[0,.64444,.13167,0,.59111],55:[.19444,.64444,.13167,0,.59111],56:[0,.64444,.13167,0,.59111],57:[0,.64444,.13167,0,.59111],58:[0,.44444,.06695,0,.35555],59:[.19444,.44444,.06695,0,.35555],61:[-.10889,.39111,.06833,0,.88555],63:[0,.69444,.11472,0,.59111],64:[0,.69444,.09208,0,.88555],65:[0,.68611,0,0,.86555],66:[0,.68611,.0992,0,.81666],67:[0,.68611,.14208,0,.82666],68:[0,.68611,.09062,0,.87555],69:[0,.68611,.11431,0,.75666],70:[0,.68611,.12903,0,.72722],71:[0,.68611,.07347,0,.89527],72:[0,.68611,.17208,0,.8961],73:[0,.68611,.15681,0,.47166],74:[0,.68611,.145,0,.61055],75:[0,.68611,.14208,0,.89499],76:[0,.68611,0,0,.69777],77:[0,.68611,.17208,0,1.07277],78:[0,.68611,.17208,0,.8961],79:[0,.68611,.09062,0,.85499],80:[0,.68611,.0992,0,.78721],81:[.19444,.68611,.09062,0,.85499],82:[0,.68611,.02559,0,.85944],83:[0,.68611,.11264,0,.64999],84:[0,.68611,.12903,0,.7961],85:[0,.68611,.17208,0,.88083],86:[0,.68611,.18625,0,.86555],87:[0,.68611,.18625,0,1.15999],88:[0,.68611,.15681,0,.86555],89:[0,.68611,.19803,0,.86555],90:[0,.68611,.14208,0,.70888],91:[.25,.75,.1875,0,.35611],93:[.25,.75,.09972,0,.35611],94:[0,.69444,.06709,0,.59111],95:[.31,.13444,.09811,0,.59111],97:[0,.44444,.09426,0,.59111],98:[0,.69444,.07861,0,.53222],99:[0,.44444,.05222,0,.53222],100:[0,.69444,.10861,0,.59111],101:[0,.44444,.085,0,.53222],102:[.19444,.69444,.21778,0,.4],103:[.19444,.44444,.105,0,.53222],104:[0,.69444,.09426,0,.59111],105:[0,.69326,.11387,0,.35555],106:[.19444,.69326,.1672,0,.35555],107:[0,.69444,.11111,0,.53222],108:[0,.69444,.10861,0,.29666],109:[0,.44444,.09426,0,.94444],110:[0,.44444,.09426,0,.64999],111:[0,.44444,.07861,0,.59111],112:[.19444,.44444,.07861,0,.59111],113:[.19444,.44444,.105,0,.53222],114:[0,.44444,.11111,0,.50167],115:[0,.44444,.08167,0,.48694],116:[0,.63492,.09639,0,.385],117:[0,.44444,.09426,0,.62055],118:[0,.44444,.11111,0,.53222],119:[0,.44444,.11111,0,.76777],120:[0,.44444,.12583,0,.56055],121:[.19444,.44444,.105,0,.56166],122:[0,.44444,.13889,0,.49055],126:[.35,.34444,.11472,0,.59111],160:[0,0,0,0,.25],168:[0,.69444,.11473,0,.59111],176:[0,.69444,0,0,.94888],184:[.17014,0,0,0,.53222],198:[0,.68611,.11431,0,1.02277],216:[.04861,.73472,.09062,0,.88555],223:[.19444,.69444,.09736,0,.665],230:[0,.44444,.085,0,.82666],248:[.09722,.54167,.09458,0,.59111],305:[0,.44444,.09426,0,.35555],338:[0,.68611,.11431,0,1.14054],339:[0,.44444,.085,0,.82666],567:[.19444,.44444,.04611,0,.385],710:[0,.69444,.06709,0,.59111],711:[0,.63194,.08271,0,.59111],713:[0,.59444,.10444,0,.59111],714:[0,.69444,.08528,0,.59111],715:[0,.69444,0,0,.59111],728:[0,.69444,.10333,0,.59111],729:[0,.69444,.12945,0,.35555],730:[0,.69444,0,0,.94888],732:[0,.69444,.11472,0,.59111],733:[0,.69444,.11472,0,.59111],915:[0,.68611,.12903,0,.69777],916:[0,.68611,0,0,.94444],920:[0,.68611,.09062,0,.88555],923:[0,.68611,0,0,.80666],926:[0,.68611,.15092,0,.76777],928:[0,.68611,.17208,0,.8961],931:[0,.68611,.11431,0,.82666],933:[0,.68611,.10778,0,.88555],934:[0,.68611,.05632,0,.82666],936:[0,.68611,.10778,0,.88555],937:[0,.68611,.0992,0,.82666],8211:[0,.44444,.09811,0,.59111],8212:[0,.44444,.09811,0,1.18221],8216:[0,.69444,.12945,0,.35555],8217:[0,.69444,.12945,0,.35555],8220:[0,.69444,.16772,0,.62055],8221:[0,.69444,.07939,0,.62055]},"Main-Italic":{32:[0,0,0,0,.25],33:[0,.69444,.12417,0,.30667],34:[0,.69444,.06961,0,.51444],35:[.19444,.69444,.06616,0,.81777],37:[.05556,.75,.13639,0,.81777],38:[0,.69444,.09694,0,.76666],39:[0,.69444,.12417,0,.30667],40:[.25,.75,.16194,0,.40889],41:[.25,.75,.03694,0,.40889],42:[0,.75,.14917,0,.51111],43:[.05667,.56167,.03694,0,.76666],44:[.19444,.10556,0,0,.30667],45:[0,.43056,.02826,0,.35778],46:[0,.10556,0,0,.30667],47:[.25,.75,.16194,0,.51111],48:[0,.64444,.13556,0,.51111],49:[0,.64444,.13556,0,.51111],50:[0,.64444,.13556,0,.51111],51:[0,.64444,.13556,0,.51111],52:[.19444,.64444,.13556,0,.51111],53:[0,.64444,.13556,0,.51111],54:[0,.64444,.13556,0,.51111],55:[.19444,.64444,.13556,0,.51111],56:[0,.64444,.13556,0,.51111],57:[0,.64444,.13556,0,.51111],58:[0,.43056,.0582,0,.30667],59:[.19444,.43056,.0582,0,.30667],61:[-.13313,.36687,.06616,0,.76666],63:[0,.69444,.1225,0,.51111],64:[0,.69444,.09597,0,.76666],65:[0,.68333,0,0,.74333],66:[0,.68333,.10257,0,.70389],67:[0,.68333,.14528,0,.71555],68:[0,.68333,.09403,0,.755],69:[0,.68333,.12028,0,.67833],70:[0,.68333,.13305,0,.65277],71:[0,.68333,.08722,0,.77361],72:[0,.68333,.16389,0,.74333],73:[0,.68333,.15806,0,.38555],74:[0,.68333,.14028,0,.525],75:[0,.68333,.14528,0,.76888],76:[0,.68333,0,0,.62722],77:[0,.68333,.16389,0,.89666],78:[0,.68333,.16389,0,.74333],79:[0,.68333,.09403,0,.76666],80:[0,.68333,.10257,0,.67833],81:[.19444,.68333,.09403,0,.76666],82:[0,.68333,.03868,0,.72944],83:[0,.68333,.11972,0,.56222],84:[0,.68333,.13305,0,.71555],85:[0,.68333,.16389,0,.74333],86:[0,.68333,.18361,0,.74333],87:[0,.68333,.18361,0,.99888],88:[0,.68333,.15806,0,.74333],89:[0,.68333,.19383,0,.74333],90:[0,.68333,.14528,0,.61333],91:[.25,.75,.1875,0,.30667],93:[.25,.75,.10528,0,.30667],94:[0,.69444,.06646,0,.51111],95:[.31,.12056,.09208,0,.51111],97:[0,.43056,.07671,0,.51111],98:[0,.69444,.06312,0,.46],99:[0,.43056,.05653,0,.46],100:[0,.69444,.10333,0,.51111],101:[0,.43056,.07514,0,.46],102:[.19444,.69444,.21194,0,.30667],103:[.19444,.43056,.08847,0,.46],104:[0,.69444,.07671,0,.51111],105:[0,.65536,.1019,0,.30667],106:[.19444,.65536,.14467,0,.30667],107:[0,.69444,.10764,0,.46],108:[0,.69444,.10333,0,.25555],109:[0,.43056,.07671,0,.81777],110:[0,.43056,.07671,0,.56222],111:[0,.43056,.06312,0,.51111],112:[.19444,.43056,.06312,0,.51111],113:[.19444,.43056,.08847,0,.46],114:[0,.43056,.10764,0,.42166],115:[0,.43056,.08208,0,.40889],116:[0,.61508,.09486,0,.33222],117:[0,.43056,.07671,0,.53666],118:[0,.43056,.10764,0,.46],119:[0,.43056,.10764,0,.66444],120:[0,.43056,.12042,0,.46389],121:[.19444,.43056,.08847,0,.48555],122:[0,.43056,.12292,0,.40889],126:[.35,.31786,.11585,0,.51111],160:[0,0,0,0,.25],168:[0,.66786,.10474,0,.51111],176:[0,.69444,0,0,.83129],184:[.17014,0,0,0,.46],198:[0,.68333,.12028,0,.88277],216:[.04861,.73194,.09403,0,.76666],223:[.19444,.69444,.10514,0,.53666],230:[0,.43056,.07514,0,.71555],248:[.09722,.52778,.09194,0,.51111],338:[0,.68333,.12028,0,.98499],339:[0,.43056,.07514,0,.71555],710:[0,.69444,.06646,0,.51111],711:[0,.62847,.08295,0,.51111],713:[0,.56167,.10333,0,.51111],714:[0,.69444,.09694,0,.51111],715:[0,.69444,0,0,.51111],728:[0,.69444,.10806,0,.51111],729:[0,.66786,.11752,0,.30667],730:[0,.69444,0,0,.83129],732:[0,.66786,.11585,0,.51111],733:[0,.69444,.1225,0,.51111],915:[0,.68333,.13305,0,.62722],916:[0,.68333,0,0,.81777],920:[0,.68333,.09403,0,.76666],923:[0,.68333,0,0,.69222],926:[0,.68333,.15294,0,.66444],928:[0,.68333,.16389,0,.74333],931:[0,.68333,.12028,0,.71555],933:[0,.68333,.11111,0,.76666],934:[0,.68333,.05986,0,.71555],936:[0,.68333,.11111,0,.76666],937:[0,.68333,.10257,0,.71555],8211:[0,.43056,.09208,0,.51111],8212:[0,.43056,.09208,0,1.02222],8216:[0,.69444,.12417,0,.30667],8217:[0,.69444,.12417,0,.30667],8220:[0,.69444,.1685,0,.51444],8221:[0,.69444,.06961,0,.51444],8463:[0,.68889,0,0,.54028]},"Main-Regular":{32:[0,0,0,0,.25],33:[0,.69444,0,0,.27778],34:[0,.69444,0,0,.5],35:[.19444,.69444,0,0,.83334],36:[.05556,.75,0,0,.5],37:[.05556,.75,0,0,.83334],38:[0,.69444,0,0,.77778],39:[0,.69444,0,0,.27778],40:[.25,.75,0,0,.38889],41:[.25,.75,0,0,.38889],42:[0,.75,0,0,.5],43:[.08333,.58333,0,0,.77778],44:[.19444,.10556,0,0,.27778],45:[0,.43056,0,0,.33333],46:[0,.10556,0,0,.27778],47:[.25,.75,0,0,.5],48:[0,.64444,0,0,.5],49:[0,.64444,0,0,.5],50:[0,.64444,0,0,.5],51:[0,.64444,0,0,.5],52:[0,.64444,0,0,.5],53:[0,.64444,0,0,.5],54:[0,.64444,0,0,.5],55:[0,.64444,0,0,.5],56:[0,.64444,0,0,.5],57:[0,.64444,0,0,.5],58:[0,.43056,0,0,.27778],59:[.19444,.43056,0,0,.27778],60:[.0391,.5391,0,0,.77778],61:[-.13313,.36687,0,0,.77778],62:[.0391,.5391,0,0,.77778],63:[0,.69444,0,0,.47222],64:[0,.69444,0,0,.77778],65:[0,.68333,0,0,.75],66:[0,.68333,0,0,.70834],67:[0,.68333,0,0,.72222],68:[0,.68333,0,0,.76389],69:[0,.68333,0,0,.68056],70:[0,.68333,0,0,.65278],71:[0,.68333,0,0,.78472],72:[0,.68333,0,0,.75],73:[0,.68333,0,0,.36111],74:[0,.68333,0,0,.51389],75:[0,.68333,0,0,.77778],76:[0,.68333,0,0,.625],77:[0,.68333,0,0,.91667],78:[0,.68333,0,0,.75],79:[0,.68333,0,0,.77778],80:[0,.68333,0,0,.68056],81:[.19444,.68333,0,0,.77778],82:[0,.68333,0,0,.73611],83:[0,.68333,0,0,.55556],84:[0,.68333,0,0,.72222],85:[0,.68333,0,0,.75],86:[0,.68333,.01389,0,.75],87:[0,.68333,.01389,0,1.02778],88:[0,.68333,0,0,.75],89:[0,.68333,.025,0,.75],90:[0,.68333,0,0,.61111],91:[.25,.75,0,0,.27778],92:[.25,.75,0,0,.5],93:[.25,.75,0,0,.27778],94:[0,.69444,0,0,.5],95:[.31,.12056,.02778,0,.5],97:[0,.43056,0,0,.5],98:[0,.69444,0,0,.55556],99:[0,.43056,0,0,.44445],100:[0,.69444,0,0,.55556],101:[0,.43056,0,0,.44445],102:[0,.69444,.07778,0,.30556],103:[.19444,.43056,.01389,0,.5],104:[0,.69444,0,0,.55556],105:[0,.66786,0,0,.27778],106:[.19444,.66786,0,0,.30556],107:[0,.69444,0,0,.52778],108:[0,.69444,0,0,.27778],109:[0,.43056,0,0,.83334],110:[0,.43056,0,0,.55556],111:[0,.43056,0,0,.5],112:[.19444,.43056,0,0,.55556],113:[.19444,.43056,0,0,.52778],114:[0,.43056,0,0,.39167],115:[0,.43056,0,0,.39445],116:[0,.61508,0,0,.38889],117:[0,.43056,0,0,.55556],118:[0,.43056,.01389,0,.52778],119:[0,.43056,.01389,0,.72222],120:[0,.43056,0,0,.52778],121:[.19444,.43056,.01389,0,.52778],122:[0,.43056,0,0,.44445],123:[.25,.75,0,0,.5],124:[.25,.75,0,0,.27778],125:[.25,.75,0,0,.5],126:[.35,.31786,0,0,.5],160:[0,0,0,0,.25],163:[0,.69444,0,0,.76909],167:[.19444,.69444,0,0,.44445],168:[0,.66786,0,0,.5],172:[0,.43056,0,0,.66667],176:[0,.69444,0,0,.75],177:[.08333,.58333,0,0,.77778],182:[.19444,.69444,0,0,.61111],184:[.17014,0,0,0,.44445],198:[0,.68333,0,0,.90278],215:[.08333,.58333,0,0,.77778],216:[.04861,.73194,0,0,.77778],223:[0,.69444,0,0,.5],230:[0,.43056,0,0,.72222],247:[.08333,.58333,0,0,.77778],248:[.09722,.52778,0,0,.5],305:[0,.43056,0,0,.27778],338:[0,.68333,0,0,1.01389],339:[0,.43056,0,0,.77778],567:[.19444,.43056,0,0,.30556],710:[0,.69444,0,0,.5],711:[0,.62847,0,0,.5],713:[0,.56778,0,0,.5],714:[0,.69444,0,0,.5],715:[0,.69444,0,0,.5],728:[0,.69444,0,0,.5],729:[0,.66786,0,0,.27778],730:[0,.69444,0,0,.75],732:[0,.66786,0,0,.5],733:[0,.69444,0,0,.5],915:[0,.68333,0,0,.625],916:[0,.68333,0,0,.83334],920:[0,.68333,0,0,.77778],923:[0,.68333,0,0,.69445],926:[0,.68333,0,0,.66667],928:[0,.68333,0,0,.75],931:[0,.68333,0,0,.72222],933:[0,.68333,0,0,.77778],934:[0,.68333,0,0,.72222],936:[0,.68333,0,0,.77778],937:[0,.68333,0,0,.72222],8211:[0,.43056,.02778,0,.5],8212:[0,.43056,.02778,0,1],8216:[0,.69444,0,0,.27778],8217:[0,.69444,0,0,.27778],8220:[0,.69444,0,0,.5],8221:[0,.69444,0,0,.5],8224:[.19444,.69444,0,0,.44445],8225:[.19444,.69444,0,0,.44445],8230:[0,.12,0,0,1.172],8242:[0,.55556,0,0,.275],8407:[0,.71444,.15382,0,.5],8463:[0,.68889,0,0,.54028],8465:[0,.69444,0,0,.72222],8467:[0,.69444,0,.11111,.41667],8472:[.19444,.43056,0,.11111,.63646],8476:[0,.69444,0,0,.72222],8501:[0,.69444,0,0,.61111],8592:[-.13313,.36687,0,0,1],8593:[.19444,.69444,0,0,.5],8594:[-.13313,.36687,0,0,1],8595:[.19444,.69444,0,0,.5],8596:[-.13313,.36687,0,0,1],8597:[.25,.75,0,0,.5],8598:[.19444,.69444,0,0,1],8599:[.19444,.69444,0,0,1],8600:[.19444,.69444,0,0,1],8601:[.19444,.69444,0,0,1],8614:[.011,.511,0,0,1],8617:[.011,.511,0,0,1.126],8618:[.011,.511,0,0,1.126],8636:[-.13313,.36687,0,0,1],8637:[-.13313,.36687,0,0,1],8640:[-.13313,.36687,0,0,1],8641:[-.13313,.36687,0,0,1],8652:[.011,.671,0,0,1],8656:[-.13313,.36687,0,0,1],8657:[.19444,.69444,0,0,.61111],8658:[-.13313,.36687,0,0,1],8659:[.19444,.69444,0,0,.61111],8660:[-.13313,.36687,0,0,1],8661:[.25,.75,0,0,.61111],8704:[0,.69444,0,0,.55556],8706:[0,.69444,.05556,.08334,.5309],8707:[0,.69444,0,0,.55556],8709:[.05556,.75,0,0,.5],8711:[0,.68333,0,0,.83334],8712:[.0391,.5391,0,0,.66667],8715:[.0391,.5391,0,0,.66667],8722:[.08333,.58333,0,0,.77778],8723:[.08333,.58333,0,0,.77778],8725:[.25,.75,0,0,.5],8726:[.25,.75,0,0,.5],8727:[-.03472,.46528,0,0,.5],8728:[-.05555,.44445,0,0,.5],8729:[-.05555,.44445,0,0,.5],8730:[.2,.8,0,0,.83334],8733:[0,.43056,0,0,.77778],8734:[0,.43056,0,0,1],8736:[0,.69224,0,0,.72222],8739:[.25,.75,0,0,.27778],8741:[.25,.75,0,0,.5],8743:[0,.55556,0,0,.66667],8744:[0,.55556,0,0,.66667],8745:[0,.55556,0,0,.66667],8746:[0,.55556,0,0,.66667],8747:[.19444,.69444,.11111,0,.41667],8764:[-.13313,.36687,0,0,.77778],8768:[.19444,.69444,0,0,.27778],8771:[-.03625,.46375,0,0,.77778],8773:[-.022,.589,0,0,1],8776:[-.01688,.48312,0,0,.77778],8781:[-.03625,.46375,0,0,.77778],8784:[-.133,.67,0,0,.778],8801:[-.03625,.46375,0,0,.77778],8804:[.13597,.63597,0,0,.77778],8805:[.13597,.63597,0,0,.77778],8810:[.0391,.5391,0,0,1],8811:[.0391,.5391,0,0,1],8826:[.0391,.5391,0,0,.77778],8827:[.0391,.5391,0,0,.77778],8834:[.0391,.5391,0,0,.77778],8835:[.0391,.5391,0,0,.77778],8838:[.13597,.63597,0,0,.77778],8839:[.13597,.63597,0,0,.77778],8846:[0,.55556,0,0,.66667],8849:[.13597,.63597,0,0,.77778],8850:[.13597,.63597,0,0,.77778],8851:[0,.55556,0,0,.66667],8852:[0,.55556,0,0,.66667],8853:[.08333,.58333,0,0,.77778],8854:[.08333,.58333,0,0,.77778],8855:[.08333,.58333,0,0,.77778],8856:[.08333,.58333,0,0,.77778],8857:[.08333,.58333,0,0,.77778],8866:[0,.69444,0,0,.61111],8867:[0,.69444,0,0,.61111],8868:[0,.69444,0,0,.77778],8869:[0,.69444,0,0,.77778],8872:[.249,.75,0,0,.867],8900:[-.05555,.44445,0,0,.5],8901:[-.05555,.44445,0,0,.27778],8902:[-.03472,.46528,0,0,.5],8904:[.005,.505,0,0,.9],8942:[.03,.9,0,0,.278],8943:[-.19,.31,0,0,1.172],8945:[-.1,.82,0,0,1.282],8968:[.25,.75,0,0,.44445],8969:[.25,.75,0,0,.44445],8970:[.25,.75,0,0,.44445],8971:[.25,.75,0,0,.44445],8994:[-.14236,.35764,0,0,1],8995:[-.14236,.35764,0,0,1],9136:[.244,.744,0,0,.412],9137:[.244,.744,0,0,.412],9651:[.19444,.69444,0,0,.88889],9657:[-.03472,.46528,0,0,.5],9661:[.19444,.69444,0,0,.88889],9667:[-.03472,.46528,0,0,.5],9711:[.19444,.69444,0,0,1],9824:[.12963,.69444,0,0,.77778],9825:[.12963,.69444,0,0,.77778],9826:[.12963,.69444,0,0,.77778],9827:[.12963,.69444,0,0,.77778],9837:[0,.75,0,0,.38889],9838:[.19444,.69444,0,0,.38889],9839:[.19444,.69444,0,0,.38889],10216:[.25,.75,0,0,.38889],10217:[.25,.75,0,0,.38889],10222:[.244,.744,0,0,.412],10223:[.244,.744,0,0,.412],10229:[.011,.511,0,0,1.609],10230:[.011,.511,0,0,1.638],10231:[.011,.511,0,0,1.859],10232:[.024,.525,0,0,1.609],10233:[.024,.525,0,0,1.638],10234:[.024,.525,0,0,1.858],10236:[.011,.511,0,0,1.638],10815:[0,.68333,0,0,.75],10927:[.13597,.63597,0,0,.77778],10928:[.13597,.63597,0,0,.77778],57376:[.19444,.69444,0,0,0]},"Math-BoldItalic":{32:[0,0,0,0,.25],48:[0,.44444,0,0,.575],49:[0,.44444,0,0,.575],50:[0,.44444,0,0,.575],51:[.19444,.44444,0,0,.575],52:[.19444,.44444,0,0,.575],53:[.19444,.44444,0,0,.575],54:[0,.64444,0,0,.575],55:[.19444,.44444,0,0,.575],56:[0,.64444,0,0,.575],57:[.19444,.44444,0,0,.575],65:[0,.68611,0,0,.86944],66:[0,.68611,.04835,0,.8664],67:[0,.68611,.06979,0,.81694],68:[0,.68611,.03194,0,.93812],69:[0,.68611,.05451,0,.81007],70:[0,.68611,.15972,0,.68889],71:[0,.68611,0,0,.88673],72:[0,.68611,.08229,0,.98229],73:[0,.68611,.07778,0,.51111],74:[0,.68611,.10069,0,.63125],75:[0,.68611,.06979,0,.97118],76:[0,.68611,0,0,.75555],77:[0,.68611,.11424,0,1.14201],78:[0,.68611,.11424,0,.95034],79:[0,.68611,.03194,0,.83666],80:[0,.68611,.15972,0,.72309],81:[.19444,.68611,0,0,.86861],82:[0,.68611,.00421,0,.87235],83:[0,.68611,.05382,0,.69271],84:[0,.68611,.15972,0,.63663],85:[0,.68611,.11424,0,.80027],86:[0,.68611,.25555,0,.67778],87:[0,.68611,.15972,0,1.09305],88:[0,.68611,.07778,0,.94722],89:[0,.68611,.25555,0,.67458],90:[0,.68611,.06979,0,.77257],97:[0,.44444,0,0,.63287],98:[0,.69444,0,0,.52083],99:[0,.44444,0,0,.51342],100:[0,.69444,0,0,.60972],101:[0,.44444,0,0,.55361],102:[.19444,.69444,.11042,0,.56806],103:[.19444,.44444,.03704,0,.5449],104:[0,.69444,0,0,.66759],105:[0,.69326,0,0,.4048],106:[.19444,.69326,.0622,0,.47083],107:[0,.69444,.01852,0,.6037],108:[0,.69444,.0088,0,.34815],109:[0,.44444,0,0,1.0324],110:[0,.44444,0,0,.71296],111:[0,.44444,0,0,.58472],112:[.19444,.44444,0,0,.60092],113:[.19444,.44444,.03704,0,.54213],114:[0,.44444,.03194,0,.5287],115:[0,.44444,0,0,.53125],116:[0,.63492,0,0,.41528],117:[0,.44444,0,0,.68102],118:[0,.44444,.03704,0,.56666],119:[0,.44444,.02778,0,.83148],120:[0,.44444,0,0,.65903],121:[.19444,.44444,.03704,0,.59028],122:[0,.44444,.04213,0,.55509],160:[0,0,0,0,.25],915:[0,.68611,.15972,0,.65694],916:[0,.68611,0,0,.95833],920:[0,.68611,.03194,0,.86722],923:[0,.68611,0,0,.80555],926:[0,.68611,.07458,0,.84125],928:[0,.68611,.08229,0,.98229],931:[0,.68611,.05451,0,.88507],933:[0,.68611,.15972,0,.67083],934:[0,.68611,0,0,.76666],936:[0,.68611,.11653,0,.71402],937:[0,.68611,.04835,0,.8789],945:[0,.44444,0,0,.76064],946:[.19444,.69444,.03403,0,.65972],947:[.19444,.44444,.06389,0,.59003],948:[0,.69444,.03819,0,.52222],949:[0,.44444,0,0,.52882],950:[.19444,.69444,.06215,0,.50833],951:[.19444,.44444,.03704,0,.6],952:[0,.69444,.03194,0,.5618],953:[0,.44444,0,0,.41204],954:[0,.44444,0,0,.66759],955:[0,.69444,0,0,.67083],956:[.19444,.44444,0,0,.70787],957:[0,.44444,.06898,0,.57685],958:[.19444,.69444,.03021,0,.50833],959:[0,.44444,0,0,.58472],960:[0,.44444,.03704,0,.68241],961:[.19444,.44444,0,0,.6118],962:[.09722,.44444,.07917,0,.42361],963:[0,.44444,.03704,0,.68588],964:[0,.44444,.13472,0,.52083],965:[0,.44444,.03704,0,.63055],966:[.19444,.44444,0,0,.74722],967:[.19444,.44444,0,0,.71805],968:[.19444,.69444,.03704,0,.75833],969:[0,.44444,.03704,0,.71782],977:[0,.69444,0,0,.69155],981:[.19444,.69444,0,0,.7125],982:[0,.44444,.03194,0,.975],1009:[.19444,.44444,0,0,.6118],1013:[0,.44444,0,0,.48333],57649:[0,.44444,0,0,.39352],57911:[.19444,.44444,0,0,.43889]},"Math-Italic":{32:[0,0,0,0,.25],48:[0,.43056,0,0,.5],49:[0,.43056,0,0,.5],50:[0,.43056,0,0,.5],51:[.19444,.43056,0,0,.5],52:[.19444,.43056,0,0,.5],53:[.19444,.43056,0,0,.5],54:[0,.64444,0,0,.5],55:[.19444,.43056,0,0,.5],56:[0,.64444,0,0,.5],57:[.19444,.43056,0,0,.5],65:[0,.68333,0,.13889,.75],66:[0,.68333,.05017,.08334,.75851],67:[0,.68333,.07153,.08334,.71472],68:[0,.68333,.02778,.05556,.82792],69:[0,.68333,.05764,.08334,.7382],70:[0,.68333,.13889,.08334,.64306],71:[0,.68333,0,.08334,.78625],72:[0,.68333,.08125,.05556,.83125],73:[0,.68333,.07847,.11111,.43958],74:[0,.68333,.09618,.16667,.55451],75:[0,.68333,.07153,.05556,.84931],76:[0,.68333,0,.02778,.68056],77:[0,.68333,.10903,.08334,.97014],78:[0,.68333,.10903,.08334,.80347],79:[0,.68333,.02778,.08334,.76278],80:[0,.68333,.13889,.08334,.64201],81:[.19444,.68333,0,.08334,.79056],82:[0,.68333,.00773,.08334,.75929],83:[0,.68333,.05764,.08334,.6132],84:[0,.68333,.13889,.08334,.58438],85:[0,.68333,.10903,.02778,.68278],86:[0,.68333,.22222,0,.58333],87:[0,.68333,.13889,0,.94445],88:[0,.68333,.07847,.08334,.82847],89:[0,.68333,.22222,0,.58056],90:[0,.68333,.07153,.08334,.68264],97:[0,.43056,0,0,.52859],98:[0,.69444,0,0,.42917],99:[0,.43056,0,.05556,.43276],100:[0,.69444,0,.16667,.52049],101:[0,.43056,0,.05556,.46563],102:[.19444,.69444,.10764,.16667,.48959],103:[.19444,.43056,.03588,.02778,.47697],104:[0,.69444,0,0,.57616],105:[0,.65952,0,0,.34451],106:[.19444,.65952,.05724,0,.41181],107:[0,.69444,.03148,0,.5206],108:[0,.69444,.01968,.08334,.29838],109:[0,.43056,0,0,.87801],110:[0,.43056,0,0,.60023],111:[0,.43056,0,.05556,.48472],112:[.19444,.43056,0,.08334,.50313],113:[.19444,.43056,.03588,.08334,.44641],114:[0,.43056,.02778,.05556,.45116],115:[0,.43056,0,.05556,.46875],116:[0,.61508,0,.08334,.36111],117:[0,.43056,0,.02778,.57246],118:[0,.43056,.03588,.02778,.48472],119:[0,.43056,.02691,.08334,.71592],120:[0,.43056,0,.02778,.57153],121:[.19444,.43056,.03588,.05556,.49028],122:[0,.43056,.04398,.05556,.46505],160:[0,0,0,0,.25],915:[0,.68333,.13889,.08334,.61528],916:[0,.68333,0,.16667,.83334],920:[0,.68333,.02778,.08334,.76278],923:[0,.68333,0,.16667,.69445],926:[0,.68333,.07569,.08334,.74236],928:[0,.68333,.08125,.05556,.83125],931:[0,.68333,.05764,.08334,.77986],933:[0,.68333,.13889,.05556,.58333],934:[0,.68333,0,.08334,.66667],936:[0,.68333,.11,.05556,.61222],937:[0,.68333,.05017,.08334,.7724],945:[0,.43056,.0037,.02778,.6397],946:[.19444,.69444,.05278,.08334,.56563],947:[.19444,.43056,.05556,0,.51773],948:[0,.69444,.03785,.05556,.44444],949:[0,.43056,0,.08334,.46632],950:[.19444,.69444,.07378,.08334,.4375],951:[.19444,.43056,.03588,.05556,.49653],952:[0,.69444,.02778,.08334,.46944],953:[0,.43056,0,.05556,.35394],954:[0,.43056,0,0,.57616],955:[0,.69444,0,0,.58334],956:[.19444,.43056,0,.02778,.60255],957:[0,.43056,.06366,.02778,.49398],958:[.19444,.69444,.04601,.11111,.4375],959:[0,.43056,0,.05556,.48472],960:[0,.43056,.03588,0,.57003],961:[.19444,.43056,0,.08334,.51702],962:[.09722,.43056,.07986,.08334,.36285],963:[0,.43056,.03588,0,.57141],964:[0,.43056,.1132,.02778,.43715],965:[0,.43056,.03588,.02778,.54028],966:[.19444,.43056,0,.08334,.65417],967:[.19444,.43056,0,.05556,.62569],968:[.19444,.69444,.03588,.11111,.65139],969:[0,.43056,.03588,0,.62245],977:[0,.69444,0,.08334,.59144],981:[.19444,.69444,0,.08334,.59583],982:[0,.43056,.02778,0,.82813],1009:[.19444,.43056,0,.08334,.51702],1013:[0,.43056,0,.05556,.4059],57649:[0,.43056,0,.02778,.32246],57911:[.19444,.43056,0,.08334,.38403]},"SansSerif-Bold":{32:[0,0,0,0,.25],33:[0,.69444,0,0,.36667],34:[0,.69444,0,0,.55834],35:[.19444,.69444,0,0,.91667],36:[.05556,.75,0,0,.55],37:[.05556,.75,0,0,1.02912],38:[0,.69444,0,0,.83056],39:[0,.69444,0,0,.30556],40:[.25,.75,0,0,.42778],41:[.25,.75,0,0,.42778],42:[0,.75,0,0,.55],43:[.11667,.61667,0,0,.85556],44:[.10556,.13056,0,0,.30556],45:[0,.45833,0,0,.36667],46:[0,.13056,0,0,.30556],47:[.25,.75,0,0,.55],48:[0,.69444,0,0,.55],49:[0,.69444,0,0,.55],50:[0,.69444,0,0,.55],51:[0,.69444,0,0,.55],52:[0,.69444,0,0,.55],53:[0,.69444,0,0,.55],54:[0,.69444,0,0,.55],55:[0,.69444,0,0,.55],56:[0,.69444,0,0,.55],57:[0,.69444,0,0,.55],58:[0,.45833,0,0,.30556],59:[.10556,.45833,0,0,.30556],61:[-.09375,.40625,0,0,.85556],63:[0,.69444,0,0,.51945],64:[0,.69444,0,0,.73334],65:[0,.69444,0,0,.73334],66:[0,.69444,0,0,.73334],67:[0,.69444,0,0,.70278],68:[0,.69444,0,0,.79445],69:[0,.69444,0,0,.64167],70:[0,.69444,0,0,.61111],71:[0,.69444,0,0,.73334],72:[0,.69444,0,0,.79445],73:[0,.69444,0,0,.33056],74:[0,.69444,0,0,.51945],75:[0,.69444,0,0,.76389],76:[0,.69444,0,0,.58056],77:[0,.69444,0,0,.97778],78:[0,.69444,0,0,.79445],79:[0,.69444,0,0,.79445],80:[0,.69444,0,0,.70278],81:[.10556,.69444,0,0,.79445],82:[0,.69444,0,0,.70278],83:[0,.69444,0,0,.61111],84:[0,.69444,0,0,.73334],85:[0,.69444,0,0,.76389],86:[0,.69444,.01528,0,.73334],87:[0,.69444,.01528,0,1.03889],88:[0,.69444,0,0,.73334],89:[0,.69444,.0275,0,.73334],90:[0,.69444,0,0,.67223],91:[.25,.75,0,0,.34306],93:[.25,.75,0,0,.34306],94:[0,.69444,0,0,.55],95:[.35,.10833,.03056,0,.55],97:[0,.45833,0,0,.525],98:[0,.69444,0,0,.56111],99:[0,.45833,0,0,.48889],100:[0,.69444,0,0,.56111],101:[0,.45833,0,0,.51111],102:[0,.69444,.07639,0,.33611],103:[.19444,.45833,.01528,0,.55],104:[0,.69444,0,0,.56111],105:[0,.69444,0,0,.25556],106:[.19444,.69444,0,0,.28611],107:[0,.69444,0,0,.53056],108:[0,.69444,0,0,.25556],109:[0,.45833,0,0,.86667],110:[0,.45833,0,0,.56111],111:[0,.45833,0,0,.55],112:[.19444,.45833,0,0,.56111],113:[.19444,.45833,0,0,.56111],114:[0,.45833,.01528,0,.37222],115:[0,.45833,0,0,.42167],116:[0,.58929,0,0,.40417],117:[0,.45833,0,0,.56111],118:[0,.45833,.01528,0,.5],119:[0,.45833,.01528,0,.74445],120:[0,.45833,0,0,.5],121:[.19444,.45833,.01528,0,.5],122:[0,.45833,0,0,.47639],126:[.35,.34444,0,0,.55],160:[0,0,0,0,.25],168:[0,.69444,0,0,.55],176:[0,.69444,0,0,.73334],180:[0,.69444,0,0,.55],184:[.17014,0,0,0,.48889],305:[0,.45833,0,0,.25556],567:[.19444,.45833,0,0,.28611],710:[0,.69444,0,0,.55],711:[0,.63542,0,0,.55],713:[0,.63778,0,0,.55],728:[0,.69444,0,0,.55],729:[0,.69444,0,0,.30556],730:[0,.69444,0,0,.73334],732:[0,.69444,0,0,.55],733:[0,.69444,0,0,.55],915:[0,.69444,0,0,.58056],916:[0,.69444,0,0,.91667],920:[0,.69444,0,0,.85556],923:[0,.69444,0,0,.67223],926:[0,.69444,0,0,.73334],928:[0,.69444,0,0,.79445],931:[0,.69444,0,0,.79445],933:[0,.69444,0,0,.85556],934:[0,.69444,0,0,.79445],936:[0,.69444,0,0,.85556],937:[0,.69444,0,0,.79445],8211:[0,.45833,.03056,0,.55],8212:[0,.45833,.03056,0,1.10001],8216:[0,.69444,0,0,.30556],8217:[0,.69444,0,0,.30556],8220:[0,.69444,0,0,.55834],8221:[0,.69444,0,0,.55834]},"SansSerif-Italic":{32:[0,0,0,0,.25],33:[0,.69444,.05733,0,.31945],34:[0,.69444,.00316,0,.5],35:[.19444,.69444,.05087,0,.83334],36:[.05556,.75,.11156,0,.5],37:[.05556,.75,.03126,0,.83334],38:[0,.69444,.03058,0,.75834],39:[0,.69444,.07816,0,.27778],40:[.25,.75,.13164,0,.38889],41:[.25,.75,.02536,0,.38889],42:[0,.75,.11775,0,.5],43:[.08333,.58333,.02536,0,.77778],44:[.125,.08333,0,0,.27778],45:[0,.44444,.01946,0,.33333],46:[0,.08333,0,0,.27778],47:[.25,.75,.13164,0,.5],48:[0,.65556,.11156,0,.5],49:[0,.65556,.11156,0,.5],50:[0,.65556,.11156,0,.5],51:[0,.65556,.11156,0,.5],52:[0,.65556,.11156,0,.5],53:[0,.65556,.11156,0,.5],54:[0,.65556,.11156,0,.5],55:[0,.65556,.11156,0,.5],56:[0,.65556,.11156,0,.5],57:[0,.65556,.11156,0,.5],58:[0,.44444,.02502,0,.27778],59:[.125,.44444,.02502,0,.27778],61:[-.13,.37,.05087,0,.77778],63:[0,.69444,.11809,0,.47222],64:[0,.69444,.07555,0,.66667],65:[0,.69444,0,0,.66667],66:[0,.69444,.08293,0,.66667],67:[0,.69444,.11983,0,.63889],68:[0,.69444,.07555,0,.72223],69:[0,.69444,.11983,0,.59722],70:[0,.69444,.13372,0,.56945],71:[0,.69444,.11983,0,.66667],72:[0,.69444,.08094,0,.70834],73:[0,.69444,.13372,0,.27778],74:[0,.69444,.08094,0,.47222],75:[0,.69444,.11983,0,.69445],76:[0,.69444,0,0,.54167],77:[0,.69444,.08094,0,.875],78:[0,.69444,.08094,0,.70834],79:[0,.69444,.07555,0,.73611],80:[0,.69444,.08293,0,.63889],81:[.125,.69444,.07555,0,.73611],82:[0,.69444,.08293,0,.64584],83:[0,.69444,.09205,0,.55556],84:[0,.69444,.13372,0,.68056],85:[0,.69444,.08094,0,.6875],86:[0,.69444,.1615,0,.66667],87:[0,.69444,.1615,0,.94445],88:[0,.69444,.13372,0,.66667],89:[0,.69444,.17261,0,.66667],90:[0,.69444,.11983,0,.61111],91:[.25,.75,.15942,0,.28889],93:[.25,.75,.08719,0,.28889],94:[0,.69444,.0799,0,.5],95:[.35,.09444,.08616,0,.5],97:[0,.44444,.00981,0,.48056],98:[0,.69444,.03057,0,.51667],99:[0,.44444,.08336,0,.44445],100:[0,.69444,.09483,0,.51667],101:[0,.44444,.06778,0,.44445],102:[0,.69444,.21705,0,.30556],103:[.19444,.44444,.10836,0,.5],104:[0,.69444,.01778,0,.51667],105:[0,.67937,.09718,0,.23889],106:[.19444,.67937,.09162,0,.26667],107:[0,.69444,.08336,0,.48889],108:[0,.69444,.09483,0,.23889],109:[0,.44444,.01778,0,.79445],110:[0,.44444,.01778,0,.51667],111:[0,.44444,.06613,0,.5],112:[.19444,.44444,.0389,0,.51667],113:[.19444,.44444,.04169,0,.51667],114:[0,.44444,.10836,0,.34167],115:[0,.44444,.0778,0,.38333],116:[0,.57143,.07225,0,.36111],117:[0,.44444,.04169,0,.51667],118:[0,.44444,.10836,0,.46111],119:[0,.44444,.10836,0,.68334],120:[0,.44444,.09169,0,.46111],121:[.19444,.44444,.10836,0,.46111],122:[0,.44444,.08752,0,.43472],126:[.35,.32659,.08826,0,.5],160:[0,0,0,0,.25],168:[0,.67937,.06385,0,.5],176:[0,.69444,0,0,.73752],184:[.17014,0,0,0,.44445],305:[0,.44444,.04169,0,.23889],567:[.19444,.44444,.04169,0,.26667],710:[0,.69444,.0799,0,.5],711:[0,.63194,.08432,0,.5],713:[0,.60889,.08776,0,.5],714:[0,.69444,.09205,0,.5],715:[0,.69444,0,0,.5],728:[0,.69444,.09483,0,.5],729:[0,.67937,.07774,0,.27778],730:[0,.69444,0,0,.73752],732:[0,.67659,.08826,0,.5],733:[0,.69444,.09205,0,.5],915:[0,.69444,.13372,0,.54167],916:[0,.69444,0,0,.83334],920:[0,.69444,.07555,0,.77778],923:[0,.69444,0,0,.61111],926:[0,.69444,.12816,0,.66667],928:[0,.69444,.08094,0,.70834],931:[0,.69444,.11983,0,.72222],933:[0,.69444,.09031,0,.77778],934:[0,.69444,.04603,0,.72222],936:[0,.69444,.09031,0,.77778],937:[0,.69444,.08293,0,.72222],8211:[0,.44444,.08616,0,.5],8212:[0,.44444,.08616,0,1],8216:[0,.69444,.07816,0,.27778],8217:[0,.69444,.07816,0,.27778],8220:[0,.69444,.14205,0,.5],8221:[0,.69444,.00316,0,.5]},"SansSerif-Regular":{32:[0,0,0,0,.25],33:[0,.69444,0,0,.31945],34:[0,.69444,0,0,.5],35:[.19444,.69444,0,0,.83334],36:[.05556,.75,0,0,.5],37:[.05556,.75,0,0,.83334],38:[0,.69444,0,0,.75834],39:[0,.69444,0,0,.27778],40:[.25,.75,0,0,.38889],41:[.25,.75,0,0,.38889],42:[0,.75,0,0,.5],43:[.08333,.58333,0,0,.77778],44:[.125,.08333,0,0,.27778],45:[0,.44444,0,0,.33333],46:[0,.08333,0,0,.27778],47:[.25,.75,0,0,.5],48:[0,.65556,0,0,.5],49:[0,.65556,0,0,.5],50:[0,.65556,0,0,.5],51:[0,.65556,0,0,.5],52:[0,.65556,0,0,.5],53:[0,.65556,0,0,.5],54:[0,.65556,0,0,.5],55:[0,.65556,0,0,.5],56:[0,.65556,0,0,.5],57:[0,.65556,0,0,.5],58:[0,.44444,0,0,.27778],59:[.125,.44444,0,0,.27778],61:[-.13,.37,0,0,.77778],63:[0,.69444,0,0,.47222],64:[0,.69444,0,0,.66667],65:[0,.69444,0,0,.66667],66:[0,.69444,0,0,.66667],67:[0,.69444,0,0,.63889],68:[0,.69444,0,0,.72223],69:[0,.69444,0,0,.59722],70:[0,.69444,0,0,.56945],71:[0,.69444,0,0,.66667],72:[0,.69444,0,0,.70834],73:[0,.69444,0,0,.27778],74:[0,.69444,0,0,.47222],75:[0,.69444,0,0,.69445],76:[0,.69444,0,0,.54167],77:[0,.69444,0,0,.875],78:[0,.69444,0,0,.70834],79:[0,.69444,0,0,.73611],80:[0,.69444,0,0,.63889],81:[.125,.69444,0,0,.73611],82:[0,.69444,0,0,.64584],83:[0,.69444,0,0,.55556],84:[0,.69444,0,0,.68056],85:[0,.69444,0,0,.6875],86:[0,.69444,.01389,0,.66667],87:[0,.69444,.01389,0,.94445],88:[0,.69444,0,0,.66667],89:[0,.69444,.025,0,.66667],90:[0,.69444,0,0,.61111],91:[.25,.75,0,0,.28889],93:[.25,.75,0,0,.28889],94:[0,.69444,0,0,.5],95:[.35,.09444,.02778,0,.5],97:[0,.44444,0,0,.48056],98:[0,.69444,0,0,.51667],99:[0,.44444,0,0,.44445],100:[0,.69444,0,0,.51667],101:[0,.44444,0,0,.44445],102:[0,.69444,.06944,0,.30556],103:[.19444,.44444,.01389,0,.5],104:[0,.69444,0,0,.51667],105:[0,.67937,0,0,.23889],106:[.19444,.67937,0,0,.26667],107:[0,.69444,0,0,.48889],108:[0,.69444,0,0,.23889],109:[0,.44444,0,0,.79445],110:[0,.44444,0,0,.51667],111:[0,.44444,0,0,.5],112:[.19444,.44444,0,0,.51667],113:[.19444,.44444,0,0,.51667],114:[0,.44444,.01389,0,.34167],115:[0,.44444,0,0,.38333],116:[0,.57143,0,0,.36111],117:[0,.44444,0,0,.51667],118:[0,.44444,.01389,0,.46111],119:[0,.44444,.01389,0,.68334],120:[0,.44444,0,0,.46111],121:[.19444,.44444,.01389,0,.46111],122:[0,.44444,0,0,.43472],126:[.35,.32659,0,0,.5],160:[0,0,0,0,.25],168:[0,.67937,0,0,.5],176:[0,.69444,0,0,.66667],184:[.17014,0,0,0,.44445],305:[0,.44444,0,0,.23889],567:[.19444,.44444,0,0,.26667],710:[0,.69444,0,0,.5],711:[0,.63194,0,0,.5],713:[0,.60889,0,0,.5],714:[0,.69444,0,0,.5],715:[0,.69444,0,0,.5],728:[0,.69444,0,0,.5],729:[0,.67937,0,0,.27778],730:[0,.69444,0,0,.66667],732:[0,.67659,0,0,.5],733:[0,.69444,0,0,.5],915:[0,.69444,0,0,.54167],916:[0,.69444,0,0,.83334],920:[0,.69444,0,0,.77778],923:[0,.69444,0,0,.61111],926:[0,.69444,0,0,.66667],928:[0,.69444,0,0,.70834],931:[0,.69444,0,0,.72222],933:[0,.69444,0,0,.77778],934:[0,.69444,0,0,.72222],936:[0,.69444,0,0,.77778],937:[0,.69444,0,0,.72222],8211:[0,.44444,.02778,0,.5],8212:[0,.44444,.02778,0,1],8216:[0,.69444,0,0,.27778],8217:[0,.69444,0,0,.27778],8220:[0,.69444,0,0,.5],8221:[0,.69444,0,0,.5]},"Script-Regular":{32:[0,0,0,0,.25],65:[0,.7,.22925,0,.80253],66:[0,.7,.04087,0,.90757],67:[0,.7,.1689,0,.66619],68:[0,.7,.09371,0,.77443],69:[0,.7,.18583,0,.56162],70:[0,.7,.13634,0,.89544],71:[0,.7,.17322,0,.60961],72:[0,.7,.29694,0,.96919],73:[0,.7,.19189,0,.80907],74:[.27778,.7,.19189,0,1.05159],75:[0,.7,.31259,0,.91364],76:[0,.7,.19189,0,.87373],77:[0,.7,.15981,0,1.08031],78:[0,.7,.3525,0,.9015],79:[0,.7,.08078,0,.73787],80:[0,.7,.08078,0,1.01262],81:[0,.7,.03305,0,.88282],82:[0,.7,.06259,0,.85],83:[0,.7,.19189,0,.86767],84:[0,.7,.29087,0,.74697],85:[0,.7,.25815,0,.79996],86:[0,.7,.27523,0,.62204],87:[0,.7,.27523,0,.80532],88:[0,.7,.26006,0,.94445],89:[0,.7,.2939,0,.70961],90:[0,.7,.24037,0,.8212],160:[0,0,0,0,.25]},"Size1-Regular":{32:[0,0,0,0,.25],40:[.35001,.85,0,0,.45834],41:[.35001,.85,0,0,.45834],47:[.35001,.85,0,0,.57778],91:[.35001,.85,0,0,.41667],92:[.35001,.85,0,0,.57778],93:[.35001,.85,0,0,.41667],123:[.35001,.85,0,0,.58334],125:[.35001,.85,0,0,.58334],160:[0,0,0,0,.25],710:[0,.72222,0,0,.55556],732:[0,.72222,0,0,.55556],770:[0,.72222,0,0,.55556],771:[0,.72222,0,0,.55556],8214:[-99e-5,.601,0,0,.77778],8593:[1e-5,.6,0,0,.66667],8595:[1e-5,.6,0,0,.66667],8657:[1e-5,.6,0,0,.77778],8659:[1e-5,.6,0,0,.77778],8719:[.25001,.75,0,0,.94445],8720:[.25001,.75,0,0,.94445],8721:[.25001,.75,0,0,1.05556],8730:[.35001,.85,0,0,1],8739:[-.00599,.606,0,0,.33333],8741:[-.00599,.606,0,0,.55556],8747:[.30612,.805,.19445,0,.47222],8748:[.306,.805,.19445,0,.47222],8749:[.306,.805,.19445,0,.47222],8750:[.30612,.805,.19445,0,.47222],8896:[.25001,.75,0,0,.83334],8897:[.25001,.75,0,0,.83334],8898:[.25001,.75,0,0,.83334],8899:[.25001,.75,0,0,.83334],8968:[.35001,.85,0,0,.47222],8969:[.35001,.85,0,0,.47222],8970:[.35001,.85,0,0,.47222],8971:[.35001,.85,0,0,.47222],9168:[-99e-5,.601,0,0,.66667],10216:[.35001,.85,0,0,.47222],10217:[.35001,.85,0,0,.47222],10752:[.25001,.75,0,0,1.11111],10753:[.25001,.75,0,0,1.11111],10754:[.25001,.75,0,0,1.11111],10756:[.25001,.75,0,0,.83334],10758:[.25001,.75,0,0,.83334]},"Size2-Regular":{32:[0,0,0,0,.25],40:[.65002,1.15,0,0,.59722],41:[.65002,1.15,0,0,.59722],47:[.65002,1.15,0,0,.81111],91:[.65002,1.15,0,0,.47222],92:[.65002,1.15,0,0,.81111],93:[.65002,1.15,0,0,.47222],123:[.65002,1.15,0,0,.66667],125:[.65002,1.15,0,0,.66667],160:[0,0,0,0,.25],710:[0,.75,0,0,1],732:[0,.75,0,0,1],770:[0,.75,0,0,1],771:[0,.75,0,0,1],8719:[.55001,1.05,0,0,1.27778],8720:[.55001,1.05,0,0,1.27778],8721:[.55001,1.05,0,0,1.44445],8730:[.65002,1.15,0,0,1],8747:[.86225,1.36,.44445,0,.55556],8748:[.862,1.36,.44445,0,.55556],8749:[.862,1.36,.44445,0,.55556],8750:[.86225,1.36,.44445,0,.55556],8896:[.55001,1.05,0,0,1.11111],8897:[.55001,1.05,0,0,1.11111],8898:[.55001,1.05,0,0,1.11111],8899:[.55001,1.05,0,0,1.11111],8968:[.65002,1.15,0,0,.52778],8969:[.65002,1.15,0,0,.52778],8970:[.65002,1.15,0,0,.52778],8971:[.65002,1.15,0,0,.52778],10216:[.65002,1.15,0,0,.61111],10217:[.65002,1.15,0,0,.61111],10752:[.55001,1.05,0,0,1.51112],10753:[.55001,1.05,0,0,1.51112],10754:[.55001,1.05,0,0,1.51112],10756:[.55001,1.05,0,0,1.11111],10758:[.55001,1.05,0,0,1.11111]},"Size3-Regular":{32:[0,0,0,0,.25],40:[.95003,1.45,0,0,.73611],41:[.95003,1.45,0,0,.73611],47:[.95003,1.45,0,0,1.04445],91:[.95003,1.45,0,0,.52778],92:[.95003,1.45,0,0,1.04445],93:[.95003,1.45,0,0,.52778],123:[.95003,1.45,0,0,.75],125:[.95003,1.45,0,0,.75],160:[0,0,0,0,.25],710:[0,.75,0,0,1.44445],732:[0,.75,0,0,1.44445],770:[0,.75,0,0,1.44445],771:[0,.75,0,0,1.44445],8730:[.95003,1.45,0,0,1],8968:[.95003,1.45,0,0,.58334],8969:[.95003,1.45,0,0,.58334],8970:[.95003,1.45,0,0,.58334],8971:[.95003,1.45,0,0,.58334],10216:[.95003,1.45,0,0,.75],10217:[.95003,1.45,0,0,.75]},"Size4-Regular":{32:[0,0,0,0,.25],40:[1.25003,1.75,0,0,.79167],41:[1.25003,1.75,0,0,.79167],47:[1.25003,1.75,0,0,1.27778],91:[1.25003,1.75,0,0,.58334],92:[1.25003,1.75,0,0,1.27778],93:[1.25003,1.75,0,0,.58334],123:[1.25003,1.75,0,0,.80556],125:[1.25003,1.75,0,0,.80556],160:[0,0,0,0,.25],710:[0,.825,0,0,1.8889],732:[0,.825,0,0,1.8889],770:[0,.825,0,0,1.8889],771:[0,.825,0,0,1.8889],8730:[1.25003,1.75,0,0,1],8968:[1.25003,1.75,0,0,.63889],8969:[1.25003,1.75,0,0,.63889],8970:[1.25003,1.75,0,0,.63889],8971:[1.25003,1.75,0,0,.63889],9115:[.64502,1.155,0,0,.875],9116:[1e-5,.6,0,0,.875],9117:[.64502,1.155,0,0,.875],9118:[.64502,1.155,0,0,.875],9119:[1e-5,.6,0,0,.875],9120:[.64502,1.155,0,0,.875],9121:[.64502,1.155,0,0,.66667],9122:[-99e-5,.601,0,0,.66667],9123:[.64502,1.155,0,0,.66667],9124:[.64502,1.155,0,0,.66667],9125:[-99e-5,.601,0,0,.66667],9126:[.64502,1.155,0,0,.66667],9127:[1e-5,.9,0,0,.88889],9128:[.65002,1.15,0,0,.88889],9129:[.90001,0,0,0,.88889],9130:[0,.3,0,0,.88889],9131:[1e-5,.9,0,0,.88889],9132:[.65002,1.15,0,0,.88889],9133:[.90001,0,0,0,.88889],9143:[.88502,.915,0,0,1.05556],10216:[1.25003,1.75,0,0,.80556],10217:[1.25003,1.75,0,0,.80556],57344:[-.00499,.605,0,0,1.05556],57345:[-.00499,.605,0,0,1.05556],57680:[0,.12,0,0,.45],57681:[0,.12,0,0,.45],57682:[0,.12,0,0,.45],57683:[0,.12,0,0,.45]},"Typewriter-Regular":{32:[0,0,0,0,.525],33:[0,.61111,0,0,.525],34:[0,.61111,0,0,.525],35:[0,.61111,0,0,.525],36:[.08333,.69444,0,0,.525],37:[.08333,.69444,0,0,.525],38:[0,.61111,0,0,.525],39:[0,.61111,0,0,.525],40:[.08333,.69444,0,0,.525],41:[.08333,.69444,0,0,.525],42:[0,.52083,0,0,.525],43:[-.08056,.53055,0,0,.525],44:[.13889,.125,0,0,.525],45:[-.08056,.53055,0,0,.525],46:[0,.125,0,0,.525],47:[.08333,.69444,0,0,.525],48:[0,.61111,0,0,.525],49:[0,.61111,0,0,.525],50:[0,.61111,0,0,.525],51:[0,.61111,0,0,.525],52:[0,.61111,0,0,.525],53:[0,.61111,0,0,.525],54:[0,.61111,0,0,.525],55:[0,.61111,0,0,.525],56:[0,.61111,0,0,.525],57:[0,.61111,0,0,.525],58:[0,.43056,0,0,.525],59:[.13889,.43056,0,0,.525],60:[-.05556,.55556,0,0,.525],61:[-.19549,.41562,0,0,.525],62:[-.05556,.55556,0,0,.525],63:[0,.61111,0,0,.525],64:[0,.61111,0,0,.525],65:[0,.61111,0,0,.525],66:[0,.61111,0,0,.525],67:[0,.61111,0,0,.525],68:[0,.61111,0,0,.525],69:[0,.61111,0,0,.525],70:[0,.61111,0,0,.525],71:[0,.61111,0,0,.525],72:[0,.61111,0,0,.525],73:[0,.61111,0,0,.525],74:[0,.61111,0,0,.525],75:[0,.61111,0,0,.525],76:[0,.61111,0,0,.525],77:[0,.61111,0,0,.525],78:[0,.61111,0,0,.525],79:[0,.61111,0,0,.525],80:[0,.61111,0,0,.525],81:[.13889,.61111,0,0,.525],82:[0,.61111,0,0,.525],83:[0,.61111,0,0,.525],84:[0,.61111,0,0,.525],85:[0,.61111,0,0,.525],86:[0,.61111,0,0,.525],87:[0,.61111,0,0,.525],88:[0,.61111,0,0,.525],89:[0,.61111,0,0,.525],90:[0,.61111,0,0,.525],91:[.08333,.69444,0,0,.525],92:[.08333,.69444,0,0,.525],93:[.08333,.69444,0,0,.525],94:[0,.61111,0,0,.525],95:[.09514,0,0,0,.525],96:[0,.61111,0,0,.525],97:[0,.43056,0,0,.525],98:[0,.61111,0,0,.525],99:[0,.43056,0,0,.525],100:[0,.61111,0,0,.525],101:[0,.43056,0,0,.525],102:[0,.61111,0,0,.525],103:[.22222,.43056,0,0,.525],104:[0,.61111,0,0,.525],105:[0,.61111,0,0,.525],106:[.22222,.61111,0,0,.525],107:[0,.61111,0,0,.525],108:[0,.61111,0,0,.525],109:[0,.43056,0,0,.525],110:[0,.43056,0,0,.525],111:[0,.43056,0,0,.525],112:[.22222,.43056,0,0,.525],113:[.22222,.43056,0,0,.525],114:[0,.43056,0,0,.525],115:[0,.43056,0,0,.525],116:[0,.55358,0,0,.525],117:[0,.43056,0,0,.525],118:[0,.43056,0,0,.525],119:[0,.43056,0,0,.525],120:[0,.43056,0,0,.525],121:[.22222,.43056,0,0,.525],122:[0,.43056,0,0,.525],123:[.08333,.69444,0,0,.525],124:[.08333,.69444,0,0,.525],125:[.08333,.69444,0,0,.525],126:[0,.61111,0,0,.525],127:[0,.61111,0,0,.525],160:[0,0,0,0,.525],176:[0,.61111,0,0,.525],184:[.19445,0,0,0,.525],305:[0,.43056,0,0,.525],567:[.22222,.43056,0,0,.525],711:[0,.56597,0,0,.525],713:[0,.56555,0,0,.525],714:[0,.61111,0,0,.525],715:[0,.61111,0,0,.525],728:[0,.61111,0,0,.525],730:[0,.61111,0,0,.525],770:[0,.61111,0,0,.525],771:[0,.61111,0,0,.525],776:[0,.61111,0,0,.525],915:[0,.61111,0,0,.525],916:[0,.61111,0,0,.525],920:[0,.61111,0,0,.525],923:[0,.61111,0,0,.525],926:[0,.61111,0,0,.525],928:[0,.61111,0,0,.525],931:[0,.61111,0,0,.525],933:[0,.61111,0,0,.525],934:[0,.61111,0,0,.525],936:[0,.61111,0,0,.525],937:[0,.61111,0,0,.525],8216:[0,.61111,0,0,.525],8217:[0,.61111,0,0,.525],8242:[0,.61111,0,0,.525],9251:[.11111,.21944,0,0,.525]}},V={slant:[.25,.25,.25],space:[0,0,0],stretch:[0,0,0],shrink:[0,0,0],xHeight:[.431,.431,.431],quad:[1,1.171,1.472],extraSpace:[0,0,0],num1:[.677,.732,.925],num2:[.394,.384,.387],num3:[.444,.471,.504],denom1:[.686,.752,1.025],denom2:[.345,.344,.532],sup1:[.413,.503,.504],sup2:[.363,.431,.404],sup3:[.289,.286,.294],sub1:[.15,.143,.2],sub2:[.247,.286,.4],supDrop:[.386,.353,.494],subDrop:[.05,.071,.1],delim1:[2.39,1.7,1.98],delim2:[1.01,1.157,1.42],axisHeight:[.25,.25,.25],defaultRuleThickness:[.04,.049,.049],bigOpSpacing1:[.111,.111,.111],bigOpSpacing2:[.166,.166,.166],bigOpSpacing3:[.2,.2,.2],bigOpSpacing4:[.6,.611,.611],bigOpSpacing5:[.1,.143,.143],sqrtRuleThickness:[.04,.04,.04],ptPerEm:[10,10,10],doubleRuleSep:[.2,.2,.2],arrayRuleWidth:[.04,.04,.04],fboxsep:[.3,.3,.3],fboxrule:[.04,.04,.04]},U={"\xc5":"A","\xc7":"C","\xd0":"D","\xde":"o","\xe5":"a","\xe7":"c","\xf0":"d","\xfe":"o","\u0410":"A","\u0411":"B","\u0412":"B","\u0413":"F","\u0414":"A","\u0415":"E","\u0416":"K","\u0417":"3","\u0418":"N","\u0419":"N","\u041a":"K","\u041b":"N","\u041c":"M","\u041d":"H","\u041e":"O","\u041f":"N","\u0420":"P","\u0421":"C","\u0422":"T","\u0423":"y","\u0424":"O","\u0425":"X","\u0426":"U","\u0427":"h","\u0428":"W","\u0429":"W","\u042a":"B","\u042b":"X","\u042c":"B","\u042d":"3","\u042e":"X","\u042f":"R","\u0430":"a","\u0431":"b","\u0432":"a","\u0433":"r","\u0434":"y","\u0435":"e","\u0436":"m","\u0437":"e","\u0438":"n","\u0439":"n","\u043a":"n","\u043b":"n","\u043c":"m","\u043d":"n","\u043e":"o","\u043f":"n","\u0440":"p","\u0441":"c","\u0442":"o","\u0443":"y","\u0444":"b","\u0445":"x","\u0446":"n","\u0447":"n","\u0448":"w","\u0449":"w","\u044a":"a","\u044b":"m","\u044c":"a","\u044d":"e","\u044e":"m","\u044f":"r"};function G(t,e,r){if(!F[e])throw new Error("Font metrics not found for font: "+e+".");var a=t.charCodeAt(0),n=F[e][a];if(!n&&t[0]in U&&(a=U[t[0]].charCodeAt(0),n=F[e][a]),n||"text"!==r||M(a)&&(n=F[e][77]),n)return {depth:n[0],height:n[1],italic:n[2],skew:n[3],width:n[4]}}var Y={};var W={bin:1,close:1,inner:1,open:1,punct:1,rel:1},X={"accent-token":1,mathord:1,"op-token":1,spacing:1,textord:1},_={math:{},text:{}},j=_;function $(t,e,r,a,n,i){_[t][n]={font:e,group:r,replace:a},i&&a&&(_[t][a]=_[t][n]);}var Z="main",K="ams",J="bin",Q="mathord",tt="op-token",et="rel";$("math",Z,et,"\u2261","\\equiv",!0),$("math",Z,et,"\u227a","\\prec",!0),$("math",Z,et,"\u227b","\\succ",!0),$("math",Z,et,"\u223c","\\sim",!0),$("math",Z,et,"\u22a5","\\perp"),$("math",Z,et,"\u2aaf","\\preceq",!0),$("math",Z,et,"\u2ab0","\\succeq",!0),$("math",Z,et,"\u2243","\\simeq",!0),$("math",Z,et,"\u2223","\\mid",!0),$("math",Z,et,"\u226a","\\ll",!0),$("math",Z,et,"\u226b","\\gg",!0),$("math",Z,et,"\u224d","\\asymp",!0),$("math",Z,et,"\u2225","\\parallel"),$("math",Z,et,"\u22c8","\\bowtie",!0),$("math",Z,et,"\u2323","\\smile",!0),$("math",Z,et,"\u2291","\\sqsubseteq",!0),$("math",Z,et,"\u2292","\\sqsupseteq",!0),$("math",Z,et,"\u2250","\\doteq",!0),$("math",Z,et,"\u2322","\\frown",!0),$("math",Z,et,"\u220b","\\ni",!0),$("math",Z,et,"\u221d","\\propto",!0),$("math",Z,et,"\u22a2","\\vdash",!0),$("math",Z,et,"\u22a3","\\dashv",!0),$("math",Z,et,"\u220b","\\owns"),$("math",Z,"punct",".","\\ldotp"),$("math",Z,"punct","\u22c5","\\cdotp"),$("math",Z,"textord","#","\\#"),$("text",Z,"textord","#","\\#"),$("math",Z,"textord","&","\\&"),$("text",Z,"textord","&","\\&"),$("math",Z,"textord","\u2135","\\aleph",!0),$("math",Z,"textord","\u2200","\\forall",!0),$("math",Z,"textord","\u210f","\\hbar",!0),$("math",Z,"textord","\u2203","\\exists",!0),$("math",Z,"textord","\u2207","\\nabla",!0),$("math",Z,"textord","\u266d","\\flat",!0),$("math",Z,"textord","\u2113","\\ell",!0),$("math",Z,"textord","\u266e","\\natural",!0),$("math",Z,"textord","\u2663","\\clubsuit",!0),$("math",Z,"textord","\u2118","\\wp",!0),$("math",Z,"textord","\u266f","\\sharp",!0),$("math",Z,"textord","\u2662","\\diamondsuit",!0),$("math",Z,"textord","\u211c","\\Re",!0),$("math",Z,"textord","\u2661","\\heartsuit",!0),$("math",Z,"textord","\u2111","\\Im",!0),$("math",Z,"textord","\u2660","\\spadesuit",!0),$("text",Z,"textord","\xa7","\\S",!0),$("text",Z,"textord","\xb6","\\P",!0),$("math",Z,"textord","\u2020","\\dag"),$("text",Z,"textord","\u2020","\\dag"),$("text",Z,"textord","\u2020","\\textdagger"),$("math",Z,"textord","\u2021","\\ddag"),$("text",Z,"textord","\u2021","\\ddag"),$("text",Z,"textord","\u2021","\\textdaggerdbl"),$("math",Z,"close","\u23b1","\\rmoustache",!0),$("math",Z,"open","\u23b0","\\lmoustache",!0),$("math",Z,"close","\u27ef","\\rgroup",!0),$("math",Z,"open","\u27ee","\\lgroup",!0),$("math",Z,J,"\u2213","\\mp",!0),$("math",Z,J,"\u2296","\\ominus",!0),$("math",Z,J,"\u228e","\\uplus",!0),$("math",Z,J,"\u2293","\\sqcap",!0),$("math",Z,J,"\u2217","\\ast"),$("math",Z,J,"\u2294","\\sqcup",!0),$("math",Z,J,"\u25ef","\\bigcirc"),$("math",Z,J,"\u2219","\\bullet"),$("math",Z,J,"\u2021","\\ddagger"),$("math",Z,J,"\u2240","\\wr",!0),$("math",Z,J,"\u2a3f","\\amalg"),$("math",Z,J,"&","\\And"),$("math",Z,et,"\u27f5","\\longleftarrow",!0),$("math",Z,et,"\u21d0","\\Leftarrow",!0),$("math",Z,et,"\u27f8","\\Longleftarrow",!0),$("math",Z,et,"\u27f6","\\longrightarrow",!0),$("math",Z,et,"\u21d2","\\Rightarrow",!0),$("math",Z,et,"\u27f9","\\Longrightarrow",!0),$("math",Z,et,"\u2194","\\leftrightarrow",!0),$("math",Z,et,"\u27f7","\\longleftrightarrow",!0),$("math",Z,et,"\u21d4","\\Leftrightarrow",!0),$("math",Z,et,"\u27fa","\\Longleftrightarrow",!0),$("math",Z,et,"\u21a6","\\mapsto",!0),$("math",Z,et,"\u27fc","\\longmapsto",!0),$("math",Z,et,"\u2197","\\nearrow",!0),$("math",Z,et,"\u21a9","\\hookleftarrow",!0),$("math",Z,et,"\u21aa","\\hookrightarrow",!0),$("math",Z,et,"\u2198","\\searrow",!0),$("math",Z,et,"\u21bc","\\leftharpoonup",!0),$("math",Z,et,"\u21c0","\\rightharpoonup",!0),$("math",Z,et,"\u2199","\\swarrow",!0),$("math",Z,et,"\u21bd","\\leftharpoondown",!0),$("math",Z,et,"\u21c1","\\rightharpoondown",!0),$("math",Z,et,"\u2196","\\nwarrow",!0),$("math",Z,et,"\u21cc","\\rightleftharpoons",!0),$("math",K,et,"\u226e","\\nless",!0),$("math",K,et,"\ue010","\\@nleqslant"),$("math",K,et,"\ue011","\\@nleqq"),$("math",K,et,"\u2a87","\\lneq",!0),$("math",K,et,"\u2268","\\lneqq",!0),$("math",K,et,"\ue00c","\\@lvertneqq"),$("math",K,et,"\u22e6","\\lnsim",!0),$("math",K,et,"\u2a89","\\lnapprox",!0),$("math",K,et,"\u2280","\\nprec",!0),$("math",K,et,"\u22e0","\\npreceq",!0),$("math",K,et,"\u22e8","\\precnsim",!0),$("math",K,et,"\u2ab9","\\precnapprox",!0),$("math",K,et,"\u2241","\\nsim",!0),$("math",K,et,"\ue006","\\@nshortmid"),$("math",K,et,"\u2224","\\nmid",!0),$("math",K,et,"\u22ac","\\nvdash",!0),$("math",K,et,"\u22ad","\\nvDash",!0),$("math",K,et,"\u22ea","\\ntriangleleft"),$("math",K,et,"\u22ec","\\ntrianglelefteq",!0),$("math",K,et,"\u228a","\\subsetneq",!0),$("math",K,et,"\ue01a","\\@varsubsetneq"),$("math",K,et,"\u2acb","\\subsetneqq",!0),$("math",K,et,"\ue017","\\@varsubsetneqq"),$("math",K,et,"\u226f","\\ngtr",!0),$("math",K,et,"\ue00f","\\@ngeqslant"),$("math",K,et,"\ue00e","\\@ngeqq"),$("math",K,et,"\u2a88","\\gneq",!0),$("math",K,et,"\u2269","\\gneqq",!0),$("math",K,et,"\ue00d","\\@gvertneqq"),$("math",K,et,"\u22e7","\\gnsim",!0),$("math",K,et,"\u2a8a","\\gnapprox",!0),$("math",K,et,"\u2281","\\nsucc",!0),$("math",K,et,"\u22e1","\\nsucceq",!0),$("math",K,et,"\u22e9","\\succnsim",!0),$("math",K,et,"\u2aba","\\succnapprox",!0),$("math",K,et,"\u2246","\\ncong",!0),$("math",K,et,"\ue007","\\@nshortparallel"),$("math",K,et,"\u2226","\\nparallel",!0),$("math",K,et,"\u22af","\\nVDash",!0),$("math",K,et,"\u22eb","\\ntriangleright"),$("math",K,et,"\u22ed","\\ntrianglerighteq",!0),$("math",K,et,"\ue018","\\@nsupseteqq"),$("math",K,et,"\u228b","\\supsetneq",!0),$("math",K,et,"\ue01b","\\@varsupsetneq"),$("math",K,et,"\u2acc","\\supsetneqq",!0),$("math",K,et,"\ue019","\\@varsupsetneqq"),$("math",K,et,"\u22ae","\\nVdash",!0),$("math",K,et,"\u2ab5","\\precneqq",!0),$("math",K,et,"\u2ab6","\\succneqq",!0),$("math",K,et,"\ue016","\\@nsubseteqq"),$("math",K,J,"\u22b4","\\unlhd"),$("math",K,J,"\u22b5","\\unrhd"),$("math",K,et,"\u219a","\\nleftarrow",!0),$("math",K,et,"\u219b","\\nrightarrow",!0),$("math",K,et,"\u21cd","\\nLeftarrow",!0),$("math",K,et,"\u21cf","\\nRightarrow",!0),$("math",K,et,"\u21ae","\\nleftrightarrow",!0),$("math",K,et,"\u21ce","\\nLeftrightarrow",!0),$("math",K,et,"\u25b3","\\vartriangle"),$("math",K,"textord","\u210f","\\hslash"),$("math",K,"textord","\u25bd","\\triangledown"),$("math",K,"textord","\u25ca","\\lozenge"),$("math",K,"textord","\u24c8","\\circledS"),$("math",K,"textord","\xae","\\circledR"),$("text",K,"textord","\xae","\\circledR"),$("math",K,"textord","\u2221","\\measuredangle",!0),$("math",K,"textord","\u2204","\\nexists"),$("math",K,"textord","\u2127","\\mho"),$("math",K,"textord","\u2132","\\Finv",!0),$("math",K,"textord","\u2141","\\Game",!0),$("math",K,"textord","\u2035","\\backprime"),$("math",K,"textord","\u25b2","\\blacktriangle"),$("math",K,"textord","\u25bc","\\blacktriangledown"),$("math",K,"textord","\u25a0","\\blacksquare"),$("math",K,"textord","\u29eb","\\blacklozenge"),$("math",K,"textord","\u2605","\\bigstar"),$("math",K,"textord","\u2222","\\sphericalangle",!0),$("math",K,"textord","\u2201","\\complement",!0),$("math",K,"textord","\xf0","\\eth",!0),$("text",Z,"textord","\xf0","\xf0"),$("math",K,"textord","\u2571","\\diagup"),$("math",K,"textord","\u2572","\\diagdown"),$("math",K,"textord","\u25a1","\\square"),$("math",K,"textord","\u25a1","\\Box"),$("math",K,"textord","\u25ca","\\Diamond"),$("math",K,"textord","\xa5","\\yen",!0),$("text",K,"textord","\xa5","\\yen",!0),$("math",K,"textord","\u2713","\\checkmark",!0),$("text",K,"textord","\u2713","\\checkmark"),$("math",K,"textord","\u2136","\\beth",!0),$("math",K,"textord","\u2138","\\daleth",!0),$("math",K,"textord","\u2137","\\gimel",!0),$("math",K,"textord","\u03dd","\\digamma",!0),$("math",K,"textord","\u03f0","\\varkappa"),$("math",K,"open","\u250c","\\@ulcorner",!0),$("math",K,"close","\u2510","\\@urcorner",!0),$("math",K,"open","\u2514","\\@llcorner",!0),$("math",K,"close","\u2518","\\@lrcorner",!0),$("math",K,et,"\u2266","\\leqq",!0),$("math",K,et,"\u2a7d","\\leqslant",!0),$("math",K,et,"\u2a95","\\eqslantless",!0),$("math",K,et,"\u2272","\\lesssim",!0),$("math",K,et,"\u2a85","\\lessapprox",!0),$("math",K,et,"\u224a","\\approxeq",!0),$("math",K,J,"\u22d6","\\lessdot"),$("math",K,et,"\u22d8","\\lll",!0),$("math",K,et,"\u2276","\\lessgtr",!0),$("math",K,et,"\u22da","\\lesseqgtr",!0),$("math",K,et,"\u2a8b","\\lesseqqgtr",!0),$("math",K,et,"\u2251","\\doteqdot"),$("math",K,et,"\u2253","\\risingdotseq",!0),$("math",K,et,"\u2252","\\fallingdotseq",!0),$("math",K,et,"\u223d","\\backsim",!0),$("math",K,et,"\u22cd","\\backsimeq",!0),$("math",K,et,"\u2ac5","\\subseteqq",!0),$("math",K,et,"\u22d0","\\Subset",!0),$("math",K,et,"\u228f","\\sqsubset",!0),$("math",K,et,"\u227c","\\preccurlyeq",!0),$("math",K,et,"\u22de","\\curlyeqprec",!0),$("math",K,et,"\u227e","\\precsim",!0),$("math",K,et,"\u2ab7","\\precapprox",!0),$("math",K,et,"\u22b2","\\vartriangleleft"),$("math",K,et,"\u22b4","\\trianglelefteq"),$("math",K,et,"\u22a8","\\vDash",!0),$("math",K,et,"\u22aa","\\Vvdash",!0),$("math",K,et,"\u2323","\\smallsmile"),$("math",K,et,"\u2322","\\smallfrown"),$("math",K,et,"\u224f","\\bumpeq",!0),$("math",K,et,"\u224e","\\Bumpeq",!0),$("math",K,et,"\u2267","\\geqq",!0),$("math",K,et,"\u2a7e","\\geqslant",!0),$("math",K,et,"\u2a96","\\eqslantgtr",!0),$("math",K,et,"\u2273","\\gtrsim",!0),$("math",K,et,"\u2a86","\\gtrapprox",!0),$("math",K,J,"\u22d7","\\gtrdot"),$("math",K,et,"\u22d9","\\ggg",!0),$("math",K,et,"\u2277","\\gtrless",!0),$("math",K,et,"\u22db","\\gtreqless",!0),$("math",K,et,"\u2a8c","\\gtreqqless",!0),$("math",K,et,"\u2256","\\eqcirc",!0),$("math",K,et,"\u2257","\\circeq",!0),$("math",K,et,"\u225c","\\triangleq",!0),$("math",K,et,"\u223c","\\thicksim"),$("math",K,et,"\u2248","\\thickapprox"),$("math",K,et,"\u2ac6","\\supseteqq",!0),$("math",K,et,"\u22d1","\\Supset",!0),$("math",K,et,"\u2290","\\sqsupset",!0),$("math",K,et,"\u227d","\\succcurlyeq",!0),$("math",K,et,"\u22df","\\curlyeqsucc",!0),$("math",K,et,"\u227f","\\succsim",!0),$("math",K,et,"\u2ab8","\\succapprox",!0),$("math",K,et,"\u22b3","\\vartriangleright"),$("math",K,et,"\u22b5","\\trianglerighteq"),$("math",K,et,"\u22a9","\\Vdash",!0),$("math",K,et,"\u2223","\\shortmid"),$("math",K,et,"\u2225","\\shortparallel"),$("math",K,et,"\u226c","\\between",!0),$("math",K,et,"\u22d4","\\pitchfork",!0),$("math",K,et,"\u221d","\\varpropto"),$("math",K,et,"\u25c0","\\blacktriangleleft"),$("math",K,et,"\u2234","\\therefore",!0),$("math",K,et,"\u220d","\\backepsilon"),$("math",K,et,"\u25b6","\\blacktriangleright"),$("math",K,et,"\u2235","\\because",!0),$("math",K,et,"\u22d8","\\llless"),$("math",K,et,"\u22d9","\\gggtr"),$("math",K,J,"\u22b2","\\lhd"),$("math",K,J,"\u22b3","\\rhd"),$("math",K,et,"\u2242","\\eqsim",!0),$("math",Z,et,"\u22c8","\\Join"),$("math",K,et,"\u2251","\\Doteq",!0),$("math",K,J,"\u2214","\\dotplus",!0),$("math",K,J,"\u2216","\\smallsetminus"),$("math",K,J,"\u22d2","\\Cap",!0),$("math",K,J,"\u22d3","\\Cup",!0),$("math",K,J,"\u2a5e","\\doublebarwedge",!0),$("math",K,J,"\u229f","\\boxminus",!0),$("math",K,J,"\u229e","\\boxplus",!0),$("math",K,J,"\u22c7","\\divideontimes",!0),$("math",K,J,"\u22c9","\\ltimes",!0),$("math",K,J,"\u22ca","\\rtimes",!0),$("math",K,J,"\u22cb","\\leftthreetimes",!0),$("math",K,J,"\u22cc","\\rightthreetimes",!0),$("math",K,J,"\u22cf","\\curlywedge",!0),$("math",K,J,"\u22ce","\\curlyvee",!0),$("math",K,J,"\u229d","\\circleddash",!0),$("math",K,J,"\u229b","\\circledast",!0),$("math",K,J,"\u22c5","\\centerdot"),$("math",K,J,"\u22ba","\\intercal",!0),$("math",K,J,"\u22d2","\\doublecap"),$("math",K,J,"\u22d3","\\doublecup"),$("math",K,J,"\u22a0","\\boxtimes",!0),$("math",K,et,"\u21e2","\\dashrightarrow",!0),$("math",K,et,"\u21e0","\\dashleftarrow",!0),$("math",K,et,"\u21c7","\\leftleftarrows",!0),$("math",K,et,"\u21c6","\\leftrightarrows",!0),$("math",K,et,"\u21da","\\Lleftarrow",!0),$("math",K,et,"\u219e","\\twoheadleftarrow",!0),$("math",K,et,"\u21a2","\\leftarrowtail",!0),$("math",K,et,"\u21ab","\\looparrowleft",!0),$("math",K,et,"\u21cb","\\leftrightharpoons",!0),$("math",K,et,"\u21b6","\\curvearrowleft",!0),$("math",K,et,"\u21ba","\\circlearrowleft",!0),$("math",K,et,"\u21b0","\\Lsh",!0),$("math",K,et,"\u21c8","\\upuparrows",!0),$("math",K,et,"\u21bf","\\upharpoonleft",!0),$("math",K,et,"\u21c3","\\downharpoonleft",!0),$("math",K,et,"\u22b8","\\multimap",!0),$("math",K,et,"\u21ad","\\leftrightsquigarrow",!0),$("math",K,et,"\u21c9","\\rightrightarrows",!0),$("math",K,et,"\u21c4","\\rightleftarrows",!0),$("math",K,et,"\u21a0","\\twoheadrightarrow",!0),$("math",K,et,"\u21a3","\\rightarrowtail",!0),$("math",K,et,"\u21ac","\\looparrowright",!0),$("math",K,et,"\u21b7","\\curvearrowright",!0),$("math",K,et,"\u21bb","\\circlearrowright",!0),$("math",K,et,"\u21b1","\\Rsh",!0),$("math",K,et,"\u21ca","\\downdownarrows",!0),$("math",K,et,"\u21be","\\upharpoonright",!0),$("math",K,et,"\u21c2","\\downharpoonright",!0),$("math",K,et,"\u21dd","\\rightsquigarrow",!0),$("math",K,et,"\u21dd","\\leadsto"),$("math",K,et,"\u21db","\\Rrightarrow",!0),$("math",K,et,"\u21be","\\restriction"),$("math",Z,"textord","\u2018","`"),$("math",Z,"textord","$","\\$"),$("text",Z,"textord","$","\\$"),$("text",Z,"textord","$","\\textdollar"),$("math",Z,"textord","%","\\%"),$("text",Z,"textord","%","\\%"),$("math",Z,"textord","_","\\_"),$("text",Z,"textord","_","\\_"),$("text",Z,"textord","_","\\textunderscore"),$("math",Z,"textord","\u2220","\\angle",!0),$("math",Z,"textord","\u221e","\\infty",!0),$("math",Z,"textord","\u2032","\\prime"),$("math",Z,"textord","\u25b3","\\triangle"),$("math",Z,"textord","\u0393","\\Gamma",!0),$("math",Z,"textord","\u0394","\\Delta",!0),$("math",Z,"textord","\u0398","\\Theta",!0),$("math",Z,"textord","\u039b","\\Lambda",!0),$("math",Z,"textord","\u039e","\\Xi",!0),$("math",Z,"textord","\u03a0","\\Pi",!0),$("math",Z,"textord","\u03a3","\\Sigma",!0),$("math",Z,"textord","\u03a5","\\Upsilon",!0),$("math",Z,"textord","\u03a6","\\Phi",!0),$("math",Z,"textord","\u03a8","\\Psi",!0),$("math",Z,"textord","\u03a9","\\Omega",!0),$("math",Z,"textord","A","\u0391"),$("math",Z,"textord","B","\u0392"),$("math",Z,"textord","E","\u0395"),$("math",Z,"textord","Z","\u0396"),$("math",Z,"textord","H","\u0397"),$("math",Z,"textord","I","\u0399"),$("math",Z,"textord","K","\u039a"),$("math",Z,"textord","M","\u039c"),$("math",Z,"textord","N","\u039d"),$("math",Z,"textord","O","\u039f"),$("math",Z,"textord","P","\u03a1"),$("math",Z,"textord","T","\u03a4"),$("math",Z,"textord","X","\u03a7"),$("math",Z,"textord","\xac","\\neg",!0),$("math",Z,"textord","\xac","\\lnot"),$("math",Z,"textord","\u22a4","\\top"),$("math",Z,"textord","\u22a5","\\bot"),$("math",Z,"textord","\u2205","\\emptyset"),$("math",K,"textord","\u2205","\\varnothing"),$("math",Z,Q,"\u03b1","\\alpha",!0),$("math",Z,Q,"\u03b2","\\beta",!0),$("math",Z,Q,"\u03b3","\\gamma",!0),$("math",Z,Q,"\u03b4","\\delta",!0),$("math",Z,Q,"\u03f5","\\epsilon",!0),$("math",Z,Q,"\u03b6","\\zeta",!0),$("math",Z,Q,"\u03b7","\\eta",!0),$("math",Z,Q,"\u03b8","\\theta",!0),$("math",Z,Q,"\u03b9","\\iota",!0),$("math",Z,Q,"\u03ba","\\kappa",!0),$("math",Z,Q,"\u03bb","\\lambda",!0),$("math",Z,Q,"\u03bc","\\mu",!0),$("math",Z,Q,"\u03bd","\\nu",!0),$("math",Z,Q,"\u03be","\\xi",!0),$("math",Z,Q,"\u03bf","\\omicron",!0),$("math",Z,Q,"\u03c0","\\pi",!0),$("math",Z,Q,"\u03c1","\\rho",!0),$("math",Z,Q,"\u03c3","\\sigma",!0),$("math",Z,Q,"\u03c4","\\tau",!0),$("math",Z,Q,"\u03c5","\\upsilon",!0),$("math",Z,Q,"\u03d5","\\phi",!0),$("math",Z,Q,"\u03c7","\\chi",!0),$("math",Z,Q,"\u03c8","\\psi",!0),$("math",Z,Q,"\u03c9","\\omega",!0),$("math",Z,Q,"\u03b5","\\varepsilon",!0),$("math",Z,Q,"\u03d1","\\vartheta",!0),$("math",Z,Q,"\u03d6","\\varpi",!0),$("math",Z,Q,"\u03f1","\\varrho",!0),$("math",Z,Q,"\u03c2","\\varsigma",!0),$("math",Z,Q,"\u03c6","\\varphi",!0),$("math",Z,J,"\u2217","*"),$("math",Z,J,"+","+"),$("math",Z,J,"\u2212","-"),$("math",Z,J,"\u22c5","\\cdot",!0),$("math",Z,J,"\u2218","\\circ"),$("math",Z,J,"\xf7","\\div",!0),$("math",Z,J,"\xb1","\\pm",!0),$("math",Z,J,"\xd7","\\times",!0),$("math",Z,J,"\u2229","\\cap",!0),$("math",Z,J,"\u222a","\\cup",!0),$("math",Z,J,"\u2216","\\setminus"),$("math",Z,J,"\u2227","\\land"),$("math",Z,J,"\u2228","\\lor"),$("math",Z,J,"\u2227","\\wedge",!0),$("math",Z,J,"\u2228","\\vee",!0),$("math",Z,"textord","\u221a","\\surd"),$("math",Z,"open","\u27e8","\\langle",!0),$("math",Z,"open","\u2223","\\lvert"),$("math",Z,"open","\u2225","\\lVert"),$("math",Z,"close","?","?"),$("math",Z,"close","!","!"),$("math",Z,"close","\u27e9","\\rangle",!0),$("math",Z,"close","\u2223","\\rvert"),$("math",Z,"close","\u2225","\\rVert"),$("math",Z,et,"=","="),$("math",Z,et,":",":"),$("math",Z,et,"\u2248","\\approx",!0),$("math",Z,et,"\u2245","\\cong",!0),$("math",Z,et,"\u2265","\\ge"),$("math",Z,et,"\u2265","\\geq",!0),$("math",Z,et,"\u2190","\\gets"),$("math",Z,et,">","\\gt",!0),$("math",Z,et,"\u2208","\\in",!0),$("math",Z,et,"\ue020","\\@not"),$("math",Z,et,"\u2282","\\subset",!0),$("math",Z,et,"\u2283","\\supset",!0),$("math",Z,et,"\u2286","\\subseteq",!0),$("math",Z,et,"\u2287","\\supseteq",!0),$("math",K,et,"\u2288","\\nsubseteq",!0),$("math",K,et,"\u2289","\\nsupseteq",!0),$("math",Z,et,"\u22a8","\\models"),$("math",Z,et,"\u2190","\\leftarrow",!0),$("math",Z,et,"\u2264","\\le"),$("math",Z,et,"\u2264","\\leq",!0),$("math",Z,et,"<","\\lt",!0),$("math",Z,et,"\u2192","\\rightarrow",!0),$("math",Z,et,"\u2192","\\to"),$("math",K,et,"\u2271","\\ngeq",!0),$("math",K,et,"\u2270","\\nleq",!0),$("math",Z,"spacing","\xa0","\\ "),$("math",Z,"spacing","\xa0","~"),$("math",Z,"spacing","\xa0","\\space"),$("math",Z,"spacing","\xa0","\\nobreakspace"),$("text",Z,"spacing","\xa0","\\ "),$("text",Z,"spacing","\xa0"," "),$("text",Z,"spacing","\xa0","~"),$("text",Z,"spacing","\xa0","\\space"),$("text",Z,"spacing","\xa0","\\nobreakspace"),$("math",Z,"spacing",null,"\\nobreak"),$("math",Z,"spacing",null,"\\allowbreak"),$("math",Z,"punct",",",","),$("math",Z,"punct",";",";"),$("math",K,J,"\u22bc","\\barwedge",!0),$("math",K,J,"\u22bb","\\veebar",!0),$("math",Z,J,"\u2299","\\odot",!0),$("math",Z,J,"\u2295","\\oplus",!0),$("math",Z,J,"\u2297","\\otimes",!0),$("math",Z,"textord","\u2202","\\partial",!0),$("math",Z,J,"\u2298","\\oslash",!0),$("math",K,J,"\u229a","\\circledcirc",!0),$("math",K,J,"\u22a1","\\boxdot",!0),$("math",Z,J,"\u25b3","\\bigtriangleup"),$("math",Z,J,"\u25bd","\\bigtriangledown"),$("math",Z,J,"\u2020","\\dagger"),$("math",Z,J,"\u22c4","\\diamond"),$("math",Z,J,"\u22c6","\\star"),$("math",Z,J,"\u25c3","\\triangleleft"),$("math",Z,J,"\u25b9","\\triangleright"),$("math",Z,"open","{","\\{"),$("text",Z,"textord","{","\\{"),$("text",Z,"textord","{","\\textbraceleft"),$("math",Z,"close","}","\\}"),$("text",Z,"textord","}","\\}"),$("text",Z,"textord","}","\\textbraceright"),$("math",Z,"open","{","\\lbrace"),$("math",Z,"close","}","\\rbrace"),$("math",Z,"open","[","\\lbrack",!0),$("text",Z,"textord","[","\\lbrack",!0),$("math",Z,"close","]","\\rbrack",!0),$("text",Z,"textord","]","\\rbrack",!0),$("math",Z,"open","(","\\lparen",!0),$("math",Z,"close",")","\\rparen",!0),$("text",Z,"textord","<","\\textless",!0),$("text",Z,"textord",">","\\textgreater",!0),$("math",Z,"open","\u230a","\\lfloor",!0),$("math",Z,"close","\u230b","\\rfloor",!0),$("math",Z,"open","\u2308","\\lceil",!0),$("math",Z,"close","\u2309","\\rceil",!0),$("math",Z,"textord","\\","\\backslash"),$("math",Z,"textord","\u2223","|"),$("math",Z,"textord","\u2223","\\vert"),$("text",Z,"textord","|","\\textbar",!0),$("math",Z,"textord","\u2225","\\|"),$("math",Z,"textord","\u2225","\\Vert"),$("text",Z,"textord","\u2225","\\textbardbl"),$("text",Z,"textord","~","\\textasciitilde"),$("text",Z,"textord","\\","\\textbackslash"),$("text",Z,"textord","^","\\textasciicircum"),$("math",Z,et,"\u2191","\\uparrow",!0),$("math",Z,et,"\u21d1","\\Uparrow",!0),$("math",Z,et,"\u2193","\\downarrow",!0),$("math",Z,et,"\u21d3","\\Downarrow",!0),$("math",Z,et,"\u2195","\\updownarrow",!0),$("math",Z,et,"\u21d5","\\Updownarrow",!0),$("math",Z,tt,"\u2210","\\coprod"),$("math",Z,tt,"\u22c1","\\bigvee"),$("math",Z,tt,"\u22c0","\\bigwedge"),$("math",Z,tt,"\u2a04","\\biguplus"),$("math",Z,tt,"\u22c2","\\bigcap"),$("math",Z,tt,"\u22c3","\\bigcup"),$("math",Z,tt,"\u222b","\\int"),$("math",Z,tt,"\u222b","\\intop"),$("math",Z,tt,"\u222c","\\iint"),$("math",Z,tt,"\u222d","\\iiint"),$("math",Z,tt,"\u220f","\\prod"),$("math",Z,tt,"\u2211","\\sum"),$("math",Z,tt,"\u2a02","\\bigotimes"),$("math",Z,tt,"\u2a01","\\bigoplus"),$("math",Z,tt,"\u2a00","\\bigodot"),$("math",Z,tt,"\u222e","\\oint"),$("math",Z,tt,"\u2a06","\\bigsqcup"),$("math",Z,tt,"\u222b","\\smallint"),$("text",Z,"inner","\u2026","\\textellipsis"),$("math",Z,"inner","\u2026","\\mathellipsis"),$("text",Z,"inner","\u2026","\\ldots",!0),$("math",Z,"inner","\u2026","\\ldots",!0),$("math",Z,"inner","\u22ef","\\@cdots",!0),$("math",Z,"inner","\u22f1","\\ddots",!0),$("math",Z,"textord","\u22ee","\\varvdots"),$("math",Z,"accent-token","\u02ca","\\acute"),$("math",Z,"accent-token","\u02cb","\\grave"),$("math",Z,"accent-token","\xa8","\\ddot"),$("math",Z,"accent-token","~","\\tilde"),$("math",Z,"accent-token","\u02c9","\\bar"),$("math",Z,"accent-token","\u02d8","\\breve"),$("math",Z,"accent-token","\u02c7","\\check"),$("math",Z,"accent-token","^","\\hat"),$("math",Z,"accent-token","\u20d7","\\vec"),$("math",Z,"accent-token","\u02d9","\\dot"),$("math",Z,"accent-token","\u02da","\\mathring"),$("math",Z,Q,"\ue131","\\@imath"),$("math",Z,Q,"\ue237","\\@jmath"),$("math",Z,"textord","\u0131","\u0131"),$("math",Z,"textord","\u0237","\u0237"),$("text",Z,"textord","\u0131","\\i",!0),$("text",Z,"textord","\u0237","\\j",!0),$("text",Z,"textord","\xdf","\\ss",!0),$("text",Z,"textord","\xe6","\\ae",!0),$("text",Z,"textord","\u0153","\\oe",!0),$("text",Z,"textord","\xf8","\\o",!0),$("text",Z,"textord","\xc6","\\AE",!0),$("text",Z,"textord","\u0152","\\OE",!0),$("text",Z,"textord","\xd8","\\O",!0),$("text",Z,"accent-token","\u02ca","\\'"),$("text",Z,"accent-token","\u02cb","\\`"),$("text",Z,"accent-token","\u02c6","\\^"),$("text",Z,"accent-token","\u02dc","\\~"),$("text",Z,"accent-token","\u02c9","\\="),$("text",Z,"accent-token","\u02d8","\\u"),$("text",Z,"accent-token","\u02d9","\\."),$("text",Z,"accent-token","\u02da","\\r"),$("text",Z,"accent-token","\u02c7","\\v"),$("text",Z,"accent-token","\xa8",'\\"'),$("text",Z,"accent-token","\u02dd","\\H"),$("text",Z,"accent-token","\u25ef","\\textcircled");var rt={"--":!0,"---":!0,"``":!0,"''":!0};$("text",Z,"textord","\u2013","--",!0),$("text",Z,"textord","\u2013","\\textendash"),$("text",Z,"textord","\u2014","---",!0),$("text",Z,"textord","\u2014","\\textemdash"),$("text",Z,"textord","\u2018","`",!0),$("text",Z,"textord","\u2018","\\textquoteleft"),$("text",Z,"textord","\u2019","'",!0),$("text",Z,"textord","\u2019","\\textquoteright"),$("text",Z,"textord","\u201c","``",!0),$("text",Z,"textord","\u201c","\\textquotedblleft"),$("text",Z,"textord","\u201d","''",!0),$("text",Z,"textord","\u201d","\\textquotedblright"),$("math",Z,"textord","\xb0","\\degree",!0),$("text",Z,"textord","\xb0","\\degree"),$("text",Z,"textord","\xb0","\\textdegree",!0),$("math",Z,"textord","\xa3","\\pounds"),$("math",Z,"textord","\xa3","\\mathsterling",!0),$("text",Z,"textord","\xa3","\\pounds"),$("text",Z,"textord","\xa3","\\textsterling",!0),$("math",K,"textord","\u2720","\\maltese"),$("text",K,"textord","\u2720","\\maltese");for(var at=0;at<'0123456789/@."'.length;at++){var nt='0123456789/@."'.charAt(at);$("math",Z,"textord",nt,nt);}for(var it=0;it<'0123456789!@*()-=+";:?/.,'.length;it++){var ot='0123456789!@*()-=+";:?/.,'.charAt(it);$("text",Z,"textord",ot,ot);}for(var st="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",lt=0;lt<st.length;lt++){var ht=st.charAt(lt);$("math",Z,Q,ht,ht),$("text",Z,"textord",ht,ht);}$("math",K,"textord","C","\u2102"),$("text",K,"textord","C","\u2102"),$("math",K,"textord","H","\u210d"),$("text",K,"textord","H","\u210d"),$("math",K,"textord","N","\u2115"),$("text",K,"textord","N","\u2115"),$("math",K,"textord","P","\u2119"),$("text",K,"textord","P","\u2119"),$("math",K,"textord","Q","\u211a"),$("text",K,"textord","Q","\u211a"),$("math",K,"textord","R","\u211d"),$("text",K,"textord","R","\u211d"),$("math",K,"textord","Z","\u2124"),$("text",K,"textord","Z","\u2124"),$("math",Z,Q,"h","\u210e"),$("text",Z,Q,"h","\u210e");for(var mt="",ct=0;ct<st.length;ct++){var ut=st.charAt(ct);$("math",Z,Q,ut,mt=String.fromCharCode(55349,56320+ct)),$("text",Z,"textord",ut,mt),$("math",Z,Q,ut,mt=String.fromCharCode(55349,56372+ct)),$("text",Z,"textord",ut,mt),$("math",Z,Q,ut,mt=String.fromCharCode(55349,56424+ct)),$("text",Z,"textord",ut,mt),$("math",Z,Q,ut,mt=String.fromCharCode(55349,56580+ct)),$("text",Z,"textord",ut,mt),$("math",Z,Q,ut,mt=String.fromCharCode(55349,56736+ct)),$("text",Z,"textord",ut,mt),$("math",Z,Q,ut,mt=String.fromCharCode(55349,56788+ct)),$("text",Z,"textord",ut,mt),$("math",Z,Q,ut,mt=String.fromCharCode(55349,56840+ct)),$("text",Z,"textord",ut,mt),$("math",Z,Q,ut,mt=String.fromCharCode(55349,56944+ct)),$("text",Z,"textord",ut,mt),ct<26&&($("math",Z,Q,ut,mt=String.fromCharCode(55349,56632+ct)),$("text",Z,"textord",ut,mt),$("math",Z,Q,ut,mt=String.fromCharCode(55349,56476+ct)),$("text",Z,"textord",ut,mt));}$("math",Z,Q,"k",mt=String.fromCharCode(55349,56668)),$("text",Z,"textord","k",mt);for(var pt=0;pt<10;pt++){var dt=pt.toString();$("math",Z,Q,dt,mt=String.fromCharCode(55349,57294+pt)),$("text",Z,"textord",dt,mt),$("math",Z,Q,dt,mt=String.fromCharCode(55349,57314+pt)),$("text",Z,"textord",dt,mt),$("math",Z,Q,dt,mt=String.fromCharCode(55349,57324+pt)),$("text",Z,"textord",dt,mt),$("math",Z,Q,dt,mt=String.fromCharCode(55349,57334+pt)),$("text",Z,"textord",dt,mt);}for(var ft=0;ft<"\xc7\xd0\xde\xe7\xfe".length;ft++){var gt="\xc7\xd0\xde\xe7\xfe".charAt(ft);$("math",Z,Q,gt,gt),$("text",Z,"textord",gt,gt);}var xt=[["mathbf","textbf","Main-Bold"],["mathbf","textbf","Main-Bold"],["mathnormal","textit","Math-Italic"],["mathnormal","textit","Math-Italic"],["boldsymbol","boldsymbol","Main-BoldItalic"],["boldsymbol","boldsymbol","Main-BoldItalic"],["mathscr","textscr","Script-Regular"],["","",""],["","",""],["","",""],["mathfrak","textfrak","Fraktur-Regular"],["mathfrak","textfrak","Fraktur-Regular"],["mathbb","textbb","AMS-Regular"],["mathbb","textbb","AMS-Regular"],["","",""],["","",""],["mathsf","textsf","SansSerif-Regular"],["mathsf","textsf","SansSerif-Regular"],["mathboldsf","textboldsf","SansSerif-Bold"],["mathboldsf","textboldsf","SansSerif-Bold"],["mathitsf","textitsf","SansSerif-Italic"],["mathitsf","textitsf","SansSerif-Italic"],["","",""],["","",""],["mathtt","texttt","Typewriter-Regular"],["mathtt","texttt","Typewriter-Regular"]],vt=[["mathbf","textbf","Main-Bold"],["","",""],["mathsf","textsf","SansSerif-Regular"],["mathboldsf","textboldsf","SansSerif-Bold"],["mathtt","texttt","Typewriter-Regular"]],bt=[[1,1,1],[2,1,1],[3,1,1],[4,2,1],[5,2,1],[6,3,1],[7,4,2],[8,6,3],[9,7,6],[10,8,7],[11,10,9]],yt=[.5,.6,.7,.8,.9,1,1.2,1.44,1.728,2.074,2.488],wt=function(t,e){return e.size<2?t:bt[t-1][e.size-1]},kt=function(){function t(e){this.style=void 0,this.color=void 0,this.size=void 0,this.textSize=void 0,this.phantom=void 0,this.font=void 0,this.fontFamily=void 0,this.fontWeight=void 0,this.fontShape=void 0,this.sizeMultiplier=void 0,this.maxSize=void 0,this.minRuleThickness=void 0,this._fontMetrics=void 0,this.style=e.style,this.color=e.color,this.size=e.size||t.BASESIZE,this.textSize=e.textSize||this.size,this.phantom=!!e.phantom,this.font=e.font||"",this.fontFamily=e.fontFamily||"",this.fontWeight=e.fontWeight||"",this.fontShape=e.fontShape||"",this.sizeMultiplier=yt[this.size-1],this.maxSize=e.maxSize,this.minRuleThickness=e.minRuleThickness,this._fontMetrics=void 0;}var e=t.prototype;return e.extend=function(e){var r={style:this.style,size:this.size,textSize:this.textSize,color:this.color,phantom:this.phantom,font:this.font,fontFamily:this.fontFamily,fontWeight:this.fontWeight,fontShape:this.fontShape,maxSize:this.maxSize,minRuleThickness:this.minRuleThickness};for(var a in e)e.hasOwnProperty(a)&&(r[a]=e[a]);return new t(r)},e.havingStyle=function(t){return this.style===t?this:this.extend({style:t,size:wt(this.textSize,t)})},e.havingCrampedStyle=function(){return this.havingStyle(this.style.cramp())},e.havingSize=function(t){return this.size===t&&this.textSize===t?this:this.extend({style:this.style.text(),size:t,textSize:t,sizeMultiplier:yt[t-1]})},e.havingBaseStyle=function(e){e=e||this.style.text();var r=wt(t.BASESIZE,e);return this.size===r&&this.textSize===t.BASESIZE&&this.style===e?this:this.extend({style:e,size:r})},e.havingBaseSizing=function(){var t;switch(this.style.id){case 4:case 5:t=3;break;case 6:case 7:t=1;break;default:t=6;}return this.extend({style:this.style.text(),size:t})},e.withColor=function(t){return this.extend({color:t})},e.withPhantom=function(){return this.extend({phantom:!0})},e.withFont=function(t){return this.extend({font:t})},e.withTextFontFamily=function(t){return this.extend({fontFamily:t,font:""})},e.withTextFontWeight=function(t){return this.extend({fontWeight:t,font:""})},e.withTextFontShape=function(t){return this.extend({fontShape:t,font:""})},e.sizingClasses=function(t){return t.size!==this.size?["sizing","reset-size"+t.size,"size"+this.size]:[]},e.baseSizingClasses=function(){return this.size!==t.BASESIZE?["sizing","reset-size"+this.size,"size"+t.BASESIZE]:[]},e.fontMetrics=function(){return this._fontMetrics||(this._fontMetrics=function(t){var e;if(!Y[e=t>=5?0:t>=3?1:2]){var r=Y[e]={cssEmPerMu:V.quad[e]/18};for(var a in V)V.hasOwnProperty(a)&&(r[a]=V[a][e]);}return Y[e]}(this.size)),this._fontMetrics},e.getColor=function(){return this.phantom?"transparent":this.color},t}();kt.BASESIZE=6;var St=kt,Mt={pt:1,mm:7227/2540,cm:7227/254,in:72.27,bp:1.00375,pc:12,dd:1238/1157,cc:14856/1157,nd:685/642,nc:1370/107,sp:1/65536,px:1.00375},zt={ex:!0,em:!0,mu:!0},At=function(t){return "string"!=typeof t&&(t=t.unit),t in Mt||t in zt||"ex"===t},Tt=function(t,e){var r;if(t.unit in Mt)r=Mt[t.unit]/e.fontMetrics().ptPerEm/e.sizeMultiplier;else if("mu"===t.unit)r=e.fontMetrics().cssEmPerMu;else{var a;if(a=e.style.isTight()?e.havingStyle(e.style.text()):e,"ex"===t.unit)r=a.fontMetrics().xHeight;else{if("em"!==t.unit)throw new o("Invalid unit: '"+t.unit+"'");r=a.fontMetrics().quad;}a!==e&&(r*=a.sizeMultiplier/e.sizeMultiplier);}return Math.min(t.number*r,e.maxSize)},Bt=function(t,e,r){return j[r][t]&&j[r][t].replace&&(t=j[r][t].replace),{value:t,metrics:G(t,e,r)}},Ct=function(t,e,r,a,n){var i,o=Bt(t,e,r),s=o.metrics;if(t=o.value,s){var l=s.italic;("text"===r||a&&"mathit"===a.font)&&(l=0),i=new E(t,s.height,s.depth,l,s.skew,s.width,n);}else"undefined"!=typeof console&&console.warn("No character metrics for '"+t+"' in style '"+e+"' and mode '"+r+"'"),i=new E(t,0,0,0,0,0,n);if(a){i.maxFontSize=a.sizeMultiplier,a.style.isTight()&&i.classes.push("mtight");var h=a.getColor();h&&(i.style.color=h);}return i},qt=function(t,e){if(T(t.classes)!==T(e.classes)||t.skew!==e.skew||t.maxFontSize!==e.maxFontSize)return !1;for(var r in t.style)if(t.style.hasOwnProperty(r)&&t.style[r]!==e.style[r])return !1;for(var a in e.style)if(e.style.hasOwnProperty(a)&&t.style[a]!==e.style[a])return !1;return !0},Nt=function(t){for(var e=0,r=0,a=0,n=0;n<t.children.length;n++){var i=t.children[n];i.height>e&&(e=i.height),i.depth>r&&(r=i.depth),i.maxFontSize>a&&(a=i.maxFontSize);}t.height=e,t.depth=r,t.maxFontSize=a;},It=function(t,e,r,a){var n=new N(t,e,r,a);return Nt(n),n},Ot=function(t,e,r,a){return new N(t,e,r,a)},Rt=function(t){var e=new A(t);return Nt(e),e},Et=function(t,e,r){var a="";switch(t){case"amsrm":a="AMS";break;case"textrm":a="Main";break;case"textsf":a="SansSerif";break;case"texttt":a="Typewriter";break;default:a=t;}return a+"-"+("textbf"===e&&"textit"===r?"BoldItalic":"textbf"===e?"Bold":"textit"===e?"Italic":"Regular")},Lt={mathbf:{variant:"bold",fontName:"Main-Bold"},mathrm:{variant:"normal",fontName:"Main-Regular"},textit:{variant:"italic",fontName:"Main-Italic"},mathit:{variant:"italic",fontName:"Main-Italic"},mathnormal:{variant:"italic",fontName:"Math-Italic"},mathbb:{variant:"double-struck",fontName:"AMS-Regular"},mathcal:{variant:"script",fontName:"Caligraphic-Regular"},mathfrak:{variant:"fraktur",fontName:"Fraktur-Regular"},mathscr:{variant:"script",fontName:"Script-Regular"},mathsf:{variant:"sans-serif",fontName:"SansSerif-Regular"},mathtt:{variant:"monospace",fontName:"Typewriter-Regular"}},Pt={vec:["vec",.471,.714],oiintSize1:["oiintSize1",.957,.499],oiintSize2:["oiintSize2",1.472,.659],oiiintSize1:["oiiintSize1",1.304,.499],oiiintSize2:["oiiintSize2",1.98,.659],leftParenInner:["leftParenInner",.875,.3],rightParenInner:["rightParenInner",.875,.3]},Dt={fontMap:Lt,makeSymbol:Ct,mathsym:function(t,e,r,a){return void 0===a&&(a=[]),"boldsymbol"===r.font&&Bt(t,"Main-Bold",e).metrics?Ct(t,"Main-Bold",e,r,a.concat(["mathbf"])):"\\"===t||"main"===j[e][t].font?Ct(t,"Main-Regular",e,r,a):Ct(t,"AMS-Regular",e,r,a.concat(["amsrm"]))},makeSpan:It,makeSvgSpan:Ot,makeLineSpan:function(t,e,r){var a=It([t],[],e);return a.height=Math.max(r||e.fontMetrics().defaultRuleThickness,e.minRuleThickness),a.style.borderBottomWidth=a.height+"em",a.maxFontSize=1,a},makeAnchor:function(t,e,r,a){var n=new I(t,e,r,a);return Nt(n),n},makeFragment:Rt,wrapFragment:function(t,e){return t instanceof A?It([],[t],e):t},makeVList:function(t,e){for(var r=function(t){if("individualShift"===t.positionType){for(var e=t.children,r=[e[0]],a=-e[0].shift-e[0].elem.depth,n=a,i=1;i<e.length;i++){var o=-e[i].shift-n-e[i].elem.depth,s=o-(e[i-1].elem.height+e[i-1].elem.depth);n+=o,r.push({type:"kern",size:s}),r.push(e[i]);}return {children:r,depth:a}}var l;if("top"===t.positionType){for(var h=t.positionData,m=0;m<t.children.length;m++){var c=t.children[m];h-="kern"===c.type?c.size:c.elem.height+c.elem.depth;}l=h;}else if("bottom"===t.positionType)l=-t.positionData;else{var u=t.children[0];if("elem"!==u.type)throw new Error('First child must have type "elem".');if("shift"===t.positionType)l=-u.elem.depth-t.positionData;else{if("firstBaseline"!==t.positionType)throw new Error("Invalid positionType "+t.positionType+".");l=-u.elem.depth;}}return {children:t.children,depth:l}}(t),a=r.children,n=r.depth,i=0,o=0;o<a.length;o++){var s=a[o];if("elem"===s.type){var l=s.elem;i=Math.max(i,l.maxFontSize,l.height);}}i+=2;var h=It(["pstrut"],[]);h.style.height=i+"em";for(var m=[],c=n,u=n,p=n,d=0;d<a.length;d++){var f=a[d];if("kern"===f.type)p+=f.size;else{var g=f.elem,x=f.wrapperClasses||[],v=f.wrapperStyle||{},b=It(x,[h,g],void 0,v);b.style.top=-i-p-g.depth+"em",f.marginLeft&&(b.style.marginLeft=f.marginLeft),f.marginRight&&(b.style.marginRight=f.marginRight),m.push(b),p+=g.height+g.depth;}c=Math.min(c,p),u=Math.max(u,p);}var y,w=It(["vlist"],m);if(w.style.height=u+"em",c<0){var k=It([],[]),S=It(["vlist"],[k]);S.style.height=-c+"em";var M=It(["vlist-s"],[new E("\u200b")]);y=[It(["vlist-r"],[w,M]),It(["vlist-r"],[S])];}else y=[It(["vlist-r"],[w])];var z=It(["vlist-t"],y);return 2===y.length&&z.classes.push("vlist-t2"),z.height=u,z.depth=-c,z},makeOrd:function(t,e,r){var a=t.mode,n=t.text,i=["mord"],s="math"===a||"text"===a&&e.font,l=s?e.font:e.fontFamily;if(55349===n.charCodeAt(0)){var h=function(t,e){var r=1024*(t.charCodeAt(0)-55296)+(t.charCodeAt(1)-56320)+65536,a="math"===e?0:1;if(119808<=r&&r<120484){var n=Math.floor((r-119808)/26);return [xt[n][2],xt[n][a]]}if(120782<=r&&r<=120831){var i=Math.floor((r-120782)/10);return [vt[i][2],vt[i][a]]}if(120485===r||120486===r)return [xt[0][2],xt[0][a]];if(120486<r&&r<120782)return ["",""];throw new o("Unsupported character: "+t)}(n,a),m=h[0],c=h[1];return Ct(n,m,a,e,i.concat(c))}if(l){var u,p;if("boldsymbol"===l){var d=function(t,e,r,a,n){return "textord"!==n&&Bt(t,"Math-BoldItalic",e).metrics?{fontName:"Math-BoldItalic",fontClass:"boldsymbol"}:{fontName:"Main-Bold",fontClass:"mathbf"}}(n,a,0,0,r);u=d.fontName,p=[d.fontClass];}else s?(u=Lt[l].fontName,p=[l]):(u=Et(l,e.fontWeight,e.fontShape),p=[l,e.fontWeight,e.fontShape]);if(Bt(n,u,a).metrics)return Ct(n,u,a,e,i.concat(p));if(rt.hasOwnProperty(n)&&"Typewriter"===u.substr(0,10)){for(var f=[],g=0;g<n.length;g++)f.push(Ct(n[g],u,a,e,i.concat(p)));return Rt(f)}}if("mathord"===r)return Ct(n,"Math-Italic",a,e,i.concat(["mathnormal"]));if("textord"===r){var x=j[a][n]&&j[a][n].font;if("ams"===x){var v=Et("amsrm",e.fontWeight,e.fontShape);return Ct(n,v,a,e,i.concat("amsrm",e.fontWeight,e.fontShape))}if("main"!==x&&x){var b=Et(x,e.fontWeight,e.fontShape);return Ct(n,b,a,e,i.concat(b,e.fontWeight,e.fontShape))}var y=Et("textrm",e.fontWeight,e.fontShape);return Ct(n,y,a,e,i.concat(e.fontWeight,e.fontShape))}throw new Error("unexpected type: "+r+" in makeOrd")},makeGlue:function(t,e){var r=It(["mspace"],[],e),a=Tt(t,e);return r.style.marginRight=a+"em",r},staticSvg:function(t,e){var r=Pt[t],a=r[0],n=r[1],i=r[2],o=new P(a),s=new L([o],{width:n+"em",height:i+"em",style:"width:"+n+"em",viewBox:"0 0 "+1e3*n+" "+1e3*i,preserveAspectRatio:"xMinYMin"}),l=Ot(["overlay"],[s],e);return l.height=i,l.style.height=i+"em",l.style.width=n+"em",l},svgData:Pt,tryCombineChars:function(t){for(var e=0;e<t.length-1;e++){var r=t[e],a=t[e+1];r instanceof E&&a instanceof E&&qt(r,a)&&(r.text+=a.text,r.height=Math.max(r.height,a.height),r.depth=Math.max(r.depth,a.depth),r.italic=a.italic,t.splice(e+1,1),e--);}return t}},Ht={number:3,unit:"mu"},Ft={number:4,unit:"mu"},Vt={number:5,unit:"mu"},Ut={mord:{mop:Ht,mbin:Ft,mrel:Vt,minner:Ht},mop:{mord:Ht,mop:Ht,mrel:Vt,minner:Ht},mbin:{mord:Ft,mop:Ft,mopen:Ft,minner:Ft},mrel:{mord:Vt,mop:Vt,mopen:Vt,minner:Vt},mopen:{},mclose:{mop:Ht,mbin:Ft,mrel:Vt,minner:Ht},mpunct:{mord:Ht,mop:Ht,mrel:Vt,mopen:Ht,mclose:Ht,mpunct:Ht,minner:Ht},minner:{mord:Ht,mop:Ht,mbin:Ft,mrel:Vt,mopen:Ht,mpunct:Ht,minner:Ht}},Gt={mord:{mop:Ht},mop:{mord:Ht,mop:Ht},mbin:{},mrel:{},mopen:{},mclose:{mop:Ht},mpunct:{},minner:{mop:Ht}},Yt={},Wt={},Xt={};function _t(t){for(var e=t.type,r=t.names,a=t.props,n=t.handler,i=t.htmlBuilder,o=t.mathmlBuilder,s={type:e,numArgs:a.numArgs,argTypes:a.argTypes,greediness:void 0===a.greediness?1:a.greediness,allowedInText:!!a.allowedInText,allowedInMath:void 0===a.allowedInMath||a.allowedInMath,numOptionalArgs:a.numOptionalArgs||0,infix:!!a.infix,handler:n},l=0;l<r.length;++l)Yt[r[l]]=s;e&&(i&&(Wt[e]=i),o&&(Xt[e]=o));}function jt(t){_t({type:t.type,names:[],props:{numArgs:0},handler:function(){throw new Error("Should never be called.")},htmlBuilder:t.htmlBuilder,mathmlBuilder:t.mathmlBuilder});}var $t=function(t){return "ordgroup"===t.type?t.body:[t]},Zt=Dt.makeSpan,Kt=["leftmost","mbin","mopen","mrel","mop","mpunct"],Jt=["rightmost","mrel","mclose","mpunct"],Qt={display:w.DISPLAY,text:w.TEXT,script:w.SCRIPT,scriptscript:w.SCRIPTSCRIPT},te={mord:"mord",mop:"mop",mbin:"mbin",mrel:"mrel",mopen:"mopen",mclose:"mclose",mpunct:"mpunct",minner:"minner"},ee=function(t,e,r,a){void 0===a&&(a=[null,null]);for(var n=[],i=0;i<t.length;i++){var o=oe(t[i],e);if(o instanceof A){var s=o.children;n.push.apply(n,s);}else n.push(o);}if(!r)return n;var l=e;if(1===t.length){var h=t[0];"sizing"===h.type?l=e.havingSize(h.size):"styling"===h.type&&(l=e.havingStyle(Qt[h.style]));}var m=Zt([a[0]||"leftmost"],[],e),u=Zt([a[1]||"rightmost"],[],e),p="root"===r;return re(n,function(t,e){var r=e.classes[0],a=t.classes[0];"mbin"===r&&c.contains(Jt,a)?e.classes[0]="mord":"mbin"===a&&c.contains(Kt,r)&&(t.classes[0]="mord");},{node:m},u,p),re(n,function(t,e){var r=ne(e),a=ne(t),n=r&&a?t.hasClass("mtight")?Gt[r][a]:Ut[r][a]:null;if(n)return Dt.makeGlue(n,l)},{node:m},u,p),n},re=function t(e,r,a,n,i){n&&e.push(n);for(var o=0;o<e.length;o++){var s=e[o],l=ae(s);if(l)t(l.children,r,a,null,i);else{var h=!s.hasClass("mspace");if(h){var m=r(s,a.node);m&&(a.insertAfter?a.insertAfter(m):(e.unshift(m),o++));}h?a.node=s:i&&s.hasClass("newline")&&(a.node=Zt(["leftmost"])),a.insertAfter=function(t){return function(r){e.splice(t+1,0,r),o++;}}(o);}}n&&e.pop();},ae=function(t){return t instanceof A||t instanceof I||t instanceof N&&t.hasClass("enclosing")?t:null},ne=function(t,e){return t?(e&&(t=function t(e,r){var a=ae(e);if(a){var n=a.children;if(n.length){if("right"===r)return t(n[n.length-1],"right");if("left"===r)return t(n[0],"left")}}return e}(t,e)),te[t.classes[0]]||null):null},ie=function(t,e){var r=["nulldelimiter"].concat(t.baseSizingClasses());return Zt(e.concat(r))},oe=function(t,e,r){if(!t)return Zt();if(Wt[t.type]){var a=Wt[t.type](t,e);if(r&&e.size!==r.size){a=Zt(e.sizingClasses(r),[a],e);var n=e.sizeMultiplier/r.sizeMultiplier;a.height*=n,a.depth*=n;}return a}throw new o("Got group of unknown type: '"+t.type+"'")};function se(t,e){var r=Zt(["base"],t,e),a=Zt(["strut"]);return a.style.height=r.height+r.depth+"em",a.style.verticalAlign=-r.depth+"em",r.children.unshift(a),r}function le(t,e){var r=null;1===t.length&&"tag"===t[0].type&&(r=t[0].tag,t=t[0].body);for(var a,n=ee(t,e,"root"),i=[],o=[],s=0;s<n.length;s++)if(o.push(n[s]),n[s].hasClass("mbin")||n[s].hasClass("mrel")||n[s].hasClass("allowbreak")){for(var l=!1;s<n.length-1&&n[s+1].hasClass("mspace")&&!n[s+1].hasClass("newline");)s++,o.push(n[s]),n[s].hasClass("nobreak")&&(l=!0);l||(i.push(se(o,e)),o=[]);}else n[s].hasClass("newline")&&(o.pop(),o.length>0&&(i.push(se(o,e)),o=[]),i.push(n[s]));o.length>0&&i.push(se(o,e)),r&&((a=se(ee(r,e,!0))).classes=["tag"],i.push(a));var h=Zt(["katex-html"],i);if(h.setAttribute("aria-hidden","true"),a){var m=a.children[0];m.style.height=h.height+h.depth+"em",m.style.verticalAlign=-h.depth+"em";}return h}function he(t){return new A(t)}var me=function(){function t(t,e){this.type=void 0,this.attributes=void 0,this.children=void 0,this.type=t,this.attributes={},this.children=e||[];}var e=t.prototype;return e.setAttribute=function(t,e){this.attributes[t]=e;},e.getAttribute=function(t){return this.attributes[t]},e.toNode=function(){var t=document.createElementNS("http://www.w3.org/1998/Math/MathML",this.type);for(var e in this.attributes)Object.prototype.hasOwnProperty.call(this.attributes,e)&&t.setAttribute(e,this.attributes[e]);for(var r=0;r<this.children.length;r++)t.appendChild(this.children[r].toNode());return t},e.toMarkup=function(){var t="<"+this.type;for(var e in this.attributes)Object.prototype.hasOwnProperty.call(this.attributes,e)&&(t+=" "+e+'="',t+=c.escape(this.attributes[e]),t+='"');t+=">";for(var r=0;r<this.children.length;r++)t+=this.children[r].toMarkup();return t+="</"+this.type+">"},e.toText=function(){return this.children.map(function(t){return t.toText()}).join("")},t}(),ce=function(){function t(t){this.text=void 0,this.text=t;}var e=t.prototype;return e.toNode=function(){return document.createTextNode(this.text)},e.toMarkup=function(){return c.escape(this.toText())},e.toText=function(){return this.text},t}(),ue={MathNode:me,TextNode:ce,SpaceNode:function(){function t(t){this.width=void 0,this.character=void 0,this.width=t,this.character=t>=.05555&&t<=.05556?"\u200a":t>=.1666&&t<=.1667?"\u2009":t>=.2222&&t<=.2223?"\u2005":t>=.2777&&t<=.2778?"\u2005\u200a":t>=-.05556&&t<=-.05555?"\u200a\u2063":t>=-.1667&&t<=-.1666?"\u2009\u2063":t>=-.2223&&t<=-.2222?"\u205f\u2063":t>=-.2778&&t<=-.2777?"\u2005\u2063":null;}var e=t.prototype;return e.toNode=function(){if(this.character)return document.createTextNode(this.character);var t=document.createElementNS("http://www.w3.org/1998/Math/MathML","mspace");return t.setAttribute("width",this.width+"em"),t},e.toMarkup=function(){return this.character?"<mtext>"+this.character+"</mtext>":'<mspace width="'+this.width+'em"/>'},e.toText=function(){return this.character?this.character:" "},t}(),newDocumentFragment:he},pe=function(t,e,r){return !j[e][t]||!j[e][t].replace||55349===t.charCodeAt(0)||rt.hasOwnProperty(t)&&r&&(r.fontFamily&&"tt"===r.fontFamily.substr(4,2)||r.font&&"tt"===r.font.substr(4,2))||(t=j[e][t].replace),new ue.TextNode(t)},de=function(t){return 1===t.length?t[0]:new ue.MathNode("mrow",t)},fe=function(t,e){if("texttt"===e.fontFamily)return "monospace";if("textsf"===e.fontFamily)return "textit"===e.fontShape&&"textbf"===e.fontWeight?"sans-serif-bold-italic":"textit"===e.fontShape?"sans-serif-italic":"textbf"===e.fontWeight?"bold-sans-serif":"sans-serif";if("textit"===e.fontShape&&"textbf"===e.fontWeight)return "bold-italic";if("textit"===e.fontShape)return "italic";if("textbf"===e.fontWeight)return "bold";var r=e.font;if(!r||"mathnormal"===r)return null;var a=t.mode;if("mathit"===r)return "italic";if("boldsymbol"===r)return "textord"===t.type?"bold":"bold-italic";if("mathbf"===r)return "bold";if("mathbb"===r)return "double-struck";if("mathfrak"===r)return "fraktur";if("mathscr"===r||"mathcal"===r)return "script";if("mathsf"===r)return "sans-serif";if("mathtt"===r)return "monospace";var n=t.text;return c.contains(["\\imath","\\jmath"],n)?null:(j[a][n]&&j[a][n].replace&&(n=j[a][n].replace),G(n,Dt.fontMap[r].fontName,a)?Dt.fontMap[r].variant:null)},ge=function(t,e,r){if(1===t.length){var a=ve(t[0],e);return r&&a instanceof me&&"mo"===a.type&&(a.setAttribute("lspace","0em"),a.setAttribute("rspace","0em")),[a]}for(var n,i=[],o=0;o<t.length;o++){var s=ve(t[o],e);if(s instanceof me&&n instanceof me){if("mtext"===s.type&&"mtext"===n.type&&s.getAttribute("mathvariant")===n.getAttribute("mathvariant")){var l;(l=n.children).push.apply(l,s.children);continue}if("mn"===s.type&&"mn"===n.type){var h;(h=n.children).push.apply(h,s.children);continue}if("mi"===s.type&&1===s.children.length&&"mn"===n.type){var m=s.children[0];if(m instanceof ce&&"."===m.text){var c;(c=n.children).push.apply(c,s.children);continue}}else if("mi"===n.type&&1===n.children.length){var u=n.children[0];if(u instanceof ce&&"\u0338"===u.text&&("mo"===s.type||"mi"===s.type||"mn"===s.type)){var p=s.children[0];p instanceof ce&&p.text.length>0&&(p.text=p.text.slice(0,1)+"\u0338"+p.text.slice(1),i.pop());}}}i.push(s),n=s;}return i},xe=function(t,e,r){return de(ge(t,e,r))},ve=function(t,e){if(!t)return new ue.MathNode("mrow");if(Xt[t.type])return Xt[t.type](t,e);throw new o("Got group of unknown type: '"+t.type+"'")};function be(t,e,r,a,n){var i,o=ge(t,r);i=1===o.length&&o[0]instanceof me&&c.contains(["mrow","mtable"],o[0].type)?o[0]:new ue.MathNode("mrow",o);var s=new ue.MathNode("annotation",[new ue.TextNode(e)]);s.setAttribute("encoding","application/x-tex");var l=new ue.MathNode("semantics",[i,s]),h=new ue.MathNode("math",[l]);h.setAttribute("xmlns","http://www.w3.org/1998/Math/MathML"),a&&h.setAttribute("display","block");var m=n?"katex":"katex-mathml";return Dt.makeSpan([m],[h])}var ye=function(t){return new St({style:t.displayMode?w.DISPLAY:w.TEXT,maxSize:t.maxSize,minRuleThickness:t.minRuleThickness})},we=function(t,e){if(e.displayMode){var r=["katex-display"];e.leqno&&r.push("leqno"),e.fleqn&&r.push("fleqn"),t=Dt.makeSpan(r,[t]);}return t},ke=function(t,e,r){var a,n=ye(r);if("mathml"===r.output)return be(t,e,n,r.displayMode,!0);if("html"===r.output){var i=le(t,n);a=Dt.makeSpan(["katex"],[i]);}else{var o=be(t,e,n,r.displayMode,!1),s=le(t,n);a=Dt.makeSpan(["katex"],[o,s]);}return we(a,r)},Se={widehat:"^",widecheck:"\u02c7",widetilde:"~",utilde:"~",overleftarrow:"\u2190",underleftarrow:"\u2190",xleftarrow:"\u2190",overrightarrow:"\u2192",underrightarrow:"\u2192",xrightarrow:"\u2192",underbrace:"\u23df",overbrace:"\u23de",overgroup:"\u23e0",undergroup:"\u23e1",overleftrightarrow:"\u2194",underleftrightarrow:"\u2194",xleftrightarrow:"\u2194",Overrightarrow:"\u21d2",xRightarrow:"\u21d2",overleftharpoon:"\u21bc",xleftharpoonup:"\u21bc",overrightharpoon:"\u21c0",xrightharpoonup:"\u21c0",xLeftarrow:"\u21d0",xLeftrightarrow:"\u21d4",xhookleftarrow:"\u21a9",xhookrightarrow:"\u21aa",xmapsto:"\u21a6",xrightharpoondown:"\u21c1",xleftharpoondown:"\u21bd",xrightleftharpoons:"\u21cc",xleftrightharpoons:"\u21cb",xtwoheadleftarrow:"\u219e",xtwoheadrightarrow:"\u21a0",xlongequal:"=",xtofrom:"\u21c4",xrightleftarrows:"\u21c4",xrightequilibrium:"\u21cc",xleftequilibrium:"\u21cb"},Me={overrightarrow:[["rightarrow"],.888,522,"xMaxYMin"],overleftarrow:[["leftarrow"],.888,522,"xMinYMin"],underrightarrow:[["rightarrow"],.888,522,"xMaxYMin"],underleftarrow:[["leftarrow"],.888,522,"xMinYMin"],xrightarrow:[["rightarrow"],1.469,522,"xMaxYMin"],xleftarrow:[["leftarrow"],1.469,522,"xMinYMin"],Overrightarrow:[["doublerightarrow"],.888,560,"xMaxYMin"],xRightarrow:[["doublerightarrow"],1.526,560,"xMaxYMin"],xLeftarrow:[["doubleleftarrow"],1.526,560,"xMinYMin"],overleftharpoon:[["leftharpoon"],.888,522,"xMinYMin"],xleftharpoonup:[["leftharpoon"],.888,522,"xMinYMin"],xleftharpoondown:[["leftharpoondown"],.888,522,"xMinYMin"],overrightharpoon:[["rightharpoon"],.888,522,"xMaxYMin"],xrightharpoonup:[["rightharpoon"],.888,522,"xMaxYMin"],xrightharpoondown:[["rightharpoondown"],.888,522,"xMaxYMin"],xlongequal:[["longequal"],.888,334,"xMinYMin"],xtwoheadleftarrow:[["twoheadleftarrow"],.888,334,"xMinYMin"],xtwoheadrightarrow:[["twoheadrightarrow"],.888,334,"xMaxYMin"],overleftrightarrow:[["leftarrow","rightarrow"],.888,522],overbrace:[["leftbrace","midbrace","rightbrace"],1.6,548],underbrace:[["leftbraceunder","midbraceunder","rightbraceunder"],1.6,548],underleftrightarrow:[["leftarrow","rightarrow"],.888,522],xleftrightarrow:[["leftarrow","rightarrow"],1.75,522],xLeftrightarrow:[["doubleleftarrow","doublerightarrow"],1.75,560],xrightleftharpoons:[["leftharpoondownplus","rightharpoonplus"],1.75,716],xleftrightharpoons:[["leftharpoonplus","rightharpoondownplus"],1.75,716],xhookleftarrow:[["leftarrow","righthook"],1.08,522],xhookrightarrow:[["lefthook","rightarrow"],1.08,522],overlinesegment:[["leftlinesegment","rightlinesegment"],.888,522],underlinesegment:[["leftlinesegment","rightlinesegment"],.888,522],overgroup:[["leftgroup","rightgroup"],.888,342],undergroup:[["leftgroupunder","rightgroupunder"],.888,342],xmapsto:[["leftmapsto","rightarrow"],1.5,522],xtofrom:[["leftToFrom","rightToFrom"],1.75,528],xrightleftarrows:[["baraboveleftarrow","rightarrowabovebar"],1.75,901],xrightequilibrium:[["baraboveshortleftharpoon","rightharpoonaboveshortbar"],1.75,716],xleftequilibrium:[["shortbaraboveleftharpoon","shortrightharpoonabovebar"],1.75,716]},ze=function(t){return "ordgroup"===t.type?t.body.length:1},Ae=function(t,e,r,a){var n,i=t.height+t.depth+2*r;if(/fbox|color/.test(e)){if(n=Dt.makeSpan(["stretchy",e],[],a),"fbox"===e){var o=a.color&&a.getColor();o&&(n.style.borderColor=o);}}else{var s=[];/^[bx]cancel$/.test(e)&&s.push(new D({x1:"0",y1:"0",x2:"100%",y2:"100%","stroke-width":"0.046em"})),/^x?cancel$/.test(e)&&s.push(new D({x1:"0",y1:"100%",x2:"100%",y2:"0","stroke-width":"0.046em"}));var l=new L(s,{width:"100%",height:i+"em"});n=Dt.makeSvgSpan([],[l],a);}return n.height=i,n.style.height=i+"em",n},Te=function(t){var e=new ue.MathNode("mo",[new ue.TextNode(Se[t.substr(1)])]);return e.setAttribute("stretchy","true"),e},Be=function(t,e){var r=function(){var r=4e5,a=t.label.substr(1);if(c.contains(["widehat","widecheck","widetilde","utilde"],a)){var n,i,o,s=ze(t.base);if(s>5)"widehat"===a||"widecheck"===a?(n=420,r=2364,o=.42,i=a+"4"):(n=312,r=2340,o=.34,i="tilde4");else{var l=[1,1,2,2,3,3][s];"widehat"===a||"widecheck"===a?(r=[0,1062,2364,2364,2364][l],n=[0,239,300,360,420][l],o=[0,.24,.3,.3,.36,.42][l],i=a+l):(r=[0,600,1033,2339,2340][l],n=[0,260,286,306,312][l],o=[0,.26,.286,.3,.306,.34][l],i="tilde"+l);}var h=new P(i),m=new L([h],{width:"100%",height:o+"em",viewBox:"0 0 "+r+" "+n,preserveAspectRatio:"none"});return {span:Dt.makeSvgSpan([],[m],e),minWidth:0,height:o}}var u,p,d=[],f=Me[a],g=f[0],x=f[1],v=f[2],b=v/1e3,y=g.length;if(1===y)u=["hide-tail"],p=[f[3]];else if(2===y)u=["halfarrow-left","halfarrow-right"],p=["xMinYMin","xMaxYMin"];else{if(3!==y)throw new Error("Correct katexImagesData or update code here to support\n                    "+y+" children.");u=["brace-left","brace-center","brace-right"],p=["xMinYMin","xMidYMin","xMaxYMin"];}for(var w=0;w<y;w++){var k=new P(g[w]),S=new L([k],{width:"400em",height:b+"em",viewBox:"0 0 "+r+" "+v,preserveAspectRatio:p[w]+" slice"}),M=Dt.makeSvgSpan([u[w]],[S],e);if(1===y)return {span:M,minWidth:x,height:b};M.style.height=b+"em",d.push(M);}return {span:Dt.makeSpan(["stretchy"],d,e),minWidth:x,height:b}}(),a=r.span,n=r.minWidth,i=r.height;return a.height=i,a.style.height=i+"em",n>0&&(a.style.minWidth=n+"em"),a};function Ce(t,e){if(!t||t.type!==e)throw new Error("Expected node of type "+e+", but got "+(t?"node of type "+t.type:String(t)));return t}function qe(t){var e=Ne(t);if(!e)throw new Error("Expected node of symbol group type, but got "+(t?"node of type "+t.type:String(t)));return e}function Ne(t){return t&&("atom"===t.type||X.hasOwnProperty(t.type))?t:null}var Ie=function(t,e){var r,a,n;t&&"supsub"===t.type?(r=(a=Ce(t.base,"accent")).base,t.base=r,n=function(t){if(t instanceof N)return t;throw new Error("Expected span<HtmlDomNode> but got "+String(t)+".")}(oe(t,e)),t.base=a):r=(a=Ce(t,"accent")).base;var i=oe(r,e.havingCrampedStyle()),o=0;if(a.isShifty&&c.isCharacterBox(r)){var s=c.getBaseElem(r);o=H(oe(s,e.havingCrampedStyle())).skew;}var l,h=Math.min(i.height,e.fontMetrics().xHeight);if(a.isStretchy)l=Be(a,e),l=Dt.makeVList({positionType:"firstBaseline",children:[{type:"elem",elem:i},{type:"elem",elem:l,wrapperClasses:["svg-align"],wrapperStyle:o>0?{width:"calc(100% - "+2*o+"em)",marginLeft:2*o+"em"}:void 0}]},e);else{var m,u;"\\vec"===a.label?(m=Dt.staticSvg("vec",e),u=Dt.svgData.vec[1]):((m=H(m=Dt.makeOrd({mode:a.mode,text:a.label},e,"textord"))).italic=0,u=m.width),l=Dt.makeSpan(["accent-body"],[m]);var p="\\textcircled"===a.label;p&&(l.classes.push("accent-full"),h=i.height);var d=o;p||(d-=u/2),l.style.left=d+"em","\\textcircled"===a.label&&(l.style.top=".2em"),l=Dt.makeVList({positionType:"firstBaseline",children:[{type:"elem",elem:i},{type:"kern",size:-h},{type:"elem",elem:l}]},e);}var f=Dt.makeSpan(["mord","accent"],[l],e);return n?(n.children[0]=f,n.height=Math.max(f.height,n.height),n.classes[0]="mord",n):f},Oe=function(t,e){var r=t.isStretchy?Te(t.label):new ue.MathNode("mo",[pe(t.label,t.mode)]),a=new ue.MathNode("mover",[ve(t.base,e),r]);return a.setAttribute("accent","true"),a},Re=new RegExp(["\\acute","\\grave","\\ddot","\\tilde","\\bar","\\breve","\\check","\\hat","\\vec","\\dot","\\mathring"].map(function(t){return "\\"+t}).join("|"));_t({type:"accent",names:["\\acute","\\grave","\\ddot","\\tilde","\\bar","\\breve","\\check","\\hat","\\vec","\\dot","\\mathring","\\widecheck","\\widehat","\\widetilde","\\overrightarrow","\\overleftarrow","\\Overrightarrow","\\overleftrightarrow","\\overgroup","\\overlinesegment","\\overleftharpoon","\\overrightharpoon"],props:{numArgs:1},handler:function(t,e){var r=e[0],a=!Re.test(t.funcName),n=!a||"\\widehat"===t.funcName||"\\widetilde"===t.funcName||"\\widecheck"===t.funcName;return {type:"accent",mode:t.parser.mode,label:t.funcName,isStretchy:a,isShifty:n,base:r}},htmlBuilder:Ie,mathmlBuilder:Oe}),_t({type:"accent",names:["\\'","\\`","\\^","\\~","\\=","\\u","\\.",'\\"',"\\r","\\H","\\v","\\textcircled"],props:{numArgs:1,allowedInText:!0,allowedInMath:!1},handler:function(t,e){var r=e[0];return {type:"accent",mode:t.parser.mode,label:t.funcName,isStretchy:!1,isShifty:!0,base:r}},htmlBuilder:Ie,mathmlBuilder:Oe}),_t({type:"accentUnder",names:["\\underleftarrow","\\underrightarrow","\\underleftrightarrow","\\undergroup","\\underlinesegment","\\utilde"],props:{numArgs:1},handler:function(t,e){var r=t.parser,a=t.funcName,n=e[0];return {type:"accentUnder",mode:r.mode,label:a,base:n}},htmlBuilder:function(t,e){var r=oe(t.base,e),a=Be(t,e),n="\\utilde"===t.label?.12:0,i=Dt.makeVList({positionType:"top",positionData:r.height,children:[{type:"elem",elem:a,wrapperClasses:["svg-align"]},{type:"kern",size:n},{type:"elem",elem:r}]},e);return Dt.makeSpan(["mord","accentunder"],[i],e)},mathmlBuilder:function(t,e){var r=Te(t.label),a=new ue.MathNode("munder",[ve(t.base,e),r]);return a.setAttribute("accentunder","true"),a}});var Ee=function(t){var e=new ue.MathNode("mpadded",t?[t]:[]);return e.setAttribute("width","+0.6em"),e.setAttribute("lspace","0.3em"),e};_t({type:"xArrow",names:["\\xleftarrow","\\xrightarrow","\\xLeftarrow","\\xRightarrow","\\xleftrightarrow","\\xLeftrightarrow","\\xhookleftarrow","\\xhookrightarrow","\\xmapsto","\\xrightharpoondown","\\xrightharpoonup","\\xleftharpoondown","\\xleftharpoonup","\\xrightleftharpoons","\\xleftrightharpoons","\\xlongequal","\\xtwoheadrightarrow","\\xtwoheadleftarrow","\\xtofrom","\\xrightleftarrows","\\xrightequilibrium","\\xleftequilibrium"],props:{numArgs:1,numOptionalArgs:1},handler:function(t,e,r){var a=t.parser,n=t.funcName;return {type:"xArrow",mode:a.mode,label:n,body:e[0],below:r[0]}},htmlBuilder:function(t,e){var r,a=e.style,n=e.havingStyle(a.sup()),i=Dt.wrapFragment(oe(t.body,n,e),e);i.classes.push("x-arrow-pad"),t.below&&(n=e.havingStyle(a.sub()),(r=Dt.wrapFragment(oe(t.below,n,e),e)).classes.push("x-arrow-pad"));var o,s=Be(t,e),l=-e.fontMetrics().axisHeight+.5*s.height,h=-e.fontMetrics().axisHeight-.5*s.height-.111;if((i.depth>.25||"\\xleftequilibrium"===t.label)&&(h-=i.depth),r){var m=-e.fontMetrics().axisHeight+r.height+.5*s.height+.111;o=Dt.makeVList({positionType:"individualShift",children:[{type:"elem",elem:i,shift:h},{type:"elem",elem:s,shift:l},{type:"elem",elem:r,shift:m}]},e);}else o=Dt.makeVList({positionType:"individualShift",children:[{type:"elem",elem:i,shift:h},{type:"elem",elem:s,shift:l}]},e);return o.children[0].children[0].children[1].classes.push("svg-align"),Dt.makeSpan(["mrel","x-arrow"],[o],e)},mathmlBuilder:function(t,e){var r,a=Te(t.label);if(t.body){var n=Ee(ve(t.body,e));if(t.below){var i=Ee(ve(t.below,e));r=new ue.MathNode("munderover",[a,i,n]);}else r=new ue.MathNode("mover",[a,n]);}else if(t.below){var o=Ee(ve(t.below,e));r=new ue.MathNode("munder",[a,o]);}else r=Ee(),r=new ue.MathNode("mover",[a,r]);return r}}),_t({type:"textord",names:["\\@char"],props:{numArgs:1,allowedInText:!0},handler:function(t,e){for(var r=t.parser,a=Ce(e[0],"ordgroup").body,n="",i=0;i<a.length;i++){n+=Ce(a[i],"textord").text;}var s=parseInt(n);if(isNaN(s))throw new o("\\@char has non-numeric argument "+n);return {type:"textord",mode:r.mode,text:String.fromCharCode(s)}}});var Le=function(t,e){var r=ee(t.body,e.withColor(t.color),!1);return Dt.makeFragment(r)},Pe=function(t,e){var r=ge(t.body,e.withColor(t.color)),a=new ue.MathNode("mstyle",r);return a.setAttribute("mathcolor",t.color),a};_t({type:"color",names:["\\textcolor"],props:{numArgs:2,allowedInText:!0,greediness:3,argTypes:["color","original"]},handler:function(t,e){var r=t.parser,a=Ce(e[0],"color-token").color,n=e[1];return {type:"color",mode:r.mode,color:a,body:$t(n)}},htmlBuilder:Le,mathmlBuilder:Pe}),_t({type:"color",names:["\\color"],props:{numArgs:1,allowedInText:!0,greediness:3,argTypes:["color"]},handler:function(t,e){var r=t.parser,a=t.breakOnTokenText,n=Ce(e[0],"color-token").color;r.gullet.macros.set("\\current@color",n);var i=r.parseExpression(!0,a);return {type:"color",mode:r.mode,color:n,body:i}},htmlBuilder:Le,mathmlBuilder:Pe}),_t({type:"cr",names:["\\cr","\\newline"],props:{numArgs:0,numOptionalArgs:1,argTypes:["size"],allowedInText:!0},handler:function(t,e,r){var a=t.parser,n=t.funcName,i=r[0],o="\\cr"===n,s=!1;return o||(s=!a.settings.displayMode||!a.settings.useStrictBehavior("newLineInDisplayMode","In LaTeX, \\\\ or \\newline does nothing in display mode")),{type:"cr",mode:a.mode,newLine:s,newRow:o,size:i&&Ce(i,"size").value}},htmlBuilder:function(t,e){if(t.newRow)throw new o("\\cr valid only within a tabular/array environment");var r=Dt.makeSpan(["mspace"],[],e);return t.newLine&&(r.classes.push("newline"),t.size&&(r.style.marginTop=Tt(t.size,e)+"em")),r},mathmlBuilder:function(t,e){var r=new ue.MathNode("mspace");return t.newLine&&(r.setAttribute("linebreak","newline"),t.size&&r.setAttribute("height",Tt(t.size,e)+"em")),r}});var De={"\\global":"\\global","\\long":"\\\\globallong","\\\\globallong":"\\\\globallong","\\def":"\\gdef","\\gdef":"\\gdef","\\edef":"\\xdef","\\xdef":"\\xdef","\\let":"\\\\globallet","\\futurelet":"\\\\globalfuture"},He=function(t){var e=t.text;if(/^(?:[\\{}$&#^_]|EOF)$/.test(e))throw new o("Expected a control sequence",t);return e},Fe=function(t,e,r,a){var n=t.gullet.macros.get(r.text);null==n&&(r.noexpand=!0,n={tokens:[r],numArgs:0,unexpandable:!t.gullet.isExpandable(r.text)}),t.gullet.macros.set(e,n,a);};_t({type:"internal",names:["\\global","\\long","\\\\globallong"],props:{numArgs:0,allowedInText:!0},handler:function(t){var e=t.parser,r=t.funcName;e.consumeSpaces();var a=e.fetch();if(De[a.text])return "\\global"!==r&&"\\\\globallong"!==r||(a.text=De[a.text]),Ce(e.parseFunction(),"internal");throw new o("Invalid token after macro prefix",a)}}),_t({type:"internal",names:["\\def","\\gdef","\\edef","\\xdef"],props:{numArgs:0,allowedInText:!0},handler:function(t){var e=t.parser,r=t.funcName,a=e.gullet.consumeArgs(1)[0];if(1!==a.length)throw new o("\\gdef's first argument must be a macro name");var n=a[0].text,i=0;for(a=e.gullet.consumeArgs(1)[0];1===a.length&&"#"===a[0].text;){if(1!==(a=e.gullet.consumeArgs(1)[0]).length)throw new o('Invalid argument number length "'+a.length+'"');if(!/^[1-9]$/.test(a[0].text))throw new o('Invalid argument number "'+a[0].text+'"');if(i++,parseInt(a[0].text)!==i)throw new o('Argument number "'+a[0].text+'" out of order');a=e.gullet.consumeArgs(1)[0];}return "\\edef"!==r&&"\\xdef"!==r||(a=e.gullet.expandTokens(a)).reverse(),e.gullet.macros.set(n,{tokens:a,numArgs:i},r===De[r]),{type:"internal",mode:e.mode}}}),_t({type:"internal",names:["\\let","\\\\globallet"],props:{numArgs:0,allowedInText:!0},handler:function(t){var e=t.parser,r=t.funcName,a=He(e.gullet.popToken());e.gullet.consumeSpaces();var n=function(t){var e=t.gullet.popToken();return "="===e.text&&" "===(e=t.gullet.popToken()).text&&(e=t.gullet.popToken()),e}(e);return Fe(e,a,n,"\\\\globallet"===r),{type:"internal",mode:e.mode}}}),_t({type:"internal",names:["\\futurelet","\\\\globalfuture"],props:{numArgs:0,allowedInText:!0},handler:function(t){var e=t.parser,r=t.funcName,a=He(e.gullet.popToken()),n=e.gullet.popToken(),i=e.gullet.popToken();return Fe(e,a,i,"\\\\globalfuture"===r),e.gullet.pushToken(i),e.gullet.pushToken(n),{type:"internal",mode:e.mode}}});var Ve=function(t,e,r){var a=G(j.math[t]&&j.math[t].replace||t,e,r);if(!a)throw new Error("Unsupported symbol "+t+" and font size "+e+".");return a},Ue=function(t,e,r,a){var n=r.havingBaseStyle(e),i=Dt.makeSpan(a.concat(n.sizingClasses(r)),[t],r),o=n.sizeMultiplier/r.sizeMultiplier;return i.height*=o,i.depth*=o,i.maxFontSize=n.sizeMultiplier,i},Ge=function(t,e,r){var a=e.havingBaseStyle(r),n=(1-e.sizeMultiplier/a.sizeMultiplier)*e.fontMetrics().axisHeight;t.classes.push("delimcenter"),t.style.top=n+"em",t.height-=n,t.depth+=n;},Ye=function(t,e,r,a,n,i){var o=function(t,e,r,a){return Dt.makeSymbol(t,"Size"+e+"-Regular",r,a)}(t,e,n,a),s=Ue(Dt.makeSpan(["delimsizing","size"+e],[o],a),w.TEXT,a,i);return r&&Ge(s,a,w.TEXT),s},We=function(t,e,r){var a;return a="Size1-Regular"===e?"delim-size1":"delim-size4",{type:"elem",elem:Dt.makeSpan(["delimsizinginner",a],[Dt.makeSpan([],[Dt.makeSymbol(t,e,r)])])}},Xe={type:"kern",size:-.005},_e=function(t,e,r,a,n,i){var o,s,l,h;o=l=h=t,s=null;var m="Size1-Regular";"\\uparrow"===t?l=h="\u23d0":"\\Uparrow"===t?l=h="\u2016":"\\downarrow"===t?o=l="\u23d0":"\\Downarrow"===t?o=l="\u2016":"\\updownarrow"===t?(o="\\uparrow",l="\u23d0",h="\\downarrow"):"\\Updownarrow"===t?(o="\\Uparrow",l="\u2016",h="\\Downarrow"):"["===t||"\\lbrack"===t?(o="\u23a1",l="\u23a2",h="\u23a3",m="Size4-Regular"):"]"===t||"\\rbrack"===t?(o="\u23a4",l="\u23a5",h="\u23a6",m="Size4-Regular"):"\\lfloor"===t||"\u230a"===t?(l=o="\u23a2",h="\u23a3",m="Size4-Regular"):"\\lceil"===t||"\u2308"===t?(o="\u23a1",l=h="\u23a2",m="Size4-Regular"):"\\rfloor"===t||"\u230b"===t?(l=o="\u23a5",h="\u23a6",m="Size4-Regular"):"\\rceil"===t||"\u2309"===t?(o="\u23a4",l=h="\u23a5",m="Size4-Regular"):"("===t||"\\lparen"===t?(o="\u239b",l="\u239c",h="\u239d",m="Size4-Regular"):")"===t||"\\rparen"===t?(o="\u239e",l="\u239f",h="\u23a0",m="Size4-Regular"):"\\{"===t||"\\lbrace"===t?(o="\u23a7",s="\u23a8",h="\u23a9",l="\u23aa",m="Size4-Regular"):"\\}"===t||"\\rbrace"===t?(o="\u23ab",s="\u23ac",h="\u23ad",l="\u23aa",m="Size4-Regular"):"\\lgroup"===t||"\u27ee"===t?(o="\u23a7",h="\u23a9",l="\u23aa",m="Size4-Regular"):"\\rgroup"===t||"\u27ef"===t?(o="\u23ab",h="\u23ad",l="\u23aa",m="Size4-Regular"):"\\lmoustache"===t||"\u23b0"===t?(o="\u23a7",h="\u23ad",l="\u23aa",m="Size4-Regular"):"\\rmoustache"!==t&&"\u23b1"!==t||(o="\u23ab",h="\u23a9",l="\u23aa",m="Size4-Regular");var c=Ve(o,m,n),u=c.height+c.depth,p=Ve(l,m,n),d=p.height+p.depth,f=Ve(h,m,n),g=f.height+f.depth,x=0,v=1;if(null!==s){var b=Ve(s,m,n);x=b.height+b.depth,v=2;}var y=u+g+x,k=Math.max(0,Math.ceil((e-y)/(v*d))),S=y+k*v*d,M=a.fontMetrics().axisHeight;r&&(M*=a.sizeMultiplier);var z=S/2-M,A=.005*(k+1)-d,T=[];if(T.push(We(h,m,n)),null===s)for(var B=0;B<k;B++)T.push(Xe),T.push(We(l,m,n));else{for(var C=0;C<k;C++)T.push(Xe),T.push(We(l,m,n));T.push({type:"kern",size:A}),T.push(We(l,m,n)),T.push(Xe),T.push(We(s,m,n));for(var q=0;q<k;q++)T.push(Xe),T.push(We(l,m,n));}if("\u239c"!==l&&"\u239f"!==l||0!==k)T.push({type:"kern",size:A}),T.push(We(l,m,n)),T.push(Xe);else{var N=Dt.svgData.leftParenInner[2]/2;T.push({type:"kern",size:-N});var I="\u239c"===l?"leftParenInner":"rightParenInner",O=Dt.staticSvg(I,a);T.push({type:"elem",elem:O}),T.push({type:"kern",size:-N});}T.push(We(o,m,n));var R=a.havingBaseStyle(w.TEXT),E=Dt.makeVList({positionType:"bottom",positionData:z,children:T},R);return Ue(Dt.makeSpan(["delimsizing","mult"],[E],R),w.TEXT,a,i)},je=function(t,e,r,a,n){var i=function(t,e,r){e*=1e3;var a="";switch(t){case"sqrtMain":a=function(t,e){return "M95,"+(622+t+e)+"\nc-2.7,0,-7.17,-2.7,-13.5,-8c-5.8,-5.3,-9.5,-10,-9.5,-14\nc0,-2,0.3,-3.3,1,-4c1.3,-2.7,23.83,-20.7,67.5,-54\nc44.2,-33.3,65.8,-50.3,66.5,-51c1.3,-1.3,3,-2,5,-2c4.7,0,8.7,3.3,12,10\ns173,378,173,378c0.7,0,35.3,-71,104,-213c68.7,-142,137.5,-285,206.5,-429\nc69,-144,104.5,-217.7,106.5,-221\nl"+t/2.075+" -"+t+"\nc5.3,-9.3,12,-14,20,-14\nH400000v"+(40+t)+"H845.2724\ns-225.272,467,-225.272,467s-235,486,-235,486c-2.7,4.7,-9,7,-19,7\nc-6,0,-10,-1,-12,-3s-194,-422,-194,-422s-65,47,-65,47z\nM"+(834+t)+" "+e+"h400000v"+(40+t)+"h-400000z"}(e,80);break;case"sqrtSize1":a=function(t,e){return "M263,"+(601+t+e)+"c0.7,0,18,39.7,52,119\nc34,79.3,68.167,158.7,102.5,238c34.3,79.3,51.8,119.3,52.5,120\nc340,-704.7,510.7,-1060.3,512,-1067\nl"+t/2.084+" -"+t+"\nc4.7,-7.3,11,-11,19,-11\nH40000v"+(40+t)+"H1012.3\ns-271.3,567,-271.3,567c-38.7,80.7,-84,175,-136,283c-52,108,-89.167,185.3,-111.5,232\nc-22.3,46.7,-33.8,70.3,-34.5,71c-4.7,4.7,-12.3,7,-23,7s-12,-1,-12,-1\ns-109,-253,-109,-253c-72.7,-168,-109.3,-252,-110,-252c-10.7,8,-22,16.7,-34,26\nc-22,17.3,-33.3,26,-34,26s-26,-26,-26,-26s76,-59,76,-59s76,-60,76,-60z\nM"+(1001+t)+" "+e+"h400000v"+(40+t)+"h-400000z"}(e,80);break;case"sqrtSize2":a=function(t,e){return "M983 "+(10+t+e)+"\nl"+t/3.13+" -"+t+"\nc4,-6.7,10,-10,18,-10 H400000v"+(40+t)+"\nH1013.1s-83.4,268,-264.1,840c-180.7,572,-277,876.3,-289,913c-4.7,4.7,-12.7,7,-24,7\ns-12,0,-12,0c-1.3,-3.3,-3.7,-11.7,-7,-25c-35.3,-125.3,-106.7,-373.3,-214,-744\nc-10,12,-21,25,-33,39s-32,39,-32,39c-6,-5.3,-15,-14,-27,-26s25,-30,25,-30\nc26.7,-32.7,52,-63,76,-91s52,-60,52,-60s208,722,208,722\nc56,-175.3,126.3,-397.3,211,-666c84.7,-268.7,153.8,-488.2,207.5,-658.5\nc53.7,-170.3,84.5,-266.8,92.5,-289.5z\nM"+(1001+t)+" "+e+"h400000v"+(40+t)+"h-400000z"}(e,80);break;case"sqrtSize3":a=function(t,e){return "M424,"+(2398+t+e)+"\nc-1.3,-0.7,-38.5,-172,-111.5,-514c-73,-342,-109.8,-513.3,-110.5,-514\nc0,-2,-10.7,14.3,-32,49c-4.7,7.3,-9.8,15.7,-15.5,25c-5.7,9.3,-9.8,16,-12.5,20\ns-5,7,-5,7c-4,-3.3,-8.3,-7.7,-13,-13s-13,-13,-13,-13s76,-122,76,-122s77,-121,77,-121\ns209,968,209,968c0,-2,84.7,-361.7,254,-1079c169.3,-717.3,254.7,-1077.7,256,-1081\nl"+t/4.223+" -"+t+"c4,-6.7,10,-10,18,-10 H400000\nv"+(40+t)+"H1014.6\ns-87.3,378.7,-272.6,1166c-185.3,787.3,-279.3,1182.3,-282,1185\nc-2,6,-10,9,-24,9\nc-8,0,-12,-0.7,-12,-2z M"+(1001+t)+" "+e+"\nh400000v"+(40+t)+"h-400000z"}(e,80);break;case"sqrtSize4":a=function(t,e){return "M473,"+(2713+t+e)+"\nc339.3,-1799.3,509.3,-2700,510,-2702 l"+t/5.298+" -"+t+"\nc3.3,-7.3,9.3,-11,18,-11 H400000v"+(40+t)+"H1017.7\ns-90.5,478,-276.2,1466c-185.7,988,-279.5,1483,-281.5,1485c-2,6,-10,9,-24,9\nc-8,0,-12,-0.7,-12,-2c0,-1.3,-5.3,-32,-16,-92c-50.7,-293.3,-119.7,-693.3,-207,-1200\nc0,-1.3,-5.3,8.7,-16,30c-10.7,21.3,-21.3,42.7,-32,64s-16,33,-16,33s-26,-26,-26,-26\ns76,-153,76,-153s77,-151,77,-151c0.7,0.7,35.7,202,105,604c67.3,400.7,102,602.7,104,\n606zM"+(1001+t)+" "+e+"h400000v"+(40+t)+"H1017.7z"}(e,80);break;case"sqrtTall":a=function(t,e,r){return "M702 "+(t+e)+"H400000"+(40+t)+"\nH742v"+(r-54-e-t)+"l-4 4-4 4c-.667.7 -2 1.5-4 2.5s-4.167 1.833-6.5 2.5-5.5 1-9.5 1\nh-12l-28-84c-16.667-52-96.667 -294.333-240-727l-212 -643 -85 170\nc-4-3.333-8.333-7.667-13 -13l-13-13l77-155 77-156c66 199.333 139 419.667\n219 661 l218 661zM702 "+e+"H400000v"+(40+t)+"H742z"}(e,80,r);}return a}(t,a,r),o=new P(t,i),s=new L([o],{width:"400em",height:e+"em",viewBox:"0 0 400000 "+r,preserveAspectRatio:"xMinYMin slice"});return Dt.makeSvgSpan(["hide-tail"],[s],n)},$e=["(","\\lparen",")","\\rparen","[","\\lbrack","]","\\rbrack","\\{","\\lbrace","\\}","\\rbrace","\\lfloor","\\rfloor","\u230a","\u230b","\\lceil","\\rceil","\u2308","\u2309","\\surd"],Ze=["\\uparrow","\\downarrow","\\updownarrow","\\Uparrow","\\Downarrow","\\Updownarrow","|","\\|","\\vert","\\Vert","\\lvert","\\rvert","\\lVert","\\rVert","\\lgroup","\\rgroup","\u27ee","\u27ef","\\lmoustache","\\rmoustache","\u23b0","\u23b1"],Ke=["<",">","\\langle","\\rangle","/","\\backslash","\\lt","\\gt"],Je=[0,1.2,1.8,2.4,3],Qe=[{type:"small",style:w.SCRIPTSCRIPT},{type:"small",style:w.SCRIPT},{type:"small",style:w.TEXT},{type:"large",size:1},{type:"large",size:2},{type:"large",size:3},{type:"large",size:4}],tr=[{type:"small",style:w.SCRIPTSCRIPT},{type:"small",style:w.SCRIPT},{type:"small",style:w.TEXT},{type:"stack"}],er=[{type:"small",style:w.SCRIPTSCRIPT},{type:"small",style:w.SCRIPT},{type:"small",style:w.TEXT},{type:"large",size:1},{type:"large",size:2},{type:"large",size:3},{type:"large",size:4},{type:"stack"}],rr=function(t){if("small"===t.type)return "Main-Regular";if("large"===t.type)return "Size"+t.size+"-Regular";if("stack"===t.type)return "Size4-Regular";throw new Error("Add support for delim type '"+t.type+"' here.")},ar=function(t,e,r,a){for(var n=Math.min(2,3-a.style.size);n<r.length&&"stack"!==r[n].type;n++){var i=Ve(t,rr(r[n]),"math"),o=i.height+i.depth;if("small"===r[n].type&&(o*=a.havingBaseStyle(r[n].style).sizeMultiplier),o>e)return r[n]}return r[r.length-1]},nr=function(t,e,r,a,n,i){var o;"<"===t||"\\lt"===t||"\u27e8"===t?t="\\langle":">"!==t&&"\\gt"!==t&&"\u27e9"!==t||(t="\\rangle"),o=c.contains(Ke,t)?Qe:c.contains($e,t)?er:tr;var s=ar(t,e,o,a);return "small"===s.type?function(t,e,r,a,n,i){var o=Dt.makeSymbol(t,"Main-Regular",n,a),s=Ue(o,e,a,i);return r&&Ge(s,a,e),s}(t,s.style,r,a,n,i):"large"===s.type?Ye(t,s.size,r,a,n,i):_e(t,e,r,a,n,i)},ir=function(t,e){var r,a,n=e.havingBaseSizing(),i=ar("\\surd",t*n.sizeMultiplier,er,n),o=n.sizeMultiplier,s=Math.max(0,e.minRuleThickness-e.fontMetrics().sqrtRuleThickness),l=0,h=0,m=0;return "small"===i.type?(t<1?o=1:t<1.4&&(o=.7),h=(1+s)/o,(r=je("sqrtMain",l=(1+s+.08)/o,m=1e3+1e3*s+80,s,e)).style.minWidth="0.853em",a=.833/o):"large"===i.type?(m=1080*Je[i.size],h=(Je[i.size]+s)/o,l=(Je[i.size]+s+.08)/o,(r=je("sqrtSize"+i.size,l,m,s,e)).style.minWidth="1.02em",a=1/o):(l=t+s+.08,h=t+s,m=Math.floor(1e3*t+s)+80,(r=je("sqrtTall",l,m,s,e)).style.minWidth="0.742em",a=1.056),r.height=h,r.style.height=l+"em",{span:r,advanceWidth:a,ruleWidth:(e.fontMetrics().sqrtRuleThickness+s)*o}},or=function(t,e,r,a,n){if("<"===t||"\\lt"===t||"\u27e8"===t?t="\\langle":">"!==t&&"\\gt"!==t&&"\u27e9"!==t||(t="\\rangle"),c.contains($e,t)||c.contains(Ke,t))return Ye(t,e,!1,r,a,n);if(c.contains(Ze,t))return _e(t,Je[e],!1,r,a,n);throw new o("Illegal delimiter: '"+t+"'")},sr=nr,lr=function(t,e,r,a,n,i){var o=a.fontMetrics().axisHeight*a.sizeMultiplier,s=5/a.fontMetrics().ptPerEm,l=Math.max(e-o,r+o),h=Math.max(l/500*901,2*l-s);return nr(t,h,!0,a,n,i)},hr={"\\bigl":{mclass:"mopen",size:1},"\\Bigl":{mclass:"mopen",size:2},"\\biggl":{mclass:"mopen",size:3},"\\Biggl":{mclass:"mopen",size:4},"\\bigr":{mclass:"mclose",size:1},"\\Bigr":{mclass:"mclose",size:2},"\\biggr":{mclass:"mclose",size:3},"\\Biggr":{mclass:"mclose",size:4},"\\bigm":{mclass:"mrel",size:1},"\\Bigm":{mclass:"mrel",size:2},"\\biggm":{mclass:"mrel",size:3},"\\Biggm":{mclass:"mrel",size:4},"\\big":{mclass:"mord",size:1},"\\Big":{mclass:"mord",size:2},"\\bigg":{mclass:"mord",size:3},"\\Bigg":{mclass:"mord",size:4}},mr=["(","\\lparen",")","\\rparen","[","\\lbrack","]","\\rbrack","\\{","\\lbrace","\\}","\\rbrace","\\lfloor","\\rfloor","\u230a","\u230b","\\lceil","\\rceil","\u2308","\u2309","<",">","\\langle","\u27e8","\\rangle","\u27e9","\\lt","\\gt","\\lvert","\\rvert","\\lVert","\\rVert","\\lgroup","\\rgroup","\u27ee","\u27ef","\\lmoustache","\\rmoustache","\u23b0","\u23b1","/","\\backslash","|","\\vert","\\|","\\Vert","\\uparrow","\\Uparrow","\\downarrow","\\Downarrow","\\updownarrow","\\Updownarrow","."];function cr(t,e){var r=Ne(t);if(r&&c.contains(mr,r.text))return r;throw new o(r?"Invalid delimiter '"+r.text+"' after '"+e.funcName+"'":"Invalid delimiter type '"+t.type+"'",t)}function ur(t){if(!t.body)throw new Error("Bug: The leftright ParseNode wasn't fully parsed.")}_t({type:"delimsizing",names:["\\bigl","\\Bigl","\\biggl","\\Biggl","\\bigr","\\Bigr","\\biggr","\\Biggr","\\bigm","\\Bigm","\\biggm","\\Biggm","\\big","\\Big","\\bigg","\\Bigg"],props:{numArgs:1},handler:function(t,e){var r=cr(e[0],t);return {type:"delimsizing",mode:t.parser.mode,size:hr[t.funcName].size,mclass:hr[t.funcName].mclass,delim:r.text}},htmlBuilder:function(t,e){return "."===t.delim?Dt.makeSpan([t.mclass]):or(t.delim,t.size,e,t.mode,[t.mclass])},mathmlBuilder:function(t){var e=[];"."!==t.delim&&e.push(pe(t.delim,t.mode));var r=new ue.MathNode("mo",e);return "mopen"===t.mclass||"mclose"===t.mclass?r.setAttribute("fence","true"):r.setAttribute("fence","false"),r}}),_t({type:"leftright-right",names:["\\right"],props:{numArgs:1},handler:function(t,e){var r=t.parser.gullet.macros.get("\\current@color");if(r&&"string"!=typeof r)throw new o("\\current@color set to non-string in \\right");return {type:"leftright-right",mode:t.parser.mode,delim:cr(e[0],t).text,color:r}}}),_t({type:"leftright",names:["\\left"],props:{numArgs:1},handler:function(t,e){var r=cr(e[0],t),a=t.parser;++a.leftrightDepth;var n=a.parseExpression(!1);--a.leftrightDepth,a.expect("\\right",!1);var i=Ce(a.parseFunction(),"leftright-right");return {type:"leftright",mode:a.mode,body:n,left:r.text,right:i.delim,rightColor:i.color}},htmlBuilder:function(t,e){ur(t);for(var r,a,n=ee(t.body,e,!0,["mopen","mclose"]),i=0,o=0,s=!1,l=0;l<n.length;l++)n[l].isMiddle?s=!0:(i=Math.max(n[l].height,i),o=Math.max(n[l].depth,o));if(i*=e.sizeMultiplier,o*=e.sizeMultiplier,r="."===t.left?ie(e,["mopen"]):lr(t.left,i,o,e,t.mode,["mopen"]),n.unshift(r),s)for(var h=1;h<n.length;h++){var m=n[h].isMiddle;m&&(n[h]=lr(m.delim,i,o,m.options,t.mode,[]));}if("."===t.right)a=ie(e,["mclose"]);else{var c=t.rightColor?e.withColor(t.rightColor):e;a=lr(t.right,i,o,c,t.mode,["mclose"]);}return n.push(a),Dt.makeSpan(["minner"],n,e)},mathmlBuilder:function(t,e){ur(t);var r=ge(t.body,e);if("."!==t.left){var a=new ue.MathNode("mo",[pe(t.left,t.mode)]);a.setAttribute("fence","true"),r.unshift(a);}if("."!==t.right){var n=new ue.MathNode("mo",[pe(t.right,t.mode)]);n.setAttribute("fence","true"),t.rightColor&&n.setAttribute("mathcolor",t.rightColor),r.push(n);}return de(r)}}),_t({type:"middle",names:["\\middle"],props:{numArgs:1},handler:function(t,e){var r=cr(e[0],t);if(!t.parser.leftrightDepth)throw new o("\\middle without preceding \\left",r);return {type:"middle",mode:t.parser.mode,delim:r.text}},htmlBuilder:function(t,e){var r;if("."===t.delim)r=ie(e,[]);else{r=or(t.delim,1,e,t.mode,[]);var a={delim:t.delim,options:e};r.isMiddle=a;}return r},mathmlBuilder:function(t,e){var r="\\vert"===t.delim||"|"===t.delim?pe("|","text"):pe(t.delim,t.mode),a=new ue.MathNode("mo",[r]);return a.setAttribute("fence","true"),a.setAttribute("lspace","0.05em"),a.setAttribute("rspace","0.05em"),a}});var pr=function(t,e){var r,a,n=Dt.wrapFragment(oe(t.body,e),e),i=t.label.substr(1),o=e.sizeMultiplier,s=0,l=c.isCharacterBox(t.body);if("sout"===i)(r=Dt.makeSpan(["stretchy","sout"])).height=e.fontMetrics().defaultRuleThickness/o,s=-.5*e.fontMetrics().xHeight;else{/cancel/.test(i)?l||n.classes.push("cancel-pad"):n.classes.push("boxpad");var h=0,m=0;/box/.test(i)?(m=Math.max(e.fontMetrics().fboxrule,e.minRuleThickness),h=e.fontMetrics().fboxsep+("colorbox"===i?0:m)):h=l?.2:0,r=Ae(n,i,h,e),/fbox|boxed|fcolorbox/.test(i)&&(r.style.borderStyle="solid",r.style.borderWidth=m+"em"),s=n.depth+h,t.backgroundColor&&(r.style.backgroundColor=t.backgroundColor,t.borderColor&&(r.style.borderColor=t.borderColor));}return a=t.backgroundColor?Dt.makeVList({positionType:"individualShift",children:[{type:"elem",elem:r,shift:s},{type:"elem",elem:n,shift:0}]},e):Dt.makeVList({positionType:"individualShift",children:[{type:"elem",elem:n,shift:0},{type:"elem",elem:r,shift:s,wrapperClasses:/cancel/.test(i)?["svg-align"]:[]}]},e),/cancel/.test(i)&&(a.height=n.height,a.depth=n.depth),/cancel/.test(i)&&!l?Dt.makeSpan(["mord","cancel-lap"],[a],e):Dt.makeSpan(["mord"],[a],e)},dr=function(t,e){var r=0,a=new ue.MathNode(t.label.indexOf("colorbox")>-1?"mpadded":"menclose",[ve(t.body,e)]);switch(t.label){case"\\cancel":a.setAttribute("notation","updiagonalstrike");break;case"\\bcancel":a.setAttribute("notation","downdiagonalstrike");break;case"\\sout":a.setAttribute("notation","horizontalstrike");break;case"\\fbox":a.setAttribute("notation","box");break;case"\\fcolorbox":case"\\colorbox":if(r=e.fontMetrics().fboxsep*e.fontMetrics().ptPerEm,a.setAttribute("width","+"+2*r+"pt"),a.setAttribute("height","+"+2*r+"pt"),a.setAttribute("lspace",r+"pt"),a.setAttribute("voffset",r+"pt"),"\\fcolorbox"===t.label){var n=Math.max(e.fontMetrics().fboxrule,e.minRuleThickness);a.setAttribute("style","border: "+n+"em solid "+String(t.borderColor));}break;case"\\xcancel":a.setAttribute("notation","updiagonalstrike downdiagonalstrike");}return t.backgroundColor&&a.setAttribute("mathbackground",t.backgroundColor),a};_t({type:"enclose",names:["\\colorbox"],props:{numArgs:2,allowedInText:!0,greediness:3,argTypes:["color","text"]},handler:function(t,e,r){var a=t.parser,n=t.funcName,i=Ce(e[0],"color-token").color,o=e[1];return {type:"enclose",mode:a.mode,label:n,backgroundColor:i,body:o}},htmlBuilder:pr,mathmlBuilder:dr}),_t({type:"enclose",names:["\\fcolorbox"],props:{numArgs:3,allowedInText:!0,greediness:3,argTypes:["color","color","text"]},handler:function(t,e,r){var a=t.parser,n=t.funcName,i=Ce(e[0],"color-token").color,o=Ce(e[1],"color-token").color,s=e[2];return {type:"enclose",mode:a.mode,label:n,backgroundColor:o,borderColor:i,body:s}},htmlBuilder:pr,mathmlBuilder:dr}),_t({type:"enclose",names:["\\fbox"],props:{numArgs:1,argTypes:["hbox"],allowedInText:!0},handler:function(t,e){return {type:"enclose",mode:t.parser.mode,label:"\\fbox",body:e[0]}}}),_t({type:"enclose",names:["\\cancel","\\bcancel","\\xcancel","\\sout"],props:{numArgs:1},handler:function(t,e,r){var a=t.parser,n=t.funcName,i=e[0];return {type:"enclose",mode:a.mode,label:n,body:i}},htmlBuilder:pr,mathmlBuilder:dr});var fr={};function gr(t){for(var e=t.type,r=t.names,a=t.props,n=t.handler,i=t.htmlBuilder,o=t.mathmlBuilder,s={type:e,numArgs:a.numArgs||0,greediness:1,allowedInText:!1,numOptionalArgs:0,handler:n},l=0;l<r.length;++l)fr[r[l]]=s;i&&(Wt[e]=i),o&&(Xt[e]=o);}function xr(t){var e=[];t.consumeSpaces();for(var r=t.fetch().text;"\\hline"===r||"\\hdashline"===r;)t.consume(),e.push("\\hdashline"===r),t.consumeSpaces(),r=t.fetch().text;return e}function vr(t,e,r){var a=e.hskipBeforeAndAfter,n=e.addJot,i=e.cols,s=e.arraystretch,l=e.colSeparationType;if(t.gullet.beginGroup(),t.gullet.macros.set("\\\\","\\cr"),!s){var h=t.gullet.expandMacroAsText("\\arraystretch");if(null==h)s=1;else if(!(s=parseFloat(h))||s<0)throw new o("Invalid \\arraystretch: "+h)}t.gullet.beginGroup();var m=[],c=[m],u=[],p=[];for(p.push(xr(t));;){var d=t.parseExpression(!1,"\\cr");t.gullet.endGroup(),t.gullet.beginGroup(),d={type:"ordgroup",mode:t.mode,body:d},r&&(d={type:"styling",mode:t.mode,style:r,body:[d]}),m.push(d);var f=t.fetch().text;if("&"===f)t.consume();else{if("\\end"===f){1===m.length&&"styling"===d.type&&0===d.body[0].body.length&&c.pop(),p.length<c.length+1&&p.push([]);break}if("\\cr"!==f)throw new o("Expected & or \\\\ or \\cr or \\end",t.nextToken);var g=Ce(t.parseFunction(),"cr");u.push(g.size),p.push(xr(t)),m=[],c.push(m);}}return t.gullet.endGroup(),t.gullet.endGroup(),{type:"array",mode:t.mode,addJot:n,arraystretch:s,body:c,cols:i,rowGaps:u,hskipBeforeAndAfter:a,hLinesBeforeRow:p,colSeparationType:l}}function br(t){return "d"===t.substr(0,1)?"display":"text"}var yr=function(t,e){var r,a,n=t.body.length,i=t.hLinesBeforeRow,s=0,l=new Array(n),h=[],m=Math.max(e.fontMetrics().arrayRuleWidth,e.minRuleThickness),u=1/e.fontMetrics().ptPerEm,p=5*u;t.colSeparationType&&"small"===t.colSeparationType&&(p=e.havingStyle(w.SCRIPT).sizeMultiplier/e.sizeMultiplier*.2778);var d=12*u,f=3*u,g=t.arraystretch*d,x=.7*g,v=.3*g,b=0;function y(t){for(var e=0;e<t.length;++e)e>0&&(b+=.25),h.push({pos:b,isDashed:t[e]});}for(y(i[0]),r=0;r<t.body.length;++r){var k=t.body[r],S=x,M=v;s<k.length&&(s=k.length);var z=new Array(k.length);for(a=0;a<k.length;++a){var A=oe(k[a],e);M<A.depth&&(M=A.depth),S<A.height&&(S=A.height),z[a]=A;}var T=t.rowGaps[r],B=0;T&&(B=Tt(T,e))>0&&(M<(B+=v)&&(M=B),B=0),t.addJot&&(M+=f),z.height=S,z.depth=M,b+=S,z.pos=b,b+=M+B,l[r]=z,y(i[r+1]);}var C,q,N=b/2+e.fontMetrics().axisHeight,I=t.cols||[],O=[];for(a=0,q=0;a<s||q<I.length;++a,++q){for(var R=I[q]||{},E=!0;"separator"===R.type;){if(E||((C=Dt.makeSpan(["arraycolsep"],[])).style.width=e.fontMetrics().doubleRuleSep+"em",O.push(C)),"|"!==R.separator&&":"!==R.separator)throw new o("Invalid separator type: "+R.separator);var L="|"===R.separator?"solid":"dashed",P=Dt.makeSpan(["vertical-separator"],[],e);P.style.height=b+"em",P.style.borderRightWidth=m+"em",P.style.borderRightStyle=L,P.style.margin="0 -"+m/2+"em",P.style.verticalAlign=-(b-N)+"em",O.push(P),R=I[++q]||{},E=!1;}if(!(a>=s)){var D=void 0;(a>0||t.hskipBeforeAndAfter)&&0!==(D=c.deflt(R.pregap,p))&&((C=Dt.makeSpan(["arraycolsep"],[])).style.width=D+"em",O.push(C));var H=[];for(r=0;r<n;++r){var F=l[r],V=F[a];if(V){var U=F.pos-N;V.depth=F.depth,V.height=F.height,H.push({type:"elem",elem:V,shift:U});}}H=Dt.makeVList({positionType:"individualShift",children:H},e),H=Dt.makeSpan(["col-align-"+(R.align||"c")],[H]),O.push(H),(a<s-1||t.hskipBeforeAndAfter)&&0!==(D=c.deflt(R.postgap,p))&&((C=Dt.makeSpan(["arraycolsep"],[])).style.width=D+"em",O.push(C));}}if(l=Dt.makeSpan(["mtable"],O),h.length>0){for(var G=Dt.makeLineSpan("hline",e,m),Y=Dt.makeLineSpan("hdashline",e,m),W=[{type:"elem",elem:l,shift:0}];h.length>0;){var X=h.pop(),_=X.pos-N;X.isDashed?W.push({type:"elem",elem:Y,shift:_}):W.push({type:"elem",elem:G,shift:_});}l=Dt.makeVList({positionType:"individualShift",children:W},e);}return Dt.makeSpan(["mord"],[l],e)},wr={c:"center ",l:"left ",r:"right "},kr=function(t,e){var r=new ue.MathNode("mtable",t.body.map(function(t){return new ue.MathNode("mtr",t.map(function(t){return new ue.MathNode("mtd",[ve(t,e)])}))})),a=.5===t.arraystretch?.1:.16+t.arraystretch-1+(t.addJot?.09:0);r.setAttribute("rowspacing",a+"em");var n="",i="";if(t.cols&&t.cols.length>0){var o=t.cols,s="",l=!1,h=0,m=o.length;"separator"===o[0].type&&(n+="top ",h=1),"separator"===o[o.length-1].type&&(n+="bottom ",m-=1);for(var c=h;c<m;c++)"align"===o[c].type?(i+=wr[o[c].align],l&&(s+="none "),l=!0):"separator"===o[c].type&&l&&(s+="|"===o[c].separator?"solid ":"dashed ",l=!1);r.setAttribute("columnalign",i.trim()),/[sd]/.test(s)&&r.setAttribute("columnlines",s.trim());}if("align"===t.colSeparationType){for(var u=t.cols||[],p="",d=1;d<u.length;d++)p+=d%2?"0em ":"1em ";r.setAttribute("columnspacing",p.trim());}else"alignat"===t.colSeparationType?r.setAttribute("columnspacing","0em"):"small"===t.colSeparationType?r.setAttribute("columnspacing","0.2778em"):r.setAttribute("columnspacing","1em");var f="",g=t.hLinesBeforeRow;n+=g[0].length>0?"left ":"",n+=g[g.length-1].length>0?"right ":"";for(var x=1;x<g.length-1;x++)f+=0===g[x].length?"none ":g[x][0]?"dashed ":"solid ";return /[sd]/.test(f)&&r.setAttribute("rowlines",f.trim()),""!==n&&(r=new ue.MathNode("menclose",[r])).setAttribute("notation",n.trim()),t.arraystretch&&t.arraystretch<1&&(r=new ue.MathNode("mstyle",[r])).setAttribute("scriptlevel","1"),r},Sr=function(t,e){var r,a=[],n=vr(t.parser,{cols:a,addJot:!0},"display"),i=0,s={type:"ordgroup",mode:t.mode,body:[]};if(e[0]&&"ordgroup"===e[0].type){for(var l="",h=0;h<e[0].body.length;h++){l+=Ce(e[0].body[h],"textord").text;}r=Number(l),i=2*r;}var m=!i;n.body.forEach(function(t){for(var e=1;e<t.length;e+=2){var a=Ce(t[e],"styling");Ce(a.body[0],"ordgroup").body.unshift(s);}if(m)i<t.length&&(i=t.length);else{var n=t.length/2;if(r<n)throw new o("Too many math in a row: expected "+r+", but got "+n,t[0])}});for(var c=0;c<i;++c){var u="r",p=0;c%2==1?u="l":c>0&&m&&(p=1),a[c]={type:"align",align:u,pregap:p,postgap:0};}return n.colSeparationType=m?"align":"alignat",n};gr({type:"array",names:["array","darray"],props:{numArgs:1},handler:function(t,e){var r={cols:(Ne(e[0])?[e[0]]:Ce(e[0],"ordgroup").body).map(function(t){var e=qe(t).text;if(-1!=="lcr".indexOf(e))return {type:"align",align:e};if("|"===e)return {type:"separator",separator:"|"};if(":"===e)return {type:"separator",separator:":"};throw new o("Unknown column alignment: "+e,t)}),hskipBeforeAndAfter:!0};return vr(t.parser,r,br(t.envName))},htmlBuilder:yr,mathmlBuilder:kr}),gr({type:"array",names:["matrix","pmatrix","bmatrix","Bmatrix","vmatrix","Vmatrix"],props:{numArgs:0},handler:function(t){var e={matrix:null,pmatrix:["(",")"],bmatrix:["[","]"],Bmatrix:["\\{","\\}"],vmatrix:["|","|"],Vmatrix:["\\Vert","\\Vert"]}[t.envName],r=vr(t.parser,{hskipBeforeAndAfter:!1},br(t.envName));return e?{type:"leftright",mode:t.mode,body:[r],left:e[0],right:e[1],rightColor:void 0}:r},htmlBuilder:yr,mathmlBuilder:kr}),gr({type:"array",names:["smallmatrix"],props:{numArgs:0},handler:function(t){var e=vr(t.parser,{arraystretch:.5},"script");return e.colSeparationType="small",e},htmlBuilder:yr,mathmlBuilder:kr}),gr({type:"array",names:["subarray"],props:{numArgs:1},handler:function(t,e){var r=(Ne(e[0])?[e[0]]:Ce(e[0],"ordgroup").body).map(function(t){var e=qe(t).text;if(-1!=="lc".indexOf(e))return {type:"align",align:e};throw new o("Unknown column alignment: "+e,t)});if(r.length>1)throw new o("{subarray} can contain only one column");var a={cols:r,hskipBeforeAndAfter:!1,arraystretch:.5};if((a=vr(t.parser,a,"script")).body.length>0&&a.body[0].length>1)throw new o("{subarray} can contain only one column");return a},htmlBuilder:yr,mathmlBuilder:kr}),gr({type:"array",names:["cases","dcases","rcases","drcases"],props:{numArgs:0},handler:function(t){var e=vr(t.parser,{arraystretch:1.2,cols:[{type:"align",align:"l",pregap:0,postgap:1},{type:"align",align:"l",pregap:0,postgap:0}]},br(t.envName));return {type:"leftright",mode:t.mode,body:[e],left:t.envName.indexOf("r")>-1?".":"\\{",right:t.envName.indexOf("r")>-1?"\\}":".",rightColor:void 0}},htmlBuilder:yr,mathmlBuilder:kr}),gr({type:"array",names:["aligned"],props:{numArgs:0},handler:Sr,htmlBuilder:yr,mathmlBuilder:kr}),gr({type:"array",names:["gathered"],props:{numArgs:0},handler:function(t){return vr(t.parser,{cols:[{type:"align",align:"c"}],addJot:!0},"display")},htmlBuilder:yr,mathmlBuilder:kr}),gr({type:"array",names:["alignedat"],props:{numArgs:1},handler:Sr,htmlBuilder:yr,mathmlBuilder:kr}),_t({type:"text",names:["\\hline","\\hdashline"],props:{numArgs:0,allowedInText:!0,allowedInMath:!0},handler:function(t,e){throw new o(t.funcName+" valid only within array environment")}});var Mr=fr;_t({type:"environment",names:["\\begin","\\end"],props:{numArgs:1,argTypes:["text"]},handler:function(t,e){var r=t.parser,a=t.funcName,n=e[0];if("ordgroup"!==n.type)throw new o("Invalid environment name",n);for(var i="",s=0;s<n.body.length;++s)i+=Ce(n.body[s],"textord").text;if("\\begin"===a){if(!Mr.hasOwnProperty(i))throw new o("No such environment: "+i,n);var l=Mr[i],h=r.parseArguments("\\begin{"+i+"}",l),m=h.args,c=h.optArgs,u={mode:r.mode,envName:i,parser:r},p=l.handler(u,m,c);r.expect("\\end",!1);var d=r.nextToken,f=Ce(r.parseFunction(),"environment");if(f.name!==i)throw new o("Mismatch: \\begin{"+i+"} matched by \\end{"+f.name+"}",d);return p}return {type:"environment",mode:r.mode,name:i,nameGroup:n}}});var zr=Dt.makeSpan;function Ar(t,e){var r=ee(t.body,e,!0);return zr([t.mclass],r,e)}function Tr(t,e){var r,a=ge(t.body,e);return "minner"===t.mclass?ue.newDocumentFragment(a):("mord"===t.mclass?t.isCharacterBox?(r=a[0]).type="mi":r=new ue.MathNode("mi",a):(t.isCharacterBox?(r=a[0]).type="mo":r=new ue.MathNode("mo",a),"mbin"===t.mclass?(r.attributes.lspace="0.22em",r.attributes.rspace="0.22em"):"mpunct"===t.mclass?(r.attributes.lspace="0em",r.attributes.rspace="0.17em"):"mopen"!==t.mclass&&"mclose"!==t.mclass||(r.attributes.lspace="0em",r.attributes.rspace="0em")),r)}_t({type:"mclass",names:["\\mathord","\\mathbin","\\mathrel","\\mathopen","\\mathclose","\\mathpunct","\\mathinner"],props:{numArgs:1},handler:function(t,e){var r=t.parser,a=t.funcName,n=e[0];return {type:"mclass",mode:r.mode,mclass:"m"+a.substr(5),body:$t(n),isCharacterBox:c.isCharacterBox(n)}},htmlBuilder:Ar,mathmlBuilder:Tr});var Br=function(t){var e="ordgroup"===t.type&&t.body.length?t.body[0]:t;return "atom"!==e.type||"bin"!==e.family&&"rel"!==e.family?"mord":"m"+e.family};_t({type:"mclass",names:["\\@binrel"],props:{numArgs:2},handler:function(t,e){return {type:"mclass",mode:t.parser.mode,mclass:Br(e[0]),body:[e[1]],isCharacterBox:c.isCharacterBox(e[1])}}}),_t({type:"mclass",names:["\\stackrel","\\overset","\\underset"],props:{numArgs:2},handler:function(t,e){var r,a=t.parser,n=t.funcName,i=e[1],o=e[0];r="\\stackrel"!==n?Br(i):"mrel";var s={type:"op",mode:i.mode,limits:!0,alwaysHandleSupSub:!0,parentIsSupSub:!1,symbol:!1,suppressBaseShift:"\\stackrel"!==n,body:$t(i)},l={type:"supsub",mode:o.mode,base:s,sup:"\\underset"===n?null:o,sub:"\\underset"===n?o:null};return {type:"mclass",mode:a.mode,mclass:r,body:[l],isCharacterBox:c.isCharacterBox(l)}},htmlBuilder:Ar,mathmlBuilder:Tr});var Cr=function(t,e){var r=t.font,a=e.withFont(r);return oe(t.body,a)},qr=function(t,e){var r=t.font,a=e.withFont(r);return ve(t.body,a)},Nr={"\\Bbb":"\\mathbb","\\bold":"\\mathbf","\\frak":"\\mathfrak","\\bm":"\\boldsymbol"};_t({type:"font",names:["\\mathrm","\\mathit","\\mathbf","\\mathnormal","\\mathbb","\\mathcal","\\mathfrak","\\mathscr","\\mathsf","\\mathtt","\\Bbb","\\bold","\\frak"],props:{numArgs:1,greediness:2},handler:function(t,e){var r=t.parser,a=t.funcName,n=e[0],i=a;return i in Nr&&(i=Nr[i]),{type:"font",mode:r.mode,font:i.slice(1),body:n}},htmlBuilder:Cr,mathmlBuilder:qr}),_t({type:"mclass",names:["\\boldsymbol","\\bm"],props:{numArgs:1,greediness:2},handler:function(t,e){var r=t.parser,a=e[0],n=c.isCharacterBox(a);return {type:"mclass",mode:r.mode,mclass:Br(a),body:[{type:"font",mode:r.mode,font:"boldsymbol",body:a}],isCharacterBox:n}}}),_t({type:"font",names:["\\rm","\\sf","\\tt","\\bf","\\it","\\cal"],props:{numArgs:0,allowedInText:!0},handler:function(t,e){var r=t.parser,a=t.funcName,n=t.breakOnTokenText,i=r.mode,o=r.parseExpression(!0,n);return {type:"font",mode:i,font:"math"+a.slice(1),body:{type:"ordgroup",mode:r.mode,body:o}}},htmlBuilder:Cr,mathmlBuilder:qr});var Ir=function(t,e){var r=e;return "display"===t?r=r.id>=w.SCRIPT.id?r.text():w.DISPLAY:"text"===t&&r.size===w.DISPLAY.size?r=w.TEXT:"script"===t?r=w.SCRIPT:"scriptscript"===t&&(r=w.SCRIPTSCRIPT),r},Or=function(t,e){var r,a=Ir(t.size,e.style),n=a.fracNum(),i=a.fracDen();r=e.havingStyle(n);var o=oe(t.numer,r,e);if(t.continued){var s=8.5/e.fontMetrics().ptPerEm,l=3.5/e.fontMetrics().ptPerEm;o.height=o.height<s?s:o.height,o.depth=o.depth<l?l:o.depth;}r=e.havingStyle(i);var h,m,c,u,p,d,f,g,x,v,b=oe(t.denom,r,e);if(t.hasBarLine?(t.barSize?(m=Tt(t.barSize,e),h=Dt.makeLineSpan("frac-line",e,m)):h=Dt.makeLineSpan("frac-line",e),m=h.height,c=h.height):(h=null,m=0,c=e.fontMetrics().defaultRuleThickness),a.size===w.DISPLAY.size||"display"===t.size?(u=e.fontMetrics().num1,p=m>0?3*c:7*c,d=e.fontMetrics().denom1):(m>0?(u=e.fontMetrics().num2,p=c):(u=e.fontMetrics().num3,p=3*c),d=e.fontMetrics().denom2),h){var y=e.fontMetrics().axisHeight;u-o.depth-(y+.5*m)<p&&(u+=p-(u-o.depth-(y+.5*m))),y-.5*m-(b.height-d)<p&&(d+=p-(y-.5*m-(b.height-d)));var k=-(y-.5*m);f=Dt.makeVList({positionType:"individualShift",children:[{type:"elem",elem:b,shift:d},{type:"elem",elem:h,shift:k},{type:"elem",elem:o,shift:-u}]},e);}else{var S=u-o.depth-(b.height-d);S<p&&(u+=.5*(p-S),d+=.5*(p-S)),f=Dt.makeVList({positionType:"individualShift",children:[{type:"elem",elem:b,shift:d},{type:"elem",elem:o,shift:-u}]},e);}return r=e.havingStyle(a),f.height*=r.sizeMultiplier/e.sizeMultiplier,f.depth*=r.sizeMultiplier/e.sizeMultiplier,g=a.size===w.DISPLAY.size?e.fontMetrics().delim1:e.fontMetrics().delim2,x=null==t.leftDelim?ie(e,["mopen"]):sr(t.leftDelim,g,!0,e.havingStyle(a),t.mode,["mopen"]),v=t.continued?Dt.makeSpan([]):null==t.rightDelim?ie(e,["mclose"]):sr(t.rightDelim,g,!0,e.havingStyle(a),t.mode,["mclose"]),Dt.makeSpan(["mord"].concat(r.sizingClasses(e)),[x,Dt.makeSpan(["mfrac"],[f]),v],e)},Rr=function(t,e){var r=new ue.MathNode("mfrac",[ve(t.numer,e),ve(t.denom,e)]);if(t.hasBarLine){if(t.barSize){var a=Tt(t.barSize,e);r.setAttribute("linethickness",a+"em");}}else r.setAttribute("linethickness","0px");var n=Ir(t.size,e.style);if(n.size!==e.style.size){r=new ue.MathNode("mstyle",[r]);var i=n.size===w.DISPLAY.size?"true":"false";r.setAttribute("displaystyle",i),r.setAttribute("scriptlevel","0");}if(null!=t.leftDelim||null!=t.rightDelim){var o=[];if(null!=t.leftDelim){var s=new ue.MathNode("mo",[new ue.TextNode(t.leftDelim.replace("\\",""))]);s.setAttribute("fence","true"),o.push(s);}if(o.push(r),null!=t.rightDelim){var l=new ue.MathNode("mo",[new ue.TextNode(t.rightDelim.replace("\\",""))]);l.setAttribute("fence","true"),o.push(l);}return de(o)}return r};_t({type:"genfrac",names:["\\cfrac","\\dfrac","\\frac","\\tfrac","\\dbinom","\\binom","\\tbinom","\\\\atopfrac","\\\\bracefrac","\\\\brackfrac"],props:{numArgs:2,greediness:2},handler:function(t,e){var r,a=t.parser,n=t.funcName,i=e[0],o=e[1],s=null,l=null,h="auto";switch(n){case"\\cfrac":case"\\dfrac":case"\\frac":case"\\tfrac":r=!0;break;case"\\\\atopfrac":r=!1;break;case"\\dbinom":case"\\binom":case"\\tbinom":r=!1,s="(",l=")";break;case"\\\\bracefrac":r=!1,s="\\{",l="\\}";break;case"\\\\brackfrac":r=!1,s="[",l="]";break;default:throw new Error("Unrecognized genfrac command")}switch(n){case"\\cfrac":case"\\dfrac":case"\\dbinom":h="display";break;case"\\tfrac":case"\\tbinom":h="text";}return {type:"genfrac",mode:a.mode,continued:"\\cfrac"===n,numer:i,denom:o,hasBarLine:r,leftDelim:s,rightDelim:l,size:h,barSize:null}},htmlBuilder:Or,mathmlBuilder:Rr}),_t({type:"infix",names:["\\over","\\choose","\\atop","\\brace","\\brack"],props:{numArgs:0,infix:!0},handler:function(t){var e,r=t.parser,a=t.funcName,n=t.token;switch(a){case"\\over":e="\\frac";break;case"\\choose":e="\\binom";break;case"\\atop":e="\\\\atopfrac";break;case"\\brace":e="\\\\bracefrac";break;case"\\brack":e="\\\\brackfrac";break;default:throw new Error("Unrecognized infix genfrac command")}return {type:"infix",mode:r.mode,replaceWith:e,token:n}}});var Er=["display","text","script","scriptscript"],Lr=function(t){var e=null;return t.length>0&&(e="."===(e=t)?null:e),e};_t({type:"genfrac",names:["\\genfrac"],props:{numArgs:6,greediness:6,argTypes:["math","math","size","text","math","math"]},handler:function(t,e){var r,a=t.parser,n=e[4],i=e[5],o="atom"===e[0].type&&"open"===e[0].family?Lr(e[0].text):null,s="atom"===e[1].type&&"close"===e[1].family?Lr(e[1].text):null,l=Ce(e[2],"size"),h=null;r=!!l.isBlank||(h=l.value).number>0;var m="auto",c=e[3];if("ordgroup"===c.type){if(c.body.length>0){var u=Ce(c.body[0],"textord");m=Er[Number(u.text)];}}else c=Ce(c,"textord"),m=Er[Number(c.text)];return {type:"genfrac",mode:a.mode,numer:n,denom:i,continued:!1,hasBarLine:r,barSize:h,leftDelim:o,rightDelim:s,size:m}},htmlBuilder:Or,mathmlBuilder:Rr}),_t({type:"infix",names:["\\above"],props:{numArgs:1,argTypes:["size"],infix:!0},handler:function(t,e){var r=t.parser,a=(t.funcName,t.token);return {type:"infix",mode:r.mode,replaceWith:"\\\\abovefrac",size:Ce(e[0],"size").value,token:a}}}),_t({type:"genfrac",names:["\\\\abovefrac"],props:{numArgs:3,argTypes:["math","size","math"]},handler:function(t,e){var r=t.parser,a=(t.funcName,e[0]),n=function(t){if(!t)throw new Error("Expected non-null, but got "+String(t));return t}(Ce(e[1],"infix").size),i=e[2],o=n.number>0;return {type:"genfrac",mode:r.mode,numer:a,denom:i,continued:!1,hasBarLine:o,barSize:n,leftDelim:null,rightDelim:null,size:"auto"}},htmlBuilder:Or,mathmlBuilder:Rr});var Pr=function(t,e){var r,a,n=e.style;"supsub"===t.type?(r=t.sup?oe(t.sup,e.havingStyle(n.sup()),e):oe(t.sub,e.havingStyle(n.sub()),e),a=Ce(t.base,"horizBrace")):a=Ce(t,"horizBrace");var i,o=oe(a.base,e.havingBaseStyle(w.DISPLAY)),s=Be(a,e);if(a.isOver?(i=Dt.makeVList({positionType:"firstBaseline",children:[{type:"elem",elem:o},{type:"kern",size:.1},{type:"elem",elem:s}]},e)).children[0].children[0].children[1].classes.push("svg-align"):(i=Dt.makeVList({positionType:"bottom",positionData:o.depth+.1+s.height,children:[{type:"elem",elem:s},{type:"kern",size:.1},{type:"elem",elem:o}]},e)).children[0].children[0].children[0].classes.push("svg-align"),r){var l=Dt.makeSpan(["mord",a.isOver?"mover":"munder"],[i],e);i=a.isOver?Dt.makeVList({positionType:"firstBaseline",children:[{type:"elem",elem:l},{type:"kern",size:.2},{type:"elem",elem:r}]},e):Dt.makeVList({positionType:"bottom",positionData:l.depth+.2+r.height+r.depth,children:[{type:"elem",elem:r},{type:"kern",size:.2},{type:"elem",elem:l}]},e);}return Dt.makeSpan(["mord",a.isOver?"mover":"munder"],[i],e)};_t({type:"horizBrace",names:["\\overbrace","\\underbrace"],props:{numArgs:1},handler:function(t,e){var r=t.parser,a=t.funcName;return {type:"horizBrace",mode:r.mode,label:a,isOver:/^\\over/.test(a),base:e[0]}},htmlBuilder:Pr,mathmlBuilder:function(t,e){var r=Te(t.label);return new ue.MathNode(t.isOver?"mover":"munder",[ve(t.base,e),r])}}),_t({type:"href",names:["\\href"],props:{numArgs:2,argTypes:["url","original"],allowedInText:!0},handler:function(t,e){var r=t.parser,a=e[1],n=Ce(e[0],"url").url;return r.settings.isTrusted({command:"\\href",url:n})?{type:"href",mode:r.mode,href:n,body:$t(a)}:r.formatUnsupportedCmd("\\href")},htmlBuilder:function(t,e){var r=ee(t.body,e,!1);return Dt.makeAnchor(t.href,[],r,e)},mathmlBuilder:function(t,e){var r=xe(t.body,e);return r instanceof me||(r=new me("mrow",[r])),r.setAttribute("href",t.href),r}}),_t({type:"href",names:["\\url"],props:{numArgs:1,argTypes:["url"],allowedInText:!0},handler:function(t,e){var r=t.parser,a=Ce(e[0],"url").url;if(!r.settings.isTrusted({command:"\\url",url:a}))return r.formatUnsupportedCmd("\\url");for(var n=[],i=0;i<a.length;i++){var o=a[i];"~"===o&&(o="\\textasciitilde"),n.push({type:"textord",mode:"text",text:o});}var s={type:"text",mode:r.mode,font:"\\texttt",body:n};return {type:"href",mode:r.mode,href:a,body:$t(s)}}}),_t({type:"html",names:["\\htmlClass","\\htmlId","\\htmlStyle","\\htmlData"],props:{numArgs:2,argTypes:["raw","original"],allowedInText:!0},handler:function(t,e){var r,a=t.parser,n=t.funcName,i=(t.token,Ce(e[0],"raw").string),s=e[1];a.settings.strict&&a.settings.reportNonstrict("htmlExtension","HTML extension is disabled on strict mode");var l={};switch(n){case"\\htmlClass":l.class=i,r={command:"\\htmlClass",class:i};break;case"\\htmlId":l.id=i,r={command:"\\htmlId",id:i};break;case"\\htmlStyle":l.style=i,r={command:"\\htmlStyle",style:i};break;case"\\htmlData":for(var h=i.split(","),m=0;m<h.length;m++){var c=h[m].split("=");if(2!==c.length)throw new o("Error parsing key-value for \\htmlData");l["data-"+c[0].trim()]=c[1].trim();}r={command:"\\htmlData",attributes:l};break;default:throw new Error("Unrecognized html command")}return a.settings.isTrusted(r)?{type:"html",mode:a.mode,attributes:l,body:$t(s)}:a.formatUnsupportedCmd(n)},htmlBuilder:function(t,e){var r=ee(t.body,e,!1),a=["enclosing"];t.attributes.class&&a.push.apply(a,t.attributes.class.trim().split(/\s+/));var n=Dt.makeSpan(a,r,e);for(var i in t.attributes)"class"!==i&&t.attributes.hasOwnProperty(i)&&n.setAttribute(i,t.attributes[i]);return n},mathmlBuilder:function(t,e){return xe(t.body,e)}}),_t({type:"htmlmathml",names:["\\html@mathml"],props:{numArgs:2,allowedInText:!0},handler:function(t,e){return {type:"htmlmathml",mode:t.parser.mode,html:$t(e[0]),mathml:$t(e[1])}},htmlBuilder:function(t,e){var r=ee(t.html,e,!1);return Dt.makeFragment(r)},mathmlBuilder:function(t,e){return xe(t.mathml,e)}});var Dr=function(t){if(/^[-+]? *(\d+(\.\d*)?|\.\d+)$/.test(t))return {number:+t,unit:"bp"};var e=/([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(t);if(!e)throw new o("Invalid size: '"+t+"' in \\includegraphics");var r={number:+(e[1]+e[2]),unit:e[3]};if(!At(r))throw new o("Invalid unit: '"+r.unit+"' in \\includegraphics.");return r};_t({type:"includegraphics",names:["\\includegraphics"],props:{numArgs:1,numOptionalArgs:1,argTypes:["raw","url"],allowedInText:!1},handler:function(t,e,r){var a=t.parser,n={number:0,unit:"em"},i={number:.9,unit:"em"},s={number:0,unit:"em"},l="";if(r[0])for(var h=Ce(r[0],"raw").string.split(","),m=0;m<h.length;m++){var c=h[m].split("=");if(2===c.length){var u=c[1].trim();switch(c[0].trim()){case"alt":l=u;break;case"width":n=Dr(u);break;case"height":i=Dr(u);break;case"totalheight":s=Dr(u);break;default:throw new o("Invalid key: '"+c[0]+"' in \\includegraphics.")}}}var p=Ce(e[0],"url").url;return ""===l&&(l=(l=(l=p).replace(/^.*[\\/]/,"")).substring(0,l.lastIndexOf("."))),a.settings.isTrusted({command:"\\includegraphics",url:p})?{type:"includegraphics",mode:a.mode,alt:l,width:n,height:i,totalheight:s,src:p}:a.formatUnsupportedCmd("\\includegraphics")},htmlBuilder:function(t,e){var r=Tt(t.height,e),a=0;t.totalheight.number>0&&(a=Tt(t.totalheight,e)-r,a=Number(a.toFixed(2)));var n=0;t.width.number>0&&(n=Tt(t.width,e));var i={height:r+a+"em"};n>0&&(i.width=n+"em"),a>0&&(i.verticalAlign=-a+"em");var o=new O(t.src,t.alt,i);return o.height=r,o.depth=a,o},mathmlBuilder:function(t,e){var r=new ue.MathNode("mglyph",[]);r.setAttribute("alt",t.alt);var a=Tt(t.height,e),n=0;if(t.totalheight.number>0&&(n=(n=Tt(t.totalheight,e)-a).toFixed(2),r.setAttribute("valign","-"+n+"em")),r.setAttribute("height",a+n+"em"),t.width.number>0){var i=Tt(t.width,e);r.setAttribute("width",i+"em");}return r.setAttribute("src",t.src),r}}),_t({type:"kern",names:["\\kern","\\mkern","\\hskip","\\mskip"],props:{numArgs:1,argTypes:["size"],allowedInText:!0},handler:function(t,e){var r=t.parser,a=t.funcName,n=Ce(e[0],"size");if(r.settings.strict){var i="m"===a[1],o="mu"===n.value.unit;i?(o||r.settings.reportNonstrict("mathVsTextUnits","LaTeX's "+a+" supports only mu units, not "+n.value.unit+" units"),"math"!==r.mode&&r.settings.reportNonstrict("mathVsTextUnits","LaTeX's "+a+" works only in math mode")):o&&r.settings.reportNonstrict("mathVsTextUnits","LaTeX's "+a+" doesn't support mu units");}return {type:"kern",mode:r.mode,dimension:n.value}},htmlBuilder:function(t,e){return Dt.makeGlue(t.dimension,e)},mathmlBuilder:function(t,e){var r=Tt(t.dimension,e);return new ue.SpaceNode(r)}}),_t({type:"lap",names:["\\mathllap","\\mathrlap","\\mathclap"],props:{numArgs:1,allowedInText:!0},handler:function(t,e){var r=t.parser,a=t.funcName,n=e[0];return {type:"lap",mode:r.mode,alignment:a.slice(5),body:n}},htmlBuilder:function(t,e){var r;"clap"===t.alignment?(r=Dt.makeSpan([],[oe(t.body,e)]),r=Dt.makeSpan(["inner"],[r],e)):r=Dt.makeSpan(["inner"],[oe(t.body,e)]);var a=Dt.makeSpan(["fix"],[]),n=Dt.makeSpan([t.alignment],[r,a],e),i=Dt.makeSpan(["strut"]);return i.style.height=n.height+n.depth+"em",i.style.verticalAlign=-n.depth+"em",n.children.unshift(i),n=Dt.makeSpan(["thinbox"],[n],e),Dt.makeSpan(["mord","vbox"],[n],e)},mathmlBuilder:function(t,e){var r=new ue.MathNode("mpadded",[ve(t.body,e)]);if("rlap"!==t.alignment){var a="llap"===t.alignment?"-1":"-0.5";r.setAttribute("lspace",a+"width");}return r.setAttribute("width","0px"),r}}),_t({type:"styling",names:["\\(","$"],props:{numArgs:0,allowedInText:!0,allowedInMath:!1},handler:function(t,e){var r=t.funcName,a=t.parser,n=a.mode;a.switchMode("math");var i="\\("===r?"\\)":"$",o=a.parseExpression(!1,i);return a.expect(i),a.switchMode(n),{type:"styling",mode:a.mode,style:"text",body:o}}}),_t({type:"text",names:["\\)","\\]"],props:{numArgs:0,allowedInText:!0,allowedInMath:!1},handler:function(t,e){throw new o("Mismatched "+t.funcName)}});var Hr=function(t,e){switch(e.style.size){case w.DISPLAY.size:return t.display;case w.TEXT.size:return t.text;case w.SCRIPT.size:return t.script;case w.SCRIPTSCRIPT.size:return t.scriptscript;default:return t.text}};_t({type:"mathchoice",names:["\\mathchoice"],props:{numArgs:4},handler:function(t,e){return {type:"mathchoice",mode:t.parser.mode,display:$t(e[0]),text:$t(e[1]),script:$t(e[2]),scriptscript:$t(e[3])}},htmlBuilder:function(t,e){var r=Hr(t,e),a=ee(r,e,!1);return Dt.makeFragment(a)},mathmlBuilder:function(t,e){var r=Hr(t,e);return xe(r,e)}});var Fr=function(t,e,r,a,n,i,o){var s,l,h;if(t=Dt.makeSpan([],[t]),e){var m=oe(e,a.havingStyle(n.sup()),a);l={elem:m,kern:Math.max(a.fontMetrics().bigOpSpacing1,a.fontMetrics().bigOpSpacing3-m.depth)};}if(r){var c=oe(r,a.havingStyle(n.sub()),a);s={elem:c,kern:Math.max(a.fontMetrics().bigOpSpacing2,a.fontMetrics().bigOpSpacing4-c.height)};}if(l&&s){var u=a.fontMetrics().bigOpSpacing5+s.elem.height+s.elem.depth+s.kern+t.depth+o;h=Dt.makeVList({positionType:"bottom",positionData:u,children:[{type:"kern",size:a.fontMetrics().bigOpSpacing5},{type:"elem",elem:s.elem,marginLeft:-i+"em"},{type:"kern",size:s.kern},{type:"elem",elem:t},{type:"kern",size:l.kern},{type:"elem",elem:l.elem,marginLeft:i+"em"},{type:"kern",size:a.fontMetrics().bigOpSpacing5}]},a);}else if(s){var p=t.height-o;h=Dt.makeVList({positionType:"top",positionData:p,children:[{type:"kern",size:a.fontMetrics().bigOpSpacing5},{type:"elem",elem:s.elem,marginLeft:-i+"em"},{type:"kern",size:s.kern},{type:"elem",elem:t}]},a);}else{if(!l)return t;var d=t.depth+o;h=Dt.makeVList({positionType:"bottom",positionData:d,children:[{type:"elem",elem:t},{type:"kern",size:l.kern},{type:"elem",elem:l.elem,marginLeft:i+"em"},{type:"kern",size:a.fontMetrics().bigOpSpacing5}]},a);}return Dt.makeSpan(["mop","op-limits"],[h],a)},Vr=["\\smallint"],Ur=function(t,e){var r,a,n,i=!1;"supsub"===t.type?(r=t.sup,a=t.sub,n=Ce(t.base,"op"),i=!0):n=Ce(t,"op");var o,s=e.style,l=!1;if(s.size===w.DISPLAY.size&&n.symbol&&!c.contains(Vr,n.name)&&(l=!0),n.symbol){var h=l?"Size2-Regular":"Size1-Regular",m="";if("\\oiint"!==n.name&&"\\oiiint"!==n.name||(m=n.name.substr(1),n.name="oiint"===m?"\\iint":"\\iiint"),o=Dt.makeSymbol(n.name,h,"math",e,["mop","op-symbol",l?"large-op":"small-op"]),m.length>0){var u=o.italic,p=Dt.staticSvg(m+"Size"+(l?"2":"1"),e);o=Dt.makeVList({positionType:"individualShift",children:[{type:"elem",elem:o,shift:0},{type:"elem",elem:p,shift:l?.08:0}]},e),n.name="\\"+m,o.classes.unshift("mop"),o.italic=u;}}else if(n.body){var d=ee(n.body,e,!0);1===d.length&&d[0]instanceof E?(o=d[0]).classes[0]="mop":o=Dt.makeSpan(["mop"],Dt.tryCombineChars(d),e);}else{for(var f=[],g=1;g<n.name.length;g++)f.push(Dt.mathsym(n.name[g],n.mode,e));o=Dt.makeSpan(["mop"],f,e);}var x=0,v=0;return (o instanceof E||"\\oiint"===n.name||"\\oiiint"===n.name)&&!n.suppressBaseShift&&(x=(o.height-o.depth)/2-e.fontMetrics().axisHeight,v=o.italic),i?Fr(o,r,a,e,s,v,x):(x&&(o.style.position="relative",o.style.top=x+"em"),o)},Gr=function(t,e){var r;if(t.symbol)r=new me("mo",[pe(t.name,t.mode)]),c.contains(Vr,t.name)&&r.setAttribute("largeop","false");else if(t.body)r=new me("mo",ge(t.body,e));else{r=new me("mi",[new ce(t.name.slice(1))]);var a=new me("mo",[pe("\u2061","text")]);r=t.parentIsSupSub?new me("mo",[r,a]):he([r,a]);}return r},Yr={"\u220f":"\\prod","\u2210":"\\coprod","\u2211":"\\sum","\u22c0":"\\bigwedge","\u22c1":"\\bigvee","\u22c2":"\\bigcap","\u22c3":"\\bigcup","\u2a00":"\\bigodot","\u2a01":"\\bigoplus","\u2a02":"\\bigotimes","\u2a04":"\\biguplus","\u2a06":"\\bigsqcup"};_t({type:"op",names:["\\coprod","\\bigvee","\\bigwedge","\\biguplus","\\bigcap","\\bigcup","\\intop","\\prod","\\sum","\\bigotimes","\\bigoplus","\\bigodot","\\bigsqcup","\\smallint","\u220f","\u2210","\u2211","\u22c0","\u22c1","\u22c2","\u22c3","\u2a00","\u2a01","\u2a02","\u2a04","\u2a06"],props:{numArgs:0},handler:function(t,e){var r=t.parser,a=t.funcName;return 1===a.length&&(a=Yr[a]),{type:"op",mode:r.mode,limits:!0,parentIsSupSub:!1,symbol:!0,name:a}},htmlBuilder:Ur,mathmlBuilder:Gr}),_t({type:"op",names:["\\mathop"],props:{numArgs:1},handler:function(t,e){var r=t.parser,a=e[0];return {type:"op",mode:r.mode,limits:!1,parentIsSupSub:!1,symbol:!1,body:$t(a)}},htmlBuilder:Ur,mathmlBuilder:Gr});var Wr={"\u222b":"\\int","\u222c":"\\iint","\u222d":"\\iiint","\u222e":"\\oint","\u222f":"\\oiint","\u2230":"\\oiiint"};_t({type:"op",names:["\\arcsin","\\arccos","\\arctan","\\arctg","\\arcctg","\\arg","\\ch","\\cos","\\cosec","\\cosh","\\cot","\\cotg","\\coth","\\csc","\\ctg","\\cth","\\deg","\\dim","\\exp","\\hom","\\ker","\\lg","\\ln","\\log","\\sec","\\sin","\\sinh","\\sh","\\tan","\\tanh","\\tg","\\th"],props:{numArgs:0},handler:function(t){var e=t.parser,r=t.funcName;return {type:"op",mode:e.mode,limits:!1,parentIsSupSub:!1,symbol:!1,name:r}},htmlBuilder:Ur,mathmlBuilder:Gr}),_t({type:"op",names:["\\det","\\gcd","\\inf","\\lim","\\max","\\min","\\Pr","\\sup"],props:{numArgs:0},handler:function(t){var e=t.parser,r=t.funcName;return {type:"op",mode:e.mode,limits:!0,parentIsSupSub:!1,symbol:!1,name:r}},htmlBuilder:Ur,mathmlBuilder:Gr}),_t({type:"op",names:["\\int","\\iint","\\iiint","\\oint","\\oiint","\\oiiint","\u222b","\u222c","\u222d","\u222e","\u222f","\u2230"],props:{numArgs:0},handler:function(t){var e=t.parser,r=t.funcName;return 1===r.length&&(r=Wr[r]),{type:"op",mode:e.mode,limits:!1,parentIsSupSub:!1,symbol:!0,name:r}},htmlBuilder:Ur,mathmlBuilder:Gr});var Xr=function(t,e){var r,a,n,i,o=!1;if("supsub"===t.type?(r=t.sup,a=t.sub,n=Ce(t.base,"operatorname"),o=!0):n=Ce(t,"operatorname"),n.body.length>0){for(var s=n.body.map(function(t){var e=t.text;return "string"==typeof e?{type:"textord",mode:t.mode,text:e}:t}),l=ee(s,e.withFont("mathrm"),!0),h=0;h<l.length;h++){var m=l[h];m instanceof E&&(m.text=m.text.replace(/\u2212/,"-").replace(/\u2217/,"*"));}i=Dt.makeSpan(["mop"],l,e);}else i=Dt.makeSpan(["mop"],[],e);return o?Fr(i,r,a,e,e.style,0,0):i};function _r(t,e,r){for(var a=ee(t,e,!1),n=e.sizeMultiplier/r.sizeMultiplier,i=0;i<a.length;i++){var o=a[i].classes.indexOf("sizing");o<0?Array.prototype.push.apply(a[i].classes,e.sizingClasses(r)):a[i].classes[o+1]==="reset-size"+e.size&&(a[i].classes[o+1]="reset-size"+r.size),a[i].height*=n,a[i].depth*=n;}return Dt.makeFragment(a)}_t({type:"operatorname",names:["\\operatorname","\\operatorname*"],props:{numArgs:1},handler:function(t,e){var r=t.parser,a=t.funcName,n=e[0];return {type:"operatorname",mode:r.mode,body:$t(n),alwaysHandleSupSub:"\\operatorname*"===a,limits:!1,parentIsSupSub:!1}},htmlBuilder:Xr,mathmlBuilder:function(t,e){for(var r=ge(t.body,e.withFont("mathrm")),a=!0,n=0;n<r.length;n++){var i=r[n];if(i instanceof ue.SpaceNode);else if(i instanceof ue.MathNode)switch(i.type){case"mi":case"mn":case"ms":case"mspace":case"mtext":break;case"mo":var o=i.children[0];1===i.children.length&&o instanceof ue.TextNode?o.text=o.text.replace(/\u2212/,"-").replace(/\u2217/,"*"):a=!1;break;default:a=!1;}else a=!1;}if(a){var s=r.map(function(t){return t.toText()}).join("");r=[new ue.TextNode(s)];}var l=new ue.MathNode("mi",r);l.setAttribute("mathvariant","normal");var h=new ue.MathNode("mo",[pe("\u2061","text")]);return t.parentIsSupSub?new ue.MathNode("mo",[l,h]):ue.newDocumentFragment([l,h])}}),jt({type:"ordgroup",htmlBuilder:function(t,e){return t.semisimple?Dt.makeFragment(ee(t.body,e,!1)):Dt.makeSpan(["mord"],ee(t.body,e,!0),e)},mathmlBuilder:function(t,e){return xe(t.body,e,!0)}}),_t({type:"overline",names:["\\overline"],props:{numArgs:1},handler:function(t,e){var r=t.parser,a=e[0];return {type:"overline",mode:r.mode,body:a}},htmlBuilder:function(t,e){var r=oe(t.body,e.havingCrampedStyle()),a=Dt.makeLineSpan("overline-line",e),n=e.fontMetrics().defaultRuleThickness,i=Dt.makeVList({positionType:"firstBaseline",children:[{type:"elem",elem:r},{type:"kern",size:3*n},{type:"elem",elem:a},{type:"kern",size:n}]},e);return Dt.makeSpan(["mord","overline"],[i],e)},mathmlBuilder:function(t,e){var r=new ue.MathNode("mo",[new ue.TextNode("\u203e")]);r.setAttribute("stretchy","true");var a=new ue.MathNode("mover",[ve(t.body,e),r]);return a.setAttribute("accent","true"),a}}),_t({type:"phantom",names:["\\phantom"],props:{numArgs:1,allowedInText:!0},handler:function(t,e){var r=t.parser,a=e[0];return {type:"phantom",mode:r.mode,body:$t(a)}},htmlBuilder:function(t,e){var r=ee(t.body,e.withPhantom(),!1);return Dt.makeFragment(r)},mathmlBuilder:function(t,e){var r=ge(t.body,e);return new ue.MathNode("mphantom",r)}}),_t({type:"hphantom",names:["\\hphantom"],props:{numArgs:1,allowedInText:!0},handler:function(t,e){var r=t.parser,a=e[0];return {type:"hphantom",mode:r.mode,body:a}},htmlBuilder:function(t,e){var r=Dt.makeSpan([],[oe(t.body,e.withPhantom())]);if(r.height=0,r.depth=0,r.children)for(var a=0;a<r.children.length;a++)r.children[a].height=0,r.children[a].depth=0;return r=Dt.makeVList({positionType:"firstBaseline",children:[{type:"elem",elem:r}]},e),Dt.makeSpan(["mord"],[r],e)},mathmlBuilder:function(t,e){var r=ge($t(t.body),e),a=new ue.MathNode("mphantom",r),n=new ue.MathNode("mpadded",[a]);return n.setAttribute("height","0px"),n.setAttribute("depth","0px"),n}}),_t({type:"vphantom",names:["\\vphantom"],props:{numArgs:1,allowedInText:!0},handler:function(t,e){var r=t.parser,a=e[0];return {type:"vphantom",mode:r.mode,body:a}},htmlBuilder:function(t,e){var r=Dt.makeSpan(["inner"],[oe(t.body,e.withPhantom())]),a=Dt.makeSpan(["fix"],[]);return Dt.makeSpan(["mord","rlap"],[r,a],e)},mathmlBuilder:function(t,e){var r=ge($t(t.body),e),a=new ue.MathNode("mphantom",r),n=new ue.MathNode("mpadded",[a]);return n.setAttribute("width","0px"),n}}),_t({type:"raisebox",names:["\\raisebox"],props:{numArgs:2,argTypes:["size","hbox"],allowedInText:!0},handler:function(t,e){var r=t.parser,a=Ce(e[0],"size").value,n=e[1];return {type:"raisebox",mode:r.mode,dy:a,body:n}},htmlBuilder:function(t,e){var r=oe(t.body,e),a=Tt(t.dy,e);return Dt.makeVList({positionType:"shift",positionData:-a,children:[{type:"elem",elem:r}]},e)},mathmlBuilder:function(t,e){var r=new ue.MathNode("mpadded",[ve(t.body,e)]),a=t.dy.number+t.dy.unit;return r.setAttribute("voffset",a),r}}),_t({type:"rule",names:["\\rule"],props:{numArgs:2,numOptionalArgs:1,argTypes:["size","size","size"]},handler:function(t,e,r){var a=t.parser,n=r[0],i=Ce(e[0],"size"),o=Ce(e[1],"size");return {type:"rule",mode:a.mode,shift:n&&Ce(n,"size").value,width:i.value,height:o.value}},htmlBuilder:function(t,e){var r=Dt.makeSpan(["mord","rule"],[],e),a=Tt(t.width,e),n=Tt(t.height,e),i=t.shift?Tt(t.shift,e):0;return r.style.borderRightWidth=a+"em",r.style.borderTopWidth=n+"em",r.style.bottom=i+"em",r.width=a,r.height=n+i,r.depth=-i,r.maxFontSize=1.125*n*e.sizeMultiplier,r},mathmlBuilder:function(t,e){var r=Tt(t.width,e),a=Tt(t.height,e),n=t.shift?Tt(t.shift,e):0,i=e.color&&e.getColor()||"black",o=new ue.MathNode("mspace");o.setAttribute("mathbackground",i),o.setAttribute("width",r+"em"),o.setAttribute("height",a+"em");var s=new ue.MathNode("mpadded",[o]);return n>=0?s.setAttribute("height","+"+n+"em"):(s.setAttribute("height",n+"em"),s.setAttribute("depth","+"+-n+"em")),s.setAttribute("voffset",n+"em"),s}});var jr=["\\tiny","\\sixptsize","\\scriptsize","\\footnotesize","\\small","\\normalsize","\\large","\\Large","\\LARGE","\\huge","\\Huge"];_t({type:"sizing",names:jr,props:{numArgs:0,allowedInText:!0},handler:function(t,e){var r=t.breakOnTokenText,a=t.funcName,n=t.parser,i=n.parseExpression(!1,r);return {type:"sizing",mode:n.mode,size:jr.indexOf(a)+1,body:i}},htmlBuilder:function(t,e){var r=e.havingSize(t.size);return _r(t.body,r,e)},mathmlBuilder:function(t,e){var r=e.havingSize(t.size),a=ge(t.body,r),n=new ue.MathNode("mstyle",a);return n.setAttribute("mathsize",r.sizeMultiplier+"em"),n}}),_t({type:"smash",names:["\\smash"],props:{numArgs:1,numOptionalArgs:1,allowedInText:!0},handler:function(t,e,r){var a=t.parser,n=!1,i=!1,o=r[0]&&Ce(r[0],"ordgroup");if(o)for(var s="",l=0;l<o.body.length;++l){if("t"===(s=o.body[l].text))n=!0;else{if("b"!==s){n=!1,i=!1;break}i=!0;}}else n=!0,i=!0;var h=e[0];return {type:"smash",mode:a.mode,body:h,smashHeight:n,smashDepth:i}},htmlBuilder:function(t,e){var r=Dt.makeSpan([],[oe(t.body,e)]);if(!t.smashHeight&&!t.smashDepth)return r;if(t.smashHeight&&(r.height=0,r.children))for(var a=0;a<r.children.length;a++)r.children[a].height=0;if(t.smashDepth&&(r.depth=0,r.children))for(var n=0;n<r.children.length;n++)r.children[n].depth=0;var i=Dt.makeVList({positionType:"firstBaseline",children:[{type:"elem",elem:r}]},e);return Dt.makeSpan(["mord"],[i],e)},mathmlBuilder:function(t,e){var r=new ue.MathNode("mpadded",[ve(t.body,e)]);return t.smashHeight&&r.setAttribute("height","0px"),t.smashDepth&&r.setAttribute("depth","0px"),r}}),_t({type:"sqrt",names:["\\sqrt"],props:{numArgs:1,numOptionalArgs:1},handler:function(t,e,r){var a=t.parser,n=r[0],i=e[0];return {type:"sqrt",mode:a.mode,body:i,index:n}},htmlBuilder:function(t,e){var r=oe(t.body,e.havingCrampedStyle());0===r.height&&(r.height=e.fontMetrics().xHeight),r=Dt.wrapFragment(r,e);var a=e.fontMetrics().defaultRuleThickness,n=a;e.style.id<w.TEXT.id&&(n=e.fontMetrics().xHeight);var i=a+n/4,o=r.height+r.depth+i+a,s=ir(o,e),l=s.span,h=s.ruleWidth,m=s.advanceWidth,c=l.height-h;c>r.height+r.depth+i&&(i=(i+c-r.height-r.depth)/2);var u=l.height-r.height-i-h;r.style.paddingLeft=m+"em";var p=Dt.makeVList({positionType:"firstBaseline",children:[{type:"elem",elem:r,wrapperClasses:["svg-align"]},{type:"kern",size:-(r.height+u)},{type:"elem",elem:l},{type:"kern",size:h}]},e);if(t.index){var d=e.havingStyle(w.SCRIPTSCRIPT),f=oe(t.index,d,e),g=.6*(p.height-p.depth),x=Dt.makeVList({positionType:"shift",positionData:-g,children:[{type:"elem",elem:f}]},e),v=Dt.makeSpan(["root"],[x]);return Dt.makeSpan(["mord","sqrt"],[v,p],e)}return Dt.makeSpan(["mord","sqrt"],[p],e)},mathmlBuilder:function(t,e){var r=t.body,a=t.index;return a?new ue.MathNode("mroot",[ve(r,e),ve(a,e)]):new ue.MathNode("msqrt",[ve(r,e)])}});var $r={display:w.DISPLAY,text:w.TEXT,script:w.SCRIPT,scriptscript:w.SCRIPTSCRIPT};_t({type:"styling",names:["\\displaystyle","\\textstyle","\\scriptstyle","\\scriptscriptstyle"],props:{numArgs:0,allowedInText:!0},handler:function(t,e){var r=t.breakOnTokenText,a=t.funcName,n=t.parser,i=n.parseExpression(!0,r),o=a.slice(1,a.length-5);return {type:"styling",mode:n.mode,style:o,body:i}},htmlBuilder:function(t,e){var r=$r[t.style],a=e.havingStyle(r).withFont("");return _r(t.body,a,e)},mathmlBuilder:function(t,e){var r=$r[t.style],a=e.havingStyle(r),n=ge(t.body,a),i=new ue.MathNode("mstyle",n),o={display:["0","true"],text:["0","false"],script:["1","false"],scriptscript:["2","false"]}[t.style];return i.setAttribute("scriptlevel",o[0]),i.setAttribute("displaystyle",o[1]),i}});jt({type:"supsub",htmlBuilder:function(t,e){var r=function(t,e){var r=t.base;return r?"op"===r.type?r.limits&&(e.style.size===w.DISPLAY.size||r.alwaysHandleSupSub)?Ur:null:"operatorname"===r.type?r.alwaysHandleSupSub&&(e.style.size===w.DISPLAY.size||r.limits)?Xr:null:"accent"===r.type?c.isCharacterBox(r.base)?Ie:null:"horizBrace"===r.type&&!t.sub===r.isOver?Pr:null:null}(t,e);if(r)return r(t,e);var a,n,i,o=t.base,s=t.sup,l=t.sub,h=oe(o,e),m=e.fontMetrics(),u=0,p=0,d=o&&c.isCharacterBox(o);if(s){var f=e.havingStyle(e.style.sup());a=oe(s,f,e),d||(u=h.height-f.fontMetrics().supDrop*f.sizeMultiplier/e.sizeMultiplier);}if(l){var g=e.havingStyle(e.style.sub());n=oe(l,g,e),d||(p=h.depth+g.fontMetrics().subDrop*g.sizeMultiplier/e.sizeMultiplier);}i=e.style===w.DISPLAY?m.sup1:e.style.cramped?m.sup3:m.sup2;var x,v=e.sizeMultiplier,b=.5/m.ptPerEm/v+"em",y=null;if(n){var k=t.base&&"op"===t.base.type&&t.base.name&&("\\oiint"===t.base.name||"\\oiiint"===t.base.name);(h instanceof E||k)&&(y=-h.italic+"em");}if(a&&n){u=Math.max(u,i,a.depth+.25*m.xHeight),p=Math.max(p,m.sub2);var S=4*m.defaultRuleThickness;if(u-a.depth-(n.height-p)<S){p=S-(u-a.depth)+n.height;var M=.8*m.xHeight-(u-a.depth);M>0&&(u+=M,p-=M);}var z=[{type:"elem",elem:n,shift:p,marginRight:b,marginLeft:y},{type:"elem",elem:a,shift:-u,marginRight:b}];x=Dt.makeVList({positionType:"individualShift",children:z},e);}else if(n){p=Math.max(p,m.sub1,n.height-.8*m.xHeight);var A=[{type:"elem",elem:n,marginLeft:y,marginRight:b}];x=Dt.makeVList({positionType:"shift",positionData:p,children:A},e);}else{if(!a)throw new Error("supsub must have either sup or sub.");u=Math.max(u,i,a.depth+.25*m.xHeight),x=Dt.makeVList({positionType:"shift",positionData:-u,children:[{type:"elem",elem:a,marginRight:b}]},e);}var T=ne(h,"right")||"mord";return Dt.makeSpan([T],[h,Dt.makeSpan(["msupsub"],[x])],e)},mathmlBuilder:function(t,e){var r,a=!1;t.base&&"horizBrace"===t.base.type&&!!t.sup===t.base.isOver&&(a=!0,r=t.base.isOver),!t.base||"op"!==t.base.type&&"operatorname"!==t.base.type||(t.base.parentIsSupSub=!0);var n,i=[ve(t.base,e)];if(t.sub&&i.push(ve(t.sub,e)),t.sup&&i.push(ve(t.sup,e)),a)n=r?"mover":"munder";else if(t.sub)if(t.sup){var o=t.base;n=o&&"op"===o.type&&o.limits&&e.style===w.DISPLAY?"munderover":o&&"operatorname"===o.type&&o.alwaysHandleSupSub&&(e.style===w.DISPLAY||o.limits)?"munderover":"msubsup";}else{var s=t.base;n=s&&"op"===s.type&&s.limits&&(e.style===w.DISPLAY||s.alwaysHandleSupSub)?"munder":s&&"operatorname"===s.type&&s.alwaysHandleSupSub&&(s.limits||e.style===w.DISPLAY)?"munder":"msub";}else{var l=t.base;n=l&&"op"===l.type&&l.limits&&(e.style===w.DISPLAY||l.alwaysHandleSupSub)?"mover":l&&"operatorname"===l.type&&l.alwaysHandleSupSub&&(l.limits||e.style===w.DISPLAY)?"mover":"msup";}return new ue.MathNode(n,i)}}),jt({type:"atom",htmlBuilder:function(t,e){return Dt.mathsym(t.text,t.mode,e,["m"+t.family])},mathmlBuilder:function(t,e){var r=new ue.MathNode("mo",[pe(t.text,t.mode)]);if("bin"===t.family){var a=fe(t,e);"bold-italic"===a&&r.setAttribute("mathvariant",a);}else"punct"===t.family?r.setAttribute("separator","true"):"open"!==t.family&&"close"!==t.family||r.setAttribute("stretchy","false");return r}});var Zr={mi:"italic",mn:"normal",mtext:"normal"};jt({type:"mathord",htmlBuilder:function(t,e){return Dt.makeOrd(t,e,"mathord")},mathmlBuilder:function(t,e){var r=new ue.MathNode("mi",[pe(t.text,t.mode,e)]),a=fe(t,e)||"italic";return a!==Zr[r.type]&&r.setAttribute("mathvariant",a),r}}),jt({type:"textord",htmlBuilder:function(t,e){return Dt.makeOrd(t,e,"textord")},mathmlBuilder:function(t,e){var r,a=pe(t.text,t.mode,e),n=fe(t,e)||"normal";return r="text"===t.mode?new ue.MathNode("mtext",[a]):/[0-9]/.test(t.text)?new ue.MathNode("mn",[a]):"\\prime"===t.text?new ue.MathNode("mo",[a]):new ue.MathNode("mi",[a]),n!==Zr[r.type]&&r.setAttribute("mathvariant",n),r}});var Kr={"\\nobreak":"nobreak","\\allowbreak":"allowbreak"},Jr={" ":{},"\\ ":{},"~":{className:"nobreak"},"\\space":{},"\\nobreakspace":{className:"nobreak"}};jt({type:"spacing",htmlBuilder:function(t,e){if(Jr.hasOwnProperty(t.text)){var r=Jr[t.text].className||"";if("text"===t.mode){var a=Dt.makeOrd(t,e,"textord");return a.classes.push(r),a}return Dt.makeSpan(["mspace",r],[Dt.mathsym(t.text,t.mode,e)],e)}if(Kr.hasOwnProperty(t.text))return Dt.makeSpan(["mspace",Kr[t.text]],[],e);throw new o('Unknown type of space "'+t.text+'"')},mathmlBuilder:function(t,e){if(!Jr.hasOwnProperty(t.text)){if(Kr.hasOwnProperty(t.text))return new ue.MathNode("mspace");throw new o('Unknown type of space "'+t.text+'"')}return new ue.MathNode("mtext",[new ue.TextNode("\xa0")])}});var Qr=function(){var t=new ue.MathNode("mtd",[]);return t.setAttribute("width","50%"),t};jt({type:"tag",mathmlBuilder:function(t,e){var r=new ue.MathNode("mtable",[new ue.MathNode("mtr",[Qr(),new ue.MathNode("mtd",[xe(t.body,e)]),Qr(),new ue.MathNode("mtd",[xe(t.tag,e)])])]);return r.setAttribute("width","100%"),r}});var ta={"\\text":void 0,"\\textrm":"textrm","\\textsf":"textsf","\\texttt":"texttt","\\textnormal":"textrm"},ea={"\\textbf":"textbf","\\textmd":"textmd"},ra={"\\textit":"textit","\\textup":"textup"},aa=function(t,e){var r=t.font;return r?ta[r]?e.withTextFontFamily(ta[r]):ea[r]?e.withTextFontWeight(ea[r]):e.withTextFontShape(ra[r]):e};_t({type:"text",names:["\\text","\\textrm","\\textsf","\\texttt","\\textnormal","\\textbf","\\textmd","\\textit","\\textup"],props:{numArgs:1,argTypes:["text"],greediness:2,allowedInText:!0},handler:function(t,e){var r=t.parser,a=t.funcName,n=e[0];return {type:"text",mode:r.mode,body:$t(n),font:a}},htmlBuilder:function(t,e){var r=aa(t,e),a=ee(t.body,r,!0);return Dt.makeSpan(["mord","text"],Dt.tryCombineChars(a),r)},mathmlBuilder:function(t,e){var r=aa(t,e);return xe(t.body,r)}}),_t({type:"underline",names:["\\underline"],props:{numArgs:1,allowedInText:!0},handler:function(t,e){return {type:"underline",mode:t.parser.mode,body:e[0]}},htmlBuilder:function(t,e){var r=oe(t.body,e),a=Dt.makeLineSpan("underline-line",e),n=e.fontMetrics().defaultRuleThickness,i=Dt.makeVList({positionType:"top",positionData:r.height,children:[{type:"kern",size:n},{type:"elem",elem:a},{type:"kern",size:3*n},{type:"elem",elem:r}]},e);return Dt.makeSpan(["mord","underline"],[i],e)},mathmlBuilder:function(t,e){var r=new ue.MathNode("mo",[new ue.TextNode("\u203e")]);r.setAttribute("stretchy","true");var a=new ue.MathNode("munder",[ve(t.body,e),r]);return a.setAttribute("accentunder","true"),a}}),_t({type:"verb",names:["\\verb"],props:{numArgs:0,allowedInText:!0},handler:function(t,e,r){throw new o("\\verb ended by end of line instead of matching delimiter")},htmlBuilder:function(t,e){for(var r=na(t),a=[],n=e.havingStyle(e.style.text()),i=0;i<r.length;i++){var o=r[i];"~"===o&&(o="\\textasciitilde"),a.push(Dt.makeSymbol(o,"Typewriter-Regular",t.mode,n,["mord","texttt"]));}return Dt.makeSpan(["mord","text"].concat(n.sizingClasses(e)),Dt.tryCombineChars(a),n)},mathmlBuilder:function(t,e){var r=new ue.TextNode(na(t)),a=new ue.MathNode("mtext",[r]);return a.setAttribute("mathvariant","monospace"),a}});var na=function(t){return t.body.replace(/ /g,t.star?"\u2423":"\xa0")},ia=Yt,oa=new RegExp("^(\\\\[a-zA-Z@]+)[ \r\n\t]*$"),sa=new RegExp("[\u0300-\u036f]+$"),la="([ \r\n\t]+)|([!-\\[\\]-\u2027\u202a-\ud7ff\uf900-\uffff][\u0300-\u036f]*|[\ud800-\udbff][\udc00-\udfff][\u0300-\u036f]*|\\\\verb\\*([^]).*?\\3|\\\\verb([^*a-zA-Z]).*?\\4|\\\\operatorname\\*|\\\\[a-zA-Z@]+[ \r\n\t]*|\\\\[^\ud800-\udfff])",ha=function(){function t(t,e){this.input=void 0,this.settings=void 0,this.tokenRegex=void 0,this.catcodes=void 0,this.input=t,this.settings=e,this.tokenRegex=new RegExp(la,"g"),this.catcodes={"%":14};}var e=t.prototype;return e.setCatcode=function(t,e){this.catcodes[t]=e;},e.lex=function(){var t=this.input,e=this.tokenRegex.lastIndex;if(e===t.length)return new n("EOF",new a(this,e,e));var r=this.tokenRegex.exec(t);if(null===r||r.index!==e)throw new o("Unexpected character: '"+t[e]+"'",new n(t[e],new a(this,e,e+1)));var i=r[2]||" ";if(14===this.catcodes[i]){var s=t.indexOf("\n",this.tokenRegex.lastIndex);return -1===s?(this.tokenRegex.lastIndex=t.length,this.settings.reportNonstrict("commentAtEnd","% comment has no terminating newline; LaTeX would fail because of commenting the end of math mode (e.g. $)")):this.tokenRegex.lastIndex=s+1,this.lex()}var l=i.match(oa);return l&&(i=l[1]),new n(i,new a(this,e,this.tokenRegex.lastIndex))},t}(),ma=function(){function t(t,e){void 0===t&&(t={}),void 0===e&&(e={}),this.current=void 0,this.builtins=void 0,this.undefStack=void 0,this.current=e,this.builtins=t,this.undefStack=[];}var e=t.prototype;return e.beginGroup=function(){this.undefStack.push({});},e.endGroup=function(){if(0===this.undefStack.length)throw new o("Unbalanced namespace destruction: attempt to pop global namespace; please report this as a bug");var t=this.undefStack.pop();for(var e in t)t.hasOwnProperty(e)&&(void 0===t[e]?delete this.current[e]:this.current[e]=t[e]);},e.has=function(t){return this.current.hasOwnProperty(t)||this.builtins.hasOwnProperty(t)},e.get=function(t){return this.current.hasOwnProperty(t)?this.current[t]:this.builtins[t]},e.set=function(t,e,r){if(void 0===r&&(r=!1),r){for(var a=0;a<this.undefStack.length;a++)delete this.undefStack[a][t];this.undefStack.length>0&&(this.undefStack[this.undefStack.length-1][t]=e);}else{var n=this.undefStack[this.undefStack.length-1];n&&!n.hasOwnProperty(t)&&(n[t]=this.current[t]);}this.current[t]=e;},t}(),ca={},ua=ca;function pa(t,e){ca[t]=e;}pa("\\noexpand",function(t){var e=t.popToken();return t.isExpandable(e.text)&&(e.noexpand=!0,e.treatAsRelax=!0),{tokens:[e],numArgs:0}}),pa("\\expandafter",function(t){var e=t.popToken();return t.expandOnce(!0),{tokens:[e],numArgs:0}}),pa("\\@firstoftwo",function(t){return {tokens:t.consumeArgs(2)[0],numArgs:0}}),pa("\\@secondoftwo",function(t){return {tokens:t.consumeArgs(2)[1],numArgs:0}}),pa("\\@ifnextchar",function(t){var e=t.consumeArgs(3);t.consumeSpaces();var r=t.future();return 1===e[0].length&&e[0][0].text===r.text?{tokens:e[1],numArgs:0}:{tokens:e[2],numArgs:0}}),pa("\\@ifstar","\\@ifnextchar *{\\@firstoftwo{#1}}"),pa("\\TextOrMath",function(t){var e=t.consumeArgs(2);return "text"===t.mode?{tokens:e[0],numArgs:0}:{tokens:e[1],numArgs:0}});var da={0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,a:10,A:10,b:11,B:11,c:12,C:12,d:13,D:13,e:14,E:14,f:15,F:15};pa("\\char",function(t){var e,r=t.popToken(),a="";if("'"===r.text)e=8,r=t.popToken();else if('"'===r.text)e=16,r=t.popToken();else if("`"===r.text)if("\\"===(r=t.popToken()).text[0])a=r.text.charCodeAt(1);else{if("EOF"===r.text)throw new o("\\char` missing argument");a=r.text.charCodeAt(0);}else e=10;if(e){if(null==(a=da[r.text])||a>=e)throw new o("Invalid base-"+e+" digit "+r.text);for(var n;null!=(n=da[t.future().text])&&n<e;)a*=e,a+=n,t.popToken();}return "\\@char{"+a+"}"});var fa=function(t,e,r){var a=t.consumeArgs(1)[0];if(1!==a.length)throw new o("\\newcommand's first argument must be a macro name");var n=a[0].text,i=t.isDefined(n);if(i&&!e)throw new o("\\newcommand{"+n+"} attempting to redefine "+n+"; use \\renewcommand");if(!i&&!r)throw new o("\\renewcommand{"+n+"} when command "+n+" does not yet exist; use \\newcommand");var s=0;if(1===(a=t.consumeArgs(1)[0]).length&&"["===a[0].text){for(var l="",h=t.expandNextToken();"]"!==h.text&&"EOF"!==h.text;)l+=h.text,h=t.expandNextToken();if(!l.match(/^\s*[0-9]+\s*$/))throw new o("Invalid number of arguments: "+l);s=parseInt(l),a=t.consumeArgs(1)[0];}return t.macros.set(n,{tokens:a,numArgs:s}),""};pa("\\newcommand",function(t){return fa(t,!1,!0)}),pa("\\renewcommand",function(t){return fa(t,!0,!1)}),pa("\\providecommand",function(t){return fa(t,!0,!0)}),pa("\\message",function(t){var e=t.consumeArgs(1)[0];return console.log(e.reverse().map(function(t){return t.text}).join("")),""}),pa("\\errmessage",function(t){var e=t.consumeArgs(1)[0];return console.error(e.reverse().map(function(t){return t.text}).join("")),""}),pa("\\show",function(t){var e=t.popToken(),r=e.text;return console.log(e,t.macros.get(r),ia[r],j.math[r],j.text[r]),""}),pa("\\bgroup","{"),pa("\\egroup","}"),pa("\\lq","`"),pa("\\rq","'"),pa("\\aa","\\r a"),pa("\\AA","\\r A"),pa("\\textcopyright","\\html@mathml{\\textcircled{c}}{\\char`\xa9}"),pa("\\copyright","\\TextOrMath{\\textcopyright}{\\text{\\textcopyright}}"),pa("\\textregistered","\\html@mathml{\\textcircled{\\scriptsize R}}{\\char`\xae}"),pa("\u212c","\\mathscr{B}"),pa("\u2130","\\mathscr{E}"),pa("\u2131","\\mathscr{F}"),pa("\u210b","\\mathscr{H}"),pa("\u2110","\\mathscr{I}"),pa("\u2112","\\mathscr{L}"),pa("\u2133","\\mathscr{M}"),pa("\u211b","\\mathscr{R}"),pa("\u212d","\\mathfrak{C}"),pa("\u210c","\\mathfrak{H}"),pa("\u2128","\\mathfrak{Z}"),pa("\\Bbbk","\\Bbb{k}"),pa("\xb7","\\cdotp"),pa("\\llap","\\mathllap{\\textrm{#1}}"),pa("\\rlap","\\mathrlap{\\textrm{#1}}"),pa("\\clap","\\mathclap{\\textrm{#1}}"),pa("\\not",'\\html@mathml{\\mathrel{\\mathrlap\\@not}}{\\char"338}'),pa("\\neq","\\html@mathml{\\mathrel{\\not=}}{\\mathrel{\\char`\u2260}}"),pa("\\ne","\\neq"),pa("\u2260","\\neq"),pa("\\notin","\\html@mathml{\\mathrel{{\\in}\\mathllap{/\\mskip1mu}}}{\\mathrel{\\char`\u2209}}"),pa("\u2209","\\notin"),pa("\u2258","\\html@mathml{\\mathrel{=\\kern{-1em}\\raisebox{0.4em}{$\\scriptsize\\frown$}}}{\\mathrel{\\char`\u2258}}"),pa("\u2259","\\html@mathml{\\stackrel{\\tiny\\wedge}{=}}{\\mathrel{\\char`\u2258}}"),pa("\u225a","\\html@mathml{\\stackrel{\\tiny\\vee}{=}}{\\mathrel{\\char`\u225a}}"),pa("\u225b","\\html@mathml{\\stackrel{\\scriptsize\\star}{=}}{\\mathrel{\\char`\u225b}}"),pa("\u225d","\\html@mathml{\\stackrel{\\tiny\\mathrm{def}}{=}}{\\mathrel{\\char`\u225d}}"),pa("\u225e","\\html@mathml{\\stackrel{\\tiny\\mathrm{m}}{=}}{\\mathrel{\\char`\u225e}}"),pa("\u225f","\\html@mathml{\\stackrel{\\tiny?}{=}}{\\mathrel{\\char`\u225f}}"),pa("\u27c2","\\perp"),pa("\u203c","\\mathclose{!\\mkern-0.8mu!}"),pa("\u220c","\\notni"),pa("\u231c","\\ulcorner"),pa("\u231d","\\urcorner"),pa("\u231e","\\llcorner"),pa("\u231f","\\lrcorner"),pa("\xa9","\\copyright"),pa("\xae","\\textregistered"),pa("\ufe0f","\\textregistered"),pa("\\ulcorner",'\\html@mathml{\\@ulcorner}{\\mathop{\\char"231c}}'),pa("\\urcorner",'\\html@mathml{\\@urcorner}{\\mathop{\\char"231d}}'),pa("\\llcorner",'\\html@mathml{\\@llcorner}{\\mathop{\\char"231e}}'),pa("\\lrcorner",'\\html@mathml{\\@lrcorner}{\\mathop{\\char"231f}}'),pa("\\vdots","\\mathord{\\varvdots\\rule{0pt}{15pt}}"),pa("\u22ee","\\vdots"),pa("\\varGamma","\\mathit{\\Gamma}"),pa("\\varDelta","\\mathit{\\Delta}"),pa("\\varTheta","\\mathit{\\Theta}"),pa("\\varLambda","\\mathit{\\Lambda}"),pa("\\varXi","\\mathit{\\Xi}"),pa("\\varPi","\\mathit{\\Pi}"),pa("\\varSigma","\\mathit{\\Sigma}"),pa("\\varUpsilon","\\mathit{\\Upsilon}"),pa("\\varPhi","\\mathit{\\Phi}"),pa("\\varPsi","\\mathit{\\Psi}"),pa("\\varOmega","\\mathit{\\Omega}"),pa("\\substack","\\begin{subarray}{c}#1\\end{subarray}"),pa("\\colon","\\nobreak\\mskip2mu\\mathpunct{}\\mathchoice{\\mkern-3mu}{\\mkern-3mu}{}{}{:}\\mskip6mu"),pa("\\boxed","\\fbox{$\\displaystyle{#1}$}"),pa("\\iff","\\DOTSB\\;\\Longleftrightarrow\\;"),pa("\\implies","\\DOTSB\\;\\Longrightarrow\\;"),pa("\\impliedby","\\DOTSB\\;\\Longleftarrow\\;");var ga={",":"\\dotsc","\\not":"\\dotsb","+":"\\dotsb","=":"\\dotsb","<":"\\dotsb",">":"\\dotsb","-":"\\dotsb","*":"\\dotsb",":":"\\dotsb","\\DOTSB":"\\dotsb","\\coprod":"\\dotsb","\\bigvee":"\\dotsb","\\bigwedge":"\\dotsb","\\biguplus":"\\dotsb","\\bigcap":"\\dotsb","\\bigcup":"\\dotsb","\\prod":"\\dotsb","\\sum":"\\dotsb","\\bigotimes":"\\dotsb","\\bigoplus":"\\dotsb","\\bigodot":"\\dotsb","\\bigsqcup":"\\dotsb","\\And":"\\dotsb","\\longrightarrow":"\\dotsb","\\Longrightarrow":"\\dotsb","\\longleftarrow":"\\dotsb","\\Longleftarrow":"\\dotsb","\\longleftrightarrow":"\\dotsb","\\Longleftrightarrow":"\\dotsb","\\mapsto":"\\dotsb","\\longmapsto":"\\dotsb","\\hookrightarrow":"\\dotsb","\\doteq":"\\dotsb","\\mathbin":"\\dotsb","\\mathrel":"\\dotsb","\\relbar":"\\dotsb","\\Relbar":"\\dotsb","\\xrightarrow":"\\dotsb","\\xleftarrow":"\\dotsb","\\DOTSI":"\\dotsi","\\int":"\\dotsi","\\oint":"\\dotsi","\\iint":"\\dotsi","\\iiint":"\\dotsi","\\iiiint":"\\dotsi","\\idotsint":"\\dotsi","\\DOTSX":"\\dotsx"};pa("\\dots",function(t){var e="\\dotso",r=t.expandAfterFuture().text;return r in ga?e=ga[r]:"\\not"===r.substr(0,4)?e="\\dotsb":r in j.math&&c.contains(["bin","rel"],j.math[r].group)&&(e="\\dotsb"),e});var xa={")":!0,"]":!0,"\\rbrack":!0,"\\}":!0,"\\rbrace":!0,"\\rangle":!0,"\\rceil":!0,"\\rfloor":!0,"\\rgroup":!0,"\\rmoustache":!0,"\\right":!0,"\\bigr":!0,"\\biggr":!0,"\\Bigr":!0,"\\Biggr":!0,$:!0,";":!0,".":!0,",":!0};pa("\\dotso",function(t){return t.future().text in xa?"\\ldots\\,":"\\ldots"}),pa("\\dotsc",function(t){var e=t.future().text;return e in xa&&","!==e?"\\ldots\\,":"\\ldots"}),pa("\\cdots",function(t){return t.future().text in xa?"\\@cdots\\,":"\\@cdots"}),pa("\\dotsb","\\cdots"),pa("\\dotsm","\\cdots"),pa("\\dotsi","\\!\\cdots"),pa("\\dotsx","\\ldots\\,"),pa("\\DOTSI","\\relax"),pa("\\DOTSB","\\relax"),pa("\\DOTSX","\\relax"),pa("\\tmspace","\\TextOrMath{\\kern#1#3}{\\mskip#1#2}\\relax"),pa("\\,","\\tmspace+{3mu}{.1667em}"),pa("\\thinspace","\\,"),pa("\\>","\\mskip{4mu}"),pa("\\:","\\tmspace+{4mu}{.2222em}"),pa("\\medspace","\\:"),pa("\\;","\\tmspace+{5mu}{.2777em}"),pa("\\thickspace","\\;"),pa("\\!","\\tmspace-{3mu}{.1667em}"),pa("\\negthinspace","\\!"),pa("\\negmedspace","\\tmspace-{4mu}{.2222em}"),pa("\\negthickspace","\\tmspace-{5mu}{.277em}"),pa("\\enspace","\\kern.5em "),pa("\\enskip","\\hskip.5em\\relax"),pa("\\quad","\\hskip1em\\relax"),pa("\\qquad","\\hskip2em\\relax"),pa("\\tag","\\@ifstar\\tag@literal\\tag@paren"),pa("\\tag@paren","\\tag@literal{({#1})}"),pa("\\tag@literal",function(t){if(t.macros.get("\\df@tag"))throw new o("Multiple \\tag");return "\\gdef\\df@tag{\\text{#1}}"}),pa("\\bmod","\\mathchoice{\\mskip1mu}{\\mskip1mu}{\\mskip5mu}{\\mskip5mu}\\mathbin{\\rm mod}\\mathchoice{\\mskip1mu}{\\mskip1mu}{\\mskip5mu}{\\mskip5mu}"),pa("\\pod","\\allowbreak\\mathchoice{\\mkern18mu}{\\mkern8mu}{\\mkern8mu}{\\mkern8mu}(#1)"),pa("\\pmod","\\pod{{\\rm mod}\\mkern6mu#1}"),pa("\\mod","\\allowbreak\\mathchoice{\\mkern18mu}{\\mkern12mu}{\\mkern12mu}{\\mkern12mu}{\\rm mod}\\,\\,#1"),pa("\\pmb","\\html@mathml{\\@binrel{#1}{\\mathrlap{#1}\\kern0.5px#1}}{\\mathbf{#1}}"),pa("\\\\","\\newline"),pa("\\TeX","\\textrm{\\html@mathml{T\\kern-.1667em\\raisebox{-.5ex}{E}\\kern-.125emX}{TeX}}");var va=F["Main-Regular"]["T".charCodeAt(0)][1]-.7*F["Main-Regular"]["A".charCodeAt(0)][1]+"em";pa("\\LaTeX","\\textrm{\\html@mathml{L\\kern-.36em\\raisebox{"+va+"}{\\scriptstyle A}\\kern-.15em\\TeX}{LaTeX}}"),pa("\\KaTeX","\\textrm{\\html@mathml{K\\kern-.17em\\raisebox{"+va+"}{\\scriptstyle A}\\kern-.15em\\TeX}{KaTeX}}"),pa("\\hspace","\\@ifstar\\@hspacer\\@hspace"),pa("\\@hspace","\\hskip #1\\relax"),pa("\\@hspacer","\\rule{0pt}{0pt}\\hskip #1\\relax"),pa("\\ordinarycolon",":"),pa("\\vcentcolon","\\mathrel{\\mathop\\ordinarycolon}"),pa("\\dblcolon",'\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-.9mu}\\vcentcolon}}{\\mathop{\\char"2237}}'),pa("\\coloneqq",'\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}=}}{\\mathop{\\char"2254}}'),pa("\\Coloneqq",'\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}=}}{\\mathop{\\char"2237\\char"3d}}'),pa("\\coloneq",'\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\mathrel{-}}}{\\mathop{\\char"3a\\char"2212}}'),pa("\\Coloneq",'\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\mathrel{-}}}{\\mathop{\\char"2237\\char"2212}}'),pa("\\eqqcolon",'\\html@mathml{\\mathrel{=\\mathrel{\\mkern-1.2mu}\\vcentcolon}}{\\mathop{\\char"2255}}'),pa("\\Eqqcolon",'\\html@mathml{\\mathrel{=\\mathrel{\\mkern-1.2mu}\\dblcolon}}{\\mathop{\\char"3d\\char"2237}}'),pa("\\eqcolon",'\\html@mathml{\\mathrel{\\mathrel{-}\\mathrel{\\mkern-1.2mu}\\vcentcolon}}{\\mathop{\\char"2239}}'),pa("\\Eqcolon",'\\html@mathml{\\mathrel{\\mathrel{-}\\mathrel{\\mkern-1.2mu}\\dblcolon}}{\\mathop{\\char"2212\\char"2237}}'),pa("\\colonapprox",'\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\approx}}{\\mathop{\\char"3a\\char"2248}}'),pa("\\Colonapprox",'\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\approx}}{\\mathop{\\char"2237\\char"2248}}'),pa("\\colonsim",'\\html@mathml{\\mathrel{\\vcentcolon\\mathrel{\\mkern-1.2mu}\\sim}}{\\mathop{\\char"3a\\char"223c}}'),pa("\\Colonsim",'\\html@mathml{\\mathrel{\\dblcolon\\mathrel{\\mkern-1.2mu}\\sim}}{\\mathop{\\char"2237\\char"223c}}'),pa("\u2237","\\dblcolon"),pa("\u2239","\\eqcolon"),pa("\u2254","\\coloneqq"),pa("\u2255","\\eqqcolon"),pa("\u2a74","\\Coloneqq"),pa("\\ratio","\\vcentcolon"),pa("\\coloncolon","\\dblcolon"),pa("\\colonequals","\\coloneqq"),pa("\\coloncolonequals","\\Coloneqq"),pa("\\equalscolon","\\eqqcolon"),pa("\\equalscoloncolon","\\Eqqcolon"),pa("\\colonminus","\\coloneq"),pa("\\coloncolonminus","\\Coloneq"),pa("\\minuscolon","\\eqcolon"),pa("\\minuscoloncolon","\\Eqcolon"),pa("\\coloncolonapprox","\\Colonapprox"),pa("\\coloncolonsim","\\Colonsim"),pa("\\simcolon","\\mathrel{\\sim\\mathrel{\\mkern-1.2mu}\\vcentcolon}"),pa("\\simcoloncolon","\\mathrel{\\sim\\mathrel{\\mkern-1.2mu}\\dblcolon}"),pa("\\approxcolon","\\mathrel{\\approx\\mathrel{\\mkern-1.2mu}\\vcentcolon}"),pa("\\approxcoloncolon","\\mathrel{\\approx\\mathrel{\\mkern-1.2mu}\\dblcolon}"),pa("\\notni","\\html@mathml{\\not\\ni}{\\mathrel{\\char`\u220c}}"),pa("\\limsup","\\DOTSB\\operatorname*{lim\\,sup}"),pa("\\liminf","\\DOTSB\\operatorname*{lim\\,inf}"),pa("\\gvertneqq","\\html@mathml{\\@gvertneqq}{\u2269}"),pa("\\lvertneqq","\\html@mathml{\\@lvertneqq}{\u2268}"),pa("\\ngeqq","\\html@mathml{\\@ngeqq}{\u2271}"),pa("\\ngeqslant","\\html@mathml{\\@ngeqslant}{\u2271}"),pa("\\nleqq","\\html@mathml{\\@nleqq}{\u2270}"),pa("\\nleqslant","\\html@mathml{\\@nleqslant}{\u2270}"),pa("\\nshortmid","\\html@mathml{\\@nshortmid}{\u2224}"),pa("\\nshortparallel","\\html@mathml{\\@nshortparallel}{\u2226}"),pa("\\nsubseteqq","\\html@mathml{\\@nsubseteqq}{\u2288}"),pa("\\nsupseteqq","\\html@mathml{\\@nsupseteqq}{\u2289}"),pa("\\varsubsetneq","\\html@mathml{\\@varsubsetneq}{\u228a}"),pa("\\varsubsetneqq","\\html@mathml{\\@varsubsetneqq}{\u2acb}"),pa("\\varsupsetneq","\\html@mathml{\\@varsupsetneq}{\u228b}"),pa("\\varsupsetneqq","\\html@mathml{\\@varsupsetneqq}{\u2acc}"),pa("\\imath","\\html@mathml{\\@imath}{\u0131}"),pa("\\jmath","\\html@mathml{\\@jmath}{\u0237}"),pa("\\llbracket","\\html@mathml{\\mathopen{[\\mkern-3.2mu[}}{\\mathopen{\\char`\u27e6}}"),pa("\\rrbracket","\\html@mathml{\\mathclose{]\\mkern-3.2mu]}}{\\mathclose{\\char`\u27e7}}"),pa("\u27e6","\\llbracket"),pa("\u27e7","\\rrbracket"),pa("\\lBrace","\\html@mathml{\\mathopen{\\{\\mkern-3.2mu[}}{\\mathopen{\\char`\u2983}}"),pa("\\rBrace","\\html@mathml{\\mathclose{]\\mkern-3.2mu\\}}}{\\mathclose{\\char`\u2984}}"),pa("\u2983","\\lBrace"),pa("\u2984","\\rBrace"),pa("\\minuso","\\mathbin{\\html@mathml{{\\mathrlap{\\mathchoice{\\kern{0.145em}}{\\kern{0.145em}}{\\kern{0.1015em}}{\\kern{0.0725em}}\\circ}{-}}}{\\char`\u29b5}}"),pa("\u29b5","\\minuso"),pa("\\darr","\\downarrow"),pa("\\dArr","\\Downarrow"),pa("\\Darr","\\Downarrow"),pa("\\lang","\\langle"),pa("\\rang","\\rangle"),pa("\\uarr","\\uparrow"),pa("\\uArr","\\Uparrow"),pa("\\Uarr","\\Uparrow"),pa("\\N","\\mathbb{N}"),pa("\\R","\\mathbb{R}"),pa("\\Z","\\mathbb{Z}"),pa("\\alef","\\aleph"),pa("\\alefsym","\\aleph"),pa("\\Alpha","\\mathrm{A}"),pa("\\Beta","\\mathrm{B}"),pa("\\bull","\\bullet"),pa("\\Chi","\\mathrm{X}"),pa("\\clubs","\\clubsuit"),pa("\\cnums","\\mathbb{C}"),pa("\\Complex","\\mathbb{C}"),pa("\\Dagger","\\ddagger"),pa("\\diamonds","\\diamondsuit"),pa("\\empty","\\emptyset"),pa("\\Epsilon","\\mathrm{E}"),pa("\\Eta","\\mathrm{H}"),pa("\\exist","\\exists"),pa("\\harr","\\leftrightarrow"),pa("\\hArr","\\Leftrightarrow"),pa("\\Harr","\\Leftrightarrow"),pa("\\hearts","\\heartsuit"),pa("\\image","\\Im"),pa("\\infin","\\infty"),pa("\\Iota","\\mathrm{I}"),pa("\\isin","\\in"),pa("\\Kappa","\\mathrm{K}"),pa("\\larr","\\leftarrow"),pa("\\lArr","\\Leftarrow"),pa("\\Larr","\\Leftarrow"),pa("\\lrarr","\\leftrightarrow"),pa("\\lrArr","\\Leftrightarrow"),pa("\\Lrarr","\\Leftrightarrow"),pa("\\Mu","\\mathrm{M}"),pa("\\natnums","\\mathbb{N}"),pa("\\Nu","\\mathrm{N}"),pa("\\Omicron","\\mathrm{O}"),pa("\\plusmn","\\pm"),pa("\\rarr","\\rightarrow"),pa("\\rArr","\\Rightarrow"),pa("\\Rarr","\\Rightarrow"),pa("\\real","\\Re"),pa("\\reals","\\mathbb{R}"),pa("\\Reals","\\mathbb{R}"),pa("\\Rho","\\mathrm{P}"),pa("\\sdot","\\cdot"),pa("\\sect","\\S"),pa("\\spades","\\spadesuit"),pa("\\sub","\\subset"),pa("\\sube","\\subseteq"),pa("\\supe","\\supseteq"),pa("\\Tau","\\mathrm{T}"),pa("\\thetasym","\\vartheta"),pa("\\weierp","\\wp"),pa("\\Zeta","\\mathrm{Z}"),pa("\\argmin","\\DOTSB\\operatorname*{arg\\,min}"),pa("\\argmax","\\DOTSB\\operatorname*{arg\\,max}"),pa("\\plim","\\DOTSB\\mathop{\\operatorname{plim}}\\limits"),pa("\\bra","\\mathinner{\\langle{#1}|}"),pa("\\ket","\\mathinner{|{#1}\\rangle}"),pa("\\braket","\\mathinner{\\langle{#1}\\rangle}"),pa("\\Bra","\\left\\langle#1\\right|"),pa("\\Ket","\\left|#1\\right\\rangle"),pa("\\blue","\\textcolor{##6495ed}{#1}"),pa("\\orange","\\textcolor{##ffa500}{#1}"),pa("\\pink","\\textcolor{##ff00af}{#1}"),pa("\\red","\\textcolor{##df0030}{#1}"),pa("\\green","\\textcolor{##28ae7b}{#1}"),pa("\\gray","\\textcolor{gray}{#1}"),pa("\\purple","\\textcolor{##9d38bd}{#1}"),pa("\\blueA","\\textcolor{##ccfaff}{#1}"),pa("\\blueB","\\textcolor{##80f6ff}{#1}"),pa("\\blueC","\\textcolor{##63d9ea}{#1}"),pa("\\blueD","\\textcolor{##11accd}{#1}"),pa("\\blueE","\\textcolor{##0c7f99}{#1}"),pa("\\tealA","\\textcolor{##94fff5}{#1}"),pa("\\tealB","\\textcolor{##26edd5}{#1}"),pa("\\tealC","\\textcolor{##01d1c1}{#1}"),pa("\\tealD","\\textcolor{##01a995}{#1}"),pa("\\tealE","\\textcolor{##208170}{#1}"),pa("\\greenA","\\textcolor{##b6ffb0}{#1}"),pa("\\greenB","\\textcolor{##8af281}{#1}"),pa("\\greenC","\\textcolor{##74cf70}{#1}"),pa("\\greenD","\\textcolor{##1fab54}{#1}"),pa("\\greenE","\\textcolor{##0d923f}{#1}"),pa("\\goldA","\\textcolor{##ffd0a9}{#1}"),pa("\\goldB","\\textcolor{##ffbb71}{#1}"),pa("\\goldC","\\textcolor{##ff9c39}{#1}"),pa("\\goldD","\\textcolor{##e07d10}{#1}"),pa("\\goldE","\\textcolor{##a75a05}{#1}"),pa("\\redA","\\textcolor{##fca9a9}{#1}"),pa("\\redB","\\textcolor{##ff8482}{#1}"),pa("\\redC","\\textcolor{##f9685d}{#1}"),pa("\\redD","\\textcolor{##e84d39}{#1}"),pa("\\redE","\\textcolor{##bc2612}{#1}"),pa("\\maroonA","\\textcolor{##ffbde0}{#1}"),pa("\\maroonB","\\textcolor{##ff92c6}{#1}"),pa("\\maroonC","\\textcolor{##ed5fa6}{#1}"),pa("\\maroonD","\\textcolor{##ca337c}{#1}"),pa("\\maroonE","\\textcolor{##9e034e}{#1}"),pa("\\purpleA","\\textcolor{##ddd7ff}{#1}"),pa("\\purpleB","\\textcolor{##c6b9fc}{#1}"),pa("\\purpleC","\\textcolor{##aa87ff}{#1}"),pa("\\purpleD","\\textcolor{##7854ab}{#1}"),pa("\\purpleE","\\textcolor{##543b78}{#1}"),pa("\\mintA","\\textcolor{##f5f9e8}{#1}"),pa("\\mintB","\\textcolor{##edf2df}{#1}"),pa("\\mintC","\\textcolor{##e0e5cc}{#1}"),pa("\\grayA","\\textcolor{##f6f7f7}{#1}"),pa("\\grayB","\\textcolor{##f0f1f2}{#1}"),pa("\\grayC","\\textcolor{##e3e5e6}{#1}"),pa("\\grayD","\\textcolor{##d6d8da}{#1}"),pa("\\grayE","\\textcolor{##babec2}{#1}"),pa("\\grayF","\\textcolor{##888d93}{#1}"),pa("\\grayG","\\textcolor{##626569}{#1}"),pa("\\grayH","\\textcolor{##3b3e40}{#1}"),pa("\\grayI","\\textcolor{##21242c}{#1}"),pa("\\kaBlue","\\textcolor{##314453}{#1}"),pa("\\kaGreen","\\textcolor{##71B307}{#1}");var ba={"\\relax":!0,"^":!0,_:!0,"\\limits":!0,"\\nolimits":!0},ya=function(){function t(t,e,r){this.settings=void 0,this.expansionCount=void 0,this.lexer=void 0,this.macros=void 0,this.stack=void 0,this.mode=void 0,this.settings=e,this.expansionCount=0,this.feed(t),this.macros=new ma(ua,e.macros),this.mode=r,this.stack=[];}var e=t.prototype;return e.feed=function(t){this.lexer=new ha(t,this.settings);},e.switchMode=function(t){this.mode=t;},e.beginGroup=function(){this.macros.beginGroup();},e.endGroup=function(){this.macros.endGroup();},e.future=function(){return 0===this.stack.length&&this.pushToken(this.lexer.lex()),this.stack[this.stack.length-1]},e.popToken=function(){return this.future(),this.stack.pop()},e.pushToken=function(t){this.stack.push(t);},e.pushTokens=function(t){var e;(e=this.stack).push.apply(e,t);},e.consumeSpaces=function(){for(;;){if(" "!==this.future().text)break;this.stack.pop();}},e.consumeArgs=function(t){for(var e=[],r=0;r<t;++r){this.consumeSpaces();var a=this.popToken();if("{"===a.text){for(var n=[],i=1;0!==i;){var s=this.popToken();if(n.push(s),"{"===s.text)++i;else if("}"===s.text)--i;else if("EOF"===s.text)throw new o("End of input in macro argument",a)}n.pop(),n.reverse(),e[r]=n;}else{if("EOF"===a.text)throw new o("End of input expecting macro argument");e[r]=[a];}}return e},e.expandOnce=function(t){var e=this.popToken(),r=e.text,a=e.noexpand?null:this._getExpansion(r);if(null==a||t&&a.unexpandable){if(t&&null==a&&"\\"===r[0]&&!this.isDefined(r))throw new o("Undefined control sequence: "+r);return this.pushToken(e),e}if(this.expansionCount++,this.expansionCount>this.settings.maxExpand)throw new o("Too many expansions: infinite loop or need to increase maxExpand setting");var n=a.tokens;if(a.numArgs)for(var i=this.consumeArgs(a.numArgs),s=(n=n.slice()).length-1;s>=0;--s){var l=n[s];if("#"===l.text){if(0===s)throw new o("Incomplete placeholder at end of macro body",l);if("#"===(l=n[--s]).text)n.splice(s+1,1);else{if(!/^[1-9]$/.test(l.text))throw new o("Not a valid argument number",l);var h;(h=n).splice.apply(h,[s,2].concat(i[+l.text-1]));}}}return this.pushTokens(n),n},e.expandAfterFuture=function(){return this.expandOnce(),this.future()},e.expandNextToken=function(){for(;;){var t=this.expandOnce();if(t instanceof n){if("\\relax"!==t.text&&!t.treatAsRelax)return this.stack.pop();this.stack.pop();}}throw new Error},e.expandMacro=function(t){return this.macros.has(t)?this.expandTokens([new n(t)]):void 0},e.expandTokens=function(t){var e=[],r=this.stack.length;for(this.pushTokens(t);this.stack.length>r;){var a=this.expandOnce(!0);a instanceof n&&(a.treatAsRelax&&(a.noexpand=!1,a.treatAsRelax=!1),e.push(this.stack.pop()));}return e},e.expandMacroAsText=function(t){var e=this.expandMacro(t);return e?e.map(function(t){return t.text}).join(""):e},e._getExpansion=function(t){var e=this.macros.get(t);if(null==e)return e;var r="function"==typeof e?e(this):e;if("string"==typeof r){var a=0;if(-1!==r.indexOf("#"))for(var n=r.replace(/##/g,"");-1!==n.indexOf("#"+(a+1));)++a;for(var i=new ha(r,this.settings),o=[],s=i.lex();"EOF"!==s.text;)o.push(s),s=i.lex();return o.reverse(),{tokens:o,numArgs:a}}return r},e.isDefined=function(t){return this.macros.has(t)||ia.hasOwnProperty(t)||j.math.hasOwnProperty(t)||j.text.hasOwnProperty(t)||ba.hasOwnProperty(t)},e.isExpandable=function(t){var e=this.macros.get(t);return null!=e?"string"==typeof e||"function"==typeof e||!e.unexpandable:ia.hasOwnProperty(t)},t}(),wa={"\u0301":{text:"\\'",math:"\\acute"},"\u0300":{text:"\\`",math:"\\grave"},"\u0308":{text:'\\"',math:"\\ddot"},"\u0303":{text:"\\~",math:"\\tilde"},"\u0304":{text:"\\=",math:"\\bar"},"\u0306":{text:"\\u",math:"\\breve"},"\u030c":{text:"\\v",math:"\\check"},"\u0302":{text:"\\^",math:"\\hat"},"\u0307":{text:"\\.",math:"\\dot"},"\u030a":{text:"\\r",math:"\\mathring"},"\u030b":{text:"\\H"}},ka={"\xe1":"a\u0301","\xe0":"a\u0300","\xe4":"a\u0308","\u01df":"a\u0308\u0304","\xe3":"a\u0303","\u0101":"a\u0304","\u0103":"a\u0306","\u1eaf":"a\u0306\u0301","\u1eb1":"a\u0306\u0300","\u1eb5":"a\u0306\u0303","\u01ce":"a\u030c","\xe2":"a\u0302","\u1ea5":"a\u0302\u0301","\u1ea7":"a\u0302\u0300","\u1eab":"a\u0302\u0303","\u0227":"a\u0307","\u01e1":"a\u0307\u0304","\xe5":"a\u030a","\u01fb":"a\u030a\u0301","\u1e03":"b\u0307","\u0107":"c\u0301","\u010d":"c\u030c","\u0109":"c\u0302","\u010b":"c\u0307","\u010f":"d\u030c","\u1e0b":"d\u0307","\xe9":"e\u0301","\xe8":"e\u0300","\xeb":"e\u0308","\u1ebd":"e\u0303","\u0113":"e\u0304","\u1e17":"e\u0304\u0301","\u1e15":"e\u0304\u0300","\u0115":"e\u0306","\u011b":"e\u030c","\xea":"e\u0302","\u1ebf":"e\u0302\u0301","\u1ec1":"e\u0302\u0300","\u1ec5":"e\u0302\u0303","\u0117":"e\u0307","\u1e1f":"f\u0307","\u01f5":"g\u0301","\u1e21":"g\u0304","\u011f":"g\u0306","\u01e7":"g\u030c","\u011d":"g\u0302","\u0121":"g\u0307","\u1e27":"h\u0308","\u021f":"h\u030c","\u0125":"h\u0302","\u1e23":"h\u0307","\xed":"i\u0301","\xec":"i\u0300","\xef":"i\u0308","\u1e2f":"i\u0308\u0301","\u0129":"i\u0303","\u012b":"i\u0304","\u012d":"i\u0306","\u01d0":"i\u030c","\xee":"i\u0302","\u01f0":"j\u030c","\u0135":"j\u0302","\u1e31":"k\u0301","\u01e9":"k\u030c","\u013a":"l\u0301","\u013e":"l\u030c","\u1e3f":"m\u0301","\u1e41":"m\u0307","\u0144":"n\u0301","\u01f9":"n\u0300","\xf1":"n\u0303","\u0148":"n\u030c","\u1e45":"n\u0307","\xf3":"o\u0301","\xf2":"o\u0300","\xf6":"o\u0308","\u022b":"o\u0308\u0304","\xf5":"o\u0303","\u1e4d":"o\u0303\u0301","\u1e4f":"o\u0303\u0308","\u022d":"o\u0303\u0304","\u014d":"o\u0304","\u1e53":"o\u0304\u0301","\u1e51":"o\u0304\u0300","\u014f":"o\u0306","\u01d2":"o\u030c","\xf4":"o\u0302","\u1ed1":"o\u0302\u0301","\u1ed3":"o\u0302\u0300","\u1ed7":"o\u0302\u0303","\u022f":"o\u0307","\u0231":"o\u0307\u0304","\u0151":"o\u030b","\u1e55":"p\u0301","\u1e57":"p\u0307","\u0155":"r\u0301","\u0159":"r\u030c","\u1e59":"r\u0307","\u015b":"s\u0301","\u1e65":"s\u0301\u0307","\u0161":"s\u030c","\u1e67":"s\u030c\u0307","\u015d":"s\u0302","\u1e61":"s\u0307","\u1e97":"t\u0308","\u0165":"t\u030c","\u1e6b":"t\u0307","\xfa":"u\u0301","\xf9":"u\u0300","\xfc":"u\u0308","\u01d8":"u\u0308\u0301","\u01dc":"u\u0308\u0300","\u01d6":"u\u0308\u0304","\u01da":"u\u0308\u030c","\u0169":"u\u0303","\u1e79":"u\u0303\u0301","\u016b":"u\u0304","\u1e7b":"u\u0304\u0308","\u016d":"u\u0306","\u01d4":"u\u030c","\xfb":"u\u0302","\u016f":"u\u030a","\u0171":"u\u030b","\u1e7d":"v\u0303","\u1e83":"w\u0301","\u1e81":"w\u0300","\u1e85":"w\u0308","\u0175":"w\u0302","\u1e87":"w\u0307","\u1e98":"w\u030a","\u1e8d":"x\u0308","\u1e8b":"x\u0307","\xfd":"y\u0301","\u1ef3":"y\u0300","\xff":"y\u0308","\u1ef9":"y\u0303","\u0233":"y\u0304","\u0177":"y\u0302","\u1e8f":"y\u0307","\u1e99":"y\u030a","\u017a":"z\u0301","\u017e":"z\u030c","\u1e91":"z\u0302","\u017c":"z\u0307","\xc1":"A\u0301","\xc0":"A\u0300","\xc4":"A\u0308","\u01de":"A\u0308\u0304","\xc3":"A\u0303","\u0100":"A\u0304","\u0102":"A\u0306","\u1eae":"A\u0306\u0301","\u1eb0":"A\u0306\u0300","\u1eb4":"A\u0306\u0303","\u01cd":"A\u030c","\xc2":"A\u0302","\u1ea4":"A\u0302\u0301","\u1ea6":"A\u0302\u0300","\u1eaa":"A\u0302\u0303","\u0226":"A\u0307","\u01e0":"A\u0307\u0304","\xc5":"A\u030a","\u01fa":"A\u030a\u0301","\u1e02":"B\u0307","\u0106":"C\u0301","\u010c":"C\u030c","\u0108":"C\u0302","\u010a":"C\u0307","\u010e":"D\u030c","\u1e0a":"D\u0307","\xc9":"E\u0301","\xc8":"E\u0300","\xcb":"E\u0308","\u1ebc":"E\u0303","\u0112":"E\u0304","\u1e16":"E\u0304\u0301","\u1e14":"E\u0304\u0300","\u0114":"E\u0306","\u011a":"E\u030c","\xca":"E\u0302","\u1ebe":"E\u0302\u0301","\u1ec0":"E\u0302\u0300","\u1ec4":"E\u0302\u0303","\u0116":"E\u0307","\u1e1e":"F\u0307","\u01f4":"G\u0301","\u1e20":"G\u0304","\u011e":"G\u0306","\u01e6":"G\u030c","\u011c":"G\u0302","\u0120":"G\u0307","\u1e26":"H\u0308","\u021e":"H\u030c","\u0124":"H\u0302","\u1e22":"H\u0307","\xcd":"I\u0301","\xcc":"I\u0300","\xcf":"I\u0308","\u1e2e":"I\u0308\u0301","\u0128":"I\u0303","\u012a":"I\u0304","\u012c":"I\u0306","\u01cf":"I\u030c","\xce":"I\u0302","\u0130":"I\u0307","\u0134":"J\u0302","\u1e30":"K\u0301","\u01e8":"K\u030c","\u0139":"L\u0301","\u013d":"L\u030c","\u1e3e":"M\u0301","\u1e40":"M\u0307","\u0143":"N\u0301","\u01f8":"N\u0300","\xd1":"N\u0303","\u0147":"N\u030c","\u1e44":"N\u0307","\xd3":"O\u0301","\xd2":"O\u0300","\xd6":"O\u0308","\u022a":"O\u0308\u0304","\xd5":"O\u0303","\u1e4c":"O\u0303\u0301","\u1e4e":"O\u0303\u0308","\u022c":"O\u0303\u0304","\u014c":"O\u0304","\u1e52":"O\u0304\u0301","\u1e50":"O\u0304\u0300","\u014e":"O\u0306","\u01d1":"O\u030c","\xd4":"O\u0302","\u1ed0":"O\u0302\u0301","\u1ed2":"O\u0302\u0300","\u1ed6":"O\u0302\u0303","\u022e":"O\u0307","\u0230":"O\u0307\u0304","\u0150":"O\u030b","\u1e54":"P\u0301","\u1e56":"P\u0307","\u0154":"R\u0301","\u0158":"R\u030c","\u1e58":"R\u0307","\u015a":"S\u0301","\u1e64":"S\u0301\u0307","\u0160":"S\u030c","\u1e66":"S\u030c\u0307","\u015c":"S\u0302","\u1e60":"S\u0307","\u0164":"T\u030c","\u1e6a":"T\u0307","\xda":"U\u0301","\xd9":"U\u0300","\xdc":"U\u0308","\u01d7":"U\u0308\u0301","\u01db":"U\u0308\u0300","\u01d5":"U\u0308\u0304","\u01d9":"U\u0308\u030c","\u0168":"U\u0303","\u1e78":"U\u0303\u0301","\u016a":"U\u0304","\u1e7a":"U\u0304\u0308","\u016c":"U\u0306","\u01d3":"U\u030c","\xdb":"U\u0302","\u016e":"U\u030a","\u0170":"U\u030b","\u1e7c":"V\u0303","\u1e82":"W\u0301","\u1e80":"W\u0300","\u1e84":"W\u0308","\u0174":"W\u0302","\u1e86":"W\u0307","\u1e8c":"X\u0308","\u1e8a":"X\u0307","\xdd":"Y\u0301","\u1ef2":"Y\u0300","\u0178":"Y\u0308","\u1ef8":"Y\u0303","\u0232":"Y\u0304","\u0176":"Y\u0302","\u1e8e":"Y\u0307","\u0179":"Z\u0301","\u017d":"Z\u030c","\u1e90":"Z\u0302","\u017b":"Z\u0307","\u03ac":"\u03b1\u0301","\u1f70":"\u03b1\u0300","\u1fb1":"\u03b1\u0304","\u1fb0":"\u03b1\u0306","\u03ad":"\u03b5\u0301","\u1f72":"\u03b5\u0300","\u03ae":"\u03b7\u0301","\u1f74":"\u03b7\u0300","\u03af":"\u03b9\u0301","\u1f76":"\u03b9\u0300","\u03ca":"\u03b9\u0308","\u0390":"\u03b9\u0308\u0301","\u1fd2":"\u03b9\u0308\u0300","\u1fd1":"\u03b9\u0304","\u1fd0":"\u03b9\u0306","\u03cc":"\u03bf\u0301","\u1f78":"\u03bf\u0300","\u03cd":"\u03c5\u0301","\u1f7a":"\u03c5\u0300","\u03cb":"\u03c5\u0308","\u03b0":"\u03c5\u0308\u0301","\u1fe2":"\u03c5\u0308\u0300","\u1fe1":"\u03c5\u0304","\u1fe0":"\u03c5\u0306","\u03ce":"\u03c9\u0301","\u1f7c":"\u03c9\u0300","\u038e":"\u03a5\u0301","\u1fea":"\u03a5\u0300","\u03ab":"\u03a5\u0308","\u1fe9":"\u03a5\u0304","\u1fe8":"\u03a5\u0306","\u038f":"\u03a9\u0301","\u1ffa":"\u03a9\u0300"},Sa=function(){function t(t,e){this.mode=void 0,this.gullet=void 0,this.settings=void 0,this.leftrightDepth=void 0,this.nextToken=void 0,this.mode="math",this.gullet=new ya(t,e,this.mode),this.settings=e,this.leftrightDepth=0;}var e=t.prototype;return e.expect=function(t,e){if(void 0===e&&(e=!0),this.fetch().text!==t)throw new o("Expected '"+t+"', got '"+this.fetch().text+"'",this.fetch());e&&this.consume();},e.consume=function(){this.nextToken=null;},e.fetch=function(){return null==this.nextToken&&(this.nextToken=this.gullet.expandNextToken()),this.nextToken},e.switchMode=function(t){this.mode=t,this.gullet.switchMode(t);},e.parse=function(){this.settings.globalGroup||this.gullet.beginGroup(),this.settings.colorIsTextColor&&this.gullet.macros.set("\\color","\\textcolor");var t=this.parseExpression(!1);return this.expect("EOF"),this.settings.globalGroup||this.gullet.endGroup(),t},e.parseExpression=function(e,r){for(var a=[];;){"math"===this.mode&&this.consumeSpaces();var n=this.fetch();if(-1!==t.endOfExpression.indexOf(n.text))break;if(r&&n.text===r)break;if(e&&ia[n.text]&&ia[n.text].infix)break;var i=this.parseAtom(r);if(!i)break;"internal"!==i.type&&a.push(i);}return "text"===this.mode&&this.formLigatures(a),this.handleInfixNodes(a)},e.handleInfixNodes=function(t){for(var e,r=-1,a=0;a<t.length;a++)if("infix"===t[a].type){if(-1!==r)throw new o("only one infix operator per group",t[a].token);r=a,e=t[a].replaceWith;}if(-1!==r&&e){var n,i,s=t.slice(0,r),l=t.slice(r+1);return n=1===s.length&&"ordgroup"===s[0].type?s[0]:{type:"ordgroup",mode:this.mode,body:s},i=1===l.length&&"ordgroup"===l[0].type?l[0]:{type:"ordgroup",mode:this.mode,body:l},["\\\\abovefrac"===e?this.callFunction(e,[n,t[r],i],[]):this.callFunction(e,[n,i],[])]}return t},e.handleSupSubscript=function(e){var r=this.fetch(),a=r.text;this.consume();var n=this.parseGroup(e,!1,t.SUPSUB_GREEDINESS,void 0,void 0,!0);if(!n)throw new o("Expected group after '"+a+"'",r);return n},e.formatUnsupportedCmd=function(t){for(var e=[],r=0;r<t.length;r++)e.push({type:"textord",mode:"text",text:t[r]});var a={type:"text",mode:this.mode,body:e};return {type:"color",mode:this.mode,color:this.settings.errorColor,body:[a]}},e.parseAtom=function(t){var e,r,a=this.parseGroup("atom",!1,null,t);if("text"===this.mode)return a;for(;;){this.consumeSpaces();var n=this.fetch();if("\\limits"===n.text||"\\nolimits"===n.text){if(a&&"op"===a.type){var i="\\limits"===n.text;a.limits=i,a.alwaysHandleSupSub=!0;}else{if(!a||"operatorname"!==a.type||!a.alwaysHandleSupSub)throw new o("Limit controls must follow a math operator",n);var s="\\limits"===n.text;a.limits=s;}this.consume();}else if("^"===n.text){if(e)throw new o("Double superscript",n);e=this.handleSupSubscript("superscript");}else if("_"===n.text){if(r)throw new o("Double subscript",n);r=this.handleSupSubscript("subscript");}else{if("'"!==n.text)break;if(e)throw new o("Double superscript",n);var l={type:"textord",mode:this.mode,text:"\\prime"},h=[l];for(this.consume();"'"===this.fetch().text;)h.push(l),this.consume();"^"===this.fetch().text&&h.push(this.handleSupSubscript("superscript")),e={type:"ordgroup",mode:this.mode,body:h};}}return e||r?{type:"supsub",mode:this.mode,base:a,sup:e,sub:r}:a},e.parseFunction=function(t,e,r){var a=this.fetch(),n=a.text,i=ia[n];if(!i)return null;if(this.consume(),null!=r&&i.greediness<=r)throw new o("Got function '"+n+"' with no arguments"+(e?" as "+e:""),a);if("text"===this.mode&&!i.allowedInText)throw new o("Can't use function '"+n+"' in text mode",a);if("math"===this.mode&&!1===i.allowedInMath)throw new o("Can't use function '"+n+"' in math mode",a);var s=this.parseArguments(n,i),l=s.args,h=s.optArgs;return this.callFunction(n,l,h,a,t)},e.callFunction=function(t,e,r,a,n){var i={funcName:t,parser:this,token:a,breakOnTokenText:n},s=ia[t];if(s&&s.handler)return s.handler(i,e,r);throw new o("No function handler for "+t)},e.parseArguments=function(t,e){var r=e.numArgs+e.numOptionalArgs;if(0===r)return {args:[],optArgs:[]};for(var a=e.greediness,n=[],i=[],s=0;s<r;s++){var l=e.argTypes&&e.argTypes[s],h=s<e.numOptionalArgs,m=s>0&&!h||0===s&&!h&&"math"===this.mode,c=this.parseGroupOfType("argument to '"+t+"'",l,h,a,m);if(!c){if(h){i.push(null);continue}throw new o("Expected group after '"+t+"'",this.fetch())}(h?i:n).push(c);}return {args:n,optArgs:i}},e.parseGroupOfType=function(t,e,r,a,n){switch(e){case"color":return n&&this.consumeSpaces(),this.parseColorGroup(r);case"size":return n&&this.consumeSpaces(),this.parseSizeGroup(r);case"url":return this.parseUrlGroup(r,n);case"math":case"text":return this.parseGroup(t,r,a,void 0,e,n);case"hbox":var i=this.parseGroup(t,r,a,void 0,"text",n);return i?{type:"styling",mode:i.mode,body:[i],style:"text"}:i;case"raw":if(n&&this.consumeSpaces(),r&&"{"===this.fetch().text)return null;var s=this.parseStringGroup("raw",r,!0);if(s)return {type:"raw",mode:"text",string:s.text};throw new o("Expected raw group",this.fetch());case"original":case null:case void 0:return this.parseGroup(t,r,a,void 0,void 0,n);default:throw new o("Unknown group type as "+t,this.fetch())}},e.consumeSpaces=function(){for(;" "===this.fetch().text;)this.consume();},e.parseStringGroup=function(t,e,r){var a=e?"[":"{",n=e?"]":"}",i=this.fetch();if(i.text!==a){if(e)return null;if(r&&"EOF"!==i.text&&/[^{}[\]]/.test(i.text))return this.consume(),i}var s=this.mode;this.mode="text",this.expect(a);for(var l,h="",m=this.fetch(),c=0,u=m;(l=this.fetch()).text!==n||r&&c>0;){switch(l.text){case"EOF":throw new o("Unexpected end of input in "+t,m.range(u,h));case a:c++;break;case n:c--;}h+=(u=l).text,this.consume();}return this.expect(n),this.mode=s,m.range(u,h)},e.parseRegexGroup=function(t,e){var r=this.mode;this.mode="text";for(var a,n=this.fetch(),i=n,s="";"EOF"!==(a=this.fetch()).text&&t.test(s+a.text);)s+=(i=a).text,this.consume();if(""===s)throw new o("Invalid "+e+": '"+n.text+"'",n);return this.mode=r,n.range(i,s)},e.parseColorGroup=function(t){var e=this.parseStringGroup("color",t);if(!e)return null;var r=/^(#[a-f0-9]{3}|#?[a-f0-9]{6}|[a-z]+)$/i.exec(e.text);if(!r)throw new o("Invalid color: '"+e.text+"'",e);var a=r[0];return /^[0-9a-f]{6}$/i.test(a)&&(a="#"+a),{type:"color-token",mode:this.mode,color:a}},e.parseSizeGroup=function(t){var e,r=!1;if(!(e=t||"{"===this.fetch().text?this.parseStringGroup("size",t):this.parseRegexGroup(/^[-+]? *(?:$|\d+|\d+\.\d*|\.\d*) *[a-z]{0,2} *$/,"size")))return null;t||0!==e.text.length||(e.text="0pt",r=!0);var a=/([-+]?) *(\d+(?:\.\d*)?|\.\d+) *([a-z]{2})/.exec(e.text);if(!a)throw new o("Invalid size: '"+e.text+"'",e);var n={number:+(a[1]+a[2]),unit:a[3]};if(!At(n))throw new o("Invalid unit: '"+n.unit+"'",e);return {type:"size",mode:this.mode,value:n,isBlank:r}},e.parseUrlGroup=function(t,e){this.gullet.lexer.setCatcode("%",13);var r=this.parseStringGroup("url",t,!0);if(this.gullet.lexer.setCatcode("%",14),!r)return null;var a=r.text.replace(/\\([#$%&~_^{}])/g,"$1");return {type:"url",mode:this.mode,url:a}},e.parseGroup=function(e,r,n,i,s,l){var h=this.mode;s&&this.switchMode(s),l&&this.consumeSpaces();var m,c=this.fetch(),u=c.text;if(r?"["===u:"{"===u||"\\begingroup"===u){this.consume();var p=t.endOfGroup[u];this.gullet.beginGroup();var d=this.parseExpression(!1,p),f=this.fetch();this.expect(p),this.gullet.endGroup(),m={type:"ordgroup",mode:this.mode,loc:a.range(c,f),body:d,semisimple:"\\begingroup"===u||void 0};}else if(r)m=null;else if(null==(m=this.parseFunction(i,e,n)||this.parseSymbol())&&"\\"===u[0]&&!ba.hasOwnProperty(u)){if(this.settings.throwOnError)throw new o("Undefined control sequence: "+u,c);m=this.formatUnsupportedCmd(u),this.consume();}return s&&this.switchMode(h),m},e.formLigatures=function(t){for(var e=t.length-1,r=0;r<e;++r){var n=t[r],i=n.text;"-"===i&&"-"===t[r+1].text&&(r+1<e&&"-"===t[r+2].text?(t.splice(r,3,{type:"textord",mode:"text",loc:a.range(n,t[r+2]),text:"---"}),e-=2):(t.splice(r,2,{type:"textord",mode:"text",loc:a.range(n,t[r+1]),text:"--"}),e-=1)),"'"!==i&&"`"!==i||t[r+1].text!==i||(t.splice(r,2,{type:"textord",mode:"text",loc:a.range(n,t[r+1]),text:i+i}),e-=1);}},e.parseSymbol=function(){var t=this.fetch(),e=t.text;if(/^\\verb[^a-zA-Z]/.test(e)){this.consume();var r=e.slice(5),n="*"===r.charAt(0);if(n&&(r=r.slice(1)),r.length<2||r.charAt(0)!==r.slice(-1))throw new o("\\verb assertion failed --\n                    please report what input caused this bug");return {type:"verb",mode:"text",body:r=r.slice(1,-1),star:n}}ka.hasOwnProperty(e[0])&&!j[this.mode][e[0]]&&(this.settings.strict&&"math"===this.mode&&this.settings.reportNonstrict("unicodeTextInMathMode",'Accented Unicode text character "'+e[0]+'" used in math mode',t),e=ka[e[0]]+e.substr(1));var i,s=sa.exec(e);if(s&&("i"===(e=e.substring(0,s.index))?e="\u0131":"j"===e&&(e="\u0237")),j[this.mode][e]){this.settings.strict&&"math"===this.mode&&"\xc7\xd0\xde\xe7\xfe".indexOf(e)>=0&&this.settings.reportNonstrict("unicodeTextInMathMode",'Latin-1/Unicode text character "'+e[0]+'" used in math mode',t);var l,h=j[this.mode][e].group,m=a.range(t);if(W.hasOwnProperty(h)){var c=h;l={type:"atom",mode:this.mode,family:c,loc:m,text:e};}else l={type:h,mode:this.mode,loc:m,text:e};i=l;}else{if(!(e.charCodeAt(0)>=128))return null;this.settings.strict&&(M(e.charCodeAt(0))?"math"===this.mode&&this.settings.reportNonstrict("unicodeTextInMathMode",'Unicode text character "'+e[0]+'" used in math mode',t):this.settings.reportNonstrict("unknownSymbol",'Unrecognized Unicode character "'+e[0]+'" ('+e.charCodeAt(0)+")",t)),i={type:"textord",mode:"text",loc:a.range(t),text:e};}if(this.consume(),s)for(var u=0;u<s[0].length;u++){var p=s[0][u];if(!wa[p])throw new o("Unknown accent ' "+p+"'",t);var d=wa[p][this.mode];if(!d)throw new o("Accent "+p+" unsupported in "+this.mode+" mode",t);i={type:"accent",mode:this.mode,loc:a.range(t),label:d,isStretchy:!1,isShifty:!0,base:i};}return i},t}();Sa.endOfExpression=["}","\\endgroup","\\end","\\right","&"],Sa.endOfGroup={"[":"]","{":"}","\\begingroup":"\\endgroup"},Sa.SUPSUB_GREEDINESS=1;var Ma=function(t,e){if(!("string"==typeof t||t instanceof String))throw new TypeError("KaTeX can only parse string typed expression");var r=new Sa(t,e);delete r.gullet.macros.current["\\df@tag"];var a=r.parse();if(r.gullet.macros.get("\\df@tag")){if(!e.displayMode)throw new o("\\tag works only in display equations");r.gullet.feed("\\df@tag"),a=[{type:"tag",mode:"text",body:a,tag:r.parse()}];}return a},za=function(t,e,r){e.textContent="";var a=Ta(t,r).toNode();e.appendChild(a);};"undefined"!=typeof document&&"CSS1Compat"!==document.compatMode&&("undefined"!=typeof console&&console.warn("Warning: KaTeX doesn't work in quirks mode. Make sure your website has a suitable doctype."),za=function(){throw new o("KaTeX doesn't work in quirks mode.")});var Aa=function(t,e,r){if(r.throwOnError||!(t instanceof o))throw t;var a=Dt.makeSpan(["katex-error"],[new E(e)]);return a.setAttribute("title",t.toString()),a.setAttribute("style","color:"+r.errorColor),a},Ta=function(t,e){var r=new u(e);try{var a=Ma(t,r);return ke(a,t,r)}catch(e){return Aa(e,t,r)}},Ba={version:"0.12.0",render:za,renderToString:function(t,e){return Ta(t,e).toMarkup()},ParseError:o,__parse:function(t,e){var r=new u(e);return Ma(t,r)},__renderToDomTree:Ta,__renderToHTMLTree:function(t,e){var r=new u(e);try{return function(t,e,r){var a=le(t,ye(r)),n=Dt.makeSpan(["katex"],[a]);return we(n,r)}(Ma(t,r),0,r)}catch(e){return Aa(e,t,r)}},__setFontMetrics:function(t,e){F[t]=e;},__defineSymbol:$,__defineMacro:pa,__domTree:{Span:N,Anchor:I,SymbolNode:E,SvgNode:L,PathNode:P,LineNode:D}};e.default=Ba;}]).default});

  const katex$1 = exports$1.katex;

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
  exports.BasicLabelStyle = BasicLabelStyle;
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
  exports.Label2DStyle = Label2DStyle;
  exports.LabeledPoint = LabeledPoint;
  exports.LatexMethods = LatexMethods;
  exports.NormalDefinition = NormalDefinition;
  exports.OperatorNode = OperatorNode;
  exports.OperatorSynonyms = OperatorSynonyms;
  exports.Operators = Operators;
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
  exports.Typecasts = Typecasts;
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
  exports.besselJ = besselJ;
  exports.besselY = besselY;
  exports.boundingBoxTransform = boundingBoxTransform;
  exports.calculatePolylineVertices = calculatePolylineVertices;
  exports.castableInto = castableInto;
  exports.castableIntoMultiple = castableIntoMultiple;
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
  exports.getCastingFunction = getCastingFunction;
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
  exports.katex = katex$1;
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
  exports.retrieveEvaluationFunction = retrieveEvaluationFunction;
  exports.sample_1d = sample_1d;
  exports.sample_parametric_1d = sample_parametric_1d;
  exports.sphericalBesselJ = sphericalBesselJ;
  exports.sphericalBesselY = sphericalBesselY;
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
