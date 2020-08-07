// Types: "bool", "int", "real", "complex", "vec2", "vec3", "vec4", "mat2", "mat3", "mat4", "real_list", "complex_list", "real_interval", "complex_interval"

import { levenshtein } from '../core/utils'

const TYPES = {
  "bool": {

  },
  "int": {

  },
  "real": {

  },
  "complex": {

  },
  "vec2": {

  },
  "vec3": {

  }
}

const TYPELIST = Object.keys(TYPES)

function isValidType(typename) {
  return TYPELIST.includes(typename)
}

function throwInvalidType(typename) {
  if (!isValidType(typename)) {

    let didYouMean = ""

    let distances = TYPELIST.map(type => levenshtein(typename, type))
    let minDistance = Math.min(...distances)

    if (minDistance < 2) {
      didYouMean = "Did you mean " + TYPELIST[distances.indexOf(minDistance)] + "?"
    }

    throw new Error(`Unrecognized type ${typename}; valid types are ${TYPELIST.join(', ')}. ${didYouMean}`)
  }
}

export { isValidType, throwInvalidType }
