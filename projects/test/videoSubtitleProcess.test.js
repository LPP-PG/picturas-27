const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { Readable } = require("node:stream");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const axios = require("axios");
const mongoose = require("mongoose");

const userId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();
const videoId = new mongoose.Types.ObjectId();
const jobId = new mongoose.Types.ObjectId();

const newFile = `${jobId}.vtt`;
const newKey = `${videoId}/subtitles/${newFile}`;

const state = {};

function resetState() {
  // Pedido e vídeo guardados "na base de dados"
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
  state.metadata = { duration_seconds: 10, has_audio: true };
  state.capacity = {
    project_available_bytes: 10_000_000,
    account_available_bytes: 10_000_000,
  };
  state.speech = async ({ onInfo, onSegment }) => {
    onInfo({ type: "info", language: "en", probability: 0.98 });
    onSegment({ start: 0, end: 2, text: " Hello  there " });
    onSegment({ start: 2.5, end: 12, text: "General Kenobi" });
  };
  state.ffmpegCode = 0;
  state.uploadError = null;
  state.onUpload = null;
  state.onDelete = null;
  state.completeFailures = 0;
  state.uploads = [];
  state.deleted = [];
  state.refunds = 0;
  state.ffmpegRuns = 0;
}

// Substituir o armazenamento antes de carregar o módulo
const storagePath = require.resolve("../utils/imageStorage");
require.cache[storagePath] = {
  id: storagePath,
  filename: storagePath,
  loaded: true,
  exports: {
    get_image_internal_url: async () => ({
      data: { url: "http://storage/original.mp4" },
    }),
    post_image: async (user, project, type, form, options) => {
      state.onUpload?.();
      if (state.uploadError) throw state.uploadError;
      state.uploads.push({
        user,
        project,
        type,
        fileName: options.headers["X-Storage-File-Name"],
        body: form.getBuffer().toString(),
      });
      return {};
    },
    delete_image: async (...args) => {
      state.deleted.push(args);
      state.onDelete?.();
    },
  },
};

// FFmpeg falso: termina logo com o código escolhido no teste
childProcess.spawn = () => {
  state.ffmpegRuns += 1;
  const child = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => {};
  setImmediate(() => {
    if (state.ffmpegCode !== 0) child.stderr.emit("data", "ffmpeg error");
    child.emit("close", state.ffmpegCode);
  });
  return child;
};

const reservations = require("../utils/videoReservations");
const videoMetadata = require("../utils/videoMetadata");
const speechClient = require("../utils/speechClient");

// O módulo guarda as funções ao carregar: substituí-las antes do require
reservations.getUploadCapacity = async () => state.capacity;
videoMetadata.readVideoMetadata = async () => state.metadata;
speechClient.transcribe = async (wavPath, language, options) =>
  state.speech(options);

// Descarregar o vídeo e devolver a operação (serviço de utilizadores)
axios.get = async () => ({ data: Readable.from([Buffer.from("video")]) });
axios.post = async (url) => {
  if (url.includes("/process/refund/")) state.refunds += 1;
  return {};
};

// Coleções em memória com o pedido e o vídeo
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === "object" && "$in" in value) {
      return value.$in.includes(doc[key]);
    }
    return String(doc[key]) === String(value);
  });
}

function applySet(doc, update) {
  Object.assign(doc, update.$set);
}

const Video = require("../models/video");
const VideoSubtitle = require("../models/videoSubtitle");

VideoSubtitle.findOneAndUpdate = async (filter, update) => {
  if (!matches(state.job, filter)) return null;
  applySet(state.job, update);
  return { ...state.job };
};
VideoSubtitle.updateOne = async (filter, update) => {
  // Simular falhas da base de dados ao escrever o estado concluído
  if (update.$set.state === "completed" && state.completeFailures > 0) {
    state.completeFailures -= 1;
    throw new Error("database unavailable");
  }
  if (!matches(state.job, filter)) return { matchedCount: 0 };
  applySet(state.job, update);
  return { matchedCount: 1 };
};
VideoSubtitle.exists = async (filter) =>
  matches(state.job, filter) ? { _id: state.job._id } : null;
