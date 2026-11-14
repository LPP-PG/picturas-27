const mongoose = require("mongoose");

var processSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  project_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  img_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  msg_id: { type: String, required: true },
  cur_pos: { type: Number, required: true },
  video_stages: { type: [mongoose.Schema.Types.Mixed], default: undefined },
  video_stage_input: String,
  video_previous_reply: String,
  video_failed: Boolean,
  og_img_uri: { type: String, required: true },
  new_img_uri: { type: String, required: true },
  runner_id: { type: String, required: false },  
  cache_key: { type: String, required: false },
  cancelToken: { type: Number, required: false },
  token: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model("process", processSchema);
