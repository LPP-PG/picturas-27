const express = require("express");
const mongoose = require("mongoose");
const VideoFilter = require("../models/videoFilter");
const router = express.Router();
const Video = require("../models/video");
const { getVideoFilterGraph } = require("../utils/videoFilterPresets");
const {
  countActiveVideoJobs,
  maxActiveVideoJobs,
} = require("../utils/videoProcessingLimit");
const {
  getUploadCapacity,
  reserveUpload,
  releaseUploadReservation,
} = require("../utils/videoReservations");
const axios = require("axios");
const https = require("node:https");
const { processFilterJob, cancelFilterJob } = require("../utils/videoFilterJob");
const { videoMessages, storageMessage } = require("../utils/videoMessages");
const { generateVideoFilterPreview } = require("../utils/videoFilterPreview");
const usersHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Dados de um pedido de filtro enviados ao frontend
function publicJob(job) {
  return {
    _id: job._id,
    source_video_id: job.source_video_id,
    result_video_id: job.result_video_id,
    filter_name: job.filter_name,
    state: job.state,
    progress: job.progress,
    cancel_requested: job.cancel_requested,
    error: job.error,
  };
}

 // Iniciar a aplicação de um filtro
router.post("/", async (req, res) => {
    let job = null;
    let operationReserved = false;
  try {
    const { video_id, filter_name } = req.body || {};

    // Verificar se o identificador do vídeo é válido
    if (!mongoose.isObjectIdOrHexString(video_id)) {
      return res.status(400).json({
        error: "Invalid video ID.",
      });
    }

    // Verificar se o filtro escolhido existe
    try {
      getVideoFilterGraph(filter_name);
    } catch {
      return res.status(400).json({
        error: "Unsupported video filter.",
      });
    }

    // Verificar se o vídeo pertence ao utilizador e ao projeto
    const video = await Video.findOne({
      _id: video_id,
      user_id: req.videoUser._id,
      project_id: req.videoProject._id,
    }).lean();

    if (!video) {
      return res.status(404).json({
        error: "Video not found in this project.",
      });
    }


// Verificar o limite global de processamentos de vídeo
const activeCount = await countActiveVideoJobs(req.videoUser._id);

if (activeCount >= maxActiveVideoJobs(req.videoUser.type)) {
  return res.status(429).json({
    error: videoMessages.limit,
  });
}

// Consultar o armazenamento disponível
const capacity = await getUploadCapacity({
  userId: req.videoUser._id,
  projectId: req.videoProject._id,
  userType: req.videoUser.type,
  authorization: req.headers.authorization,
});

// Estimativa inicial do espaço necessário para o resultado
const estimatedBytes = Math.min(
  capacity.limits.maxSizeBytes,
  Math.max(1, Math.ceil(video.size_bytes * 1.5)),
);

if (
  estimatedBytes > capacity.account_available_bytes ||
  estimatedBytes > capacity.project_available_bytes
) {
  return res.status(409).json({
    error: storageMessage(estimatedBytes, capacity),
  });
}

    // Reservar uma operação da quota diária.
    try {
      await axios.get(
        `https://users:10001/${req.videoUser._id}/process/1`,
        {
          httpsAgent: usersHttpsAgent,
          timeout: 10000,
        },
      );

      operationReserved = true;
    } catch (error) {
      if (error.response?.status === 701) {
        return res.status(429).json({
          error: videoMessages.quota,
        });
      }

      throw new Error("Could not verify the daily operation quota.");
    }

    // Criar o pedido na base de dados.
    job = await VideoFilter.create({
      user_id: req.videoUser._id,
      user_type: req.videoUser.type,
      project_id: req.videoProject._id,
      source_video_id: video._id,
      result_video_id: new mongoose.Types.ObjectId(),
      filter_name,
      output_format: "mp4",
      reserved_bytes: estimatedBytes,
      operation_reserved: true,
    });

    // Reservar espaço de armazenamento para o resultado.
    await reserveUpload({
      userId: req.videoUser._id,
      projectId: req.videoProject._id,
      uploadId: job._id,
      bytes: estimatedBytes,
      userType: req.videoUser.type,
      authorization: req.headers.authorization,
    });

    // Informar o frontend de que o pedido foi aceite.
    res.status(202).json(publicJob(job));

    // Iniciar o processamento em segundo plano.
    setImmediate(() => {
      void processFilterJob(
        job._id,
        req.headers.authorization,
      ).catch((error) => {
        console.error("Unexpected video filter error:", error);
      });
    });


  } catch (error) {
    console.error("Error starting video filter:", error);

    // Remover o pedido se a preparação falhou.
    if (job) {
      await VideoFilter.deleteOne({ _id: job._id })
        .catch(console.error);

      await releaseUploadReservation(
        req.videoUser._id,
        job._id,
      ).catch(console.error);
    }

    // Devolver a operação se o processamento nem chegou a começar.
    if (operationReserved) {
      await axios.post(
        `https://users:10001/${req.videoUser._id}/process/refund/1`,
        {},
        {
          httpsAgent: usersHttpsAgent,
          timeout: 10000,
        },
      ).catch((refundError) => {
        console.error(
          "Error refunding operation:",
          refundError.message,
        );
      });
    }

    if (!res.headersSent) {
      return res.status(error.status || 503).json({
        error: "Could not start video filter.",
      });
    }
  }
});


