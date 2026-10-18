const { spawn } = require("node:child_process");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const axios = require("axios");
const FormData = require("form-data");

const Video = require("../models/video");
const VideoTrim = require("../models/videoTrim");
const Project = require("../models/project");
const { generateVideoThumbnail } = require("./videoThumbnail");
const {
  get_image_internal_url,
  post_image,
  delete_image,
} = require("./imageStorage");
const { getUploadCapacity } = require("./videoReservations");

const usersService = "https://users:10001";
const usersHttpsAgent = new (require("node:https").Agent)({
  rejectUnauthorized: false,
});

function checkCancelled(job) {
  if (job.cancel_requested) {
    const error = new Error("Video trim cancelled.");
    error.name = "AbortError";
    throw error;
  }
}

async function downloadSource(video, destination, job) {
  const response = await get_image_internal_url(
    String(video.user_id),
    String(video._id),
    "src",
    video.storage_key.split("/").pop(),
  );
  const output = fs.createWriteStream(destination);
  const input = await axios.get(response.data.url, {
    responseType: "stream",
    timeout: 30000,
  });

  await new Promise((resolve, reject) => {
    input.data.on("error", reject);
    output.on("error", reject);
    output.on("finish", resolve);
    input.data.pipe(output);
  });
  checkCancelled(job);
}

