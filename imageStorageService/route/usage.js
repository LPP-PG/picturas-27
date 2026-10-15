const express = require("express");
const https = require("node:https");
const s3 = require("../services/s3Client");

const router = express.Router();

function validateSession(userId, authorization) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      `https://users:10001/validate/${userId}`,
      {
        rejectUnauthorized: false,
        headers: { Authorization: authorization },
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");

        response.on("data", (chunk) => {
          body += chunk;

          if (body.length > 1_000_000) {
            response.destroy(
              new Error("Resposta de autenticação demasiado grande."),
            );
          }
        });

        response.on("error", reject);

        response.on("end", () => {
          try {
            if (response.statusCode !== 200) {
              const error = new Error("Sessão inválida ou expirada.");
              error.status = 401;
              return reject(error);
            }

            const user = JSON.parse(body)?.user;

            if (!user || String(user._id) !== userId) {
              const error = new Error("Acesso recusado.");
              error.status = 403;
              return reject(error);
            }

            resolve(user);
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    request.setTimeout(10000, () => {
      request.destroy(new Error("Tempo de autenticação excedido."));
    });

    request.on("error", reject);
  });
}

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  const authorization = req.headers.authorization || "";

  if (!/^[a-f0-9]{24}$/i.test(userId)) {
    return res.status(400).json({
      error: "Identificador de utilizador inválido.",
    });
  }

  if (!/^Bearer \S+$/i.test(authorization)) {
    return res.status(401).json({
      error: "É necessário iniciar sessão.",
    });
  }

  try {
    await validateSession(userId, authorization);

    const groups = new Map();
    let totalBytes = 0;
    let continuationToken;

    do {
      let page;

      try {
        page = await s3.listObjectsV2({
          Bucket: `user-${userId}`,
          ContinuationToken: continuationToken,
        }).promise();
      } catch (error) {
        if (error.code === "NoSuchBucket") {
          break;
        }

        throw error;
      }

      for (const object of page.Contents || []) {
        const bytes = Number(object.Size);

        if (!Number.isSafeInteger(bytes) || bytes < 0) {
          throw new Error("Tamanho de objeto inválido.");
        }

        totalBytes += bytes;

        const [groupId, stage] = String(object.Key).split("/");

        if (!groupId || !stage) {
          continue;
        }

        if (!groups.has(groupId)) {
          groups.set(groupId, {
            total_bytes: 0,
            stages: {},
          });
        }

        const group = groups.get(groupId);
        group.total_bytes += bytes;
        group.stages[stage] = (group.stages[stage] || 0) + bytes;
      }

      continuationToken = page.IsTruncated
        ? page.NextContinuationToken
        : undefined;

      if (page.IsTruncated && !continuationToken) {
        throw new Error("Listagem de armazenamento incompleta.");
      }
    } while (continuationToken);

    res.set("Cache-Control", "no-store");

    res.json({
      total_bytes: totalBytes,
      groups: Object.fromEntries(groups),
    });
  } catch (error) {
    console.error("Erro ao consultar armazenamento:", error.message);

    if (!res.destroyed) {
      res.status(error.status || 503).json({
        error: error.status
          ? error.message
          : "Não foi possível consultar o espaço ocupado.",
      });
    }
  }
});

module.exports = router;