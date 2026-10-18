const test = require("node:test");
const assert = require("node:assert/strict");
const f = require("../utils/videoSubtitleFormat");

test("languages", () => {
  assert.ok(f.isValidLanguage("auto"));
  assert.ok(f.isValidLanguage("pt"));
  assert.equal(f.isValidLanguage("de"), false);
});

test("normalizeSegments clamps, drops and trims (RN6)", () => {
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

test("toWebVtt escapes and formats timestamps", () => {
  const vtt = f.toWebVtt([{ start: 61.5, end: 3725.25, text: "a --> b <i> & c" }]);
  assert.equal(
    vtt,
    "WEBVTT\n\n1\n00:01:01.500 --> 01:02:05.250\na --&gt; b &lt;i&gt; &amp; c\n",
  );
});

test("estimateSubtitleBytes", () => {
  assert.equal(f.estimateSubtitleBytes(3), 1024);
  assert.equal(f.estimateSubtitleBytes(59.2), 6000);
});
