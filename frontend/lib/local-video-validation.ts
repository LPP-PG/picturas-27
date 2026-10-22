export function canReadLocalVideo(file: Pick<File, "name" | "size">): boolean {
  return /\.(mp4|mov)$/i.test(file.name) && file.size > 0;
}

export function getLocalVideoError(
  file: Pick<File, "name" | "size">,
  duration: number | null,
  premium: boolean,
): string {
  if (!/\.(mp4|mov)$/i.test(file.name)) {
    return "Only MP4 or MOV videos are accepted.";
  }
  if (file.size <= 0) return "The file is empty.";

  const errors: string[] = [];
  if (file.size > (premium ? 1_000_000_000 : 100_000_000)) {
    errors.push(`The file exceeds ${premium ? "1 GB" : "100 MB"}.`);
  }
  const maxDuration = premium ? 600 : 60;
  if (duration !== null && Number.isFinite(duration) && duration > maxDuration) {
    errors.push(`The video exceeds ${maxDuration} seconds.`);
  }
  // Browser codec support is not proof of file validity. Unknown durations are
  // validated by ffprobe on the server, before the video is accepted.
  return errors.join(" ");
}

export function readLocalDuration(
  file: File,
  signal?: AbortSignal,
): Promise<number | null> {
  if (signal?.aborted) return Promise.resolve(null);

  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    let settled = false;

    const finish = (duration: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.onloadedmetadata = null;
      video.ondurationchange = null;
      video.onloadeddata = null;
      video.onerror = null;
      signal?.removeEventListener("abort", abort);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    const abort = () => finish(null);
    const readDuration = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        finish(video.duration);
      }
    };
    const timer = window.setTimeout(() => finish(null), 12000);

    video.preload = "metadata";
    // Some containers expose a finite duration only after loadedmetadata.
    video.onloadedmetadata = readDuration;
    video.ondurationchange = readDuration;
    video.onloadeddata = readDuration;
    video.onerror = () => finish(null);
    signal?.addEventListener("abort", abort, { once: true });
    video.src = url;
  });
}
