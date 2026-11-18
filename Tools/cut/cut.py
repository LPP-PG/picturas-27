"""PictuRAS cut tool: applies the cut filter from utils/filters.py."""
from utils.image_tool import ImageTool

if __name__ == "__main__":
    ImageTool("cut", codes=(1500, 1501)).run()
