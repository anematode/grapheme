export class FastBooleanInterval {
  constructor (min, max, info) {
    this.min = !!min
    this.max = !!max
    this.info = info | 0
  }
}
