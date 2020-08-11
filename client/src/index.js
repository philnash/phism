import Video, { LocalVideoTrack, LocalDataTrack } from "twilio-video";
import { VideoChat } from "./lib/video-chat";
import { hideElements, showElements } from "./lib/utils";
import LocalPreview from "./lib/localPreview";

let videoTrack,
  audioTrack,
  localPreview,
  screenTrack,
  dataTrack,
  reactionListener,
  videoChat;
const videoPreviewDiv = document.getElementById("video-preview");

const setupTrackListeners = (track, button, enableLabel, disableLabel) => {
  button.innerText = track.isEnabled ? disableLabel : enableLabel;
  track.on("enabled", () => {
    button.innerText = disableLabel;
  });
  track.on("disabled", () => {
    button.innerText = enableLabel;
  });
};

window.addEventListener("DOMContentLoaded", () => {
  const previewBtn = document.getElementById("media-preview");
  const startDiv = document.querySelector(".start");
  const videoChatDiv = document.getElementById("video-chat");
  const screenDiv = document.getElementById("screen");
  const joinForm = document.getElementById("join-room");
  const disconnectBtn = document.getElementById("disconnect");
  const screenShareBtn = document.getElementById("screen-share");
  const muteBtn = document.getElementById("mute-self");
  const disableVideoBtn = document.getElementById("disable-video");
  const reactionsList = document.getElementById("reactions");
  const reactions = Array.from(reactionsList.querySelectorAll("button")).map(
    (btn) => btn.innerText
  );

  const detachTrack = (track) => {
    if (track.kind !== "data") {
      const mediaElements = track.detach();
      mediaElements.forEach((mediaElement) => mediaElement.remove());
      if (track.name === "user-screen") {
        hideElements(screenDiv);
        videoChatDiv.classList.remove("screen-share");
      }
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
      showElements(joinForm);
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

      localPreview = new LocalPreview(videoTrack, audioTrack);
      localPreview.addEventListener("new-video-track", (event) => {
        videoTrack = event.detail;
        setupTrackListeners(
          event.detail,
          disableVideoBtn,
          "Enable video",
          "Disable video"
        );
      });
      localPreview.addEventListener("new-audio-track", (event) => {
        audioTrack = event.detail;
        setupTrackListeners(event.detail, muteBtn, "Unmute", "Mute");
      });
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
    videoChat = new VideoChat(
      token,
      roomName,
      { videoTrack, audioTrack, dataTrack },
      reactions
    );
    if (!("getDisplayMedia" in navigator.mediaDevices)) {
      screenShareBtn.remove();
    }
    showElements(videoChatDiv);
    localPreview.hide();

    videoChat.addEventListener("data-track-published", (event) => {
      const localParticipant = event.detail.participant;
      showElements(reactionsList);
      const showReaction = videoChat.messageReceived(localParticipant);
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
    if (!videoChat) {
      return;
    }
    videoChat.disconnect();
    if (screenTrack) {
      stopScreenSharing();
    }
    hideElements(videoChatDiv, reactionsList);
    reactionsList.removeEventListener("click", reactionListener);
    localPreview.show();
    showElements(joinForm);
    videoChat = null;
  });

  const stopScreenSharing = () => {
    detachTrack(screenTrack);
    videoChat.stopScreenShare(screenTrack);
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
        videoChat.startScreenShare(screenTrack);
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
