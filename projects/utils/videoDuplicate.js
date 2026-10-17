const fs = require("node:fs");
const { createHash } = require("node:crypto");
const axios = require("axios");

const Video = require("../models/video");

function duplicateError() {
  const error = new Error(
    "This video already exists in this project.",
  );
  error.status = 409;
  return error;
}

async function hashStream(stream, signal) {
  const hash = createHash("sha256");

  const abort = () => {
    stream.destroy(new Error("Upload cancelled."));
  };

  signal?.addEventListener("abort", abort, { once: true });

  try {
    signal?.throwIfAborted();

    for await (const chunk of stream) {
      signal?.throwIfAborted();
      hash.update(chunk);
    }

    return hash.digest("hex");
  } finally {
    signal?.removeEventListener("abort", abort);
    stream.destroy();
  }
}

async function hashStoredVideo(video, signal) {
  const segments = [
    video.user_id,
    video._id,
    "src",
    video.storage_key.split("/").pop(),
  ].map((value) => encodeURIComponent(String(value)));

  const address = await axios.get(
    `http://img_storage:11000/image/internal/${segments.join("/")}`,
    {
      signal,
      timeout: 30000,
    },
  );

  if (typeof address.data?.url !== "string") {
    throw new Error("Could not locate the stored video.");
  }

  const response = await axios.get(address.data.url, {
    responseType: "stream",
    signal,
    timeout: 120000,
  });

  return hashStream(response.data, signal);
}

async function ensureUniqueVideoContent({
  userId,
  projectId,
  filePath,
  sizeBytes,
  signal,
}) {
  // Garantir que o índice único está pronto antes de aceitar conteúdo.
  await Video.init();

  const contentHash = await hashStream(
    fs.createReadStream(filePath),
    signal,
  );

  const filter = {
    user_id: userId,
    project_id: projectId,
  };

  if (
    await Video.exists({
      ...filter,
      content_sha256: contentHash,
    })
  ) {
    throw duplicateError();
  }

  // Vídeos antigos ainda não têm hash.
  // Conteúdo igual tem necessariamente o mesmo tamanho.
  const legacyVideos = Video.find({
    ...filter,
    size_bytes: sizeBytes,
    content_sha256: { $exists: false },
  })
    .lean()
    .cursor();

  try {
    for await (const video of legacyVideos) {
      signal?.throwIfAborted();

      const legacyHash = await hashStoredVideo(video, signal);

      try {
        await Video.updateOne(
          {
            _id: video._id,
            content_sha256: { $exists: false },
          },
          { $set: { content_sha256: legacyHash } },
        );
      } catch (error) {
        // Podem existir duplicados anteriores a esta alteração.
        // Preservá-los; impedir novas cópias.
        if (error.code !== 11000) throw error;
      }

      if (legacyHash === contentHash) {
        throw duplicateError();
      }
    }
  } finally {
    await legacyVideos.close();
  }

  return contentHash;
}

module.exports = { ensureUniqueVideoContent };