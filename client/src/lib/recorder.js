export class Recorder {
  constructor(tracks, identity) {
    this.identity = identity;
    this.stream = new MediaStream(tracks);
    this.mimeType = "video/webm";
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream, { type: this.mimeType });
    this.recorder.addEventListener(
      "dataavailable",
      this.handleDataAvailable.bind(this)
    );
    this.recorder.addEventListener("stop", this.handleRecordingStop.bind(this));
  }

  start() {
    this.recorder.start(1000);
    this.timeStarted = new Date();
  }

  stop() {
    this.recorder.stop();
  }

  handleDataAvailable(event) {
    if (typeof event.data === "undefined") return;
    if (event.data.size === 0) return;
    this.chunks.push(event.data);
    const data = new FormData();
    data.append("video-part", event.data);
    data.append("identity", this.identity);
    data.append("timeStarted", this.timeStarted.toISOString());
    fetch("/recordings", {
      method: "POST",
      body: data,
    });
  }

  handleRecordingStop() {
    const data = new FormData();
    data.append("identity", this.identity);
    data.append("timeStarted", this.timeStarted.toISOString());
    fetch("/recordings", {
      method: "POST",
      body: data,
    });
  }
}
