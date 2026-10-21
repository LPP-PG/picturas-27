"use client";

import { createContext, useContext, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useVideoJobToasts } from "@/hooks/use-video-job-toasts";
import {
  cancelVideoFilter,
  cancelVideoSubtitles,
  fetchVideoFilter,
  fetchVideoSubtitles,
  type VideoFilterJob,
  type VideoSubtitleJob,
} from "@/lib/videos";
import { useSession } from "@/providers/session-provider";

interface VideoJobsContextValue {
  trackFilter: (job: VideoFilterJob, projectId: string) => void;
  trackSubtitles: (job: VideoSubtitleJob, projectId: string) => void;
}

const VideoJobsContext = createContext<VideoJobsContextValue | undefined>(
  undefined,
);

// Segue os pedidos de filtros e legendas em todo o dashboard, como o
// VideoTrimProvider: a notificação de progresso mantém-se ao mudar de página
export function VideoJobsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  // Progresso dos filtros
  const filterJobs = useVideoJobToasts<VideoFilterJob>({
    queryKey: ["videoFilterJob", session.user._id],
    name: "Video filter",
    processingTitle: "Applying video filter",
    fetchJob: ({ id, projectId: pid }, signal) =>
      fetchVideoFilter({
        uid: session.user._id,
        pid,
        token: session.token,
        filterId: id,
        signal,
      }),
    cancelJob: ({ id, projectId: pid }) =>
      cancelVideoFilter({
        uid: session.user._id,
        pid,
        token: session.token,
        filterId: id,
      }),
    onFinished: (job, pid) => {
      // Pedido terminado: a operação foi consumida ou devolvida
      window.dispatchEvent(new Event("session-updated"));
      void queryClient.invalidateQueries({
        queryKey: ["videoFilter", session.user._id, pid, job.source_video_id],
      });

      if (job.state === "completed") {
        void queryClient.invalidateQueries({
          queryKey: ["projectVideos", session.user._id, pid],
        });
        toast({
          title: "Video filter completed",
          description: "The filtered video is now available in the project.",
          duration: 6000,
          action: (
            <ToastAction
              altText="Open filtered video"
              onClick={() =>
                router.push(
                  `/dashboard/${pid}?video=${encodeURIComponent(job.result_video_id)}`,
                )
              }
            >
              Open video
            </ToastAction>
          ),
        });
      } else if (job.state === "failed") {
        toast({
          title: "Video filter failed",
          description:
            job.error ||
            "The video filter could not be applied. Please try again.",
          variant: "destructive",
          duration: 6000,
        });
      } else {
        toast({
          title: "Video filter cancelled",
          description: "The video filter request was cancelled.",
          duration: 6000,
        });
      }
    },
  });
  const { track: trackFilter } = filterJobs;

  // Progresso das legendas
  const subtitleJobs = useVideoJobToasts<VideoSubtitleJob>({
    queryKey: ["videoSubtitleJob", session.user._id],
    name: "Subtitle generation",
    processingTitle: "Generating subtitles",
    fetchJob: ({ id, projectId: pid }, signal) =>
      fetchVideoSubtitles({
        uid: session.user._id,
        pid,
        token: session.token,
        subtitleId: id,
        signal,
      }),
    cancelJob: ({ id, projectId: pid }) =>
      cancelVideoSubtitles({
        uid: session.user._id,
        pid,
        token: session.token,
        subtitleId: id,
      }),
    onFinished: (job, pid) => {
      // Pedido terminado: a operação foi consumida ou devolvida
      window.dispatchEvent(new Event("session-updated"));
      void queryClient.invalidateQueries({
        queryKey: ["videoSubtitles", session.user._id, pid, job.video_id],
      });

      if (job.state === "completed") {
        void queryClient.invalidateQueries({
          queryKey: ["subtitlesVtt", session.user._id, pid, job.video_id],
        });
        void queryClient.invalidateQueries({
          queryKey: ["projectVideos", session.user._id, pid],
        });
        toast({
          title: "Subtitles ready",
          description: "The subtitles were added to the video.",
          duration: 6000,
        });
      } else if (job.state === "failed") {
        toast({
          title: "Subtitle generation failed",
          description:
            job.error || "Could not generate subtitles. Please try again.",
          variant: "destructive",
          duration: 6000,
        });
      } else {
        toast({
          title: "Subtitle generation cancelled",
          description: "The subtitle request was cancelled.",
          duration: 6000,
        });
      }
    },
  });
  const { track: trackSubtitles } = subtitleJobs;

  const value = useMemo(
    () => ({ trackFilter, trackSubtitles }),
    [trackFilter, trackSubtitles],
  );

  return (
    <VideoJobsContext.Provider value={value}>
      {children}
    </VideoJobsContext.Provider>
  );
}

export function useVideoJobs() {
  const context = useContext(VideoJobsContext);
  if (!context) {
    throw new Error("useVideoJobs must be used within VideoJobsProvider");
  }
  return context;
}
