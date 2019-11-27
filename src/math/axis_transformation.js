import { Vec2 } from './vec2'

/**
This class defines an affine transformation from a scalar to a Vec2, to be used on an axis.
Though it might seem obtuse, it is important for visual clarity.

To define the transformation, we fix starting and ending Vec2s (start and end) which are
the ends of the displayed axis. Not all of this axis is necessarily usable for things like tickmarks,
however, due to things like arrowheads and
*/

class AxisTransformation {
  constructor (params = {}) {
    this.start = utils.select(params.start, new Vec2(0, 0));
    this.end = utils.select(params.end, new Vec2(200, 0));


  }
}

export { AxisTransformation }
