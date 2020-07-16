import Video from "twilio-video";

let room;
let container;
let participantItems = new Map();

export const initChat = async (
  token,
  roomName,
  localTracks,
  participantsContainer
) => {
  container = participantsContainer;
  room = await Video.connect(token, {
    name: roomName,
    tracks: localTracks,
  });
  participantConnected(room.localParticipant);
  room.on("participantConnected", participantConnected);
  room.on("participantDisconnected", participantDisconnected);
  room.participants.forEach(participantConnected);
  room.on("disconnected", disconnected);
  window.addEventListener("beforeunload", tidyUp);
  window.addEventListener("pagehide", tidyUp);
  return room;
};

const messageReceived = (participant) => {
  const participantItem = participantItems.get(participant.sid);
  const reactionDiv = participantItem.querySelector(".reaction");
  let reactionCount = 0;
  let timeout;
  return (data) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    if (reactionDiv.innerText === data) {
      if (reactionCount < 5) {
        reactionDiv.classList.remove(`size-${reactionCount}`);
        reactionCount += 1;
        reactionDiv.classList.add(`size-${reactionCount}`);
      }
    } else {
      reactionDiv.innerText = data;
      reactionDiv.classList.remove(`size-${reactionCount}`);
      reactionCount = 1;
      reactionDiv.classList.add(`size-${reactionCount}`);
    }
    timeout = setTimeout(() => {
      reactionDiv.innerText = "";
      reactionDiv.classList.remove(`size-${reactionCount}`);
      reactionCount = 0;
    }, 5000);
  };
};

const trackSubscribed = (participant) => {
  return (track) => {
    const item = participantItems.get(participant.sid);
    if (track.kind === "video" || track.kind === "audio") {
      const mediaElement = track.attach();
      item.appendChild(mediaElement);
    } else if (track.kind === "data") {
      const reactionDiv = document.createElement("div");
      reactionDiv.classList.add("reaction");
      item.appendChild(reactionDiv);
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

const participantConnected = (participant) => {
  const participantItem = document.createElement("li");
  participantItem.setAttribute("id", participant.sid);
  container.appendChild(participantItem);
  participantItems.set(participant.sid, participantItem);
  participant.tracks.forEach(trackPublished(participant));
  participant.on("trackPublished", trackPublished(participant));
  participant.on("trackUnpublished", trackUnpublished);
};

const participantDisconnected = (participant) => {
  const item = participantItems.get(participant.sid);
  item.remove();
  participantItems.delete(participant.sid);
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
