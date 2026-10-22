const test = require("node:test");
const assert = require("node:assert/strict");

const mongoose = require("mongoose");

const userId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();
const videoId = new mongoose.Types.ObjectId();

const state = {
  busy: false,
  activeUpload: false,
  lastVideo: false,
  storageFailures: 0,
  deletedFiles: [],
  deletedVideos: [],
  pulledFromProject: [],
  cleanupJobs: new Map(),
  projectExists: false,
  pendingUploads: false,
  projectVideos: [],
};

function resetState() {
  state.busy = false;
  state.activeUpload = false;
  state.lastVideo = false;
  state.storageFailures = 0;
  state.deletedFiles.length = 0;
  state.deletedVideos.length = 0;
  state.pulledFromProject.length = 0;
  state.cleanupJobs.clear();
  state.projectExists = false;
  state.pendingUploads = false;
  state.projectVideos = [];
}

// O ciclo de limpeza só corre com a base de dados ligada.
// Só se "liga" depois de carregar os modelos.
let connected = false;
Object.defineProperty(mongoose.connection, "readyState", {
  configurable: true,
  get: () => (connected ? 1 : 0),
});

const imageStorage = require("../utils/imageStorage");
imageStorage.delete_image = async (user, owner, stage, fileName) => {
  if (state.storageFailures > 0) {
    state.storageFailures -= 1;
    throw new Error("storage unavailable");
  }
  state.deletedFiles.push(`${stage}/${fileName}`);
};

const processingLimit = require("../utils/videoProcessingLimit");
processingLimit.hasActiveVideoJobs = async () => state.busy;

const Project = require("../models/project");
const Video = require("../models/video");
const VideoUpload = require("../models/videoUpload");

const storedVideo = {
  _id: videoId,
  user_id: userId,
  project_id: projectId,
  storage_key: `${videoId}/src/${videoId}.mp4`,
  thumbnail_key: `${videoId}/preview/${videoId}.jpg`,
  subtitles_key: `${videoId}/subtitles/${videoId}.vtt`,
};

Project.findOne = async () => ({ _id: projectId, video_ids: [videoId] });
Project.findOneAndUpdate = async (filter, update) => {
  // A rota só retira o vídeo se o projeto ficar com pelo menos um vídeo
  if (state.lastVideo) return null;
  state.pulledFromProject.push(update.$pull.video_ids);
  return { _id: projectId, version: 2 };
};
Project.exists = async (filter) =>
  filter.video_ids ? null : state.projectExists;
Video.findOne = async () => storedVideo;
Video.find = async () => state.projectVideos;
Video.deleteOne = async ({ _id }) => {
  state.deletedVideos.push(String(_id));
};
VideoUpload.exists = async () =>
  state.activeUpload || state.pendingUploads ? { _id: 1 } : null;
VideoUpload.updateMany = async () => ({});
VideoUpload.find = () => ({
  select: () => ({ lean: async () => [] }),
});

const router = require("../routes/videoDeletion");
const deleteHandler = router.stack.find(
  (layer) => layer.route?.path === "/items/:video",
).route.stack[0].handle;

// Substituir o registo persistente das tarefas de limpeza
function fakeCleanupModel(model) {
  model.updateOne = async (filter, update) => {
    const id = String(filter._id);
    if (update.$setOnInsert && !state.cleanupJobs.has(id)) {
      state.cleanupJobs.set(id, { _id: filter._id, ...update.$setOnInsert });
    }
    if (update.$set && state.cleanupJobs.has(id)) {
      Object.assign(state.cleanupJobs.get(id), update.$set);
    }
  };
  model.find = () => ({ limit: async () => [...state.cleanupJobs.values()] });
  model.deleteOne = async ({ _id }) => {
    state.cleanupJobs.delete(String(_id));
  };
}
fakeCleanupModel(mongoose.models.VideoDeletion);

const {
  prepareVideoProjectDeletion,
  processVideoProjectDeletions,
} = require("../utils/videoProjectDeletion");
fakeCleanupModel(mongoose.models.VideoProjectDeletion);
connected = true;

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

async function deleteVideo() {
  const response = makeResponse();
  await deleteHandler(
    {
      params: { project: String(projectId), video: String(videoId) },
      videoUser: { _id: userId, type: "free" },
    },
    response,
  );
  return response;
}

