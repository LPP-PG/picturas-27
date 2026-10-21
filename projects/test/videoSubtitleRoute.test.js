const test = require("node:test");
const assert = require("node:assert/strict");

const axios = require("axios");
const mongoose = require("mongoose");

const userId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();
const videoId = new mongoose.Types.ObjectId();

const state = {};

function resetState() {
  state.video = {
    _id: videoId,
    user_id: userId,
    project_id: projectId,
    duration_seconds: 5,
    has_audio: true,
    subtitles_key: null,
  };
  state.videoIds = [videoId];
  state.duplicate = false;
  state.activeJobs = 0;
  state.capacity = {
    account_available_bytes: 10_000_000,
    project_available_bytes: 10_000_000,
  };
  state.speechAvailable = true;
  state.quota = "ok"; // "ok", "exhausted" ou "down"
  state.createError = null;
  state.storedJob = null;
  state.vttText = "WEBVTT\n";
  state.filters = [];
  state.createdJobs = [];
  state.deletedJobs = [];
  state.processedJobs = [];
  state.cancelledJobs = [];
  state.quotaChecks = 0;
  state.refunds = 0;
}

function lean(value) {
  return { lean: async () => value };
}

// Substituir o armazenamento antes de carregar os módulos
const storagePath = require.resolve("../utils/imageStorage");
require.cache[storagePath] = {
  id: storagePath,
  filename: storagePath,
  loaded: true,
  exports: {
    get_image_internal_url: async () => ({
      data: { url: "http://storage/subtitles.vtt" },
    }),
    post_image: async () => ({}),
    delete_image: async () => ({}),
    copy_image: async () => ({}),
    get_storage_usage: async () => ({}),
  },
};

const Video = require("../models/video");
const VideoSubtitle = require("../models/videoSubtitle");
const processingLimit = require("../utils/videoProcessingLimit");
const reservations = require("../utils/videoReservations");
const speechClient = require("../utils/speechClient");
const subtitleJob = require("../utils/videoSubtitleJob");

// A rota guarda as funções ao carregar: substituí-las antes do require da rota
Video.findOne = (filter) => {
  state.filters.push(filter);
  return lean(state.video);
};
VideoSubtitle.exists = async () => (state.duplicate ? { _id: "x" } : null);
VideoSubtitle.create = async (data) => {
  if (state.createError) throw state.createError;
  const job = {
    _id: new mongoose.Types.ObjectId(),
    state: "queued",
    progress: 0,
    detected_language: null,
    error: "",
    error_code: "",
    ...data,
  };
  state.createdJobs.push(job);
  return job;
};
VideoSubtitle.deleteOne = async ({ _id }) => {
  state.deletedJobs.push(_id);
};
VideoSubtitle.findOne = (filter) => {
  state.filters.push(filter);
  const query = lean(state.storedJob);
  query.sort = () => query;
  return query;
};
processingLimit.countActiveVideoJobs = async () => state.activeJobs;
processingLimit.maxActiveVideoJobs = () => 1;
reservations.getUploadCapacity = async () => state.capacity;
speechClient.checkSpeechService = async () => state.speechAvailable;
subtitleJob.processSubtitleJob = async (jobId, authorization) => {
  state.processedJobs.push({ jobId, authorization });
};
subtitleJob.cancelSubtitleJob = async (job) => {
  state.cancelledJobs.push(job._id);
  return { ...job, cancel_requested: true };
};
subtitleJob.recoverInterruptedSubtitleJobs = async () => {};
subtitleJob.retryPendingRefunds = async () => {};

axios.get = async (url) => {
  if (url.startsWith("https://users:10001/")) {
    state.quotaChecks += 1;
    if (state.quota === "exhausted") {
      const error = new Error("quota");
      error.response = { status: 701 };
      throw error;
    }
    if (state.quota === "down") throw new Error("users indisponível");
    return {};
  }
  return { data: state.vttText };
};
axios.post = async (url) => {
  if (url.includes("/process/refund/")) state.refunds += 1;
  return {};
};

const router = require("../routes/videoSubtitles");

