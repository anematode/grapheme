import { Interval } from './interval_arithmetic'

// Takes in a function of arity 2, as well as (x1, y1, x2, y2) the box to plot in and xDivide yDivide, the number of
// times to divide in each direction
function intervalEqFindBoxes(func, x1, y1, x2, y2, xDivide, yDivide) {
  let rectangles = []

  while (true) {
    if (xDivide === 0 && yDivide === 0) {
      break
    }

    // mode 0 means divide into four, mode 1 means divide along x, mode 2 means divide along y
    let dividingMode = 0

    if (yDivide > xDivide) {
      dividingMode = 2
      ++xDivide
    } else if (yDivide < xDivide) {
      dividingMode = 1
      ++yDivide
    }

    --xDivide
    --yDivide

    let new_rectangles = []

    for (let i = 0; i < rectangles.length; i += 4) {
      let x1 = rectangles[i], y1 = rectangles[i+1], x2 = rectangles[i+2], y2 = rectangles[i+3]
      if (dividingMode === 0) {
        let xm = (x1 + x2) / 2
        let ym = (y1 + y2) / 2

        let xInt1 = new Interval(x1, xm)
        let xInt2 = new Interval(xm, x2)
        let yInt1 = new Interval(y1, ym)
        let yInt2 = new Interval(ym, y2)

        if (func(xInt1, yInt1).contains(0)) {
          new_rectangles.push(x1, xm, y1, ym)
        }

        if (func(xInt1, yInt2).contains(0)) {
          new_rectangles.push(x1, xm, ym, y2)
        }

        if (func(xInt2, yInt2).contains(0)) {
          new_rectangles.push(xm, x2, ym, y2)
        }

        if (func(xInt2, yInt1).contains(0)) {
          new_rectangles.push(xm, x2, y1, ym)
        }
      } else if (dividingMode === 1) {
        let xm = (x1 + x2) / 2

        let xInt1 = new Interval(x1, xm)
        let xInt2 = new Interval(xm, x2)

        let yInt = new Interval(y1, y2)

        if (func(xInt1, yInt).contains(0)) {
          new_rectangles.push(x1, xm, y1, y2)
        }

        if (func(xInt2, yInt).contains(0)) {
          new_rectangles.push(xm, x2, y1, y2)
        }
      } else if (dividingMode === 2) {
        let ym = (y1 + y2) / 2

        let yInt1 = new Interval(y1, ym)
        let yInt2 = new Interval(ym, y2)

        let xInt = new Interval(x1, x2)

        if (func(xInt, yInt1).contains(0)) {
          new_rectangles.push(x1, x2, y1, ym)
        }

        if (func(xInt, yInt2).contains(0)) {
          new_rectangles.push(x1, x2, ym, y2)
        }
      }
    }

    rectangles = new_rectangles
  }

  return rectangles
}

export { intervalEqFindBoxes }
