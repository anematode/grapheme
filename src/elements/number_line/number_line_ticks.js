import { constructInterface } from '../../core/interface.js'
import { Element } from '../../core/element.js'

const numberLineTicksInterface = constructInterface({
  interface: {
    ticks: { setAs: "user" }
  },
  internal: {
    ticks: { computed: "none" }
  }
})

export class NumberLineTicks extends Element {
  getInterface () {
    return numberLineTicksInterface
  }

  _update () {
    this.defaultInheritProps()
    this.defaultComputeProps()


  }
}
