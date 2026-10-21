const test = require("node:test");
const assert = require("node:assert/strict");

const axios = require("axios");
const mongoose = require("mongoose");

const userId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();
const videoId = new mongoose.Types.ObjectId();

const state = {
  activeJobs: 0,
  capacity: {
    account_available_bytes: 10_000_000,
    project_available_bytes: 10_000_000,
  },
  quotaAvailable: true,
  video: {
    _id: videoId,
    user_id: userId,
    project_id: projectId,
    duration_seconds: 5,
    size_bytes: 1_000_000,
    format: "mp4",
  },
  createdJobs: [],
  deletedJobs: [],
  releasedReservations: [],
  reservedReservations: [],
  processedJobs: [],
  cancelledJobs: [],
  reserveError: null,
  refunds: 0,
};

function resetState() {
  state.activeJobs = 0;
  state.capacity = {
    account_available_bytes: 10_000_000,
    project_available_bytes: 10_000_000,
  };
  state.quotaAvailable = true;
  state.video = {
    _id: videoId,
    user_id: userId,
    project_id: projectId,
    duration_seconds: 5,
    size_bytes: 1_000_000,
    format: "mp4",
  };
  state.createdJobs.length = 0;
  state.deletedJobs.length = 0;
  state.releasedReservations.length = 0;
  state.reservedReservations.length = 0;
  state.processedJobs.length = 0;
  state.cancelledJobs.length = 0;
  state.reserveError = null;
  state.refunds = 0;
}

function lean(value) {
  return { lean: async () => value };
}

const Video = require("../models/video");
const VideoTrim = require("../models/videoTrim");
const processingLimit = require("../utils/videoProcessingLimit");
const reservations = require("../utils/videoReservations");
const videoTrim = require("../utils/videoTrim");
const realProcessTrim = videoTrim.processTrim;

Video.findOne = () => lean(state.video);
VideoTrim.create = async (data) => {
  const job = {
    _id: new mongoose.Types.ObjectId(),
    state: "queued",
    progress: 0,
    error: "",
    cancel_requested: false,
    finished_at: null,
    ...data,
  };
  state.createdJobs.push(job);
  return job;
};
VideoTrim.deleteOne = async ({ _id }) => {
  state.deletedJobs.push(_id);
};
processingLimit.countActiveVideoJobs = async () => state.activeJobs;
processingLimit.maxActiveVideoJobs = () => 1;
reservations.getUploadCapacity = async () => state.capacity;
reservations.reserveUpload = async (data) => {
  if (state.reserveError) throw state.reserveError;
  state.reservedReservations.push(data);
};
reservations.releaseUploadReservation = async (user, upload) => {
  state.releasedReservations.push({ user, upload });
};
videoTrim.processTrim = async (jobId) => {
  state.processedJobs.push(jobId);
};
videoTrim.cancelTrimJob = async (job) => {
  state.cancelledJobs.push(job._id);
  return { ...job, cancel_requested: true };
};

axios.get = async () => {
  if (!state.quotaAvailable) {
    const error = new Error("quota");
    error.response = { status: 701 };
    throw error;
  }
  return {};
};
axios.post = async (url) => {
  if (url.includes("/process/refund/")) state.refunds += 1;
  return {};
};

const router = require("../routes/videoTrim");
const postHandler = router.stack.find(
  (layer) => layer.route?.path === "/" && layer.route.methods.post,
).route.stack[0].handle;
const getHandler = router.stack.find(
  (layer) => layer.route?.path === "/:trimId" && layer.route.methods.get,
).route.stack[0].handle;
const deleteHandler = router.stack.find(
  (layer) => layer.route?.path === "/:trimId" && layer.route.methods.delete,
).route.stack[0].handle;

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

async function post(body) {
  const response = makeResponse();
  await postHandler(
    {
      body,
      videoUser: { _id: userId, type: "free" },
      videoProject: { _id: projectId },
      headers: { authorization: "Bearer test-token" },
    },
    response,
  );
  await new Promise((resolve) => setImmediate(resolve));
  return response;
}

test.beforeEach(resetState);

test("TST-TRIM-ERR-00 / REQ-VID-STATUS-020: não permite consultar um pedido de outro proprietário", async () => {
  VideoTrim.findOne = async () => null;
  const response = makeResponse();

  await getHandler(
    {
      params: { trimId: new mongoose.Types.ObjectId().toString() },
      videoUser: { _id: userId, type: "free" },
      videoProject: { _id: projectId },
    },
    response,
  );

  assert.equal(response.statusCode, 404);
  assert.match(response.body.error, /not found/i);
});