function handler(method, routePath) {
  return router.stack.find(
    (layer) => layer.route?.path === routePath && layer.route.methods[method],
  ).route.stack[0].handle;
}

const postHandler = handler("post", "/");
const getLatestHandler = handler("get", "/");
const getVttHandler = handler("get", "/vtt/:videoId");
const getHandler = handler("get", "/:subtitleId");
const deleteHandler = handler("delete", "/:subtitleId");

function makeResponse() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      this.headersSent = true;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
  };
}

function request(extra = {}) {
  return {
    body: {},
    params: {},
    query: {},
    videoUser: { _id: userId, type: "free" },
    videoProject: { _id: projectId, video_ids: state.videoIds },
    headers: { authorization: "Bearer test-token" },
    ...extra,
  };
}

async function call(handle, extra) {
  const response = makeResponse();
  await handle(request(extra), response);
  // O processamento começa num setImmediate
  await new Promise((resolve) => setImmediate(resolve));
  return response;
}

const post = (body) => call(postHandler, { body });

// Nenhum pedido criado nem operação gasta
function assertNothingReserved() {
  assert.equal(state.createdJobs.length, 0);
  assert.equal(state.processedJobs.length, 0);
  assert.equal(state.quotaChecks, 0);
}

test.beforeEach(resetState);

// --- Criar o pedido (POST /) ---

test("TST-LEG-01 / REQ-VID-LEG-023: aceita um vídeo com áudio e cria um pedido queued", async () => {
  const response = await post({ video_id: videoId.toString(), language: "en" });

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.state, "queued");
  assert.equal(response.body.language, "en");

  assert.equal(state.createdJobs.length, 1);
  assert.equal(state.createdJobs[0].operation_reserved, true);
  assert.equal(state.createdJobs[0].user_type, "free");
  assert.equal(state.quotaChecks, 1);

  // O processamento começa em segundo plano com o token do pedido
  assert.deepEqual(state.processedJobs, [
    { jobId: state.createdJobs[0]._id, authorization: "Bearer test-token" },
  ]);
});

test("TST-LEG-02: usa o inglês quando o idioma não é indicado", async () => {
  const response = await post({ video_id: videoId.toString() });

  assert.equal(response.statusCode, 202);
  assert.equal(state.createdJobs[0].language, "en");
});

test("TST-LEG-03 / RN13: a resposta não expõe dados internos do pedido", async () => {
  const response = await post({ video_id: videoId.toString() });

  assert.deepEqual(Object.keys(response.body).sort(), [
    "_id",
    "detected_language",
    "error",
    "error_code",
    "language",
    "progress",
    "state",
    "video_id",
  ]);
});

test("TST-LEG-04 / REQ-VID-LEG-048: aceita um vídeo antigo sem informação de áudio", async () => {
  delete state.video.has_audio;

  const response = await post({ video_id: videoId.toString() });

  // A falta de áudio só é verificada durante o processamento
  assert.equal(response.statusCode, 202);
  assert.equal(state.createdJobs.length, 1);
});

test("TST-LEG-ERR-01: rejeita um identificador de vídeo inválido", async () => {
  const response = await post({ video_id: "not-an-object-id" });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /invalid video id/i);
  assertNothingReserved();
});

test("TST-LEG-ERR-02 / RN4: rejeita idiomas que não sejam inglês", async () => {
  for (const language of ["pt", "auto", ""]) {
    const response = await post({ video_id: videoId.toString(), language });

    assert.equal(response.statusCode, 400, language);
    assert.match(response.body.error, /unsupported subtitle language/i);
  }
  assertNothingReserved();
});

test("TST-LEG-ERR-03 / RN13: rejeita um vídeo que não pertence ao utilizador", async () => {
  state.video = null;

  const response = await post({ video_id: videoId.toString() });

  assert.equal(response.statusCode, 404);
  assert.match(response.body.error, /not found in this project/i);
  // A procura do vídeo filtra pelo dono e pelo projeto
  assert.equal(String(state.filters[0].user_id), String(userId));
  assert.equal(String(state.filters[0].project_id), String(projectId));
  assertNothingReserved();
});

