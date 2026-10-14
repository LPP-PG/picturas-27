const express = require("express");
const axios = require("axios");
const https = require("node:https");
const auth = require("../auth/auth");

const router = express.Router();
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

function requireVideoOwner(req, res, next) {
  if (String(req.authUserId) !== String(req.params.user)) {
    return res.status(403).json({
      error: "Não pode aceder aos vídeos de outro utilizador.",
    });
  }

  next();
}

function sendError(res, error) {
  const status = error.response?.status;

  return res.status(
    Number.isInteger(status) && status >= 400 && status <= 599
      ? status
      : 502,
  ).json(
    error.response?.data || {
      error: "Não foi possível comunicar com o serviço de vídeos.",
    },
  );
}

// Consultar a biblioteca.
router.get("/:user", auth.checkToken, requireVideoOwner, async (req, res) => {
  try {
    const response = await axios.get(
      `https://projects:9001/videos/${req.params.user}`,
      {
        httpsAgent,
        headers: { Authorization: req.headers.authorization },
        timeout: 15000,
      },
    );

    res.status(response.status).json(response.data);
  } catch (error) {
    sendError(res, error);
  }
});

// Encaminhar o ficheiro sem carregar o vídeo inteiro na memória do gateway.
router.post("/:user", auth.checkToken, requireVideoOwner, async (req, res) => {
  const contentType = req.headers["content-type"] || "";

  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    return res.status(400).json({
      error: "O carregamento deve usar um formulário multipart.",
    });
  }

  try {
    const response = await axios.post(
      `https://projects:9001/videos/${req.params.user}`,
      req,
      {
        httpsAgent,
        headers: {
          Authorization: req.headers.authorization,
          "Content-Type": contentType,
        },
        maxBodyLength: Infinity,
        timeout: 300000,
      },
    );

    res.status(response.status).json(response.data);
  } catch (error) {
    sendError(res, error);
  }
});

module.exports = router;