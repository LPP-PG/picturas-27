const express = require("express");
const mongoose = require("mongoose");
const {
  acquireUploadSlot,
} = require("../utils/videoReservations");
const VideoUpload = require("../models/videoUpload");
const {
  getUploadCapacity,
  reserveUpload,
  releaseUploadReservation,
} = require("../utils/videoReservations");

const router = express.Router();

router.use(express.json({ limit: "256kb" }));

function sendError(res, error) {
  console.error("Erro no controlo de upload:", error.message);

  if (!res.headersSent && !res.destroyed) {
    res.status(error.status || 503).json({
      error: error.status
        ? error.message
        : "Não foi possível atualizar o carregamento.",
    });
  }
}

function publicUpload(upload) {
  return {
    _id: upload._id,
    video_id: upload.video_id,
    name: upload.name,
    size_bytes: upload.expected_size_bytes,
    state: upload.state,
    cancel_requested: upload.cancel_requested,
    cleanup_pending: upload.cleanup_pending,
    error: upload.error,
  };
}

async function findUpload(req) {
  if (!mongoose.isObjectIdOrHexString(req.params.upload)) {
    const error = new Error("Identificador de carregamento inválido.");
    error.status = 400;
    throw error;
  }

  const upload = await VideoUpload.findOne({
    _id: req.params.upload,
    user_id: req.videoUser._id,
    project_id: req.videoProject._id,
  });

  if (!upload) {
    const error = new Error("Carregamento não encontrado.");
    error.status = 404;
    throw error;
  }

  return upload;
}

router.get("/capacity", async (req, res) => {
  try {
    const capacity = await getUploadCapacity({
      userId: req.videoUser._id,
      projectId: req.videoProject._id,
      userType: req.videoUser.type,
      authorization: req.headers.authorization,
    });

    const { revision, ...response } = capacity;

    res.set("Cache-Control", "no-store");
    res.json(response);
  } catch (error) {
    sendError(res, error);
  }
});

// Reserva a seleção antes de o navegador enviar os ficheiros.
router.post("/uploads", async (req, res) => {
  const files = req.body?.files;
  const created = [];

  try {
    if (!Array.isArray(files) || files.length === 0) {
      const error = new Error("Selecione pelo menos um vídeo.");
      error.status = 400;
      throw error;
    }

    let totalBytes = 0;

    for (const file of files) {
      if (
        typeof file?.name !== "string" ||
        !/\.(mp4|mov)$/i.test(file.name) ||
        !Number.isSafeInteger(file.size_bytes) ||
        file.size_bytes <= 0 ||
        file.size_bytes > req.videoLimits.maxSizeBytes
      ) {
        const error = new Error(
          "A seleção contém um ficheiro com formato ou tamanho inválido.",
        );
        error.status = 400;
        throw error;
      }

      totalBytes += file.size_bytes;

      if (!Number.isSafeInteger(totalBytes)) {
        const error = new Error("O tamanho da seleção é inválido.");
        error.status = 400;
        throw error;
      }
    }

    const capacity = await getUploadCapacity({
      userId: req.videoUser._id,
      projectId: req.videoProject._id,
      userType: req.videoUser.type,
      authorization: req.headers.authorization,
    });

    if (
      totalBytes > capacity.account_available_bytes ||
      totalBytes > capacity.project_available_bytes
    ) {
      const error = new Error(
        "A seleção excede o espaço disponível no projeto ou na conta.",
      );
      error.status = 409;
      throw error;
    }

    for (const file of files) {
      const upload = await VideoUpload.create({
        user_id: req.videoUser._id,
        project_id: req.videoProject._id,
        video_id: new mongoose.Types.ObjectId(),
        name: file.name,
        expected_size_bytes: file.size_bytes,
        reserved_bytes: file.size_bytes,
        state: "waiting",
      });

      created.push(upload);

      await reserveUpload({
        userId: req.videoUser._id,
        projectId: req.videoProject._id,
        uploadId: upload._id,
        bytes: file.size_bytes,
        userType: req.videoUser.type,
        authorization: req.headers.authorization,
      });
    }

    // Se o cliente saiu antes de receber a resposta,
    // estas reservas não vão ser usadas.
    if (req.aborted || res.destroyed) {
      const error = new Error("Pedido de carregamento interrompido.");
      error.status = 409;
      throw error;
    }

    res.status(201).json({
      uploads: created.map(publicUpload),
    });
  } catch (error) {
    for (const upload of created) {
      try {
        await releaseUploadReservation(
          req.videoUser._id,
          upload._id,
        );

        await VideoUpload.updateOne(
          { _id: upload._id, state: "waiting" },
          {
            $set: {
              state: "failed",
              reserved_bytes: 0,
              error: "A seleção não foi admitida.",
              finished_at: new Date(),
            },
          },
        );
      } catch (cleanupError) {
        console.error(
          "Erro ao reverter reserva:",
          cleanupError.message,
        );
      }
    }

    sendError(res, error);
  }
});

