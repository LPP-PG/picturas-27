"""PictuRAS border tool: applies the border filter from utils/filters.py."""
from utils.image_tool import ImageTool

if __name__ == "__main__":
    ImageTool("border", codes=(1200, 1201)).run()
