
let EPS = 0.01

function closeEnough(a, b) {
  return Math.abs(a - b) <= EPS
}

class Contour {
  constructor(x1, y1, x2, y2) {
    this.x1 = x1
    this.y1 = y1
    this.x2 = x2
    this.y2 = y2

    this.pts1 = [x1, y1]
    this.pts2 = [x2, y2]

    this.closed = false
  }

  addSegment(x3, y3, x4, y4) {
    if (this.closed)
      return false

    let x1 = this.x1, y1 = this.y1, x2 = this.x2, y2 = this.y2
    let addedSegment = false

    if (x3 === x1 && y3 === y1) {
      // 3 === 1, so add 4 to pts1 and set 1 to 4

      this.pts1.push(x4, y4)
      this.x1 = x4
      this.y1 = y4

      addedSegment = true
    } else if (x4 === x1 && y4 === y1) {
      // 4 === 1, so add 3 to pts1 and set 1 to 3

      this.pts1.push(x3, y3)
      this.x1 = x3
      this.y1 = y3

      addedSegment = true
    }

    if (x3 === x2 && y3 === y2) {
      // 3 === 2, so add 4 to pts2 and set 2 to 4

      this.pts2.push(x4, y4)
      this.x2 = x4
      this.y2 = y4

      addedSegment = true
    } else if (x4 === x2 && y4 === y2) {
      // 4 === 2, so add 3 to pts 2 and set 2 to 3

      this.pts2.push(x3, y3)
      this.x2 = x3
      this.y2 = y3

      addedSegment = true
    }

    if (this.x1 === this.x2 && this.y1 === this.y2)
      this.closed = true

    return addedSegment
  }

  addPathTo(arr, reverse=false) {
    let pts1 = this.pts1, pts2 = this.pts2
    if (reverse) {
      pts1 = this.pts2
      pts2 = this.pts1
    }

    for (let i = 0; i < pts1.length; ++i) {
      arr.push(pts1[i])
    }

    for (let i = pts2.length - 2; i >= 0; i -= 2) {
      arr.push(pts2[i])
      arr.push(pts2[i + 1])
    }

    if (this.closed) {
      arr.push(pts1[0], pts1[1])
    }
  }
}

