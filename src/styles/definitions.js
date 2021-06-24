
// Principles: Some things in Grapheme have styling information that may be shared or may be composed from other bits of
// information. Tracking the "changed" values of different parts of this information is generally not useful, except in
// the case of colors on elements, but that can be dealt with via caching if REALLY needed. We basically define a shared
// common style system that allows composition of common things. We'll start with a line style.

import * as utils from '../core/utils.js'

// Implementation of basic color functions
// Could use a library, but... good experience for me too



class Color {
  constructor ({ r = 0, g = 0, b = 0, a = 255 } = {}) {
    this.r = r
    this.g = g
    this.b = b
    this.a = a
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
    const rnd = this.rounded()
    return `#${[rnd.r, rnd.g, rnd.b, rnd.a].map((x) => utils.leftZeroPad(x.toString(16), 2)).join('')}`
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
    let color = Color.hsl(h, s, l)
    color.a = 255 * a

    return color
  }

  static fromHex (string) {
    return new Color(hexToRgb(string))
  }

  static fromCss (cssColorString) {
    function throwBadColor () {
      throw new Error("Unrecognized colour " + cssColorString)
    }

    cssColorString = cssColorString.toLowerCase().replace(/\s+/g, '')
    if (cssColorString.startsWith('#')) {
      return Color.fromHex(cssColorString)
    }

    let argsMatch = /\((.+)\)/g.exec(cssColorString)

    if (!argsMatch) {
      let color = Colors[cssColorString.toUpperCase()]

      return color ? color : throwBadColor()
    }

    let args = argsMatch[1].split(',').map(parseFloat)

    if (cssColorString.startsWith("rgb")) {
      return Color.rgb(...args.map(s => s * 255))
    } else if (cssColorString.startsWith("rgba")) {
      return Color.rgba(...args.map(s => s * 255))
    } else if (cssColorString.startsWith("hsl")) {
      return Color.hsl(...args)
    } else if (cssColorString.startsWith("hsla")) {
      return Color.hsla(...args)
    }

    throwBadColor()
  }

