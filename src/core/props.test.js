import { Props } from './new_props'

describe("Props class", () => {
  describe("property store operations", () => {
    const props = new Props()

    const store1 = props.createPropertyStore("name1")
    const store2 = props.createPropertyStore("name2")

    test("Creating two property stores", () => {
      expect(props.listProperties()).toEqual(["name1", "name2"])
    })

    test("Creating an already existing property store returns the original store", () => {
      expect(props.createPropertyStore("name2")).toBe(store2)
    })

    props.deletePropertyStore("name1")

    test("Delete one property store", () => {
      expect(props.listProperties()).toEqual(["name2"])
    })
  })

  describe("basic property set/get operations", () => {
    const props = new Props()

    props.setPropertyValue("name1", 1)
    props.setPropertyValue("name2", 2)

    test("Property stores are created", () => {
      expect(props.listProperties()).toEqual(["name1", "name2"])
    })

    test("Property accesses are correct", () => {
      expect(props.getPropertyValue("name1")).toEqual(1)
      expect(props.getPropertyValue("name2")).toEqual(2)
    })
  })
})
