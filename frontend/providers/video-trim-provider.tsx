"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import {
  cancelVideoTrim,
  fetchVideoTrim,
  type VideoTrimJob,
} from "@/lib/videos";
import { useSession } from "@/providers/session-provider";

interface TrackedTrim {
  projectId: string;
  job: VideoTrimJob;
}

interface VideoTrimContextValue {
  registerTrim: (projectId: string, job: VideoTrimJob) => void;
  hasActiveTrim: boolean;
}

const VideoTrimContext = createContext<VideoTrimContextValue | undefined>(
  undefined,
);

function storageKey(userId: string): string {
  return `picturas-video-trims:${userId}`;
}

function isTrackedTrim(value: unknown): value is TrackedTrim {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<TrackedTrim>;
  return (
    typeof item.projectId === "string" &&
    Boolean(item.job) &&
    typeof item.job?._id === "string" &&
    ["queued", "processing"].includes(item.job.state)
  );
}

function sameJob(left: VideoTrimJob, right: VideoTrimJob): boolean {
  return (
    left._id === right._id &&
    left.state === right.state &&
    left.progress === right.progress &&
    left.cancel_requested === right.cancel_requested &&
    left.error === right.error &&
    left.result_video_id === right.result_video_id
  );
}

function cancelError(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data &&
    "error" in error.response.data &&
    typeof error.response.data.error === "string"
  ) {
    return error.response.data.error;
  }
  return "The video trim could not be cancelled.";
}

