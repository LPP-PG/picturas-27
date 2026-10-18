const VideoTrim = require("../models/videoTrim");
const VideoFilter = require("../models/videoFilter");
const VideoSubtitle = require("../models/videoSubtitle");

const ACTIVE_STATES = ["queued", "processing"];

// Contar os pedidos ativos do utilizador (Recorte + Filtros + Legendas)
async function countActiveVideoJobs(userId) {
  const query = { user_id: userId, state: { $in: ACTIVE_STATES } };
  const counts = await Promise.all([
    VideoTrim.countDocuments(query),
    VideoFilter.countDocuments(query),
    VideoSubtitle.countDocuments(query),
  ]);
  return counts.reduce((total, count) => total + count, 0);
}

// Limite de pedidos simultâneos por tipo de conta
function maxActiveVideoJobs(userType) {
  return userType === "premium" ? 3 : 1;
}

// Verificar se existe pedido ativo para um vídeo ou para um projeto
async function hasActiveVideoJobs({ userId, videoId, projectId }) {
  const base = { state: { $in: ACTIVE_STATES } };
  if (userId) base.user_id = userId;
  if (projectId) base.project_id = projectId;

  const sourceFilter = videoId ? { ...base, source_video_id: videoId } : base;
  const subtitleFilter = videoId ? { ...base, video_id: videoId } : base;

  const [trim, filter, subtitle] = await Promise.all([
    VideoTrim.exists(sourceFilter),
    VideoFilter.exists(sourceFilter),
    VideoSubtitle.exists(subtitleFilter),
  ]);
  return Boolean(trim || filter || subtitle);
}

module.exports = {
  countActiveVideoJobs,
  maxActiveVideoJobs,
  hasActiveVideoJobs,
};
