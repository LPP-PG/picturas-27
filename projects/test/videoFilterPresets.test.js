
const test = require("node:test");
const assert = require("node:assert/strict");

const { getVideoFilterGraph } = require("../utils/videoFilterPresets");

test("TST-FILT-01: os seis filtros têm os presets corretos", () => {
  const filtros = {
    grayscale: "hue=s=0",
    sepia: "colorchannelmixer=rr=0.393:rg=0.769:rb=0.189:gr=0.349:gg=0.686:gb=0.168:br=0.272:bg=0.534:bb=0.131",
    vintage: "hue=s=0.70,eq=contrast=0.90,colorchannelmixer=rr=1.05:gg=1:bb=0.92",
    invert: "negate",
    contrast: "eq=contrast=1.30",
    blur: "gblur=sigma=1.5",
  };

  for (const [nome, preset] of Object.entries(filtros)) {
    assert.equal(getVideoFilterGraph(nome), preset);
  }
});



test("TST-FILT-02: rejeita um filtro não suportado", () => {
  assert.throws(
    () => getVideoFilterGraph("filtro_invalido"),
    /Unsupported video filter./
  );
});
