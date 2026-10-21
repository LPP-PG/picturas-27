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

// Testes do processamento e do cancelamento do recorte, com FFmpeg falso (sem fixtures)

const userId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();
const sourceId = new mongoose.Types.ObjectId();
const jobId = new mongoose.Types.ObjectId();
const resultId = new mongoose.Types.ObjectId();

const state = {};

function resetState() {
  state.job = {
    _id: jobId,
    user_id: userId,
    user_type: "free",
    project_id: projectId,
    source_video_id: sourceId,
    result_video_id: resultId,
    start_seconds: 1,
    end_seconds: 3,
    output_format: "mp4",
    reserved_bytes: 10_000,
    operation_reserved: true,
    state: "queued",
    progress: 0,
    cancel_requested: false,
    error: "",
    finished_at: null,
  };
  state.source = {
    _id: sourceId,
    user_id: userId,
    project_id: projectId,
    name: "clip.mp4",
    storage_key: `${sourceId}/src/clip.mp4`,
    format: "mp4",
  };
  state.capacity = {
    project_available_bytes: 10_000_000,
    account_available_bytes: 10_000_000,
  };
  state.ffmpeg = "ok"; // "ok", "fail" ou "hang"
  state.outputSize = 1_000;
  state.onSpawn = null;
  state.failUpload = null;
  state.killedWith = null;
  state.spawns = 0;
  state.capacityChecks = 0;
  state.uploads = [];
  state.deletedFiles = [];
  state.deletedVideos = [];
  state.createdVideos = [];
  state.projectUpdates = [];
  state.releasedReservations = [];
  state.refunds = 0;
}

// Substituir o armazenamento antes de carregar os módulos
const storagePath = require.resolve("../utils/imageStorage");
require.cache[storagePath] = {
  id: storagePath,
  filename: storagePath,
  loaded: true,
  exports: {
    get_image_internal_url: async () => ({
      data: { url: "http://storage/clip.mp4" },
    }),
    post_image: async (user, video, type, form, options) => {
      if (state.failUpload === type) throw new Error(`${type} upload failed`);
      state.uploads.push({
        user,
        video,
        type,
        fileName: options.headers["X-Storage-File-Name"],
      });
      return {};
    },
    delete_image: async (...args) => {
      state.deletedFiles.push(args);
    },
  },
};

// FFmpeg falso: escreve o resultado, falha ou fica à espera de ser terminado
childProcess.spawn = (command, args) => {
  state.spawns += 1;
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = (signal) => {
    state.killedWith = signal;
    setImmediate(() => child.emit("close", null));
  };

  state.onSpawn?.();

  if (state.ffmpeg === "ok") {
    fs.writeFileSync(args.at(-1), Buffer.alloc(state.outputSize));
    setImmediate(() => {
      child.stdout.emit("data", "out_time_ms=1000000\nprogress=continue\n");
      child.emit("close", 0);
    });
  } else if (state.ffmpeg === "fail") {
    setImmediate(() => {
      child.stderr.emit("data", "Invalid data found when processing input");
      child.emit("close", 1);
    });
  }
  return child;
};

const reservations = require("../utils/videoReservations");
const videoThumbnail = require("../utils/videoThumbnail");
const videoMetadata = require("../utils/videoMetadata");

// O módulo do recorte guarda estas funções ao carregar: substituí-las antes do require
reservations.getUploadCapacity = async () => {
  state.capacityChecks += 1;
  return state.capacity;
};
reservations.releaseUploadReservation = async (user, upload) => {
  state.releasedReservations.push({ user, upload });
};
videoThumbnail.generateVideoThumbnail = async () => ({
  buffer: Buffer.from("jpeg"),
  timeSeconds: 1,
});
videoMetadata.readVideoMetadata = async () => ({
  duration_seconds: 2,
  has_audio: true,
  width: 640,
  height: 360,
  frame_rate: 25,
  video_bitrate: 1_000_000,
});

axios.get = async () => ({ data: Readable.from([Buffer.from("video")]) });
axios.post = async (url) => {
  if (url.includes("/process/refund/")) state.refunds += 1;
  return {};
};

function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (value && typeof value === "object" && "$in" in value) {
      return value.$in.includes(doc[key]);
    }
    return String(doc[key]) === String(value);
  });
}

const Video = require("../models/video");
const VideoTrim = require("../models/videoTrim");
const Project = require("../models/project");

