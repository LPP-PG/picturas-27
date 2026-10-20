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
};

function resetState() {
  state.activeJobs = 0;
  state.capacity = {
    account_available_bytes: 10_000_000,
    project_available_bytes: 10_000_000,
  };
  state.quotaAvailable = true;
  state.createdJobs.length = 0;
  state.deletedJobs.length = 0;
  state.releasedReservations.length = 0;
  state.reservedReservations.length = 0;
  state.processedJobs.length = 0;
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
  state.reservedReservations.push(data);
};
reservations.releaseUploadReservation = async (user, upload) => {
  state.releasedReservations.push({ user, upload });
};
videoTrim.processTrim = async (jobId) => {
  state.processedJobs.push(jobId);
};

axios.get = async () => {
  if (!state.quotaAvailable) {
    const error = new Error("quota");
    error.response = { status: 701 };
    throw error;
  }
  return {};
};
axios.post = async () => ({});

const router = require("../routes/videoTrim");
const postHandler = router.stack.find(
  (layer) => layer.route?.path === "/" && layer.route.methods.post,
).route.stack[0].handle;
const getHandler = router.stack.find(
  (layer) => layer.route?.path === "/:trimId" && layer.route.methods.get,
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

test("TST-TRIM-ERR-00 / REQ-VID-TRIM-034: não permite consultar um pedido de outro proprietário", async () => {
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
  assert.equal(state.reservedReservations.length, 1);
  assert.equal(state.processedJobs.length, 1);
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

test("TST-TRIM-ERR-06 / REQ-VID-TRIM-034: rejeita acesso a vídeo que não pertence ao projeto", async () => {
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
  assert.match(response.body.error, /storage/i);
  assert.equal(state.createdJobs.length, 0);
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

test("TST-TRIM-ERR-09B / REQ-VID-TRIM-032: rejeita quando o serviço de processamento está indisponível", async () => {
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
