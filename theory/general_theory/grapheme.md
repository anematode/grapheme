# What is Grapheme?

Good question, Tim. I think the eventual goal of Grapheme is to be an online graphing API. By graphing, I mean drawing 2D figures of any type (3D maybe, but only in the distant future). This includes graphing datasets, functions over the real numbers, equations over R^2, gridlines, various primitives (circles, lines, etc.), functions over the complex numbers, equations over C, and various visualization things. The goal of an online graphing CALCULATOR, which uses Grapheme as its main API, is a separate goal. Discuss: what to name this calculator? Cowdung?

### What will Grapheme not do for now?

* LaTeX equation input
* 3D graphing
* export of SVG drawings
* advanced symbolic manipulation
* highly interactive setups (mouse events and dragging around the graph will be supported though)
* arbitrary-precision arithmetic (not natively at least, but this could be done using an external arbitrary prec library and just scaling up Grapheme by some amount)
* video export

### What will Grapheme do?

Make client-side rendered graphs and diagrams fast. And hopefully be more lightweight and customizable (big on customizable) than Desmos. And Geogebra. GEOGEBRA


## Thoughts

I need to think. I can't let Grapheme fail as always. There are some good ideas in here though.

Maybe I should make Grapheme a bit more Asymptote like, where we just draw things with pens and paths.

No. Grapheme should have a tree structure. It should have elements and groups for organization. But the current setup is weird.

I'm worried that Axis isn't generic enough. It can't do logarithmic axes without bending over backwards, for example.

I think I need to take some inspiration from Asymptote though. I should implement my own Path2D class that piggy backs off of the built-in Path2D class, but implements important things like derivativeAt() and length() and pointAt().

But I need to get my priorities straight. Grapheme needs to live. My first project will be a Mandelbrot set viewer. Even if the current setup is unnecessarily restrictive, I can generalize it LATER.