// (y-5)*cos(4 * sqrt((x-4)^2+y^2))-x*sin(2*sqrt(x^2+y^2))
// Thanks to https://watermark.silverchair.com/330402.pdf?token=AQECAHi208BE49Ooan9kkhW_Ercy7Dm3ZL_9Cf3qfKAc485ysgAAAncwggJzBgkqhkiG9w0BBwagggJkMIICYAIBADCCAlkGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMzrZbABIi4_9nBCNkAgEQgIICKsRiYm5m-H_ulYXbyKa_4FvhHY-dNoJL8kXfXf0uNRLSZMKfnOTU9Hxp3W_uNaRzSNPu1K23SM9KtZUupvGjUW9KfUO4hdyyZQghDcA0va1ZwcyK6PlgX1rcyI76LrIk46C98-8Yd4LM4StDhVZBoSuJVvmYt2f3ruUFJ3ukOIyvgZGnqObOMzJN5PfXVXAEiW_0PvAJG-yGshJ-iIvUzhlvZQGONSkKOgpBLSwLDeA-GHfAkvbiRh19dlEG3P8PToJyLlAXAnBONLp7O1SyyTHhMGbQ4u6xkSNrT43C63naabWRauWGEKPr9q38X_d3JTN-9bsZw5eSzdjFLimR8xTQR3BCx_kHQVwYol8S79-QxmX-pnXjNJ8Q4OrAfIH0Gf97bkMH2iNTQcsBdp1t0cmkxFT_jdWshOO_vWLtv0ALnR742sfJ4VFEpeRCgQiFOgEcvRSTReQ69ERqoBBkL4uFIsQa7-lz466NJAXxaIWP7GhazOB1KJjzmNJm-7gbFUvaHUy24YR1vuGl0wXZn_ayi6uynoXASBRO5dMt3HsJ1UQkqRssdKMwfx2vmJAj1inl-5vkJf0TxTHTs_e2x7QD3T_bTxTOJmsx96wVKMvaE8uT1AFtzymzYbiwj4GaZgUGw-iH4_nSpJo0LCLesR-UoIjf_-M77aiirCbSM-DxEjRWp16h_pu13i19saWPgJV324Y7dlxqxdcrZ1rEntdTjjdIDAmLgbhP
// for some important ideas
function generateContours1(func, xmin, xmax, ymin, ymax, searchDepth=3, plotDepth=5) {
  let polyline = []
  let contours = []

  function convertContour(contour) {
    contour.addPathTo(polyline)
    polyline.push(NaN, NaN)
  }

  function convertContours() {
    contours.forEach(convertContour)
  }

  function add_contour_segment(x1, y1, x2, y2) {
    polyline.push(x1, y1, x2, y2, NaN, NaN)
  }

  function create_tree(depth, xmin, xmax, ymin, ymax, fxy, fxY, fXY, fXy) {
    let needs_subdivide = depth < searchDepth

    if (depth <= plotDepth && !needs_subdivide) {
      let signxy = Math.sign(fxy)
      let signxY = Math.sign(fxY)
      let signXY = Math.sign(fXY)
      let signXy = Math.sign(fXy)

      // Search for contours
      if (signxy !== signxY || signxY !== signXY || signXY !== signXy) {
        if (depth < plotDepth) {
          // subdivide
          needs_subdivide = true
        } else {
          let side1 = signxy !== signxY
          let side2 = signxY !== signXY
          let side3 = signXY !== signXy
          let side4 = signXy !== signxy

          let side1x, side3x, side2y, side4y
          let side1y, side3y, side2x, side4x

          if (side1) {
            let side1a = Math.abs(fxy)
            let side1b = Math.abs(fxY)
            let side1ratio = side1a / (side1a + side1b)
            side1x = xmin
            side1y = ymin + side1ratio * (ymax - ymin)
          }

          if (side3) {
            let side3a = Math.abs(fXy)
            let side3b = Math.abs(fXY)
            let side3ratio = side3a / (side3a + side3b)
            side3x = xmax
            side3y = ymin + side3ratio * (ymax - ymin)
          }

          if (side2) {
            let side2a = Math.abs(fxY)
            let side2b = Math.abs(fXY)
            let side2ratio = side2a / (side2a + side2b)
            side2x = xmin + side2ratio * (xmax - xmin)
            side2y = ymax
          }

          if (side4) {
            let side4a = Math.abs(fxy)
            let side4b = Math.abs(fXy)
            let side4ratio = side4a / (side4a + side4b)
            side4x = xmin + side4ratio * (xmax - xmin)
            side4y = ymin
          }

          if (side1 && side2 && side3 && side4) {
            // Saddle point

            add_contour_segment(side1x, side1y, side3x, side3y)
            add_contour_segment(side2x, side2y, side4x, side4y)

            return
          }

          if (side1 && side3) {
            add_contour_segment(side1x, side1y, side3x, side3y)
            return
          }

          if (side2 && side4) {
            add_contour_segment(side2x, side2y, side4x, side4y)
            return
          }

          if (side1 && side2) {
            add_contour_segment(side1x, side1y, side2x, side2y)
          }

          if (side2 && side3) {
            add_contour_segment(side3x, side3y, side2x, side2y)
          }

          if (side3 && side4) {
            add_contour_segment(side3x, side3y, side4x, side4y)
          }

          if (side4 && side1) {
            add_contour_segment(side1x, side1y, side4x, side4y)
          }
        }
      } else {
        // no contour, return
        return
      }
    }

    if (needs_subdivide) {
      // subdivide
      let midX = (xmin + xmax) / 2
      let midY = (ymin + ymax) / 2

      let mxmyCorner = func(midX, midY)
      let mxyCorner = func(midX, ymin)
      let mxYCorner = func(midX, ymax)
      let xmyCorner = func(xmin, midY)
      let XmyCorner = func(xmax, midY)

      create_tree(depth + 1, xmin, midX, ymin, midY, fxy, xmyCorner, mxmyCorner, mxyCorner)
      create_tree(depth + 1, xmin, midX, midY, ymax, xmyCorner, fxY, mxYCorner, mxmyCorner)
      create_tree(depth + 1, midX, xmax, ymin, midY, mxyCorner, mxmyCorner, XmyCorner, fXy)
      create_tree(depth + 1, midX, xmax, midY, ymax, mxmyCorner, mxYCorner, fXY, XmyCorner)
    }
  }

  let xyCorner = func(xmin, ymin)
  let xYCorner = func(xmin, ymax)
  let XYCorner = func(xmax, ymax)
  let XyCorner = func(xmax, ymin)

  create_tree(0, xmin, xmax, ymin, ymax, xyCorner, xYCorner, XYCorner, XyCorner)

  convertContours()

  return polyline
}

