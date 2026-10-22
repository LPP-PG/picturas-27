const test = require("node:test");
const assert = require("node:assert/strict");

const mongoose = require("mongoose");

const VideoTrim = require("../models/videoTrim");
const VideoFilter = require("../models/videoFilter");
const VideoSubtitle = require("../models/videoSubtitle");
const {
  countActiveVideoJobs,
  maxActiveVideoJobs,
  hasActiveVideoJobs,
} = require("../utils/videoProcessingLimit");

const userId = new mongoose.Types.ObjectId();
const videoId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();

test("TST-STATUS-01 / REQ-VID-STATUS-005, 006: o Registado tem um pedido ativo e o Premium três", () => {
  assert.equal(maxActiveVideoJobs("free"), 1);
  assert.equal(maxActiveVideoJobs("premium"), 3);
  assert.equal(maxActiveVideoJobs(undefined), 1);
});

test("TST-STATUS-02 / REQ-VID-STATUS-005, 006: soma os pedidos ativos das três ferramentas da conta", async () => {
  const queries = [];
  VideoTrim.countDocuments = async (query) => {
    queries.push(query);
    return 1;
  };
  VideoFilter.countDocuments = async (query) => {
    queries.push(query);
    return 1;
  };
  VideoSubtitle.countDocuments = async (query) => {
    queries.push(query);
    return 1;
  };

  const total = await countActiveVideoJobs(userId);

  // Um Premium com um pedido em cada ferramenta atinge o limite de três
  assert.equal(total, 3);
  assert.ok(total >= maxActiveVideoJobs("premium"));
  assert.equal(queries.length, 3);
  for (const query of queries) {
    assert.equal(query.user_id, userId);
    assert.deepEqual(query.state, { $in: ["queued", "processing"] });
  }
});

test("TST-STATUS-03 / REQ-VID-STATUS-013: deteta pedidos ativos por vídeo e por projeto", async () => {
  const filters = [];
  VideoTrim.exists = async (filter) => {
    filters.push(["trim", filter]);
    return null;
  };
  VideoFilter.exists = async (filter) => {
    filters.push(["filter", filter]);
    return null;
  };
  VideoSubtitle.exists = async (filter) => {
    filters.push(["subtitle", filter]);
    return { _id: new mongoose.Types.ObjectId() };
  };

  assert.equal(await hasActiveVideoJobs({ userId, videoId }), true);

  // Recorte e Filtros procuram pelo vídeo de origem; Legendas pelo vídeo
  assert.equal(filters[0][1].source_video_id, videoId);
  assert.equal(filters[1][1].source_video_id, videoId);
  assert.equal(filters[2][1].video_id, videoId);

  filters.length = 0;
  VideoSubtitle.exists = async (filter) => {
    filters.push(["subtitle", filter]);
    return null;
  };

  assert.equal(await hasActiveVideoJobs({ userId, projectId }), false);
  for (const [, filter] of filters) {
    assert.equal(filter.project_id, projectId);
    assert.deepEqual(filter.state, { $in: ["queued", "processing"] });
  }
});