test("TST-TRIM-01: aceita um intervalo válido e cria um job queued", async () => {
  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 1,
    end_seconds: 3,
  });

  assert.equal(response.statusCode, 202);
  assert.equal(state.createdJobs.length, 1);
  assert.equal(state.createdJobs[0].output_format, "mp4");
  assert.equal(state.createdJobs[0].start_seconds, 1);
  assert.equal(state.createdJobs[0].end_seconds, 3);
  assert.equal(state.createdJobs[0].operation_reserved, true);
  assert.equal(state.reservedReservations.length, 1);
  assert.equal(state.processedJobs.length, 1);
  // A reserva de espaço é libertada quando o processamento termina
  assert.deepEqual(state.releasedReservations, [
    { user: userId, upload: state.createdJobs[0]._id },
  ]);
  assert.equal(state.refunds, 0);
});

test("TST-TRIM-01B / REQ-VID-TRIM-005: usa o formato do original quando não é indicado", async () => {
  state.video.format = "mov";

  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 1,
    end_seconds: 3,
  });

  assert.equal(response.statusCode, 202);
  assert.equal(state.createdJobs[0].output_format, "mov");
});

test("TST-TRIM-01C / REQ-VID-TRIM-005: aceita um formato de saída diferente do original", async () => {
  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 1,
    end_seconds: 3,
    output_format: "mov",
  });

  assert.equal(response.statusCode, 202);
  assert.equal(state.createdJobs[0].output_format, "mov");
});

test("TST-TRIM-01D / REQ-VID-TRIM-040: reserva espaço proporcional ao intervalo", async () => {
  // 2 s de 5 s com 1 MB: 1 MB × 0,4 × 1,5 = 600 000 bytes
  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 1,
    end_seconds: 3,
  });

  assert.equal(response.statusCode, 202);
  assert.equal(state.createdJobs[0].reserved_bytes, 600_000);
  assert.equal(state.reservedReservations[0].bytes, 600_000);
  assert.equal(String(state.reservedReservations[0].projectId), String(projectId));
});

test("TST-TRIM-01E / REQ-VID-TRIM-040: a estimativa nunca passa do tamanho do original", async () => {
  // 4 s de 5 s daria 1,2 MB; fica limitada a 1 MB
  await post({
    video_id: videoId.toString(),
    start_seconds: 0,
    end_seconds: 4,
  });

  assert.equal(state.createdJobs[0].reserved_bytes, 1_000_000);
});

test("TST-TRIM-ERR-01: rejeita um identificador de vídeo inválido", async () => {
  const response = await post({
    video_id: "not-an-object-id",
    start_seconds: 1,
    end_seconds: 3,
  });

  assert.equal(response.statusCode, 400);
  assert.equal(state.createdJobs.length, 0);
});

test("TST-TRIM-ERR-02: rejeita um formato de saída não suportado", async () => {
  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 1,
    end_seconds: 3,
    output_format: "avi",
  });

  assert.equal(response.statusCode, 400);
  assert.equal(state.createdJobs.length, 0);
});

test("TST-TRIM-ERR-03: rejeita segundos fracionários", async () => {
  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 1.5,
    end_seconds: 3,
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /whole seconds/i);
});

test("TST-TRIM-ERR-04: rejeita intervalos inválidos", async () => {
  for (const interval of [
    { start_seconds: 3, end_seconds: 3 },
    { start_seconds: 4, end_seconds: 2 },
    { start_seconds: -1, end_seconds: 2 },
  ]) {
    resetState();
    const response = await post({
      video_id: videoId.toString(),
      ...interval,
    });
    assert.equal(response.statusCode, 400, JSON.stringify(interval));
    assert.equal(state.createdJobs.length, 0, JSON.stringify(interval));
  }
});

test("TST-TRIM-ERR-04A: rejeita um fim superior à duração do vídeo", async () => {
  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 0,
    end_seconds: 6,
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /trim interval is invalid/i);
  assert.equal(state.createdJobs.length, 0);
});

test("TST-TRIM-ERR-04B: rejeita um fim que não seja um segundo inteiro", async () => {
  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 0,
    end_seconds: 4.5,
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /whole seconds/i);
  assert.equal(state.createdJobs.length, 0);
});

test("TST-TRIM-ERR-05: rejeita o intervalo correspondente ao vídeo inteiro", async () => {
  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 0,
    end_seconds: 5,
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /shorter than the full video/i);
  assert.equal(state.createdJobs.length, 0);
});

test("TST-TRIM-ERR-05B: rejeita um vídeo cuja duração não permite um intervalo inteiro", async () => {
  const originalDuration = state.video.duration_seconds;
  state.video.duration_seconds = 0.5;

  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 0,
    end_seconds: 1,
  });

  assert.equal(response.statusCode, 400);
  assert.equal(state.createdJobs.length, 0);
  state.video.duration_seconds = originalDuration;
});

