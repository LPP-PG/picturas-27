// Mensagens e erros partilhados pelas ferramentas de vídeo (Recorte, Filtros e Legendas)

const videoMessages = {
  storage_project: "Insufficient storage space in the project.",
  storage_account: "Insufficient storage space in the account.",
};

// Mensagem de falta de espaço, indicando o limite atingido (primeiro o do projeto)
function storageMessage(bytes, capacity) {
  return bytes > capacity.project_available_bytes
    ? videoMessages.storage_project
    : videoMessages.storage_account;
}

// Erro cuja mensagem pode ser mostrada ao utilizador; os restantes (ex.: FFmpeg) ficam só no registo
function userError(message) {
  const error = new Error(message);
  error.expose = true;
  return error;
}

// Mensagem a guardar num pedido que falhou
function failureMessage(error, fallback) {
  return error.expose ? error.message : fallback;
}

module.exports = { videoMessages, storageMessage, userError, failureMessage };