  static fromObj (obj) {
    if (typeof obj === "string") {
      return Color.fromCss(obj)
    }

    return new Color(obj)
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
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

// Credit to https://stackoverflow.com/a/9493060/13458117
function hslToRgb (h, s, l) {
  var r, g, b

  if (s === 0) {
    r = g = b = l // achromatic
  } else {
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s
    var p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return { r: 255 * r, g: 255 * g, b: 255 * b }
}

const rgb = Color.rgb

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
    var keys = Object.keys(Colors)
    return Colors[keys[keys.length * Math.random() << 0]]
  },
  get TRANSPARENT () {
    return new Color({r: 0, g: 0, b: 0, a: 0})
  }
}

export { Color, Colors }

export const Pen = {
  // take a list of partial pen specifications and combine them into a complete pen by combining each and keeping only
  // the valid parameters TODO
  compose: (...args) => {
    let ret = {}

    for (let i = 0; i < args.length; ++i) {
      Object.assign(ret, args[i])
    }

    ret.color = Color.fromObj(ret.color)

    return ret
  },
  create: (params) => {
    return Pen.compose(Pen.default, params)
  },
  signature: {
    color: "color",
    thickness: "number"
  },
  default: utils.deepFreeze({
    color: { r: 0, g: 0, b: 0, a: 255},
    thickness: 2,
    dashPattern: [],
    dashOffset: 0,
    endcap: "round",
    endcapRes: 1,
    join: "miter",
    joinRes: 1,
    useNative: false,
    visible: true
  }),
  fromObj (strOrObj) {
    if (typeof strOrObj === "string") return _interpretStringAsPen(strOrObj)

    return Pen.compose(Pen.default, strOrObj)
  }
}

// Generic dictionary of pens, like { major: Pen, minor: Pen }. Partial pen specifications may be used and they will
// turn into fully completed pens in the final product
export const Pens = {
  compose: (...args) => {
    let ret = {}

    // Basically just combine all the pens
    for (let i = 0; i < args.length; ++i) {
      for (let key in args[i]) {
        let retVal = ret[key]

        if (!retVal) ret[key] = retVal = Pen.default
        ret[key] = Pen.compose(ret[key], args[key])
      }
    }
  },
  create: (params) => {
    return Pens.compose(Pens.default, params)
  },
  default: Object.freeze({})
}

/**const textElementInterface = constructInterface({
  font: { setAs: "user" },
  fontSize: { setAs: "user" },
  text: true,
  align: { setAs: "user" },
  baseline: { setAs: "user" },
  color: { setAs: "user" },
  shadowRadius: { setAs: "user" },
  shadowColor: { setAs: "user" },
  position: { conversion: Vec2.fromObj }
}, */

export const TextStyle = {
  compose: (...args) => {
    let ret = {}

    for (let i = 0; i < args.length; ++i) {
      Object.assign(ret, args[i])
    }

    ret.color = Color.fromObj(ret.color)
    ret.shadowColor = Color.fromObj(ret.shadowColor)

    return ret
  },
  create: (params) => {
    return TextStyle.compose(TextStyle.default, params)
  },
  default: utils.deepFreeze({
    color: { r: 0, g: 0, b: 0, a: 255 },
    shadowColor: { r: 255, g: 255, b: 255, a: 255 },
    font: "Cambria",
    fontSize: 12,
    shadowRadius: 0,
    align: "left",
    baseline: "bottom"
  })
}

// Object of the form { x: ("dynamic"|"none"|"axis"|"outside"|"inside"|"bottom"|"top"), y: ( ..., "left"|"right") } (might change later)

export const LabelPosition = {
  compose: (...args) => {
    let ret = {}

    for (let i = 0; i < args.length; ++i) {
      let arg = args[i]

      if (typeof arg === "string") {
        ret.x = arg
        ret.y = arg
      } else {
        Object.assign(ret, args[i])
      }
    }

    return ret
  },
  create: (params) => {
    return LabelPosition.compose(LabelPosition.default, params)
  },
  default: utils.deepFreeze({
    x: "dynamic",
    y: "dynamic"
  })
}

export const GenericObject = {
  compose: (...args) => {
    let ret = {}

    for (let i = 0; i < args.length; ++i) {
      Object.assign(ret, args[i])
    }

    return ret
  },
  create: (params) => {
    return GenericObject.compose(GenericObject.default, params)
  },
  default: Object.freeze({})
}

export const BooleanDict = {
  compose: (...args) => {
    let ret = {}

    for (let i = 0; i < args.length; ++i) {
      let arg = args[i]
      if (typeof arg === "boolean") {
        for (let key in ret) {
          ret[key] = arg
        }
      } else Object.assign(ret, args[i])
    }

    return ret
  },
  create: (params) => {
    return GenericObject.compose(GenericObject.default, params)
  },
  default: Object.freeze({})
}

export function lookupCompositionType (type) {
  switch (type) {
    case "TextStyle":
      return TextStyle
    case "Pen":
      return Pen
    case "Pens":
      return Pens
    case "LabelPosition":
      return LabelPosition
    case "Object":
      return GenericObject
    case "BooleanDict":
      return BooleanDict
  }
}

// Fun Asymptote Vector Graphics–like thing :) We break up str into tokens which each have some meaning TODO
function _interpretStringAsPen (str) {
  try {
    let color = Color.fromCss(str)

    return Pen.fromObj({ color })
  } catch {
    return Pen.default
  }
}

export const DefaultStyles = {
  gridlinesMajor: Pen.create({ thickness: 2, color: Color.rgba(0, 0, 0, 127), endcap: "butt" }),
  gridlinesMinor: Pen.create({ thickness: 1, color: Color.rgba(0, 0, 0, 80), endcap: "butt" }),
  gridlinesAxis: Pen.create({ thickness: 4, endcap: "butt" }),
  plotLabelPositions: LabelPosition.default,
  Pen: Pen.default,
  label: TextStyle.create({ fontSize: 16, shadowRadius: 2 })
}
