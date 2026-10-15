"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProjectVideos } from "@/lib/videos";
import { useSession } from "@/providers/session-provider";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

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

  return "Não foi possível carregar os vídeos do projeto.";
}

export default function VideoProjectEditor({
  projectId,
  projectName,
}: VideoProjectEditorProps) {
  const session = useSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playbackFailed, setPlaybackFailed] = useState(false);

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
    // Renovar periodicamente os endereços temporários dos ficheiros.
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });

  const items = videos.data ?? [];
  const selected =
    items.find((video) => video._id === selectedId) ?? items[0];

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
            Projeto de vídeo
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {videos.isPending ? (
          <p role="status">A carregar os vídeos…</p>
        ) : videos.isError ? (
          <div role="alert" className="space-y-3">
            <p className="text-red-500">
              {errorMessage(videos.error)}
            </p>
            <Button
              variant="outline"
              onClick={() => void videos.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : !selected ? (
          <p className="text-muted-foreground">
            Este projeto ainda não tem vídeos concluídos.
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
                aria-label={`Reproduzir ${selected.name}`}
                className="aspect-video max-h-[60vh] w-full bg-black object-contain"
                onError={() => setPlaybackFailed(true)}
              >
                O seu navegador não suporta reprodução de vídeo.
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
                      Não foi possível reproduzir o vídeo. Atualize os
                      endereços e tente novamente. O codec também pode
                      não ser suportado pelo navegador.
                    </p>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={videos.isFetching}
                      onClick={() => void videos.refetch()}
                    >
                      Atualizar vídeo
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <aside
  aria-label="Ferramentas de vídeo"
  className="self-start rounded-lg border p-4 lg:sticky lg:top-4 lg:col-start-1 lg:row-start-1 lg:row-span-2"
>
  <h2 className="font-semibold">Ferramentas de vídeo</h2>

  <p className="mt-2 break-all text-xs text-muted-foreground">
    Vídeo selecionado: {selected.name}
  </p>

  <div className="mt-4 flex flex-col gap-3">
    <Button
      type="button"
      variant="outline"
      className="w-full justify-start"
      disabled
    >
      Recortar
    </Button>
    <Button
      type="button"
      variant="outline"
      className="w-full justify-start"
      disabled
    >
      Filtros
    </Button>
    <Button
      type="button"
      variant="outline"
      className="w-full justify-start"
      disabled
    >
      Legendas
    </Button>
  </div>

  <p className="mt-3 text-xs text-muted-foreground">
    Funcionalidades em implementação.
  </p>
</aside>

            <section className="min-w-0 lg:col-start-2 lg:row-start-2">
              <h2 className="mb-3 font-semibold">
                Vídeos do projeto ({items.length})
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
                          Sem miniatura
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