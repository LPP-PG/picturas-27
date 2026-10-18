const { StringDecoder } = require("node:string_decoder");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("node:fs");

const speechUrl =
  process.env.SUBTITLES_SERVICE_URL || "http://subtitles_ai:7870";

class SpeechError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = "SpeechError";
    this.code = code;
  }
}

// Verificar se o serviço de reconhecimento de fala está disponível
async function checkSpeechService() {
  try {
    await axios.get(`${speechUrl}/health`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

// Ler o stream NDJSON linha a linha (as linhas podem vir partidas)
async function parseSpeechStream(stream, { onInfo, onSegment } = {}) {
  const decoder = new StringDecoder("utf8");
  let buffer = "";
  let done = false;

  function handleLine(line) {
    if (line.trim() === "") return;

    let event;
    try {
      event = JSON.parse(line);
    } catch {
      throw new SpeechError("failed", "Invalid speech service response.");
    }

    if (event.type === "info") {
      onInfo?.(event);
    } else if (event.type === "segment") {
      onSegment?.(event);
    } else if (event.type === "done") {
      done = true;
    } else if (event.type === "error") {
      throw new SpeechError(event.code || "failed");
    }
  }

  try {
    for await (const chunk of stream) {
      buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);

      const lines = buffer.split("\n");
      buffer = lines.pop();
      lines.forEach(handleLine);
    }

    buffer += decoder.end();
    handleLine(buffer);
  } catch (error) {
    if (error instanceof SpeechError) throw error;
    // Ligação interrompida a meio do stream
    throw new SpeechError("failed", error.message);
  }

  // Um stream sem "done" nem "error" é uma falha
  if (!done) {
    throw new SpeechError("failed", "Speech service ended unexpectedly.");
  }
}

function abortError() {
  const error = new Error("Subtitle generation cancelled.");
  error.name = "AbortError";
  return error;
}

// Enviar o áudio ao serviço e receber os segmentos
async function transcribe(wavPath, language, { signal, onInfo, onSegment } = {}) {
  try {
    const form = new FormData();
    form.append("audio", fs.createReadStream(wavPath), {
      filename: "audio.wav",
      contentType: "audio/wav",
    });
    form.append("language", language);

    const response = await axios.post(`${speechUrl}/transcribe`, form, {
      headers: form.getHeaders(),
      responseType: "stream",
      signal,
      timeout: 0,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    await parseSpeechStream(response.data, { onInfo, onSegment });
  } catch (error) {
    if (signal?.aborted) throw abortError();
    if (error instanceof SpeechError) throw error;
    throw new SpeechError("failed", error.message);
  }
}

module.exports = {
  SpeechError,
  checkSpeechService,
  parseSpeechStream,
  transcribe,
};
