const axios = require("axios");
const https = require("node:https");
const mongoose = require("mongoose");
const { getVideoLimits } = require("../utils/videoLimits");

// Certificado autoassinado usado pelos serviços locais.
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

async function videoAuth(req, res, next) {
  const userId = req.params.user;
  const authorization = req.headers.authorization;

  if (!mongoose.isObjectIdOrHexString(userId)) {
    return res.status(400).json({
      error: "Identificador de utilizador inválido.",
    });
  }

  if (!authorization || !/^Bearer \S+$/i.test(authorization)) {
    return res.status(401).json({
      error: "É necessário iniciar sessão.",
    });
  }

  try {
    const response = await axios.get(
      `https://users:10001/validate/${userId}`,
      {
        httpsAgent,
        headers: { Authorization: authorization },
        timeout: 10000,
      },
    );

    const user = response.data?.user;

    if (!user || String(user._id) !== String(userId)) {
      return res.status(401).json({
        error: "A sessão não corresponde ao utilizador.",
      });
    }

    req.videoLimits = getVideoLimits(user.type);
    req.videoUser = user;

    return next();
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({
        error: error.message,
      });
    }

    if ([400, 401, 403].includes(error.response?.status)) {
      return res.status(401).json({
        error: "Sessão inválida ou expirada. Inicie sessão novamente.",
      });
    }

    return res.status(503).json({
      error: "Não foi possível verificar a sessão. Tente novamente.",
    });
  }
}

module.exports = videoAuth;