test("TST-TRIM-ERR-06 / REQ-VID-STATUS-020: rejeita acesso a vídeo que não pertence ao projeto", async () => {
  Video.findOne = () => lean(null);
  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 1,
    end_seconds: 3,
  });

  assert.equal(response.statusCode, 404);
  assert.equal(state.createdJobs.length, 0);
  Video.findOne = () => lean(state.video);
});

test("TST-TRIM-ERR-07: rejeita quando o limite de jobs ativos foi atingido", async () => {
  state.activeJobs = 1;
  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 1,
    end_seconds: 3,
  });

  assert.equal(response.statusCode, 429);
  assert.match(response.body.error, /simultaneous/i);
  assert.equal(state.createdJobs.length, 0);
});

test("TST-TRIM-ERR-08: rejeita quando não existe espaço suficiente", async () => {
  state.capacity.account_available_bytes = 1;
  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 1,
    end_seconds: 3,
  });

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error, "Insufficient storage space in the account.");
  assert.equal(state.createdJobs.length, 0);
  assert.equal(state.refunds, 0);
});

test("TST-TRIM-ERR-08B / REQ-VID-TRIM-040: indica o projeto quando é o projeto que não tem espaço", async () => {
  state.capacity.project_available_bytes = 1;
  state.capacity.account_available_bytes = 1;
  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 1,
    end_seconds: 3,
  });

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error, "Insufficient storage space in the project.");
  assert.equal(state.createdJobs.length, 0);
});

test("TST-TRIM-ERR-08C / REQ-VID-TRIM-040: aceita quando o espaço livre chega à estimativa", async () => {
  state.capacity.project_available_bytes = 599_999;
  const tooSmall = await post({
    video_id: videoId.toString(),
    start_seconds: 1,
    end_seconds: 3,
  });
  assert.equal(tooSmall.statusCode, 409);

  state.capacity.project_available_bytes = 600_000;
  const enough = await post({
    video_id: videoId.toString(),
    start_seconds: 1,
    end_seconds: 3,
  });
  assert.equal(enough.statusCode, 202);
});

test("TST-TRIM-ERR-09: rejeita quando a quota diária não está disponível", async () => {
  state.quotaAvailable = false;
  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 1,
    end_seconds: 3,
  });

  assert.equal(response.statusCode, 429);
  assert.match(response.body.error, /daily operations/i);
  assert.equal(state.createdJobs.length, 0);
});

test("TST-TRIM-ERR-09B / REQ-VID-STATUS-012: rejeita quando o serviço de processamento está indisponível", async () => {
  axios.get = async () => {
    throw new Error("users service unavailable");
  };

  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 1,
    end_seconds: 3,
  });

  assert.equal(response.statusCode, 503);
  assert.match(response.body.error, /temporarily unavailable/i);
  assert.equal(state.createdJobs.length, 0);

  axios.get = async () => {
    if (!state.quotaAvailable) {
      const error = new Error("quota");
      error.response = { status: 701 };
      throw error;
    }
    return {};
  };
});

test("TST-TRIM-ERR-10: limpa o job e a reserva se a preparação falhar", async () => {
  VideoTrim.create = async () => {
    throw new Error("database unavailable");
  };

  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 1,
    end_seconds: 3,
  });

  assert.equal(response.statusCode, 503);
  assert.equal(state.createdJobs.length, 0);
  assert.equal(state.releasedReservations.length, 0);
  // RN4: a operação já reservada é devolvida
  assert.equal(state.refunds, 1);
  VideoTrim.create = async (data) => {
    const job = {
      _id: new mongoose.Types.ObjectId(),
      state: "queued",
      progress: 0,
      error: "",
      cancel_requested: false,
      finished_at: null,
      ...data,
    };
    state.createdJobs.push(job);
    return job;
  };
});

test("TST-TRIM-ERR-10B / RN4: se a reserva de espaço falhar, apaga o job, liberta a reserva e devolve a operação", async () => {
  state.reserveError = new Error("reservation failed");

  const response = await post({
    video_id: videoId.toString(),
    start_seconds: 1,
    end_seconds: 3,
  });

  const job = state.createdJobs[0];
  assert.equal(response.statusCode, 503);
  assert.match(response.body.error, /could not start the video trim/i);
  assert.deepEqual(state.deletedJobs, [job._id]);
  assert.deepEqual(state.releasedReservations, [{ user: userId, upload: job._id }]);
  assert.equal(state.refunds, 1);
  assert.equal(state.processedJobs.length, 0);
});

test("TST-TRIM-ERR-10C / RN4: a quota esgotada não devolve nenhuma operação", async () => {
  state.quotaAvailable = false;

  await post({ video_id: videoId.toString(), start_seconds: 1, end_seconds: 3 });

  assert.equal(state.refunds, 0);
});

