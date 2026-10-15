const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const sharp = require("sharp");

const execFileAsync = promisify(execFile);

function checkCancellation(signal) {
  if (signal?.aborted) {
    const error = new Error("Carregamento cancelado.");
    error.name = "AbortError";
    throw error;
  }
}

async function extractFrame(videoPath, timeSeconds, signal) {
  checkCancellation(signal);

  const { stdout } = await execFileAsync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel", "error",
      "-nostdin",
      "-protocol_whitelist", "file",
      "-ss", String(timeSeconds),
      "-i", videoPath,
      "-map", "0:v:0",
      "-frames:v", "1",
      "-vf", "scale=320:180:force_original_aspect_ratio=decrease",
      "-c:v", "mjpeg",
      "-q:v", "3",
      "-f", "image2pipe",
      "pipe:1",
    ],
    {
      encoding: "buffer",
      timeout: 15000,
      maxBuffer: 5 * 1024 * 1024,
      signal,
      killSignal: "SIGKILL",
    },
  );

  checkCancellation(signal);

  if (!stdout.length) {
    throw new Error("Não foi possível extrair uma imagem do vídeo.");
  }

  return stdout;
}

async function isAlmostBlack(imageBuffer, signal) {
  checkCancellation(signal);

  const pixels = await sharp(imageBuffer)
    .resize(64, 36, { fit: "inside" })
    .greyscale()
    .raw()
    .toBuffer();

  checkCancellation(signal);

  let darkPixels = 0;

  for (const brightness of pixels) {
    if (brightness < 24) {
      darkPixels += 1;
    }
  }

  // Critério provisório já existente. Q2 continua por decidir.
  return darkPixels / pixels.length >= 0.98;
}

async function generateVideoThumbnail(
  videoPath,
  durationSeconds,
  { signal } = {},
) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("A duração do vídeo é inválida.");
  }

  const candidates = [durationSeconds <= 0.1 ? 0 : 0.1];

  for (let second = 1; second <= 10; second += 1) {
    if (second < durationSeconds) {
      candidates.push(second);
    }
  }

  let fallback = null;

  for (const timeSeconds of candidates) {
    checkCancellation(signal);

    let buffer;

    try {
      buffer = await extractFrame(videoPath, timeSeconds, signal);
    } catch (error) {
      checkCancellation(signal);

      if (error.name === "AbortError") {
        throw error;
      }

      continue;
    }

    const thumbnail = { buffer, timeSeconds };

    if (!fallback) {
      fallback = thumbnail;
    }

    if (!(await isAlmostBlack(buffer, signal))) {
      return thumbnail;
    }
  }

  if (fallback) {
    return fallback;
  }

  // Último recurso se nenhum dos instantes permitiu extrair imagem.
  if (candidates[0] !== 0) {
    const buffer = await extractFrame(videoPath, 0, signal);
    return { buffer, timeSeconds: 0 };
  }

  throw new Error("Não foi possível gerar a miniatura do vídeo.");
}

module.exports = { generateVideoThumbnail };