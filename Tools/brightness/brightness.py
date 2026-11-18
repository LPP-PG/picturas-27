"""PictuRAS brightness tool: applies the brightness filter from utils/filters.py."""
from utils.image_tool import ImageTool

if __name__ == "__main__":
    ImageTool("brightness", codes=(1900, 1901)).run()
