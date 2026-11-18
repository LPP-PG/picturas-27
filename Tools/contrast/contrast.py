"""PictuRAS contrast tool: applies the contrast filter from utils/filters.py."""
from utils.image_tool import ImageTool

if __name__ == "__main__":
    ImageTool("contrast", codes=(1300, 1301)).run()