VideoSubtitle.findById = () => {
  const result = Promise.resolve({ ...state.job });
  result.select = () => ({ lean: async () => ({ ...state.job }) });
  return result;
};
Video.findOne = () => ({
  lean: async () => (state.video ? { ...state.video } : null),
});
Video.findOneAndUpdate = () => ({
  lean: async () => {
    if (!state.video) return null;
    const previous = { ...state.video };
    state.video.subtitles_key = newKey;
    state.video.subtitles_language = state.job.language;
    return previous;
  },
});

const {
  processSubtitleJob,
  cancelSubtitleJob,
} = require("../utils/videoSubtitleJob");

const run = () => processSubtitleJob(jobId, "Bearer test-token");

const tempFiles = [
  path.join(os.tmpdir(), `${jobId}-subtitles-source.mp4`),
  path.join(os.tmpdir(), `${jobId}-subtitles.wav`),
];

// Pedido falhado: estado, mensagem e operação devolvida (RN7)
function assertFailed(code, message) {
  assert.equal(state.job.state, "failed");
  assert.equal(state.job.error_code, code);
  if (message) assert.equal(state.job.error, message);
  assert.ok(state.job.finished_at instanceof Date);
  assert.equal(state.refunds, 1);
  assert.equal(state.job.operation_reserved, false);
}

test.beforeEach(resetState);

// --- Sucesso ---

test("TST-LEG-JOB-01 / REQ-VID-LEG-036: gera, guarda e associa as legendas ao vídeo", async () => {
  await run();

  assert.equal(state.job.state, "completed");
  assert.equal(state.job.progress, 100);
  assert.equal(state.job.result_key, newKey);
  assert.equal(state.job.error_code, "");
  assert.equal(state.video.subtitles_key, newKey);
  assert.equal(state.video.subtitles_language, "en");

  // Só os pedidos concluídos gastam a operação (RN7)
  assert.equal(state.refunds, 0);
  assert.equal(state.job.operation_reserved, true);
  assert.equal(state.ffmpegRuns, 1);
});

test("TST-LEG-JOB-02 / REQ-VID-LEG-030: guarda um ficheiro WebVTT separado do vídeo", async () => {
  await run();

  assert.equal(state.uploads.length, 1);
  const upload = state.uploads[0];
  assert.equal(String(upload.user), String(userId));
  assert.equal(String(upload.project), String(videoId));
  assert.equal(upload.type, "subtitles");
  assert.equal(upload.fileName, newFile);
  assert.match(upload.body, /Content-Type: text\/vtt/);
  assert.match(upload.body, /WEBVTT/);
});

test("TST-LEG-JOB-03 / REQ-VID-LEG-024: os segmentos ficam limpos e dentro da duração", async () => {
  await run();

  const body = state.uploads[0].body;
  assert.match(body, /00:00:00\.000 --> 00:00:02\.000\nHello there\n/);
  // O segmento que passa dos 10 s é cortado no fim do vídeo (RN6)
  assert.match(body, /00:00:02\.500 --> 00:00:10\.000\nGeneral Kenobi\n/);
});

test("TST-LEG-JOB-04: guarda o idioma identificado pelo serviço de fala", async () => {
  await run();

  assert.equal(state.job.detected_language, "en");
});

test("TST-LEG-JOB-05 / REQ-VID-LEG-031: substitui e apaga as legendas anteriores", async () => {
  state.video.subtitles_key = `${videoId}/subtitles/old.vtt`;

  await run();

  assert.equal(state.job.state, "completed");
  assert.equal(state.video.subtitles_key, newKey);
  assert.deepEqual(state.deleted, [
    [String(userId), String(videoId), "subtitles", "old.vtt"],
  ]);
});

