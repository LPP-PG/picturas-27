const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const Video = require("../models/video");
const { ensureUniqueVideoContent } = require("../utils/videoDuplicate");

let directory;
let lookup;
let existingHash;
let lastFilter;
let cursorClosed;

Video.init = async () => {};
Video.exists = async (filter) => {
  lastFilter = filter;
  return filter.content_sha256 === existingHash ? { _id: "existing" } : null;
};
Video.find = () => ({
  lean: () => ({
    cursor: () => ({
      async *[Symbol.asyncIterator]() {},
      async close() {
        cursorClosed = true;
      },
    }),
  }),
});

test.before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "upload-duplicate-"));
  await fs.writeFile(path.join(directory, "original.mp4"), "content A");
  await fs.writeFile(path.join(directory, "renamed.mov"), "content A");
  await fs.writeFile(path.join(directory, "different.mp4"), "content B");
});

test.after(async () => {
  if (directory) {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test.beforeEach(() => {
  existingHash = null;
  lastFilter = null;
  cursorClosed = false;
  lookup = {
    userId: "owner-test",
    projectId: "project-test",
    filePath: path.join(directory, "original.mp4"),
    sizeBytes: 9,
  };
});

test("TST-UP-DUP-01 / REQ-VID-UPLOAD-047: calcula o SHA-256 e limita a pesquisa ao projeto e proprietário", async () => {
  const hash = await ensureUniqueVideoContent(lookup);
  const expected = createHash("sha256").update("content A").digest("hex");

  assert.equal(hash, expected);
  assert.equal(lastFilter.user_id, lookup.userId);
  assert.equal(lastFilter.project_id, lookup.projectId);
  assert.equal(lastFilter.content_sha256, expected);
  assert.equal(cursorClosed, true);
});

test("TST-UP-DUP-02 / REQ-VID-UPLOAD-047: rejeita conteúdo igual mesmo com outro nome", async () => {
  existingHash = createHash("sha256").update("content A").digest("hex");

  for (const name of ["original.mp4", "renamed.mov"]) {
    await assert.rejects(
      ensureUniqueVideoContent({
        ...lookup,
        filePath: path.join(directory, name),
      }),
      { status: 409 },
    );
  }
});

test("TST-UP-DUP-03 / REQ-VID-UPLOAD-048: aceita conteúdo diferente independentemente do nome", async () => {
  existingHash = createHash("sha256").update("content A").digest("hex");
  const hash = await ensureUniqueVideoContent({
    ...lookup,
    filePath: path.join(directory, "different.mp4"),
  });

  assert.notEqual(hash, existingHash);
  assert.equal(cursorClosed, true);
});

test("TST-UP-DUP-04: cancelar a leitura impede a aceitação do conteúdo", async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    ensureUniqueVideoContent({ ...lookup, signal: controller.signal }),
    { name: "AbortError" },
  );
  assert.equal(lastFilter, null);
});
