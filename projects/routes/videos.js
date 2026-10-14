const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const FormData = require("form-data");

const Video = require("../models/video");
const videoAuth = require("../middleware/videoAuth");
const { readVideoMetadata } = require("../utils/videoMetadata");
const { validateVideoLimits } = require("../utils/videoLimits");
const {
  post_image,
  delete_image,
} = require("../utils/imageStorage");

const router = express.Router();

function receiveVideo(req, res, next) {
  const upload = multer({
    dest: os.tmpdir(),
    limits: {
      fileSize: req.videoLimits.maxSizeBytes,
      files: 1,
      fields: 0,
    },
    fileFilter: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();

      if (![".mp4", ".mov"].includes(extension)) {
        const error = new Error("Só são aceites vídeos MP4 ou MOV.");
        error.status = 400;
        return callback(error);
      }

      callback(null, true);
    },
  }).single("video");

  upload(req, res, (error) => {
    if (error) {
      return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
        error:
          error.code === "LIMIT_FILE_SIZE"
            ? "O vídeo excede o tamanho máximo permitido pelo seu perfil."
            : error.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "Selecione um vídeo para carregar.",
      });
    }

    next();
  });
}

// Listar apenas os vídeos do proprietário autenticado.
router.get("/:user", videoAuth, async (req, res) => {
  try {
    const videos = await Video.find({ user_id: req.videoUser._id })
      .select(
        "name format duration_seconds size_bytes original_video_id createdAt",
      )
      .sort({ createdAt: -1 })
      .lean();

    res.json(videos);
  } catch (error) {
    console.error("Erro ao listar vídeos:", error.message);
    res.status(500).json({ error: "Não foi possível listar os vídeos." });
  }
});

// Carregar um vídeo. O campo do formulário chama-se "video".
router.post("/:user", videoAuth, receiveVideo, async (req, res) => {
  const userId = String(req.videoUser._id);
  const videoId = new mongoose.Types.ObjectId();
  const storageGroup = String(videoId);
  let storedFileName = null;

  try {
    const metadata = await readVideoMetadata(req.file.path);

    validateVideoLimits(
      req.videoUser.type,
      metadata.duration_seconds,
      req.file.size,
    );

    const extension = path.extname(req.file.originalname).toLowerCase();
    const format = extension.slice(1);
    const contentType = format === "mov" ? "video/quicktime" : "video/mp4";

    const form = new FormData();
    form.append("file", fs.createReadStream(req.file.path), {
      filename: `${videoId}${extension}`,
      contentType,
      knownLength: req.file.size,
    });

    const response = await post_image(
      userId,
      storageGroup,
      "src",
      form,
    );

    const storageKey = response.data?.data?.imageKey;

    if (typeof storageKey !== "string" || !storageKey) {
      throw new Error("O armazenamento não devolveu a chave do vídeo.");
    }

    storedFileName = storageKey.split("/").pop();

    const video = await Video.create({
      _id: videoId,
      user_id: userId,
      name: path.basename(req.file.originalname),
      storage_key: storageKey,
      format,
      duration_seconds: metadata.duration_seconds,
      size_bytes: req.file.size,
    });

    res.status(201).json({
      message: "Vídeo carregado com sucesso.",
      video: {
        _id: video._id,
        name: video.name,
        format: video.format,
        duration_seconds: video.duration_seconds,
        size_bytes: video.size_bytes,
        createdAt: video.createdAt,
      },
    });
  } catch (error) {
    // Se o registo falhar, remover o ficheiro já guardado.
    if (storedFileName) {
      try {
        await delete_image(userId, storageGroup, "src", storedFileName);
      } catch (cleanupError) {
        console.error(
          "Erro ao remover vídeo após falha:",
          cleanupError.message,
        );
      }
    }

    console.error("Erro ao carregar vídeo:", error.message);

    res.status(error.status || 500).json({
      error: error.status
        ? error.message
        : "Não foi possível guardar o vídeo. Tente novamente.",
    });
  } finally {
    await fsp.unlink(req.file.path).catch((error) => {
      console.error("Erro ao limpar ficheiro temporário:", error.message);
    });
  }
});

module.exports = router;