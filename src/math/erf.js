import { SingleVariablePolynomial } from './polynomial'

const p = 0.3275911
const ERF_POLY = new SingleVariablePolynomial([0, 0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429])

function erf(x) {
  if (x === 0)
    return 0
  if (x < 0)
    return -erf(-x)

  let t = 1 / (1 + p * x)

  return 1 - ERF_POLY.evaluate(t) * Math.exp(- x * x)
}

function erfc(x) {
  return 1 - erf(x)
}

const P20 = new SingleVariablePolynomial([.676455795265851771123606, -.48716234718806134686, .13695960225514314808, -.190290970059805, .136407768400368, -.479130508190746, .700512092235656, -.276952371047165])
const Q20 = new SingleVariablePolynomial([.623714614227559, -.481534870668920, .147397769234566, -.227937858340551, .187962846769108, -.801459723683333, .157310773242888, -1.07387806658350, .1])

function fmaf(x, y, a) {
  return x * y + a
}


// Credit to https://stackoverflow.com/questions/27229371/inverse-error-function-in-c
function inverseErf(x) {
  if (x === 0)
    return 0

  let p = 0, r = 0, t = 0;
  t = - x * x + 1
  t = Math.log(t)

  if (Math.abs(t) > 6.125) { // maximum ulp error = 2.35793
    p = 3.03697567e-10; //  0x1.4deb44p-32
    p = fmaf (p, t,  2.93243101e-8); //  0x1.f7c9aep-26
    p = fmaf (p, t,  1.22150334e-6); //  0x1.47e512p-20
    p = fmaf (p, t,  2.84108955e-5); //  0x1.dca7dep-16
    p = fmaf (p, t,  3.93552968e-4); //  0x1.9cab92p-12
    p = fmaf (p, t,  3.02698812e-3); //  0x1.8cc0dep-9
    p = fmaf (p, t,  4.83185798e-3); //  0x1.3ca920p-8
    p = fmaf (p, t, -2.64646143e-1); // -0x1.0eff66p-2
    p = fmaf (p, t,  8.40016484e-1); //  0x1.ae16a4p-1
  } else { // maximum ulp error = 2.35456
    p =              5.43877832e-9;  //  0x1.75c000p-28
    p = fmaf (p, t,  1.43286059e-7); //  0x1.33b458p-23
    p = fmaf (p, t,  1.22775396e-6); //  0x1.49929cp-20
    p = fmaf (p, t,  1.12962631e-7); //  0x1.e52bbap-24
    p = fmaf (p, t, -5.61531961e-5); // -0x1.d70c12p-15
    p = fmaf (p, t, -1.47697705e-4); // -0x1.35be9ap-13
    p = fmaf (p, t,  2.31468701e-3); //  0x1.2f6402p-9
    p = fmaf (p, t,  1.15392562e-2); //  0x1.7a1e4cp-7
    p = fmaf (p, t, -2.32015476e-1); // -0x1.db2aeep-3
    p = fmaf (p, t,  8.86226892e-1); //  0x1.c5bf88p-1
  }

  r = x * p;

  return r;

}

function inverseErfc(x) {
  return inverseErf(1 - x)
}

export {erf, erfc, inverseErf, inverseErfc}
