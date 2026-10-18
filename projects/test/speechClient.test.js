const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const { parseSpeechStream } = require("../utils/speechClient");

test("stream normal com linhas partidas entre chunks", async () => {
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

test("evento error rejeita com o código", async () => {
  const stream = Readable.from([
    '{"type":"info","language":null,"probability":0.1}\n{"type":"error",',
    '"code":"language_undetermined"}\n',
  ]);

  await assert.rejects(parseSpeechStream(stream), {
    code: "language_undetermined",
  });
});

test("stream sem done nem error é uma falha", async () => {
  const stream = Readable.from([
    '{"type":"info","language":"en","probability":0.9}\n',
    '{"type":"segment","start":0,"end":1,"text":"Hi"}\n',
  ]);

  await assert.rejects(parseSpeechStream(stream), { code: "failed" });
});
