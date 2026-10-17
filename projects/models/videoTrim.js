const mongoose = require("mongoose");

const videoTrimSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    user_type: { type: String, enum: ["free", "premium"], required: true },
    project_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    source_video_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    result_video_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    start_seconds: { type: Number, required: true, min: 0 },
    end_seconds: { type: Number, required: true, min: 0 },
    output_format: { type: String, enum: ["mp4", "mov"], required: true },
    reserved_bytes: { type: Number, required: true, min: 0 },
    operation_reserved: { type: Boolean, default: false },
    state: {
      type: String,
      enum: ["queued", "processing", "completed", "failed", "cancelled"],
      default: "queued",
      index: true,
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    cancel_requested: { type: Boolean, default: false },
    error: { type: String, default: "" },
    result_storage_key: { type: String, default: null },
    thumbnail_storage_key: { type: String, default: null },
    finished_at: { type: Date, default: null },
  },
  { timestamps: true },
);

videoTrimSchema.index({ user_id: 1, state: 1 });

module.exports = mongoose.model("VideoTrim", videoTrimSchema);
