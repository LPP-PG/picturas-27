"""PictuRAS resize tool: applies the resize filter from utils/filters.py."""
from utils.image_tool import ImageTool

if __name__ == "__main__":
    ImageTool("resize", codes=(1500, 1501)).run()
