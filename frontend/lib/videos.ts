import { api } from "./axios";

export interface ProjectVideo {
  _id: string;
  project_id: string;
  name: string;
  format: "mp4" | "mov";
  duration_seconds: number;
  size_bytes: number;
  original_video_id?: string | null;
  thumbnail_time_seconds?: number | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  // null = desconhecido (tratado como permitido)
  has_audio?: boolean | null;
  has_subtitles?: boolean;
  subtitles_language?: string | null;
  createdAt?: string;
}

export type VideoUploadState =
  | "waiting"
  | "uploading"
  | "validating"
  | "thumbnail"
  | "completed"
  | "failed"
  | "cancelled";

export interface VideoUpload {
  _id: string;
  video_id: string;
  name: string;
  size_bytes: number;
  state: VideoUploadState;
  cancel_requested: boolean;
  cleanup_pending: boolean;
  error: string;
}

export interface VideoCapacity {
  limits: {
    maxDurationSeconds: number;
    maxSizeBytes: number;
    maxProjectBytes: number;
    maxAccountBytes: number;
    maxConcurrentUploads: number;
  };
  occupied: {
    account_bytes: number;
    project_bytes: number;
  };
  reserved_account_bytes: number;
  reserved_project_bytes: number;
  account_available_bytes: number;
  project_available_bytes: number;
}

export type VideoTrimState =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface VideoTrimJob {
  _id: string;
  source_video_id: string;
  result_video_id: string;
  start_seconds: number;
  end_seconds: number;
  output_format: "mp4" | "mov";
  state: VideoTrimState;
  progress: number;
  cancel_requested: boolean;
  error: string;
}

interface AccountRequest {
  uid: string;
  token: string;
  signal?: AbortSignal;
}

interface ProjectVideoRequest extends AccountRequest {
  pid: string;
}

interface UploadRequest extends ProjectVideoRequest {
  uploadId: string;
}

interface UploadProjectVideoRequest extends ProjectVideoRequest {
  file: File;
  // Opcional no tipo para manter compatibilidade até atualizar o formulário.
  // O servidor exige o identificador da reserva.
  uploadId?: string;
  onProgress?: (percentage: number) => void;
}

interface UploadProjectVideoResponse {
  message: string;
  video: ProjectVideo;
  project_version: number;
}

