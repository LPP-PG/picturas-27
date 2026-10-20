// Mensagens e erros partilhados pelas ferramentas de vídeo (Recorte, Filtros e Legendas)

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

module.exports = { userError, failureMessage };
