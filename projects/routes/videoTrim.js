const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const https = require("node:https");

const Video = require("../models/video");
const VideoTrim = require("../models/videoTrim");
const {
  getUploadCapacity,
  reserveUpload,
  releaseUploadReservation,
} = require("../utils/videoReservations");
const { processTrim } = require("../utils/videoTrim");

const router = express.Router();
const usersService = "https://users:10001";
const usersHttpsAgent = new https.Agent({ rejectUnauthorized: false });

function sendError(res, error) {
  console.error("Erro no recorte de vídeo:", error.message);
  res.status(error.status || 503).json({
    error: error.status ? error.message : "Could not start the video trim.",
  });
}

function publicJob(job) {
  return {
    _id: job._id,
    source_video_id: job.source_video_id,
    result_video_id: job.result_video_id,
    reserved_bytes: job.reserved_bytes,
    start_seconds: job.start_seconds,
    end_seconds: job.end_seconds,
    output_format: job.output_format,
    state: job.state,
    progress: job.progress,
    cancel_requested: job.cancel_requested,
    error: job.error,
    createdAt: job.createdAt,
    finished_at: job.finished_at,
  };
}

function validateInterval(start, end, duration) {
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    const error = new Error("Start and end must be whole seconds.");
    error.status = 400;
    throw error;
  }
  if (start < 0 || end > duration || start >= end || end - start < 1) {
    const error = new Error("The trim interval is invalid.");
    error.status = 400;
    throw error;
  }
  if (start === 0 && end >= Math.floor(duration)) {
    const error = new Error("Select an interval shorter than the full video.");
    error.status = 400;
    throw error;
  }
}

router.post("/", async (req, res) => {
  let job;
  let operationReserved = false;
  try {
    const {
      video_id: videoId,
      start_seconds: start,
      end_seconds: end,
      output_format: requestedFormat,
    } = req.body || {};
    if (!mongoose.isObjectIdOrHexString(videoId)) {
      const error = new Error("The selected video is invalid.");
      error.status = 400;
      throw error;
    }
    if (requestedFormat !== undefined && requestedFormat !== "mp4" && requestedFormat !== "mov") {
      const error = new Error("The output format must be MP4 or MOV.");
      error.status = 400;
      throw error;
    }

    const video = await Video.findOne({
      _id: videoId,
      user_id: req.videoUser._id,
      project_id: req.videoProject._id,
    }).lean();
    if (!video) {
      const error = new Error("Video not found.");
      error.status = 404;
      throw error;
    }
    validateInterval(start, end, video.duration_seconds);
    const outputFormat = requestedFormat || video.format;

    const activeCount = await VideoTrim.countDocuments({
      user_id: req.videoUser._id,
      state: { $in: ["queued", "processing"] },
    });
    const maxActive = req.videoUser.type === "premium" ? 3 : 1;
    if (activeCount >= maxActive) {
      const error = new Error("The simultaneous video-processing limit was reached.");
      error.status = 429;
      throw error;
    }

    const estimate = Math.min(
      video.size_bytes,
      Math.max(1, Math.ceil(video.size_bytes * ((end - start) / video.duration_seconds) * 1.5)),
    );
    const capacity = await getUploadCapacity({
      userId: req.videoUser._id,
      projectId: req.videoProject._id,
      userType: req.videoUser.type,
      authorization: req.headers.authorization,
    });
    if (estimate > capacity.account_available_bytes || estimate > capacity.project_available_bytes) {
      const error = new Error("Insufficient storage space.");
      error.status = 409;
      throw error;
    }

    try {
      await axios.get(
        `${usersService}/${req.videoUser._id}/process/1`,
        { httpsAgent: usersHttpsAgent, timeout: 10000 },
      );
      operationReserved = true;
    } catch (error) {
      if (error.response?.status === 701) {
        const quotaError = new Error("No daily operations are available.");
        quotaError.status = 429;
        throw quotaError;
      }
      throw new Error("Could not confirm the daily operation quota.");
    }

    job = await VideoTrim.create({
      user_id: req.videoUser._id,
      user_type: req.videoUser.type,
      operation_reserved: operationReserved,
      project_id: req.videoProject._id,
      source_video_id: video._id,
      result_video_id: new mongoose.Types.ObjectId(),
      start_seconds: start,
      end_seconds: end,
      output_format: outputFormat,
      reserved_bytes: estimate,
    });
    await reserveUpload({
      userId: req.videoUser._id,
      projectId: req.videoProject._id,
      uploadId: job._id,
      bytes: estimate,
      userType: req.videoUser.type,
      authorization: req.headers.authorization,
    });

    res.status(202).json(publicJob(job));
    setImmediate(async () => {
      try {
        await processTrim(
          job._id,
          req.headers.authorization,
          req.videoUser.type,
        );
      } finally {
        await releaseUploadReservation(req.videoUser._id, job._id).catch((error) => {
          console.error("Erro ao libertar reserva do recorte:", error.message);
        });
      }
    });
  } catch (error) {
    if (operationReserved) {
      await axios.post(
        `${usersService}/${req.videoUser._id}/process/refund/1`,
        {},
        { httpsAgent: usersHttpsAgent, timeout: 10000 },
      ).catch((refundError) => {
        console.error("Erro ao devolver operação reservada:", refundError.message);
      });
    }
    if (job) {
      await VideoTrim.deleteOne({ _id: job._id }).catch(() => {});
      await releaseUploadReservation(req.videoUser._id, job._id).catch(() => {});
    }
    sendError(res, error);
  }
});

router.get("/:trimId", async (req, res) => {
  try {
    const job = await VideoTrim.findOne({
      _id: req.params.trimId,
      user_id: req.videoUser._id,
      project_id: req.videoProject._id,
    });
    if (!job) return res.status(404).json({ error: "Trim request not found." });
    res.set("Cache-Control", "no-store");
    res.json(publicJob(job));
  } catch (error) {
    sendError(res, error);
  }
});

router.delete("/:trimId", async (req, res) => {
  try {
    const job = await VideoTrim.findOneAndUpdate(
      {
        _id: req.params.trimId,
        user_id: req.videoUser._id,
        project_id: req.videoProject._id,
        state: { $in: ["queued", "processing"] },
      },
      { $set: { cancel_requested: true } },
      { new: true },
    );
    if (!job) return res.status(404).json({ error: "Trim request not found or already finished." });
    if (job.state === "queued") {
      await VideoTrim.updateOne(
        { _id: job._id },
        { $set: { state: "cancelled", reserved_bytes: 0, finished_at: new Date(), error: "Video trim cancelled." } },
      );
      await releaseUploadReservation(req.videoUser._id, job._id);
      if (job.operation_reserved) {
        await axios.post(
          `${usersService}/${req.videoUser._id}/process/refund/1`,
          {},
          { httpsAgent: usersHttpsAgent, timeout: 10000 },
        ).catch((error) => {
          console.error("Erro ao devolver operação cancelada:", error.message);
        });
        await VideoTrim.updateOne(
          { _id: job._id },
          { $set: { operation_reserved: false } },
        );
      }
    }
    res.status(202).json(publicJob(await VideoTrim.findById(job._id)));
  } catch (error) {
    sendError(res, error);
  }
});

module.exports = router;
