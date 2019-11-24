# The Pipeline

Most pipelines contain some sort of fluid, be it natural gas, crude oil, or sewage. Grapheme's pipeline contains images and pixels.

The Grapheme rendering pipeline is designed to be speedy, while also permitting the asynchronous rendering of frames and ability to compute intensive functions in a non-blocking way. Instead of Desmos's method of both reducing quality and framerate when drawing these functions, Grapheme will allow this to be controlled. If a function is extremely intensive to evaluate (ex: some sort of Mandelbrot-like fractal), a low resolution image of it will be drawn at the default setting. If the user wants a high quality image, they tell Grapheme to do so and it happily completes in a few minutes.

WebAssembly will likely play a role in the future, but not for now because transferring arrays between C++ and JS is a nightmare.

### Context

Associated with each Grapheme.Context is one [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) instance (context.internalglCanvas), used for WebGL funkiness. This is because most of the heavy duty graphics of Grapheme will be done using WebGL, while text and other decorations will be placed on top in Grapheme.Window. Also, having only one WebGL context means that multiple windows can be created, since the number of WebGL contexts is capped by the browser.

When a Grapheme.Window desires to be drawn, it calls for its parent Grapheme.Context: "O Context, how I desire to be drawn! I have many methods to describe my drawing! Please, fatten your canvases if I am too large, then let me get to work."

In other words, if window.height > context.internalCanvasHeight || window.width > context.internalCanvasWidth, the context must fatten itself.

Grapheme.Window says, "thank you dear parent." It lets the parent know in what region it will want to draw (setting variables context.internalViewportHeight and context.internalViewportWidth), and the parent will set the viewport to that size. Then, Grapheme.Window gets to work, using the mother's gl context (context.internalglContext) to draw various things. Then, the window copies the desired section of the internalglCanvas to its own glCanvas. It proceeds to draw text and whatever paraphernalia on its own 2D canvas.

GL shaders and such for classes should (usually) be compiled and put in context.glShaders . Hopefully TWGL will make this easier.

If it's important, all of this information is scaled with device pixel ratio, so implementation code won't have to think about all that (though it will have to call a function when it's trying to draw something with a specific pixel scale).
