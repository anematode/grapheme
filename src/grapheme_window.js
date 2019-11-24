import * as utils from "./utils";
import {rgba} from "./color";

/** A grapheme window is an actual viewable instance of Grapheme.
That is, it is a div that can be put into the DOM and manipulated (and seen).

Properties:
domElement = the div that the user adds to the webpage
glCanvas = the bitmap canvas that gl stuff is copied to
textCanvas = the canvas that text and stuff is done on
context = the parent Grapheme.Context of this window
glCanvasContext = the ImageBitmapRenderingContext associated with the glCanvas
textCanvasContext = the Canvas2DRenderingContext associated with the textCanvas
*/
class GraphemeWindow {
  constructor(graphemeContext, params={}) {
    this.context = graphemeContext;

    this.domElement = document.createElement("div");

    this.mainCanvas = document.createElement("canvas");
    this.domElement.appendChild(this.mainCanvas);
    this.textCanvas = document.createElement("canvas");
    this.domElement.appendChild(this.textCanvas);

    this.mainCanvas.classList.add("grapheme-canvas");
    this.textCanvas.classList.add("grapheme-text-canvas");
    this.domElement.classList.add("grapheme-window");

    this.mainCanvasContext = this.mainCanvas.getContext("bitmaprenderer");
    this.textCanvasContext = this.textCanvas.getContext("2d");
    this.clearColor = rgba(0,0,0,0);

    this.elements = [];
    this.elementInfo = {
      context: this.context,
      text: this.textCanvasContext,
      textCanvas: this.textCanvas
    };

    graphemeContext.windows.push(this);

    this.setSize(640, 480);
  }

  addElement(element) {
    this.elements.push(element);
  }

  setSize(width, height) {
    this.clientWidth = width;
    this.clientHeight = height;

    this._updateCanvasSize();

    [this.mainCanvas, this.textCanvas].forEach(canvas => {
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
    });

    this.context.updateSize();
  }

  _updateCanvasSize() {
    this.canvasWidth = this.clientWidth * utils.dpr;
    this.canvasHeight = this.clientHeight * utils.dpr;
  }

  get canvasWidth() {
    return this.mainCanvas.width;
  }

  get canvasHeight() {
    return this.mainCanvas.height;
  }

  set canvasWidth(x) {
    x = Math.round(x);
    utils.assert(utils.isPositiveInteger(x) && x < 16384, "canvas width must be in range [1,16383]");

    this.mainCanvas.width = x;
    this.textCanvas.width = x;
  }

  set canvasHeight(x) {
    x = Math.round(x);
    utils.assert(utils.isPositiveInteger(x) && x < 16384, "canvas height must be in range [1,16383]");

    this.mainCanvas.height = x;
    this.textCanvas.height = x;
  }

  _onDPRChanged() {
    this._updateCanvasWidth();
  }

  destroy() {
    try {
      this.domElement.parentNode.remove(this.domElement);
    } catch (e) {;}

    let allWindows = this.context.windows;
    let thisIndex = allWindows.indexOf(this);

    if (thisIndex !== -1) {
      allWindow.splice(thisIndex, 1);
    }

    this.context.updateSize();
  }

  isActive() {
    return (this.context.activeWindow === this);
  }

  clearToColor(color=this.clearColor) {
    utils.assert(this.isActive(), "Window is not currently being rendered");

    // color.r, color.g, color.b, color.a
    let glColor = color.glColor();

    let gl = this.context.glContext;

    gl.clearColor(glColor.r, glColor.g, glColor.b, glColor.a);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  sortElementsByPrecedence() {
    this.elements.sort((x, y) => (x.precedence - y.precedence));
  }

  render() {
    this.context.activeWindow = this;
    let err;

    let gl = this.context.glContext;
    let glCanvas = this.context.glCanvas;

    let width = this.canvasWidth, height = this.canvasHeight;

    try {
      // Set the viewport to this canvas's size
      this.context.setViewport(width, height);

      // clear the canvas
      this.clearToColor();

      // sort our elements by drawing precedence
      this.sortElementsByPrecedence();

      this.elementInfo.width = width;
      this.elementInfo.height = height;

      // draw each element
      for (let i = 0; i < this.elements.length; ++i) {
        let element = this.elements[i];

        element.render(this.elementInfo);
      }

      // Copy the canvas to this canvas
      let glBitmap = glCanvas.transferToImageBitmap();
      this.mainCanvasContext.transferFromImageBitmap(glBitmap);
    } catch (e) {
      err = e;
    } finally {
      this.context.activeWindow = null;
    }

    if (err) throw err;
  }
}

export {GraphemeWindow as Window};
