
// Computes the Riemann zeta function of a real number r.
function zeta(r) {
  if (r === 1)
    return Infinity

  if (r % 2 === 0 && r < 0)
    return 0
}

export { zeta }
