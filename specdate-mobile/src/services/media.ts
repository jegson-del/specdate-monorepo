import { Platform } from 'react-native';
import { getAuthToken, getApiBaseUrl } from './api';

export interface MediaItem {
    id: number;
    user_id: number;
    file_path: string;
    url: string;
    type: 'avatar' | 'profile_gallery' | 'chat' | 'proof' | 'round_answer_image' | 'round_answer_video';
    mime_type: string;
    size: number;
    created_at: string;
}

const VIDEO_EXT_MIME: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    webm: 'video/webm',
};

function getMimeTypeFromUri(uri: string, hint?: string): string {
    if (hint && (hint.startsWith('image/') || hint.startsWith('video/'))) return hint;
    const filename = uri.split('/').pop() || '';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    if (VIDEO_EXT_MIME[ext]) return VIDEO_EXT_MIME[ext];
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    return ext === 'png' || ext === 'gif' || ext === 'webp' ? `image/${ext}` : 'image/jpeg';
}

/**
 * Upload a file to the backend, or update an existing media row when mediaId is provided (profile_gallery only).
 *
 * @param uri Local file URI (image picker / camera) or blob URL on web
 * @param type 'avatar' | 'profile_gallery' | 'chat' | 'proof' | 'round_answer_image' | 'round_answer_video'
 * @param mediaId When provided with type profile_gallery, backend updates this row's file/url instead of creating.
 * @param mimeType Optional MIME (e.g. from ImagePicker asset) so video/image is sent correctly.
 */
export async function uploadMedia(
    uri: string,
    type: 'avatar' | 'profile_gallery' | 'chat' | 'proof' | 'round_answer_image' | 'round_answer_video',
    mediaId?: number | null,
    mimeType?: string | null
): Promise<MediaItem> {
    const formData = new FormData();
    const resolvedMime = mimeType || getMimeTypeFromUri(uri);
    const isVideo = resolvedMime.startsWith('video/');

    const isWebBlob = Platform.OS === 'web' && uri.startsWith('blob:');
    if (isWebBlob) {
        const res = await fetch(uri);
        const blob = await res.blob();
        const ext = (blob.type || resolvedMime).split('/')[1] || (isVideo ? 'mp4' : 'jpeg');
        const name = `upload-${Date.now()}.${ext}`;
        formData.append('file', blob as unknown as Blob, name);
    } else {
        const filename = uri.split('/').pop() || `upload-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
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
        const fileErr = json?.errors?.file;
        const fileMsg = Array.isArray(fileErr) ? fileErr[0] : (typeof fileErr === 'string' ? fileErr : null);
        const msg =
            fileMsg ||
            json?.message ||
            (Array.isArray(data?.file) && data.file[0]) ||
            (typeof data?.error === 'string' ? data.error : null) ||
            'Upload failed';
        throw new Error(typeof msg === 'string' ? msg : 'Upload failed');
    }

    return data;
}

export const MediaService = {
    upload: uploadMedia,
};
