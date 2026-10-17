const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const FormData = require("form-data");

const Project = require("../models/project");
const Video = require("../models/video");
const VideoUpload = require("../models/videoUpload");
const videoAuth = require("../middleware/videoAuth");
const videoProjectAuth = require("../middleware/videoProjectAuth");

const { readVideoMetadata } = require("../utils/videoMetadata");
const { validateVideoLimits } = require("../utils/videoLimits");
const { generateVideoThumbnail } = require("../utils/videoThumbnail");
const {
  releaseUploadReservation,
} = require("../utils/videoReservations");
const {
  post_image,
  delete_image,
  get_image_public_url,
} = require("../utils/imageStorage");

const router = express.Router();
const running = new Map();

const INACTIVITY_MS = 5 * 60 * 1000;
const PROCESSING_MS = 5 * 60 * 1000;

router.get("/:user/capacity", videoAuth, async (req, res) => {
  try {
    const {
      getUploadCapacity,
    } = require("../utils/videoReservations");

    // ID apenas para representar um projeto novo, sem conteúdo.
    const capacity = await getUploadCapacity({
      userId: req.videoUser._id,
      projectId: "000000000000000000000000",
      userType: req.videoUser.type,
      authorization: req.headers.authorization,
    });

    const { revision, ...response } = capacity;

    res.set("Cache-Control", "no-store");
    res.json(response);
  } catch (error) {
    res.status(error.status || 503).json({
      error: error.status
        ? error.message
        : "Não foi possível consultar o espaço disponível.",
    });
  }
});

router.use(
  "/:user/:project/trim",
  videoAuth,
  videoProjectAuth,
  require("./videoTrim"),
);
router.use(
  "/:user/:project",
  videoAuth,
  videoProjectAuth,
  require("./videoUploads"),
);

