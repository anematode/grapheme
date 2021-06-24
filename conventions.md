## Conventions and Representations

To make Grapheme development easier, we must have a way to represent things uniquely. Thus, we choose (relatively arbitrary conventions).

### Function names

* The natural logarithm is *ln*, not *log* as some mathematicians are used to. This is to prevent confusion with *log10*. *log* will not be usable on the user side.
* The natural logarithm of x to base b is denoted *logb*(b, x). I debated having some sort of subscript syntax, but I think this is less prone to errors. log_2 and log_10 should redirect to log2 and log10 respectively.
* The inverse trigonometric functions are denoted *arccos*, *arccot*, et cetera. Superscript notation will not be supported, but the functions sin2, cos2 et cetera may be provided for convenience.
* The inverse hyperbolic trig functions are denoted *arcosh*, *arsinh*, et cetera.
* The function *atan2* is not denoted *arctan2*, since this is how it often appears in computer programming, and is not used in mathematics that much.
