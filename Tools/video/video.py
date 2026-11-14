"""RabbitMQ entry point for video editing."""
from video_processor import edit_video
from worker import VideoWorker


def edit(input_path, output_path, params, progress):
    return edit_video(input_path, output_path, params["tools"], progress, params["preview"])


if __name__ == "__main__":
    VideoWorker("video_edit", edit).run()
