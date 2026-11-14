"""Per-frame effects used by the video worker.

The filters come from utils/filters.py, the same module the image tools use,
so an effect gives the same result on an image and on every frame of a video.
"""
from PIL import Image

from utils.filters import FILTERS
from video_media import UnsupportedEffect

# Effects applied frame by frame
FRAME_EFFECTS = FILTERS

# Effects that act on time (only meaningful for video)
TIME_EFFECTS = {"trim", "speed"}

SUPPORTED = set(FRAME_EFFECTS) | TIME_EFFECTS


def apply_frame_effects(img: Image.Image, tools: list) -> Image.Image:
    """Applies the frame effects in `tools`, in the given order."""
    for tool in tools:
        name = tool["procedure"]
        if name in TIME_EFFECTS:
            continue
        fn = FRAME_EFFECTS.get(name)
        if fn is None:
            raise UnsupportedEffect(f"Effect '{name}' is not available for video")
        img = fn(img, **(tool.get("params") or {}))
        if img.mode != "RGB":
            img = img.convert("RGB")
    return img
