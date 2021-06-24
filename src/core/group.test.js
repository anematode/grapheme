import {Group} from "./group"

describe('Group', () => {
  test("Prevent a group cycle from being formed", () => {
    let g1 = new Group()
    let g2 = new Group()
    let g3 = new Group()
    let gextra = new Group()

    g1.add(g2)
    g3.add(gextra)
    g2.add(g3)

    expect(() => g3.add(g1)).toThrow()
  })
})
