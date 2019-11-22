# Interval Arithmetic

## What is interval arithmetic?

We can perform arithmetic on intervals in a similar fashion to performing arithmetic on numbers. For example, if we consider the interval [2,3] and the interval [7,8], then the interval of possible outputs x+y where x is in the first interval and y is in the second interval is [9,11]. More generally for addition, we have

[a,b] + [c,d] = [a+c, b+d].

Other operations, however, may not be as simple. Let's consider something a bit more complex, like the division 1 / [a,b], where a <= b can be any real numbers.

If a and b are both positive, then the result of this division is clearly [1/b, 1/a] (the order of a,b is switched since |a| <= |b| implies |1/b| <= |1/a|). This is also true if a and b are both negative.

But what if 0 is contained in the interval [a,b]? Furthermore, what if one of a and b is actually 0?

Consider as an example the interval [a,b] = [-1,1]. This interval encompasses, in the graph y = 1/x, a vertical asymptote at x = 0. The range of possible outputs is therefore (-inf, -1] U [1, inf). Note that unlike with addition, the range of outputs is the union of two intervals, rather than a single interval.

Here, it is useful to make a distinction between multi-interval and normal interval arithmetic. In multi-interval arithmetic, we keep track of all intervals of output; in this example, we'd have 1 / [-1,1] = (-inf, -1], [1, inf). In normal interval arithmetic, we resort to choosing the narrowest interval which still encompasses all possible outputs. In this case, that interval is actually (-inf, inf) = R.

### Multi-interval arithmetic vs. normal interval arithmetic

What are the benefits and drawbacks of each arithmetic? Well, multi-interval arithmetic clearly encapsulates more information about the result of operations than the other, since it doesn't discard useful information. Normal arithmetic, while discarding some useful information, is faster on a per-operation basis and easier to implement.

## Some observations

[a,b] + [c,d] = [a+c, b+d]

[a,b] - [c,d] = [a-d, b-c]

[a,b] * [c,d] = [min(ac,ad,bc,bd), max(ac,ad,bc,bd)]

1 / [c,d] = (-inf, inf) if 0 in [c,d], otherwise [1/d, 1/c]

[a,b] / [c,d] = [a,b] * 1 / [c,d]

If a function is monotonically increasing (doesn't have to be strict) on the interval [a,b], then f([a,b]) = [f(a), f(b)]

If a function is monotonically decreasing on the interval [a,b], then f([a,b]) = [f(b), f(a)]

If a continuous function f reaches its global maximum m between a and b, then f([a,b]) = [min(f(a), f(b)), m]

Analogous fact is true for functions reaching their global minimum

## Approximate interval arithmetic

For some functions, it is rather complicated to compute the narrowest interval containing the range of possible outputs. As an example, consider the most generalized form of exponentiation, taken over the real numbers. (Complex number interval arithmetic is for another, distant day.)

[a,b] ^ [c,d] = ???

The question is not too hard for a > 1 and c > 1. After all, x^n is monotonically increasing for any fixed x and any fixed n, yielding [a^c, b^d]. But when values less than 1 or (in nightmares) negative numbers come into play, the complexity grows exponentially -- no pun intended.

As an example, consider [-2, -1] ^ [0, 1/4]. Seems like it shouldn't be too bad, right?

Well, we know the answer needs to contain 1, since (-2)^0 = (-1)^0. It also needs to contain -fifth root(2), since (-2)^(1/5) = -fifth root(2), which is about -1.1487. But how do we find the complete answer?

We observe that the real root of (-2)^(p/q), where p/q is in reduced form and p,q are odd, is just -1 * 2 ^ (p/q). It's complex for even p or q. Since 2 ^ (p/q) is monotonically increasing for p/q, we simply need to find the largest p/q with p,q odd in [0, 1/4].

This, of course, is easier said than done. We write the denominator q as 2j + 1 and let j go to infinity. Then our maximum allowable value of p is floor(q/4) = floor(j/2 + 1/4) yuck. But in any case, we have

limit as j -> inf of (-2) ^ (floor(j/2 + 1/4) / (2j + 1)) = -1 * 2 ^ (1/4).

Makes sense; we get infinitely close to 1/4 with odd fraction approximations. Thus, the answer is [-sqrt(sqrt(2)), 1].

But this is a simplified case! We didn't have a range of exponents including 1, it was all on one side of 1. The base did not contain 0. Imagine how complex this would be in the full case... and then considering the limitations of float arithmetic... oy vey!

Well, we can do our best by using complex numbers. We have |[a,b]^[c,d]| = |[a,b]|^[c,d], where |z| denotes complex magnitude (the proof of this is left as an exercise for the reader). Thus, over the complex numbers, we know that

[-max(|a|,|b|)^d, max(|a|,|b|)^d]

contains the possible answers. In our previous example, this interval is

[-2^(1/4), 2^(1/4)].

This isn't as accurate as it could be, but it's a hell of a lot easier to understand and implement!

## Why is interval arithmetic useful?

Interval arithmetic provides us with information on the possible outputs of a function over some interval. This is extremely helpful for verifying the accuracy of a graph. For example, suppose we have sampled a function f(x) at 5000 points along the viewport of the graph. Perhaps we've missed a sharp, but graphically important, bump! We can check each interval with interval arithmetic, and any large deviations can help us find, calculate and graph the bump. Algorithms for this are upcoming.

Interval arithmetic can also help us understand inequalities. For example, if f(x) > 0, then over any interval [a,b] we are checking for x, if f([a,b]) < 0, then there is no point investigating further; there are no solutions to the inequality in the range [a,b].

Most importantly for us, interval arithmetic lets us intelligently deal with 2 dimensional equations. In the most generalized form, this is f(x,y) = g(x,y) for functions f,g. We can rewrite this as f(x,y) - g(x,y) = 0. For any intervals [a,b] for x and [c,d] for y, which can be thought of as a rectangle of potential values in Cartesian space, we can eliminate the possibility of finding solutions there if 0 is outside of f([a,b],[c,d]) - g([a,b], [c,d]).

## Problems with interval arithmetic

The major problems with interval arithmetic are speed and the dependency problem. Speed is pretty simple; it's harder to find the interval result of a function compared to just evaluating it with specific values for each variable. However, since these methods are usually used in different circumstances, they complement each other well, and speed is an issue of optimization rather than a pathological problem.

More importantly, the *dependency problem* is the observation that interval arithmetic (and indeed, even multi-interval arithmetic) can lose information when dealing with complex functions. A simple example is the function f(x) = x * x over the interval [-1,1]. Interval arithmetic tells us that [-1,1] * [-1,1] = [-1,1], which is true when dealing with two independent intervals, but a very poor answer for two of the same interval. Indeed, the correct answer should be [0,1].

This is a mediocre example because x * x can be optimized to x^2, which is treated differently in interval arithmetic, but the observation still holds for functions like f(x) = x^2 + x.

Fortunately, this is an issue of speed, not an issue of correctness. As long as approximations get better and better, in some sense, as the input intervals become tighter and tighter, then functions will still graph correctly (albeit slowly). For example, if we were trying to graph x^2 + y^2 - 6 = 0, then we might not be able to eliminate solutions from a maximal rectangle just smaller than the circle, but we could eliminate solutions for smaller chunks of that rectangle. The dependency problem and its ramifications will be explained more thoroughly in the near future.
