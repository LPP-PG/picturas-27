const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const userId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();
const uploadId = new mongoose.Types.ObjectId();

let state;

function reset() {
  state = {
    capacity: {
      revision: 7,
      account_available_bytes: 2_000_000_000,
      project_available_bytes: 500_000_000,
    },
    created: [],
    reserved: [],
    released: [],
    updates: [],
    slotAvailable: true,
    reserveFailureAt: 0,
    upload: {
      _id: uploadId,
      user_id: userId,
      project_id: projectId,
      video_id: new mongoose.Types.ObjectId(),
      name: "sample.mp4",
      expected_size_bytes: 1000,
      reserved_bytes: 1000,
      state: "waiting",
      cancel_requested: false,
      cleanup_pending: false,
      slot_acquired: false,
      error: "",
    },
  };
}

const reservationsPath = require.resolve("../utils/videoReservations");

require.cache[reservationsPath] = {
  id: reservationsPath,
  filename: reservationsPath,
  loaded: true,
  exports: {
    getUploadCapacity: async () => state.capacity,
    reserveUpload: async (data) => {
      state.reserved.push(data);
      if (state.reserved.length === state.reserveFailureAt) {
        const error = new Error("Storage unavailable");
        error.status = 503;
        throw error;
      }
    },
    releaseUploadReservation: async (user, upload) => {
      state.released.push({ user, upload });
    },
    acquireUploadSlot: async () => state.slotAvailable,
  },
};

const VideoUpload = require("../models/videoUpload");

VideoUpload.create = async (data) => {
  const upload = {
    _id: new mongoose.Types.ObjectId(),
    cancel_requested: false,
    cleanup_pending: false,
    error: "",
    ...data,
  };
  state.created.push(upload);
  return upload;
};

VideoUpload.findOne = async (filter) => {
  state.lastLookup = filter;
  return state.upload;
};

VideoUpload.updateOne = async (filter, update) => {
  state.updates.push({ filter, update });
  if (state.upload && String(filter._id) === String(state.upload._id)) {
    Object.assign(state.upload, update.$set || {});
  }
  return { modifiedCount: 1 };
};

VideoUpload.findOneAndUpdate = async (filter, update) => {
  if (!state.upload || state.upload.state !== filter.state) return null;
  Object.assign(state.upload, update.$set);
  return state.upload;
};

VideoUpload.findByIdAndUpdate = async (id, update) => {
  Object.assign(state.upload, update.$set);
  return state.upload;
};

VideoUpload.findById = async () => state.upload;

const router = require("../routes/videoUploads");

function response() {
  return {
    statusCode: 200,
    headers: {},
    headersSent: false,
    destroyed: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    json(body) {
      this.body = body;
      this.headersSent = true;
      return this;
    },
  };
}

async function call(method, route, changes = {}) {
  const layer = router.stack.find(
    (item) => item.route?.path === route && item.route.methods[method],
  );
  assert.ok(layer, `Missing route: ${method} ${route}`);

  const req = {
    body: {},
    params: { upload: String(uploadId) },
    headers: { authorization: "Bearer test-token" },
    videoUser: { _id: userId, type: "free" },
    videoProject: { _id: projectId },
    videoLimits: { maxSizeBytes: 100_000_000 },
    aborted: false,
    ...changes,
  };

  const res = response();
  await layer.route.stack[0].handle(req, res);
  return res;
}

test.beforeEach(reset);

