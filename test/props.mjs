import { Props } from "../src/core/props.js"
import { expect } from "chai"

describe("Props", () => {

  it("should initialize properly", () => {
    let props = new Props()

    expect(props.hasChangedProperties).to.equal(0)
    expect(props.hasChangedInheritableProperties).to.equal(0)
  })

  it("should store values", () => {
    let props = new Props()

    props.set("cow", 3)
    props.set("cow", 4, 1)

    expect(props.get("cow")).to.equal(3)
    expect(props.getUserValue("cow")).to.equal(4)
  })
})
