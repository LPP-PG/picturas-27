const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const https = require("node:https");
const { spawn } = require("node:child_process");
const { pipeline } = require("node:stream/promises");
const axios = require("axios");
const FormData = require("form-data");

const Video = require("../models/video");
const VideoSubtitle = require("../models/videoSubtitle");
const {
  get_image_internal_url,
  post_image,
  delete_image,
} = require("./imageStorage");
const { getUploadCapacity } = require("./videoReservations");
const { readVideoMetadata } = require("./videoMetadata");
const { normalizeSegments, toWebVtt } = require("./videoSubtitleFormat");
const { transcribe } = require("./speechClient");

const usersService = "https://users:10001";
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const errorMessages = {
  no_audio: "No audio track was found in this video.",
  no_speech: "No speech could be identified in this video.",
  language_undetermined:
    "The spoken language could not be detected. Please choose the language manually and try again.",
  storage: "Insufficient storage space.",
  failed: "Could not generate subtitles. Please try again.",
};

function codedError(code) {
  const error = new Error(errorMessages[code]);
  error.code = code;
  return error;
}

function cancellationError() {
  const error = new Error("Subtitle generation cancelled.");
  error.name = "AbortError";
  return error;
}

// Devolver a operação diária reservada
async function refundOperation(userId) {
  try {
    await axios.post(
      `${usersService}/${userId}/process/refund/1`,
      {},
      { httpsAgent, timeout: 10000 },
    );
    return true;
  } catch (error) {
    console.error("Error refunding subtitle operation:", error.message);
    return false;
  }
}

async function checkCancellation(jobId) {
  const current = await VideoSubtitle.findById(jobId)
    .select("state cancel_requested")
    .lean();

  if (!current || current.cancel_requested || current.state !== "processing") {
    throw cancellationError();
  }
}

// Extrair o áudio em WAV mono a 16 kHz
function extractAudio(inputPath, outputPath, isCancelled) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel", "error",
        "-nostdin",
        "-i", inputPath,
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-f", "wav",
        "-y", outputPath,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );

    let errorMessage = "";
    let killed = false;

    const cancelTimer = setInterval(() => {
      if (!killed && isCancelled()) {
        killed = true;
        child.kill("SIGKILL");
      }
    }, 200);

    child.stderr.on("data", (chunk) => {
      errorMessage = (errorMessage + chunk.toString()).slice(-4000);
    });

    child.once("error", (error) => {
      clearInterval(cancelTimer);
      reject(error);
    });

    child.once("close", (code) => {
      clearInterval(cancelTimer);

      if (killed) reject(cancellationError());
      else if (code === 0) resolve();
      else reject(new Error(errorMessage || "Audio extraction failed."));
    });
  });
}

