const test = require("node:test");
const assert = require("node:assert/strict");

const mongoose = require("mongoose");

const Project = require("../models/project");
const videoProjectAuth = require("../middleware/videoProjectAuth");

const ownerId = new mongoose.Types.ObjectId();
const otherId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();

const projects = [];

Project.findOne = (filter) => ({
  exec: async () =>
    projects.find(
      (project) =>
        String(project._id) === String(filter._id) &&
        String(project.user_id) === String(filter.user_id),
    ) ?? null,
});

test.beforeEach(() => {
  projects.length = 0;
});

async function check(userId) {
  const response = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  const req = {
    params: { project: String(projectId) },
    videoUser: { _id: userId },
  };
  let passed = false;
  await videoProjectAuth(req, response, () => {
    passed = true;
  });
  return { response, passed, req };
}

test("TST-UP-AUTH-01 / REQ-VID-UPLOAD-002: recusa vídeos e ferramentas de vídeo num projeto de imagens", async () => {
  projects.push({ _id: projectId, user_id: ownerId, media_type: "image" });

  const { response, passed } = await check(ownerId);

  assert.equal(passed, false);
  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /projeto é de imagens/);
});

test("TST-UP-AUTH-02 / REQ-VID-FILT-003, REQ-VID-UPLOAD-010: uma conta autenticada que não é proprietária não acede ao projeto de vídeo", async () => {
  projects.push({ _id: projectId, user_id: ownerId, media_type: "video" });

  const other = await check(otherId);
  assert.equal(other.passed, false);
  assert.equal(other.response.statusCode, 404);

  const owner = await check(ownerId);
  assert.equal(owner.passed, true);
  assert.equal(String(owner.req.videoProject._id), String(projectId));
});

test("TST-UP-AUTH-03 / REQ-VID-UPLOAD-009: sem sessão o acesso é recusado", async () => {
  projects.push({ _id: projectId, user_id: ownerId, media_type: "video" });

  const { response, passed } = await check(undefined);

  assert.equal(passed, false);
  assert.equal(response.statusCode, 401);
});
