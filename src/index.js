import Video from "twilio-video";
import { pollAudioLevel } from "./lib/poll-audio";

window.addEventListener("DOMContentLoaded", () => {
  console.log(Video.isSupported);
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

      console.log(tracks);

      const videoTrack = tracks.find((track) => track.kind === "video");
      const audioTrack = tracks.find((track) => track.kind === "audio");
      const videoPreviewDiv = document.getElementById("video-preview");
      const audioPreviewDiv = document.getElementById("audio-preview");
      const volumeMeter = audioPreviewDiv.querySelector("div");
      videoPreviewDiv.appendChild(videoTrack.attach());

      pollAudioLevel(audioTrack, (level) => {
        volumeMeter.style.height = `${level * 10}px`;
      });
    } catch (error) {
      console.error(error);
    }
  });
});
