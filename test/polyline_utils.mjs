import { toContours, fromContours } from '../src/algorithm/polyline_utils.js'

describe("toContours", () => {
  it("correctly produces no contours", () => {
    expect(toContours([])).to.equal([])
    expect(toContours([NaN, NaN])).to.equal([])
  })
})
