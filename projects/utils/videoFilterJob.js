
const fs = require("node:fs/promises");
const axios = require("axios");
const https = require("node:https");

const Video = require("../models/video");
const VideoFilter = require("../models/videoFilter");
const { prepareFilteredVideo } = require("./videoFilterProcessing");
const { saveFilteredVideo } = require("./videoFilterStorage");
const {
  releaseUploadReservation,
} = require("./videoReservations");

const usersService = "https://users:10001";
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

function cancellationError() {
  const error = new Error("Video filter cancelled.");
  error.name = "AbortError";
  return error;
}

async function checkCancellation(jobId) {
  const current = await VideoFilter.findById(jobId)
    .select("state cancel_requested")
    .lean();

  if (
    !current ||
    current.cancel_requested ||
    current.state !== "processing"
  ) {
    throw cancellationError();
  }
}

async function processFilterJob(jobId, authorization) {
  const job = await VideoFilter.findOneAndUpdate(
    {
      _id: jobId,
      state: "queued",
      cancel_requested: false,
    },
    {
      $set: { state: "processing", progress: 5 },
    },
    { new: true },
  );

  if (!job) return;

  let outputPath;
  let cancellationRequested = false;

  // Consultar periodicamente se foi pedido o cancelamento.
  const cancellationTimer = setInterval(() => {
    void VideoFilter.findById(jobId)
      .select("cancel_requested state")
      .lean()
      .then((current) => {
        cancellationRequested =
          !current ||
          current.cancel_requested ||
          current.state === "cancelled";
      })
      .catch((error) => {
        console.error("Error checking filter cancellation:", error);
      });
  }, 500);

  try {
    // Obter o vídeo original.
    const source = await Video.findOne({
      _id: job.source_video_id,
      user_id: job.user_id,
      project_id: job.project_id,
    }).lean();

    if (!source) {
      throw new Error("Original video not found.");
    }

    await checkCancellation(jobId);

    // Aplicar o efeito ao vídeo.
    const result = await prepareFilteredVideo(
      source,
      job._id,
      job.filter_name,
      (percentage) => {
        void VideoFilter.updateOne(
          { _id: jobId, state: "processing" },
          {
            $set: {
              progress: Math.round(10 + percentage * 0.7),
            },
          },
        ).catch(console.error);
      },
      () => cancellationRequested,
    );

    outputPath = result.outputPath;

    await checkCancellation(jobId);

    await VideoFilter.updateOne(
      { _id: jobId, state: "processing" },
      { $set: { progress: 85 } },
    );

    // Guardar o resultado no mesmo projeto.
    const stored = await saveFilteredVideo({
      job,
      source,
      outputPath,
      metadata: result.metadata,
      sizeBytes: result.sizeBytes,
      authorization,
      isCancelled: () => cancellationRequested,
    });

    await VideoFilter.updateOne(
      { _id: jobId },
      {
        $set: {
          state: "completed",
          progress: 100,
          reserved_bytes: 0,
          result_storage_key: stored.storageKey,
          thumbnail_storage_key: stored.thumbnailKey,
          finished_at: new Date(),
        },
      },
    );
  } catch (error) {
    const cancelled = error.name === "AbortError";

    // Devolver a operação reservada em caso de falha.
    let refunded = false;

    if (job.operation_reserved) {
      try {
        await axios.post(
          `${usersService}/${job.user_id}/process/refund/1`,
          {},
          {
            httpsAgent,
            timeout: 10000,
          },
        );
        refunded = true;
      } catch (refundError) {
        console.error(
          "Error refunding video filter operation:",
          refundError.message,
        );
      }
    }

    await VideoFilter.updateOne(
      { _id: jobId },
      {
        $set: {
          state: cancelled ? "cancelled" : "failed",
          reserved_bytes: 0,
          ...(refunded ? { operation_reserved: false } : {}),
          error: error.message,
          finished_at: new Date(),
        },
      },
    );
  } finally {
    clearInterval(cancellationTimer);

    // Eliminar o ficheiro temporário do resultado.
    if (outputPath) {
      await fs.unlink(outputPath).catch(() => {});
    }

    // Libertar a reserva de armazenamento.
    await releaseUploadReservation(
      job.user_id,
      job._id,
    ).catch((error) => {
      console.error(
        "Error releasing filter reservation:",
        error.message,
      );
    });
  }
}

// Cancelar um pedido de filtro ativo (usado na rota de cancelamento e no logout)
async function cancelFilterJob(job) {
  const marked = await VideoFilter.findOneAndUpdate(
    { _id: job._id, state: { $in: ["queued", "processing"] } },
    { $set: { cancel_requested: true } },
    { new: true },
  );

  // Se ainda estiver em fila, cancelar já; se estiver a processar,
  // o serviço FFmpeg deteta o pedido de cancelamento e interrompe o trabalho.
  if (marked?.state === "queued") {
    const cancelled = await VideoFilter.findOneAndUpdate(
      { _id: marked._id, state: "queued", cancel_requested: true },
      {
        $set: {
          state: "cancelled",
          progress: 0,
          reserved_bytes: 0,
          error: "Video filter cancelled.",
          finished_at: new Date(),
        },
      },
      { new: true },
    );

    if (cancelled) {
      // Libertar o espaço reservado para o resultado.
      await releaseUploadReservation(cancelled.user_id, cancelled._id);

      // Devolver a operação diária reservada.
      if (cancelled.operation_reserved) {
        try {
          await axios.post(
            `${usersService}/${cancelled.user_id}/process/refund/1`,
            {},
            { httpsAgent, timeout: 10000 },
          );

          await VideoFilter.updateOne(
            { _id: cancelled._id },
            { $set: { operation_reserved: false } },
          );
        } catch (refundError) {
          console.error("Error refunding cancelled filter:", refundError.message);
        }
      }
    }
  }

  return VideoFilter.findById(job._id);
}

module.exports = { processFilterJob, cancelFilterJob };
