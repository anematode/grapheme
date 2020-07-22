// Integrate the function f from a to b in n steps using Simpson's rule
function integrate(f, a, b, n) {
  // Indexing variable, step width
  let i, n2 = n * 2, h = (b - a) / n2

  // Add the values of the function at the endpoints
  let sum = f(a) + f(b)

  // Add terms 1
  for (i = 1; i < n2; i += 2)
    sum += 4 * f(a + i*h)

  // Add terms 2
  for (i = 2; i < n2-1; i += 2)
    sum += 2 * f(a + i*h)

  return sum * h / 3
}

export { integrate }
