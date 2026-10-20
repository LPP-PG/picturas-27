
const { spawn } = require("node:child_process");
const { getVideoFilterGraph } = require("./videoFilterPresets");

function processVideoFilter(
  inputPath,
  outputPath,
  filterName,
  { durationSeconds, onProgress, isCancelled } = {},
) {
  const filterGraph = getVideoFilterGraph(filterName);

  return new Promise((resolve, reject) => {
    const args = [
      "-hide_banner",
      "-loglevel", "error",
      "-nostdin",
      "-i", inputPath,
      "-map", "0:v:0",
      "-map", "0:a?",
      "-vf", filterGraph,
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      "-progress", "pipe:1",
      "-nostats",
      "-y", outputPath,
    ];

    const child = spawn("ffmpeg", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let errorMessage = "";
    let progressBuffer = "";
    let cancellationRequested = false;

    const cancelTimer = setInterval(() => {
      if (
        !cancellationRequested &&
        isCancelled?.()
      ) {
        cancellationRequested = true;
        child.kill("SIGTERM");
      }
    }, 500);

    child.stdout.on("data", (chunk) => {
      progressBuffer += chunk.toString();

      const lines = progressBuffer.split(/\r?\n/);
      progressBuffer = lines.pop() || "";

      for (const line of lines) {
        if (
          line.startsWith("out_time_ms=") &&
          durationSeconds > 0
        ) {
          const microseconds = Number(line.split("=")[1]);
          const percent = Math.min(
            99,
            Math.max(
              0,
              Math.round(
                (microseconds / 1_000_000 / durationSeconds) * 100
              ),
            ),
          );

          if (Number.isFinite(percent)) {
            onProgress?.(percent);
          }
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      errorMessage += chunk.toString();
      if (errorMessage.length > 4000) {
        errorMessage = errorMessage.slice(-4000);
      }
    });

    child.once("error", (error) => {
      clearInterval(cancelTimer);
      reject(error);
    });

    child.once("close", (code) => {
      clearInterval(cancelTimer);

      if (cancellationRequested) {
        const error = new Error("Video filter cancelled.");
        error.name = "AbortError";
        reject(error);
      } else if (code === 0) {
        onProgress?.(100);
        resolve();
      } else {
        reject(
          new Error(errorMessage || "Video processing failed.")
        );
      }
    });
  });
}

module.exports = { processVideoFilter };
