
class ComplexInterval {
  constructor(reMin, reMax, imMin, imMax, defMin=true, defMax=true) {
    this.reMin = reMin
    this.reMax = reMax
    this.imMin = imMin
    this.imMax = imMax
    this.defMin = defMin
    this.defMax = defMax
  }
}

export {ComplexInterval}
