"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { addProject } from "@/lib/projects";
import {
  cancelVideoUpload,
  fetchVideoCapacity,
  fetchVideoUpload,
  reserveProjectVideos,
  startVideoUpload,
  uploadProjectVideo,
  type VideoCapacity,
  type VideoUploadState,
} from "@/lib/videos";
import ImageSubmissionArea from "../image-submission-area";
import { useSession } from "@/providers/session-provider";
import { FileVideo, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";

interface SelectedVideo {
  id: string;
  file: File;
  state: VideoUploadState;
  progress: number;
  error: string;
  eligible: boolean;
  duration: number | null;
  checking: boolean;
  uploadId?: string;
  cleanupPending?: boolean;
}

const labels: Record<VideoUploadState, string> = {
  waiting: "Queued",
  uploading: "Uploading",
  validating: "Validating",
  thumbnail: "Preparing thumbnail",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const terminalStates = new Set<VideoUploadState>([
  "completed",
  "failed",
  "cancelled",
]);

function getMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (typeof error.response?.data?.error === "string") {
      return error.response.data.error;
    }
  }

  return error instanceof Error
    ? error.message
    : "Could not complete the operation.";
}

function formatBytes(bytes: number): string {
  return bytes >= 1_000_000_000
    ? `${(bytes / 1_000_000_000).toFixed(2)} GB`
    : `${(bytes / 1_000_000).toFixed(2)} MB`;
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function readLocalDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    let settled = false;

    const finish = (duration: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(duration);
    };

    const timer = window.setTimeout(() => finish(null), 12000);

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      finish(
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : null,
      );
    };
    video.onerror = () => finish(null);
    video.src = url;
  });
}