test("TST-LEG-JOB-06: conclui mesmo se não conseguir apagar as legendas anteriores", async () => {
  state.video.subtitles_key = `${videoId}/subtitles/old.vtt`;
  state.onDelete = () => {
    throw new Error("storage down");
  };

  await run();

  assert.equal(state.job.state, "completed");
  assert.equal(state.refunds, 0);
});

test("TST-LEG-JOB-07: apaga os ficheiros temporários no fim", async () => {
  await run();

  for (const file of tempFiles) {
    assert.equal(fs.existsSync(file), false, file);
  }
});

test("TST-LEG-JOB-08: uma falha depois de associar as legendas não faz falhar o pedido", async () => {
  // A primeira escrita do estado concluído falha; a repetição funciona
  state.completeFailures = 1;

  await run();

  assert.equal(state.job.state, "completed");
  assert.equal(state.video.subtitles_key, newKey);
  // As legendas novas não são apagadas nem a operação devolvida
  assert.equal(state.deleted.length, 0);
  assert.equal(state.refunds, 0);
});

test("TST-LEG-JOB-09: não processa um pedido que já não está em fila", async () => {
  state.job.state = "cancelled";

  await run();

  assert.equal(state.job.state, "cancelled");
  assert.equal(state.ffmpegRuns, 0);
  assert.equal(state.uploads.length, 0);
  assert.equal(state.refunds, 0);
});

// --- Falhas ---

test("TST-LEG-JOB-ERR-01 / REQ-VID-LEG-027: falha quando não há fala reconhecível", async () => {
  state.speech = async ({ onSegment }) => {
    onSegment({ start: 0, end: 1, text: "   " });
    onSegment({ start: 3, end: 3, text: "zero" });
  };

  await run();

  assertFailed("no_speech", "No speech could be identified in this video.");
  assert.equal(state.uploads.length, 0);
});

test("TST-LEG-JOB-ERR-02 / REQ-VID-LEG-048: falha quando o vídeo afinal não tem áudio", async () => {
  state.metadata.has_audio = false;

  await run();

  assertFailed("no_audio", "No audio track was found in this video.");
  assert.equal(state.ffmpegRuns, 0);
});

test("TST-LEG-JOB-ERR-03 / RN4: falha quando o vídeo não está em inglês", async () => {
  state.speech = async () => {
    throw new speechClient.SpeechError("not_english");
  };

  await run();

  assertFailed("not_english", "This video does not appear to be in English.");
});

test("TST-LEG-JOB-ERR-04 / REQ-VID-LEG-028: falha quando o reconhecimento de fala falha", async () => {
  state.speech = async () => {
    throw new speechClient.SpeechError("failed", "socket hang up");
  };

  await run();

  // O detalhe técnico não é mostrado ao utilizador
  assertFailed("failed", "Could not generate subtitles. Please try again.");
});

test("TST-LEG-JOB-ERR-05: falha quando a extração do áudio falha", async () => {
  state.ffmpegCode = 1;

  await run();

  assertFailed("failed", "Could not generate subtitles. Please try again.");
});

test("TST-LEG-JOB-ERR-06: falha quando o vídeo original já não existe", async () => {
  state.video = null;

  await run();

  assertFailed("failed");
  assert.equal(state.ffmpegRuns, 0);
});

test("TST-LEG-JOB-ERR-07 / REQ-VID-LEG-029: falha sem espaço no projeto ao guardar", async () => {
  state.capacity.project_available_bytes = 10;

  await run();

  assertFailed("storage", "Insufficient storage space in the project.");
  assert.equal(state.uploads.length, 0);
});

test("TST-LEG-JOB-ERR-08 / REQ-VID-LEG-029: falha sem espaço na conta ao guardar", async () => {
  state.capacity.account_available_bytes = 10;

  await run();

  assertFailed("storage", "Insufficient storage space in the account.");
});

