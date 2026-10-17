const mongoose = require("mongoose");

const toolSchema = new mongoose.Schema({
  position: { type: Number, required: true },
  procedure: { type: String, required: true },
  params: { type: mongoose.Schema.Types.Mixed, required: true },
});

const imgSchema = new mongoose.Schema({
  og_uri: { type: String, required: true },
  new_uri: { type: String, required: true },
  og_img_key: { type: String, required: true },
  og_sha256: { type: String, required: true },
});

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  media_type: {
    type: String,
    enum: ["image", "video"],
    default: "image",
  },

  keep_empty_video_project: {
    type: Boolean,
    default: false,
  },

  video_ids: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    default: [],
  },

  imgs: { type: [imgSchema], default: [] },
  tools: { type: [toolSchema], default: [] },

  version: { type: Number, default: 0 },
  activeToken: { type: Number, default: 0 },
  resultsToken: { type: Number, default: 0 },
  cancelToken: { type: Number, default: 0 },
  committedToken: { type: Number, default: 0 },
  prevCommittedToken: { type: Number, default: 0 },

  committedTools: { type: Array, default: [] },
  prevCommittedTools: { type: Array, default: [] },

  dirty: { type: Boolean, default: false },
  dirtyUpdatedAt: { type: Date, default: null },
  dirtyBy: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },

  chargedAdvancedTools: { type: Number, default: 0 },
  pendingAdvancedOps: { type: Number, default: 0 },

  sharedLinks: [
    {
      id: { type: String, required: true },
      permission: {
        type: String,
        enum: ["read", "edit"],
        default: "read",
      },
      createdAt: { type: Date, default: Date.now },
      revoked: { type: Boolean, default: false },
    },
  ],
});

module.exports = mongoose.model("project", projectSchema);