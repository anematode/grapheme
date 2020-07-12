
// Arithmetic geometric mean

const MAX_ITERS = 20

// Credit to Rosetta Code
function agm(a0, g0, tolerance=1e-17) {
  let an = a0, gn = g0
  let i = 0

  while (Math.abs(an - gn) > tolerance && i < MAX_ITERS) {
    i++

    let tmp = an
    an = (an + gn) / 2
    gn = Math.sqrt(tmp * gn)
  }
  return an;
}

export { agm }
