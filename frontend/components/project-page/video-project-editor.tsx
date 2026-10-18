"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  deleteProjectVideo,
  fetchProjectVideos,
  startVideoTrim,
  startVideoFilter,
  fetchVideoFilter,
  cancelVideoFilter,
  startVideoSubtitles,
  fetchLatestVideoSubtitles,
  cancelVideoSubtitles,
  fetchSubtitlesVtt,
  type SubtitleLanguage,
  type VideoSubtitleJob,
  type ProjectVideo,
  type VideoTrimJob,
  type VideoFilterName,
  type VideoFilterJob,
} from "@/lib/videos";
import { useSession } from "@/providers/session-provider";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import NewProjectDialog from "@/components/dashboard-sidebar/new-project-dialog";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { api } from "@/lib/axios";
import { deleteProject, type Project } from "@/lib/projects";
import { useVideoTrim } from "@/providers/video-trim-provider";
import { useToast } from "@/hooks/use-toast";

interface VideoProjectEditorProps {
  projectId: string;
  projectName: string;
}

const NO_AUDIO_MESSAGE = "No audio track was found in this video.";

const SUBTITLE_LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  pt: "Portuguese",
  es: "Spanish",
  fr: "French",
};

const REPLACE_SUBTITLES_MESSAGE =
  "This video already has subtitles. They will be replaced only if the new generation completes. Continue?";

const SUBTITLE_STATE_LABELS: Record<VideoSubtitleJob["state"], string> = {
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

function errorMessage(
  error: unknown,
  fallback = "Could not load the project videos.",
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data?.error === "string") return data.error;
    if (typeof data === "string") return data;
  }

  return error instanceof Error ? error.message : fallback;
}