function runFfmpeg(
  source,
  output,
  start,
  duration,
  format,
  sourceBitrate,
  onProgress,
  shouldCancel,
) {
  const videoEncoding = Number.isFinite(sourceBitrate) && sourceBitrate > 0
    ? ["-c:v", "libx264", "-b:v", `${Math.round(sourceBitrate / 1000)}k`, "-maxrate", `${Math.round(sourceBitrate / 1000)}k`]
    : ["-c:v", "libx264", "-crf", "12"];
  return new Promise((resolve, reject) => {
    const args = [
      "-hide_banner", "-loglevel", "error", "-nostdin",
      "-ss", String(start), "-i", source, "-t", String(duration),
      "-map", "0:v:0", "-map", "0:a?",
      ...videoEncoding, "-preset", "medium",
      "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart",
      "-progress", "pipe:1", "-nostats",
      "-f", format === "mov" ? "mov" : "mp4", "-y", output,
    ];
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    let progressOutput = "";
    let lastUpdate = 0;
    const cancelTimer = setInterval(() => {
      if (shouldCancel()) child.kill("SIGTERM");
    }, 500);
    child.stdout.on("data", (chunk) => {
      progressOutput += chunk.toString();
      const lines = progressOutput.split(/\r?\n/);
      progressOutput = lines.pop() || "";
      const outTime = lines
        .filter((line) => line.startsWith("out_time_ms="))
        .pop();
      if (outTime && Date.now() - lastUpdate >= 1000) {
        const milliseconds = Number(outTime.split("=")[1]) / 1000;
        onProgress(Math.min(100, Math.max(0, (milliseconds / duration) * 100)));
        lastUpdate = Date.now();
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      clearInterval(cancelTimer);
      if (code === 0) return resolve();
      if (shouldCancel()) {
        const error = new Error("Recorte cancelado.");
        error.name = "AbortError";
        return reject(error);
      }
      reject(new Error(stderr || "Video processing failed."));
    });
  });
}

async function processTrim(jobId, authorization, userType) {
  const job = await VideoTrim.findById(jobId);
  if (!job) return;

  let sourcePath;
  let outputPath;
  let uploadedFiles = [];
  let cancelRequested = false;
  let cancellationPoll;

  try {
    await VideoTrim.updateOne(
      { _id: job._id, state: "queued", cancel_requested: false },
      { $set: { state: "processing", progress: 5 } },
    );
    const current = await VideoTrim.findById(job._id);
    if (!current || current.state !== "processing") return;

    const source = await Video.findOne({
      _id: current.source_video_id,
      user_id: current.user_id,
      project_id: current.project_id,
    });
    if (!source) throw new Error("The original video is no longer available.");

    sourcePath = path.join(require("node:os").tmpdir(), `${job._id}.trim-source`);
    outputPath = path.join(
      require("node:os").tmpdir(),
      `${job.result_video_id}.${current.output_format}`,
    );
    await downloadSource(source, sourcePath, current);
    const sourceMetadata = await require("./videoMetadata").readVideoMetadata(sourcePath);
    await VideoTrim.updateOne({ _id: job._id }, { $set: { progress: 25 } });
    cancellationPoll = setInterval(async () => {
      try {
        const latest = await VideoTrim.findById(job._id)
          .select("cancel_requested")
          .lean();
        cancelRequested = Boolean(latest?.cancel_requested);
      } catch (error) {
        console.error("Erro ao consultar cancelamento do recorte:", error.message);
      }
    }, 500);

    await runFfmpeg(
      sourcePath,
      outputPath,
      current.start_seconds,
      current.end_seconds - current.start_seconds,
      current.output_format,
      sourceMetadata.video_bitrate,
      (percentage) => {
        void VideoTrim.updateOne(
          { _id: job._id, state: "processing" },
          { $set: { progress: Math.round(25 + percentage * 0.4) } },
        );
      },
      () => cancelRequested,
    );
    checkCancelled(await VideoTrim.findById(job._id));
    const metadata = await require("./videoMetadata").readVideoMetadata(outputPath);
    const thumbnail = await generateVideoThumbnail(outputPath, metadata.duration_seconds);
    const outputSize = (await fsp.stat(outputPath)).size;
    if (outputSize > current.reserved_bytes) {
      const capacity = await getUploadCapacity({
        userId: current.user_id,
        projectId: current.project_id,
        userType: userType || current.user_type,
        authorization,
      });
      if (outputSize - current.reserved_bytes > capacity.account_available_bytes ||
          outputSize - current.reserved_bytes > capacity.project_available_bytes) {
        throw new Error("Insufficient storage space.");
      }
    }
    await VideoTrim.updateOne({ _id: job._id }, { $set: { progress: 65 } });

    const resultId = String(current.result_video_id);
    const videoFileName = `${resultId}.${current.output_format}`;
    const thumbnailFileName = `${resultId}.jpg`;
    const videoForm = new FormData();
    videoForm.append("file", fs.createReadStream(outputPath), {
      filename: videoFileName,
      contentType: current.output_format === "mov" ? "video/quicktime" : "video/mp4",
    });
    await post_image(String(current.user_id), resultId, "src", videoForm, {
      headers: { "X-Storage-File-Name": videoFileName, Authorization: authorization },
    });
    uploadedFiles.push(["src", videoFileName]);

    const thumbnailForm = new FormData();
    thumbnailForm.append("file", thumbnail.buffer, {
      filename: thumbnailFileName,
      contentType: "image/jpeg",
    });
    await post_image(String(current.user_id), resultId, "preview", thumbnailForm, {
      headers: {
        "X-Storage-File-Name": thumbnailFileName,
        Authorization: authorization,
      },
    });
    uploadedFiles.push(["preview", thumbnailFileName]);

    checkCancelled(await VideoTrim.findById(job._id));
    const nameBase = path.basename(source.name, path.extname(source.name));
    const existingNames = await Video.find({
      project_id: current.project_id,
      user_id: current.user_id,
      name: new RegExp(`^${nameBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}_recorte`),
    }).select("name").lean();
    const names = new Set(existingNames.map((item) => item.name));
    let name = `${nameBase}_recorte.${current.output_format}`;
    let suffix = 2;
    while (names.has(name)) {
      name = `${nameBase}_recorte_${suffix}.${current.output_format}`;
      suffix += 1;
    }

    await Video.create({
      _id: current.result_video_id,
      user_id: current.user_id,
      project_id: current.project_id,
      name,
      storage_key: `${resultId}/src/${videoFileName}`,
      thumbnail_key: `${resultId}/preview/${thumbnailFileName}`,
      thumbnail_time_seconds: thumbnail.timeSeconds,
      thumbnail_size_bytes: thumbnail.buffer.length,
      format: current.output_format,
      duration_seconds: metadata.duration_seconds,
      size_bytes: outputSize,
      original_video_id: current.source_video_id,
      has_audio: source.has_audio ?? null,
    });
    await Project.updateOne(
      { _id: current.project_id, user_id: current.user_id },
      { $addToSet: { video_ids: current.result_video_id }, $inc: { version: 1 } },
    );
    await VideoTrim.updateOne(
      { _id: job._id },
      {
        $set: {
          state: "completed",
          progress: 100,
          reserved_bytes: 0,
          result_storage_key: `${resultId}/src/${videoFileName}`,
          thumbnail_storage_key: `${resultId}/preview/${thumbnailFileName}`,
          finished_at: new Date(),
        },
      },
    );
  } catch (error) {
    const cancelled = error.name === "AbortError";
    if (job.operation_reserved) {
      try {
        await axios.post(
          `${usersService}/${job.user_id}/process/refund/1`,
          {},
          { httpsAgent: usersHttpsAgent, timeout: 10000 },
        );
      } catch (refundError) {
        console.error("Erro ao devolver operação do recorte:", refundError.message);
      }
    }
    await VideoTrim.updateOne(
      { _id: job._id },
      {
        $set: {
          state: cancelled ? "cancelled" : "failed",
          progress: cancelled ? 0 : job.progress,
          reserved_bytes: 0,
          operation_reserved: false,
          error: error.message,
          finished_at: new Date(),
        },
      },
    );
    await Video.deleteOne({ _id: job.result_video_id, user_id: job.user_id });
    for (const [stage, fileName] of uploadedFiles) {
      await delete_image(String(job.user_id), String(job.result_video_id), stage, fileName)
        .catch((cleanupError) => console.error("Erro ao limpar resultado de recorte:", cleanupError.message));
    }
  } finally {
    if (cancellationPoll) clearInterval(cancellationPoll);
    if (sourcePath) await fsp.unlink(sourcePath).catch(() => {});
    if (outputPath) await fsp.unlink(outputPath).catch(() => {});
  }
}

module.exports = { processTrim };
