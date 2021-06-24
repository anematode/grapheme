
function seriesEval(r) {
  const c = [
    -1.0,
    2.331643981597124203363536062168,
    -1.812187885639363490240191647568,
    1.936631114492359755363277457668,
    -2.353551201881614516821543561516,
    3.066858901050631912893148922704,
    -4.175335600258177138854984177460,
    5.858023729874774148815053846119,
    -8.401032217523977370984161688514,
    12.250753501314460424,
    -18.100697012472442755,
    27.029044799010561650
  ]

  const t_8 = c[8] + r * (c[9] + r * (c[10] + r * c[11]))
  const t_5 = c[5] + r * (c[6] + r * (c[7] + r * t_8))
  const t_1 = c[1] + r * (c[2] + r * (c[3] + r * (c[4] + r * t_5)))
  return c[0] + r * t_1
}

function approxProductLog(x) {
  if (x > 1) {
    let logX = Math.log(x)

    return logX - Math.log(logX)
  }

  return 0
}

function approxProductLogM1(x) {
  if (x < -1.0e-6) {
    // Calculate via series

    let q = x - RECIP_E
    let r = -Math.sqrt(q)

    return seriesEval(r)
  } else {
    // Calculate via logs

    let L1 = Math.log(-x)
    let L2 = Math.log(-L1)

    return L1 - L2 + L2 / L1
  }
}

function halley(x, w, iters=8) {
  for (let i = 0; i < 8; ++i) {
    let eW = Math.exp(w)

    w = w - (w * eW - x) / (eW * (w + 1) - (w + 2) * (w * eW - x) / (2 * w + 2))
  }

  return w
}

const RECIP_E = -1 / Math.E

function productLog(x) {

  if (x < RECIP_E)
    return NaN

  // see https://mathworld.wolfram.com/LambertW-Function.html
  let w = approxProductLog(x)

  // Compute via Halley's method

  return halley(x, w)
}

function productLogBranched(k, x) {
  if (k === 0)
    return productLog(x)
  else if (k === -1) {
    if (x === 0)
      return Infinity

    if (RECIP_E <= x && x < 0) {
      let w = approxProductLogM1(x)

      return halley(x, w)
    }

    return NaN
  }

  return NaN
}
