
// Abstraction of a concrete type--an actual class of JS object or primitive used in calculations. For example, a bool
// and a number are both primitives, while a Grapheme.FastRealInterval is an object. Both are concrete types, although
// a number and FastRealinterval may both represent the abstract type "real". (See below)
export class ConcreteType {
  constructor (params={}) {
    this.name = params.name

    // Whether the type is a primitive, and thus whether it can be "written to"
    this.isPrimitive = !!params.isPrimitive

    // FUNCTION which, when called, returns a new instance of the type
    this.init = params.init ?? null

    if (this.init == null) {
      throw new Error("No default initializer provided for concrete type")
    }

    // Default value
    this.defaultValue = this.init()

    // STRING which, when evaled, returns a new instance of the type (used for primitives only)
    this.initStr = params.initStr ?? null

    // Returns true if the passed parameter is of this type
    this.typecheck = params.typecheck ?? null

    // Returns a verbose error message if the passed parameter is not of this type, otherwise an empty string
    this.typecheckVerbose = params.typecheckVerbose ?? null

    // Returns true if the passed parameter is considered defined. For example, Complex(0, NaN) would give false
    this.isDefined = params.isDefined ?? null

    // FUNCTION which, when called with a single argument, deep clones the type. Only used for non-primitives
    this.clone = params.clone ?? (x => x)

    // FUNCTION which, when called with two arguments src and dst, deep copies the contents of src to dst. Only used
    // for non-primitives
    this.copyTo = params.copyTo ?? null

    this.fillDefaults()
  }

  // Convenience method to avoid duplicate code for primitives
  fillDefaults () {
    if (this.isPrimitive) {
      if (!this.init || !this.initStr) {
        let init, initStr

        if (typeof this.defaultValue === "number") { // nullable booleans, ints, and reals are all represented by a JS number
          init = () => 0;
          initStr = "0";
        } else {
          throw new Error("Invalid primitive")
        }

        this.init = init
        this.initStr = initStr
      }
    }
  }

  isSameConcreteType (concreteType) {
    return this.name === concreteType.name
  }

  toHashStr () {
    return this.name
  }

  prettyPrint () {
    return this.name
  }
}

// Abstraction of a type. An expression or subexpression has a type. In the future we might want generics, so we use a
// class instead of a string. Note the distinction between this "type" and the concrete types used underneath. For
// example, "complex" is a type, while the Grapheme.Complex class is a concrete type. The unqualified word "type" refers
// to the former; "concrete type" is used in the latter case.
export class MathematicalType {
  constructor (params={}) {
    // Name of the type
    this.name = params.name

    this.concreteTypes = params.concreteTypes ?? {}
  }

  getConcreteType (evalMode) {
    return this.concreteTypes[evalMode]
  }

  isSameType (type) {
    return this.name === type.name
  }

  // Used for dictionary lookups (may change l8r)
  toHashStr () {
    return this.name
  }

  prettyPrint () {
    return this.name
  }
}
