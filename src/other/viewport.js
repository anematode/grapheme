/**
So here's the deal. Grapheme has a shit ton of coordinate spaces. We need to easily
translate between them in a consistent and error-free manner.

We will never deal with the entire space of the glCanvas, in the sense that we will
never need to deal with the fact that we are operating on a subset of the true (full)
canvas. Thus, in the following, width and height are the width and height of the
window being currently drawn.

canvas space: The space of pixels on the canvas, with (0,0) in the top left corner and
(width, height) in the bottom right corner (of the gl viewport on the glCanvas)
client/display space: The space of CSS pixels on the canvas, with (0,0) in the top
left corner and (width / dpr, height / dpr) in the bottom right corner, where dpr
is the device pixel ratio
GL space: the coordinate system which WebGL uses, ranging from (-1, 1) in the top
left corner to (1, -1) in the bottom right corner
Cartesian space: An optional space, but definitely an important one! This is the space
where we might actually graph functions and objects in when we're talking about 2D. To
make room for things like axis labels, titles, et cetera, we can define a subregion
of the canvas where things will actually be drawn, to be surrounded by axis labels etc.
*/
