const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    upload_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    bytes: {
      type: Number,
      required: true,
      min: 0,
    },

    active: {
      type: Boolean,
      default: false,
    },

    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const videoAccountSchema = new mongoose.Schema(
  {
    // Uma conta corresponde a um único documento.
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    reservations: {
      type: [reservationSchema],
      default: [],
    },

    // Usado para detetar alterações concorrentes ao admitir pedidos.
    revision: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("VideoAccount", videoAccountSchema);