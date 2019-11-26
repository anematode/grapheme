/**
This class defines an affine transformation from a scalar to a Vec2, to be used on an axis.
Though it might seem obtuse, it is important for visual clarity.

To define the transformation, we fix starting and ending Vec2s (start and end) which are
the ends of the displayed axis. Not all of this axis is necessarily usable for things like tickmarks,
however, due to things like arrowheads and
*/

class AxisTransformation {
  constructor (params = {}) {
    this.start = 0
  }
}

export { AxisTransformation }
