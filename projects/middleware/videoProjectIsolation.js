const mongoose = require("mongoose");

const Project = require("../models/project");
const videoAuth = require("./videoAuth");

async function isolateVideoProject(req, res, next) {
  try {
    const { user, project } = req.params;

    if (
      !mongoose.isObjectIdOrHexString(user) ||
      !mongoose.isObjectIdOrHexString(project)
    ) {
      return next();
    }

    const document = await Project.findOne({
      _id: project,
      user_id: user,
    })
      .select("media_type")
      .lean();

    if (!document || document.media_type !== "video") {
      return next();
    }

    // Validar a sessão real, não apenas o ID enviado pelo cliente.
    return videoAuth(req, res, () => {
      const hasShare =
        req.query.share !== undefined ||
        req.query.shareId !== undefined ||
        req.headers["x-share-id"] !== undefined;

      if (hasShare) {
        return res.status(403).json({
          error: "A partilha de projetos de vídeo não está disponível.",
        });
      }

      const rootPath = req.path === "/" || req.path === "";

      // Neste MVP, esta rota comum permite consultar ou eliminar
      // o projeto de vídeo. O upload usa o router /videos.
      if (
        rootPath &&
        (req.method === "GET" || req.method === "DELETE")
      ) {
        return next();
      }

      return res.status(403).json({
        error:
          "Esta operação pertence aos projetos de imagens e não está disponível num projeto de vídeo.",
      });
    });
  } catch (error) {
    console.error("Erro ao verificar tipo de projeto:", error.message);

    return res.status(503).json({
      error: "Não foi possível verificar o acesso ao projeto.",
    });
  }
}

async function rejectVideoShare(req, res, next) {
  try {
    const document = await Project.findOne({
      "sharedLinks.id": req.params.shareId,
    })
      .select("media_type")
      .lean();

    if (document?.media_type === "video") {
      return res.status(403).json({
        error: "A partilha de projetos de vídeo não está disponível.",
      });
    }

    return next();
  } catch (error) {
    console.error("Erro ao verificar partilha:", error.message);

    return res.status(503).json({
      error: "Não foi possível verificar a partilha.",
    });
  }
}

module.exports = {
  isolateVideoProject,
  rejectVideoShare,
};