router.get("/uploads/:upload", async (req, res) => {
  try {
    const upload = await findUpload(req);

    if (upload.state === "waiting" && !upload.cancel_requested) {
      await VideoUpload.updateOne(
        { _id: upload._id, state: "waiting" },
        { $set: { last_activity_at: new Date() } },
      );
    }

    res.set("Cache-Control", "no-store");
    res.json(publicUpload(upload));
  } catch (error) {
    sendError(res, error);
  }
});

// A transferência ativa será interrompida pelo respetivo worker.
// Só uma tentativa ainda em espera pode libertar já a reserva.
router.delete("/uploads/:upload", async (req, res) => {
  try {
    const upload = await findUpload(req);

    if (["completed", "failed", "cancelled"].includes(upload.state)) {
      return res.json(publicUpload(upload));
    }

    const waiting = await VideoUpload.findOneAndUpdate(
      {
        _id: upload._id,
        user_id: req.videoUser._id,
        state: "waiting",
      },
      {
        $set: {
          state: "cancelled",
          cancel_requested: true,
          cleanup_pending: true,
          finished_at: new Date(),
        },
      },
      { new: true },
    );

    if (waiting) {
      await releaseUploadReservation(
        req.videoUser._id,
        waiting._id,
      );

      const cancelled = await VideoUpload.findByIdAndUpdate(
        waiting._id,
        {
          $set: {
            reserved_bytes: 0,
            slot_acquired: false,
            cleanup_pending: false,
          },
        },
        { new: true },
      );

      return res.json(publicUpload(cancelled));
    }

    await VideoUpload.updateOne(
      {
        _id: upload._id,
        state: { $in: ["uploading", "validating", "thumbnail"] },
      },
      { $set: { cancel_requested: true } },
    );

    const current = await VideoUpload.findById(upload._id);
    res.status(202).json(publicUpload(current));
  } catch (error) {
    sendError(res, error);
  }
});
// O navegador pede uma vaga antes de enviar os bytes.
router.post("/uploads/:upload/start", async (req, res) => {
  try {
    const upload = await findUpload(req);

    if (upload.state === "uploading" && upload.slot_acquired) {
      return res.json(publicUpload(upload));
    }

    if (upload.state !== "waiting" || upload.cancel_requested) {
      return res.status(409).json({
        error: "Este carregamento já não está à espera de envio.",
      });
    }

    const acquired = await acquireUploadSlot(
      req.videoUser._id,
      upload._id,
      req.videoUser.type,
    );

    if (!acquired) {
      return res.status(429).json({
        error: "As vagas de carregamento da conta estão ocupadas.",
        code: "UPLOAD_SLOTS_FULL",
      });
    }

    const started = await VideoUpload.findOneAndUpdate(
      {
        _id: upload._id,
        state: "waiting",
        cancel_requested: false,
      },
      {
        $set: {
          state: "uploading",
          slot_acquired: true,
          last_activity_at: new Date(),
        },
      },
      { new: true },
    );

    if (!started) {
      await releaseUploadReservation(
        req.videoUser._id,
        upload._id,
      );

      return res.status(409).json({
        error: "O carregamento foi cancelado antes do envio.",
      });
    }

    res.json(publicUpload(started));
  } catch (error) {
    sendError(res, error);
  }
});

module.exports = router;