function generateContours2(func, curvatureFunc, xmin, xmax, ymin, ymax, searchDepth=7, renderingQuality=8, maxDepth=16) {
  let polyline = []

  function add_contour_segment(x1, y1, x2, y2) {
    polyline.push(x1, y1, x2, y2, NaN, NaN)
  }

  function create_tree(depth, xmin, xmax, ymin, ymax, fxy, fxY, fXY, fXy) {
    let needs_subdivide = depth < searchDepth

    if (depth <= maxDepth && !needs_subdivide) {
      let signxy = Math.sign(fxy)
      let signxY = Math.sign(fxY)
      let signXY = Math.sign(fXY)
      let signXy = Math.sign(fXy)

      // Search for contours
      if (signxy !== signxY || signxY !== signXY || signXY !== signXy) {
        let minDim = Math.min(xmax - xmin, ymax - ymin)
        let radius = Math.abs(curvatureFunc((xmax + xmin) / 2, (ymax + ymin) / 2))

        if (depth < maxDepth && radius < renderingQuality * minDim) {
          // subdivide
          needs_subdivide = true
        } else {
          let side1 = signxy !== signxY
          let side2 = signxY !== signXY
          let side3 = signXY !== signXy
          let side4 = signXy !== signxy

          let side1x, side3x, side2y, side4y
          let side1y, side3y, side2x, side4x

          if (side1) {
            let side1a = Math.abs(fxy)
            let side1b = Math.abs(fxY)
            let side1ratio = side1a / (side1a + side1b)
            side1x = xmin
            side1y = ymin + side1ratio * (ymax - ymin)
          }

          if (side3) {
            let side3a = Math.abs(fXy)
            let side3b = Math.abs(fXY)
            let side3ratio = side3a / (side3a + side3b)
            side3x = xmax
            side3y = ymin + side3ratio * (ymax - ymin)
          }

          if (side2) {
            let side2a = Math.abs(fxY)
            let side2b = Math.abs(fXY)
            let side2ratio = side2a / (side2a + side2b)
            side2x = xmin + side2ratio * (xmax - xmin)
            side2y = ymax
          }

          if (side4) {
            let side4a = Math.abs(fxy)
            let side4b = Math.abs(fXy)
            let side4ratio = side4a / (side4a + side4b)
            side4x = xmin + side4ratio * (xmax - xmin)
            side4y = ymin
          }

          if (side1 && side2 && side3 && side4) {
            // Saddle point

            add_contour_segment(side1x, side1y, side3x, side3y)
            add_contour_segment(side2x, side2y, side4x, side4y)

            return
          }

          if (side1 && side3) {
            add_contour_segment(side1x, side1y, side3x, side3y)
            return
          }

          if (side2 && side4) {
            add_contour_segment(side2x, side2y, side4x, side4y)
            return
          }

          if (side1 && side2) {
            add_contour_segment(side1x, side1y, side2x, side2y)
          } else if (side2 && side3) {
            add_contour_segment(side3x, side3y, side2x, side2y)
          } else if (side3 && side4) {
            add_contour_segment(side3x, side3y, side4x, side4y)
          } else if (side4 && side1) {
            add_contour_segment(side1x, side1y, side4x, side4y)
          }
        }
      } else {
        // no contour, return
        return
      }
    }

    if (needs_subdivide) {
      // subdivide
      let midX = (xmin + xmax) / 2
      let midY = (ymin + ymax) / 2

      let mxmyCorner = func(midX, midY)
      let mxyCorner = func(midX, ymin)
      let mxYCorner = func(midX, ymax)
      let xmyCorner = func(xmin, midY)
      let XmyCorner = func(xmax, midY)

      create_tree(depth + 1, xmin, midX, ymin, midY, fxy, xmyCorner, mxmyCorner, mxyCorner)
      create_tree(depth + 1, xmin, midX, midY, ymax, xmyCorner, fxY, mxYCorner, mxmyCorner)
      create_tree(depth + 1, midX, xmax, ymin, midY, mxyCorner, mxmyCorner, XmyCorner, fXy)
      create_tree(depth + 1, midX, xmax, midY, ymax, mxmyCorner, mxYCorner, fXY, XmyCorner)
    }
  }

  let xyCorner = func(xmin, ymin)
  let xYCorner = func(xmin, ymax)
  let XYCorner = func(xmax, ymax)
  let XyCorner = func(xmax, ymin)

  create_tree(0, xmin, xmax, ymin, ymax, xyCorner, xYCorner, XYCorner, XyCorner)

  return polyline
}

export { generateContours1, generateContours2 }
