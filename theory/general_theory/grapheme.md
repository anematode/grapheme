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
