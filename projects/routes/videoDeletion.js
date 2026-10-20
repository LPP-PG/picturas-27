const express = require("express");
const mongoose = require("mongoose");

const Project = require("../models/project");
const Video = require("../models/video");
const VideoUpload = require("../models/videoUpload");
const { delete_image } = require("../utils/imageStorage");
const { hasActiveVideoJobs } = require("../utils/videoProcessingLimit");

const router = express.Router({ mergeParams: true });

const schema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    storage_key: String,
    thumbnail_key: String,
    subtitles_key: String,
    last_error: { type: String, default: "" },
  },
  { timestamps: true },
);

const Deletion =
  mongoose.models.VideoDeletion ||
  mongoose.model("VideoDeletion", schema);

async function deleteFile(job, stage, key) {
  if (!key) return;

  try {
    await delete_image(
      String(job.user_id),
      String(job._id),
      stage,
      key.split("/").pop(),
      { timeout: 30000 },
    );
  } catch (error) {
    if (error.response?.status !== 404) throw error;
  }
}

let working = false;

async function processDeletions() {
  if (working || mongoose.connection.readyState !== 1) return;
  working = true;

  try {
    const jobs = await Deletion.find().limit(20);

    for (const job of jobs) {
      try {
        // A tarefa só pode limpar um vídeo já retirado do projeto.
        const attached = await Project.exists({
          _id: job.project_id,
          video_ids: job._id,
        });

        if (attached) continue;

        await deleteFile(job, "src", job.storage_key);
        await deleteFile(job, "preview", job.thumbnail_key);
        await deleteFile(job, "subtitles", job.subtitles_key);

        await Video.deleteOne({
          _id: job._id,
          user_id: job.user_id,
          project_id: job.project_id,
        });

        await Deletion.deleteOne({ _id: job._id });
      } catch (error) {
        await Deletion.updateOne(
          { _id: job._id },
          { $set: { last_error: error.message } },
        ).catch(() => {});

        console.error("Video cleanup pending:", error.message);
      }
    }
  } catch (error) {
    console.error("Video cleanup failed:", error.message);
  } finally {
    working = false;
  }
}

router.delete("/items/:video", async (req, res) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.video)) {
      return res.status(400).json({
        error: "Invalid video ID.",
      });
    }

    const userId = req.videoUser._id;
    const projectId = req.params.project;
    const videoId = req.params.video;

    const project = await Project.findOne({
      _id: projectId,
      user_id: userId,
      media_type: "video",
      video_ids: videoId,
    });

    const video = await Video.findOne({
      _id: videoId,
      user_id: userId,
      project_id: projectId,
    });

    if (!project || !video) {
      return res.status(404).json({
        error: "Video not found in this project.",
      });
    }

    const activeUpload = await VideoUpload.exists({
      user_id: userId,
      project_id: projectId,
      video_id: videoId,
      state: {
        $in: ["waiting", "uploading", "validating", "thumbnail"],
      },
    });

    if (activeUpload) {
      return res.status(409).json({
        error: "The upload is still finishing. Please try again shortly.",
      });
    }

    // Recusar se houver um pedido de processamento ativo para este vídeo
    const busy = await hasActiveVideoJobs({ userId, videoId });

    if (busy) {
      return res.status(409).json({
        error:
          "This video has a processing request in progress. Cancel it before deleting.",
        error_code: "busy_delete",
      });
    }

    // Guardar os dados de limpeza antes de alterar o projeto.
    await Deletion.updateOne(
      { _id: videoId },
      {
        $setOnInsert: {
          user_id: userId,
          project_id: projectId,
          storage_key: video.storage_key,
          thumbnail_key: video.thumbnail_key,
          subtitles_key: video.subtitles_key,
        },
      },
      { upsert: true },
    );

    const updated = await Project.findOneAndUpdate(
      {
        _id: projectId,
        user_id: userId,
        media_type: "video",
        video_ids: videoId,
        $expr: {
          $gt: [{ $size: "$video_ids" }, 1],
        },
      },

      {
        $pull: { video_ids: videoId },
        $set: { keep_empty_video_project: true },
        $inc: { version: 1 },
      },
      { new: true },
    );

    if (!updated) {
      return res.status(409).json({
        error: "The project changed. Refresh and try again.",
      });
    }

    void processDeletions();

    res.set("Cache-Control", "no-store");
    return res.json({
      message: "Video removed. Storage cleanup will run automatically.",
      video_id: videoId,
      project_version: updated.version,
    });
  } catch (error) {
    console.error("Video deletion failed:", error.message);

    return res.status(500).json({
      error: "Could not delete the video. Please try again.",
    });
  }
});

const timer = setInterval(() => void processDeletions(), 15000);
timer.unref();

module.exports = router;