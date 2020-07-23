import Video, { LocalVideoTrack, LocalDataTrack } from "twilio-video";
import { pollAudio } from "./lib/volume-meter";
import { initChat, messageReceived } from "./lib/video-chat";
import { hideElements, showElements } from "./lib/utils";

let videoTrack,
  videoPreview,
  audioTrack,
  screenTrack,
  dataTrack,
  room,
  stopPolling,
  reactionListener;
let choosingVideo = false;
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

const setupTrackListeners = (track, button, enableLabel, disableLabel) => {
  button.innerText = track.isEnabled ? disableLabel : enableLabel;
  track.on("enabled", () => {
    button.innerText = disableLabel;
  });
  track.on("disabled", () => {
    button.innerText = enableLabel;
  });
};

const hidePreview = () => {
  hideElements(localPreview);
  videoPreview.pause();
  if (stopPolling) {
    stopPolling();
    stopPolling = null;
  }
};

const showPreview = async () => {
  stopPolling = await pollAudio(audioTrack, canvas);
  videoPreview.play();
  showElements(localPreview);
};

const buildDropDown = (labelText, options, currentDeviceName) => {
  const label = document.createElement("label");
  label.appendChild(document.createTextNode(labelText));
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
  label.appendChild(select);
  return label;
};

window.addEventListener("DOMContentLoaded", () => {
  const previewBtn = document.getElementById("media-preview");
  const startDiv = document.querySelector(".start");
  const videoChatDiv = document.getElementById("video-chat");
  const joinForm = document.getElementById("join-room");
  const participants = document.getElementById("participants");
  const liveControls = document.querySelector(".live-controls");
  const disconnectBtn = document.getElementById("disconnect");
  const screenShareBtn = document.getElementById("screen-share");
  const muteBtn = document.getElementById("mute-self");
  const disableVideoBtn = document.getElementById("disable-video");
  const reactionsList = document.getElementById("reactions");
  const reactions = Array.from(reactionsList.querySelectorAll("button")).map(
    (btn) => btn.innerText
  );
  const createLocalVideoTrack = async (deviceId) => {
    if (choosingVideo) {
      return;
    }
    choosingVideo = true;
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
      setupTrackListeners(
        videoTrack,
        disableVideoBtn,
        "Enable video",
        "Disable video"
      );
      if (room) {
        room.localParticipant.publishTrack(videoTrack);
      }
      choosingVideo = false;
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
      setupTrackListeners(audioTrack, muteBtn, "Unmute", "Mute");
      stopPolling = await pollAudio(audioTrack, canvas);
    } catch (error) {
      console.error(error);
    }
  };

  previewBtn.addEventListener("click", async () => {
    hideElements(startDiv);
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
      startDiv.remove();
      showElements(localPreview, joinForm);
      videoTrack = tracks.find((track) => track.kind === "video");
      audioTrack = tracks.find((track) => track.kind === "audio");
      dataTrack = new LocalDataTrack({ name: "user-data" });

      setupTrackListeners(audioTrack, muteBtn, "Unmute", "Mute");
      setupTrackListeners(
        videoTrack,
        disableVideoBtn,
        "Enable video",
        "Disable video"
      );

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        const audioDevices = devices.filter(
          (device) => device.kind === "audioinput"
        );
        const videoSelect = buildDropDown(
          "Choose camera",
          videoDevices,
          videoTrack.mediaStreamTrack.label
        );
        videoSelect.addEventListener("change", (event) => {
          createLocalVideoTrack(event.target.value);
        });
        const audioSelect = buildDropDown(
          "Choose microphone",
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
      showElements(startDiv);
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
    hideElements(joinForm);
    room = await initChat(
      token,
      roomName,
      { videoTrack, audioTrack, dataTrack },
      participants,
      reactions
    );
    if (!("getDisplayMedia" in navigator.mediaDevices)) {
      screenShareBtn.remove();
    }
    showElements(videoChatDiv);
    hidePreview();

    room.localParticipant.on("trackPublished", (track) => {
      if (track.kind === "data") {
        showElements(reactionsList);
      }
      const showReaction = messageReceived(room.localParticipant);
      reactionListener = (event) => {
        if (
          event.target.nodeName === "BUTTON" &&
          reactions.includes(event.target.innerText)
        ) {
          const message = JSON.stringify({
            action: "reaction",
            reaction: event.target.innerText,
          });
          dataTrack.send(message);
          showReaction(message);
        }
      };
      reactionsList.addEventListener("click", reactionListener);
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
    hideElements(videoChatDiv, reactionsList);
    reactionsList.removeEventListener("click", reactionListener);
    showPreview();
    showElements(joinForm);
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
        const track = screenStream.getTracks()[0];
        screenTrack = new LocalVideoTrack(track, {
          name: "user-screen",
        });
        room.localParticipant.publishTrack(screenTrack);
        attachTrack(videoPreviewDiv, screenTrack);
        track.addEventListener("ended", stopScreenSharing);
        screenShareBtn.innerText = "Stop sharing";
      } catch (error) {
        console.error(error);
      }
    }
  });

  const unMuteOnSpaceBarDown = (event) => {
    if (event.keyCode === 32) {
      audioTrack.enable();
    }
  };

  const muteOnSpaceBarUp = (event) => {
    if (event.keyCode === 32) {
      audioTrack.disable();
    }
  };

  muteBtn.addEventListener("click", () => {
    if (audioTrack.isEnabled) {
      audioTrack.disable();
      document.addEventListener("keydown", unMuteOnSpaceBarDown);
      document.addEventListener("keyup", muteOnSpaceBarUp);
    } else {
      audioTrack.enable();
      document.removeEventListener("keydown", unMuteOnSpaceBarDown);
      document.removeEventListener("keyup", muteOnSpaceBarUp);
    }
  });

  disableVideoBtn.addEventListener("click", () => {
    if (videoTrack.isEnabled) {
      videoTrack.disable();
    } else {
      videoTrack.enable();
    }
  });
});
