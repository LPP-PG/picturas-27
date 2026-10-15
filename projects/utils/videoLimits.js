const VIDEO_LIMITS = {
  free: {
    maxDurationSeconds: 60,
    maxSizeBytes: 100_000_000,
    maxProjectBytes: 500_000_000,
    maxAccountBytes: 2_000_000_000,
    maxConcurrentUploads: 1,
  },
  premium: {
    maxDurationSeconds: 600,
    maxSizeBytes: 1_000_000_000,
    maxProjectBytes: 10_000_000_000,
    maxAccountBytes: 50_000_000_000,
    maxConcurrentUploads: 3,
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

  return { ...limits };
}

function validateVideoLimits(userType, durationSeconds, sizeBytes) {
  const limits = getVideoLimits(userType);

  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes <= 0
  ) {
    const error = new Error(
      "O vídeo deve ter duração e tamanho positivos.",
    );
    error.status = 400;
    throw error;
  }

  if (sizeBytes > limits.maxSizeBytes) {
    const error = new Error(
      userType === "free"
        ? "O vídeo excede o limite de 100 MB do perfil Registado."
        : "O vídeo excede o limite de 1 GB do perfil Premium.",
    );
    error.status = 413;
    throw error;
  }

  if (durationSeconds > limits.maxDurationSeconds) {
    const error = new Error(
      userType === "free"
        ? "O vídeo excede o limite de 60 segundos do perfil Registado."
        : "O vídeo excede o limite de 600 segundos do perfil Premium.",
    );
    error.status = 400;
    throw error;
  }

  return limits;
}

module.exports = {
  getVideoLimits,
  validateVideoLimits,
};