const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const axios = require("axios");
const mongoose = require("mongoose");

const fixtures = path.join(__dirname, "fixtures");
const userId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();

const state = {
  source: null,
  job: null,
  updates: [],
  videos: [],
  projectUpdates: [],
  uploads: [],
  deleted: [],
  refunds: 0,
  storageAvailable: true,
  uploadedSourceMetadata: null,
};

const storagePath = require.resolve("../utils/imageStorage");
require.cache[storagePath] = {
  id: storagePath,
  filename: storagePath,
  loaded: true,
  exports: {
    get_image_internal_url: async () => ({
      data: { url: "http://trim-test/source" },
    }),
    post_image: async (user, video, type, form) => {
      if (type === "src") {
        const fileStream = form._streams.find(
          (stream) => stream && typeof stream.path === "string",
        );
        if (fileStream) {
          state.uploadedSourceMetadata = await readVideoMetadata(fileStream.path);
        }
      }
      state.uploads.push({
        user,
        video,
        type,
        filename: form.getHeaders()["content-disposition"],
      });
      return {};
    },
    delete_image: async (...args) => {
      state.deleted.push(args);
    },
  },
};

const Video = require("../models/video");
const VideoTrim = require("../models/videoTrim");
const Project = require("../models/project");
const reservations = require("../utils/videoReservations");
const { readVideoMetadata } = require("../utils/videoMetadata");
const { processTrim } = require("../utils/videoTrim");

function reset() {
  state.source = null;
  state.job = null;
  state.updates.length = 0;
  state.videos.length = 0;
  state.projectUpdates.length = 0;
  state.uploads.length = 0;
  state.deleted.length = 0;
  state.refunds = 0;
  state.storageAvailable = true;
  state.uploadedSourceMetadata = null;
}

function makeJob(format = "mp4") {
  return {
    _id: new mongoose.Types.ObjectId(),
    user_id: userId,
    project_id: projectId,
    source_video_id: new mongoose.Types.ObjectId(),
    result_video_id: new mongoose.Types.ObjectId(),
    user_type: "free",
    state: "queued",
    progress: 0,
    operation_reserved: true,
    reserved_bytes: 20_000_000,
    start_seconds: 1,
    end_seconds: 3,
    output_format: format,
    cancel_requested: false,
  };
}

function configure(format, fileName) {
  state.source = {
    _id: state.job.source_video_id,
    user_id: userId,
    project_id: projectId,
    name: fileName,
    storage_key: `${state.job.source_video_id}/src/${fileName}`,
    format,
    size_bytes: fs.statSync(path.join(fixtures, fileName)).size,
  };
}

VideoTrim.findById = () => ({
  then(resolve, reject) {
    return Promise.resolve(state.job).then(resolve, reject);
  },
  select: () => ({
    lean: async () => state.job,
  }),
});
VideoTrim.updateOne = async (filter, update) => {
  state.updates.push({ filter, update });
  if (update.$set) Object.assign(state.job, update.$set);
};
Video.findOne = async (filter) => {
  if (String(filter?._id) === String(state.source?._id)) return state.source;
  return null;
};
Video.find = () => ({
  select: () => ({
    lean: async () => state.videos.map((video) => ({ name: video.name })),
  }),
});
Video.create = async (video) => {
  state.videos.push(video);
  return video;
};
Video.deleteOne = async () => {};
Project.updateOne = async (filter, update) => {
  state.projectUpdates.push({ filter, update });
  return { matchedCount: 1 };
};
reservations.getUploadCapacity = async () => ({
  account_available_bytes: 100_000_000,
  project_available_bytes: 100_000_000,
  limits: { maxSizeBytes: 100_000_000 },
});

const originalGet = axios.get;
const originalPost = axios.post;
axios.get = async (url, options) => {
  if (url === "http://trim-test/source") {
    if (!state.storageAvailable) {
      throw new Error("trim storage unavailable");
    }
    return { data: fs.createReadStream(path.join(fixtures, state.source.name)) };
  }
  return originalGet(url, options);
};
axios.post = async (url) => {
  if (url.includes("/process/refund/1")) {
    state.refunds += 1;
    return {};
  }
  return originalPost(url);
};

test.beforeEach(reset);

