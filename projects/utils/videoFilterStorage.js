
const fs = require("node:fs");
const path = require("node:path");
const FormData = require("form-data");

const Video = require("../models/video");
const Project = require("../models/project");
const { generateVideoThumbnail } = require("./videoThumbnail");
const {
  post_image,
  delete_image,
} = require("./imageStorage");
const { getUploadCapacity } = require("./videoReservations");

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
    throw new Error(
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
    throw new Error("Insufficient storage space.");
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
      throw new Error("Video project not found.");
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
