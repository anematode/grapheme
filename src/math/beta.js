import { ln_gamma, gamma } from './gamma_function'

export const Beta = (a,b) => {
  if (a < 0 || b < 0)
    return gamma(a) * gamma(b) / gamma(a + b)
  return Math.exp(ln_gamma(a) + ln_gamma(b) - ln_gamma(a + b))
}
