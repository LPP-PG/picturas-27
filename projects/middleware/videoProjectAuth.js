const mongoose = require("mongoose");
const Project = require("../models/project");

async function videoProjectAuth(req, res, next) {
  try {
    const projectId = req.params.project;
    const userId = req.videoUser?._id;

    if (!userId) {
      return res.status(401).json({
        error: "É necessário iniciar sessão.",
      });
    }

    if (
      typeof projectId !== "string" ||
      !mongoose.isObjectIdOrHexString(projectId)
    ) {
      return res.status(400).json({
        error: "O identificador do projeto é inválido.",
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      user_id: userId,
    }).exec();

    if (!project) {
      return res.status(404).json({
        error: "Projeto não encontrado.",
      });
    }

    if (project.media_type !== "video") {
      return res.status(400).json({
        error: "Este projeto é de imagens e não aceita vídeos.",
      });
    }

    req.videoProject = project;
    next();
  } catch (error) {
    console.error(
      "Erro ao verificar acesso ao projeto de vídeo:",
      error.message,
    );

    res.status(500).json({
      error: "Não foi possível verificar o acesso ao projeto.",
    });
  }
}

module.exports = videoProjectAuth;