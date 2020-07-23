import Video from "twilio-video";

let room, container, dominantSpeaker;
let reactions = [];
let participantItems = new Map();

export const initChat = async (
  token,
  roomName,
  localTracks,
  participantsContainer,
  allowedReactions
) => {
  container = participantsContainer;
  reactions = allowedReactions;
  room = await Video.connect(token, {
    name: roomName,
    tracks: localTracks,
    dominantSpeaker: true,
  });
  participantConnected(room.localParticipant);
  room.on("participantConnected", participantConnected);
  room.on("participantDisconnected", participantDisconnected);
  room.participants.forEach(participantConnected);
  room.on("disconnected", disconnected);
  room.on("dominantSpeakerChanged", (participant) => {
    if (dominantSpeaker) {
      participantItems.get(dominantSpeaker.sid).classList.remove("dominant");
    }
    let participantItem;
    if (participant) {
      participantItem = participantItems.get(participant.sid);
      dominantSpeaker = participant;
    } else {
      participantItem = participantItems.get(room.localParticipant.sid);
      dominantSpeaker = room.localParticipant;
    }
    participantItem.classList.add("dominant");
  });
  window.addEventListener("beforeunload", tidyUp);
  window.addEventListener("pagehide", tidyUp);
  return room;
};

export const messageReceived = (participant) => {
  const participantItem = participantItems.get(participant.sid);
  const reactionDiv = participantItem.querySelector(".reaction");
  let reactionCount = 0;
  let timeout;
  return (message) => {
    const data = JSON.parse(message);
    if (data.action === "reaction" && reactions.includes(data.reaction)) {
      const reaction = data.reaction;
      if (timeout) {
        clearTimeout(timeout);
      }
      if (reactionDiv.innerText === reaction) {
        if (reactionCount < 5) {
          reactionDiv.classList.remove(`size-${reactionCount}`);
          reactionCount += 1;
          reactionDiv.classList.add(`size-${reactionCount}`);
        }
      } else {
        reactionDiv.innerText = reaction;
        reactionDiv.classList.remove(`size-${reactionCount}`);
        reactionCount = 1;
        reactionDiv.classList.add(`size-${reactionCount}`);
      }
      timeout = setTimeout(() => {
        reactionDiv.innerText = "";
        reactionDiv.classList.remove(`size-${reactionCount}`);
        reactionCount = 0;
      }, 5000);
    }
  };
};

const trackSubscribed = (participant) => {
  return (track) => {
    const item = participantItems.get(participant.sid);
    const wrapper = item.querySelector(".video-wrapper");
    const info = item.querySelector(".info");
    if (track.kind === "video") {
      const videoElement = track.attach();
      wrapper.appendChild(videoElement);
    } else if (track.kind === "audio") {
      const audioElement = track.attach();
      wrapper.appendChild(audioElement);
      const mutedHTML = document.createElement("p");
      mutedHTML.appendChild(document.createTextNode("🔇"));
      if (!track.isEnabled) {
        info.appendChild(mutedHTML);
      }
      track.on("enabled", () => {
        mutedHTML.remove();
      });
      track.on("disabled", () => {
        info.appendChild(mutedHTML);
      });
    } else if (track.kind === "data") {
      const reactionDiv = document.createElement("div");
      reactionDiv.classList.add("reaction");
      wrapper.appendChild(reactionDiv);
      track.on("message", messageReceived(participant));
    }
  };
};

const trackPublished = (participant) => {
  return (trackPub) => {
    if (trackPub.track) {
      trackSubscribed(participant)(trackPub.track);
    }
    trackPub.on("subscribed", trackSubscribed(participant));
    trackPub.on("unsubscribed", trackUnsubcribed);
  };
};

const trackUnsubcribed = (track) => {
  if (track.kind !== "data") {
    const mediaElements = track.detach();
    mediaElements.forEach((mediaElement) => mediaElement.remove());
  }
};

const trackUnpublished = (trackPub) => {
  if (trackPub.track) {
    trackUnscribed(trackPub.track);
  }
};

const setRowsAndColumns = (room) => {
  const numberOfParticipants = Array.from(room.participants.keys()).length + 1;
  let rows, cols;
  if (numberOfParticipants === 1) {
    rows = 1;
    cols = 1;
  } else if (numberOfParticipants === 2) {
    rows = 1;
    cols = 2;
  } else if (numberOfParticipants < 5) {
    rows = 2;
    cols = 2;
  } else if (numberOfParticipants < 7) {
    rows = 2;
    cols = 3;
  } else {
    rows = 3;
    cols = 3;
  }
  container.style.setProperty("--grid-rows", rows);
  container.style.setProperty("--grid-columns", cols);
};

const participantConnected = (participant) => {
  const participantItem = document.createElement("li");
  participantItem.setAttribute("id", participant.sid);
  const wrapper = document.createElement("div");
  wrapper.classList.add("video-wrapper");
  const info = document.createElement("div");
  info.classList.add("info");
  wrapper.appendChild(info);
  participantItem.appendChild(wrapper);
  container.appendChild(participantItem);
  setRowsAndColumns(room);
  participantItems.set(participant.sid, participantItem);
  participant.tracks.forEach(trackPublished(participant));
  participant.on("trackPublished", trackPublished(participant));
  participant.on("trackUnpublished", trackUnpublished);
};

const participantDisconnected = (participant) => {
  const item = participantItems.get(participant.sid);
  item.remove();
  participantItems.delete(participant.sid);
  setRowsAndColumns(room);
};

const disconnected = (room, error) => {
  if (error) {
    console.error(error);
  }
  participantItems.forEach((item, sid) => {
    item.remove();
    participantItems.delete(sid);
  });
  room = null;
};

const tidyUp = (event) => {
  if (event.persisted) {
    return;
  }
  if (room) {
    room.disconnect();
    room = null;
  }
};
