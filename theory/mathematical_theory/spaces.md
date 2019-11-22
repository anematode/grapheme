# Grapheme's Numerous Coordinate Spaces

There are three main coordinate spaces that Grapheme deals with. These are termed GL space, canvas or pixel space, and Cartesian space. Keep in mind that these are all defined on a per-context basis These are all expressed in rectangular coordinates of some form, but their relative locations are different. The ranges in x and y here are

## GL space

GL space, usually known as clip space to other peeps, has a range of [-1.0, 1.0] in both x and y directions. These are the values used by the WebGL renderer to draw triangles and other primitives to the canvas. The origin of this space is the center of the canvas. Interestingly, GL uses a coordinate system akin to our normal coordinate system; up is +y and down is -y.

![illustration](images/gl_space_illustration.png)

## Canvas/pixel space

Canvas space or pixel space is the space used for drawing things on the 2D canvas situated on top of the WebGL canvas. This is almost exclusively for text stuff. As usual, the origin is the top-left corner. The in-range values for x are [0, grapheme_context.width] and for y is [0, grapheme_context.height]. Note that this is determined by the size of the parent div, but intelligently scaled based on the devicePixelRatio.

![illustration](images/canvas_space_illustration.png)

## Cartesian space

The space I'll probably be thinking in most of the time, this is the space that functions will be calculated in, datasets will be thought of in, etc. The origin is anywhere (including possibly off the screen), but the +y and +x axes are always to the right and top, respectively. More specifically, the center of the screen is (viewport.x, viewport.y) and the total width/height of the screen are given by viewport.width/viewport.height. For reasons of float annoyance, we decide 10^50 > viewport.width, viewport.height > 1e-10 (not yet implemented); graphing outside these ranges should be done through various transformations.

![illustration](images/cartesian_space_illustration.png)
