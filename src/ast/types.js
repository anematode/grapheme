// Types: "bool", "int", "real", "complex", "vec2", "vec3", "vec4", "mat2", "mat3", "mat4", "real_list", "complex_list", "real_interval", "complex_interval"

const TYPES = ["bool", "int", "real", "complex", "vec2", "vec3", "vec4", "mat2", "mat3", "mat4", "real_list", "complex_list"]



function isValidType(typename) {
  return TYPES.includes(typename)
}

function throwInvalidType(typename) {
  if (!isValidType(typename)) {

    let didYouMean = ""

    let distances = TYPES.map(type => levenshtein(typename, type))
    let minDistance = Math.min(...distances)

    if (minDistance < 2) {
      didYouMean = "Did you mean " + TYPES[distances.indexOf(minDistance)] + "?"
    }

    throw new Error(`Unrecognized type ${typename}; valid types are ${TYPES.join(', ')}. ${didYouMean}`)
  }
}
