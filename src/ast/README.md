## AST

An [abstract syntax tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree) (AST) is how Grapheme represents expressions. At the time of writing (December 5, 2021), the AST only handles *expressions*, but it can—and hopefully will—be extended to more general things like equations. I also hope it will someday have functions as first-class citizens, and the Grapheme language, if ever created, would likely be mostly functional in design.

I am too lazy and prideful to use an existing parser like [Nearley](https://github.com/kach/nearley) to parse expressions. I am also too lazy to strictly define the grammar. It will almost certainly become more complex over time. An executive summary:

* Unary operators: -
* Binary operators: +, *, /, ^ (exponentiation), <, >, <=, >=, ==, !=, and, or. The last two operators need to be separated by some spacing in most contexts to separate them from, say, function names.
* Precedence: Most operators follow PEMDAS, then the boolean operators, evaluated left-to-right. The exceptions are unary minus and exponentiation, which are processed in one step from right to left. Thus, `e^-x^2` is parsed as `e^(-(x^2))` instead of, say, `(e^(-x))^2`.
* Grouping via parentheses: Parentheses must be balanced. There is no implicit multiplication between two parenthesized expressions.
* Function calls: Functions must begin with a letter or underscore and may otherwise contain alphanumeric or underscore characters, followed by parentheses containing their arguments.
* Constants: Float-like expressions like `0.3`

In the compiled result, there are operators, constants, and variables. Operators include both inline operators and functions and may thus take in any number of operations; *+* is basically treated as a function taking in two variables, with the name "+". Constants are, well, constants, mainly numerical values (but also potentially strings). Variables have the same naming convention as functions, and currently, functions and variables may share names.

Grapheme is strongly typed. In any given well-formed expression, a variable or intermediate result has a type, deduced from the types of the variables and the available variables. Consider the expression `x^2+y^2`; if both variables have type `int`, then the whole expression and each expression `x^2`, `y^2` also has type `int`. The `^` operation is *resolved* to be the one that has the signature `(int, int) -> int`, as is the `+` operation. Meanwhile, if both have type `real`, the whole expression (and each subexpression) also have type `real`. If `x` is `real` while `y` is `complex`, then `x^2` is `real` while `y^2` is complex, and `x^2` is *implicitly casted* to `complex`, so that the `+` operation is resolved to the one with signature `(complex, complex) -> complex`. Operations are thus fairly overloaded.
 
 Currently types are fairly simple, but in the future they may include generics—something like `list<int>`, for example.
