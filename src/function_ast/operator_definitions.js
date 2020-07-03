
class OperatorDefinition {
  constructor() {

  }
}

class NormalDefinition extends OperatorDefinition {
  constructor() {
    super()
  }
}

class VariadicDefinition extends OperatorDefinition {
  constructor() {
    super()
  }
}

const Operators = {
  '*': [
    new NormalDefinition({
      signature: ["real", "real"],
      returns: "real",
      
    })
  ]
}

export
