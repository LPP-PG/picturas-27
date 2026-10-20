const mongoose = require("mongoose");

const videoSubtitleSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    user_type: { type: String, enum: ["free", "premium"], required: true },
    project_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    video_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    // Código do idioma escolhido ou "auto"
    language: { type: String, required: true },
    detected_language: { type: String, default: null },
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
    // "" ou a chave da mensagem de erro (no_audio, quota, service...)
    error_code: { type: String, default: "" },
    result_key: { type: String, default: null },
    finished_at: { type: Date, default: null },
  },
  { timestamps: true },
);

videoSubtitleSchema.index({ user_id: 1, state: 1 });
videoSubtitleSchema.index({ video_id: 1, state: 1 });

module.exports = mongoose.model("VideoSubtitle", videoSubtitleSchema);
