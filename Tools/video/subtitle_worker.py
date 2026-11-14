"""RabbitMQ entry point for automatic video subtitles."""
from subtitles import caption_video
from video_media import probe
from worker import VideoWorker


def subtitle(input_path, output_path, params, progress):
    caption_video(input_path, output_path, probe(input_path), progress)
    info = probe(output_path)
    return {**info, "frames": round(info["duration"] * info["fps"])}


if __name__ == "__main__":
    VideoWorker("video_subtitles", subtitle).run()
