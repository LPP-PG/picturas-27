const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const { parseSpeechStream } = require("../utils/speechClient");

test("TST-LEG-SPEECH-01: lê o stream do serviço de fala com linhas partidas entre chunks", async () => {
  const text =
    '{"type":"info","language":"pt","probability":0.9}\n' +
    '{"type":"segment","start":0,"end":1.5,"text":"Olá"}\n' +
    '{"type":"segment","start":1.5,"end":3,"text":"mundo"}\n' +
    '{"type":"done"}\n';
  const chunks = text.match(/[\s\S]{1,7}/g);

  const infos = [];
  const segments = [];
  await parseSpeechStream(Readable.from(chunks), {
    onInfo: (info) => infos.push(info),
    onSegment: (segment) => segments.push(segment),
  });

  assert.equal(infos.length, 1);
  assert.equal(infos[0].language, "pt");
  assert.deepEqual(segments.map((s) => s.text), ["Olá", "mundo"]);
});

test("TST-LEG-SPEECH-02: lê caracteres multibyte partidos entre chunks", async () => {
  const bytes = Buffer.from(
    '{"type":"segment","start":0,"end":1,"text":"Olá"}\n{"type":"done"}\n',
  );
  // Partir a meio dos dois bytes de "á"
  const cut = bytes.indexOf(Buffer.from("á")) + 1;

  const segments = [];
  await parseSpeechStream(
    Readable.from([bytes.subarray(0, cut), bytes.subarray(cut)]),
    { onSegment: (segment) => segments.push(segment) },
  );

  assert.equal(segments[0].text, "Olá");
});

test("TST-LEG-SPEECH-03: um evento de erro rejeita com o código recebido", async () => {
  const stream = Readable.from([
    '{"type":"info","language":null,"probability":0.1}\n{"type":"error",',
    '"code":"not_english"}\n',
  ]);

  await assert.rejects(parseSpeechStream(stream), {
    code: "not_english",
  });
});

test("TST-LEG-SPEECH-04: um stream sem fim nem erro é uma falha", async () => {
  const stream = Readable.from([
    '{"type":"info","language":"en","probability":0.9}\n',
    '{"type":"segment","start":0,"end":1,"text":"Hi"}\n',
  ]);

  await assert.rejects(parseSpeechStream(stream), { code: "failed" });
});
