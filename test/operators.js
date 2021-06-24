import {FixedOperatorDefinition, OperatorDefinition} from "../src/ast/new_operators.js"
import { expect } from "chai"

describe("OperatorDefinition", () => {
  it("throws on invalid type", () => {
    expect(() => new OperatorDefinition({ returnType: "realt" })).to.throw()
    expect(() => new OperatorDefinition({ returnType: null })).to.throw()
  })
})

describe("FixedOperatorDefinition", () => {
  const mulReal = new FixedOperatorDefinition({ returnType: "real", signature: [ "real", "real" ]})
  const factorial = new FixedOperatorDefinition({ returnType: "real", signature: "real" })
  const mulRealComplex = new FixedOperatorDefinition({ returnType: "complex", signature: [ "real", "complex" ]})

  it("throws on invalid type", () => {
    expect(() => new FixedOperatorDefinition({ returnType: "real", signature: [ "realt", "complex" ]}))
  })

  it("has a correct arg count", () => {
    expect(mulReal.argCount()).to.equal(2)
    expect(factorial.argCount()).to.equal(1)
  })

  it("correctly deduces signature compatibility", () => {
    expect(factorial.signatureWorks(["real"])).to.equal(true)
    expect(factorial.signatureWorks(["complex"])).to.equal(false)
    expect(factorial.signatureWorks(["real", "real"])).to.equal(false)

    expect(mulReal.signatureWorks(["real", "real"])).to.equal(true)
    expect(mulReal.signatureWorks(["real", "int"])).to.equal(true)
    expect(mulReal.signatureWorks(["complex", "int"])).to.equal(false)

    expect(mulRealComplex.signatureWorks(["real", "real"])).to.equal(true)
    expect(mulRealComplex.signatureWorks(["real", "int"])).to.equal(true)
    expect(mulRealComplex.signatureWorks(["complex", "int"])).to.equal(false)
  })
})
