import { Element } from '../core/element.js'
import { constructInterface, relaxedPrint } from '../core/interface.js'
import { DefaultStyles } from '../styles/definitions.js'
import { parseString } from '../ast/old/parse_string.js'
import { ASTNode } from '../ast/old/node.js'
import { compileNode } from '../ast/old/compile.js'
import { parametricPlot2D } from '../algorithm/graphing.js'
import { benchmark } from '../core/utils.js'
import { simplifyPolyline } from '../algorithm/polyline_utils.js'
import { BoundingBox } from '../math/bounding_box.js'

const parametricPlotInterface = constructInterface({
  interface: {
    pen: { setAs: 'user', description: 'The pen used to draw the plot' },

    varName: {
      description: 'The name of the varying variable',
      typecheck: 'VariableName'
    },

    range: {
      description: 'Range of the varying variable to plot',
      aliases: ['t']
    },

    function: {
      setAs: 'user',
      description: 'The function R -> R^2 of the plot',
      aliases: ['f']
    },

    samples: {
      description: 'The number of samples to plot',
      typecheck: { type: 'integer', min: 10, max: 1e6 }
    }
  },
  internal: {
    // Pen used to draw the parametric plot
    pen: {
      type: 'Pen',
      computed: 'user',
      default: DefaultStyles.Pen,
      compose: true
    },

    varName: { type: 'string', computed: 'default', default: 't' },

    function: { type: 'ASTNode', computed: 'none' },

    samples: { type: 'number', computed: 'default', default: 100 }
  }
})

export class ParametricPlot2D extends Element {
  _update () {
    this.defaultInheritProps()
    this.defaultComputeProps()

    this.compileFunction()
    this.computePoints()
  }

  compileFunction () {
    const { props } = this

    if (props.hasChanged('function')) {
      let user = props.getUserValue('function')
      if (!user) {
        props.set('function', null)
        return
      }

      let node
      if (typeof user === 'string') {
        node = parseString(user)
      } else if (user instanceof ASTNode) {
        node = user.clone()
      } else {
        throw new Error(`Expected string or ASTNode, got ${relaxedPrint(user)}`)
      }

      let varName = props.get('varName') // default: 't'
      let scope = {}
      scope[varName] = 'real'

      node._resolveTypes(scope, { strict: true })

      props.set('functionNode', node)
      if (node.type !== 'vec2')
        throw new Error(
          `Expected expression with return type of vec2, got expression with return type of ${node.type}`
        )

      let compiled = compileNode(node, { args: [varName] })
      props.set('function', compiled)
      let intervalCompiled = compileNode(node, { args: [varName],  mode: "fast_interval" })
      props.set('fastIntervalFunction', intervalCompiled)
    }
  }

  computePoints () {
    const { samples, function: f, fastIntervalFunction: fIf, range, pen, plotTransform } = this.props.proxy

    if (!samples || !f || !range || !pen || !plotTransform) {
      this.internal.renderInfo = null
      return
    }

    let rangeStart = range[0],
      rangeEnd = range[1]

    let pts = parametricPlot2D(f, rangeStart, rangeEnd, {
      samples,
      adaptive: true,
      adaptiveRes: plotTransform.graphPixelSize() / 20,
      simplifyRes: plotTransform.graphPixelSize() / 4,
      intervalFunc: fIf,
      plotBox: plotTransform.graphBox() //new BoundingBox(-1, -1, 2, 2)
    })

    plotTransform.graphToPixelArrInPlace(pts)

    this.internal.pts = pts
    this.internal.renderInfo = {
      instructions: { type: 'polyline', vertices: pts, pen }
    }
  }

  getInterface () {
    return parametricPlotInterface
  }
}
