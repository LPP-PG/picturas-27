"use client";

import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

interface VideoJob {
  _id: string;
  state: "queued" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
}

interface TrackedJob {
  id: string;
  projectId: string;
}

interface VideoJobToastOptions<J extends VideoJob> {
  // Prefixo das chaves das consultas, ex.: ["videoFilterJob", uid]
  queryKey: readonly unknown[];
  // Nome usado nos títulos, ex.: "Video filter"
  name: string;
  // Título enquanto processa, ex.: "Applying video filter"
  processingTitle: string;
  fetchJob: (job: TrackedJob, signal: AbortSignal) => Promise<J>;
  cancelJob: (job: TrackedJob) => Promise<unknown>;
  // Chamado uma vez quando o pedido termina (concluído, falhado ou cancelado)
  onFinished: (job: J, projectId: string) => void;
}

function isActive(job: VideoJob): boolean {
  return job.state === "queued" || job.state === "processing";
}

function cancelErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.error === "string") {
    return error.response.data.error;
  }
  return "The request could not be cancelled.";
}

// Notificação com o progresso e o botão Cancel enquanto o pedido está ativo,
// como no Recorte
export function useVideoJobToasts<J extends VideoJob>(
  options: VideoJobToastOptions<J>,
) {
  const { toast } = useToast();
  const [tracked, setTracked] = useState<TrackedJob[]>([]);
  const toasts = useRef(
    new Map<string, { handle: ReturnType<typeof toast>; shown: string }>(),
  );
  const cancelling = useRef(new Set<string>());
  const finished = useRef(new Set<string>());
  const latest = useRef(options);

  useEffect(() => {
    latest.current = options;
  });

  const { name, processingTitle } = options;

  const cancel = useCallback(
    (job: TrackedJob) => {
      cancelling.current.add(job.id);
      toasts.current.get(job.id)?.handle.dismiss();
      toasts.current.delete(job.id);

      latest.current.cancelJob(job).catch((error: unknown) => {
        // O pedido continua ativo: a notificação volta na próxima consulta
        cancelling.current.delete(job.id);
        toast({
          title: `${name} cancellation failed`,
          description: cancelErrorMessage(error),
          variant: "destructive",
          duration: 6000,
        });
      });
    },
    [name, toast],
  );

  const content = useCallback(
    (job: J, projectId: string) => ({
      title: job.state === "queued" ? `${name} queued` : processingTitle,
      description: `${job.state === "queued" ? "Queued" : "Processing"} (${job.progress}%)`,
      duration: 1000000,
      action: (
        <ToastAction
          altText={`Cancel ${name.toLowerCase()}`}
          onClick={() => cancel({ id: job._id, projectId })}
        >
          Cancel
        </ToastAction>
      ),
    }),
    [cancel, name, processingTitle],
  );

  const showProgress = useCallback(
    (job: J, projectId: string) => {
      if (cancelling.current.has(job._id)) return;

      const shown = `${job.state}:${job.progress}`;
      const current = toasts.current.get(job._id);

      if (!current) {
        toasts.current.set(job._id, {
          handle: toast(content(job, projectId)),
          shown,
        });
      } else if (current.shown !== shown) {
        current.handle.update(content(job, projectId));
        current.shown = shown;
      }
    },
    [content, toast],
  );

  const track = useCallback(
    (job: J, projectId: string) => {
      if (!isActive(job) || finished.current.has(job._id)) return;

      setTracked((current) =>
        current.some((item) => item.id === job._id)
          ? current
          : [...current, { id: job._id, projectId }],
      );
      showProgress(job, projectId);
    },
    [showProgress],
  );

  const results = useQueries({
    queries: tracked.map((item) => ({
      queryKey: [...options.queryKey, item.projectId, item.id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        latest.current.fetchJob(item, signal),
      refetchInterval: 1000,
    })),
  });

  useEffect(() => {
    results.forEach(({ data: job }, index) => {
      const item = tracked[index];
      if (!job || !item || job._id !== item.id) return;

      if (isActive(job)) {
        showProgress(job, item.projectId);
        return;
      }

      if (finished.current.has(job._id)) return;
      finished.current.add(job._id);

      toasts.current.get(job._id)?.handle.dismiss();
      toasts.current.delete(job._id);
      cancelling.current.delete(job._id);
      setTracked((current) => current.filter((entry) => entry.id !== job._id));
      latest.current.onFinished(job, item.projectId);
    });
  }, [results, tracked, showProgress]);

  // Fechar as notificações de progresso ao sair do editor
  useEffect(() => {
    const open = toasts.current;
    return () => {
      open.forEach(({ handle }) => handle.dismiss());
      open.clear();
    };
  }, []);

  return { track };
}
