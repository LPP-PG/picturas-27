const express = require("express");
const axios = require("axios");
const https = require("node:https");
const auth = require("../auth/auth");

const router = express.Router();

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

router.use(express.json({ limit: "256kb" }));

function requireVideoOwner(req, res, next) {
  if (String(req.authUserId) !== String(req.params.user)) {
    return res.status(403).json({
      error: "Não pode aceder aos vídeos de outro utilizador.",
    });
  }

  next();
}

function validateProjectId(req, res, next) {
  if (!/^[a-f0-9]{24}$/i.test(req.params.project)) {
    return res.status(400).json({
      error: "O identificador do projeto é inválido.",
    });
  }

  next();
}

function sendError(res, error) {
  if (res.headersSent || res.destroyed) return;

  const status = error.response?.status;

  res.status(
    Number.isInteger(status) && status >= 400 && status <= 599
      ? status
      : 502,
  ).json(
    error.response?.data || {
      error: "Não foi possível comunicar com o serviço de vídeos.",
    },
  );
}

function serviceUrl(req, suffix = "") {
  return (
    `https://projects:9001/videos/` +
    `${encodeURIComponent(req.params.user)}/` +
    `${encodeURIComponent(req.params.project)}` +
    suffix
  );
}

function controlRoute(method, route, suffix) {
  router[method](
    route,
    auth.checkToken,
    requireVideoOwner,
    validateProjectId,
    async (req, res) => {
      try {
        const response = await axios({
          method,
          url: serviceUrl(req, suffix(req)),
          httpsAgent,
          headers: {
            Authorization: req.headers.authorization,
          },
          data: method === "post" ? req.body : undefined,
          timeout: 120000,
        });

        res.set("Cache-Control", "no-store");
        res.status(response.status).json(response.data);
      } catch (error) {
        sendError(res, error);
      }
    },
  );
}

router.get(
  "/:user/capacity",
  auth.checkToken,
  requireVideoOwner,
  async (req, res) => {
    try {
      const response = await axios.get(
        `https://projects:9001/videos/${encodeURIComponent(req.params.user)}/capacity`,
        {
          httpsAgent,
          headers: {
            Authorization: req.headers.authorization,
          },
          timeout: 120000,
        },
      );

      res.set("Cache-Control", "no-store");
      res.status(response.status).json(response.data);
    } catch (error) {
      sendError(res, error);
    }
  },
);

controlRoute(
  "get",
  "/:user/:project/capacity",
  () => "/capacity",
);

controlRoute(
  "post",
  "/:user/:project/uploads",
  () => "/uploads",
);

controlRoute(
  "get",
  "/:user/:project/uploads/:upload",
  (req) => `/uploads/${encodeURIComponent(req.params.upload)}`,
);

controlRoute(
  "delete",
  "/:user/:project/uploads/:upload",
  (req) => `/uploads/${encodeURIComponent(req.params.upload)}`,
);

controlRoute(
  "get",
  "/:user/:project",
  () => "",
);
controlRoute(
  "post",
  "/:user/:project/uploads/:upload/start",
  (req) =>
    `/uploads/${encodeURIComponent(req.params.upload)}/start`,
);

router.post(
  "/:user/:project",
  auth.checkToken,
  requireVideoOwner,
  validateProjectId,
  async (req, res) => {
    const contentType = req.headers["content-type"] || "";

    if (!/^multipart\/form-data\s*;/i.test(contentType)) {
      return res.status(400).json({
        error: "O carregamento deve usar um formulário multipart.",
      });
    }

    const controller = new AbortController();

    const abortUpload = () => controller.abort();
    const handleClose = () => {
      if (!res.writableEnded) controller.abort();
    };

    req.once("aborted", abortUpload);
    res.once("close", handleClose);

    try {
      const headers = {
        Authorization: req.headers.authorization,
        "Content-Type": contentType,
      };

      if (req.headers["x-video-upload-id"]) {
        headers["X-Video-Upload-Id"] =
          req.headers["x-video-upload-id"];
      }

      const response = await axios.post(
        serviceUrl(req),
        req,
        {
          httpsAgent,
          headers,
          signal: controller.signal,
          maxBodyLength: Infinity,
          timeout: 0,
        },
      );

      if (!res.destroyed) {
        res.status(response.status).json(response.data);
      }
    } catch (error) {
      if (!req.aborted && !res.destroyed) {
        sendError(res, error);
      }
    } finally {
      req.removeListener("aborted", abortUpload);
      res.removeListener("close", handleClose);
    }
  },
);

module.exports = router;