const mongoose = require("mongoose");

const storedFileSchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      required: true,
    },
    file_name: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const videoUploadSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "project",
      required: true,
      index: true,
    },

    video_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    expected_size_bytes: {
      type: Number,
      required: true,
      min: 1,
    },

    reserved_bytes: {
      type: Number,
      required: true,
      min: 0,
    },

    state: {
      type: String,
      enum: [
        "waiting",
        "uploading",
        "validating",
        "thumbnail",
        "completed",
        "failed",
        "cancelled",
      ],
      default: "waiting",
      required: true,
    },

    slot_acquired: {
      type: Boolean,
      default: false,
    },

    cancel_requested: {
      type: Boolean,
      default: false,
    },

    last_activity_at: {
      type: Date,
      default: Date.now,
      required: true,
    },

    processing_started_at: {
      type: Date,
      default: null,
    },

    temporary_path: {
      type: String,
      default: null,
    },

    stored_files: {
      type: [storedFileSchema],
      default: [],
    },

    cleanup_pending: {
      type: Boolean,
      default: false,
    },

    error: {
      type: String,
      default: "",
    },

    finished_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

videoUploadSchema.index({
  user_id: 1,
  state: 1,
});

videoUploadSchema.index({
  state: 1,
  last_activity_at: 1,
});

// Sem índice TTL: o registo não pode desaparecer antes de
// limpar os ficheiros e libertar a reserva e a vaga.

module.exports = mongoose.model("VideoUpload", videoUploadSchema);