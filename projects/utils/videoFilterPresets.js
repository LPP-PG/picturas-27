const VIDEO_FILTERS = Object.freeze({
  grayscale: "hue=s=0",

  sepia:
    "colorchannelmixer=rr=0.393:rg=0.769:rb=0.189:gr=0.349:gg=0.686:gb=0.168:br=0.272:bg=0.534:bb=0.131",

  vintage:
    "hue=s=0.70,eq=contrast=0.90,colorchannelmixer=rr=1.05:gg=1:bb=0.92",

  invert: "negate",

  contrast: "eq=contrast=1.30",

  blur: "gblur=sigma=1.5",
});

function getVideoFilterGraph(filterName) {
  if (!Object.prototype.hasOwnProperty.call(VIDEO_FILTERS, filterName)) {
    throw new Error("Unsupported video filter.");
  }

  return VIDEO_FILTERS[filterName];
}

module.exports = { getVideoFilterGraph };