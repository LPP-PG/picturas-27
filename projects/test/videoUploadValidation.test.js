const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { createHash } = require("node:crypto");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const sharp = require("sharp");

const {
  getVideoLimits,
  validateVideoLimits,
} = require("../utils/videoLimits");
const { readVideoMetadata } = require("../utils/videoMetadata");
const { generateVideoThumbnail } = require("../utils/videoThumbnail");

const run = promisify(execFile);
let directory;

const fixture = (name) => path.join(directory, name);

async function ffmpeg(args) {
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
    ...args,
  ], { timeout: 30000 });
}

test.before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "picturas-upload-"));

  await ffmpeg([
    "-f", "lavfi", "-i", "color=c=red:s=160x90:r=10:d=2",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
    "-c:v", "mpeg4", "-c:a", "aac", "-shortest",
    fixture("valid.mp4"),
  ]);

  await ffmpeg([
    "-i", fixture("valid.mp4"),
    "-c", "copy", fixture("valid.mov"),
  ]);

  await ffmpeg([
    "-f", "lavfi", "-i", "color=c=blue:s=160x90:r=10:d=1",
    "-c:v", "mpeg4", fixture("silent.mp4"),
  ]);

  await ffmpeg([
    "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
    "-c:a", "aac", fixture("audio-only.mp4"),
  ]);

  await ffmpeg([
    "-f", "lavfi", "-i", "color=c=black:s=160x90:r=10:d=2",
    "-c:v", "mpeg4", fixture("black.mp4"),
  ]);

  await ffmpeg([
    "-f", "lavfi", "-i", "color=c=black:s=160x90:r=10:d=1",
    "-f", "lavfi", "-i", "color=c=red:s=160x90:r=10:d=2",
    "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0[v]",
    "-map", "[v]", "-c:v", "mpeg4",
    fixture("black-then-red.mp4"),
  ]);

  await fs.writeFile(fixture("invalid.mp4"), "This is not a video.");
});

