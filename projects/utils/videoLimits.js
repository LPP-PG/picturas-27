const VIDEO_LIMITS = {
  free: {
    maxDurationSeconds: 60,
    maxSizeBytes: 100 * 1000 * 1000,
  },
  premium: {
    maxDurationSeconds: 10 * 60,
    maxSizeBytes: 1000 * 1000 * 1000,
  },
};

function getVideoLimits(userType) {
  const limits = VIDEO_LIMITS[userType];

  if (!limits) {
    const error = new Error(
      "É necessário ter uma conta Registada ou Premium para carregar vídeos.",
    );
    error.status = 403;
    throw error;
  }

  return limits;
}

function validateVideoLimits(userType, durationSeconds, sizeBytes) {
  const limits = getVideoLimits(userType);

  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes <= 0
  ) {
    const error = new Error("Os dados do vídeo são inválidos.");
    error.status = 400;
    throw error;
  }

  if (
    durationSeconds > limits.maxDurationSeconds ||
    sizeBytes > limits.maxSizeBytes
  ) {
    const message =
      userType === "free"
        ? "O vídeo excede os limites do perfil Registado: 60 segundos e 100 MB. O Premium permite até 10 minutos e 1 GB."
        : "O vídeo excede os limites do perfil Premium: 10 minutos e 1 GB.";

    const error = new Error(message);
    error.status = 400;
    throw error;
  }

  return limits;
}

module.exports = {
  getVideoLimits,
  validateVideoLimits,
};