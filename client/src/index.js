import Video, { LocalVideoTrack, LocalDataTrack } from "twilio-video";
import { pollAudio } from "./lib/volume-meter";
import { initChat } from "./lib/video-chat";

let videoTrack,
  videoPreview,
  audioTrack,
  screenTrack,
  dataTrack,
  room,
  stopPolling;
const localPreview = document.getElementById("local-preview");
const videoPreviewDiv = document.getElementById("video-preview");
const canvas = document.getElementById("audio-data");

const attachTrack = (div, track) => {
  const mediaElement = track.attach();
  div.appendChild(mediaElement);
  return mediaElement;
};
const detachTrack = (track) => {
  if (track.kind !== "data") {
    const mediaElements = track.detach();
    mediaElements.forEach((mediaElement) => mediaElement.remove());
  }
};

const createLocalVideoTrack = async (deviceId) => {
  try {
    if (room) {
      room.localParticipant.unpublishTrack(videoTrack);
    }
    videoTrack.stop();
    detachTrack(videoTrack);
    const newVideoTrack = await Video.createLocalVideoTrack({
      deviceId: { exact: deviceId },
    });
    videoPreview = attachTrack(videoPreviewDiv, newVideoTrack);
    videoTrack = newVideoTrack;
    if (room) {
      room.localParticipant.publishTrack(videoTrack);
    }
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
    stopPolling = await pollAudio(audioTrack, canvas);
    console.log(stopPolling);
  } catch (error) {
    console.error(error);
  }
};

const hidePreview = () => {
  localPreview.setAttribute("hidden", "hidden");
  videoPreview.pause();
  if (stopPolling) {
    stopPolling();
    stopPolling = null;
  }
};

const showPreview = async () => {
  stopPolling = await pollAudio(audioTrack, canvas);
  videoPreview.play();
  localPreview.removeAttribute("hidden");
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
  const joinForm = document.getElementById("join-room");
  const participants = document.getElementById("participants");
  const liveControls = document.querySelector(".controls .live");
  const disconnectBtn = document.getElementById("disconnect");
  const screenShareBtn = document.getElementById("screen-share");
  const reactions = document.getElementById("reactions");
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
      joinForm.removeAttribute("hidden");
      videoTrack = tracks.find((track) => track.kind === "video");
      audioTrack = tracks.find((track) => track.kind === "audio");
      dataTrack = new LocalDataTrack({ name: "user-data" });

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

      videoPreview = attachTrack(videoPreviewDiv, videoTrack);
      stopPolling = await pollAudio(audioTrack, canvas);
    } catch (error) {
      console.error(error);
    }
  });

  joinForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const inputs = joinForm.querySelectorAll("input");
    const data = {};
    inputs.forEach((input) => (data[input.getAttribute("name")] = input.value));
    const { token, identity, roomName } = await fetch(
      joinForm.getAttribute("action"),
      {
        method: joinForm.getAttribute("method"),
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.json());
    joinForm.setAttribute("hidden", "hidden");
    // initChat(token, roomName, [videoTrack, audioTrack, dataTrack], participants);
    room = await initChat(
      token,
      roomName,
      [videoTrack, dataTrack],
      participants
    );
    hidePreview();
    liveControls.removeAttribute("hidden");
    room.localParticipant.on("trackPublished", (track) => {
      if (track.kind === "data") {
        reactions.removeAttribute("hidden");
      }
    });
  });

  disconnectBtn.addEventListener("click", () => {
    if (!room) {
      return;
    }
    room.disconnect();
    if (screenTrack) {
      stopScreenSharing();
    }
    liveControls.setAttribute("hidden", "hidden");
    reactions.setAttribute("hidden", "hidden");
    showPreview();
    joinForm.removeAttribute("hidden");
    room = null;
  });

  const stopScreenSharing = () => {
    detachTrack(screenTrack);
    room.localParticipant.unpublishTrack(screenTrack);
    screenTrack.stop();
    screenTrack = null;
    screenShareBtn.innerText = "Share screen";
  };

  screenShareBtn.addEventListener("click", async () => {
    if (screenTrack) {
      stopScreenSharing();
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia();
        console.log(screenStream);
        screenTrack = new LocalVideoTrack(screenStream.getTracks()[0], {
          name: "user-screen",
        });
        room.localParticipant.publishTrack(screenTrack);
        attachTrack(videoPreviewDiv, screenTrack);
        screenShareBtn.innerText = "Stop sharing";
      } catch (error) {
        console.error(error);
      }
    }
  });

  reactions.addEventListener("click", (event) => {
    if (event.target.nodeName === "BUTTON") {
      dataTrack.send(event.target.innerText);
    }
  });
});
