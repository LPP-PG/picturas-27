
const fs = require("node:fs");
const path = require("node:path");
const FormData = require("form-data");
const axios = require("axios");

const Video = require("../models/video");
const Project = require("../models/project");
const { generateVideoThumbnail } = require("./videoThumbnail");
const {
  post_image,
  delete_image,
  get_image_internal_url,
} = require("./imageStorage");
const { getUploadCapacity } = require("./videoReservations");
const { storageMessage, userError } = require("./videoMessages");

// Ler as legendas do vídeo original, se existirem (RN16 das legendas).
// Uma falha aqui não impede o filtro: o resultado fica sem legendas.
async function readSourceSubtitles(source) {
  if (!source.subtitles_key) return null;

  try {
    const response = await get_image_internal_url(
      String(source.user_id),
      String(source._id),
      "subtitles",
      source.subtitles_key.split("/").pop(),
    );

    const download = await axios.get(response.data.url, {
      responseType: "text",
      timeout: 30000,
    });

    return typeof download.data === "string" ? download.data : null;
  } catch (error) {
    console.error("Could not read source subtitles:", error.message);
    return null;
  }
}

async function saveFilteredVideo({
  job,
  source,
  outputPath,
  metadata,
  sizeBytes,
  authorization,
  isCancelled = () => false,
}) {
  const userId = String(job.user_id);
  const projectId = String(job.project_id);
  const resultId = String(job.result_video_id);

  const format = job.output_format;
  const videoFileName = `${resultId}.${format}`;
  const thumbnailFileName = `${resultId}.jpg`;

  const uploadedFiles = [];
  let videoCreated = false;
  let linkedToProject = false;

  function checkCancelled() {
    if (isCancelled()) {
      const error = new Error("Video filter cancelled.");
      error.name = "AbortError";
      throw error;
    }
  }

  try {
    checkCancelled();

    // Consultar os limites e o armazenamento disponível.
    const capacity = await getUploadCapacity({
    userId: job.user_id,
    projectId: job.project_id,
    userType: job.user_type,
    authorization,
    });

    // Verificar o tamanho máximo permitido por vídeo.
    if (sizeBytes > capacity.limits.maxSizeBytes) {
    throw userError(
        "The filtered video exceeds the maximum allowed size.",
    );
    }

    // Verificar se existe espaço para além da reserva inicial.
    const extraBytes = Math.max(
    0,
    sizeBytes - job.reserved_bytes,
    );

    if (
    extraBytes > capacity.account_available_bytes ||
    extraBytes > capacity.project_available_bytes
    ) {
    throw userError(storageMessage(extraBytes, capacity));
    }

    // Copiar as legendas só se couberem no espaço livre.
    let subtitlesText = await readSourceSubtitles(source);

    if (subtitlesText) {
      const subtitlesBytes = Buffer.byteLength(subtitlesText);

      if (
        extraBytes + subtitlesBytes > capacity.account_available_bytes ||
        extraBytes + subtitlesBytes > capacity.project_available_bytes
      ) {
        subtitlesText = null;
      }
    }

    // Criar uma miniatura do vídeo filtrado.
    const thumbnail = await generateVideoThumbnail(
      outputPath,
      metadata.duration_seconds,
    );

    checkCancelled();

    // Guardar o vídeo filtrado.
    const videoForm = new FormData();

    videoForm.append("file", fs.createReadStream(outputPath), {
      filename: videoFileName,
      contentType: format === "mov"
        ? "video/quicktime"
        : "video/mp4",
    });

    await post_image(userId, resultId, "src", videoForm, {
      headers: {
        "X-Storage-File-Name": videoFileName,
        Authorization: authorization,
      },
    });

    uploadedFiles.push(["src", videoFileName]);
    checkCancelled();

    // Guardar a miniatura.
    const thumbnailForm = new FormData();

    thumbnailForm.append("file", thumbnail.buffer, {
      filename: thumbnailFileName,
      contentType: "image/jpeg",
    });

    await post_image(userId, resultId, "preview", thumbnailForm, {
      headers: {
        "X-Storage-File-Name": thumbnailFileName,
        Authorization: authorization,
      },
    });

    uploadedFiles.push(["preview", thumbnailFileName]);
    checkCancelled();

    // Guardar a cópia das legendas no grupo do novo vídeo.
    let subtitlesKey = null;

    if (subtitlesText) {
      const subtitlesFileName = `${resultId}.vtt`;

      try {
        const subtitlesForm = new FormData();

        subtitlesForm.append("file", Buffer.from(subtitlesText), {
          filename: subtitlesFileName,
          contentType: "text/vtt",
        });

        uploadedFiles.push(["subtitles", subtitlesFileName]);

        await post_image(userId, resultId, "subtitles", subtitlesForm, {
          headers: {
            "X-Storage-File-Name": subtitlesFileName,
            Authorization: authorization,
          },
        });

        subtitlesKey = `${resultId}/subtitles/${subtitlesFileName}`;
      } catch (error) {
        console.error("Could not copy subtitles:", error.message);
      }

      checkCancelled();
    }

    // Criar um nome diferente do original.
    const baseName = path.basename(
      source.name,
      path.extname(source.name),
    );

    const names = await Video.find({
      user_id: job.user_id,
      project_id: job.project_id,
    }).select("name").lean();

    const existingNames = new Set(
      names.map((video) => video.name),
    );

    let name = `${baseName}_${job.filter_name}.${format}`;
    let suffix = 2;

    while (existingNames.has(name)) {
      name = `${baseName}_${job.filter_name}_${suffix}.${format}`;
      suffix += 1;
    }

    // Registar o novo vídeo na base de dados.
    await Video.create({
      _id: job.result_video_id,
      user_id: job.user_id,
      project_id: job.project_id,
      name,
      storage_key: `${resultId}/src/${videoFileName}`,
      thumbnail_key: `${resultId}/preview/${thumbnailFileName}`,
      thumbnail_time_seconds: thumbnail.timeSeconds,
      thumbnail_size_bytes: thumbnail.buffer.length,
      format,
      duration_seconds: metadata.duration_seconds,
      size_bytes: sizeBytes,
      original_video_id: job.source_video_id,
      has_audio: metadata.has_audio ?? null,
      subtitles_key: subtitlesKey,
      subtitles_language: subtitlesKey
        ? source.subtitles_language ?? null
        : null,
    });

    videoCreated = true;

    checkCancelled();

    // Adicionar o resultado ao mesmo projeto.
    const updated = await Project.updateOne(
      {
        _id: job.project_id,
        user_id: job.user_id,
        media_type: "video",
      },
      {
        $addToSet: { video_ids: job.result_video_id },
        $inc: { version: 1 },
      },
    );

    if (updated.matchedCount !== 1) {
      throw userError("Video project not found.");
    }

    linkedToProject = true;

    return {
      name,
      storageKey: `${resultId}/src/${videoFileName}`,
      thumbnailKey: `${resultId}/preview/${thumbnailFileName}`,
    };
  } catch (error) {
    // Limpar dados criados se alguma etapa falhar.
    if (linkedToProject) {
      await Project.updateOne(
        { _id: job.project_id, user_id: job.user_id },
        { $pull: { video_ids: job.result_video_id } },
      ).catch(console.error);
    }

    if (videoCreated) {
      await Video.deleteOne({
        _id: job.result_video_id,
        user_id: job.user_id,
      }).catch(console.error);
    }

    for (const [stage, fileName] of uploadedFiles) {
      await delete_image(userId, resultId, stage, fileName)
        .catch(console.error);
    }

    throw error;
  }
}

module.exports = { saveFilteredVideo };