async function processSubtitleJob(jobId, authorization) {
  const job = await VideoSubtitle.findOneAndUpdate(
    { _id: jobId, state: "queued", cancel_requested: false },
    { $set: { state: "processing", progress: 5 } },
    { new: true },
  );

  if (!job) return;

  const userId = String(job.user_id);
  const videoId = String(job.video_id);
  const fileName = `${job._id}.vtt`;
  const newKey = `${videoId}/subtitles/${fileName}`;
  const controller = new AbortController();

  let cancellationRequested = false;
  let inputPath;
  let audioPath;
  let uploaded = false;
  let linked = false;
  let lastProgress = 5;

  function setProgress(value) {
    const progress = Math.min(99, Math.round(value));
    if (progress <= lastProgress) return;
    lastProgress = progress;

    void VideoSubtitle.updateOne(
      { _id: jobId, state: "processing" },
      { $set: { progress } },
    ).catch(console.error);
  }

  // Consultar periodicamente se foi pedido o cancelamento.
  const cancellationTimer = setInterval(() => {
    void VideoSubtitle.findById(jobId)
      .select("cancel_requested state")
      .lean()
      .then((current) => {
        if (
          !cancellationRequested &&
          (!current || current.cancel_requested || current.state === "cancelled")
        ) {
          cancellationRequested = true;
          controller.abort();
        }
      })
      .catch((error) => {
        console.error("Error checking subtitle cancellation:", error);
      });
  }, 500);

  try {
    // Obter o vídeo original.
    const video = await Video.findOne({
      _id: job.video_id,
      user_id: job.user_id,
      project_id: job.project_id,
    }).lean();

    if (!video) throw codedError("failed");

    inputPath = path.join(os.tmpdir(), `${jobId}-subtitles-source.${video.format}`);
    audioPath = path.join(os.tmpdir(), `${jobId}-subtitles.wav`);

    // Descarregar uma cópia temporária do vídeo.
    const response = await get_image_internal_url(
      userId,
      videoId,
      "src",
      video.storage_key.split("/").pop(),
    );

    if (!response.data?.url) throw codedError("failed");

    const download = await axios.get(response.data.url, {
      responseType: "stream",
      timeout: 30000,
      signal: controller.signal,
    });

    await pipeline(download.data, fs.createWriteStream(inputPath), {
      signal: controller.signal,
    });

    await checkCancellation(jobId);
    setProgress(10);

    const metadata = await readVideoMetadata(inputPath, {
      signal: controller.signal,
    });

    if (metadata.has_audio === false) throw codedError("no_audio");

    // Extrair o áudio.
    await extractAudio(inputPath, audioPath, () => cancellationRequested);
    await checkCancellation(jobId);
    setProgress(15);

    // Reconhecer a fala.
    const duration = metadata.duration_seconds;
    const rawSegments = [];
    let detectedLanguage = null;

    await transcribe(audioPath, job.language, {
      signal: controller.signal,
      onInfo: (info) => {
        if (!info.language) return;

        detectedLanguage = info.language;

        void VideoSubtitle.updateOne(
          { _id: jobId },
          { $set: { detected_language: info.language } },
        ).catch(console.error);
      },
      onSegment: (segment) => {
        rawSegments.push({
          start: Number(segment.start),
          end: Number(segment.end),
          text: segment.text,
        });
        if (Number.isFinite(Number(segment.end))) {
          setProgress(Math.min(90, 15 + (75 * Number(segment.end)) / duration));
        }
      },
    });

    await checkCancellation(jobId);

    const segments = normalizeSegments(rawSegments, duration);
    if (segments.length === 0) throw codedError("no_speech");

    // Verificar se as legendas cabem no armazenamento.
    const vtt = toWebVtt(segments);
    const vttBytes = Buffer.byteLength(vtt);

    const capacity = await getUploadCapacity({
      userId: job.user_id,
      projectId: job.project_id,
      userType: job.user_type,
      authorization,
    });

    if (
      vttBytes > capacity.account_available_bytes ||
      vttBytes > capacity.project_available_bytes
    ) {
      throw codedError("storage");
    }

    // Guardar o ficheiro de legendas.
    const form = new FormData();
    form.append("file", Buffer.from(vtt), {
      filename: fileName,
      contentType: "text/vtt",
    });

    // Marcar antes do envio: uma falha ambígua também apaga o ficheiro
    uploaded = true;

    await post_image(userId, videoId, "subtitles", form, {
      headers: {
        "X-Storage-File-Name": fileName,
        Authorization: authorization,
      },
    });

    setProgress(95);
    await checkCancellation(jobId);

    // Ligar as novas legendas ao vídeo.
    const previous = await Video.findOneAndUpdate(
      { _id: job.video_id, user_id: job.user_id, project_id: job.project_id },
      { $set: { subtitles_key: newKey, subtitles_language: detectedLanguage || job.language } },
      { new: false },
    ).lean();

    if (!previous) throw codedError("failed");

    linked = true;

    // Apagar as legendas anteriores.
    if (previous.subtitles_key) {
      await delete_image(
        userId,
        videoId,
        "subtitles",
        previous.subtitles_key.split("/").pop(),
      ).catch((error) => {
        console.error("Error deleting previous subtitles:", error.message);
      });
    }

    await VideoSubtitle.updateOne(
      { _id: jobId, state: "processing" },
      {
        $set: {
          state: "completed",
          progress: 100,
          result_key: newKey,
          finished_at: new Date(),
        },
      },
    );
  } catch (error) {
    // As legendas já estão ligadas ao vídeo: não falhar nem devolver a operação
    if (linked) {
      console.error("Error finishing subtitle job:", error.message);
      return;
    }

    const cancelled = error.name === "AbortError" || cancellationRequested;

    // Apagar o ficheiro novo se não chegou a ser ligado ao vídeo.
    if (uploaded) {
      await delete_image(userId, videoId, "subtitles", fileName).catch(
        (deleteError) => {
          if (deleteError.response?.status !== 404) {
            console.error("Error deleting new subtitles:", deleteError.message);
          }
        },
      );
    }

    const code = cancelled
      ? ""
      : Object.hasOwn(errorMessages, error.code)
        ? error.code
        : "failed";

    if (!cancelled) console.error("Subtitle job failed:", error.message);

    // Primeiro o estado final; só depois a devolução da operação
    const written = await VideoSubtitle.updateOne(
      { _id: jobId, state: "processing" },
      {
        $set: {
          state: cancelled ? "cancelled" : "failed",
          error: cancelled ? "Subtitle generation cancelled." : errorMessages[code],
          error_code: code,
          finished_at: new Date(),
        },
      },
    );

    if (written.matchedCount === 1 && job.operation_reserved) {
      if (await refundOperation(userId)) {
        await VideoSubtitle.updateOne(
          { _id: jobId },
          { $set: { operation_reserved: false } },
        );
      }
    }
  } finally {
    clearInterval(cancellationTimer);

    // Eliminar os ficheiros temporários.
    for (const file of [inputPath, audioPath]) {
      if (file) await fsp.unlink(file).catch(() => {});
    }
  }
}

