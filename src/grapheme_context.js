import {Window as GraphemeWindow} from "./grapheme_window";
import * as utils from "./utils";

class GraphemeContext {
  constructor(params={}) {
    this.internalglCanvas = new OffscreenCanvas(256, 256);
    let gl = this.internalglContext = this.internalglCanvas.getContext("webgl") || this.internalglCanvas.getContext("experimental-webgl");

    utils.assert(gl, "Grapheme requires WebGL to run; please get a competent browser");

    this.windows = [];

    this.glInfo = {
      version: gl.getParameter(gl.VERSION)
    };

    this.glShaders = {};
    this.currentViewport = {x: 0, y: 0, width: this.internalCanvasWidth, height: this.internalCanvasHeight};

    utils.CONTEXTS.push(this);
  }

  setViewport(width, height, x=0,y=0, setScissor=true) {
    utils.assert(width > 0 && height > 0, "width and height must be greater than 0");
    utils.assert(x >= 0 && y >= 0, "x and y values must be greater than or equal to 0");
    utils.assert(x + width <= this.internalCanvasWidth && y + height <= this.internalCanvasHeight, "viewport must be within canvas bounds");

    this.currentViewport.x = x;
    this.currentViewport.y = y;

    this.currentViewport.width = width;
    this.currentViewport.height = height;

    let gl = this.internalglContext;

    gl.viewport(x, y, width, height);

    if (setScissor) {
      gl.enable(gl.SCISSOR_TEST);
      this.internalglContext.scissor(x, y, width, height);
    } else {
      gl.disable(gl.SCISSOR_TEST);
    }
  }

  get internalCanvasHeight() {
    return this.internalglCanvas.height;
  }

  get internalCanvasWidth() {
    return this.internalglCanvas.width;
  }

  set internalCanvasHeight(x) {
    x = Math.round(x);

    utils.assert(utils.isPositiveInteger(x) && x < 16384, "canvas height must be in range [1,16383]");
    this.internalglCanvas.height = x;
  }

  set internalCanvasWidth(x) {
    x = Math.round(x);

    utils.assert(utils.isPositiveInteger(x) && x < 16384, "canvas width must be in range [1,16383]");
    this.internalglCanvas.width = x;
  }

  _onDPRChanged() {
    this.windows.forEach(window => window._onDPRChanged());
  }

  isDestroyed() {
    return utils.CONTEXTS.indexOf(this) === 1;
  }

  destroy() {
    let index = utils.CONTEXTS.indexOf(this);

    index !== -1 && utils.CONTEXTS.splice(index, 1);
  }

  createWindow() {
    return new GraphemeWindow(this);
  }

  updateSize() {
    let maxWidth = 1;
    let maxHeight = 1;

    this.windows.forEach(window => {
      if (window.canvasWidth > maxWidth) {
        maxWidth = window.canvasWidth;
      }

      if (window.canvasHeight > maxHeight) {
        maxHeight = window.canvasHeight;
      }
    });

    this.internalCanvasHeight = maxHeight;
    this.internalCanvasWidth = maxWidth;
  }
}

export {GraphemeContext as Context};
