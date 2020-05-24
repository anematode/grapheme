// Inspired by tween.js.

function interpolate(object) {
  return {
    to: ()
  }
}

function updateInterpolations() {

  update()

  requestAnimationFrame(updateInterpolations)
}


export { interpolate }
