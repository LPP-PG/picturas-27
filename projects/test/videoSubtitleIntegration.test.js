const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const axios = require("axios");
const mongoose = require("mongoose");

// Testes com FFmpeg real e um serviço de fala falso (o Whisper é lento e não determinístico)

const fixtures = path.join(__dirname, "fixtures");
const voiceover = path.join(fixtures, "traffic-voiceover.mp4");
const invalidVideo = path.join(fixtures, "invalid-video.mp4");

const userId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();
const videoId = new mongoose.Types.ObjectId();
const jobId = new mongoose.Types.ObjectId();
const newKey = `${videoId}/subtitles/${jobId}.vtt`;

const state = {};

function resetState() {
  state.job = {
    _id: jobId,
    user_id: userId,
    user_type: "free",
    project_id: projectId,
    video_id: videoId,
    language: "en",
    detected_language: null,
    operation_reserved: true,
    state: "queued",
    progress: 0,
    cancel_requested: false,
    error: "",
    error_code: "",
    result_key: null,
    finished_at: null,
  };
  state.video = {
    _id: videoId,
    user_id: userId,
    project_id: projectId,
    format: "mp4",
    storage_key: `${videoId}/src/original.mp4`,
    subtitles_key: null,
    subtitles_language: null,
  };
  state.videoPath = voiceover;
  state.speechReply = null;
  state.speechRequests = [];
  state.uploads = [];
  state.refunds = 0;
}

// --- Serviço falso: vídeo para descarregar e reconhecimento de fala ---

// Ler o cabeçalho WAV (canais, frequência e duração do áudio)
function readWav(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WAVE");

  let offset = 12;
  let format;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);

    if (id === "fmt ") {
      format = {
        channels: buffer.readUInt16LE(offset + 10),
        sampleRate: buffer.readUInt32LE(offset + 12),
        bitsPerSample: buffer.readUInt16LE(offset + 22),
      };
    } else if (id === "data") {
      const bytesPerSecond =
        format.sampleRate * format.channels * (format.bitsPerSample / 8);
      return { ...format, seconds: size / bytesPerSecond };
    }

    offset += 8 + size + (size % 2);
  }

  throw new Error("WAV sem dados de áudio");
}

// Separar o áudio e o idioma do pedido multipart
function parseTranscribeRequest(body, contentType) {
  const boundary = `--${contentType.split("boundary=")[1]}`;
  const parts = {};

  let start = body.indexOf(boundary);
  while (start !== -1) {
    const next = body.indexOf(boundary, start + boundary.length);
    if (next === -1) break;

    const part = body.subarray(start + boundary.length + 2, next - 2);
    const headerEnd = part.indexOf("\r\n\r\n");
    const headers = part.subarray(0, headerEnd).toString();
    const name = /name="([^"]+)"/.exec(headers)[1];
    parts[name] = part.subarray(headerEnd + 4);

    start = next;
  }

  return {
    language: parts.language.toString(),
    audio: readWav(parts.audio),
  };
}

function line(res, event) {
  res.write(`${JSON.stringify(event)}\n`);
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.end("ok");
    return;
  }

  if (req.method === "GET" && req.url === "/video") {
    fs.createReadStream(state.videoPath).pipe(res);
    return;
  }

  if (req.method === "POST" && req.url === "/transcribe") {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const request = parseTranscribeRequest(
        Buffer.concat(chunks),
        req.headers["content-type"],
      );
      state.speechRequests.push(request);

      res.writeHead(200, { "Content-Type": "application/x-ndjson" });
      state.speechReply(res, request);
    });
    return;
  }

  res.statusCode = 404;
  res.end();
});

// --- Substituições antes de carregar o módulo do processamento ---

let processSubtitleJob;
let readVideoMetadata;
let noAudioVideo;
let tempDir;

const realPost = axios.post;

