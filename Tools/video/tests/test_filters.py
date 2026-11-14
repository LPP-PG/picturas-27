"""Shared PIL filters (Tools/utils/filters.py), used by images and videos."""
import pytest
from PIL import Image

from utils.filters import cut


def test_cut_removes_margins_from_each_side():
    # The crop tool sends how many pixels to remove from each side
    img = Image.new("RGB", (100, 80))
    out = cut(img, left=10, top=5, right=20, bottom=15)
    assert out.size == (70, 60)


def test_cut_with_only_a_left_margin():
    img = Image.new("RGB", (300, 100))
    assert cut(img, left=200, top=0, right=0, bottom=0).size == (100, 100)


def test_cut_without_margins_keeps_the_image():
    img = Image.new("RGB", (40, 30))
    assert cut(img, left=0, top=0, right=0, bottom=0).size == (40, 30)


def test_cut_keeps_the_right_pixels():
    img = Image.new("L", (4, 1))
    img.putdata([1, 2, 3, 4])
    assert list(cut(img, left=1, top=0, right=1, bottom=0).getdata()) == [2, 3]


def test_cut_rejects_margins_larger_than_the_image():
    with pytest.raises(ValueError):
        cut(Image.new("RGB", (50, 50)), left=30, top=0, right=30, bottom=0)
