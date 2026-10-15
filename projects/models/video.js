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
  },
  { timestamps: true },
);

videoSchema.index({ user_id: 1, project_id: 1 });

module.exports = mongoose.model("Video", videoSchema);