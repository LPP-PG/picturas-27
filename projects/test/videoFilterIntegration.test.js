
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");

const { readVideoMetadata } = require("../utils/videoMetadata");
const { processVideoFilter } = require("../utils/videoFilterFfmpeg");

test("TST-FILT-INT-01: aplica preto e branco a um MOV real", async () => {
  const original = path.join(__dirname, "fixtures", "traffic-5s.mov");
  const pastaTemporaria = await fs.mkdtemp(
    path.join(os.tmpdir(), "teste-filtros-")
  );
  const resultado = path.join(pastaTemporaria, "resultado.mp4");

  try {
    const ficheiroOriginal = await fs.readFile(original);
    const hashOriginal = createHash("sha256")
      .update(ficheiroOriginal)
      .digest("hex");

    const antes = await readVideoMetadata(original);

    await processVideoFilter(original, resultado, "grayscale", {
      durationSeconds: antes.duration_seconds,
    });

    const depois = await readVideoMetadata(resultado);
    const ficheiroResultado = await fs.stat(resultado);

    // O resultado foi criado
    assert.ok(ficheiroResultado.size > 0);

    // A duração mantém-se
    assert.ok(
      Math.abs(depois.duration_seconds - antes.duration_seconds) < 0.2
    );

    // O áudio mantém-se
    assert.equal(antes.has_audio, true);
    assert.equal(depois.has_audio, true);

    // A resolução mantém-se
    assert.equal(depois.width, antes.width);
    assert.equal(depois.height, antes.height);

    // O vídeo original não foi alterado
    const hashDepois = createHash("sha256")
      .update(await fs.readFile(original))
      .digest("hex");

    assert.equal(hashDepois, hashOriginal);

  } finally {
    // Limpar os ficheiros temporários do teste
    await fs.rm(pastaTemporaria, {
      recursive: true,
      force: true,
    });
  }
});



test("TST-FILT-INT-02: rejeita um vídeo inválido", async () => {
  const original = path.join(
    __dirname,
    "fixtures",
    "invalid-video.mp4"
  );

  const pastaTemporaria = await fs.mkdtemp(
    path.join(os.tmpdir(), "teste-filtro-invalido-")
  );

  const resultado = path.join(pastaTemporaria, "resultado.mp4");

  try {
    await assert.rejects(
      processVideoFilter(original, resultado, "grayscale", {
        durationSeconds: 5,
      })
    );
  } finally {
    await fs.rm(pastaTemporaria, {
      recursive: true,
      force: true,
    });
  }
});



test("TST-FILT-INT-03: processa os seis filtros num MP4 real", async () => {
  const original = path.join(__dirname, "fixtures", "traffic-short.mp4");

  const pastaTemporaria = await fs.mkdtemp(
    path.join(os.tmpdir(), "teste-seis-filtros-")
  );

  const filtros = [
    "grayscale",
    "sepia",
    "vintage",
    "invert",
    "contrast",
    "blur",
  ];

  try {
    const antes = await readVideoMetadata(original);

    for (const filtro of filtros) {
      const resultado = path.join(
        pastaTemporaria,
        `resultado_${filtro}.mp4`
      );

      await processVideoFilter(original, resultado, filtro, {
        durationSeconds: antes.duration_seconds,
      });

      const depois = await readVideoMetadata(resultado);
      const ficheiro = await fs.stat(resultado);

      // O resultado existe e não está vazio
      assert.ok(ficheiro.size > 0, `${filtro}: resultado vazio`);

      // A duração mantém-se
      assert.ok(
        Math.abs(depois.duration_seconds - antes.duration_seconds) < 0.2,
        `${filtro}: duração diferente`
      );

      // A presença ou ausência de áudio mantém-se
      assert.equal(depois.has_audio, antes.has_audio);

      // A resolução mantém-se
      assert.equal(depois.width, antes.width);
      assert.equal(depois.height, antes.height);
    }
  } finally {
    await fs.rm(pastaTemporaria, {
      recursive: true,
      force: true,
    });
  }
});



test("TST-FILT-INT-04: o filtro preto e branco remove as cores", async () => {
  const { execFileSync } = require("node:child_process");

  const original = path.join(__dirname, "fixtures", "traffic-short.mp4");

  const pastaTemporaria = await fs.mkdtemp(
    path.join(os.tmpdir(), "teste-preto-branco-")
  );

  const resultado = path.join(pastaTemporaria, "resultado.mp4");

  try {
    const metadata = await readVideoMetadata(original);

    await processVideoFilter(original, resultado, "grayscale", {
      durationSeconds: metadata.duration_seconds,
    });

    // Extrair um fotograma do resultado em formato RGB
    const fotograma = execFileSync("ffmpeg", [
      "-v", "error",
      "-i", resultado,
      "-frames:v", "1",
      "-vf", "scale=32:18",
      "-pix_fmt", "rgb24",
      "-f", "rawvideo",
      "pipe:1",
    ]);

    assert.equal(fotograma.length, 32 * 18 * 3);

    // Num fotograma a preto e branco, R, G e B são semelhantes
    for (let i = 0; i < fotograma.length; i += 3) {
      const vermelho = fotograma[i];
      const verde = fotograma[i + 1];
      const azul = fotograma[i + 2];

      assert.ok(Math.abs(vermelho - verde) <= 4);
      assert.ok(Math.abs(verde - azul) <= 4);
    }
  } finally {
    await fs.rm(pastaTemporaria, {
      recursive: true,
      force: true,
    });
  }
});



