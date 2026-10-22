const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const axios = require("axios");
const mongoose = require("mongoose");

const userId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();
const sourceId = new mongoose.Types.ObjectId();

const SUBTITLES = "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nHello there\n";

const state = {
  available: 10_000_000,
  subtitlesUploadFails: false,
  uploads: [],
  createdVideos: [],
};

function resetState() {
  state.available = 10_000_000;
  state.subtitlesUploadFails = false;
  state.uploads.length = 0;
  state.createdVideos.length = 0;
}

const imageStorage = require("../utils/imageStorage");
imageStorage.get_image_internal_url = async () => ({
  data: { url: "http://storage/source.vtt" },
});
imageStorage.post_image = async (user, owner, stage, form) => {
  if (stage === "subtitles" && state.subtitlesUploadFails) {
    throw new Error("storage unavailable");
  }
  if (stage !== "subtitles") {
    // Fechar o ficheiro de vídeo, que não é preciso ler neste teste
    for (const part of form._streams) part?.destroy?.();
    state.uploads.push({ stage });
    return;
  }
  state.uploads.push({ stage, body: form.getBuffer() });
};
imageStorage.delete_image = async () => {};

const reservations = require("../utils/videoReservations");
reservations.getUploadCapacity = async () => ({
  limits: { maxSizeBytes: 100_000_000 },
  account_available_bytes: state.available,
  project_available_bytes: state.available,
});

const thumbnails = require("../utils/videoThumbnail");
thumbnails.generateVideoThumbnail = async () => ({
  buffer: Buffer.from("jpg"),
  timeSeconds: 0.1,
});

axios.get = async () => ({ data: SUBTITLES });

const Video = require("../models/video");
const Project = require("../models/project");
Video.find = () => ({ select: () => ({ lean: async () => [] }) });
Video.create = async (data) => {
  state.createdVideos.push(data);
  return data;
};
Video.deleteOne = async () => {};
Project.updateOne = async () => ({ matchedCount: 1 });

const { saveFilteredVideo } = require("../utils/videoFilterStorage");

const outputPath = path.join(__dirname, "fixtures", "traffic-5s.mp4");

function save(source) {
  return saveFilteredVideo({
    job: {
      user_id: userId,
      project_id: projectId,
      result_video_id: new mongoose.Types.ObjectId(),
      source_video_id: sourceId,
      output_format: "mp4",
      filter_name: "sepia",
      reserved_bytes: 1_000_000,
      user_type: "free",
    },
    source: {
      _id: sourceId,
      user_id: userId,
      name: "clip.mp4",
      ...source,
    },
    outputPath,
    metadata: { duration_seconds: 5, has_audio: true },
    sizeBytes: 1_000_000,
    authorization: "Bearer test-token",
  });
}

test.beforeEach(resetState);

test("TST-FILT-SUB-01 / REQ-VID-LEG-044: o resultado do filtro recebe uma cópia das legendas do original", async () => {
  await save({
    subtitles_key: `${sourceId}/subtitles/${sourceId}.vtt`,
    subtitles_language: "en",
  });

  const subtitles = state.uploads.find((upload) => upload.stage === "subtitles");
  assert.ok(subtitles, "as legendas devem ser guardadas no novo vídeo");
  assert.ok(subtitles.body.includes(Buffer.from("Hello there")));

  const created = state.createdVideos[0];
  assert.match(created.subtitles_key, /\/subtitles\/.+\.vtt$/);
  assert.notEqual(created.subtitles_key, `${sourceId}/subtitles/${sourceId}.vtt`);
  assert.equal(created.subtitles_language, "en");
});

test("TST-FILT-SUB-02 / REQ-VID-LEG-044: sem legendas no original, o resultado também não as tem", async () => {
  await save({ subtitles_key: null });

  assert.equal(state.uploads.some((upload) => upload.stage === "subtitles"), false);
  assert.equal(state.createdVideos[0].subtitles_key, null);
  assert.equal(state.createdVideos[0].subtitles_language, null);
});

test("TST-FILT-SUB-03 / REQ-VID-LEG-044, UC-VID-002/RN17: se as legendas não couberem, o filtro conclui sem elas", async () => {
  // Há espaço para o vídeo (reservado), mas não para os bytes das legendas
  state.available = 10;

  await save({
    subtitles_key: `${sourceId}/subtitles/${sourceId}.vtt`,
    subtitles_language: "en",
  });

  assert.equal(state.createdVideos.length, 1);
  assert.equal(state.createdVideos[0].subtitles_key, null);
});

test("TST-FILT-SUB-04 / REQ-VID-LEG-044, UC-VID-002/RN17: uma falha a copiar as legendas não faz falhar o filtro", async () => {
  state.subtitlesUploadFails = true;

  await save({
    subtitles_key: `${sourceId}/subtitles/${sourceId}.vtt`,
    subtitles_language: "en",
  });

  assert.equal(state.createdVideos.length, 1);
  assert.equal(state.createdVideos[0].subtitles_key, null);
});