function failure(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function checkCancellation(signal) {
  if (signal.aborted) {
    throw failure(409, "Carregamento cancelado ou interrompido.");
  }
}

async function getFileUrl(userId, videoId, stage, storageKey) {
  if (!storageKey) return null;

  const response = await get_image_public_url(
    userId,
    String(videoId),
    stage,
    storageKey.split("/").pop(),
  );

  const url = response.data?.url;

  if (typeof url !== "string" || !url) {
    throw new Error("Não foi possível obter o endereço do ficheiro.");
  }

  return url;
}

async function publicVideo(userId, video) {
  const results = await Promise.allSettled([
    getFileUrl(userId, video._id, "src", video.storage_key),
    getFileUrl(userId, video._id, "preview", video.thumbnail_key),
  ]);

  return {
    _id: video._id,
    project_id: video.project_id,
    name: video.name,
    format: video.format,
    duration_seconds: video.duration_seconds,
    size_bytes: video.size_bytes,
    original_video_id: video.original_video_id,
    thumbnail_time_seconds: video.thumbnail_time_seconds ?? null,
    video_url:
      results[0].status === "fulfilled" ? results[0].value : null,
    thumbnail_url:
      results[1].status === "fulfilled" ? results[1].value : null,
    createdAt: video.createdAt,
  };
}

async function isAttached(upload) {
  return Project.exists({
    _id: upload.project_id,
    user_id: upload.user_id,
    media_type: "video",
    video_ids: upload.video_id,
  });
}

// Só liberta espaço depois de confirmar a limpeza.
// Um vídeo já associado ao projeto é preservado.
async function settleUpload(upload, state, message = "") {
  if (await isAttached(upload)) {
    await releaseUploadReservation(upload.user_id, upload._id);

    await VideoUpload.updateOne(
      { _id: upload._id },
      {
        $set: {
          state: "completed",
          reserved_bytes: 0,
          slot_acquired: false,
          cleanup_pending: false,
          error: "",
          finished_at: new Date(),
        },
      },
    );

    return "completed";
  }

  await VideoUpload.updateOne(
    { _id: upload._id },
    {
      $set: {
        state,
        error: message,
        cleanup_pending: true,
      },
    },
  );

  await Video.deleteOne({
    _id: upload.video_id,
    user_id: upload.user_id,
    project_id: upload.project_id,
  });

  for (const file of upload.stored_files || []) {
    try {
      await delete_image(
        String(upload.user_id),
        String(upload.video_id),
        file.stage,
        file.file_name,
        { timeout: 30000 },
      );
    } catch (error) {
      if (error.response?.status !== 404) throw error;
    }
  }

  if (upload.temporary_path) {
    await fsp.unlink(upload.temporary_path).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }

  await releaseUploadReservation(upload.user_id, upload._id);

  await VideoUpload.updateOne(
    { _id: upload._id },
    {
      $set: {
        state,
        reserved_bytes: 0,
        slot_acquired: false,
        cleanup_pending: false,
        temporary_path: null,
        finished_at: new Date(),
        error: message,
      },
    },
  );

  return state;
}

function receiveVideo(req, res, upload, signal) {
  return new Promise((resolve, reject) => {
    const parser = multer({
      storage: multer.diskStorage({
        destination: (_req, _file, callback) => {
          callback(null, os.tmpdir());
        },
        filename: (_req, _file, callback) => {
          callback(null, `${upload._id}.video-upload`);
        },
      }),
      limits: {
        fileSize: req.videoLimits.maxSizeBytes,
        files: 1,
        fields: 0,
      },
      fileFilter: (_req, file, callback) => {
        if (!/\.(mp4|mov)$/i.test(file.originalname)) {
          return callback(
            failure(400, "Só são aceites vídeos MP4 ou MOV."),
          );
        }

        callback(null, true);
      },
    }).single("video");

    const abort = () => {
      reject(failure(409, "Carregamento interrompido."));
    };

    signal.addEventListener("abort", abort, { once: true });

    if (signal.aborted) {
      signal.removeEventListener("abort", abort);
      return abort();
    }

    parser(req, res, (error) => {
      signal.removeEventListener("abort", abort);

      if (error) {
        return reject(
          failure(
            error.code === "LIMIT_FILE_SIZE" ? 413 : 400,
            error.code === "LIMIT_FILE_SIZE"
              ? "O vídeo excede o limite do perfil."
              : error.message,
          ),
        );
      }

      if (!req.file) {
        return reject(failure(400, "Selecione um vídeo."));
      }

      resolve(req.file);
    });
  });
}

router.get(
  "/:user/:project",
  videoAuth,
  videoProjectAuth,
  async (req, res) => {
    try {
      const userId = String(req.videoUser._id);

      const videos = await Video.find({
        user_id: userId,
        project_id: req.videoProject._id,
        _id: { $in: req.videoProject.video_ids },
      })
        .sort({ createdAt: 1 })
        .lean();

      const results = await Promise.all(
        videos.map((video) => publicVideo(userId, video)),
      );

      res.set("Cache-Control", "no-store");
      res.json(results);
    } catch (error) {
      console.error("Erro ao listar vídeos:", error.message);

      res.status(503).json({
        error: "Não foi possível listar os vídeos.",
      });
    }
  },
);

router.post(
  "/:user/:project",
  videoAuth,
  videoProjectAuth,
  async (req, res) => {
    const uploadId = req.get("X-Video-Upload-Id");

    if (!mongoose.isObjectIdOrHexString(uploadId)) {
      return res.status(400).json({
        error: "Reserve o ficheiro antes de iniciar o envio.",
      });
    }

    const controller = new AbortController();
    const { signal } = controller;

    let upload;
    let heartbeat;
    let processingTimer;
    let checking = false;

    const abort = () => controller.abort();
    const handleClose = () => {
      if (!res.writableEnded) controller.abort();
    };

    req.once("aborted", abort);
    res.once("close", handleClose);

    try {
      const temporaryPath = path.join(
        os.tmpdir(),
        `${uploadId}.video-upload`,
      );

      // Impede receber a mesma tentativa duas vezes.
      upload = await VideoUpload.findOneAndUpdate(
        {
          _id: uploadId,
          user_id: req.videoUser._id,
          project_id: req.videoProject._id,
          state: "uploading",
          slot_acquired: true,
          cancel_requested: false,
          temporary_path: null,
        },
        {
          $set: {
            temporary_path: temporaryPath,
            last_activity_at: new Date(),
          },
        },
        { new: true },
      );

      if (!upload) {
        throw failure(
          409,
          "O carregamento não tem vaga ou já foi iniciado.",
        );
      }


      heartbeat = setInterval(async () => {
        if (checking) return;
        checking = true;

        try {
          const current = await VideoUpload.findById(upload._id)
            .select("cancel_requested")
            .lean();

          if (!current || current.cancel_requested) {
            controller.abort();
            return;
          }

          await VideoUpload.updateOne(
            { _id: upload._id },
            { $set: { last_activity_at: new Date() } },
          );
        } catch {
          // Sem conseguir confirmar o estado, interromper.
          controller.abort();
        } finally {
          checking = false;
        }
      }, 1000);

      let lastBytes = 0;
      let lastByteActivity = Date.now();

      const trackBytes = (chunk) => {
        lastBytes += chunk.length;
        lastByteActivity = Date.now();
      };

      req.on("data", trackBytes);

      const stalled = setInterval(() => {
        if (Date.now() - lastByteActivity >= INACTIVITY_MS) {
          controller.abort();
        }
      }, 10000);

      let file;

      try {
        file = await receiveVideo(req, res, upload, signal);
      } finally {
        clearInterval(stalled);
        req.removeListener("data", trackBytes);
      }

      checkCancellation(signal);

      if (file.size !== upload.expected_size_bytes) {
        throw failure(
          400,
          "O tamanho recebido não corresponde ao ficheiro reservado.",
        );
      }

      processingTimer = setTimeout(
        () => controller.abort(),
        PROCESSING_MS,
      );

      const processingStarted = new Date();

      await VideoUpload.updateOne(
        { _id: upload._id },
        {
          $set: {
            state: "validating",
            processing_started_at: processingStarted,
            last_activity_at: new Date(),
          },
        },
      );

      const metadata = await readVideoMetadata(
        file.path,
        { signal },
      );

      validateVideoLimits(
        req.videoUser.type,
        metadata.duration_seconds,
        file.size,
      );

      checkCancellation(signal);

      await VideoUpload.updateOne(
        { _id: upload._id },
        {
          $set: {
            state: "thumbnail",
            last_activity_at: new Date(),
          },
        },
      );

      const thumbnail = await generateVideoThumbnail(
        file.path,
        metadata.duration_seconds,
        { signal },
      );

      checkCancellation(signal);

      const extension = path.extname(file.originalname).toLowerCase();
      const format = extension.slice(1);
      const videoId = String(upload.video_id);

      // Registar os nomes antes de pedir a gravação.
      upload.stored_files = [
        { stage: "src", file_name: `${videoId}${extension}` },
        { stage: "preview", file_name: `${videoId}.jpg` },
      ];

      await VideoUpload.updateOne(
        { _id: upload._id },
        { $set: { stored_files: upload.stored_files } },
      );

      const videoForm = new FormData();
      const originalStream = fs.createReadStream(file.path);

      videoForm.append("file", originalStream, {
        filename: `${videoId}${extension}`,
        contentType:
          format === "mov" ? "video/quicktime" : "video/mp4",
        knownLength: file.size,
      });

      try {
        await post_image(
          String(upload.user_id),
          videoId,
          "src",
          videoForm,
          {
            signal,
            headers: {
              "X-Storage-File-Name": `${videoId}${extension}`,
            },
          },
        );
      } finally {
        originalStream.destroy();
      }

      checkCancellation(signal);

      const thumbnailForm = new FormData();

      thumbnailForm.append("file", thumbnail.buffer, {
        filename: `${videoId}.jpg`,
        contentType: "image/jpeg",
        knownLength: thumbnail.buffer.length,
      });

      await post_image(
        String(upload.user_id),
        videoId,
        "preview",
        thumbnailForm,
        {
          signal,
          headers: {
            "X-Storage-File-Name": `${videoId}.jpg`,
            "X-Video-Upload-Id": String(upload._id),
          },
        },
      );

      checkCancellation(signal);

      const current = await VideoUpload.findById(upload._id).lean();

      if (current?.cancel_requested) {
        throw failure(409, "Carregamento cancelado.");
      }

      const video = await Video.create({
        _id: upload.video_id,
        user_id: upload.user_id,
        project_id: upload.project_id,
        name: path.basename(upload.name),
        storage_key: `${videoId}/src/${videoId}${extension}`,
        thumbnail_key: `${videoId}/preview/${videoId}.jpg`,
        thumbnail_time_seconds: thumbnail.timeSeconds,
        thumbnail_size_bytes: thumbnail.buffer.length,
        format,
        duration_seconds: metadata.duration_seconds,
        size_bytes: file.size,
      });

      checkCancellation(signal);

      const project = await Project.findOneAndUpdate(
        {
          _id: upload.project_id,
          user_id: upload.user_id,
          media_type: "video",
        },
        {
          $addToSet: { video_ids: upload.video_id },
          $inc: { version: 1 },
        },
        { new: true },
      );

      if (!project) {
        throw failure(404, "O projeto já não está disponível.");
      }

      // A associação é o ponto de conclusão:
      // depois disto o vídeo é preservado.
      clearTimeout(processingTimer);
      await settleUpload(upload, "completed");

      if (!res.destroyed) {
        res.status(201).json({
          message: "Vídeo adicionado ao projeto.",
          video: await publicVideo(String(upload.user_id), video),
          project_version: project.version,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar vídeo:", error.message);

      if (upload) {
        try {
          await settleUpload(
            upload,
            signal.aborted ? "cancelled" : "failed",
            signal.aborted
              ? "Carregamento cancelado ou interrompido."
              : error.status
                ? error.message
                : "Não foi possível guardar o vídeo.",
          );
        } catch (cleanupError) {
          console.error(
            "Limpeza pendente:",
            cleanupError.message,
          );
        }
      }

      if (!res.headersSent && !res.destroyed) {
        res.status(error.status || 503).json({
          error: error.status
            ? error.message
            : "Não foi possível guardar o vídeo. Tente novamente.",
        });
      }
    } finally {
      clearInterval(heartbeat);
      clearTimeout(processingTimer);

      req.removeListener("aborted", abort);
      res.removeListener("close", handleClose);

      if (upload) {
        running.delete(String(upload._id));

        if (upload.temporary_path) {
          await fsp.unlink(upload.temporary_path).catch(() => {});
        }
      }
    }
  },
);

// Recuperação persistente para este serviço projects.
// Não apaga registos por TTL.
let recovering = false;

const recoveryTimer = setInterval(async () => {
  if (recovering || mongoose.connection.readyState !== 1) return;
  recovering = true;

  try {
    const stale = new Date(Date.now() - INACTIVITY_MS);

    const uploads = await VideoUpload.find({
      $or: [
        { cleanup_pending: true },
        {
          state: {
            $in: ["waiting", "uploading", "validating", "thumbnail"],
          },
          last_activity_at: { $lt: stale },
        },
      ],
    }).limit(100);

    for (const upload of uploads) {
      const active = running.get(String(upload._id));

      if (active) {
        active.abort();
        continue;
      }

      try {
        await settleUpload(
          upload,
          upload.cancel_requested ? "cancelled" : "failed",
          "Carregamento interrompido; pode tentar novamente.",
        );
      } catch (error) {
        console.error(
          "Não foi possível recuperar carregamento:",
          String(upload._id),
          error.message,
        );
      }
    }
  } catch (error) {
    console.error("Erro na recuperação:", error.message);
  } finally {
    recovering = false;
  }
}, 15000);

recoveryTimer.unref();

module.exports = router;