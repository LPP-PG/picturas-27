"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  deleteProjectVideo,
  fetchProjectVideos,
  type ProjectVideo,
} from "@/lib/videos";
import { useSession } from "@/providers/session-provider";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import NewProjectDialog from "@/components/dashboard-sidebar/new-project-dialog";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { deleteProject, type Project } from "@/lib/projects";

interface VideoProjectEditorProps {
  projectId: string;
  projectName: string;
}

function errorMessage(error: unknown, fallback: string): string {
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
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playbackFailed, setPlaybackFailed] = useState(false);

  const queryKey = [
    "projectVideos",
    session.user._id,
    projectId,
    session.token,
  ];

  const videos = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      fetchProjectVideos({
        uid: session.user._id,
        pid: projectId,
        token: session.token,
        signal,
      }),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });

  const items = videos.data ?? [];
  const selected =
    items.find((video) => video._id === selectedId) ?? items[0];

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

      const project = response.data.find(
        (item) => item._id === projectId,
      );

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
              "This is the last video in the project. " +
              "The video, its thumbnail and the project will be permanently deleted."
          : `Delete "${video.name}"?\n\n` +
              "The video and its thumbnail will be permanently deleted.",
      );

      if (!confirmed) return "cancelled";

      if (deleteWholeProject) {
        await deleteProject({
          uid: session.user._id,
          pid: projectId,
          token: session.token,
          projectVersion: project.version,
        });

        return "project";
      }

      await deleteProjectVideo({
        uid: session.user._id,
        pid: projectId,
        token: session.token,
        videoId: video._id,
      });

      return "video";
    },

    onSuccess: async (result, deletedVideo) => {
      if (result === "cancelled") return;

      await queryClient.cancelQueries({ queryKey });

      if (result === "project") {
        queryClient.removeQueries({ queryKey });
        router.replace("/dashboard");

        await queryClient.invalidateQueries({
          queryKey: ["projects"],
        });

        return;
      }

      queryClient.setQueryData<ProjectVideo[]>(
        queryKey,
        (current) =>
          current?.filter(
            (video) => video._id !== deletedVideo._id,
          ),
      );

      const index = items.findIndex(
        (video) => video._id === deletedVideo._id,
      );

      const remaining = items.filter(
        (video) => video._id !== deletedVideo._id,
      );

      setSelectedId(
        remaining[index]?._id ?? remaining[0]?._id ?? null,
      );

      await queryClient.invalidateQueries();
    },
  });

  useEffect(() => {
    setPlaybackFailed(false);
  }, [selected?._id, selected?.video_url]);

  function confirmDeletion() {
    if (!selected || deletion.isPending) return;
    deletion.mutate(selected);
  }

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
            existingProject={{
              id: projectId,
              name: projectName,
            }}
          >
            <Button disabled={deletion.isPending}>
              Add videos
            </Button>
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
              {errorMessage(
                videos.error,
                "Could not load the project videos.",
              )}
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
            This project has no completed videos.
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
                      Could not play this video. Refresh the video and
                      try again. Its codec may not be supported by
                      your browser.
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
                  variant="outline"
                  className="w-full justify-start"
                  disabled
                >
                  Trim
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled
                >
                  Filters
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled
                >
                  Subtitles
                </Button>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                These tools are under development.
              </p>
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
                      setSelectedId(video._id);
                      deletion.reset();
                    }}
                    className={`overflow-hidden rounded-lg border text-left disabled:opacity-60 ${
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