test("TST-FILT-INT-05: preserva áudio reproduzível em AAC", async () => {
  const { execFileSync } = require("node:child_process");

  const original = path.join(
    __dirname,
    "fixtures",
    "traffic-voiceover.mp4"
  );

  const pastaTemporaria = await fs.mkdtemp(
    path.join(os.tmpdir(), "teste-audio-filtro-")
  );

  const resultado = path.join(pastaTemporaria, "resultado.mp4");

  try {
    const antes = await readVideoMetadata(original);

    assert.equal(antes.has_audio, true);

    await processVideoFilter(original, resultado, "sepia", {
      durationSeconds: antes.duration_seconds,
    });

    const depois = await readVideoMetadata(resultado);

    // O resultado continua a ter áudio
    assert.equal(depois.has_audio, true);

    // O áudio resultante utiliza o codec AAC
    const codecAudio = execFileSync("ffprobe", [
      "-v", "error",
      "-select_streams", "a:0",
      "-show_entries", "stream=codec_name",
      "-of", "default=noprint_wrappers=1:nokey=1",
      resultado
    ]).toString().trim();

    assert.equal(codecAudio, "aac");

    // Confirmar que o áudio pode ser descodificado sem erros
    execFileSync("ffmpeg", [
      "-v", "error",
      "-xerror",
      "-i", resultado,
      "-map", "0:a:0",
      "-f", "null",
      "-"
    ]);

    // A duração do vídeo mantém-se
    assert.ok(
      Math.abs(depois.duration_seconds - antes.duration_seconds) < 0.2
    );

  } finally {
    await fs.rm(pastaTemporaria, {
      recursive: true,
      force: true,
    });
  }
});



test("TST-FILT-INT-06: cancela o processamento de um filtro", async () => {
  const original = path.join(
    __dirname,
    "fixtures",
    "traffic-5s.mov"
  );

  const pastaTemporaria = await fs.mkdtemp(
    path.join(os.tmpdir(), "teste-cancelamento-filtro-")
  );

  const resultado = path.join(pastaTemporaria, "resultado.mov");

  try {
    const metadata = await readVideoMetadata(original);

    await assert.rejects(
      processVideoFilter(original, resultado, "blur", {
        durationSeconds: metadata.duration_seconds,
        isCancelled: () => true,
      }),
      (erro) => {
        assert.equal(erro.name, "AbortError");
        return true;
      }
    );
  } finally {
    await fs.rm(pastaTemporaria, {
      recursive: true,
      force: true,
    });
  }
});



test("TST-FILT-INT-07: limpa ficheiros temporários após uma falha", async (t) => {
  const { randomUUID } = require("node:crypto");
  const { createReadStream } = require("node:fs");
  const axios = require("axios");

  const storage = require("../utils/imageStorage");
  const original = path.join(
    __dirname,
    "fixtures",
    "invalid-video.mp4"
  );

  const jobId = randomUUID();

  const ficheiroTemporario = path.join(
    os.tmpdir(),
    `${jobId}-filter-source.mp4`
  );

  const resultadoTemporario = path.join(
    os.tmpdir(),
    `${jobId}-filter-result.mp4`
  );

  // Simular o serviço de armazenamento
  t.mock.method(
    storage,
    "get_image_internal_url",
    async () => ({
      data: { url: "http://teste/video-invalido" }
    })
  );

  // Simular o descarregamento do vídeo inválido
  t.mock.method(axios, "get", async () => ({
    data: createReadStream(original)
  }));

  // Carregar o processamento com as simulações preparadas
  const modulePath = require.resolve("../utils/videoFilterProcessing");
  delete require.cache[modulePath];

  try {
    const { prepareFilteredVideo } = require("../utils/videoFilterProcessing");

    const video = {
      _id: "video-teste",
      user_id: "utilizador-teste",
      format: "mp4",
      storage_key: "video/src/invalid-video.mp4",
    };

    // O processamento deve falhar
    await assert.rejects(
      prepareFilteredVideo(
        video,
        jobId,
        "grayscale",
        () => {},
        () => false
      ),
      /Não foi possível ler o vídeo/
    );

    // O original temporário deve ter sido eliminado
    await assert.rejects(
      fs.access(ficheiroTemporario),
      { code: "ENOENT" }
    );

    // Não pode existir um resultado parcial
    await assert.rejects(
      fs.access(resultadoTemporario),
      { code: "ENOENT" }
    );

  } finally {
    delete require.cache[modulePath];
  }
});