// Cancelar um pedido de legendas (em fila ou em processamento)
async function cancelSubtitleJob(job) {
  const marked = await VideoSubtitle.findOneAndUpdate(
    { _id: job._id, state: { $in: ["queued", "processing"] } },
    { $set: { cancel_requested: true } },
    { new: true },
  );

  // Se ainda estiver em fila, cancelar imediatamente.
  if (marked && marked.state === "queued") {
    const cancelled = await VideoSubtitle.findOneAndUpdate(
      { _id: marked._id, state: "queued", cancel_requested: true },
      {
        $set: {
          state: "cancelled",
          progress: 0,
          error: "Subtitle generation cancelled.",
          finished_at: new Date(),
        },
      },
      { new: true },
    );

    if (cancelled?.operation_reserved) {
      if (await refundOperation(cancelled.user_id)) {
        await VideoSubtitle.updateOne(
          { _id: cancelled._id },
          { $set: { operation_reserved: false } },
        );
      }
    }
  }

  // Se estiver a processar, o trabalho deteta o pedido e interrompe-se.
  return VideoSubtitle.findById(job._id);
}

// Pedidos interrompidos por um reinício passam a falhados
async function recoverInterruptedSubtitleJobs() {
  const jobs = await VideoSubtitle.find({
    state: { $in: ["queued", "processing"] },
  });

  for (const job of jobs) {
    try {
      // Primeiro o estado final; só depois a devolução da operação
      const written = await VideoSubtitle.updateOne(
        { _id: job._id, state: { $in: ["queued", "processing"] } },
        {
          $set: {
            state: "failed",
            error: errorMessages.failed,
            error_code: "failed",
            finished_at: new Date(),
          },
        },
      );

      if (written.matchedCount === 1 && job.operation_reserved) {
        if (await refundOperation(job.user_id)) {
          await VideoSubtitle.updateOne(
            { _id: job._id },
            { $set: { operation_reserved: false } },
          );
        }
      }
    } catch (error) {
      console.error("Error recovering subtitle job:", error.message);
    }
  }
}

module.exports = {
  processSubtitleJob,
  cancelSubtitleJob,
  recoverInterruptedSubtitleJobs,
};
