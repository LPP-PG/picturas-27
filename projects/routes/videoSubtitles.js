const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const https = require("node:https");

const router = express.Router();
const Video = require("../models/video");
const VideoSubtitle = require("../models/videoSubtitle");
const {
  countActiveVideoJobs,
  maxActiveVideoJobs,
} = require("../utils/videoProcessingLimit");
const { getUploadCapacity } = require("../utils/videoReservations");
const {
  isValidLanguage,
  estimateSubtitleBytes,
} = require("../utils/videoSubtitleFormat");
const { checkSpeechService } = require("../utils/speechClient");
const { get_image_internal_url } = require("../utils/imageStorage");
const {
  processSubtitleJob,
  cancelSubtitleJob,
  recoverInterruptedSubtitleJobs,
  retryPendingRefunds,
} = require("../utils/videoSubtitleJob");

const usersHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const messages = {
  no_audio: "No audio track was found in this video.",
  quota: "You have reached the daily operations limit. It resets at midnight.",
  limit: "The simultaneous video-processing limit was reached.",
  storage: "Insufficient storage space.",
  service:
    "The subtitle service is temporarily unavailable. Please try again later.",
  duplicate: "Subtitles are already being generated for this video.",
};

// Recuperar pedidos interrompidos por um reinício (só os anteriores ao arranque)
const STARTED_AT = new Date();

function recover() {
  recoverInterruptedSubtitleJobs(STARTED_AT)
    .catch((error) => {
      console.error("Error recovering subtitle jobs:", error);
    })
    .then(retryPendingRefunds);
}

if (mongoose.connection.readyState === 1) recover();
else mongoose.connection.once("open", recover);

// Repetir as devoluções que falharam (o serviço de utilizadores pode demorar a arrancar)
setInterval(() => {
  if (mongoose.connection.readyState === 1) void retryPendingRefunds();
}, 60000).unref();

function coded(res, status, code) {
  return res.status(status).json({ error: messages[code], error_code: code });
}

function publicJob(job) {
  return {
    _id: job._id,
    video_id: job.video_id,
    language: job.language,
    detected_language: job.detected_language,
    state: job.state,
    progress: job.progress,
    error_code: job.error_code,
    error: job.error,
  };
}