// Consultar o pedido de filtro mais recente de um vídeo
router.get("/", async (req, res) => {
  try {
    const videoId = req.query.video_id;

    if (!mongoose.isObjectIdOrHexString(videoId)) {
      return res.status(400).json({ error: "Invalid video ID." });
    }

    const job = await VideoFilter.findOne({
      user_id: req.videoUser._id,
      project_id: req.videoProject._id,
      source_video_id: videoId,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.set("Cache-Control", "no-store");
    res.json(job ? publicJob(job) : null);
  } catch (error) {
    console.error("Error fetching video filter:", error);

    res.status(500).json({
      error: "Could not retrieve video filter status.",
    });
  }
});



 // Pré-visualizar um filtro sem criar pedido nem consumir quota
router.get("/preview", async (req, res) => {
  try {
    const videoId = req.query.video_id;
    const filterName = req.query.filter_name;

    // Validar o vídeo
    if (!mongoose.isObjectIdOrHexString(videoId)) {
      return res.status(400).json({
        error: "Invalid video ID.",
      });
    }

    // Validar o filtro selecionado
    if (typeof filterName !== "string") {
      return res.status(400).json({
        error: "Invalid filter.",
      });
    }

    try {
      getVideoFilterGraph(filterName);
    } catch {
      return res.status(400).json({
        error: "Unsupported video filter.",
      });
    }

    // Garantir que o vídeo pertence ao utilizador e ao projeto
    const video = await Video.findOne({
      _id: videoId,
      user_id: req.videoUser._id,
      project_id: req.videoProject._id,
    }).lean();

    if (!video || !video.thumbnail_key) {
      return res.status(404).json({
        error: "Video preview is not available.",
      });
    }

    // Gerar apenas uma imagem, sem reservar espaço ou quota
    const image = await generateVideoFilterPreview(
      video,
      filterName
    );

    res.set("Cache-Control", "no-store");

    return res.json({
      image: `data:image/jpeg;base64,${image.toString("base64")}`,
    });
  } catch (error) {
    console.error("Error generating filter preview:", error);

    return res.status(503).json({
      error: "Could not generate filter preview.",
    });
  }
});


// Consultar o estado de um pedido de filtro
router.get("/:filterId", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.filterId)) {
      return res.status(400).json({
        error: "Invalid filter request ID.",
      });
    }

    const job = await VideoFilter.findOne({
      _id: req.params.filterId,
      user_id: req.videoUser._id,
      project_id: req.videoProject._id,
    }).lean();

    if (!job) {
      return res.status(404).json({
        error: "Filter request not found.",
      });
    }

    res.set("Cache-Control", "no-store");

    res.json(publicJob(job));
  } catch (error) {
    console.error("Error fetching video filter:", error);

    res.status(500).json({
      error: "Could not retrieve video filter status.",
    });
  }
});

// Cancelar um pedido de aplicação de filtro
router.delete("/:filterId", async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.filterId)) {
      return res.status(400).json({
        error: "Invalid filter request ID.",
      });
    }

    // Só é possível cancelar pedidos em fila ou em processamento.
    const job = await VideoFilter.findOne({
      _id: req.params.filterId,
      user_id: req.videoUser._id,
      project_id: req.videoProject._id,
      state: { $in: ["queued", "processing"] },
    });

    if (!job) {
      return res.status(404).json({
        error: "Active filter request not found.",
      });
    }

    const current = await cancelFilterJob(job);

    return res.status(202).json(publicJob(current));
  } catch (error) {
    console.error("Error cancelling video filter:", error);

    return res.status(503).json({
      error: "Could not cancel video filter.",
    });
  }
});

module.exports = router;