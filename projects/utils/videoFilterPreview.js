
const { spawn } = require("node:child_process");
const path = require("node:path");
const axios = require("axios");

const { get_image_internal_url } = require("./imageStorage");
const { getVideoFilterGraph } = require("./videoFilterPresets");

// Criar uma pré-visualização a partir da miniatura do vídeo.
// Não cria pedidos, não reserva armazenamento e não consome quota.
async function generateVideoFilterPreview(video, filterName) {
  const filterGraph = getVideoFilterGraph(filterName);

  if (!video.thumbnail_key) {
    throw new Error("Video thumbnail is not available.");
  }

  const thumbnailName = path.posix.basename(video.thumbnail_key);

  const response = await get_image_internal_url(
    String(video.user_id),
    String(video._id),
    "preview",
    thumbnailName
  );

  if (!response.data?.url) {
    throw new Error("Could not access video thumbnail.");
  }

  const download = await axios.get(response.data.url, {
    responseType: "arraybuffer",
    timeout: 15000,
    maxContentLength: 5 * 1024 * 1024,
  });

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel", "error",
      "-nostdin",
      "-f", "image2pipe",
      "-i", "pipe:0",
      "-vf", filterGraph,
      "-frames:v", "1",
      "-c:v", "mjpeg",
      "-q:v", "3",
      "-f", "image2pipe",
      "pipe:1",
    ]);

    const chunks = [];
    let totalBytes = 0;

    const timer = setTimeout(() => {
      ffmpeg.kill("SIGKILL");
    }, 15000);

    ffmpeg.stdout.on("data", (chunk) => {
      totalBytes += chunk.length;

      if (totalBytes > 5 * 1024 * 1024) {
        ffmpeg.kill("SIGKILL");
      } else {
        chunks.push(chunk);
      }
    });

    ffmpeg.stdin.on("error", () => {
      // O FFmpeg pode fechar a entrada se houver um erro.
    });

    ffmpeg.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    ffmpeg.on("close", (code) => {
      clearTimeout(timer);

      if (code === 0 && totalBytes > 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error("Could not generate filter preview."));
      }
    });

    ffmpeg.stdin.end(Buffer.from(download.data));
  });
}

module.exports = { generateVideoFilterPreview };
