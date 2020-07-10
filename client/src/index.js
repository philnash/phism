import Video from "twilio-video";
import { getVolume } from "./lib/volume-meter";

let videoTrack, audioTrack;
const videoPreviewDiv = document.getElementById("video-preview");
const canvas = document.getElementById("audio-data");
const ctx = canvas.getContext("2d");
const width = canvas.width;
const height = canvas.height;

const mapRange = (value, x1, y1, x2, y2) =>
  ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;

const pollAudio = (audioTrack) => {
  getVolume(audioTrack, (bufferLength, samples) => {
    ctx.fillStyle = "rgb(255, 255, 255)";
    ctx.fillRect(0, 0, width, height);

    var barWidth = (width / bufferLength) * 2.5;
    var barHeight;
    var x = 0;

    for (var i = 0; i < bufferLength; i++) {
      barHeight = mapRange(samples[i], 0, 255, 0, height * 2);

      ctx.fillStyle = "rgb(" + (barHeight + 100) + ",51,153)";
      ctx.fillRect(x, (height - barHeight / 2) / 2, barWidth, barHeight / 4);
      ctx.fillRect(x, height / 2, barWidth, barHeight / 4);
      x += barWidth + 1;
    }
  });
};

const attachTrack = (div, track) => div.appendChild(track.attach());
const detachTrack = (div, track) => {
  const element =
    track.kind === "audioinput"
      ? div.querySelector("audio")
      : div.querySelector("video");
  element.remove();
};

const createLocalVideoTrack = async (deviceId) => {
  try {
    videoTrack.stop();
    detachTrack(videoPreviewDiv, videoTrack);
    const newVideoTrack = await Video.createLocalVideoTrack({
      deviceId: { exact: deviceId },
    });
    attachTrack(videoPreviewDiv, newVideoTrack);
    videoTrack = newVideoTrack;
  } catch (error) {
    console.error(error);
  }
};

const createLocalAudioTrack = async (deviceId) => {
  try {
    audioTrack.stop();
    const newAudioTrack = await Video.createLocalAudioTrack({
      deviceId: { exact: deviceId },
    });
    audioTrack = newAudioTrack;
    pollAudio(audioTrack);
  } catch (error) {
    console.error(error);
  }
};

const buildDropDown = (options, currentDeviceName) => {
  const select = document.createElement("select");
  options.forEach((opt) => {
    const option = document.createElement("option");
    option.setAttribute("value", opt.deviceId);
    if (opt.label === currentDeviceName) {
      option.setAttribute("selected", "selected");
    }
    option.appendChild(document.createTextNode(opt.label));
    select.appendChild(option);
  });
  return select;
};

window.addEventListener("DOMContentLoaded", () => {
  const previewBtn = document.getElementById("media-preview");
  previewBtn.addEventListener("click", async () => {
    try {
      const tracks = await Video.createLocalTracks({
        video: {
          name: "user-camera",
          facingMode: "user",
        },
        audio: {
          name: "user-audio",
        },
      });
      previewBtn.remove();
      videoTrack = tracks.find((track) => track.kind === "video");
      audioTrack = tracks.find((track) => track.kind === "audio");

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        const audioDevices = devices.filter(
          (device) => device.kind === "audioinput"
        );
        const videoSelect = buildDropDown(
          videoDevices,
          videoTrack.mediaStreamTrack.label
        );
        videoSelect.addEventListener("change", (event) => {
          createLocalVideoTrack(event.target.value);
        });
        const audioSelect = buildDropDown(
          audioDevices,
          audioTrack.mediaStreamTrack.label
        );
        audioSelect.addEventListener("change", (event) => {
          createLocalAudioTrack(event.target.value);
        });

        const cameraSelector = document.getElementById("camera-selector");
        const micSelector = document.getElementById("mic-selector");

        cameraSelector.appendChild(videoSelect);
        micSelector.appendChild(audioSelect);
      } catch (e) {
        console.error(e);
      }

      attachTrack(videoPreviewDiv, videoTrack);
      pollAudio(audioTrack);
    } catch (error) {
      console.error(error);
    }
  });
});
