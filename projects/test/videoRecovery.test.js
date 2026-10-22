const test = require("node:test");
const assert = require("node:assert/strict");

const mongoose = require("mongoose");

// Os temporizadores e o relógio são simulados para não esperar 5 minutos
test.mock.timers.enable({
  apis: ["setInterval", "Date"],
  now: new Date("2026-10-22T12:00:00Z"),
});

// Durante o carregamento dos módulos a base de dados está "desligada",
// para não arrancarem as recuperações das outras rotas
let connected = false;
Object.defineProperty(mongoose.connection, "readyState", {
  configurable: true,
  get: () => (connected ? 1 : 0),
});

const userId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();

const state = {
  uploads: [],
  uploadQuery: null,
  updates: [],
  released: [],
  deletedFiles: [],
  deletedVideos: [],
  cancelled: [],
  cancelFailsFor: null,
  activeJobs: { trim: [], filter: [], subtitle: [] },
};

const trimUtils = require("../utils/videoTrim");
const filterJob = require("../utils/videoFilterJob");
const subtitleJob = require("../utils/videoSubtitleJob");
function fakeCancel(kind) {
  return async (job) => {
    if (state.cancelFailsFor === kind) throw new Error("cancel failed");
    state.cancelled.push(`${kind}:${job._id}`);
  };
}
trimUtils.cancelTrimJob = fakeCancel("trim");
filterJob.cancelFilterJob = fakeCancel("filter");
subtitleJob.cancelSubtitleJob = fakeCancel("subtitle");

const reservations = require("../utils/videoReservations");
reservations.releaseUploadReservation = async (user, uploadId) => {
  state.released.push(String(uploadId));
};

const imageStorage = require("../utils/imageStorage");
imageStorage.delete_image = async (user, owner, stage, fileName) => {
  state.deletedFiles.push(`${stage}/${fileName}`);
};

const Project = require("../models/project");
const Video = require("../models/video");
const VideoUpload = require("../models/videoUpload");
const VideoTrim = require("../models/videoTrim");
const VideoFilter = require("../models/videoFilter");
const VideoSubtitle = require("../models/videoSubtitle");

// Simular o filtro da consulta: só devolve os uploads realmente parados
VideoUpload.find = (query) => {
  state.uploadQuery = query;
  const stale = query.$or[1].last_activity_at.$lt;
  const found = state.uploads.filter(
    (upload) => upload.cleanup_pending || upload.last_activity_at < stale,
  );
  return { limit: async () => found };
};
VideoUpload.updateOne = async (filter, update) => {
  state.updates.push({ id: String(filter._id), ...update.$set });
};
Project.exists = async () => null;
Video.deleteOne = async ({ _id }) => {
  state.deletedVideos.push(String(_id));
};
VideoTrim.find = () => ({ lean: async () => state.activeJobs.trim });
VideoFilter.find = () => ({ lean: async () => state.activeJobs.filter });
VideoSubtitle.find = () => ({ lean: async () => state.activeJobs.subtitle });

const router = require("../routes/videos");

// A limpeza de eliminações também corre a cada 15 s; aqui não tem tarefas
mongoose.models.VideoDeletion.find = () => ({ limit: async () => [] });

const cancelActiveHandler = router.stack.find(
  (layer) => layer.route?.path === "/:user/jobs/cancel-active",
).route.stack.at(-1).handle;

function makeUpload(minutesWithoutActivity) {
  const id = new mongoose.Types.ObjectId();
  return {
    _id: id,
    user_id: userId,
    project_id: projectId,
    video_id: new mongoose.Types.ObjectId(),
    state: "uploading",
    cancel_requested: false,
    cleanup_pending: false,
    last_activity_at: new Date(Date.now() - minutesWithoutActivity * 60_000),
    stored_files: [{ stage: "src", file_name: `${id}.mp4` }],
    temporary_path: null,
  };
}

async function runRecoveryCycle() {
  connected = true;
  test.mock.timers.tick(15_000);
  // Deixar terminar as operações assíncronas do ciclo
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

test("TST-UP-REC-01 / REQ-VID-UPLOAD-036: um upload sem atividade há mais de 5 minutos é recuperado e liberta os recursos", async () => {
  const abandoned = makeUpload(6);
  const recent = makeUpload(2);
  state.uploads = [abandoned, recent];

  await runRecoveryCycle();

  // O limite de inatividade usado na consulta é de 5 minutos
  const stale = state.uploadQuery.$or[1].last_activity_at.$lt;
  assert.equal(Date.now() - stale.getTime(), 5 * 60 * 1000);

  // Só o upload parado é tratado: dados apagados, reserva e vaga libertadas
  assert.deepEqual(state.released, [String(abandoned._id)]);
  assert.deepEqual(state.deletedFiles, [`src/${abandoned._id}.mp4`]);
  assert.deepEqual(state.deletedVideos, [String(abandoned.video_id)]);
  const final = state.updates.filter((u) => u.id === String(abandoned._id)).at(-1);
  assert.equal(final.state, "failed");
  assert.equal(final.slot_acquired, false);
  assert.equal(final.reserved_bytes, 0);
  assert.equal(final.cleanup_pending, false);
  assert.equal(state.updates.some((u) => u.id === String(recent._id)), false);
});

function makeResponse() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
  };
}

test("TST-STATUS-04 / REQ-VID-STATUS-004: no logout são cancelados os pedidos ativos das três ferramentas", async () => {
  const ids = [1, 2, 3].map(() => new mongoose.Types.ObjectId());
  state.activeJobs = {
    trim: [{ _id: ids[0] }],
    filter: [{ _id: ids[1] }],
    subtitle: [{ _id: ids[2] }],
  };
  state.cancelled = [];
  state.cancelFailsFor = null;

  const response = makeResponse();
  await cancelActiveHandler({ videoUser: { _id: userId } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.cancelled, 3);
  assert.deepEqual(state.cancelled, [
    `trim:${ids[0]}`,
    `filter:${ids[1]}`,
    `subtitle:${ids[2]}`,
  ]);
});

test("TST-STATUS-05 / REQ-VID-STATUS-004, 017: uma falha num cancelamento não impede os restantes", async () => {
  const ids = [1, 2].map(() => new mongoose.Types.ObjectId());
  state.activeJobs = {
    trim: [{ _id: ids[0] }],
    filter: [],
    subtitle: [{ _id: ids[1] }],
  };
  state.cancelled = [];
  state.cancelFailsFor = "trim";

  const response = makeResponse();
  await cancelActiveHandler({ videoUser: { _id: userId } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.cancelled, 1);
  assert.deepEqual(state.cancelled, [`subtitle:${ids[1]}`]);
});
