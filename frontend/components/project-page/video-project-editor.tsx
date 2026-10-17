"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  cancelVideoTrim,
  fetchProjectVideos,
  fetchVideoTrim,
  startVideoTrim,
  type VideoTrimJob,
} from "@/lib/videos";
import { useSession } from "@/providers/session-provider";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

interface VideoProjectEditorProps {
  projectId: string;
  projectName: string;
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data?.error === "string") return data.error;
    if (typeof data === "string") return data;
  }

  return "Could not load the project videos.";
}

function trimStateLabel(state: VideoTrimJob["state"]): string {
  return {
    queued: "Queued",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
  }[state];
}

export default function VideoProjectEditor({
  projectId,
  projectName,
}: VideoProjectEditorProps) {
  const session = useSession();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const [trimOpen, setTrimOpen] = useState(false);
  const [trimStart, setTrimStart] = useState("0");
  const [trimEnd, setTrimEnd] = useState("");
  const [trimFormat, setTrimFormat] = useState<"mp4" | "mov">("mp4");
  const [trimJob, setTrimJob] = useState<VideoTrimJob | null>(null);
  const notifiedTrimId = useRef<string | null>(null);
  const activeTrimToast = useRef<ReturnType<typeof toast> | null>(null);

  const videos = useQuery({
    queryKey: [
      "projectVideos",
      session.user._id,
      projectId,
      session.token,
    ],
    queryFn: ({ signal }) =>
      fetchProjectVideos({
        uid: session.user._id,
        pid: projectId,
        token: session.token,
        signal,
      }),
    // Refresh temporary file URLs periodically.
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });

  const items = videos.data ?? [];
  const selected =
    items.find((video) => video._id === selectedId) ?? items[0];
  const refetchVideos = videos.refetch;
  const startValue = Number(trimStart);
  const endValue = Number(trimEnd);
  const validTrimInterval =
    Number.isInteger(startValue) &&
    Number.isInteger(endValue) &&
    startValue >= 0 &&
    endValue <= (selected?.duration_seconds ?? 0) &&
    startValue < endValue &&
    endValue - startValue >= 1 &&
    !(startValue === 0 &&
      endValue >= Math.floor(selected?.duration_seconds ?? 0));
  const trimValidationMessage =
    !Number.isInteger(startValue) || !Number.isInteger(endValue)
      ? "Enter whole seconds."
      : startValue < 0 ||
          endValue > (selected?.duration_seconds ?? 0)
        ? "The values must be within the video duration."
        : startValue >= endValue || endValue - startValue < 1
          ? "The start must be before the end and the interval must be at least 1 second."
          : startValue === 0 &&
              endValue >= Math.floor(selected?.duration_seconds ?? 0)
            ? "The full interval would not create a different video."
            : "";

  const trimStatus = useQuery({
    queryKey: ["videoTrim", session.user._id, projectId, trimJob?._id],
    queryFn: ({ signal }) =>
      fetchVideoTrim({
        uid: session.user._id,
        pid: projectId,
        token: session.token,
        trimId: trimJob!._id,
        signal,
      }),
    enabled: Boolean(trimJob?._id) &&
      (trimJob?.state === "queued" || trimJob?.state === "processing"),
    refetchInterval: 1000,
  });

  const cancelTrim = useMutation({
    mutationFn: () =>
      cancelVideoTrim({
        uid: session.user._id,
        pid: projectId,
        token: session.token,
        trimId: trimJob!._id,
      }),
    onSuccess: (job) => {
      notifiedTrimId.current = job._id;
      activeTrimToast.current?.dismiss();
      activeTrimToast.current = null;
      toast({
        title: "Video trim cancelled",
        description: "The video trim request was cancelled.",
        duration: 6000,
      });
      setTrimJob(null);
    },
  });

  const startTrim = useMutation({
    mutationFn: () =>
      startVideoTrim({
        uid: session.user._id,
        pid: projectId,
        token: session.token,
        videoId: selected!._id,
        startSeconds: Number(trimStart),
        endSeconds: Number(trimEnd),
        outputFormat: trimFormat,
      }),
    onSuccess: (job) => {
      setTrimJob(job);
      activeTrimToast.current?.dismiss();
      activeTrimToast.current = toast({
        title: "Video trim queued",
        description: "The video trim is running in the background.",
        duration: 1000000,
        action: (
          <ToastAction
            altText="Cancel video trim"
            onClick={() => cancelTrim.mutate()}
          >
            Cancel
          </ToastAction>
        ),
      });
    },
  });

  useEffect(() => {
    const job = trimStatus.data;
    if (job) setTrimJob(job);
    if (
      job &&
      ["queued", "processing"].includes(job.state) &&
      activeTrimToast.current
    ) {
      activeTrimToast.current.update({
        title: job.state === "queued" ? "Video trim queued" : "Trimming video",
        description: `${trimStateLabel(job.state)} (${job.progress}%)`,
        duration: 1000000,
        action: (
          <ToastAction
            altText="Cancel video trim"
            onClick={() => cancelTrim.mutate()}
          >
            Cancel
          </ToastAction>
        ),
      });
    }
    if (
      job &&
      ["completed", "failed", "cancelled"].includes(job.state) &&
      notifiedTrimId.current !== job._id
    ) {
      notifiedTrimId.current = job._id;
      activeTrimToast.current?.dismiss();
      activeTrimToast.current = null;
      if (job.state === "completed") {
        const notification = toast({
          title: "Video trim completed",
          description: "The trimmed video is now available in the project.",
        });
        notification.update({
          title: "Video trim completed",
          description: "The trimmed video is now available in the project.",
          duration: 6000,
          action: (
            <ToastAction
              altText="Open trimmed video"
              onClick={() => {
                void refetchVideos().then(() =>
                  setSelectedId(job.result_video_id),
                );
              }}
            >
              Open video
            </ToastAction>
          ),
        });
        void refetchVideos();
        window.dispatchEvent(new Event("session-updated"));
      } else {
        const notification = toast({
          title:
            job.state === "failed"
              ? "Video trim failed"
              : "Video trim cancelled",
          description:
            job.error ||
            (job.state === "failed"
              ? "The video could not be trimmed."
              : "The video trim request was cancelled."),
          variant: job.state === "failed" ? "destructive" : "default",
        });
        notification.update({ duration: 6000 });
      }
      setTrimJob(null);
    }
  }, [cancelTrim, trimStatus.data, refetchVideos, toast]);

  useEffect(() => {
    setPlaybackFailed(false);
  }, [selected?._id, selected?.video_url]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b p-4">
        <SidebarTrigger
          variant="outline"
          className="h-9 w-10 lg:hidden"
        />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">
            {projectName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Video project
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {videos.isPending ? (
          <p role="status">Loading videos…</p>
        ) : videos.isError ? (
          <div role="alert" className="space-y-3">
            <p className="text-red-500">
              {errorMessage(videos.error)}
            </p>
            <Button
              variant="outline"
              onClick={() => void videos.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : !selected ? (
          <p className="text-muted-foreground">
            This project has no completed videos yet.
          </p>
        ) : (
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
            <section className="overflow-hidden rounded-lg border lg:col-start-2 lg:row-start-1">
              <video
                key={`${selected._id}:${selected.video_url ?? ""}`}
                src={selected.video_url ?? undefined}
                poster={selected.thumbnail_url ?? undefined}
                controls
                playsInline
                preload="none"
                aria-label={`Play ${selected.name}`}
                className="aspect-video max-h-[60vh] w-full bg-black object-contain"
                onError={() => setPlaybackFailed(true)}
              >
                Your browser does not support video playback.
              </video>

              <div className="space-y-2 p-4">
                <h2 className="break-all font-semibold">
                  {selected.name}
                </h2>

                <p className="text-sm text-muted-foreground">
                  {selected.format.toUpperCase()}
                  {" · "}
                  {selected.duration_seconds.toFixed(1)} s
                  {" · "}
                  {(selected.size_bytes / 1_000_000).toFixed(2)} MB
                </p>

                {(!selected.video_url || playbackFailed) && (
                  <div role="alert" className="space-y-2">
                    <p className="text-sm text-red-500">
                      The video could not be played. Refresh the URL and try
                      again. The codec may not be supported by your browser.
                    </p>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={videos.isFetching}
                      onClick={() => void videos.refetch()}
                    >
                      Refresh video
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <aside
  aria-label="Video tools"
  className="self-start rounded-lg border p-4 lg:sticky lg:top-4 lg:col-start-1 lg:row-start-1 lg:row-span-2"
>
  <h2 className="font-semibold">Video tools</h2>

  <p className="mt-2 break-all text-xs text-muted-foreground">
    Selected video: {selected.name}
  </p>

  <div className="mt-4 flex flex-col gap-3">
    <Button
      type="button"
      variant="outline"
      className="w-full justify-start"
      disabled={Boolean(trimJob && ["queued", "processing"].includes(trimJob.state))}
      onClick={() => {
        setTrimEnd(String(Math.max(1, Math.floor(selected.duration_seconds))));
        setTrimFormat(selected.format);
        setTrimOpen(true);
      }}
    >
      Trim
    </Button>
    <Button
      type="button"
      variant="outline"
      className="w-full justify-start"
      disabled
    >
      Filters
    </Button>
    <Button
      type="button"
      variant="outline"
      className="w-full justify-start"
      disabled
    >
      Subtitles
    </Button>
  </div>

  {trimOpen && (
    <form
      className="mt-4 space-y-3 border-t pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTrim.mutate();
      }}
    >
      <p className="text-sm font-medium">Interval (seconds)</p>
      <p className="text-xs text-muted-foreground">
        Original duration: {selected.duration_seconds.toFixed(1)} s
        {" · "}
        Result: {validTrimInterval ? `${endValue - startValue} s` : "—"}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">
          Start
          <input
            className="mt-1 w-full rounded border bg-background p-2 text-sm"
            type="number"
            min="0"
            step="1"
            value={trimStart}
            onChange={(event) => setTrimStart(event.target.value)}
          />
        </label>
        <label className="text-xs">
          End
          <input
            className="mt-1 w-full rounded border bg-background p-2 text-sm"
            type="number"
            min="1"
            step="1"
            value={trimEnd}
            onChange={(event) => setTrimEnd(event.target.value)}
          />
        </label>
      </div>
      <label className="block text-xs">
        Output format
        <select
          className="mt-1 w-full rounded border bg-background p-2 text-sm"
          value={trimFormat}
          onChange={(event) => setTrimFormat(event.target.value as "mp4" | "mov")}
        >
          <option value="mp4">MP4</option>
          <option value="mov">MOV</option>
        </select>
      </label>
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={startTrim.isPending || !validTrimInterval}
        >
          Start trim
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setTrimOpen(false)}>
          Close
        </Button>
      </div>
      {!validTrimInterval && (
        <p className="text-xs text-red-500">{trimValidationMessage}</p>
      )}
      {startTrim.isError && <p role="alert" className="text-xs text-red-500">{errorMessage(startTrim.error)}</p>}
    </form>
  )}

</aside>

            <section className="min-w-0 lg:col-start-2 lg:row-start-2">
              <h2 className="mb-3 font-semibold">
                Project videos ({items.length})
              </h2>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {items.map((video) => (
                  <button
                    key={video._id}
                    type="button"
                    aria-pressed={selected._id === video._id}
                    onClick={() => setSelectedId(video._id)}
                    className={`overflow-hidden rounded-lg border text-left ${
                      selected._id === video._id
                        ? "border-primary ring-2 ring-primary"
                        : "border-border"
                    }`}
                  >
                    <div className="flex aspect-video items-center justify-center bg-muted">
                      {video.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={video.thumbnail_url}
                          alt={`Miniatura de ${video.name}`}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No thumbnail
                        </span>
                      )}
                    </div>

                    <div className="p-3">
                      <p
                        className="truncate text-sm font-medium"
                        title={video.name}
                      >
                        {video.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {video.duration_seconds.toFixed(1)} s
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}