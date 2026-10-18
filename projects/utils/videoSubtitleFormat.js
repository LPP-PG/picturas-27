const SUPPORTED_LANGUAGES = ["pt", "en", "es", "fr"];

// Idioma válido: um dos suportados ou "auto" (deteção automática)
function isValidLanguage(value) {
  return value === "auto" || SUPPORTED_LANGUAGES.includes(value);
}

// Limpar e ajustar segmentos ao vídeo: descartar inválidos e cortar o fim à duração
function normalizeSegments(raw, durationSeconds) {
  return raw
    .map((segment) => ({
      start: segment.start,
      end: Math.min(segment.end, durationSeconds),
      text: String(segment.text ?? "").replace(/\s+/g, " ").trim(),
    }))
    .filter(
      (segment) =>
        segment.text !== "" &&
        segment.start < durationSeconds &&
        segment.start < segment.end,
    )
    .sort((a, b) => a.start - b.start);
}

// Converter segundos para HH:MM:SS.mmm
function formatTimestamp(seconds) {
  const totalMs = Math.round(seconds * 1000);
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;

  const pad = (value, size = 2) => String(value).padStart(size, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(ms, 3)}`;
}

// Gerar WebVTT; o escape de & tem de ser o primeiro
function toWebVtt(segments) {
  const cues = segments.map((segment, index) => {
    const text = segment.text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return `${index + 1}\n${formatTimestamp(segment.start)} --> ${formatTimestamp(segment.end)}\n${text}\n`;
  });

  return `WEBVTT\n\n${cues.join("\n")}`;
}

// Estimativa de espaço do ficheiro de legendas (mínimo de 1024 bytes)
function estimateSubtitleBytes(durationSeconds) {
  return Math.max(1024, Math.ceil(durationSeconds) * 100);
}

module.exports = {
  SUPPORTED_LANGUAGES,
  isValidLanguage,
  normalizeSegments,
  toWebVtt,
  estimateSubtitleBytes,
};
