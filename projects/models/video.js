const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
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

module.exports = mongoose.model("Video", videoSchema);