export function VideoTrimProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [trims, setTrims] = useState<TrackedTrim[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const toastRefs = useRef(new Map<string, ReturnType<typeof toast>>());
  const notifiedIds = useRef(new Set<string>());
  const renderedToastStates = useRef(new Map<string, string>());

  useEffect(() => {
    const stored = localStorage.getItem(storageKey(session.user._id));
    if (!stored) {
      setLoadedUserId(session.user._id);
      return;
    }

    try {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setTrims(parsed.filter(isTrackedTrim));
      }
    } catch {
      localStorage.removeItem(storageKey(session.user._id));
    }
    setLoadedUserId(session.user._id);
  }, [session.user._id]);

  useEffect(() => {
    if (loadedUserId !== session.user._id) return;
    localStorage.setItem(storageKey(session.user._id), JSON.stringify(trims));
  }, [loadedUserId, session.user._id, trims]);

  const removeTrim = useCallback((trimId: string) => {
    setTrims((current) => current.filter((item) => item.job._id !== trimId));
  }, []);

  const cancelTrim = useCallback(
    async (trim: TrackedTrim) => {
      await cancelVideoTrim({
        uid: session.user._id,
        pid: trim.projectId,
        token: session.token,
        trimId: trim.job._id,
      });
      toastRefs.current.get(trim.job._id)?.dismiss();
      toastRefs.current.delete(trim.job._id);
      renderedToastStates.current.delete(trim.job._id);
      removeTrim(trim.job._id);
      // A operação foi devolvida: atualizar o contador
      window.dispatchEvent(new Event("session-updated"));
      toast({
        title: "Video trim cancelled",
        description: "The video trim request was cancelled.",
        duration: 6000,
      });
    },
    [removeTrim, session.token, session.user._id, toast],
  );

  const trimStatuses = useQueries({
    queries: trims.map((trim) => ({
      queryKey: ["videoTrim", session.user._id, trim.projectId, trim.job._id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchVideoTrim({
          uid: session.user._id,
          pid: trim.projectId,
          token: session.token,
          trimId: trim.job._id,
          signal,
        }),
      refetchInterval: 1000,
    })),
  });

  useEffect(() => {
    const refreshed = trimStatuses
      .map((status) => status.data)
      .filter((job): job is VideoTrimJob => Boolean(job));

    refreshed.forEach((job) => {
      const tracked = trims.find((item) => item.job._id === job._id);
      if (!tracked) return;

      const activeToast = toastRefs.current.get(job._id);
      const toastState = `${job.state}:${job.progress}`;
      if (
        ["queued", "processing"].includes(job.state) &&
        activeToast &&
        renderedToastStates.current.get(job._id) !== toastState
      ) {
        renderedToastStates.current.set(job._id, toastState);
        activeToast.update({
          title: job.state === "queued" ? "Video trim queued" : "Trimming video",
          description: `${job.state === "queued" ? "Queued" : "Processing"} (${job.progress}%)`,
          duration: 1000000,
          action: (
            <ToastAction
              altText="Cancel video trim"
              onClick={() =>
                void cancelTrim(tracked).catch((error: unknown) => {
                  toast({
                    title: "Video trim cancellation failed",
                    description: cancelError(error),
                    variant: "destructive",
                    duration: 6000,
                  });
                })
              }
            >
              Cancel
            </ToastAction>
          ),
        });
      }

      if (
        ["completed", "failed", "cancelled"].includes(job.state) &&
        !notifiedIds.current.has(job._id)
      ) {
        notifiedIds.current.add(job._id);
        renderedToastStates.current.delete(job._id);
        // Pedido terminado: a operação foi consumida ou devolvida
        window.dispatchEvent(new Event("session-updated"));
        activeToast?.dismiss();
        toastRefs.current.delete(job._id);
        if (job.state === "completed") {
          void queryClient.invalidateQueries({
            queryKey: [
              "projectVideos",
              session.user._id,
              tracked.projectId,
              session.token,
            ],
          });
          toast({
            title: "Video trim completed",
            description: "The trimmed video is now available in the project.",
            duration: 6000,
            action: (
              <ToastAction
                altText="Open trimmed video"
                onClick={() => {
                  void queryClient
                    .invalidateQueries({
                      queryKey: [
                        "projectVideos",
                        session.user._id,
                        tracked.projectId,
                        session.token,
                      ],
                    })
                    .then(() =>
                      router.push(
                        `/dashboard/${tracked.projectId}?video=${encodeURIComponent(job.result_video_id)}`,
                      ),
                    );
                }}
              >
                Open video
              </ToastAction>
            ),
          });
        } else {
          toast({
            title:
              job.state === "failed"
                ? "Video trim failed"
                : "Video trim cancelled",
            description:
              job.error ||
              (job.state === "failed"
                ? "The video could not be trimmed."
                : "The video trim request was cancelled."),
            duration: 6000,
            variant: job.state === "failed" ? "destructive" : "default",
          });
        }
        removeTrim(job._id);
      }
    });

    if (refreshed.length > 0) {
      setTrims((current) => {
        let changed = false;
        const next = current.map((item) => {
          const job = refreshed.find((candidate) => candidate._id === item.job._id);
          if (job && !sameJob(item.job, job)) {
            changed = true;
            return { ...item, job };
          }
          return item;
        });
        return changed ? next : current;
      });
    }
  }, [
    cancelTrim,
    queryClient,
    removeTrim,
    router,
    session.token,
    session.user._id,
    toast,
    trimStatuses,
    trims,
  ]);

  const registerTrim = useCallback((projectId: string, job: VideoTrimJob) => {
    const tracked = { projectId, job };
    setTrims((current) => [
      ...current.filter((item) => item.job._id !== job._id),
      tracked,
    ]);
    const notification = toast({
      title: "Video trim queued",
      description: "The video trim is running in the background.",
      duration: 1000000,
      action: (
        <ToastAction
          altText="Cancel video trim"
          onClick={() =>
            void cancelTrim(tracked).catch((error: unknown) => {
              toast({
                title: "Video trim cancellation failed",
                description: cancelError(error),
                variant: "destructive",
                duration: 6000,
              });
            })
          }
        >
          Cancel
        </ToastAction>
      ),
    });
    toastRefs.current.set(job._id, notification);
    renderedToastStates.current.set(job._id, `queued:${job.progress}`);
    // A operação fica reservada: atualizar o contador
    window.dispatchEvent(new Event("session-updated"));
  }, [cancelTrim, toast]);

  const value = useMemo(
    () => ({
      registerTrim,
      hasActiveTrim: trims.some((item) =>
        ["queued", "processing"].includes(item.job.state),
      ),
    }),
    [registerTrim, trims],
  );

  return (
    <VideoTrimContext.Provider value={value}>
      {children}
    </VideoTrimContext.Provider>
  );
}

export function useVideoTrim() {
  const context = useContext(VideoTrimContext);
  if (!context) {
    throw new Error("useVideoTrim must be used within VideoTrimProvider");
  }
  return context;
}
