"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/providers/session-provider";

interface Video {
  _id: string;
  name: string;
  format: string;
  duration_seconds: number;
  size_bytes: number;
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data?.error === "string") return data.error;
    if (typeof data === "string") return data;
  }

  return "Não foi possível comunicar com o servidor.";
}

export default function VideosPage() {
  const session = useSession();
  const userId = session.user._id;
  const token = session.token;
  const userType = session.user.type;
  const allowed = userType === "free" || userType === "premium";
  const premium = userType === "premium";

  const [videos, setVideos] = useState<Video[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const endpoint = `/api-gateway/videos/${encodeURIComponent(userId)}`;

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError("");

    axios
      .get<Video[]>(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then((response) => setVideos(response.data))
      .catch((err) => {
        if (!axios.isCancel(err)) setError(errorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [endpoint, token, allowed]);

  async function uploadVideo() {
    if (!file || uploading) return;

    setError("");
    setMessage("");

    if (!/\.(mp4|mov)$/i.test(file.name)) {
      setError("Selecione um ficheiro MP4 ou MOV.");
      return;
    }

    const maxSize = premium ? 1_000_000_000 : 100_000_000;

    if (file.size > maxSize) {
      setError(
        premium
          ? "O vídeo excede o limite de 1 GB."
          : "O vídeo excede o limite de 100 MB.",
      );
      return;
    }

    const form = new FormData();
    form.append("video", file);

    setUploading(true);
    setProgress(0);

    try {
      const response = await axios.post<{ video: Video }>(endpoint, form, {
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        },
      });

      setVideos((previous) => [response.data.video, ...previous]);
      setMessage("Vídeo carregado com sucesso.");
      setFile(null);

      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  if (!allowed) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Biblioteca de vídeos</h1>
        <p className="mt-4">
          Inicie sessão numa conta Registada ou Premium para carregar vídeos.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8">
      <h1 className="text-2xl font-bold">Biblioteca de vídeos</h1>
      <p className="mt-2 text-muted-foreground">
        Carregue um vídeo MP4 ou MOV para a sua biblioteca.
      </p>

      <section className="mt-6 rounded-lg border p-5">
        <h2 className="font-semibold">Carregar vídeo</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          {premium
            ? "Premium: até 10 minutos e 1 GB por vídeo."
            : "Registado: até 60 segundos e 100 MB por vídeo."}
          {" "}O carregamento não consome operações diárias.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.mov"
          disabled={uploading}
          className="mt-4 block max-w-full"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setError("");
            setMessage("");
          }}
        />

        <button
          type="button"
          disabled={!file || uploading}
          onClick={uploadVideo}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {uploading ? "A carregar…" : "Carregar vídeo"}
        </button>

        {uploading && (
          <div className="mt-4" aria-live="polite">
            <progress value={progress} max={100} className="w-full" />
            <p className="mt-1 text-sm">
              {progress < 100
                ? `A enviar: ${progress}%`
                : "A validar e guardar o vídeo…"}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-red-500">
            {error}
          </p>
        )}

        {message && (
          <p role="status" className="mt-4 text-green-500">
            {message}
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Os meus vídeos</h2>

        {loading ? (
          <p className="mt-4">A carregar a biblioteca…</p>
        ) : videos.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            Ainda não existem vídeos na biblioteca.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3">Nome</th>
                  <th className="p-3">Formato</th>
                  <th className="p-3">Duração</th>
                  <th className="p-3">Tamanho</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={video._id} className="border-b last:border-0">
                    <td className="p-3 break-all">{video.name}</td>
                    <td className="p-3">{video.format.toUpperCase()}</td>
                    <td className="p-3">
                      {video.duration_seconds.toFixed(1)} s
                    </td>
                    <td className="p-3">
                      {(video.size_bytes / 1_000_000).toFixed(2)} MB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}