test.before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  // O cliente de fala lê o endereço ao carregar
  process.env.SUBTITLES_SERVICE_URL = base;

  const storagePath = require.resolve("../utils/imageStorage");
  require.cache[storagePath] = {
    id: storagePath,
    filename: storagePath,
    loaded: true,
    exports: {
      get_image_internal_url: async () => ({ data: { url: `${base}/video` } }),
      post_image: async (user, project, type, form, options) => {
        state.uploads.push({
          type,
          fileName: options.headers["X-Storage-File-Name"],
          body: form.getBuffer().toString(),
        });
        return {};
      },
      delete_image: async () => ({}),
    },
  };

  const reservations = require("../utils/videoReservations");
  reservations.getUploadCapacity = async () => ({
    project_available_bytes: 10_000_000,
    account_available_bytes: 10_000_000,
  });

  // Só a devolução da operação é falsa; o pedido ao serviço de fala é real
  axios.post = async (url, ...args) => {
    if (url.includes("/process/refund/")) {
      state.refunds += 1;
      return {};
    }
    return realPost.call(axios, url, ...args);
  };

  const Video = require("../models/video");
  const VideoSubtitle = require("../models/videoSubtitle");

  function matches(doc, filter) {
    return Object.entries(filter).every(([key, value]) => {
      if (value && typeof value === "object" && "$in" in value) {
        return value.$in.includes(doc[key]);
      }
      return String(doc[key]) === String(value);
    });
  }

  VideoSubtitle.findOneAndUpdate = async (filter, update) => {
    if (!matches(state.job, filter)) return null;
    Object.assign(state.job, update.$set);
    return { ...state.job };
  };
  VideoSubtitle.updateOne = async (filter, update) => {
    if (!matches(state.job, filter)) return { matchedCount: 0 };
    Object.assign(state.job, update.$set);
    return { matchedCount: 1 };
  };
  VideoSubtitle.exists = async (filter) =>
    matches(state.job, filter) ? { _id: state.job._id } : null;
  VideoSubtitle.findById = () => ({
    select: () => ({ lean: async () => ({ ...state.job }) }),
  });
  Video.findOne = () => ({ lean: async () => ({ ...state.video }) });
  Video.findOneAndUpdate = () => ({
    lean: async () => {
      const previous = { ...state.video };
      state.video.subtitles_key = newKey;
      state.video.subtitles_language = state.job.language;
      return previous;
    },
  });

  ({ processSubtitleJob } = require("../utils/videoSubtitleJob"));
  ({ readVideoMetadata } = require("../utils/videoMetadata"));

  // Vídeo sem faixa de áudio, gerado na hora
  tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "teste-legendas-"));
  noAudioVideo = path.join(tempDir, "sem-audio.mp4");
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error",
    "-f", "lavfi", "-i", "testsrc=duration=2:size=160x120:rate=10",
    "-c:v", "mpeg4", "-an", "-y", noAudioVideo,
  ]);
});

test.after(async () => {
  axios.post = realPost;
  server.close();
  if (tempDir) await fsp.rm(tempDir, { recursive: true, force: true });
});

test.beforeEach(resetState);

const run = () => processSubtitleJob(jobId, "Bearer test-token");

