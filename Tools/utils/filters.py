"""PIL filters shared by the image tools and the video editing worker.

Each filter is defined once, so an effect gives the same result on an image
and on every frame of a video. Parameter names are the ones the frontend
sends in the pipeline.
"""
from PIL import Image, ImageEnhance, ImageOps


def _rgb(img: Image.Image) -> Image.Image:
    # ImageEnhance does not work on palette images
    return img.convert("RGB") if img.mode == "P" else img


def brightness(img: Image.Image, brightness: float) -> Image.Image:
    return ImageEnhance.Brightness(_rgb(img)).enhance(float(brightness))


def contrast(img: Image.Image, contrastFactor: float) -> Image.Image:
    return ImageEnhance.Contrast(_rgb(img)).enhance(float(contrastFactor))


def saturation(img: Image.Image, saturationFactor: float) -> Image.Image:
    return ImageEnhance.Color(_rgb(img)).enhance(float(saturationFactor))


def rotate(img: Image.Image, degrees: float) -> Image.Image:
    return img.rotate(float(degrees), expand=True)


def resize(img: Image.Image, width: int, height: int) -> Image.Image:
    return img.resize((int(width), int(height)))


def binarization(img: Image.Image, threshold: int) -> Image.Image:
    t = int(threshold)
    return ImageOps.grayscale(img).point(lambda x: 0 if x < t else 255)


def cut(img: Image.Image, left: int, top: int, right: int, bottom: int) -> Image.Image:
    # The crop tool sends the pixels to remove from each side
    return img.crop((int(left), int(top), img.width - int(right), img.height - int(bottom)))


def border(img: Image.Image, borderWidth: int, r: int, g: int, b: int) -> Image.Image:
    return ImageOps.expand(img, border=int(borderWidth), fill=(int(r), int(g), int(b)))


FILTERS = {
    "brightness": brightness,
    "contrast": contrast,
    "saturation": saturation,
    "rotate": rotate,
    "resize": resize,
    "binarization": binarization,
    "cut": cut,
    "border": border,
}