test("TST-TRIM-INT-01: processa um recorte MP4 real e cria resultado no projeto", async () => {
  state.job = makeJob("mp4");
  configure("mp4", "traffic-5s.mp4");

  const sourceMetadata = await readVideoMetadata(path.join(fixtures, "traffic-5s.mp4"));
  await processTrim(state.job._id, "Bearer test-token", "free");

  assert.equal(state.job.state, "completed");
  assert.equal(state.job.progress, 100);
  assert.equal(state.videos.length, 1);
  assert.equal(state.videos[0].format, "mp4");
  assert.equal(state.videos[0].original_video_id, state.job.source_video_id);
  assert.equal(state.projectUpdates[0].update.$addToSet.video_ids, state.job.result_video_id);
  assert.equal(state.uploads.filter((upload) => upload.type === "src").length, 1);
  assert.equal(state.uploads.filter((upload) => upload.type === "preview").length, 1);
  assert.ok(Math.abs(state.videos[0].duration_seconds - 2) <= 1);
  assert.ok(sourceMetadata.duration_seconds >= 4.5);
  assert.equal(state.refunds, 0);
});

test("TST-TRIM-INT-02: converte um recorte MOV real para MP4 sem alterar o original", async () => {
  state.job = makeJob("mp4");
  configure("mov", "traffic-5s.mov");

  await processTrim(state.job._id, "Bearer test-token", "free");

  assert.equal(state.job.state, "completed");
  assert.equal(state.videos[0].format, "mp4");
  assert.equal(state.source.format, "mov");
  assert.match(state.videos[0].name, /_recorte\.mp4$/);
  assert.equal(state.refunds, 0);
});

test("TST-TRIM-INT-03: converte um recorte MP4 real para MOV", async () => {
  state.job = makeJob("mov");
  configure("mp4", "traffic-5s.mp4");

  await processTrim(state.job._id, "Bearer test-token", "free");

  assert.equal(state.job.state, "completed");
  assert.equal(state.videos[0].format, "mov");
  assert.match(state.videos[0].name, /_recorte\.mov$/);
  assert.equal(state.refunds, 0);
});

test("TST-TRIM-INT-04 / REQ-VID-TRIM-043: preserva resolução, FPS e áudio no resultado", async () => {
  state.job = makeJob("mp4");
  configure("mp4", "traffic-5s.mp4");
  const sourceMetadata = await readVideoMetadata(path.join(fixtures, "traffic-5s.mp4"));

  await processTrim(state.job._id, "Bearer test-token", "free");

  assert.equal(state.job.state, "completed");
  assert.equal(sourceMetadata.has_audio, true);
  assert.equal(state.videos[0].has_audio, true);
  assert.equal(state.videos[0].width, sourceMetadata.width);
  assert.equal(state.videos[0].height, sourceMetadata.height);
  assert.ok(state.videos[0].frame_rate);
  assert.ok(sourceMetadata.frame_rate);
  assert.ok(
    Math.abs(state.videos[0].frame_rate - sourceMetadata.frame_rate) < 0.01,
  );
});

test("TST-TRIM-INT-05: acrescenta sufixo ao nome quando já existe um recorte", async () => {
  state.job = makeJob("mp4");
  configure("mp4", "traffic-5s.mp4");
  state.videos.push({ name: "traffic-5s_recorte.mp4" });

  await processTrim(state.job._id, "Bearer test-token", "free");

  assert.equal(state.job.state, "completed");
  assert.equal(state.videos[1].name, "traffic-5s_recorte_2.mp4");
});

test("TST-TRIM-INT-06: um MP4 inválido termina em failed e devolve a operação", async () => {
  state.job = makeJob("mp4");
  configure("mp4", "invalid-video.mp4");

  await processTrim(state.job._id, "Bearer test-token", "free");

  assert.equal(state.job.state, "failed");
  assert.equal(state.job.operation_reserved, false);
  assert.equal(state.job.reserved_bytes, 0);
  assert.equal(state.videos.length, 0);
  assert.equal(state.refunds, 1);
});

test("TST-TRIM-INT-07: indisponibilidade do storage termina em failed e devolve a operação", async () => {
  state.job = makeJob("mp4");
  configure("mp4", "traffic-5s.mp4");
  state.storageAvailable = false;

  await processTrim(state.job._id, "Bearer test-token", "free");

  assert.equal(state.job.state, "failed");
  assert.equal(state.job.operation_reserved, false);
  assert.equal(state.videos.length, 0);
  assert.equal(state.refunds, 1);
});

test("TST-TRIM-INT-08: um pedido cancelado termina em cancelled sem resultado", async () => {
  state.job = makeJob("mp4");
  state.job.cancel_requested = true;
  configure("mp4", "traffic-5s.mp4");

  await processTrim(state.job._id, "Bearer test-token", "free");

  assert.equal(state.job.state, "cancelled");
  assert.equal(state.job.operation_reserved, false);
  assert.equal(state.videos.length, 0);
  assert.equal(state.refunds, 1);
});

test("TST-TRIM-INT-09: o fixture curto tem duração inferior a um segundo", async () => {
  const metadata = await readVideoMetadata(path.join(fixtures, "traffic-short.mp4"));

  assert.ok(metadata.duration_seconds > 0);
  assert.ok(metadata.duration_seconds < 1);
});
