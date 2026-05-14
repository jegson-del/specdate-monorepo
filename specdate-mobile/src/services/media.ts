import { Platform } from 'react-native';
import { getAuthToken, getApiBaseUrl } from './api';

export type MediaModerationStatus =
    | 'pending'
    | 'scanning'
    | 'approved'
    | 'flagged'
    | 'failed'
    | 'manual_pending';

export interface MediaItem {
    id: number;
    user_id: number;
    file_path: string;
    url: string;
    type: MediaUploadType;
    mime_type: string;
    size: number;
    created_at: string;
    moderation_status?: MediaModerationStatus | string;
    moderation_labels?: Record<string, unknown> | null;
    moderation_checked_at?: string | null;
    moderation_error?: string | null;
}

export type MediaUploadType =
    | 'avatar'
    | 'profile_gallery'
    | 'provider_gallery'
    | 'chat'
    | 'chat_image'
    | 'chat_video'
    | 'chat_audio'
    | 'proof'
    | 'round_answer_image'
    | 'round_answer_video'
    | 'round_question_image'
    | 'round_question_video'
    | 'round_answer_audio'
    | 'round_question_audio';

/** One row from GET /media/upload-limits */
export interface MediaUploadLimitEntry {
    max_kb: number;
    max_mb: number;
    mimes: string[] | null;
    mimetypes: string[] | null;
}

export interface MediaUploadLimitsPayload {
    types: Record<string, MediaUploadLimitEntry>;
    supports_media_id: string[];
}

export class MediaModerationError extends Error {
    constructor(
        message: string,
        public readonly status: 'flagged' | 'failed' | 'timeout' | string,
    ) {
        super(message);
        this.name = 'MediaModerationError';
    }
}

/** In-memory cache for GET /media/upload-limits; cleared on logout. */
let mediaUploadLimitsCache: MediaUploadLimitsPayload | null = null;

const VIDEO_EXT_MIME: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    webm: 'video/webm',
};

const AUDIO_EXT_MIME: Record<string, string> = {
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    webm: 'audio/webm',
    aac: 'audio/aac',
    '3gp': 'audio/3gpp',
};

function getMimeTypeFromUri(uri: string, hint?: string): string {
    if (hint && (hint.startsWith('image/') || hint.startsWith('video/') || hint.startsWith('audio/'))) return hint;
    const filename = uri.split('/').pop() || '';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    if (AUDIO_EXT_MIME[ext]) return AUDIO_EXT_MIME[ext];
    if (VIDEO_EXT_MIME[ext]) return VIDEO_EXT_MIME[ext];
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    return ext === 'png' || ext === 'gif' || ext === 'webp' ? `image/${ext}` : 'image/jpeg';
}

/**
 * Upload a file to the backend, or update an existing media row when mediaId is provided (profile_gallery only).
 *
 * @param uri Local file URI (image picker / camera) or blob URL on web
 * @param type Upload category accepted by the backend.
 * @param mediaId When provided with type profile_gallery, backend updates this row's file/url instead of creating.
 * @param mimeType Optional MIME (e.g. from ImagePicker asset) so video/image is sent correctly.
 */
