"""PictuRAS rotate tool: applies the rotate filter from utils/filters.py."""
from utils.image_tool import ImageTool

if __name__ == "__main__":
    ImageTool("rotate", codes=(1600, 1601)).run()
