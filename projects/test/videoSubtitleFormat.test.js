const test = require("node:test");
const assert = require("node:assert/strict");
const f = require("../utils/videoSubtitleFormat");

test("TST-LEG-FMT-01 / RN4: só aceita inglês como idioma", () => {
  assert.ok(f.isValidLanguage("en"));
  assert.equal(f.isValidLanguage("auto"), false);
  assert.equal(f.isValidLanguage("pt"), false);
});

test("TST-LEG-FMT-02 / RN6: os segmentos são cortados à duração, sem vazios e sem espaços a mais", () => {
  const out = f.normalizeSegments([
    { start: 0, end: 2.5, text: "  Olá  mundo \n" },
    { start: 3, end: 3, text: "zero" },
    { start: 4, end: 5, text: "   " },
    { start: 9, end: 12, text: "fim" },
    { start: 11, end: 13, text: "fora" },
  ], 10);
  assert.deepEqual(out, [
    { start: 0, end: 2.5, text: "Olá mundo" },
    { start: 9, end: 10, text: "fim" },
  ]);
});

test("TST-LEG-FMT-03: um início negativo passa a 0", () => {
  assert.deepEqual(
    f.normalizeSegments([{ start: -1, end: 2, text: "x" }], 10),
    [{ start: 0, end: 2, text: "x" }],
  );
});

test("TST-LEG-FMT-04: gera WebVTT com tempos formatados e texto escapado", () => {
  const vtt = f.toWebVtt([{ start: 61.5, end: 3725.25, text: "a --> b <i> & c" }]);
  assert.equal(
    vtt,
    "WEBVTT\n\n1\n00:01:01.500 --> 01:02:05.250\na --&gt; b &lt;i&gt; &amp; c\n",
  );
});

test("TST-LEG-FMT-05 / A12: estima o tamanho das legendas pela duração", () => {
  assert.equal(f.estimateSubtitleBytes(3), 1024);
  assert.equal(f.estimateSubtitleBytes(59.2), 6000);
});
