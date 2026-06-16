
async function transcribeAudio(transcript) {
  if (!transcript || typeof transcript !== "string") {
    throw new Error("No transcript provided from browser Speech API");
  }
  return {
    text: transcript.trim(),
    duration: 0,
    segments: [],
    language: "en",
  };
}


async function textToSpeech(_text) {
  return Buffer.alloc(0);
}

module.exports = { transcribeAudio, textToSpeech };
