import {Beast} from './beast'

class BeastPool {
  constructor() {
    this.beasts = []
    this._index = 0

    this.setThreadCount(4)
  }

  get threadCount() {
    return this.beasts.length
  }

  setThreadCount(t) {
    let current = this.threadCount

    if (current === t)
      return

    if (current > t) {
      this.beasts.slice(t).forEach(beast => beast.terminate())

      this.beasts.length = t
    } else {
      for (let i = 0; i < t - current; ++i) {
        this.beasts.push(new Beast())
      }
    }
  }

  getBeast() {
    if (this.threadCount <= 0)
      throw new Error("No beasts to use!")

    if (this._index >= this.threadCount) {
      this._index = 0
    }

    return this.beasts[this._index++]
  }

  destroy() {
    this.beasts.forEach(beast => beast.terminate())
  }
}

const BEAST_POOL = new BeastPool()

export {BEAST_POOL}