test("TST-LEG-ERR-04 / REQ-VID-LEG-046: rejeita um vídeo retirado do projeto", async () => {
  state.videoIds = [];

  const response = await post({ video_id: videoId.toString() });

  assert.equal(response.statusCode, 404);
  assert.match(response.body.error, /not found in this project/i);
  assertNothingReserved();
});

test("TST-LEG-ERR-05 / REQ-VID-LEG-006: rejeita um vídeo sem faixa de áudio", async () => {
  state.video.has_audio = false;

  const response = await post({ video_id: videoId.toString() });

  assert.equal(response.statusCode, 422);
  assert.equal(response.body.error_code, "no_audio");
  assert.equal(response.body.error, "No audio track was found in this video.");
  assertNothingReserved();
});

test("TST-LEG-ERR-06 / REQ-VID-LEG-045: rejeita quando já há um pedido ativo para o vídeo", async () => {
  state.duplicate = true;

  const response = await post({ video_id: videoId.toString() });

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error_code, "duplicate");
  assertNothingReserved();
});

test("TST-LEG-ERR-07 / RN11: rejeita quando o limite de processamentos foi atingido", async () => {
  state.activeJobs = 1;

  const response = await post({ video_id: videoId.toString() });

  assert.equal(response.statusCode, 429);
  assert.equal(response.body.error_code, "limit");
  assertNothingReserved();
});

test("TST-LEG-ERR-08 / REQ-VID-LEG-041: rejeita sem espaço no projeto, indicando o projeto primeiro", async () => {
  state.capacity = { project_available_bytes: 0, account_available_bytes: 0 };

  const response = await post({ video_id: videoId.toString() });

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error_code, "storage");
  assert.equal(response.body.error, "Insufficient storage space in the project.");
  assertNothingReserved();
});

test("TST-LEG-ERR-09 / REQ-VID-LEG-041: rejeita sem espaço na conta", async () => {
  state.capacity = { project_available_bytes: 10_000, account_available_bytes: 0 };

  const response = await post({ video_id: videoId.toString() });

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error_code, "storage");
  assert.equal(response.body.error, "Insufficient storage space in the account.");
  assertNothingReserved();
});

test("TST-LEG-ERR-10 / A12: a estimativa de espaço usa 100 bytes por segundo de vídeo", async () => {
  state.capacity = { project_available_bytes: 5_000, account_available_bytes: 5_000 };

  // 60 s precisam de 6000 bytes: não cabe
  state.video.duration_seconds = 60;
  const tooLong = await post({ video_id: videoId.toString() });
  assert.equal(tooLong.statusCode, 409);

  // 10 s precisam do mínimo de 1024 bytes: cabe
  state.video.duration_seconds = 10;
  const fits = await post({ video_id: videoId.toString() });
  assert.equal(fits.statusCode, 202);
});

test("TST-LEG-ERR-11: rejeita quando o serviço de reconhecimento de fala está indisponível", async () => {
  state.speechAvailable = false;

  const response = await post({ video_id: videoId.toString() });

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.error_code, "service");
  assertNothingReserved();
});

test("TST-LEG-ERR-12 / RN7: rejeita quando a quota diária foi atingida", async () => {
  state.quota = "exhausted";

  const response = await post({ video_id: videoId.toString() });

  assert.equal(response.statusCode, 429);
  assert.equal(response.body.error_code, "quota");
  assert.equal(state.createdJobs.length, 0);
  assert.equal(state.refunds, 0);
});

test("TST-LEG-ERR-13: falha sem devolução quando a quota não pode ser verificada", async () => {
  state.quota = "down";

  const response = await post({ video_id: videoId.toString() });

  assert.equal(response.statusCode, 503);
  assert.equal(state.createdJobs.length, 0);
  // A operação não chegou a ser reservada
  assert.equal(state.refunds, 0);
});

test("TST-LEG-ERR-14 / RN7: devolve a operação se o pedido não puder ser criado", async () => {
  state.createError = new Error("database unavailable");

  const response = await post({ video_id: videoId.toString() });

  assert.equal(response.statusCode, 503);
  assert.match(response.body.error, /could not start/i);
  assert.equal(state.refunds, 1);
  assert.equal(state.processedJobs.length, 0);
});

