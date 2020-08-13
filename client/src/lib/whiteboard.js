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
    this.canvas = document.createElement("canvas");
    this.canvas.width = 600;
    this.canvas.height = 600;
    this.context = this.canvas.getContext("2d");
    this.context.strokeStyle = "#ffffff";
    this.context.lineWidth = "3";
    this.context.lineCap = this.context.lineJoin = "round";
    this.lines = [];
    this.plots = [];
    this.startDrawing = this.startDrawing.bind(this);
    this.endDrawing = this.endDrawing.bind(this);
    this.draw = this.draw.bind(this);
    this.canvas.addEventListener(downEvent, this.startDrawing, false);
    this.canvas.addEventListener(moveEvent, this.draw, false);
    this.canvas.addEventListener(upEvent, this.endDrawing, false);
    container.appendChild(this.canvas);
  }

  drawOnCanvas(plots) {
    // this.context.strokeStyle = color;
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
    this.isDrawing = true;
  }

  draw(event) {
    event.preventDefault();
    if (!this.isDrawing) {
      return;
    }

    const x = isTouchSupported
      ? event.targetTouches[0].pageX - this.canvas.offsetLeft
      : event.offsetX || event.layerX - this.canvas.offsetLeft;
    const y = isTouchSupported
      ? event.targetTouches[0].pageY - this.canvas.offsetTop
      : event.offsetY || event.layerY - this.canvas.offsetTop;

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
    this.lines = [];
  }
}
