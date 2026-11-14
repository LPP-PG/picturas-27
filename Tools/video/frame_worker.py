"""RabbitMQ entry point for video frame extraction."""
from frame_extraction import extract_frames
from video_media import probe
from worker import VideoWorker


def extract(input_path, output_path, params, progress):
    info = probe(input_path, prefer_video_duration=params["useSourceDuration"])
    return extract_frames(input_path, output_path, info, params["extraction"],
                          progress, preview=params["preview"])


if __name__ == "__main__":
    VideoWorker("video_frames", extract).run()
