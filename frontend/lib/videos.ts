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
    throw new Error("O ficheiro ainda não tem uma reserva de espaço.");
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