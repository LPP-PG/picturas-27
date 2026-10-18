
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");
const axios = require("axios");

const { get_image_internal_url } = require("./imageStorage");
const { readVideoMetadata } = require("./videoMetadata");
const { processVideoFilter } = require("./videoFilterFfmpeg");

async function prepareFilteredVideo(
  video,
  jobId,
  filterName,
  onProgress,
  isCancelled,
) {
  const inputPath = path.join(
    os.tmpdir(),
    `${jobId}-filter-source.${video.format}`,
  );

  const outputPath = path.join(
    os.tmpdir(),
    `${jobId}-filter-result.${video.format}`,
  );

  let completed = false;

  try {
    // Obter o endereço do vídeo original
    const response = await get_image_internal_url(
      String(video.user_id),
      String(video._id),
      "src",
      video.storage_key.split("/").pop(),
    );

    if (!response.data?.url) {
      throw new Error("Video source is unavailable.");
    }

    // Descarregar uma cópia temporária
    const download = await axios.get(response.data.url, {
      responseType: "stream",
      timeout: 30000,
    });

    await pipeline(
      download.data,
      fs.createWriteStream(inputPath),
    );

    const sourceMetadata = await readVideoMetadata(inputPath);

    // Aplicar o efeito com FFmpeg
    await processVideoFilter(
      inputPath,
      outputPath,
      filterName,
      {
        durationSeconds: sourceMetadata.duration_seconds,
        onProgress,
        isCancelled,
      },
    );

    if (isCancelled?.()) {
      const error = new Error("Video filter cancelled.");
      error.name = "AbortError";
      throw error;
    }

    // Verificar o resultado produzido
    const metadata = await readVideoMetadata(outputPath);
    const sizeBytes = (await fsp.stat(outputPath)).size;

    completed = true;

    return { outputPath, metadata, sizeBytes };
  } finally {
    // Eliminar a cópia temporária do original
    await fsp.unlink(inputPath).catch(() => {});

    // Se falhar, eliminar também o resultado parcial
    if (!completed) {
      await fsp.unlink(outputPath).catch(() => {});
    }
  }
}

module.exports = { prepareFilteredVideo };
