import { deepEquals } from "./utils"

describe('deepEquals', () => {
  test("Primitives", () => {
    expect(deepEquals(100, 100)).toBe(true)
    expect(deepEquals(101, 100)).toBe(false)
    expect(deepEquals("greetings", "cow")).toBe(false)
    expect(deepEquals("greetings", "greetings")).toBe(true)

    expect(deepEquals("0", 0)).toBe(false)
    expect(deepEquals(false, 3)).toBe(false)

    expect(deepEquals(0, 0)).toBe(true)
    expect(deepEquals(NaN, NaN)).toBe(true)
    expect(deepEquals(-0, 0)).toBe(false)
  })

  test("Arrays", () => {
    expect(deepEquals([0, -0], [0, -0])).toBe(true)
    expect(deepEquals([0, 0], [0, -0])).toBe(false)
    expect(deepEquals([NaN, 0], [NaN, 0])).toBe(true)
    expect(deepEquals([2, 5, [4, 5]], [2, 5, [4, 5]])).toBe(true)
    expect(deepEquals([2, 5, [4, 5]], [2, 5, [4, Infinity]])).toBe(false)
  })

  test("Objects", () => {
    expect(deepEquals({}, {})).toBe(true)
    expect(deepEquals({x: {}}, {x: {}})).toBe(true)
    expect(deepEquals({x: {x: {}}}, {x: {x: []}})).toBe(false)
    expect(deepEquals({x: {x: {}}, y: NaN}, {x: {x: {}}, y: NaN})).toBe(true)
    expect(deepEquals({x: 5}, {x: 5, y: 5})).toBe(false)
  })

  test("Typed arrays", () => {
    expect(deepEquals(new Int32Array([ -1, 0, 1 ]), new Int32Array([ -1, 0, 1 ]))).toBe(true)
    expect(deepEquals(new Int32Array([ -1, 0, 1 ]), new Int16Array([ -1, 0, 1 ]))).toBe(false)

    expect(deepEquals(new Float64Array([3, 4, 1]), new Float64Array([2, 0, 2]))).toBe(false)
    expect(deepEquals(new Float64Array([3, 4, 1]), new Float64Array([3, 4, 1]))).toBe(true)
    expect(deepEquals(new Float64Array([NaN, NaN, NaN, NaN]), new Float64Array([NaN, NaN, NaN, NaN]))).toBe(true)
    expect(deepEquals(new Float64Array([NaN, NaN, NaN, -0]), new Float64Array([NaN, NaN, NaN, -0]))).toBe(true)
    expect(deepEquals(new Float64Array([0, NaN, NaN, -0]), new Float64Array([0, NaN, NaN, -0]))).toBe(true)
    expect(deepEquals(new Float64Array([0, -0, NaN, -0]), new Float64Array([0, 0, NaN, -0]))).toBe(false)
    expect(deepEquals(new Float64Array([NaN]), new Float64Array([0]))).toBe(false)
    expect(deepEquals(new Float64Array([NaN]), new Float64Array([1]))).toBe(false)
    expect(deepEquals(new Float64Array([0]), new Float64Array([NaN]))).toBe(false)
    expect(deepEquals(new Float64Array([1]), new Float64Array([NaN]))).toBe(false)
  })

  test("Maps and Sets can screw themselves", () => {
    expect(deepEquals(new Map(), new Map())).toBe(false)
    expect(deepEquals(new Set(), new Set())).toBe(false)
  })
})

describe('deepClone', () => {

})
