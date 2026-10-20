const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "project",
      default: null,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    content_sha256: {
      type: String,
      match: /^[a-f0-9]{64}$/,
    },

    storage_key: {
      type: String,
      required: true,
      unique: true,
    },

    thumbnail_key: {
      type: String,
      default: null,
    },

    thumbnail_time_seconds: {
      type: Number,
      min: 0,
      default: null,
    },

    thumbnail_size_bytes: {
      type: Number,
      min: 0,
      default: 0,
    },

    format: {
      type: String,
      enum: ["mp4", "mov"],
      required: true,
    },

    duration_seconds: {
      type: Number,
      required: true,
      min: 0,
    },

    size_bytes: {
      type: Number,
      required: true,
      min: 0,
    },

    original_video_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      default: null,
    },

    has_audio: {
      type: Boolean,
      default: null,
    },

    width: {
      type: Number,
      default: null,
    },

    height: {
      type: Number,
      default: null,
    },

    frame_rate: {
      type: Number,
      default: null,
    },

    subtitles_key: {
      type: String,
      default: null,
    },

    subtitles_language: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

videoSchema.index({ user_id: 1, project_id: 1 });

videoSchema.index(
  {
    user_id: 1,
    project_id: 1,
    content_sha256: 1,
  },
  {
    unique: true,
    name: "unique_video_content_per_project",
    partialFilterExpression: {
      project_id: { $type: "objectId" },
      content_sha256: { $type: "string" },
    },
  },
);

module.exports = mongoose.model("Video", videoSchema);