const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");

// Substituir o armazenamento antes de carregar o módulo
const deleted = [];
const storagePath = require.resolve("../utils/imageStorage");
require.cache[storagePath] = {
  id: storagePath,
  filename: storagePath,
  loaded: true,
  exports: {
    get_image_internal_url: async () => ({ data: {} }),
    post_image: async () => ({}),
    delete_image: async (...args) => {
      deleted.push(args);
    },
  },
};

const Video = require("../models/video");
const VideoSubtitle = require("../models/videoSubtitle");
const {
  recoverInterruptedSubtitleJobs,
  retryPendingRefunds,
} = require("../utils/videoSubtitleJob");

// Simula a coleção: pedidos em memória e chamadas ao serviço de utilizadores
function setup({ jobs, video = null, refundOk = true }) {
  const state = { updates: [], refunds: 0 };
  deleted.length = 0;

  VideoSubtitle.find = async () => jobs;
  VideoSubtitle.exists = async (filter) =>
    jobs.some(
      (job) =>
        String(job._id) === String(filter._id) &&
        job.operation_reserved === filter.operation_reserved,
    )
      ? { _id: filter._id }
      : null;
  VideoSubtitle.updateOne = async (filter, update) => {
    state.updates.push({ filter, update });
    const job = jobs.find((item) => String(item._id) === String(filter._id));
    if (job && update.$set.operation_reserved === false) {
      job.operation_reserved = false;
    }
    return { matchedCount: job ? 1 : 0 };
  };
  Video.findOne = () => ({ select: () => ({ lean: async () => video }) });
  axios.post = async () => {
    state.refunds += 1;
    if (!refundOk) throw new Error("users indisponível");
    return {};
  };

  return state;
}

const job = (extra = {}) => ({
  _id: "64b000000000000000000001",
  user_id: "64b000000000000000000002",
  video_id: "64b000000000000000000003",
  state: "processing",
  operation_reserved: true,
  ...extra,
});

test("TST-LEG-REC-01: recuperação — legendas já ligadas ao vídeo concluem o pedido sem devolução", async () => {
  const j = job();
  const state = setup({
    jobs: [j],
    video: { subtitles_key: `${j.video_id}/subtitles/${j._id}.vtt` },
  });

  await recoverInterruptedSubtitleJobs(new Date());

  assert.equal(state.refunds, 0);
  assert.equal(deleted.length, 0);
  assert.equal(state.updates.length, 1);
  assert.equal(state.updates[0].update.$set.state, "completed");
  assert.equal(state.updates[0].update.$set.progress, 100);
});

test("TST-LEG-REC-02: recuperação — apaga o ficheiro órfão, falha o pedido e devolve a operação", async () => {
  const j = job();
  const state = setup({ jobs: [j], video: { subtitles_key: null } });

  await recoverInterruptedSubtitleJobs(new Date());

  assert.deepEqual(deleted, [[j.user_id, j.video_id, "subtitles", `${j._id}.vtt`]]);
  assert.equal(state.updates[0].update.$set.state, "failed");
  assert.equal(state.refunds, 1);
  assert.equal(j.operation_reserved, false);
});

test("TST-LEG-REC-03: devolução repetida — mantém a marca se o serviço continua em baixo", async () => {
  const j = job({ state: "failed" });
  const state = setup({ jobs: [j], refundOk: false });

  await retryPendingRefunds();

  assert.equal(state.refunds, 1);
  assert.equal(j.operation_reserved, true);
});

test("TST-LEG-REC-04: devolução repetida — devolve uma só vez e limpa a marca", async () => {
  const j = job({ state: "cancelled" });
  const state = setup({ jobs: [j] });

  await retryPendingRefunds();
  await retryPendingRefunds();

  assert.equal(state.refunds, 1);
  assert.equal(j.operation_reserved, false);
  assert.deepEqual(state.updates[0].filter, {
    _id: j._id,
    operation_reserved: true,
  });
});
