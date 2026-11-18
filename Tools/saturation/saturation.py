"""PictuRAS saturation tool: applies the saturation filter from utils/filters.py."""
from utils.image_tool import ImageTool

if __name__ == "__main__":
    ImageTool("saturation", codes=(1700, 1701)).run()