export default function VideoProjectEditor({
  projectId,
  projectName,
}: VideoProjectEditorProps) {
  const session = useSession();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { registerTrim } = useVideoTrim();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const [trimOpen, setTrimOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] =
    useState<VideoFilterName>("grayscale");
  const [filterJob, setFilterJob] = useState<VideoFilterJob | null>(null);
  const [subtitlesOpen, setSubtitlesOpen] = useState(false);
  const [subtitleLanguage, setSubtitleLanguage] =
    useState<SubtitleLanguage>("auto");
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const subtitleTrackRef = useRef<HTMLTrackElement | null>(null);
  const [trimStart, setTrimStart] = useState("0");
  const [trimEnd, setTrimEnd] = useState("");
  const [trimFormat, setTrimFormat] = useState<"mp4" | "mov">("mp4");
  const manualSelectionRef = useRef<string | null>(null);
  // Pedidos de legendas vistos ativos e já notificados (um aviso por pedido)
  const activeSubtitleIdsRef = useRef(new Set<string>());
  const notifiedSubtitleIdsRef = useRef(new Set<string>());

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
  const requestedVideoId = searchParams.get("video");
  const preferredVideoId =
    manualSelectionRef.current ?? requestedVideoId ?? selectedId;
  const selected =
    items.find((video) => video._id === preferredVideoId) ?? items[0];
  const queryKey = [
    "projectVideos",
    session.user._id,
    projectId,
    session.token,
  ];

  const startFilter = useMutation({
    mutationFn: async () => {
      if (!selected) {
        throw new Error("Please select a video first.");
      }

      return startVideoFilter({
        uid: session.user._id,
        pid: projectId,
        token: session.token,
        videoId: selected._id,
        filterName: selectedFilter,
      });
    },

    onSuccess: (job) => {
      setFilterJob(job);
    },
  });

  const filterStatus = useQuery({
    queryKey: [
      "videoFilter",
      session.user._id,
      projectId,
      filterJob?._id,
    ],

    queryFn: ({ signal }) =>
      fetchVideoFilter({
        uid: session.user._id,
        pid: projectId,
        token: session.token,
        filterId: filterJob!._id,
        signal,
      }),

    enabled: Boolean(filterJob?._id),

    refetchInterval: (query) => {
      const state = query.state.data?.state;

      return state === "queued" || state === "processing"
        ? 1000
        : false;
    },
  });

  const currentFilterJob = filterStatus.data ?? filterJob;

  const cancelFilter = useMutation({
    mutationFn: async () => {
      if (!filterJob) {
        throw new Error("No active filter request.");
      }

      return cancelVideoFilter({
        uid: session.user._id,
        pid: projectId,
        token: session.token,
        filterId: filterJob._id,
      });
    },

    onSuccess: (job) => {
      setFilterJob(job);

      queryClient.setQueryData(
        ["videoFilter", session.user._id, projectId, job._id],
        job,
      );
    },
  });

  useEffect(() => {
  if (filterStatus.data?.state === "completed") {
    void queryClient.invalidateQueries({
      queryKey: [
        "projectVideos",
        session.user._id,
        projectId,
        session.token,
      ],
    });
  }
}, [
  filterStatus.data?.state,
  filterStatus.data?._id,
  queryClient,
  session.user._id,
  projectId,
  session.token,
]);

  const subtitlesKey = [
    "videoSubtitles",
    session.user._id,
    projectId,
    selected?._id,
  ];

  const startSubtitles = useMutation({
    mutationFn: ({
      videoId,
      language,
    }: {
      videoId: string;
      language: SubtitleLanguage;
    }) =>
      startVideoSubtitles({
        uid: session.user._id,
        pid: projectId,
        token: session.token,
        videoId,
        language,
      }),

    onSuccess: (job) => {
      queryClient.setQueryData(
        ["videoSubtitles", session.user._id, projectId, job.video_id],
        job,
      );
      // A operação fica reservada: atualizar o contador
      window.dispatchEvent(new Event("session-updated"));
    },

    onError: (_error, { videoId }) => {
      // Atualizar o estado (ex.: pedido já ativo noutro separador)
      void queryClient.invalidateQueries({
        queryKey: ["videoSubtitles", session.user._id, projectId, videoId],
      });
    },
  });
  const { reset: resetStartSubtitles } = startSubtitles;

  const subtitleStatus = useQuery({
    queryKey: subtitlesKey,

    queryFn: ({ signal }) =>
      fetchLatestVideoSubtitles({
        uid: session.user._id,
        pid: projectId,
        token: session.token,
        videoId: selected!._id,
        signal,
      }),

    enabled: Boolean(selected?._id),

    refetchInterval: (query) => {
      const state = query.state.data?.state;

      return state === "queued" || state === "processing"
        ? 1000
        : false;
    },
  });

  const subtitleJob = subtitleStatus.data ?? null;
  const subtitleActive =
    subtitleJob?.state === "queued" || subtitleJob?.state === "processing";

  const cancelSubtitles = useMutation({
    mutationFn: async () => {
      if (!subtitleJob) {
        throw new Error("No active subtitle request.");
      }

      return cancelVideoSubtitles({
        uid: session.user._id,
        pid: projectId,
        token: session.token,
        subtitleId: subtitleJob._id,
      });
    },

    onSuccess: (job) => {
      queryClient.setQueryData(
        ["videoSubtitles", session.user._id, projectId, job.video_id],
        job,
      );
    },
  });

  const { reset: resetCancelSubtitles } = cancelSubtitles;

  useEffect(() => {
    if (!subtitleJob) return;

    if (subtitleJob.state === "queued" || subtitleJob.state === "processing") {
      activeSubtitleIdsRef.current.add(subtitleJob._id);
      return;
    }

    // Só tratar pedidos que foram vistos ativos neste ecrã
    if (!activeSubtitleIdsRef.current.has(subtitleJob._id)) return;

    // Pedido terminado: a operação foi consumida ou devolvida
    activeSubtitleIdsRef.current.delete(subtitleJob._id);
    window.dispatchEvent(new Event("session-updated"));

    if (
      subtitleJob.state === "completed" &&
      !notifiedSubtitleIdsRef.current.has(subtitleJob._id)
    ) {
      notifiedSubtitleIdsRef.current.add(subtitleJob._id);
      toast({
        title: "Subtitles ready",
        description: "The subtitles were added to the video.",
        duration: 6000,
      });
      void queryClient.invalidateQueries({
        queryKey: [
          "subtitlesVtt",
          session.user._id,
          projectId,
          subtitleJob.video_id,
        ],
      });
      void queryClient.invalidateQueries({
        queryKey: [
          "projectVideos",
          session.user._id,
          projectId,
          session.token,
        ],
      });
    }
  }, [
    subtitleJob,
    toast,
    queryClient,
    session.user._id,
    projectId,
    session.token,
  ]);

  // As legendas só são pedidas quando o vídeo as tem
  const subtitlesVtt = useQuery({
    queryKey: [
      "subtitlesVtt",
      session.user._id,
      projectId,
      selected?._id,
      selected?.subtitles_language,
    ],

    queryFn: ({ signal }) =>
      fetchSubtitlesVtt({
        uid: session.user._id,
        pid: projectId,
        token: session.token,
        videoId: selected!._id,
        signal,
      }),

    enabled: Boolean(selected?._id && selected.has_subtitles),
  });

  const vttData = selected?.has_subtitles ? subtitlesVtt.data : undefined;
  const subtitleTrackLanguage = vttData?.language;

  useEffect(() => {
    if (!vttData) {
      setSubtitleUrl(null);
      return;
    }

    const url = URL.createObjectURL(
      new Blob([vttData.vtt], { type: "text/vtt" }),
    );
    setSubtitleUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [vttData]);

  // Alguns navegadores ignoram "default" numa pista adicionada dinamicamente
  useEffect(() => {
    const element = subtitleTrackRef.current;
    if (!element || !subtitleUrl) return;

    const showTrack = () => {
      element.track.mode = "showing";
    };

    showTrack();
    element.addEventListener("load", showTrack);

    return () => element.removeEventListener("load", showTrack);
  }, [subtitleUrl, subtitleTrackLanguage, selected?._id, selected?.video_url]);

  useEffect(() => {
    resetStartSubtitles();
    resetCancelSubtitles();
  }, [selected?._id, resetStartSubtitles, resetCancelSubtitles]);

  function generateSubtitles() {
    if (!selected || startSubtitles.isPending || subtitleActive) return;
    if (selected.has_subtitles && !window.confirm(REPLACE_SUBTITLES_MESSAGE)) {
      return;
    }

    startSubtitles.mutate({
      videoId: selected._id,
      language: subtitleLanguage,
    });
  }

  const deletion = useMutation({
    mutationFn: async (video: ProjectVideo) => {
      const response = await api.get<Project[]>(
        `/projects/${encodeURIComponent(session.user._id)}`,
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        },
      );
      const project = response.data.find((item) => item._id === projectId);

      if (!project) {
        throw new Error("The project no longer exists.");
      }

      const videoIds = project.video_ids ?? [];
      if (!videoIds.includes(video._id)) {
        throw new Error(
          "This video is no longer in the project. Refresh and try again.",
        );
      }

      const deleteWholeProject = videoIds.length === 1;
      const confirmed = window.confirm(
        deleteWholeProject
          ? `Delete "${video.name}" and this project?\n\n` +
              "This is the last video in the project. The video, its thumbnail and the project will be permanently deleted."
          : `Delete "${video.name}"?\n\n` +
              "The video and its thumbnail will be permanently deleted.",
      );

      if (!confirmed) return "cancelled" as const;

      if (deleteWholeProject) {
        await deleteProject({
          uid: session.user._id,
          pid: projectId,
          token: session.token,
          projectVersion: project.version,
        });
        return "project" as const;
      }

      await deleteProjectVideo({
        uid: session.user._id,
        pid: projectId,
        token: session.token,
        videoId: video._id,
      });
      return "video" as const;
    },
    onSuccess: async (result, deletedVideo) => {
      if (result === "cancelled") return;

      await queryClient.cancelQueries({ queryKey });
      if (result === "project") {
        queryClient.removeQueries({ queryKey });
        router.replace("/dashboard");
        await queryClient.invalidateQueries({ queryKey: ["projects"] });
        return;
      }

      queryClient.setQueryData<ProjectVideo[]>(
        queryKey,
        (current) =>
          current?.filter((video) => video._id !== deletedVideo._id),
      );
      const index = items.findIndex(
        (video) => video._id === deletedVideo._id,
      );
      const remaining = items.filter(
        (video) => video._id !== deletedVideo._id,
      );
      setSelectedId(remaining[index]?._id ?? remaining[0]?._id ?? null);
      await queryClient.invalidateQueries();
    },
  });

  function confirmDeletion() {
    if (!selected || deletion.isPending) return;
    deletion.mutate(selected);
  }

  function clearVideoQueryParameter() {
    if (!searchParams.has("video")) return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("video");
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  useEffect(() => {
    if (
      requestedVideoId &&
      !manualSelectionRef.current &&
      items.some((video) => video._id === requestedVideoId) &&
      selectedId !== requestedVideoId
    ) {
      setSelectedId(requestedVideoId);
    }
    if (
      manualSelectionRef.current &&
      !searchParams.has("video")
    ) {
      manualSelectionRef.current = null;
    }
  }, [items, requestedVideoId, searchParams, selectedId]);

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
        registerTrim(projectId, job);
      },
  });

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
        <div className="ml-auto">
          <NewProjectDialog
            key={projectId}
            existingProject={{ id: projectId, name: projectName }}
          >
            <Button disabled={deletion.isPending}>Add videos</Button>
          </NewProjectDialog>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {deletion.isError && (
          <p role="alert" className="mb-4 text-sm text-red-500">
            {errorMessage(
              deletion.error,
              "Could not delete the video. Please try again.",
            )}
          </p>
        )}
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
                {subtitleUrl && subtitleTrackLanguage && (
                  <track
                    key={subtitleUrl}
                    ref={subtitleTrackRef}
                    kind="subtitles"
                    default
                    srcLang={subtitleTrackLanguage}
                    label={
                      SUBTITLE_LANGUAGE_NAMES[subtitleTrackLanguage] ??
                      subtitleTrackLanguage
                    }
                    src={subtitleUrl}
                  />
                )}
                Your browser does not support video playback.
              </video>

              <div className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-all font-semibold">
                      {selected.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.format.toUpperCase()}
                      {" · "}
                      {selected.duration_seconds.toFixed(1)} s
                      {" · "}
                      {(selected.size_bytes / 1_000_000).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deletion.isPending}
                    onClick={confirmDeletion}
                  >
                    {deletion.isPending ? "Deleting…" : "Delete video"}
                  </Button>
                </div>

                {(!selected.video_url || playbackFailed) && (
                  <div role="alert" className="space-y-2">
                    <p className="text-sm text-red-500">
                      The video could not be played. Refresh the URL and try
                      again. The codec may not be supported by your browser.
                    </p>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={videos.isFetching || deletion.isPending}
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
      onClick={() => setFiltersOpen(!filtersOpen)}
    >
      Filters
    </Button>
    <Button
      type="button"
      variant="outline"
      className="w-full justify-start"
      disabled={selected.has_audio === false}
      onClick={() => setSubtitlesOpen(!subtitlesOpen)}
    >
      Subtitles
    </Button>
    {selected.has_audio === false && (
      <p className="text-xs text-muted-foreground">{NO_AUDIO_MESSAGE}</p>
    )}
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


    {filtersOpen && (
      <div className="mt-4 space-y-3 border-t pt-4">
        <h3 className="text-sm font-medium">
          Apply video filter
        </h3>

        <label className="block text-xs">
          Choose a filter

          <select
            className="mt-1 w-full rounded border bg-background p-2 text-sm"
            value={selectedFilter}
            onChange={(event) =>
              setSelectedFilter(event.target.value as VideoFilterName)
            }
          >
            <option value="grayscale">Black and White</option>
            <option value="sepia">Sepia</option>
            <option value="vintage">Vintage</option>
            <option value="invert">Invert Colors</option>
            <option value="contrast">High Contrast</option>
            <option value="blur">Soft Blur</option>
          </select>
        </label>

        <Button
          type="button"
          disabled={
            startFilter.isPending ||
            ["queued", "processing"].includes(
              currentFilterJob?.state ?? ""
            )
          }
          onClick={() => startFilter.mutate()}
        >
          {startFilter.isPending ? "Starting..." : "Apply Filter"}
        </Button>
        {startFilter.isError && (
          <p role="alert" className="text-xs text-red-500">
            {errorMessage(startFilter.error, "Could not start video filter.")}
          </p>
        )}


        {currentFilterJob && (
          <div className="rounded border p-3 text-sm">
            <p>Status: {currentFilterJob.state}</p>

            <p>Progress: {currentFilterJob.progress}%</p>

            {["queued", "processing"].includes(currentFilterJob.state) && (
              <Button
                type="button"
                variant="outline"
                disabled={cancelFilter.isPending}
                onClick={() => cancelFilter.mutate()}
              >
                {cancelFilter.isPending ? "Cancelling..." : "Cancel"}
              </Button>
            )}

            {currentFilterJob.error && (
              <p role="alert" className="text-red-500">
                {currentFilterJob.error}
              </p>
            )}
          </div>
        )}

      </div>
    )}

    {subtitlesOpen && selected.has_audio !== false && (
      <div className="mt-4 space-y-3 border-t pt-4">
        <h3 className="text-sm font-medium">Generate subtitles</h3>

        <label className="block text-xs">
          Spoken language

          <select
            className="mt-1 w-full rounded border bg-background p-2 text-sm"
            value={subtitleLanguage}
            onChange={(event) =>
              setSubtitleLanguage(event.target.value as SubtitleLanguage)
            }
          >
            <option value="auto">Detect automatically</option>
            <option value="en">English</option>
            <option value="pt">Portuguese</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </label>

        <Button
          type="button"
          disabled={startSubtitles.isPending || subtitleActive}
          onClick={generateSubtitles}
        >
          {startSubtitles.isPending ? "Starting..." : "Generate subtitles"}
        </Button>
        {startSubtitles.isError && (
          <p role="alert" className="text-xs text-red-500">
            {errorMessage(
              startSubtitles.error,
              "Could not start subtitle generation.",
            )}
          </p>
        )}

        {subtitleJob && (
          <div className="rounded border p-3 text-sm">
            <p>Status: {SUBTITLE_STATE_LABELS[subtitleJob.state]}</p>

            {subtitleActive && <p>Progress: {subtitleJob.progress}%</p>}

            {subtitleActive && (
              <Button
                type="button"
                variant="outline"
                disabled={cancelSubtitles.isPending}
                onClick={() => cancelSubtitles.mutate()}
              >
                {cancelSubtitles.isPending ? "Cancelling..." : "Cancel"}
              </Button>
            )}

            {subtitleJob.state === "failed" && (
              <p role="alert" className="text-red-500">
                {subtitleJob.error ||
                  "Could not generate subtitles. Please try again."}
              </p>
            )}

            {cancelSubtitles.isError && (
              <p role="alert" className="text-red-500">
                {errorMessage(
                  cancelSubtitles.error,
                  "Could not cancel subtitle generation.",
                )}
              </p>
            )}
          </div>
        )}
      </div>
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
                    disabled={deletion.isPending}
                    aria-pressed={selected._id === video._id}
                    onClick={() => {
                      manualSelectionRef.current = video._id;
                      setSelectedId(video._id);
                      clearVideoQueryParameter();
                      deletion.reset();
                    }}
                    className={`overflow-hidden rounded-lg border-2 text-left disabled:opacity-60 ${
                      selected._id === video._id
                        ? "border-primary"
                        : "border-border"
                    }`}
                  >
                    <div className="flex aspect-video items-center justify-center bg-muted">
                      {video.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={video.thumbnail_url}
                          alt={`Thumbnail for ${video.name}`}
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