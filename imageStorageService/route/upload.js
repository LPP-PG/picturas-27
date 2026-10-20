const express = require("express");
const multer = require("multer");
const os = require("node:os");
const fs = require("node:fs/promises");

const uploadImage = require("../services/uploadImage");
const allowedStages = require("../utils/stages");
const s3 = require("../services/s3Client");

const router = express.Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: {
    files: 1,
    fields: 0,
  },
}).single("file");

router.post("/:userId/:projectId/:stage", (req, res) => {
  const { userId, projectId, stage } = req.params;
  const storageFileName = req.get("X-Storage-File-Name");

  if (!allowedStages.includes(stage)) {
    return res.status(400).json({
      error: "O estágio deve ser src, preview, preview_cache, out ou subtitles.",
    });
  }

  if (
    storageFileName !== undefined &&
    !/^[a-f0-9]{24}\.(mp4|mov|jpg|vtt)$/i.test(storageFileName)
  ) {
    return res.status(400).json({
      error: "Nome de armazenamento inválido.",
    });
  }

  const controller = new AbortController();

  const abort = () => controller.abort();

  const handleClose = () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  };

  req.once("aborted", abort);
  res.once("close", handleClose);

  upload(req, res, async (receiveError) => {
    try {
      if (controller.signal.aborted) return;

      if (receiveError) {
        return res.status(400).json({
          error: receiveError.message,
        });
      }

      if (!req.file || req.file.size <= 0) {
        return res.status(400).json({
          error: "Selecione um ficheiro não vazio.",
        });
      }

      const result = await uploadImage(
        userId,
        projectId,
        req.file,
        stage,
        {
          signal: controller.signal,
          storageFileName,
        },
      );

      if (!controller.signal.aborted && !res.destroyed) {
        res.status(201).json({
          message: "Ficheiro enviado com sucesso!",
          data: result,
        });
      }
    } catch (error) {
      console.error("Erro no carregamento:", error.message);

      if (
        !controller.signal.aborted &&
        !res.headersSent &&
        !res.destroyed
      ) {
        res.status(error.status || 500).json({
          error: error.status
            ? error.message
            : "Não foi possível guardar o ficheiro.",
        });
      }
    } finally {
      if (controller.signal.aborted && storageFileName) {
        try {
          await s3.deleteObject({
            Bucket: `user-${userId}`,
            Key: `${projectId}/${stage}/${storageFileName}`,
          }).promise();
        } catch (error) {
          console.error(
            "Limpeza pendente no armazenamento:",
            error.message,
          );
        }
      }

      if (req.file?.path) {
        await fs.unlink(req.file.path).catch((error) => {
          if (error.code !== "ENOENT") {
            console.error(
              "Erro ao limpar ficheiro temporário:",
              error.message,
            );
          }
        });
      }

      req.removeListener("aborted", abort);
      res.removeListener("close", handleClose);
    }
  });
});

module.exports = router;