function projectVideosUrl(uid: string, pid: string): string {
  return `/videos/${encodeURIComponent(uid)}/${encodeURIComponent(pid)}`;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchProjectVideos({
  uid,
  pid,
  token,
  signal,
}: ProjectVideoRequest): Promise<ProjectVideo[]> {
  const response = await api.get<ProjectVideo[]>(
    projectVideosUrl(uid, pid),
    {
      headers: authHeaders(token),
      signal,
    },
  );

  return response.data;
}

export async function fetchVideoCapacity({
  uid,
  pid,
  token,
  signal,
}: AccountRequest & { pid?: string }): Promise<VideoCapacity> {
  const url = pid
    ? `${projectVideosUrl(uid, pid)}/capacity`
    : `/videos/${encodeURIComponent(uid)}/capacity`;

  const response = await api.get<VideoCapacity>(url, {
    headers: authHeaders(token),
    signal,
  });

  return response.data;
}

export async function reserveProjectVideos({
  uid,
  pid,
  token,
  signal,
  files,
}: ProjectVideoRequest & { files: File[] }): Promise<VideoUpload[]> {
  const response = await api.post<{ uploads: VideoUpload[] }>(
    `${projectVideosUrl(uid, pid)}/uploads`,
    {
      files: files.map((file) => ({
        name: file.name,
        size_bytes: file.size,
      })),
    },
    {
      headers: authHeaders(token),
      signal,
    },
  );

  return response.data.uploads;
}

export async function startVideoUpload({
  uid,
  pid,
  token,
  uploadId,
  signal,
}: UploadRequest): Promise<VideoUpload> {
  const response = await api.post<VideoUpload>(
    `${projectVideosUrl(uid, pid)}/uploads/${encodeURIComponent(uploadId)}/start`,
    {},
    {
      headers: authHeaders(token),
      signal,
    },
  );

  return response.data;
}

export async function fetchVideoUpload({
  uid,
  pid,
  token,
  uploadId,
  signal,
}: UploadRequest): Promise<VideoUpload> {
  const response = await api.get<VideoUpload>(
    `${projectVideosUrl(uid, pid)}/uploads/${encodeURIComponent(uploadId)}`,
    {
      headers: authHeaders(token),
      signal,
    },
  );

  return response.data;
}

export async function cancelVideoUpload({
  uid,
  pid,
  token,
  uploadId,
}: UploadRequest): Promise<VideoUpload> {
  const response = await api.delete<VideoUpload>(
    `${projectVideosUrl(uid, pid)}/uploads/${encodeURIComponent(uploadId)}`,
    {
      headers: authHeaders(token),
    },
  );

  return response.data;
}

export async function uploadProjectVideo({
  uid,
  pid,
  token,
  file,
  uploadId,
  signal,
  onProgress,
}: UploadProjectVideoRequest): Promise<UploadProjectVideoResponse> {
  if (!uploadId) {
    throw new Error("This file does not have a storage reservation yet.");
  }
  const form = new FormData();
  form.append("video", file);

  const response = await api.post<UploadProjectVideoResponse>(
    projectVideosUrl(uid, pid),
    form,
    {
      headers: {
        ...authHeaders(token),
        "X-Video-Upload-Id": uploadId,
      },
      signal,
      timeout: 0,
      onUploadProgress: (event) => {
        if (event.total) {
          onProgress?.(
            Math.min(
              100,
              Math.round((event.loaded / event.total) * 100),
            ),
          );
        }
      },
    },
  );

  return response.data;
}

export async function deleteProjectVideo({
  uid,
  pid,
  token,
  videoId,
}: ProjectVideoRequest & { videoId: string }): Promise<{
  message: string;
  video_id: string;
  project_version: number;
}> {
  const response = await api.delete(
    `${projectVideosUrl(uid, pid)}/items/${encodeURIComponent(videoId)}`,
    {
      headers: authHeaders(token),
    },
  );

  return response.data;
}

export async function startVideoTrim({
  uid,
  pid,
  token,
  videoId,
  startSeconds,
  endSeconds,
  outputFormat,
}: ProjectVideoRequest & {
  videoId: string;
  startSeconds: number;
  endSeconds: number;
  outputFormat: "mp4" | "mov";
}): Promise<VideoTrimJob> {
  const response = await api.post<VideoTrimJob>(
    `${projectVideosUrl(uid, pid)}/trim`,
    {
      video_id: videoId,
      start_seconds: startSeconds,
      end_seconds: endSeconds,
      output_format: outputFormat,
    },
    { headers: authHeaders(token) },
  );
  return response.data;
}

export async function fetchVideoTrim({
  uid,
  pid,
  token,
  trimId,
  signal,
}: ProjectVideoRequest & { trimId: string; signal?: AbortSignal }): Promise<VideoTrimJob> {
  const response = await api.get<VideoTrimJob>(
    `${projectVideosUrl(uid, pid)}/trim/${encodeURIComponent(trimId)}`,
    { headers: authHeaders(token), signal },
  );
  return response.data;
}

export async function cancelVideoTrim({
  uid,
  pid,
  token,
  trimId,
}: ProjectVideoRequest & { trimId: string }): Promise<VideoTrimJob> {
  const response = await api.delete<VideoTrimJob>(
    `${projectVideosUrl(uid, pid)}/trim/${encodeURIComponent(trimId)}`,
    { headers: authHeaders(token) },
  );
  return response.data;
}


export type VideoFilterName =
  | "grayscale"
  | "sepia"
  | "vintage"
  | "invert"
  | "contrast"
  | "blur";

export interface VideoFilterJob {
  _id: string;
  source_video_id: string;
  result_video_id: string;
  filter_name: VideoFilterName;
  state: "queued" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  cancel_requested?: boolean;
  error: string;
}

export async function startVideoFilter({
  uid,
  pid,
  token,
  videoId,
  filterName,
}: ProjectVideoRequest & {
  videoId: string;
  filterName: VideoFilterName;
}): Promise<VideoFilterJob> {
  const response = await api.post<VideoFilterJob>(
    `${projectVideosUrl(uid, pid)}/filters`,
    {
      video_id: videoId,
      filter_name: filterName,
    },
    { headers: authHeaders(token) },
  );

  return response.data;
}

export async function fetchVideoFilter({
  uid,
  pid,
  token,
  filterId,
  signal,
}: ProjectVideoRequest & {
  filterId: string;
}): Promise<VideoFilterJob> {
  const response = await api.get<VideoFilterJob>(
    `${projectVideosUrl(uid, pid)}/filters/${encodeURIComponent(filterId)}`,
    {
      headers: authHeaders(token),
      signal,
    },
  );

  return response.data;
}

export async function cancelVideoFilter({
  uid,
  pid,
  token,
  filterId,
}: ProjectVideoRequest & {
  filterId: string;
}): Promise<VideoFilterJob> {
  const response = await api.delete<VideoFilterJob>(
    `${projectVideosUrl(uid, pid)}/filters/${encodeURIComponent(filterId)}`,
    {
      headers: authHeaders(token),
    },
  );

  return response.data;
}

// Só é suportado o inglês
export type SubtitleLanguage = "en";

export interface VideoSubtitleJob {
  _id: string;
  video_id: string;
  language: string;
  detected_language?: string | null;
  state: "queued" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  error_code?: string;
  error: string;
}

export async function startVideoSubtitles({
  uid,
  pid,
  token,
  videoId,
  language,
}: ProjectVideoRequest & {
  videoId: string;
  language: SubtitleLanguage;
}): Promise<VideoSubtitleJob> {
  const response = await api.post<VideoSubtitleJob>(
    `${projectVideosUrl(uid, pid)}/subtitles`,
    { video_id: videoId, language },
    { headers: authHeaders(token) },
  );

  return response.data;
}

// Último pedido de legendas do vídeo (null se nunca houve)
export async function fetchLatestVideoSubtitles({
  uid,
  pid,
  token,
  videoId,
  signal,
}: ProjectVideoRequest & {
  videoId: string;
}): Promise<VideoSubtitleJob | null> {
  const response = await api.get<VideoSubtitleJob | null>(
    `${projectVideosUrl(uid, pid)}/subtitles`,
    {
      headers: authHeaders(token),
      params: { video_id: videoId },
      signal,
    },
  );

  return response.data;
}

export async function fetchVideoSubtitles({
  uid,
  pid,
  token,
  subtitleId,
  signal,
}: ProjectVideoRequest & {
  subtitleId: string;
}): Promise<VideoSubtitleJob> {
  const response = await api.get<VideoSubtitleJob>(
    `${projectVideosUrl(uid, pid)}/subtitles/${encodeURIComponent(subtitleId)}`,
    {
      headers: authHeaders(token),
      signal,
    },
  );

  return response.data;
}

export async function cancelVideoSubtitles({
  uid,
  pid,
  token,
  subtitleId,
}: ProjectVideoRequest & {
  subtitleId: string;
}): Promise<VideoSubtitleJob> {
  const response = await api.delete<VideoSubtitleJob>(
    `${projectVideosUrl(uid, pid)}/subtitles/${encodeURIComponent(subtitleId)}`,
    {
      headers: authHeaders(token),
    },
  );

  return response.data;
}

export async function fetchSubtitlesVtt({
  uid,
  pid,
  token,
  videoId,
  signal,
}: ProjectVideoRequest & {
  videoId: string;
}): Promise<{ language: string; vtt: string }> {
  const response = await api.get<{ language: string; vtt: string }>(
    `${projectVideosUrl(uid, pid)}/subtitles/vtt/${encodeURIComponent(videoId)}`,
    {
      headers: authHeaders(token),
      signal,
    },
  );

  return response.data;
}

// Cancelar todos os pedidos de vídeo ativos da conta (usado no logout)
export async function cancelActiveVideoJobs({
  uid,
  token,
}: AccountRequest): Promise<{ cancelled: number }> {
  const response = await api.post<{ cancelled: number }>(
    `/videos/${encodeURIComponent(uid)}/jobs/cancel-active`,
    {},
    // Timeout curto para não atrasar o logout
    { headers: authHeaders(token), timeout: 5000 },
  );

  return response.data;
}
