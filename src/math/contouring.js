


// Thanks to https://watermark.silverchair.com/330402.pdf?token=AQECAHi208BE49Ooan9kkhW_Ercy7Dm3ZL_9Cf3qfKAc485ysgAAAncwggJzBgkqhkiG9w0BBwagggJkMIICYAIBADCCAlkGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMzrZbABIi4_9nBCNkAgEQgIICKsRiYm5m-H_ulYXbyKa_4FvhHY-dNoJL8kXfXf0uNRLSZMKfnOTU9Hxp3W_uNaRzSNPu1K23SM9KtZUupvGjUW9KfUO4hdyyZQghDcA0va1ZwcyK6PlgX1rcyI76LrIk46C98-8Yd4LM4StDhVZBoSuJVvmYt2f3ruUFJ3ukOIyvgZGnqObOMzJN5PfXVXAEiW_0PvAJG-yGshJ-iIvUzhlvZQGONSkKOgpBLSwLDeA-GHfAkvbiRh19dlEG3P8PToJyLlAXAnBONLp7O1SyyTHhMGbQ4u6xkSNrT43C63naabWRauWGEKPr9q38X_d3JTN-9bsZw5eSzdjFLimR8xTQR3BCx_kHQVwYol8S79-QxmX-pnXjNJ8Q4OrAfIH0Gf97bkMH2iNTQcsBdp1t0cmkxFT_jdWshOO_vWLtv0ALnR742sfJ4VFEpeRCgQiFOgEcvRSTReQ69ERqoBBkL4uFIsQa7-lz466NJAXxaIWP7GhazOB1KJjzmNJm-7gbFUvaHUy24YR1vuGl0wXZn_ayi6uynoXASBRO5dMt3HsJ1UQkqRssdKMwfx2vmJAj1inl-5vkJf0TxTHTs_e2x7QD3T_bTxTOJmsx96wVKMvaE8uT1AFtzymzYbiwj4GaZgUGw-iH4_nSpJo0LCLesR-UoIjf_-M77aiirCbSM-DxEjRWp16h_pu13i19saWPgJV324Y7dlxqxdcrZ1rEntdTjjdIDAmLgbhP
// for some important ideas
function generateContours1(func, xmin, xmax, ymin, ymax, searchDepth=5, plotDepth=10) {
  let polyline = []

  function add_contour_segment(x1, y1, x2, y2) {
    polyline.push(x1, y1, x2, y2, NaN, NaN)
  }

  function create_tree(depth, xmin, xmax, ymin, ymax, fxy, fxY, fXY, fXy) {
    let needs_subdivide = depth < searchDepth

    if (depth < plotDepth && !needs_subdivide) {
      let signxy = Math.sign(fxy)
      let signxY = Math.sign(fxY)
      let signXY = Math.sign(fXY)
      let signXy = Math.sign(fXy)

      // Search for contours
      if (signxy !== signxY || signxY !== signXY || signXY !== signXy) {
        // If there's a contour
        if (depth < plotDepth) {
          // subdivide
          needs_subdivide = true
        } else {
          let side1 = signxy !== signxY
          let side2 = signxY !== signXY
          let side3 = signXY !== signXy
          let side4 = signXy !== signxy

          if (side1 && side3) {
            let side1a = Math.abs(fxy)
            let side1b = Math.abs(fxY)
            let side3a = Math.abs(fXY)
            let side3b = Math.abs(fXy)

            let side1ratio = side1a / (side1a + side1b)
            let side3ratio = side3a / (side3a + side3b)

            let x1 = xmin + side1ratio * (xmax - xmin)
            let y1 = ymin
            let x2 = xmax + side3ratio * (xmin - xmax)
            let y2 = ymin

            add_contour_segment(x1, y1, x2, y2)
          }

          if (side2 && side4) {
            let side2a = Math.abs(fxY)
            let side2b = Math.abs(fXY)
            let side4a = Math.abs(fXy)
            let side4b = Math.abs(fxy)

            let side2ratio = side2a / (side2a + side2b)
            let side4ratio = side4a / (side4a + side4b)

            let x1 = xmin
            let y1 = ymin + side2ratio * (ymax - ymin)
            let x2 = xmax
            let y2 = ymax + side4ratio * (ymin - ymax)

            add_contour_segment(x1, y1, x2, y2)
          }

          return
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

export { generateContours1 }
