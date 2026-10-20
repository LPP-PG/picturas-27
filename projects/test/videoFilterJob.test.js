
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const axios = require("axios");

const VideoFilter = require("../models/videoFilter");
const reservations = require("../utils/videoReservations");

test("TST-FILT-JOB-01: cancelar pedido em espera liberta reservas", async (t) => {
  const job = {
    _id: new mongoose.Types.ObjectId(),
    user_id: new mongoose.Types.ObjectId(),
    state: "queued",
    progress: 0,
    cancel_requested: false,
    reserved_bytes: 1000000,
    operation_reserved: true,
  };

  let reservasLibertadas = 0;
  let operacoesDevolvidas = 0;

  // Simular as alterações à base de dados
  t.mock.method(VideoFilter, "findOneAndUpdate", async (query, update) => {
    Object.assign(job, update.$set);
    return { ...job };
  });

  t.mock.method(VideoFilter, "updateOne", async (query, update) => {
    Object.assign(job, update.$set);
    return { modifiedCount: 1 };
  });

  t.mock.method(VideoFilter, "findById", async () => {
    return { ...job };
  });

  // Simular a libertação do espaço reservado
  t.mock.method(
    reservations,
    "releaseUploadReservation",
    async (userId, jobId) => {
      assert.equal(String(userId), String(job.user_id));
      assert.equal(String(jobId), String(job._id));
      reservasLibertadas++;
    }
  );

  // Simular a devolução da operação diária
  t.mock.method(axios, "post", async (url) => {
    assert.ok(url.endsWith(`/${job.user_id}/process/refund/1`));
    operacoesDevolvidas++;
    return { status: 200 };
  });

  // Carregar a função depois de preparar as simulações
  const modulePath = require.resolve("../utils/videoFilterJob");
  delete require.cache[modulePath];

  t.after(() => {
    delete require.cache[modulePath];
  });

  const { cancelFilterJob } = require("../utils/videoFilterJob");

  // Cancelar o pedido
  const resultado = await cancelFilterJob({ ...job });

  // Verificar o estado final
  assert.equal(resultado.state, "cancelled");
  assert.equal(resultado.cancel_requested, true);
  assert.equal(resultado.reserved_bytes, 0);
  assert.equal(resultado.operation_reserved, false);

  // Verificar que as duas reservas foram tratadas
  assert.equal(reservasLibertadas, 1);
  assert.equal(operacoesDevolvidas, 1);
});



test("TST-FILT-JOB-02: não cancela um pedido já concluído", async (t) => {
  const job = {
    _id: new mongoose.Types.ObjectId(),
    user_id: new mongoose.Types.ObjectId(),
    state: "completed",
    progress: 100,
    cancel_requested: false,
    reserved_bytes: 0,
    operation_reserved: false,
  };

  let reservasLibertadas = 0;
  let operacoesDevolvidas = 0;

  // Simular que a base de dados não encontra um pedido ativo
  t.mock.method(VideoFilter, "findOneAndUpdate", async () => null);

  t.mock.method(VideoFilter, "findById", async () => ({
    ...job,
  }));

  t.mock.method(
    reservations,
    "releaseUploadReservation",
    async () => {
      reservasLibertadas++;
    }
  );

  t.mock.method(axios, "post", async () => {
    operacoesDevolvidas++;
    return { status: 200 };
  });

  const modulePath = require.resolve("../utils/videoFilterJob");
  delete require.cache[modulePath];

  t.after(() => {
    delete require.cache[modulePath];
  });

  const { cancelFilterJob } = require("../utils/videoFilterJob");

  const resultado = await cancelFilterJob({ ...job });

  // O pedido mantém-se concluído
  assert.equal(resultado.state, "completed");
  assert.equal(resultado.progress, 100);
  assert.equal(resultado.cancel_requested, false);

  // Não deve libertar nem devolver operações
  assert.equal(reservasLibertadas, 0);
  assert.equal(operacoesDevolvidas, 0);
});



test("TST-FILT-JOB-03: uma falha devolve a operação e liberta a reserva", async (t) => {
  const Video = require("../models/video");
  const processing = require("../utils/videoFilterProcessing");

  const job = {
    _id: new mongoose.Types.ObjectId(),
    user_id: new mongoose.Types.ObjectId(),
    project_id: new mongoose.Types.ObjectId(),
    source_video_id: new mongoose.Types.ObjectId(),
    state: "queued",
    progress: 0,
    cancel_requested: false,
    reserved_bytes: 1000000,
    operation_reserved: true,
  };

  let reservasLibertadas = 0;
  let operacoesDevolvidas = 0;

  // Simular a passagem do pedido para processamento
  t.mock.method(VideoFilter, "findOneAndUpdate", async () => {
    job.state = "processing";
    job.progress = 5;
    return { ...job };
  });

  // Simular a consulta do estado do pedido
  t.mock.method(VideoFilter, "findById", () => ({
    select: () => ({
      lean: async () => ({
        state: job.state,
        cancel_requested: job.cancel_requested,
      }),
    }),
  }));

  // Simular a atualização do pedido
  t.mock.method(VideoFilter, "updateOne", async (query, update) => {
    Object.assign(job, update.$set);
    return { modifiedCount: 1 };
  });

  // Simular a existência do vídeo original
  t.mock.method(Video, "findOne", () => ({
    lean: async () => ({
      _id: job.source_video_id,
      user_id: job.user_id,
      project_id: job.project_id,
    }),
  }));

  // Simular uma falha durante a aplicação do filtro
  t.mock.method(processing, "prepareFilteredVideo", async () => {
    throw new Error("Falha simulada no processamento");
  });

  // Registar a libertação do armazenamento
  t.mock.method(
    reservations,
    "releaseUploadReservation",
    async () => {
      reservasLibertadas++;
    }
  );

  // Registar a devolução da operação diária
  t.mock.method(axios, "post", async (url) => {
    assert.ok(url.endsWith(`/${job.user_id}/process/refund/1`));
    operacoesDevolvidas++;
    return { status: 200 };
  });

  // Carregar o módulo com as simulações preparadas
  const modulePath = require.resolve("../utils/videoFilterJob");
  delete require.cache[modulePath];

  t.after(() => {
    delete require.cache[modulePath];
  });

  const { processFilterJob } = require("../utils/videoFilterJob");

  await processFilterJob(job._id, "Bearer test-token");

  // Verificar as consequências da falha
  assert.equal(job.state, "failed");
  assert.equal(job.reserved_bytes, 0);
  assert.equal(job.operation_reserved, false);
  assert.equal(reservasLibertadas, 1);
  assert.equal(operacoesDevolvidas, 1);
});