// --- Consultar pedidos e legendas ---

const jobId = new mongoose.Types.ObjectId();

function storedJob(extra = {}) {
  return {
    _id: jobId,
    user_id: userId,
    project_id: projectId,
    video_id: videoId,
    language: "en",
    detected_language: "en",
    state: "processing",
    progress: 40,
    error: "",
    error_code: "",
    operation_reserved: true,
    ...extra,
  };
}

test("TST-LEG-05 / REQ-VID-LEG-017: consulta o estado de um pedido", async () => {
  state.storedJob = storedJob();

  const response = await call(getHandler, {
    params: { subtitleId: jobId.toString() },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.state, "processing");
  assert.equal(response.body.progress, 40);
  assert.equal(response.body.operation_reserved, undefined);
  assert.equal(response.headers["Cache-Control"], "no-store");
});

test("TST-LEG-ERR-15 / RN13: não permite consultar um pedido de outro proprietário", async () => {
  state.storedJob = null;

  const response = await call(getHandler, {
    params: { subtitleId: jobId.toString() },
  });

  assert.equal(response.statusCode, 404);
  assert.equal(String(state.filters[0].user_id), String(userId));
  assert.equal(String(state.filters[0].project_id), String(projectId));
});

test("TST-LEG-ERR-16: rejeita um identificador de pedido inválido", async () => {
  const get = await call(getHandler, { params: { subtitleId: "abc" } });
  const del = await call(deleteHandler, { params: { subtitleId: "abc" } });

  assert.equal(get.statusCode, 400);
  assert.equal(del.statusCode, 400);
});

test("TST-LEG-06 / REQ-VID-LEG-017: devolve o pedido mais recente de um vídeo", async () => {
  state.storedJob = storedJob({ state: "completed", progress: 100 });

  const response = await call(getLatestHandler, {
    query: { video_id: videoId.toString() },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.state, "completed");
  assert.equal(String(state.filters[0].user_id), String(userId));
});

test("TST-LEG-07: devolve null quando o vídeo nunca teve pedidos", async () => {
  const response = await call(getLatestHandler, {
    query: { video_id: videoId.toString() },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body, null);
});

test("TST-LEG-ERR-17: rejeita a consulta do último pedido sem vídeo válido", async () => {
  const response = await call(getLatestHandler, { query: {} });

  assert.equal(response.statusCode, 400);
});

test("TST-LEG-08 / REQ-VID-LEG-038: devolve o texto WebVTT e o idioma das legendas", async () => {
  state.video.subtitles_key = `${videoId}/subtitles/abc.vtt`;
  state.video.subtitles_language = "en";
  state.vttText = "WEBVTT\n\n1\n00:00:00.000 --> 00:00:01.000\nHello\n";

  const response = await call(getVttHandler, {
    params: { videoId: videoId.toString() },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { language: "en", vtt: state.vttText });
  assert.equal(String(state.filters[0].user_id), String(userId));
});

test("TST-LEG-ERR-18: devolve 404 quando o vídeo não tem legendas", async () => {
  const response = await call(getVttHandler, {
    params: { videoId: videoId.toString() },
  });

  assert.equal(response.statusCode, 404);
  assert.match(response.body.error, /subtitles not found/i);
});

// --- Cancelar (DELETE /:subtitleId) ---

test("TST-LEG-09 / RN10: cancela um pedido em curso", async () => {
  state.storedJob = storedJob();

  const response = await call(deleteHandler, {
    params: { subtitleId: jobId.toString() },
  });

  assert.equal(response.statusCode, 202);
  assert.deepEqual(state.cancelledJobs, [jobId]);
  // Só se procuram pedidos A aguardar ou A processar
  assert.deepEqual(state.filters[0].state, { $in: ["queued", "processing"] });
});

test("TST-LEG-ERR-19 / RN10: não cancela um pedido já terminado", async () => {
  state.storedJob = null;

  const response = await call(deleteHandler, {
    params: { subtitleId: jobId.toString() },
  });

  assert.equal(response.statusCode, 404);
  assert.match(response.body.error, /active subtitle request not found/i);
  assert.equal(state.cancelledJobs.length, 0);
});
