import {Complex} from "../math/complex/complex.js"

export function initTypecasts (TypecastDefinition, typecastList, typecastDict) {
  let intToReal = new TypecastDefinition({
    from: "int", to: "real",
    evaluators: {
      generic: "identity"  // Identity conversion
    }
  })

  let doubleToComplex = x => new Complex(x, 0)

  let intToComplex = new TypecastDefinition({
    from: "int", to: "complex",
    evaluators: {
      generic: doubleToComplex
    }
  })

  let realToComplex = new TypecastDefinition({
    from: "real", to: "complex",
    evaluators: {
      generic: doubleToComplex
    }
  })

  typecastList.push(intToReal, intToComplex, realToComplex)

  // For simplicity, we convert the list of all typecasts into a dict of from -> to, so that it can be very quickly
  // searched during signature matching.
  for (const typecast of typecastList) {
    let from = typecast.from
    if (typecastDict[from]) {
      typecastDict[from].push(typecast)
    } else {
      typecastDict[from] = [typecast]
    }
  }
}