function toSeconds(timestamp) {
  const [h, m, s] = timestamp.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function assertTempFilesRemoved() {
  for (const file of [
    path.join(os.tmpdir(), `${jobId}-subtitles-source.mp4`),
    path.join(os.tmpdir(), `${jobId}-subtitles.wav`),
  ]) {
    assert.equal(fs.existsSync(file), false, file);
  }
}

test("TST-LEG-INT-01 / REQ-VID-LEG-036: gera legendas para um MP4 real com áudio", async () => {
  const metadata = await readVideoMetadata(voiceover);
  assert.equal(metadata.has_audio, true);

  state.speechReply = (res) => {
    line(res, { type: "info", language: "en", probability: 0.97 });
    line(res, { type: "segment", start: 0, end: 1.5, text: "Cars <and> trucks" });
    // O último segmento passa do fim do vídeo
    line(res, {
      type: "segment",
      start: 2,
      end: metadata.duration_seconds + 5,
      text: "Until the end",
    });
    line(res, { type: "done" });
    res.end();
  };

  await run();

  assert.equal(state.job.state, "completed", state.job.error);
  assert.equal(state.job.progress, 100);
  assert.equal(state.job.detected_language, "en");
  assert.equal(state.video.subtitles_key, newKey);
  assert.equal(state.refunds, 0);

  // O VTT guardado tem os dois segmentos, com o texto escapado
  assert.equal(state.uploads.length, 1);
  const vtt = state.uploads[0].body;
  assert.match(vtt, /WEBVTT/);
  assert.match(vtt, /00:00:00\.000 --> 00:00:01\.500\nCars &lt;and&gt; trucks\n/);

  // RN6: o fim do último segmento é cortado na duração real do vídeo
  const [, lastEnd] = /00:00:02\.000 --> (\S+)\nUntil the end/.exec(vtt);
  assert.ok(Math.abs(toSeconds(lastEnd) - metadata.duration_seconds) < 0.002);

  assertTempFilesRemoved();
});

test("TST-LEG-INT-02: envia ao serviço de fala o áudio em WAV mono a 16 kHz", async () => {
  const metadata = await readVideoMetadata(voiceover);

  state.speechReply = (res) => {
    line(res, { type: "segment", start: 0, end: 1, text: "Hi" });
    line(res, { type: "done" });
    res.end();
  };

  await run();

  assert.equal(state.speechRequests.length, 1);
  const { language, audio } = state.speechRequests[0];
  assert.equal(language, "en");
  assert.equal(audio.channels, 1);
  assert.equal(audio.sampleRate, 16000);
  assert.equal(audio.bitsPerSample, 16);
  // O áudio extraído tem a duração do vídeo
  assert.ok(
    Math.abs(audio.seconds - metadata.duration_seconds) < 0.5,
    `áudio ${audio.seconds}s, vídeo ${metadata.duration_seconds}s`,
  );
});

test("TST-LEG-INT-03 / REQ-VID-LEG-048: um vídeo real sem áudio termina em failed", async () => {
  state.videoPath = noAudioVideo;

  await run();

  assert.equal(state.job.state, "failed");
  assert.equal(state.job.error_code, "no_audio");
  assert.equal(state.speechRequests.length, 0);
  assert.equal(state.refunds, 1);
  assertTempFilesRemoved();
});

test("TST-LEG-INT-04: um MP4 inválido termina em failed e devolve a operação", async () => {
  state.videoPath = invalidVideo;

  await run();

  assert.equal(state.job.state, "failed");
  assert.equal(state.job.error_code, "failed");
  assert.equal(state.speechRequests.length, 0);
  assert.equal(state.uploads.length, 0);
  assert.equal(state.refunds, 1);
  assertTempFilesRemoved();
});

test("TST-LEG-INT-05 / RN4: um erro do serviço de fala a meio do stream termina em failed", async () => {
  state.speechReply = (res) => {
    line(res, { type: "info", language: "pt", probability: 0.9 });
    line(res, { type: "error", code: "not_english" });
    res.end();
  };

  await run();

  assert.equal(state.job.state, "failed");
  assert.equal(state.job.error_code, "not_english");
  assert.equal(state.job.detected_language, "pt");
  assert.equal(state.uploads.length, 0);
  assert.equal(state.refunds, 1);
});

test("TST-LEG-INT-06 / RN10: cancelar durante o reconhecimento interrompe o pedido ao serviço", async () => {
  let connectionClosed;
  const closed = new Promise((resolve) => {
    connectionClosed = resolve;
  });

  state.speechReply = (res) => {
    line(res, { type: "info", language: "en", probability: 0.9 });
    // O serviço fica a "transcrever" até o pedido ser interrompido
    state.job.cancel_requested = true;
    const timeout = setTimeout(() => res.end(), 5000);
    res.on("close", () => {
      clearTimeout(timeout);
      connectionClosed(true);
    });
  };

  const started = Date.now();
  await run();

  assert.equal(state.job.state, "cancelled");
  assert.equal(state.job.error_code, "");
  assert.equal(state.uploads.length, 0);
  assert.equal(state.video.subtitles_key, null);
  assert.equal(state.refunds, 1);
  // A ligação foi fechada pelo cancelamento, não pelo fim do serviço
  assert.equal(await closed, true);
  assert.ok(Date.now() - started < 4000);
  assertTempFilesRemoved();
});
