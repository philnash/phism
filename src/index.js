import Video from "twilio-video";
import { pollAudioLevel } from "./lib/poll-audio";

let videoTrack, audioTrack;
const videoPreviewDiv = document.getElementById("video-preview");
const audioPreviewDiv = document.getElementById("audio-preview");
const volumeMeter = audioPreviewDiv.querySelector("div");

const pollAudio = (audioTrack) => {
  pollAudioLevel(audioTrack, (level) => {
    volumeMeter.style.height = `${level * 10}px`;
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