// Iniciar a geração de legendas
router.post("/", async (req, res) => {
  let job = null;
  let operationReserved = false;

  try {
    const { video_id, language } = req.body || {};

    // Verificar se o identificador do vídeo é válido
    if (!mongoose.isObjectIdOrHexString(video_id)) {
      return res.status(400).json({ error: "Invalid video ID." });
    }

    // Verificar se o idioma é suportado
    if (!isValidLanguage(language)) {
      return res.status(400).json({ error: "Unsupported subtitle language." });
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

    // Recusar vídeos sem pista de áudio
    if (video.has_audio === false) {
      return coded(res, 422, "no_audio");
    }

    // Recusar se já existe um pedido ativo para este vídeo
    const duplicate = await VideoSubtitle.exists({
      user_id: req.videoUser._id,
      video_id: video._id,
      state: { $in: ["queued", "processing"] },
    });

    if (duplicate) {
      return coded(res, 409, "duplicate");
    }

    // Verificar o limite global de processamentos de vídeo
    const activeCount = await countActiveVideoJobs(req.videoUser._id);

    if (activeCount >= maxActiveVideoJobs(req.videoUser.type)) {
      return coded(res, 429, "limit");
    }

    // Verificar o armazenamento disponível (sem reserva)
    const capacity = await getUploadCapacity({
      userId: req.videoUser._id,
      projectId: req.videoProject._id,
      userType: req.videoUser.type,
      authorization: req.headers.authorization,
    });

    const estimatedBytes = estimateSubtitleBytes(video.duration_seconds);

    if (
      estimatedBytes > capacity.account_available_bytes ||
      estimatedBytes > capacity.project_available_bytes
    ) {
      return coded(res, 409, "storage");
    }

    // Verificar se o serviço de reconhecimento de fala está disponível
    if (!(await checkSpeechService())) {
      return coded(res, 503, "service");
    }

    // Reservar uma operação da quota diária
    try {
      await axios.get(`https://users:10001/${req.videoUser._id}/process/1`, {
        httpsAgent: usersHttpsAgent,
        timeout: 10000,
      });

      operationReserved = true;
    } catch (error) {
      if (error.response?.status === 701) {
        return coded(res, 429, "quota");
      }

      throw new Error("Could not verify the daily operation quota.");
    }

    // Criar o pedido na base de dados
    job = await VideoSubtitle.create({
      user_id: req.videoUser._id,
      user_type: req.videoUser.type,
      project_id: req.videoProject._id,
      video_id: video._id,
      language,
      operation_reserved: true,
    });

    res.status(202).json(publicJob(job));

    // Iniciar o processamento em segundo plano
    setImmediate(() => {
      void processSubtitleJob(job._id, req.headers.authorization).catch(
        (error) => {
          console.error("Unexpected subtitle error:", error);
        },
      );
    });
  } catch (error) {
    console.error("Error starting subtitles:", error);

    // Remover o pedido se a preparação falhou
    if (job) {
      await VideoSubtitle.deleteOne({ _id: job._id }).catch(console.error);
    }

    // Devolver a operação se o processamento nem chegou a começar
    if (operationReserved) {
      await axios
        .post(
          `https://users:10001/${req.videoUser._id}/process/refund/1`,
          {},
          { httpsAgent: usersHttpsAgent, timeout: 10000 },
        )
        .catch((refundError) => {
          console.error("Error refunding operation:", refundError.message);
        });
    }

    if (!res.headersSent) {
      return res.status(error.status || 503).json({
        error: "Could not start subtitle generation.",
      });
    }
  }
});

// Consultar o pedido mais recente de um vídeo
router.get("/", async (req, res) => {
  try {
    const videoId = req.query.video_id;

    if (!mongoose.isObjectIdOrHexString(videoId)) {
      return res.status(400).json({ error: "Invalid video ID." });
    }

    const job = await VideoSubtitle.findOne({
      user_id: req.videoUser._id,
      project_id: req.videoProject._id,
      video_id: videoId,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.set("Cache-Control", "no-store");
    res.json(job ? publicJob(job) : null);
  } catch (error) {
    console.error("Error fetching subtitles:", error);

    res.status(500).json({
      error: "Could not retrieve subtitle status.",
    });
  }
});

// Obter o texto das legendas de um vídeo (antes de /:subtitleId)
router.get("/vtt/:videoId", async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.videoId)) {
      return res.status(400).json({ error: "Invalid video ID." });
    }

    const video = await Video.findOne({
      _id: req.params.videoId,
      user_id: req.videoUser._id,
      project_id: req.videoProject._id,
    }).lean();

    if (!video?.subtitles_key) {
      return res.status(404).json({ error: "Subtitles not found." });
    }

    const response = await get_image_internal_url(
      String(req.videoUser._id),
      String(video._id),
      "subtitles",
      video.subtitles_key.split("/").pop(),
    );

    if (!response.data?.url) {
      throw new Error("Could not get the subtitles address.");
    }

    const file = await axios.get(response.data.url, {
      responseType: "text",
      timeout: 30000,
    });

    res.set("Cache-Control", "no-store");
    res.json({ language: video.subtitles_language, vtt: file.data });
  } catch (error) {
    console.error("Error fetching subtitle file:", error);

    res.status(500).json({
      error: "Could not retrieve the subtitles.",
    });
  }
});

// Consultar o estado de um pedido de legendas
router.get("/:subtitleId", async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.subtitleId)) {
      return res.status(400).json({
        error: "Invalid subtitle request ID.",
      });
    }

    const job = await VideoSubtitle.findOne({
      _id: req.params.subtitleId,
      user_id: req.videoUser._id,
      project_id: req.videoProject._id,
    }).lean();

    if (!job) {
      return res.status(404).json({
        error: "Subtitle request not found.",
      });
    }

    res.set("Cache-Control", "no-store");
    res.json(publicJob(job));
  } catch (error) {
    console.error("Error fetching subtitle request:", error);

    res.status(500).json({
      error: "Could not retrieve subtitle status.",
    });
  }
});

// Cancelar um pedido de legendas
router.delete("/:subtitleId", async (req, res) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.subtitleId)) {
      return res.status(400).json({
        error: "Invalid subtitle request ID.",
      });
    }

    // Só é possível cancelar pedidos em fila ou em processamento
    const job = await VideoSubtitle.findOne({
      _id: req.params.subtitleId,
      user_id: req.videoUser._id,
      project_id: req.videoProject._id,
      state: { $in: ["queued", "processing"] },
    }).lean();

    if (!job) {
      return res.status(404).json({
        error: "Active subtitle request not found.",
      });
    }

    const current = await cancelSubtitleJob(job);

    return res.status(202).json(publicJob(current));
  } catch (error) {
    console.error("Error cancelling subtitles:", error);

    return res.status(503).json({
      error: "Could not cancel subtitle generation.",
    });
  }
});

module.exports = router;
