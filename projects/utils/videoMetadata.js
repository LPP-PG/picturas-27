const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

function checkCancellation(signal) {
  if (signal?.aborted) {
    const error = new Error("Carregamento cancelado.");
    error.name = "AbortError";
    throw error;
  }
}

async function readVideoMetadata(filePath, { signal } = {}) {
  checkCancellation(signal);

  let metadata;

  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v", "error",
        "-protocol_whitelist", "file",
        "-show_format",
        "-show_streams",
        "-of", "json",
        filePath,
      ],
      {
        timeout: 30000,
        maxBuffer: 2 * 1024 * 1024,
        signal,
        killSignal: "SIGKILL",
      },
    );

    checkCancellation(signal);
    metadata = JSON.parse(stdout);
  } catch (cause) {
    checkCancellation(signal);

    if (cause.name === "AbortError") {
      throw cause;
    }

    const error = new Error(
      "Não foi possível ler o vídeo. Verifique se o ficheiro é válido.",
    );
    error.status = 400;
    throw error;
  }

  const streams = Array.isArray(metadata.streams)
    ? metadata.streams
    : [];

  const videoStream = streams.find(
    (stream) =>
      stream.codec_type === "video" &&
      stream.disposition?.attached_pic !== 1,
  );

  const formatDuration = Number(metadata.format?.duration);
  const streamDuration = Number(videoStream?.duration);

  const duration =
    Number.isFinite(formatDuration) && formatDuration > 0
      ? formatDuration
      : streamDuration;

  const containerNames = String(
    metadata.format?.format_name || "",
  ).split(",");

  if (
    !videoStream ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !containerNames.some(
      (name) => name === "mov" || name === "mp4",
    )
  ) {
    const error = new Error(
      "O ficheiro deve conter um vídeo válido em formato MP4 ou MOV.",
    );
    error.status = 400;
    throw error;
  }

  return {
    duration_seconds: duration,
    has_audio: streams.some(
      (stream) => stream.codec_type === "audio",
    ),
    width: videoStream.width,
    height: videoStream.height,
  };
}

module.exports = { readVideoMetadata };