const test = require("node:test");
const assert = require("node:assert/strict");

let state;

const storagePath = require.resolve("../utils/imageStorage");
require.cache[storagePath] = {
  id: storagePath,
  filename: storagePath,
  loaded: true,
  exports: {
    get_storage_usage: async () => state.storage,
  },
};

const VideoAccount = require("../models/videoAccount");
const Video = require("../models/video");

Video.find = () => ({
  select: () => ({
    lean: async () => state.videos,
  }),
});

VideoAccount.findById = () => ({
  lean: async () => state.account,
});

VideoAccount.findOne = () => ({
  lean: async () => state.existing,
});

VideoAccount.updateOne = async (filter, update) => {
  state.updates.push({ filter, update });
  return { modifiedCount: 1 };
};

const {
  getUploadCapacity,
  reserveUpload,
  releaseUploadReservation,
} = require("../utils/videoReservations");

function reset() {
  state = {
    storage: { total_bytes: 0, groups: {} },
    videos: [],
    account: { revision: 0, reservations: [] },
    existing: null,
    updates: [],
  };
}

const request = {
  userId: "owner-test",
  projectId: "project-a",
  userType: "free",
  authorization: "Bearer test-token",
};

function reserve(changes = {}) {
  return reserveUpload({
    ...request,
    uploadId: "upload-test",
    bytes: 1000,
    ...changes,
  });
}

test.beforeEach(reset);

test("TST-UP-SPACE-01: exclui miniaturas mas contabiliza vídeos e legendas", async () => {
  state.videos = [{ _id: "video-a", project_id: "project-a" }];
  state.storage = {
    total_bytes: 1150,
    groups: {
      "video-a": {
        total_bytes: 1150,
        stages: { src: 1000, preview: 100, subtitles: 50 },
      },
    },
  };

  const capacity = await getUploadCapacity(request);

  assert.equal(capacity.occupied.account_bytes, 1050);
  assert.equal(capacity.occupied.project_bytes, 1050);
  assert.equal(capacity.account_available_bytes, 2_000_000_000 - 1050);
  assert.equal(capacity.project_available_bytes, 500_000_000 - 1050);
});

test("TST-UP-SPACE-02: separa ocupação do projeto e ocupação global da conta", async () => {
  state.videos = [
    { _id: "video-a", project_id: "project-a" },
    { _id: "video-b", project_id: "project-b" },
  ];
  state.storage = {
    total_bytes: 4200,
    groups: {
      "project-a": { total_bytes: 500, stages: { src: 500 } },
      "video-a": {
        total_bytes: 1100,
        stages: { src: 1000, preview: 100 },
      },
      "video-b": {
        total_bytes: 2100,
        stages: { src: 2000, preview: 100 },
      },
      "image-project": { total_bytes: 500, stages: { src: 500 } },
    },
  };

  const capacity = await getUploadCapacity(request);

  assert.equal(capacity.occupied.project_bytes, 1500);
  assert.equal(capacity.occupied.account_bytes, 4000);
});

test("TST-UP-SPACE-03: reservas de outros projetos também reduzem espaço da conta", async () => {
  state.account.reservations = [
    { upload_id: "first", project_id: "project-a", bytes: 1000 },
    { upload_id: "second", project_id: "project-b", bytes: 2000 },
  ];

  const capacity = await getUploadCapacity(request);

  assert.equal(capacity.reserved_account_bytes, 3000);
  assert.equal(capacity.reserved_project_bytes, 1000);
  assert.equal(capacity.account_available_bytes, 2_000_000_000 - 3000);
  assert.equal(capacity.project_available_bytes, 500_000_000 - 1000);
});

test("TST-UP-SPACE-04: recusa capacidade quando o armazenamento devolve dados inválidos", async () => {
  state.storage.total_bytes = -1;

  await assert.rejects(getUploadCapacity(request), { status: 503 });
});

test("TST-UP-SPACE-05: aceita reserva exatamente no espaço restante do projeto", async () => {
  state.account.reservations = [
    {
      upload_id: "previous",
      project_id: "project-a",
      bytes: 499_999_000,
    },
  ];

  await reserve();

  const writes = state.updates.filter((item) => item.update.$push);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].update.$push.reservations.bytes, 1000);
  assert.equal(writes[0].update.$push.reservations.active, false);
});

test("TST-UP-SPACE-06: rejeita reserva um byte acima do espaço do projeto", async () => {
  state.account.reservations = [
    {
      upload_id: "previous",
      project_id: "project-a",
      bytes: 499_999_001,
    },
  ];

  await assert.rejects(reserve(), { status: 409 });
  assert.equal(state.updates.filter((item) => item.update.$push).length, 0);
});

test("TST-UP-SPACE-07: rejeita reserva acima do espaço global da conta", async () => {
  state.account.reservations = [
    {
      upload_id: "other",
      project_id: "project-b",
      bytes: 1_999_999_001,
    },
  ];

  await assert.rejects(reserve(), { status: 409 });
  assert.equal(state.updates.filter((item) => item.update.$push).length, 0);
});

test("TST-UP-SPACE-08: repetir a mesma reserva não duplica os bytes", async () => {
  state.existing = {
    reservations: [{
      upload_id: "upload-test",
      project_id: "project-a",
      bytes: 1000,
    }],
  };

  await reserve();

  assert.equal(state.updates.filter((item) => item.update.$push).length, 0);
});

test("TST-UP-SPACE-09: não reutiliza reserva com outro tamanho ou projeto", async () => {
  state.existing = {
    reservations: [{
      upload_id: "upload-test",
      project_id: "project-a",
      bytes: 1000,
    }],
  };

  await assert.rejects(reserve({ bytes: 2000 }), { status: 409 });
  await assert.rejects(reserve({ projectId: "project-b" }), { status: 409 });
});

test("TST-UP-SPACE-10: libertação identifica apenas a reserva indicada", async () => {
  await releaseUploadReservation("owner-test", "upload-test");

  assert.equal(state.updates.length, 1);
  assert.deepEqual(state.updates[0].filter, {
    _id: "owner-test",
    "reservations.upload_id": "upload-test",
  });
  assert.deepEqual(state.updates[0].update.$pull, {
    reservations: { upload_id: "upload-test" },
  });
});
