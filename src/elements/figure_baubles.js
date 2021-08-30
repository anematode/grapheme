import { Group } from '../core/group.js'
import { constructInterface } from '../core/interface.js'
import { DefaultStyles, Pen, TextStyle } from '../styles/definitions.js'
import { generateRectangleCycle } from '../algorithm/misc_geometry.js'
import { get2DDemarcations } from '../algorithm/tick_allocator.js'
import { Vec2 } from '../math/vec/vec2.js'
import { genTextInstruction, genTextRect } from '../other/text_utils.js'

const DefaultOutlinePen = Pen.create({ endcap: 'square' })
const DefaultGridlinePens = {
  major: DefaultStyles.gridlinesMajor,
  minor: DefaultStyles.gridlinesMinor,
  axis: DefaultStyles.gridlinesAxis
}

const figureBaublesInterface = constructInterface({
  interface: {
    showOutline: {
      typecheck: 'boolean',
      description: 'Whether to show an outline of the figure'
    },
    showGridlines: { setAs: 'user', description: 'Whether to show gridlines' },
    sharpenGridlines: {
      typecheck: 'boolean',
      description:
        'Whether to make the gridlines look sharp by aligning them to pixel boundaries'
    },
    outlinePen: {
      setAs: 'user',
      description: 'The pen used to draw the outline'
    }
  },
  internal: {
    // Whether to show a bounding outline of the figure
    showOutline: { type: 'boolean', computed: 'default', default: true },

    // Pen to use for the bounding outline
    outlinePen: {
      type: 'Pen',
      computed: 'user',
      default: DefaultOutlinePen,
      compose: true
    },

    // Internal variable of the form { major: { x: [ ... ], y: [ ... ] }, minor: ... } expressed in graph coordinates
    ticks: { computed: 'none' },

    // Whether to show the figure's gridlines
    showGridlines: {
      type: 'BooleanDict',
      computed: 'user',
      default: { major: true, minor: true, axis: true },
      compose: true
    },

    // Whether to show axes instead of major gridlines
    generateGridlinesAxis: {
      type: 'boolean',
      computed: 'default',
      default: true
    },

    // Whether to sharpen the gridlines
    sharpenGridlines: { type: 'boolean', computed: 'default', default: true },

    // Dictionary of pens
    gridlinePens: {
      type: 'Pens',
      computed: 'user',
      default: DefaultGridlinePens,
      compose: true
    },

    // Whether to show labels
    showLabels: { type: 'boolean', computed: 'default', default: true },

    // Where to put the labels
    labelPosition: {
      type: 'LabelPosition',
      computed: 'user',
      default: DefaultStyles.plotLabelPositions,
      compose: true
    }
  }
})

// Credit: https://stackoverflow.com/a/20439411
/* Turns a float into a pretty float by removing dumb floating point things */
function beautifyFloat (f, prec = 12) {
  let strf = f.toFixed(prec)
  if (strf.includes('.')) {
    return strf.replace(/\.?0+$/g, '')
  } else {
    return strf
  }
}

function isApproxEqual (v, w, eps = 1e-5) {
  return Math.abs(v - w) < eps
}

const CDOT = String.fromCharCode(183)

const standardLabelFunction = x => {
  if (x === 0) return '0'
  // special case
  else if (Math.abs(x) < 1e5 && Math.abs(x) > 1e-5)
    // non-extreme floats displayed normally
    return beautifyFloat(x)
  else {
    // scientific notation for the very fat and very small!
    let exponent = Math.floor(Math.log10(Math.abs(x)))
    let mantissa = x / 10 ** exponent

    let prefix = isApproxEqual(mantissa, 1)
      ? ''
      : beautifyFloat(mantissa, 8) + CDOT
    let exponent_suffix = '10^' + exponent

    return prefix + exponent_suffix
  }
}

/**
 * Given a plot transform, ticks and set of pens, generate a set of polyline calls that draw gridlines.
 * @param plotTransform {LinearPlot2DTransform}
 * @param ticks
 * @param gridlinePens
 * @param enabledPens {{}|null} Dict (pen name -> boolean) of enabled pens to generate ticks for
 * @param sharpen {boolean} Whether to align the ticks to pixel boundaries to make them look sharper
 * @returns {Array}
 */