VideoTrim.findById = () => ({
  then(resolve, reject) {
    return Promise.resolve(state.job).then(resolve, reject);
  },
  select: () => ({ lean: async () => ({ ...state.job }) }),
});
VideoTrim.findOneAndUpdate = async (filter, update) => {
  if (!matches(state.job, filter)) return null;
  Object.assign(state.job, update.$set);
  return { ...state.job };
};
VideoTrim.updateOne = async (filter, update) => {
  if (!matches(state.job, filter)) return { matchedCount: 0 };
  Object.assign(state.job, update.$set);
  return { matchedCount: 1 };
};
Video.findOne = async () => state.source;
Video.find = () => ({ select: () => ({ lean: async () => [] }) });
Video.create = async (video) => {
  state.createdVideos.push(video);
  return video;
};
Video.deleteOne = async (filter) => {
  state.deletedVideos.push(filter);
};
Project.updateOne = async (filter, update) => {
  state.projectUpdates.push({ filter, update });
  return { matchedCount: 1 };
};

const { processTrim, cancelTrimJob } = require("../utils/videoTrim");

const run = () => processTrim(jobId, "Bearer test-token", "free");

const tempFiles = () => [
  path.join(os.tmpdir(), `${jobId}.trim-source`),
  path.join(os.tmpdir(), `${resultId}.${state.job.output_format}`),
];

function assertTempFilesRemoved() {
  for (const file of tempFiles()) {
    assert.equal(fs.existsSync(file), false, file);
  }
}

// Pedido falhado sem resultado e com a operação devolvida (RN4)
function assertFailed(message) {
  assert.equal(state.job.state, "failed");
  assert.equal(state.job.error, message);
  assert.equal(state.job.reserved_bytes, 0);
  assert.equal(state.job.operation_reserved, false);
  assert.ok(state.job.finished_at instanceof Date);
  assert.equal(state.refunds, 1);
  assert.equal(state.createdVideos.length, 0);
  assert.deepEqual(state.deletedVideos, [{ _id: resultId, user_id: userId }]);
}

const genericFailure = "The video could not be trimmed. Please try again.";

test.beforeEach(resetState);

// --- Cancelamento (cancelTrimJob) ---

test("TST-TRIM-JOB-01 / RN6: cancelar um pedido em fila cancela-o logo", async () => {
  const current = await cancelTrimJob({ _id: jobId });

  assert.equal(state.job.state, "cancelled");
  assert.equal(state.job.cancel_requested, true);
  assert.equal(state.job.reserved_bytes, 0);
  assert.equal(state.job.error, "Video trim cancelled.");
  assert.ok(state.job.finished_at instanceof Date);
  assert.equal(current.state, "cancelled");
});

test("TST-TRIM-JOB-02 / RN4: cancelar em fila liberta a reserva e devolve a operação", async () => {
  await cancelTrimJob({ _id: jobId });

  assert.deepEqual(state.releasedReservations, [{ user: userId, upload: jobId }]);
  assert.equal(state.refunds, 1);
  assert.equal(state.job.operation_reserved, false);
});

test("TST-TRIM-JOB-03: cancelar em fila sem operação reservada não devolve nada", async () => {
  state.job.operation_reserved = false;

  await cancelTrimJob({ _id: jobId });

  assert.equal(state.job.state, "cancelled");
  assert.equal(state.releasedReservations.length, 1);
  assert.equal(state.refunds, 0);
});

test("TST-TRIM-JOB-04 / RN6: cancelar um pedido a processar só o marca", async () => {
  state.job.state = "processing";

  await cancelTrimJob({ _id: jobId });

  // O processamento deteta a marca e interrompe-se
  assert.equal(state.job.state, "processing");
  assert.equal(state.job.cancel_requested, true);
  assert.equal(state.releasedReservations.length, 0);
  assert.equal(state.refunds, 0);
});

test("TST-TRIM-JOB-05 / RN6: cancelar um pedido terminado não muda nada", async () => {
  state.job.state = "completed";

  await cancelTrimJob({ _id: jobId });

  assert.equal(state.job.state, "completed");
  assert.equal(state.job.cancel_requested, false);
  assert.equal(state.releasedReservations.length, 0);
  assert.equal(state.refunds, 0);
});

// --- Cancelamento durante o processamento ---

