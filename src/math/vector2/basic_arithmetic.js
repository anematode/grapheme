import { Vec2 } from '../vec'

export const Add = (v1, v2) => {
  return new Vec2(v1.x + v2.x, v1.y + v2.y)
}

export const Subtract = (v1, v2) => {
  return new Vec2(v1.x - v2.x, v1.y - v2.y)
}

export const Dot = (v1, v2) => {
  return v1.x * v2.x + v1.y * v2.y
}

export const Construct = (x, y) => {
  return new Vec2(x, y)
}

export const FromComplex = (z) => {
  return new Vec2(z.re, z.im)
}