function waitForCleanup() {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

test.beforeEach(resetState);

test("TST-DEL-01 / REQ-VID-STATUS-013: recusa eliminar um vídeo com processamento ativo", async () => {
  state.busy = true;

  const response = await deleteVideo();

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error_code, "busy_delete");
  assert.match(response.body.error, /Cancel it before deleting/);
  assert.equal(state.pulledFromProject.length, 0);
  assert.equal(state.cleanupJobs.size, 0);
});

test("TST-DEL-02 / REQ-VID-UPLOAD-029: recusa eliminar um vídeo cujo carregamento ainda está a terminar", async () => {
  state.activeUpload = true;

  const response = await deleteVideo();

  assert.equal(response.statusCode, 409);
  assert.match(response.body.error, /still finishing/);
  assert.equal(state.pulledFromProject.length, 0);
});

test("TST-DEL-03 / REQ-VID-UPLOAD-044, REQ-VID-LEG-051: elimina o vídeo e limpa o original, a miniatura e as legendas", async () => {
  const response = await deleteVideo();
  await waitForCleanup();

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.video_id, String(videoId));
  assert.equal(state.pulledFromProject.length, 1);
  assert.deepEqual(state.deletedFiles, [
    `src/${videoId}.mp4`,
    `preview/${videoId}.jpg`,
    `subtitles/${videoId}.vtt`,
  ]);
  assert.deepEqual(state.deletedVideos, [String(videoId)]);
  assert.equal(state.cleanupJobs.size, 0);
});

test("TST-DEL-04 / REQ-VID-UPLOAD-044: uma falha do armazenamento deixa a limpeza pendente para nova tentativa", async () => {
  state.storageFailures = 1;

  const response = await deleteVideo();
  await waitForCleanup();

  // O vídeo sai do projeto, mas os ficheiros e o registo ficam por limpar
  assert.equal(response.statusCode, 200);
  assert.equal(state.deletedVideos.length, 0);
  const pending = state.cleanupJobs.get(String(videoId));
  assert.ok(pending);
  assert.equal(pending.last_error, "storage unavailable");

  // A tentativa seguinte (a cada 15 s) conclui a limpeza
  await deleteVideo();
  await waitForCleanup();

  assert.deepEqual(state.deletedVideos, [String(videoId)]);
  assert.equal(state.cleanupJobs.size, 0);
});

test("TST-DEL-05 / REQ-VID-UPLOAD-045: o último vídeo não é retirado pela eliminação individual", async () => {
  state.lastVideo = true;

  const response = await deleteVideo();

  assert.equal(response.statusCode, 409);
  assert.match(response.body.error, /project changed/);
  assert.equal(state.deletedFiles.length, 0);
});

test("TST-DEL-06 / REQ-VID-UPLOAD-045, REQ-VID-LEG-051: eliminar o projeto limpa os ficheiros de todos os vídeos, incluindo legendas", async () => {
  const otherId = new mongoose.Types.ObjectId();
  state.projectVideos = [
    storedVideo,
    {
      _id: otherId,
      storage_key: `${otherId}/src/${otherId}.mov`,
      thumbnail_key: `${otherId}/preview/${otherId}.jpg`,
      subtitles_key: null,
    },
  ];

  await prepareVideoProjectDeletion(userId, projectId);

  // Enquanto o projeto existir, nada é apagado
  state.projectExists = true;
  await processVideoProjectDeletions();
  assert.equal(state.deletedFiles.length, 0);

  state.projectExists = false;
  await processVideoProjectDeletions();

  assert.deepEqual(state.deletedFiles, [
    `src/${videoId}.mp4`,
    `preview/${videoId}.jpg`,
    `subtitles/${videoId}.vtt`,
    `src/${otherId}.mov`,
    `preview/${otherId}.jpg`,
  ]);
  assert.deepEqual(state.deletedVideos, [String(videoId), String(otherId)]);
  assert.equal(state.cleanupJobs.size, 0);
});

test("TST-DEL-07 / REQ-VID-UPLOAD-044: a limpeza do projeto espera pelos carregamentos ainda ativos", async () => {
  state.projectVideos = [storedVideo];
  state.pendingUploads = true;

  await prepareVideoProjectDeletion(userId, projectId);
  await processVideoProjectDeletions();

  assert.equal(state.deletedFiles.length, 0);
  assert.equal(state.cleanupJobs.size, 1);
});