test("TST-LEG-JOB-ERR-09 / RN14: uma falha ao guardar mantém as legendas anteriores", async () => {
  state.video.subtitles_key = `${videoId}/subtitles/old.vtt`;
  state.uploadError = new Error("storage down");

  await run();

  assertFailed("failed");
  assert.equal(state.video.subtitles_key, `${videoId}/subtitles/old.vtt`);
  // Só o ficheiro novo é apagado, as legendas antigas ficam
  assert.deepEqual(state.deleted, [
    [String(userId), String(videoId), "subtitles", newFile],
  ]);
});

test("TST-LEG-JOB-ERR-10: apaga os ficheiros temporários depois de uma falha", async () => {
  state.speech = async () => {
    throw new speechClient.SpeechError("failed");
  };

  await run();

  for (const file of tempFiles) {
    assert.equal(fs.existsSync(file), false, file);
  }
});

// --- Cancelamento ---

test("TST-LEG-JOB-CAN-01 / RN10: um cancelamento durante o reconhecimento termina em cancelled", async () => {
  state.speech = async ({ onSegment }) => {
    onSegment({ start: 0, end: 2, text: "Hello" });
    state.job.cancel_requested = true;
  };

  await run();

  assert.equal(state.job.state, "cancelled");
  assert.equal(state.job.error_code, "");
  assert.equal(state.job.error, "Subtitle generation cancelled.");
  assert.equal(state.uploads.length, 0);
  assert.equal(state.video.subtitles_key, null);
  // A operação é devolvida (RN7)
  assert.equal(state.refunds, 1);
});

test("TST-LEG-JOB-CAN-02 / RN14: um cancelamento depois do envio apaga o ficheiro novo", async () => {
  state.video.subtitles_key = `${videoId}/subtitles/old.vtt`;
  state.onUpload = () => {
    state.job.cancel_requested = true;
  };

  await run();

  assert.equal(state.job.state, "cancelled");
  assert.equal(state.video.subtitles_key, `${videoId}/subtitles/old.vtt`);
  assert.deepEqual(state.deleted, [
    [String(userId), String(videoId), "subtitles", newFile],
  ]);
  assert.equal(state.refunds, 1);
});

test("TST-LEG-JOB-CAN-03 / REQ-VID-LEG-047: um cancelamento depois de associar as legendas não tem efeito", async () => {
  state.video.subtitles_key = `${videoId}/subtitles/old.vtt`;
  // O cancelamento chega enquanto se apagam as legendas anteriores
  state.onDelete = () => {
    state.job.cancel_requested = true;
  };

  await run();

  assert.equal(state.job.state, "completed");
  assert.equal(state.video.subtitles_key, newKey);
  assert.equal(state.refunds, 0);
});

test("TST-LEG-JOB-CAN-04 / RN10: cancelar um pedido em fila cancela-o logo e devolve a operação", async () => {
  const current = await cancelSubtitleJob({ _id: jobId });

  assert.equal(state.job.state, "cancelled");
  assert.equal(state.job.cancel_requested, true);
  assert.equal(current.state, "cancelled");
  assert.equal(state.refunds, 1);
  assert.equal(state.job.operation_reserved, false);
});

test("TST-LEG-JOB-CAN-05 / RN10: cancelar um pedido a processar só o marca", async () => {
  state.job.state = "processing";

  await cancelSubtitleJob({ _id: jobId });

  // O processamento deteta a marca e interrompe-se
  assert.equal(state.job.state, "processing");
  assert.equal(state.job.cancel_requested, true);
  assert.equal(state.refunds, 0);
});

test("TST-LEG-JOB-CAN-06 / RN10: cancelar um pedido terminado não muda nada", async () => {
  state.job.state = "completed";

  await cancelSubtitleJob({ _id: jobId });

  assert.equal(state.job.state, "completed");
  assert.equal(state.job.cancel_requested, false);
  assert.equal(state.refunds, 0);
});