export async function uploadMedia(
    uri: string,
    type: MediaUploadType,
    mediaId?: number | null,
    mimeType?: string | null
): Promise<MediaItem> {
    const formData = new FormData();
    const resolvedMime = mimeType || getMimeTypeFromUri(uri);
    const isVideo = resolvedMime.startsWith('video/');
    const isAudio = resolvedMime.startsWith('audio/');

    const isWebBlob = Platform.OS === 'web' && uri.startsWith('blob:');
    if (isWebBlob) {
        const res = await fetch(uri);
        const blob = await res.blob();
        const ext = (blob.type || resolvedMime).split('/')[1] || (isVideo ? 'mp4' : isAudio ? 'm4a' : 'jpeg');
        const name = `upload-${Date.now()}.${ext}`;
        formData.append('file', blob as unknown as Blob, name);
    } else {
        const filename = uri.split('/').pop() || `upload-${Date.now()}.${isVideo ? 'mp4' : isAudio ? 'm4a' : 'jpg'}`;
        (formData as any).append('file', {
            uri,
            name: filename,
            type: resolvedMime,
        });
    }

    formData.append('type', type);
    if (mediaId != null) {
        formData.append('media_id', String(mediaId));
    }

    const headers: Record<string, string> = {
        Accept: 'application/json',
    };
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${getApiBaseUrl()}/media/upload`, {
        method: 'POST',
        headers,
        body: formData,
    });

    const text = await response.text();
    let json: any;
    try {
        json = text ? JSON.parse(text) : {};
    } catch {
        const snippet = text.slice(0, 200).replace(/\s+/g, ' ');
        throw new Error(
            response.ok
                ? 'Server returned invalid response.'
                : `Upload failed (${response.status}). ${snippet ? `Response: ${snippet}…` : 'Check server logs.'}`
        );
    }
    const data = json?.data;

    if (!response.ok) {
        const dataFileMsg = Array.isArray(data?.file) ? data.file[0] : null;
        const fileErr = json?.errors?.file;
        const fileMsgFromErrors = Array.isArray(fileErr) ? fileErr[0] : (typeof fileErr === 'string' ? fileErr : null);
        const msg =
            (typeof dataFileMsg === 'string' ? dataFileMsg : null) ||
            fileMsgFromErrors ||
            json?.message ||
            (typeof data?.error === 'string' ? data.error : null) ||
            'Upload failed';
        throw new Error(typeof msg === 'string' ? msg : 'Upload failed');
    }

    return data;
}

/** True while automated moderation is still running (show “Reviewing”). */
export function isMediaModerationInProgress(item: Pick<MediaItem, 'moderation_status'>): boolean {
    const s = item.moderation_status;
    return s === 'pending' || s === 'scanning';
}

export function isMediaAllowedToShare(item: Pick<MediaItem, 'moderation_status'>): boolean {
    return item.moderation_status === 'approved' || item.moderation_status === 'manual_pending';
}

export function moderationFailureMessage(status?: string): string {
    if (status === 'reviewing') {
        return 'This video is still being reviewed. You can come back and try again in a few minutes.';
    }
    if (status === 'failed' || status === 'timeout') {
        return 'This file could not be checked. Please choose another file.';
    }

    return 'This file could not be sent. Please choose another file.';
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForMediaModeration(
    media: MediaItem,
    options?: { intervalMs?: number; timeoutMs?: number; returnLatestOnTimeout?: boolean },
): Promise<MediaItem> {
    let latest = media;
    const intervalMs = options?.intervalMs ?? 2500;
    const timeoutMs = options?.timeoutMs ?? 180000;
    const startedAt = Date.now();

    while (isMediaModerationInProgress(latest)) {
        if (Date.now() - startedAt >= timeoutMs) {
            if (options?.returnLatestOnTimeout) {
                return latest;
            }
            throw new MediaModerationError(moderationFailureMessage('timeout'), 'timeout');
        }
        await sleep(intervalMs);
        latest = await fetchMediaById(latest.id);
    }

    if (isMediaAllowedToShare(latest)) {
        return latest;
    }

    throw new MediaModerationError(
        moderationFailureMessage(String(latest.moderation_status ?? 'failed')),
        String(latest.moderation_status ?? 'failed'),
    );
}

/**
 * Fetch latest moderation fields for a media row (poll after upload until not pending/scanning).
 */
export async function fetchMediaById(mediaId: number): Promise<MediaItem> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${getApiBaseUrl()}/media/${mediaId}`, { method: 'GET', headers });
    const text = await response.text();
    let json: any;
    try {
        json = text ? JSON.parse(text) : {};
    } catch {
        throw new Error(`Invalid JSON (${response.status})`);
    }
    const data = json?.data;
    if (!response.ok) {
        throw new Error(json?.message || `Request failed (${response.status})`);
    }
    return data;
}

/**
 * Server-defined max sizes and allowed extensions/MIME groups per upload `type`.
 * Call after login (or before opening pickers) to show accurate limits.
 */
export async function fetchMediaUploadLimits(): Promise<MediaUploadLimitsPayload> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${getApiBaseUrl()}/media/upload-limits`, { method: 'GET', headers });
    const text = await response.text();
    let json: any;
    try {
        json = text ? JSON.parse(text) : {};
    } catch {
        throw new Error(`Invalid JSON (${response.status})`);
    }
    const data = json?.data;
    if (!response.ok || !data?.types) {
        throw new Error(json?.message || `Request failed (${response.status})`);
    }
    return data as MediaUploadLimitsPayload;
}

export function clearMediaUploadLimitsCache(): void {
    mediaUploadLimitsCache = null;
}

export function getCachedMediaUploadLimits(): MediaUploadLimitsPayload | null {
    return mediaUploadLimitsCache;
}

export async function getMediaUploadLimitsCached(options?: { force?: boolean }): Promise<MediaUploadLimitsPayload> {
    if (mediaUploadLimitsCache && !options?.force) {
        return mediaUploadLimitsCache;
    }
    const payload = await fetchMediaUploadLimits();
    mediaUploadLimitsCache = payload;

    return payload;
}

/** Fire-and-forget after login / cold start with session. Swallows errors (offline, older API). */
export async function prefetchMediaUploadLimits(): Promise<void> {
    try {
        await getMediaUploadLimitsCached();
    } catch {
        // non-fatal
    }
}

/** User-facing hint when limits are cached, e.g. "Up to 50 MB (mp4, mov, …)". */
export function formatUploadLimitLine(type: MediaUploadType): string | null {
    const row = mediaUploadLimitsCache?.types[type];
    if (!row) {
        return null;
    }
    const mimes = row.mimes ?? [];
    const ext =
        mimes.length > 0
            ? ` (${mimes.slice(0, 6).join(', ')}${mimes.length > 6 ? ', …' : ''})`
            : '';

    return `Up to ${row.max_mb} MB${ext}`;
}

export const MediaService = {
    upload: uploadMedia,
    fetchById: fetchMediaById,
    fetchUploadLimits: fetchMediaUploadLimits,
    getUploadLimitsCached: getMediaUploadLimitsCached,
    prefetchUploadLimits: prefetchMediaUploadLimits,
    clearUploadLimitsCache: clearMediaUploadLimitsCache,
    getCachedUploadLimitsSnapshot: getCachedMediaUploadLimits,
    formatUploadLimitLine,
    isModerationInProgress: isMediaModerationInProgress,
    isAllowedToShare: isMediaAllowedToShare,
    waitForModeration: waitForMediaModeration,
    moderationFailureMessage,
};
