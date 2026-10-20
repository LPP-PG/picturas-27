
const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const sharp = require("sharp");

const {
  generateVideoFilterPreview,
} = require("../utils/videoFilterPreview");

const video = {
  _id: "507f1f77bcf86cd799439011",
  user_id: "507f191e810c19729de860ea",
  thumbnail_key: "video/preview/sample.jpg",
};

// Criar uma miniatura de teste sem depender de ficheiros externos
async function criarMiniatura() {
  return sharp({
    create: {
      width: 96,
      height: 54,
      channels: 3,
      background: { r: 240, g: 100, b: 30 },
    },
  }).jpeg().toBuffer();
}

test("TST-FILT-PREV-01: gera pré-visualização dos seis filtros", async (t) => {
  const miniatura = await criarMiniatura();
  const pedidos = [];

  t.mock.method(axios, "get", async (url) => {
    pedidos.push(url);

    if (url.startsWith("http://img_storage:11000/image/internal/")) {
      return { data: { url: "http://teste.local/miniatura.jpg" } };
    }

    if (url === "http://teste.local/miniatura.jpg") {
      return { data: miniatura };
    }

    throw new Error(`Pedido inesperado: ${url}`);
  });

  const filtros = [
    "grayscale",
    "sepia",
    "vintage",
    "invert",
    "contrast",
    "blur",
  ];

  for (const filtro of filtros) {
    const imagem = await generateVideoFilterPreview(video, filtro);
    const metadata = await sharp(imagem).metadata();

    assert.equal(metadata.format, "jpeg");
    assert.equal(metadata.width, 96);
    assert.equal(metadata.height, 54);
    assert.ok(imagem.length > 0);
  }

  // Apenas consultas da miniatura; sem pedidos de quota
  assert.equal(pedidos.length, 12);
});

test("TST-FILT-PREV-02: rejeita filtro não suportado", async () => {
  await assert.rejects(
    generateVideoFilterPreview(video, "filtro-invalido"),
    /Unsupported video filter/
  );
});

test("TST-FILT-PREV-03: permite recuperar após falha temporária", async (t) => {
  const miniatura = await criarMiniatura();
  let falhar = true;

  t.mock.method(axios, "get", async (url) => {
    if (url.startsWith("http://img_storage:11000/image/internal/")) {
      return { data: { url: "http://teste.local/miniatura.jpg" } };
    }

    if (falhar) {
      throw new Error("Falha temporária de ligação");
    }

    return { data: miniatura };
  });

  await assert.rejects(
    generateVideoFilterPreview(video, "sepia"),
    /Falha temporária de ligação/
  );

  // Simular a recuperação da ligação
  falhar = false;

  const imagem = await generateVideoFilterPreview(video, "sepia");
  const metadata = await sharp(imagem).metadata();

  assert.equal(metadata.format, "jpeg");
  assert.ok(imagem.length > 0);
});
