// https://medium.com/@joehanson/multi-user-javascript-virtual-whiteboard-28e4b24ef3e2
// https://github.com/pubnub/codoodler/blob/master/js/app.js

const isTouchSupported = "ontouchstart" in window;
const isPointerSupported = navigator.pointerEnabled;
const downEvent = isTouchSupported
  ? "touchstart"
  : isPointerSupported
  ? "pointerdown"
  : "mousedown";
const moveEvent = isTouchSupported
  ? "touchmove"
  : isPointerSupported
  ? "pointermove"
  : "mousemove";
const upEvent = isTouchSupported
  ? "touchend"
  : isPointerSupported
  ? "pointerup"
  : "mouseup";

export class Whiteboard extends EventTarget {
  constructor(container) {
    super();
    this.container = container;
    this.wrapper = document.createElement("div");
    this.wrapper.classList.add("whiteboard-wrapper");
    this.canvas = document.createElement("canvas");
    this.canvas.classList.add("whiteboard-canvas");
    this.canvas.width = 4000;
    this.canvas.height = 3000;
    this.context = this.canvas.getContext("2d");
    this.context.fillStyle = "#ffffff";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.lines = [];
    this.plots = [];
    this.startDrawing = this.startDrawing.bind(this);
    this.endDrawing = this.endDrawing.bind(this);
    this.draw = this.draw.bind(this);
    this.canvas.addEventListener(downEvent, this.startDrawing, false);
    this.canvas.addEventListener(moveEvent, this.draw, false);
    this.canvas.addEventListener(upEvent, this.endDrawing, false);
    this.wrapper.appendChild(this.canvas);
    this.container.appendChild(this.wrapper);
    this.setRatios();
    this.drawOnCanvas = this.drawOnCanvas.bind(this);
  }

  drawOnCanvas(plots) {
    this.context.strokeStyle = "#000000";
    this.context.lineWidth = "30";
    this.context.lineCap = this.context.lineJoin = "round";
    this.context.beginPath();
    if (plots.length > 0) {
      this.context.moveTo(plots[0].x, plots[0].y);
      plots.forEach((plot) => {
        this.context.lineTo(plot.x, plot.y);
      });
      this.context.stroke();
    }
  }

  startDrawing(event) {
    event.preventDefault();
    this.setRatios();
    this.isDrawing = true;
  }

  draw(event) {
    event.preventDefault();
    if (!this.isDrawing) {
      return;
    }

    let x = isTouchSupported
      ? event.targetTouches[0].pageX - this.canvas.offsetLeft
      : event.offsetX || event.layerX - this.canvas.offsetLeft;
    let y = isTouchSupported
      ? event.targetTouches[0].pageY - this.canvas.offsetTop
      : event.offsetY || event.layerY - this.canvas.offsetTop;
    x = x * this.widthScale;
    y = y * this.heightScale;

    this.plots.push({ x: x << 0, y: y << 0 });

    this.drawOnCanvas(this.plots);
  }

  endDrawing(event) {
    event.preventDefault();
    this.isDrawing = false;
    const plotsCopy = [...this.plots];
    const drawingEvent = new CustomEvent("draw", {
      detail: {
        plots: plotsCopy,
      },
    });
    this.dispatchEvent(drawingEvent);
    this.saveLine(plotsCopy);
    this.plots = [];
  }

  saveLine(line) {
    this.lines.push(line);
  }

  destroy() {
    this.canvas.remove();
    this.wrapper.remove();
    this.lines = [];
  }

  setRatios() {
    this.clientRect = this.canvas.getBoundingClientRect();
    this.widthScale = this.canvas.width / this.clientRect.width;
    this.heightScale = this.canvas.height / this.clientRect.height;
  }
}
