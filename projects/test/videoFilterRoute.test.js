const test = require("node:test");
const assert = require("node:assert/strict");

const axios = require("axios");
const mongoose = require("mongoose");

const userId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();
const videoId = new mongoose.Types.ObjectId();

const state = {
  reserveError: null,
  deletedJobs: [],
  releasedReservations: [],
  refunds: 0,
};

function resetState() {
  state.reserveError = null;
  state.deletedJobs.length = 0;
  state.releasedReservations.length = 0;
  state.refunds = 0;
}

const Video = require("../models/video");
const VideoFilter = require("../models/videoFilter");
const processingLimit = require("../utils/videoProcessingLimit");
const reservations = require("../utils/videoReservations");
const videoFilterJob = require("../utils/videoFilterJob");

Video.findOne = () => ({
  lean: async () => ({
    _id: videoId,
    user_id: userId,
    project_id: projectId,
    size_bytes: 1_000_000,
  }),
});
VideoFilter.create = async (data) => ({
  _id: new mongoose.Types.ObjectId(),
  state: "queued",
  progress: 0,
  error: "",
  ...data,
});
VideoFilter.deleteOne = async ({ _id }) => {
  state.deletedJobs.push(_id);
};
processingLimit.countActiveVideoJobs = async () => 0;
processingLimit.maxActiveVideoJobs = () => 1;
reservations.getUploadCapacity = async () => ({
  limits: { maxSizeBytes: 100_000_000 },
  account_available_bytes: 10_000_000,
  project_available_bytes: 10_000_000,
});
reservations.reserveUpload = async () => {
  if (state.reserveError) throw state.reserveError;
};
reservations.releaseUploadReservation = async (user, upload) => {
  state.releasedReservations.push({ user, upload });
};
videoFilterJob.processFilterJob = async () => {};

axios.get = async () => ({});
axios.post = async () => {
  state.refunds += 1;
  return {};
};

const router = require("../routes/videoFilters");
const postHandler = router.stack.find(
  (layer) => layer.route?.path === "/" && layer.route.methods.post,
).route.stack[0].handle;

async function post(body) {
  const response = {
    statusCode: 200,
    body: undefined,
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      this.headersSent = true;
      return this;
    },
  };
  await postHandler(
    {
      body,
      videoUser: { _id: userId, type: "free" },
      videoProject: { _id: projectId },
      headers: { authorization: "Bearer test-token" },
    },
    response,
  );
  return response;
}

test.beforeEach(resetState);

test("TST-FILT-ROUTE-01: mostra a causa quando a reserva de espaço falha", async () => {
  const error = new Error("O armazenamento está a ser atualizado. Tente novamente.");
  error.status = 409;
  state.reserveError = error;

  const response = await post({
    video_id: videoId.toString(),
    filter_name: "grayscale",
  });

  assert.equal(response.statusCode, 409);
  assert.equal(
    response.body.error,
    "O armazenamento está a ser atualizado. Tente novamente.",
  );
  assert.equal(state.deletedJobs.length, 1);
  assert.equal(state.releasedReservations.length, 1);
  assert.equal(state.refunds, 1);
});

test("TST-FILT-ROUTE-03 / REQ-VID-FILT-004: recusa aplicar um filtro a um vídeo ainda não registado no projeto", async () => {
  // O registo Video só é criado no fim do carregamento
  const original = Video.findOne;
  Video.findOne = () => ({ lean: async () => null });
  let created = false;
  const originalCreate = VideoFilter.create;
  VideoFilter.create = async () => {
    created = true;
  };

  try {
    const response = await post({
      video_id: videoId.toString(),
      filter_name: "grayscale",
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.error, "Video not found in this project.");
    assert.equal(created, false);
    assert.equal(state.refunds, 0);
  } finally {
    Video.findOne = original;
    VideoFilter.create = originalCreate;
  }
});

test("TST-FILT-ROUTE-02: usa a mensagem genérica num erro inesperado", async () => {
  state.reserveError = new Error("database unavailable");

  const response = await post({
    video_id: videoId.toString(),
    filter_name: "grayscale",
  });

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.error, "Could not start video filter.");
  assert.equal(state.refunds, 1);
});
