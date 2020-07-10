const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = AudioContext ? new AudioContext() : null;

const createVolumeMeter = async (track) => {
  if (!audioContext) {
    return;
  }

  await audioContext.resume();

  // Create an analyser to access the raw audio samples from the microphone.
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.5;

  // Connect the LocalAudioTrack's media source to the analyser.
  const stream = new MediaStream([track.mediaStreamTrack]);
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  const sampleArray = new Uint8Array(analyser.frequencyBinCount);

  const shutdown = () => {
    analyser.disconnect();
  };

  const samples = () => {
    analyser.getByteFrequencyData(sampleArray);
    return sampleArray;
  };

  return { shutdown, analyser, samples };
};

const getVolume = async (track, callback) => {
  const { shutdown, analyser, samples } = await createVolumeMeter(track);
  requestAnimationFrame(function checkVolume() {
    callback(analyser.frequencyBinCount, samples());
    if (track.mediaStreamTrack.readyState === "live") {
      requestAnimationFrame(checkVolume);
    } else {
      requestAnimationFrame(() => {
        shutdown();
        callback(0);
      });
    }
  });
};

module.exports = { createVolumeMeter, getVolume };