test("TST-UP-ROUTE-01: reserva todos os ficheiros de uma seleção válida", async () => {
  const res = await call("post", "/uploads", {
    body: {
      files: [
        { name: "first.mp4", size_bytes: 1000 },
        { name: "second.MOV", size_bytes: 2000 },
      ],
    },
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.uploads.length, 2);
  assert.equal(state.reserved.length, 2);
  assert.deepEqual(state.reserved.map((item) => item.bytes), [1000, 2000]);
  assert.ok(state.created.every((item) => item.state === "waiting"));
  assert.ok(state.reserved.every(
    (item) => item.userId === userId && item.projectId === projectId,
  ));
});

test("TST-UP-ROUTE-02: rejeita seleção vazia, formatos e tamanhos inválidos", async () => {
  const selections = [
    [],
    [{ name: "file.txt", size_bytes: 1000 }],
    [{ name: "file.mp4", size_bytes: 0 }],
    [{ name: "file.mp4", size_bytes: -1 }],
    [{ name: "file.mp4", size_bytes: 1.5 }],
    [{ name: "file.mp4", size_bytes: 100_000_001 }],
  ];

  for (const files of selections) {
    reset();
    const res = await call("post", "/uploads", { body: { files } });
    assert.equal(res.statusCode, 400, JSON.stringify(files));
    assert.equal(state.created.length, 0);
    assert.equal(state.reserved.length, 0);
  }
});

test("TST-UP-ROUTE-03: rejeita seleção acima do espaço do projeto ou da conta", async () => {
  for (const field of ["project_available_bytes", "account_available_bytes"]) {
    reset();
    state.capacity[field] = 999;
    const res = await call("post", "/uploads", {
      body: { files: [{ name: "file.mp4", size_bytes: 1000 }] },
    });
    assert.equal(res.statusCode, 409);
    assert.equal(state.created.length, 0);
  }
});

test("TST-UP-ROUTE-04: reverte a seleção se uma reserva posterior falhar", async () => {
  state.reserveFailureAt = 2;
  const res = await call("post", "/uploads", {
    body: {
      files: [
        { name: "first.mp4", size_bytes: 1000 },
        { name: "second.mp4", size_bytes: 1000 },
      ],
    },
  });

  assert.equal(res.statusCode, 503);
  assert.equal(state.created.length, 2);
  assert.deepEqual(
    state.released.map((item) => String(item.upload)),
    state.created.map((item) => String(item._id)),
  );
  assert.equal(state.updates.length, 2);
  assert.ok(state.updates.every(
    (item) => item.update.$set.state === "failed"
      && item.update.$set.reserved_bytes === 0,
  ));
});

test("TST-UP-ROUTE-05: consulta restringida ao proprietário e ao projeto", async () => {
  state.upload = null;
  const res = await call("get", "/uploads/:upload");

  assert.equal(res.statusCode, 404);
  assert.equal(state.lastLookup.user_id, userId);
  assert.equal(state.lastLookup.project_id, projectId);
  assert.equal(state.lastLookup._id, String(uploadId));
});

test("TST-UP-ROUTE-06: rejeita identificador de upload inválido", async () => {
  const res = await call("get", "/uploads/:upload", {
    params: { upload: "invalid-id" },
  });
  assert.equal(res.statusCode, 400);
  assert.equal(state.lastLookup, undefined);
});

test("TST-UP-ROUTE-07: cancelar upload em espera liberta a reserva", async () => {
  const res = await call("delete", "/uploads/:upload");

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.state, "cancelled");
  assert.equal(res.body.cleanup_pending, false);
  assert.equal(state.upload.reserved_bytes, 0);
  assert.equal(state.released.length, 1);
  assert.equal(String(state.released[0].upload), String(uploadId));
});

test("TST-UP-ROUTE-08: cancelamento ativo aguarda limpeza pelo worker", async () => {
  state.upload.state = "uploading";
  state.upload.slot_acquired = true;
  const res = await call("delete", "/uploads/:upload");

  assert.equal(res.statusCode, 202);
  assert.equal(res.body.cancel_requested, true);
  assert.equal(state.released.length, 0);
  assert.equal(state.upload.reserved_bytes, 1000);
});

test("TST-UP-ROUTE-09: cancelar upload concluído preserva o resultado", async () => {
  state.upload.state = "completed";
  const res = await call("delete", "/uploads/:upload");

  assert.equal(res.body.state, "completed");
  assert.equal(state.released.length, 0);
  assert.equal(state.updates.length, 0);
});

test("TST-UP-ROUTE-10: recusa início quando as vagas estão ocupadas", async () => {
  state.slotAvailable = false;
  const res = await call("post", "/uploads/:upload/start");

  assert.equal(res.statusCode, 429);
  assert.equal(res.body.code, "UPLOAD_SLOTS_FULL");
  assert.equal(state.upload.state, "waiting");
});

test("TST-UP-ROUTE-11: inicia upload após adquirir uma vaga", async () => {
  const res = await call("post", "/uploads/:upload/start");

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.state, "uploading");
  assert.equal(state.upload.slot_acquired, true);
});

test("TST-UP-ROUTE-12: capacidade não expõe a revisão interna e evita cache", async () => {
  const res = await call("get", "/capacity");

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.equal(res.body.revision, undefined);
  assert.equal(res.body.project_available_bytes, 500_000_000);
});
