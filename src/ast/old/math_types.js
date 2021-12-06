// List of valid types in Grapheme math language (as distinct from the props and stuff)
import { FastRealInterval } from '../../math/fast_interval/fast_real_interval.js'
import { FastVec2Interval } from '../../math/fast_interval/fast_vec2_interval.js'
import { Vec2 } from '../../math/vec/vec2.js'



export const TYPES = {
  bool: {
    typecheck: {
      generic: {
        f: x => typeof x === 'boolean'
      },
      fast_interval: {
        f: x => typeof x === "number" && (0 <= x && x < 16)
      }
    },
    init: {
      generic: {
        f: () => false
      },
      fast_interval: {
        f: () => new FastRealInterval()
      }
    },
    fast_init: {
      generic: {
        f: () => false
      },
      fast_interval: {
        f: () => new FastRealInterval()
      }
    },
    cast: {
      generic: {
        f: x => !!x
      },
      fast_interval: {
        f: () => new FastRealInterval()
      }
    }
  },
  int: {
    typecheck: {
      generic: {
        f: Number.isInteger
      },
      fast_interval: {
        f: x => x instanceof FastRealInterval
      }
    },
    init: {
      generic: {
        f: x => x
      },
      fast_interval: {
        f: x => new FastRealInterval()
      }
    },
    fast_init: {
      generic: {
        f: () => 0
      },
      fast_interval: {
        f: () => new FastRealInterval()
      }
    },
    clone: {
      generic: {
        f: x => x
      },
      fast_interval: {
        f: x => {
          return new FastRealInterval(x.min, x.max, x.info)
        }
      }
    },
    cast: {
      generic: {
        f: x => Math.round(+x)
      },
      fast_interval: {
        f: int => {
          if (int instanceof FastRealInterval) return int
          if (typeof int === "number") return new FastRealInterval(int, int)
          return new FastRealInterval(0, 0, 0)
        }
      }
    }
  },
  real: {
    typecheck: {
      generic: {
        f: x => typeof x === 'number'
      },
      fast_interval: {
        f: x => x instanceof FastRealInterval
      }
    },
    init: {
      generic: {
        f: x => x
      },
      fast_interval: {
        f: x => new FastRealInterval(x, x)
      }
    },
    fast_init: {
      generic: {
        f: () => 0
      },
      fast_interval: {
        f: () => new FastRealInterval()
      }
    },
    clone: {
      generic: {
        f: x => x
      },
      fast_interval: {
        f: x => {
          return new FastRealInterval(x.min, x.max, x.info)
        }
      }
    },
    cast: {
      generic: {
        f: x => +x
      },
      fast_interval: {
        f: int => {
          if (int instanceof FastRealInterval) return int
          if (typeof int === "number") return new FastRealInterval(int, int)
          return new FastRealInterval(0, 0, 0)
        }
      }
    }
  },
  complex: true,
  vec2: {
    typecheck: {
      generic: {
        f: x => x instanceof Vec2
      },
      fast_interval: {
        f: x => x instanceof FastVec2Interval
      }
    },
    init: {
      generic: {
        f: v => new Vec2(v.x, v.y)
      },
      fast_interval: {
        f: v => new FastVec2Interval(v.xMin, v.xMax, v.yMin, v.yMax, v.info)
      }
    },
    fast_init: {
      generic: {
        f: () => new Vec2()
      },
      fast_interval: {
        f: () => new FastVec2Interval()
      }
    },
    cast: {
      generic: {
        f: v => new Vec2(v.x, v.y)
      },
      fast_interval: {
        f: v => new FastVec2Interval(v.xMin, v.xMax, v.yMin, v.yMax, v.info)
      }
    }
  },
  null: true
}

export function getTypecheck (type, mode) {
  let info = TYPES[type]
  if (!info) throw new Error(`Invalid type ${type}`)

  let typecheck = info.typecheck[mode]
  if (!typecheck) throw new Error(`No typecheck`)

  return typecheck
}

export function getInitializer (type, mode) {
  let info = TYPES[type]
  if (!info) throw new Error(`Invalid type ${type}`)

  let init = info.cast[mode]
  if (!init) throw new Error(`No initializer`)

  return init
}

export function getFastInitializer (type, mode) {
  let info = TYPES[type]
  if (!info) throw new Error(`Invalid type ${type}`)

  let init = info.fast_init[mode]
  if (!init) throw new Error(`No fast initializer`)

  return init
}

export function getCloner (type, mode) {
  let info = TYPES[type]
  if (!info) throw new Error(`Invalid type ${type}`)

  let cloner = info.clone[mode]
  if (!cloner) throw new Error(`No cloner`)

  return cloner
}

export function getConvenienceCaster (type, mode) {
  let info = TYPES[type]
  if (!info) throw new Error(`Invalid type ${type}`)

  let cast = info.cast[mode]
  if (!cast) throw new Error(`No cast`)

  return cast
}
