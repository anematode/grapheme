import { Module } from "../cpp/grapheme_wasm.js"

const Real = Module.Real

class OvinusReal extends Real {
  constructor(value="0", precision=53) {
    super(precision)

    this.set_value(value)
  }

  get value() {
    return this.get_value();
  }

  set value(v) {
    this.set_value(v)
  }

  set_value(v) {
    if (typeof v === "string") {
      this.set_value_from_string(v)
    } else if (v instanceof Real) {
      this.set_value_from_real(v)
    } else {
      this.set_value_from_float(v)
    }
  }
}

export {OvinusReal as Real, Module}