export default function NewProjectDialog({
  files = [],
  setFiles,
  children,
  existingProject,
}: {
  files?: File[];
  setFiles?: (files: File[]) => void;
  children: React.ReactNode;
  existingProject?: {
    id: string;
    name: string;
  };
}) {
  const { toast } = useToast();
  const router = useRouter();
  const qc = useQueryClient();
  const session = useSession();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(existingProject?.name ?? "");
const [mediaType, setMediaType] = useState<"image" | "video">(
  existingProject ? "video" : "image",
);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videos, setVideos] = useState<SelectedVideo[]>([]);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [videoDragging, setVideoDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [capacity, setCapacity] = useState<VideoCapacity | null>(null);
  const [capacityError, setCapacityError] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [skipIneligibleOpen, setSkipIneligibleOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const videosRef = useRef<SelectedVideo[]>([]);
  const projectIdRef = useRef<string | null>(
  existingProject?.id ?? null,
);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controllersRef = useRef(new Map<string, AbortController>());
  const cancelledRef = useRef(new Set<string>());
  const stopAllRef = useRef(false);
  const batchRef = useRef<Promise<void> | null>(null);
  const leaveActionRef = useRef<(() => void) | null>(null);
  const pollingRef = useRef(false);

  const allowedVideo =
    session.user.type === "free" || session.user.type === "premium";
  const premium = session.user.type === "premium";

  const request = {
    uid: session.user._id,
    token: session.token,
  };

  function replaceVideos(next: SelectedVideo[]) {
    videosRef.current = next;
    setVideos(next);
  }

  function updateVideo(id: string, changes: Partial<SelectedVideo>) {
    replaceVideos(
      videosRef.current.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    );
  }

async function refreshProjects() {
  await qc.invalidateQueries({
    queryKey: ["projects", session.user._id, session.token],
    refetchType: "all",
  });

  const pid = projectIdRef.current;

  if (pid) {
    await qc.invalidateQueries({
      queryKey: ["projectVideos", session.user._id, pid],
      refetchType: "all",
    });
  }
}

  async function refreshCapacity() {
    try {
      const response = await fetchVideoCapacity({
        ...request,
        pid: projectIdRef.current || undefined,
      });
      setCapacity(response);
      setCapacityError("");
    } catch (err) {
      setCapacity(null);
      setCapacityError(getMessage(err));
    }
  }

  useEffect(() => {
    if (files.length > 0) {
      setMediaType("image");
      setOpen(true);
    }
  }, [files]);

  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(previewFile);
    setPreviewUrl(url);
    setPreviewError("");

    return () => URL.revokeObjectURL(url);
  }, [previewFile]);

  useEffect(() => {
    if (!open || mediaType !== "video" || !allowedVideo) return;

    void refreshCapacity();
    const timer = window.setInterval(() => {
      void refreshCapacity();
    }, 15000);

    return () => window.clearInterval(timer);
    // A sessão é a fonte dos dados usados pela consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mediaType, session.user._id, session.token]);

  useEffect(() => {
    if (!busy || mediaType !== "video") return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        anchor.target === "_blank"
      ) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);

      if (url.href === window.location.href) return;

      event.preventDefault();
      event.stopPropagation();

      leaveActionRef.current = () => {
        if (url.origin === window.location.origin) {
          router.push(`${url.pathname}${url.search}${url.hash}`);
        } else {
          window.location.assign(url.href);
        }
      };

      setLeaveOpen(true);
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", handleNavigation, true);

    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", handleNavigation, true);
    };
  }, [busy, mediaType, router]);

  useEffect(() => {
    if (!open || mediaType !== "video") return;

    const poll = async () => {
      const pid = projectIdRef.current;
      if (!pid || pollingRef.current) return;

      const pending = videosRef.current.filter(
        (item) =>
          item.uploadId &&
          (!terminalStates.has(item.state) || item.cleanupPending),
      );

      if (pending.length === 0) return;
      pollingRef.current = true;

      try {
        await Promise.all(
          pending.map(async (item) => {
            try {
              const current = await fetchVideoUpload({
                ...request,
                pid,
                uploadId: item.uploadId!,
              });

              // Ignorar respostas de uma tentativa entretanto substituída.
              const local = videosRef.current.find(
                (video) => video.id === item.id,
              );
              if (local?.uploadId !== item.uploadId) return;

              updateVideo(item.id, {
                state: current.state,
                cleanupPending: current.cleanup_pending,
                error: current.error,
                ...(current.state === "completed"
                  ? { progress: 100 }
                  : {}),
              });
            } catch {
              // Uma falha de consulta não altera o resultado do upload.
            }
          }),
        );
      } finally {
        pollingRef.current = false;
      }
    };

    const timer = window.setInterval(() => void poll(), 1000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mediaType, session.user._id, session.token]);

  function resetForm() {
    setName(existingProject?.name ?? "");
    setMediaType(existingProject ? "video" : "image");
    setImageFiles([]);
    replaceVideos([]);
    setPreviewFile(null);
    setPreviewError("");
    setError("");
    setCapacity(null);
    projectIdRef.current = existingProject?.id ?? null;
    cancelledRef.current.clear();
    stopAllRef.current = false;
    setFiles?.([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen && busy) {
      if (mediaType === "video") {
        leaveActionRef.current = () => {
          setOpen(false);
          resetForm();
        };
        setLeaveOpen(true);
      }
      return;
    }

    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }

  async function selectVideos(selected: FileList | File[] | null) {
    if (!selected || busy) return;

    const maxSize = premium ? 1_000_000_000 : 100_000_000;

    const additions: SelectedVideo[] = Array.from(selected).map((file) => {
      let reason = "";

      if (!/\.(mp4|mov)$/i.test(file.name)) {
        reason = "Only MP4 or MOV videos are accepted.";
      } else if (file.size <= 0) {
        reason = "The file is empty.";
      } else if (file.size > maxSize) {
        reason = `The file exceeds ${premium ? "1 GB" : "100 MB"}.`;
      }

      return {
        id: crypto.randomUUID(),
        file,
        state: reason ? "failed" : "waiting",
        progress: 0,
        error: reason,
        eligible: !reason,
        duration: null,
        checking: !reason,
      };
    });

    replaceVideos([...videosRef.current, ...additions]);

    if (!previewFile && additions.length > 0) {
      setPreviewFile(additions[0].file);
    }

    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    await Promise.all(
      additions
        .filter((item) => item.eligible)
        .map(async (item) => {
          const duration = await readLocalDuration(item.file);
          const maxDuration = premium ? 600 : 60;
          // Se o navegador não ler o vídeo (codec não suportado), o ficheiro
          // continua elegível: é o servidor que valida o conteúdo (UPLOAD-041).
          const tooLong = duration !== null && duration > maxDuration;

          updateVideo(item.id, {
            duration,
            checking: false,
            ...(tooLong
              ? {
                  eligible: false,
                  state: "failed" as const,
                  error: `The video exceeds ${maxDuration} seconds.`,
                }
              : {}),
          });
        }),
    );
  }

  async function cancelItem(id: string) {
    cancelledRef.current.add(id);

    const item = videosRef.current.find((video) => video.id === id);
    const pid = projectIdRef.current;
    if (!item || item.state === "completed") return;

    if (!item.uploadId || !pid) {
      updateVideo(id, {
        state: "cancelled",
        error: "",
      });
      return;
    }

    try {
      const response = await cancelVideoUpload({
        ...request,
        pid,
        uploadId: item.uploadId,
      });

      controllersRef.current.get(id)?.abort();

      updateVideo(id, {
        state: response.state,
        cleanupPending: response.cleanup_pending,
        error: response.error,
      });
    } catch (err) {
      controllersRef.current.get(id)?.abort();
      updateVideo(id, {
        error: `Cancellation not confirmed: ${getMessage(err)}`,
      });
      throw err;
    }
  }

  async function cancelAll() {
    stopAllRef.current = true;

    const pending = videosRef.current.filter(
      (item) => !terminalStates.has(item.state),
    );

    await Promise.all(pending.map((item) => cancelItem(item.id)));
    await batchRef.current;

    await refreshCapacity();
    await refreshProjects();
  }

  async function leaveAndCancel() {
    setLeaving(true);
    setError("");

    try {
      await cancelAll();

      const pid = projectIdRef.current;

      // Confirmar que não há trabalho ativo antes de sair.
      for (;;) {
        const items = videosRef.current.filter((item) => item.uploadId);
        let pending = false;

        for (const item of items) {
          const current = await fetchVideoUpload({
            ...request,
            pid: pid!,
            uploadId: item.uploadId!,
          });

          updateVideo(item.id, {
            state: current.state,
            cleanupPending: current.cleanup_pending,
            error: current.error,
          });

          if (
            !terminalStates.has(current.state) ||
            current.cleanup_pending
          ) {
            pending = true;
          }
        }

        if (!pending) break;
        await wait(1000);
      }

      const action = leaveActionRef.current;
      leaveActionRef.current = null;
      setLeaveOpen(false);
      action?.();
    } catch (err) {
      setError(
        `Could not confirm cancellation. ${getMessage(err)}`,
      );
    } finally {
      setLeaving(false);
    }
  }

  async function retryItem(id: string) {
    const item = videosRef.current.find((video) => video.id === id);
    if (!item || busy || !item.eligible) return;

    try {
      if (item.uploadId && projectIdRef.current) {
        const current = await fetchVideoUpload({
          ...request,
          pid: projectIdRef.current,
          uploadId: item.uploadId,
        });

        if (current.state === "completed") {
          updateVideo(id, {
            state: "completed",
            progress: 100,
            error: "",
          });
          return;
        }

        if (
          !terminalStates.has(current.state) ||
          current.cleanup_pending
        ) {
          setError(
            "The previous attempt is still finishing or cleaning up. Please wait.",
          );
          return;
        }
      }

      cancelledRef.current.delete(id);

      updateVideo(id, {
        state: "waiting",
        progress: 0,
        error: "",
        uploadId: undefined,
        cleanupPending: false,
      });

      setError("");
    } catch (err) {
      setError(getMessage(err));
    }
  }

  async function runVideoBatch(pending: SelectedVideo[]) {
    let pid = projectIdRef.current;

    if (!pid) {
      const project = await addProject({
        ...request,
        name: name.trim(),
        media_type: "video",
      });

      pid = project._id;
      projectIdRef.current = pid;
    }

    const uploads = await reserveProjectVideos({
      ...request,
      pid,
      files: pending.map((item) => item.file),
    });

    pending.forEach((item, index) => {
      updateVideo(item.id, {
        uploadId: uploads[index]._id,
        cleanupPending: false,
      });
    });

    let cursor = 0;

    async function processItem(item: SelectedVideo, uploadId: string) {
      const controller = new AbortController();
      controllersRef.current.set(item.id, controller);

      try {
        for (;;) {
          if (
            stopAllRef.current ||
            cancelledRef.current.has(item.id)
          ) {
            await cancelItem(item.id);
            return;
          }

          try {
            await startVideoUpload({
              ...request,
              pid: pid!,
              uploadId,
              signal: controller.signal,
            });
            break;
          } catch (err) {
            if (
              axios.isAxiosError(err) &&
              err.response?.status === 429
            ) {
              updateVideo(item.id, {
                state: "waiting",
                error: "Waiting for an available upload slot on your account.",
              });
              await wait(1500);
              continue;
            }

            throw err;
          }
        }

        updateVideo(item.id, {
          state: "uploading",
          progress: 0,
          error: "",
        });

        await uploadProjectVideo({
          ...request,
          pid: pid!,
          uploadId,
          file: item.file,
          signal: controller.signal,
          onProgress: (percentage) => {
            updateVideo(item.id, { progress: percentage });
          },
        });

        updateVideo(item.id, {
          state: "completed",
          progress: 100,
          cleanupPending: false,
          error: "",
        });

        await refreshProjects();
      } catch (err) {
        // Consultar o servidor antes de assumir falha:
        // a resposta pode perder-se depois da conclusão.
        try {
          const current = await fetchVideoUpload({
            ...request,
            pid: pid!,
            uploadId,
          });

          if (terminalStates.has(current.state)) {
            updateVideo(item.id, {
              state: current.state,
              cleanupPending: current.cleanup_pending,
              error: current.error,
              ...(current.state === "completed"
                ? { progress: 100 }
                : {}),
            });
          } else {
            await cancelItem(item.id);
            updateVideo(item.id, {
              error: getMessage(err),
            });
          }
        } catch {
          updateVideo(item.id, {
            state: "failed",
            cleanupPending: true,
            error:
              "Could not confirm the result. " +
              "Please wait for recovery before trying again.",
          });
        }
      } finally {
        controllersRef.current.delete(item.id);
      }
    }

    async function worker() {
      while (cursor < pending.length) {
        const index = cursor++;
        const item = pending[index];

        if (
          stopAllRef.current ||
          cancelledRef.current.has(item.id)
        ) {
          await cancelItem(item.id);
          continue;
        }

        await processItem(item, uploads[index]._id);
      }
    }

    const workerCount = Math.min(
      premium ? 3 : 1,
      pending.length,
    );

    await Promise.all(
      Array.from({ length: workerCount }, () => worker()),
    );
  }

  async function handleCreate(skipIneligible = false) {
    if (busy || !name.trim()) return;
    setError("");

    if (mediaType === "image") {
      if (imageFiles.length === 0) return;
      setBusy(true);

      try {
        const project = await addProject({
          ...request,
          name: name.trim(),
          images: imageFiles,
          media_type: "image",
        });

        await refreshProjects();
        setOpen(false);
        resetForm();
        toast({ title: "Project created successfully" });
        router.push(`/dashboard/${project._id}`);
      } catch (err) {
        setError(getMessage(err));
      } finally {
        setBusy(false);
      }

      return;
    }

    if (!allowedVideo) return;

    const pending = videosRef.current.filter(
      (item) =>
        item.state === "waiting" &&
        item.eligible &&
        !item.checking,
    );

    if (pending.length === 0) return;

    const rejected = videosRef.current.filter(
      (item) => !item.eligible,
    );

    // Pedir confirmação antes de ignorar os ficheiros não elegíveis
    if (rejected.length > 0 && !skipIneligible) {
      setSkipIneligibleOpen(true);
      return;
    }

    setBusy(true);
    stopAllRef.current = false;

    const batch = runVideoBatch(pending);
    batchRef.current = batch;

    try {
      await batch;
      await refreshProjects();

      toast({
        title: "Uploads finished",
        description: "Check the result for each file.",
      });
    } catch (err) {
      setError(getMessage(err));
    } finally {
      batchRef.current = null;
      setBusy(false);
      await refreshCapacity();
    }
  }

  const ineligibleCount = videos.filter((item) => !item.eligible).length;
  const eligibleCount = videos.filter(
    (item) => item.state === "waiting" && item.eligible && !item.checking,
  ).length;

  const hasCompleted = videos.some(
    (item) => item.state === "completed",
  );

  const selectedBytes = videos
    .filter((item) => item.eligible && item.state === "waiting")
    .reduce((sum, item) => sum + item.file.size, 0);

  const insufficientSpace =
    capacity !== null &&
    !busy &&
    (selectedBytes > capacity.account_available_bytes ||
      selectedBytes > capacity.project_available_bytes);

  return (
    <>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>

        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          onEscapeKeyDown={(event) => {
            if (busy) {
              event.preventDefault();
              changeOpen(false);
            }
          }}
          onInteractOutside={(event) => {
            if (busy) {
              event.preventDefault();
              changeOpen(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
  {existingProject ? "Add videos" : "Create New Project"}
</DialogTitle>
          </DialogHeader>

          <Label htmlFor="project-name">Project Name</Label>
          <Input
            id="project-name"
            placeholder="Enter project name"
            value={name}
            disabled={busy || projectIdRef.current !== null}
            onChange={(event) => setName(event.target.value)}
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant={mediaType === "image" ? "default" : "outline"}
              disabled={busy || projectIdRef.current !== null}
              onClick={() => setMediaType("image")}
            >
              Images
            </Button>

            <Button
              type="button"
              variant={mediaType === "video" ? "default" : "outline"}
              disabled={
                busy || !allowedVideo || projectIdRef.current !== null
              }
              onClick={() => setMediaType("video")}
            >
              Videos
            </Button>
          </div>

          {!allowedVideo && (
            <p className="text-sm text-muted-foreground">
              Sign in with a Free or Premium account to create video projects.
            </p>
          )}

          {mediaType === "image" ? (
            <ImageSubmissionArea
              onDrop={(selected) => setImageFiles(selected)}
              receivedFiles={files}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Maximum storage per profile:{" "}
                {capacity
                  ? formatBytes(capacity.limits.maxAccountBytes)
                  : "Checking…"}
              </p>

              {capacity ? (
                <div className="rounded-md border p-3 text-sm">
                  <p>
                    Accepted formats: MP4 and MOV.
                  </p>
                  <p>
                    Maximum per video: {premium ? "1 GB" : "100 MB"}.
                  </p>
                  <p>
                    Maximum duration: {premium ? "600 seconds" : "60 seconds"}.
                  </p>
                  <p>
                    Project: {formatBytes(capacity.project_available_bytes)}
                    {" available out of "}
                    {formatBytes(capacity.limits.maxProjectBytes)}.
                  </p>
                  <p>
                    Account: {formatBytes(capacity.account_available_bytes)}
                    {" available out of "}
                    {formatBytes(capacity.limits.maxAccountBytes)}.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Available storage includes reservations.
                    Video thumbnails do not count towards your quota.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {capacityError || "Checking available storage…"}
                </p>
              )}

              {capacityError && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void refreshCapacity()}
                >
                  Refresh storage
                </Button>
              )}

              <div
                className={`flex min-h-64 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
                  videoDragging
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-neutral-400 text-neutral-400 hover:bg-sidebar"
                }`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setVideoDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setVideoDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setVideoDragging(false);
                  if (!busy) {
                    void selectVideos(event.dataTransfer.files);
                  }
                }}
                onClick={() => {
                  if (!busy) fileInputRef.current?.click();
                }}
              >
                <FileVideo className="h-16 w-16" />
                <p className="text-lg font-medium">
                  Drag and drop videos or click to select files
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp4,.mov"
                  multiple
                  disabled={busy}
                  aria-label="Select videos"
                  className="hidden"
                  onChange={(event) => {
                    void selectVideos(event.target.files);
                  }}
                />
              </div>

              {previewUrl && (
                <div>
                  <p className="mb-2 text-sm font-medium">
                    Preview: {previewFile?.name}
                  </p>
                  <video
                    key={previewUrl}
                    src={previewUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-video w-full rounded-md bg-black"
                    onError={() => {
                      setPreviewError(
                        "Your browser could not preview this video. " +
                          "You can still upload it; the server will validate the file.",
                      );
                    }}
                  />
                  {previewError && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {previewError}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {videos.map((item) => (
                  <div key={item.id} className="rounded-md border p-3">
                    <p className="break-all text-sm font-medium">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(item.file.size)}
                      {" · "}
                      {item.checking
                        ? "Checking duration"
                        : item.duration !== null
                          ? `${item.duration.toFixed(2)} s`
                          : "Duration unavailable in this browser"}
                      {" · "}
                      {labels[item.state]}
                    </p>

                    {!terminalStates.has(item.state) &&
                      item.state !== "waiting" && (
                        <div className="mt-2">
                          <progress
                            value={item.progress}
                            max={100}
                            className="w-full"
                            aria-label={`Upload of ${item.file.name}`}
                          />
                          <p className="text-xs text-muted-foreground">
                            {item.progress}% uploaded
                            {item.progress === 100
                              ? " — waiting for the server to finish"
                              : ""}
                          </p>
                        </div>
                      )}

                    {item.error && (
                      <p className="mt-1 text-sm text-red-500">
                        {item.error}
                      </p>
                    )}

                    {item.cleanupPending && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Confirming cleanup of the previous attempt.
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2">
                      {videos.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewFile(item.file)}
                        >
                          Preview
                        </Button>
                      )}

                      {busy && !terminalStates.has(item.state) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void cancelItem(item.id).catch((err) => {
                              setError(getMessage(err));
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      )}

                      {!busy &&
                        item.eligible &&
                        (item.state === "failed" ||
                          item.state === "cancelled") && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={item.cleanupPending}
                            onClick={() => void retryItem(item.id)}
                          >
                            Try again
                          </Button>
                        )}

                      {!busy &&
                        item.state !== "completed" &&
                        !item.cleanupPending && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              replaceVideos(
                                videosRef.current.filter(
                                  (video) => video.id !== item.id,
                                ),
                              );

                              if (previewFile === item.file) {
                                setPreviewFile(null);
                              }
                            }}
                          >
                            Remove
                          </Button>
                        )}
                    </div>
                  </div>
                ))}
              </div>

              {insufficientSpace && (
                <p role="alert" className="text-sm text-red-500">
                  The selection exceeds available storage.
                  Remove files before continuing.
                </p>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}

          <DialogFooter className="flex-wrap gap-2">
            {busy && mediaType === "video" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void cancelAll().catch((err) => {
                    setError(getMessage(err));
                  });
                }}
              >
                Cancel pending uploads
              </Button>
            )}

            {mediaType === "video" && hasCompleted && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  const pid = projectIdRef.current;
                  if (!pid) return;
                  changeOpen(false);
                  router.push(`/dashboard/${pid}`);
                }}
              >
                Open project
              </Button>
            )}

            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={
                busy ||
                !name.trim() ||
                (mediaType === "image"
                  ? imageFiles.length === 0
                  : !capacity ||
                    insufficientSpace ||
                    videos.some((item) => item.checking) ||
                    !videos.some(
                      (item) =>
                        item.state === "waiting" && item.eligible,
                    ))
              }
            >
              {busy && (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              )}
              {busy
                ? "Uploading…"
                : projectIdRef.current
                  ? "Upload selected videos"
                  : "Create project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={skipIneligibleOpen}
        onOpenChange={setSkipIneligibleOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Some files are not eligible</DialogTitle>
            <DialogDescription>
              {ineligibleCount} file(s) cannot be uploaded and will be skipped.
              Upload only the {eligibleCount} eligible file(s)?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                setSkipIneligibleOpen(false);
                void handleCreate(true);
              }}
            >
              Upload eligible files
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={leaveOpen}
        onOpenChange={(next) => {
          if (!leaving) setLeaveOpen(next);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave during upload?</DialogTitle>
          </DialogHeader>

          <p className="text-sm">
            Leaving cancels pending uploads.
            Completed videos will be kept.
          </p>

          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={leaving}
              onClick={() => {
                leaveActionRef.current = null;
                setLeaveOpen(false);
              }}
            >
              Stay
            </Button>
            <Button
              type="button"
              disabled={leaving}
              onClick={() => void leaveAndCancel()}
            >
              {leaving ? "Cancelling…" : "Leave and cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}