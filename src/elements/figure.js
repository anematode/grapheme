import { constructInterface } from '../core/interface.js'
import { Group } from '../core/group.js'

const groupInterface = Group.prototype.getInterface()
const figureInterface = constructInterface({
  extends: [ groupInterface ],
  interface: {
    interactivity: {
      description: 'Whether interactivity is enabled',
      typecheck: { type: 'boolean' }
    }
  },
  internal: {
    // Scene dims (inherited from above)
    sceneDims: { computed: 'none' },

    // Bounding box of the entire figure
    figureBoundingBox: { computed: 'none' },

    // Box in which things are actually plotted
    plottingBox: { computed: 'none' },

    // Margin between the plotting box and figure bounding box
    margins: {
      computed: 'default',
      default: { left: 30, right: 30, top: 30, bottom: 30 }
    }
  },
  memberFunctions: {
    _update () {
      this.computeBoxes()
      this.computeScissor()
    },

    computeBoxes () {
      const { props } = this

      props.set('figureBoundingBox', props.get('sceneDims').getBoundingBox())

      let margins = props.get('margins')
      props.set(
        'plottingBox',
        props
          .get('figureBoundingBox')
          .squishAsymmetrically(
            margins.left,
            margins.right,
            margins.bottom,
            margins.top
          ),
        0 /* real */,
        2 /* deep equality */
      )
    },

    computeScissor () {
      const { props } = this

      this.internal.renderInfo = {
        contexts: { type: 'scissor', scissor: props.get('plottingBox') }
      }
    }
  }
})

export class Figure extends Group {
  getInterface () {
    return figureInterface
  }
}

figureInterface.extend(Figure)
