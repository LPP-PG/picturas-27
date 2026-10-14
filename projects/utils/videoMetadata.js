const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

async function readVideoMetadata(filePath) {
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
      },
    );

    metadata = JSON.parse(stdout);
  } catch {
    const error = new Error(
      "Não foi possível ler o vídeo. Verifique se o ficheiro é válido.",
    );
    error.status = 400;
    throw error;
  }

  const videoStream = metadata.streams?.find(
    (stream) =>
      stream.codec_type === "video" &&
      stream.disposition?.attached_pic !== 1,
  );

  const duration = Number(
    metadata.format?.duration ?? videoStream?.duration,
  );

  const containerNames = (
    metadata.format?.format_name || ""
  ).split(",");

  if (
    !videoStream ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !containerNames.some((name) => name === "mov" || name === "mp4")
  ) {
    const error = new Error(
      "O ficheiro deve conter um vídeo válido em formato MP4 ou MOV.",
    );
    error.status = 400;
    throw error;
  }

  return {
    duration_seconds: duration,
    has_audio: metadata.streams.some(
      (stream) => stream.codec_type === "audio",
    ),
    width: videoStream.width,
    height: videoStream.height,
  };
}

module.exports = { readVideoMetadata };