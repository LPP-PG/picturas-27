"""PictuRAS binarization tool: applies the binarization filter from utils/filters.py."""
from utils.image_tool import ImageTool

if __name__ == "__main__":
    ImageTool("binarization", codes=(1100, 1101)).run()