// --- Consultar e cancelar pedidos ---

const trimId = new mongoose.Types.ObjectId();

function storedTrim(extra = {}) {
  return {
    _id: trimId,
    user_id: userId,
    project_id: projectId,
    source_video_id: videoId,
    result_video_id: new mongoose.Types.ObjectId(),
    reserved_bytes: 600_000,
    start_seconds: 1,
    end_seconds: 3,
    output_format: "mp4",
    state: "processing",
    progress: 40,
    cancel_requested: false,
    operation_reserved: true,
    error: "",
    ...extra,
  };
}

async function callTrim(handle, id) {
  const response = makeResponse();
  await handle(
    {
      params: { trimId: id },
      videoUser: { _id: userId, type: "free" },
      videoProject: { _id: projectId },
    },
    response,
  );
  return response;
}

test("TST-TRIM-12 / REQ-VID-TRIM-015: o proprietário consulta o estado do seu pedido", async () => {
  const filters = [];
  VideoTrim.findOne = async (filter) => {
    filters.push(filter);
    return storedTrim();
  };

  const response = await callTrim(getHandler, trimId.toString());

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.state, "processing");
  assert.equal(response.body.progress, 40);
  assert.equal(response.body.operation_reserved, undefined);
  assert.equal(response.headers["Cache-Control"], "no-store");
  assert.equal(String(filters[0].user_id), String(userId));
  assert.equal(String(filters[0].project_id), String(projectId));
});

test("TST-TRIM-ERR-12: rejeita um identificador de pedido inválido", async () => {
  let queried = false;
  VideoTrim.findOne = async () => {
    queried = true;
    return null;
  };

  for (const handle of [getHandler, deleteHandler]) {
    const response = await callTrim(handle, "not-an-object-id");

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.error, "Invalid trim request ID.");
  }
  assert.equal(queried, false);
});

test("TST-TRIM-ERR-13: uma falha ao consultar não fala em iniciar o recorte", async () => {
  VideoTrim.findOne = async () => {
    throw new Error("database unavailable");
  };

  const get = await callTrim(getHandler, trimId.toString());
  const del = await callTrim(deleteHandler, trimId.toString());

  assert.equal(get.statusCode, 503);
  assert.equal(get.body.error, "Could not retrieve the trim request.");
  assert.equal(del.statusCode, 503);
  assert.equal(del.body.error, "Could not cancel the video trim.");
});

test("TST-TRIM-13 / RN6: cancela um pedido ativo", async () => {
  const filters = [];
  VideoTrim.findOne = async (filter) => {
    filters.push(filter);
    return storedTrim();
  };

  const response = await callTrim(deleteHandler, trimId.toString());

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.cancel_requested, true);
  assert.deepEqual(state.cancelledJobs, [trimId]);
  // Só se procuram pedidos A aguardar ou A processar do próprio utilizador
  assert.deepEqual(filters[0].state, { $in: ["queued", "processing"] });
  assert.equal(String(filters[0].user_id), String(userId));
});

test("TST-TRIM-ERR-14 / RN6: não cancela um pedido terminado ou de outro proprietário", async () => {
  VideoTrim.findOne = async () => null;

  const response = await callTrim(deleteHandler, trimId.toString());

  assert.equal(response.statusCode, 404);
  assert.match(response.body.error, /not found or already finished/i);
  assert.equal(state.cancelledJobs.length, 0);
});

test("TST-TRIM-ERR-11: falha o job e devolve a operação se o original desaparecer", async () => {
  const job = {
    _id: new mongoose.Types.ObjectId(),
    user_id: userId,
    project_id: projectId,
    source_video_id: videoId,
    result_video_id: new mongoose.Types.ObjectId(),
    user_type: "free",
    state: "queued",
    progress: 0,
    operation_reserved: true,
    cancel_requested: false,
  };
  const updates = [];
  const deletedResults = [];

  VideoTrim.findById = async () => job;
  VideoTrim.updateOne = async (filter, update) => {
    updates.push({ filter, update });
    if (update.$set) Object.assign(job, update.$set);
  };
  Video.findOne = () => lean(null);
  Video.deleteOne = async (filter) => {
    deletedResults.push(filter);
  };
  axios.post = async () => ({});

  await realProcessTrim(job._id, "Bearer test-token", "free");

  const finalUpdate = updates.at(-1).update.$set;
  assert.equal(finalUpdate.state, "failed");
  assert.equal(finalUpdate.operation_reserved, false);
  assert.equal(finalUpdate.reserved_bytes, 0);
  assert.equal(deletedResults.length, 1);
  assert.equal(job.operation_reserved, false);
});