test.after(async () => {
  if (directory) {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("TST-UP-VAL-01 / REQ-VID-UPLOAD-012,016,017,021: limites Free decimais", () => {
  assert.deepEqual(getVideoLimits("free"), {
    maxDurationSeconds: 60,
    maxSizeBytes: 100_000_000,
    maxProjectBytes: 500_000_000,
    maxAccountBytes: 2_000_000_000,
    maxConcurrentUploads: 1,
  });
});

test("TST-UP-VAL-02 / REQ-VID-UPLOAD-013,016,017,021: limites Premium decimais", () => {
  assert.deepEqual(getVideoLimits("premium"), {
    maxDurationSeconds: 600,
    maxSizeBytes: 1_000_000_000,
    maxProjectBytes: 10_000_000_000,
    maxAccountBytes: 50_000_000_000,
    maxConcurrentUploads: 3,
  });
});

test("TST-UP-VAL-03 / REQ-VID-UPLOAD-009: rejeita perfis sem acesso", () => {
  for (const profile of ["anonymous", "unknown", undefined]) {
    assert.throws(() => getVideoLimits(profile), { status: 403 });
  }
});

test("TST-UP-VAL-04 / REQ-VID-UPLOAD-012,013: aceita valores exatamente no limite", () => {
  assert.doesNotThrow(() => validateVideoLimits("free", 60, 100_000_000));
  assert.doesNotThrow(() => validateVideoLimits("premium", 600, 1_000_000_000));
});

test("TST-UP-VAL-05 / REQ-VID-UPLOAD-012,013: rejeita duração acima do limite", () => {
  assert.throws(() => validateVideoLimits("free", 60.001, 1000), {
    status: 400,
  });
  assert.throws(() => validateVideoLimits("premium", 600.001, 1000), {
    status: 400,
  });
});

test("TST-UP-VAL-06 / REQ-VID-UPLOAD-012,013: rejeita um byte acima do limite", () => {
  assert.throws(() => validateVideoLimits("free", 1, 100_000_001), {
    status: 413,
  });
  assert.throws(() => validateVideoLimits("premium", 1, 1_000_000_001), {
    status: 413,
  });
});

test("TST-UP-VAL-07 / REQ-VID-UPLOAD-012,013: rejeita valores nulos ou inválidos", () => {
  for (const profile of ["free", "premium"]) {
    for (const duration of [0, -1, NaN, Infinity]) {
      assert.throws(() => validateVideoLimits(profile, duration, 1000), {
        status: 400,
      });
    }
    for (const size of [0, -1, 1.5, NaN, Infinity]) {
      assert.throws(() => validateVideoLimits(profile, 1, size), {
        status: 400,
      });
    }
  }
});

test("TST-UP-VAL-08 / REQ-VID-UPLOAD-011: lê MP4 e MOV reais", async () => {
  for (const name of ["valid.mp4", "valid.mov"]) {
    const metadata = await readVideoMetadata(fixture(name));
    assert.ok(Math.abs(metadata.duration_seconds - 2) < 0.2);
    assert.equal(metadata.has_audio, true);
    assert.equal(metadata.width, 160);
    assert.equal(metadata.height, 90);
    assert.ok(Math.abs(metadata.frame_rate - 10) < 0.01);
  }
});

test("TST-UP-VAL-09 / REQ-VID-UPLOAD-011: rejeita texto com extensão MP4", async () => {
  await assert.rejects(readVideoMetadata(fixture("invalid.mp4")), {
    status: 400,
  });
});

test("TST-UP-VAL-10 / REQ-VID-UPLOAD-011: rejeita contentor apenas com áudio", async () => {
  await assert.rejects(readVideoMetadata(fixture("audio-only.mp4")), {
    status: 400,
  });
});

test("TST-UP-VAL-11 / REQ-VID-UPLOAD-011: aceita vídeo sem áudio", async () => {
  const metadata = await readVideoMetadata(fixture("silent.mp4"));
  assert.equal(metadata.has_audio, false);
  assert.ok(metadata.duration_seconds > 0);
});

test("TST-UP-VAL-12: gera miniatura JPEG válida de um vídeo real", async () => {
  const thumbnail = await generateVideoThumbnail(fixture("valid.mp4"), 2);
  const image = await sharp(thumbnail.buffer).metadata();

  assert.equal(image.format, "jpeg");
  assert.ok(image.width > 0 && image.width <= 320);
  assert.ok(image.height > 0 && image.height <= 180);
  assert.ok(thumbnail.timeSeconds >= 0 && thumbnail.timeSeconds < 2);
});

test("TST-UP-VAL-13: procura imagem posterior quando o início é preto", async () => {
  const thumbnail = await generateVideoThumbnail(
    fixture("black-then-red.mp4"), 3,
  );

  const { channels } = await sharp(thumbnail.buffer).stats();
  assert.ok(thumbnail.timeSeconds >= 1 && thumbnail.timeSeconds < 3);
  assert.ok(channels[0].mean > 150);
  assert.ok(channels[1].mean < 80);
});

test("TST-UP-VAL-14: vídeo totalmente preto conserva uma miniatura de recurso", async () => {
  const thumbnail = await generateVideoThumbnail(fixture("black.mp4"), 2);
  assert.ok(thumbnail.buffer.length > 0);
  assert.ok(thumbnail.timeSeconds >= 0 && thumbnail.timeSeconds < 2);
});

test("TST-UP-VAL-15: cancelamento impede leitura e geração da miniatura", async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    readVideoMetadata(fixture("valid.mp4"), { signal: controller.signal }),
    { name: "AbortError" },
  );
  await assert.rejects(
    generateVideoThumbnail(fixture("valid.mp4"), 2, {
      signal: controller.signal,
    }),
    { name: "AbortError" },
  );
});

test("TST-UP-VAL-16 / REQ-VID-UPLOAD-027: metadados e miniatura preservam o original", async () => {
  async function hash() {
    const bytes = await fs.readFile(fixture("valid.mp4"));
    return createHash("sha256").update(bytes).digest("hex");
  }

  const before = await hash();
  await readVideoMetadata(fixture("valid.mp4"));
  await generateVideoThumbnail(fixture("valid.mp4"), 2);
  assert.equal(await hash(), before);
});
