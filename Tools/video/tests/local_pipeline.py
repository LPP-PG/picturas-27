"""In-process baseline harness for the existing video regression fixtures."""
import os
import tempfile
from pathlib import Path

from effects import SUPPORTED, UnsupportedEffect
from video_processor import edit_video as _process_video
from video_media import probe


def validate_tools(tools: list) -> None:
    extractors = [i for i, tool in enumerate(tools) if tool.get("procedure") == "extract_frames"]
    if extractors:
        from frame_extraction import InvalidExtraction, validate_params
        if extractors != [len(tools) - 1]:
            raise InvalidExtraction("Frame extraction must appear once, at the end of the pipeline")
        validate_params(tools[-1].get("params", {}))
    for tool in tools:
        if tool.get("procedure") not in SUPPORTED | {"subtitles", "extract_frames"}:
            raise UnsupportedEffect(
                f"Effect '{tool.get('procedure')}' is not available for video"
            )


def process_video(input_path: str, output_path: str, tools: list,
                  progress_cb=None, preview: bool = False) -> dict:
    """Run caption stages in order, keeping the existing fast path for other tools.

    Captioning is a video-to-video effect. Effects after it act on the captioned
    frames too. Work stays temporary until the entire pipeline succeeds.
    """
    validate_tools(tools)
    if tools and tools[-1].get("procedure") == "extract_frames":
        from frame_extraction import extract_frames
        if len(tools) == 1:
            # With no preceding edits, seek directly in the original. Extracting
            # a few stills must not transcode an entire long video or add a lossy
            # generation before a PNG export. Use video duration when available
            # so a longer audio stream does not create out-of-range sample times.
            return extract_frames(input_path, output_path,
                                  probe(input_path, prefer_video_duration=True),
                                  tools[-1].get("params", {}),
                                  progress_cb or (lambda _: None), preview=preview)
        target = Path(output_path).resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="frame-source-", dir=target.parent) as work:
            edited = str(Path(work) / "edited.mp4")
            # Sampling spans the complete edited timeline, including in preview.
            info = process_video(input_path, edited, tools[:-1],
                                 lambda pct: progress_cb(int(pct * 0.7)) if progress_cb else None,
                                 preview=False)
            return extract_frames(edited, output_path, info, tools[-1].get("params", {}),
                                  lambda pct: progress_cb(70 + int(pct * 0.3)) if progress_cb else None,
                                  preview=preview)
    if not any(t.get("procedure") == "subtitles" for t in tools):
        return _process_video(input_path, output_path, tools, progress_cb, preview)

    from subtitles import caption_video

    stages, pending = [], []
    for tool in tools:
        if tool.get("procedure") == "subtitles":
            # Normalize the first input to MP4/H.264 even when captioning is a no-op.
            if pending or not stages:
                stages.append(pending)
                pending = []
            stages.append(None)
        else:
            pending.append(tool)
    if pending:
        stages.append(pending)

    # A preview is the first seconds of the final timeline. Cutting the initial
    # input before a later trim/speed would discard needed frames or produce the
    # wrong preview length. Keep preceding stages complete until the final
    # temporal stage; ordinary pipelines still limit input before recognition.
    # This deliberately trades more recognition work for correct downstream cuts.
    preview_stage = max(
        (index for index, stage in enumerate(stages)
         if stage is not None and any(
             tool.get("procedure") in {"trim", "speed"} for tool in stage)),
        default=0,
    )

    target = Path(output_path).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="captions-", dir=target.parent) as work:
        current = input_path
        for index, stage in enumerate(stages):
            next_path = str(Path(work) / f"stage-{index}.mp4")

            def progress(percent):
                if progress_cb:
                    progress_cb(min(99, int((index + percent / 100) * 100 / len(stages))))

            progress(0)
            if stage is None:
                caption_video(current, next_path, probe(current), progress)
            else:
                _process_video(current, next_path, stage, progress,
                               preview=preview and index == preview_stage)
            current = next_path
        result = probe(current)
        result["frames"] = round(result["duration"] * result["fps"])
        os.replace(current, target)
    if progress_cb:
        progress_cb(100)
    return result