// Com limite de tempo: se o FFmpeg não for terminado, o teste falha em vez de ficar preso
test("TST-TRIM-JOB-06 / RN6: cancelar durante o FFmpeg termina o processo e o pedido", { timeout: 5000 }, async () => {
  state.ffmpeg = "hang";
  // O cancelamento chega quando o FFmpeg já está a correr
  state.onSpawn = () => {
    state.job.cancel_requested = true;
  };

  await run();

  assert.equal(state.killedWith, "SIGTERM");
  assert.equal(state.job.state, "cancelled");
  assert.equal(state.job.progress, 0);
  assert.equal(state.job.error, "Video trim cancelled.");
  assert.equal(state.job.operation_reserved, false);
  assert.equal(state.refunds, 1);
  assert.equal(state.uploads.length, 0);
  assert.equal(state.createdVideos.length, 0);
  assertTempFilesRemoved();
});

test("TST-TRIM-JOB-07: não processa um pedido que já não está em fila", async () => {
  state.job.state = "cancelled";

  await run();

  assert.equal(state.job.state, "cancelled");
  assert.equal(state.spawns, 0);
  assert.equal(state.refunds, 0);
});

// --- Falhas ---

test("TST-TRIM-JOB-08 / REQ-VID-TRIM-031: uma falha do FFmpeg mostra a mensagem genérica", async () => {
  state.ffmpeg = "fail";

  await run();

  // O erro técnico do FFmpeg não é mostrado ao utilizador
  assertFailed(genericFailure);
  assert.equal(state.uploads.length, 0);
  assertTempFilesRemoved();
});

test("TST-TRIM-JOB-09 / REQ-VID-TRIM-031: sem espaço no projeto para o resultado maior que a reserva", async () => {
  state.job.reserved_bytes = 100;
  state.outputSize = 1_000;
  state.capacity = { project_available_bytes: 10, account_available_bytes: 10_000 };

  await run();

  assertFailed("Insufficient storage space in the project.");
  assert.equal(state.uploads.length, 0);
});

test("TST-TRIM-JOB-10 / REQ-VID-TRIM-031: sem espaço na conta para o resultado maior que a reserva", async () => {
  state.job.reserved_bytes = 100;
  state.outputSize = 1_000;
  state.capacity = { project_available_bytes: 10_000, account_available_bytes: 10 };

  await run();

  assertFailed("Insufficient storage space in the account.");
});

test("TST-TRIM-JOB-11: um resultado maior que a reserva é aceite se houver espaço", async () => {
  state.job.reserved_bytes = 100;
  state.outputSize = 1_000;
  // Só faltam 900 bytes além da reserva
  state.capacity = { project_available_bytes: 900, account_available_bytes: 900 };

  await run();

  assert.equal(state.capacityChecks, 1);
  assert.equal(state.job.state, "completed");
  assert.equal(state.refunds, 0);
});

test("TST-TRIM-JOB-12: um resultado dentro da reserva não volta a verificar o espaço", async () => {
  await run();

  assert.equal(state.capacityChecks, 0);
  assert.equal(state.job.state, "completed");
});

test("TST-TRIM-JOB-13: se a miniatura falhar, apaga o vídeo já enviado", async () => {
  state.failUpload = "preview";

  await run();

  assertFailed(genericFailure);
  assert.deepEqual(state.deletedFiles, [
    [String(userId), String(resultId), "src", `${resultId}.mp4`],
  ]);
  assertTempFilesRemoved();
});

test("TST-TRIM-JOB-14: se o envio do vídeo falhar, não há ficheiros a apagar", async () => {
  state.failUpload = "src";

  await run();

  assertFailed(genericFailure);
  assert.equal(state.deletedFiles.length, 0);
});

// --- Sucesso ---

test("TST-TRIM-JOB-15 / REQ-VID-TRIM-036: guarda o vídeo e a miniatura e associa o resultado ao projeto", async () => {
  await run();

  assert.equal(state.job.state, "completed");
  assert.equal(state.job.progress, 100);
  assert.equal(state.job.reserved_bytes, 0);
  assert.equal(state.job.result_storage_key, `${resultId}/src/${resultId}.mp4`);
  assert.equal(state.job.thumbnail_storage_key, `${resultId}/preview/${resultId}.jpg`);
  assert.deepEqual(
    state.uploads.map((upload) => upload.type),
    ["src", "preview"],
  );
  assert.equal(state.createdVideos[0].name, "clip_recorte.mp4");
  assert.equal(state.createdVideos[0].size_bytes, 1_000);
  assert.equal(
    state.projectUpdates[0].update.$addToSet.video_ids,
    resultId,
  );
  // RN4: um recorte concluído gasta a operação
  assert.equal(state.refunds, 0);
  assert.equal(state.deletedVideos.length, 0);
  assertTempFilesRemoved();
});