function generateGridlinesInstructions (
  plotTransform,
  ticks,
  gridlinePens,
  enabledPens = null,
  sharpen = true
) {
  let pixelBox = plotTransform.pixelBox()
  let instructions = []

  for (let [style, entries] of Object.entries(ticks)) {
    if (enabledPens && !enabledPens[style]) continue

    let pen = gridlinePens[style]
    let thickness = pen.thickness

    // Used to make thin lines appear "sharper"
    let shift = thickness % 2 === 1 ? 0.5 : 0

    if (!pen) continue

    let vertices = []

    for (let tick of entries.x) {
      let x = plotTransform.graphToPixelX(tick)
      if (sharpen) {
        x = (x | 0) + shift
      }

      vertices.push(x, pixelBox.y, x, pixelBox.y2)
      vertices.push(NaN, NaN)
    }

    for (let tick of entries.y) {
      let y = (plotTransform.graphToPixelY(tick) | 0) + shift
      if (sharpen) {
        y = (y | 0) + shift
      }

      vertices.push(pixelBox.x, y, pixelBox.x2, y)
      vertices.push(NaN, NaN)
    }

    instructions.push({
      type: 'polyline',
      vertices: new Float32Array(vertices),
      pen
    })
  }

  return instructions
}

export class FigureBaubles extends Group {
  getInterface () {
    return figureBaublesInterface
  }

  _update () {
    this.defaultInheritProps()
    this.defaultComputeProps()
    this.computeTicks()

    this.computeGridlines()
    this.computeLabels()
    this.toggleOutline()
    this.computeRenderInfo()
  }

  computeTicks () {
    const { props } = this

    if (props.hasChanged('plotTransform')) {
      let tr = props.get('plotTransform'),
        ticks
      if (tr)
        ticks = get2DDemarcations(
          tr.gx1,
          tr.gx1 + tr.gw,
          tr.pw,
          tr.gy1,
          tr.gy1 + tr.gh,
          tr.ph,
          { emitAxis: props.get('generateGridlinesAxis') }
        )

      props.set('ticks', ticks)
    }
  }

  computeLabels () {
    const instructions = []

    if (this.props.haveChanged(['ticks', 'showLabels'])) {
      let { ticks, plotTransform } = this.props.proxy

      if (ticks && plotTransform)
        for (let style of ['major']) {
          let entries = ticks[style]

          let x = entries.x,
            y = entries.y
          for (let i = 0; i < x.length; ++i) {
            let pos = plotTransform
              .graphToPixel(new Vec2(x[i], 0))

            instructions.push({
              type: "latex",
              latex: standardLabelFunction(x[i]),
              pos: pos,
              dir: 'S',
              spacing: 3
            })
          }

          for (let i = 0; i < y.length; ++i) {
            let pos = plotTransform
              .graphToPixel(new Vec2(0, y[i]))

            instructions.push({
              type: "latex",
              latex: standardLabelFunction(y[i]),
              pos: pos,
              dir: 'E',
              spacing: 3
            })
          }
        }

      this.internal.labelInstructions = instructions
    }
  }

  computeGridlines () {
    if (
      this.props.haveChanged(['ticks', 'showGridlines', 'sharpenGridlines'])
    ) {
      let {
        showGridlines,
        ticks,
        gridlinePens,
        plotTransform,
        sharpenGridlines
      } = this.props.proxy

      this.internal.gridlinesInstructions =
        ticks && plotTransform
          ? generateGridlinesInstructions(
              plotTransform,
              ticks,
              gridlinePens,
              showGridlines,
              sharpenGridlines
            )
          : []
    }
  }

  toggleOutline () {
    let { showOutline, plotTransform, outlinePen: pen } = this.props.proxy
    let int = this.internal

    if (showOutline && plotTransform) {
      // We inset the box by the thickness of the line so that it doesn't jut out
      let box = plotTransform.pixelBox().squish(pen.thickness / 2)
      let vertices = generateRectangleCycle(box)

      int.outlineInstruction = { type: 'polyline', vertices, pen }
    } else {
      int.outlineInstruction = null
    }
  }

  computeRenderInfo () {
    let int = this.internal
    int.renderInfo = {
      instructions: [
        int.outlineInstruction,
        ...int.labelInstructions,
        ...int.gridlinesInstructions
      ]
    }
  }
}
