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
  room.on("participantConnected", participantConnected);
  room.on("participantDisconnected", participantDisconnected);
  room.participants.forEach(participantConnected);
  room.on("disconnected", disconnected);
  return room;
};

const trackSubscribed = (participant) => {
  return (track) => {
    const item = participantItems.get(participant.sid);
    item.appendChild(track.attach());
  };
};

const trackPublished = (participant) => {
  return (trackPub) => {
    if (trackPub.track) {
      trackSubscribed(participant)(track);
    }
    trackPub.on("subscribed", trackSubscribed(participant));
    trackPub.on("unsubscribed", trackUnscribed);
  };
};

const trackUnscribed = (track) => {
  const mediaElements = track.detach();
  mediaElements.forEach((mediaElement) => mediaElement.remove());
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
