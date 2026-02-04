import { Platform } from 'react-native';
import { getAuthToken, getApiBaseUrl } from './api';

export interface MediaItem {
    id: number;
    user_id: number;
    file_path: string;
    url: string;
    type: 'avatar' | 'profile_gallery' | 'chat' | 'proof' | 'round_answer_image';
    mime_type: string;
    size: number;
    created_at: string;
}

/**
 * Upload a file to the backend, or update an existing media row when mediaId is provided (profile_gallery only).
 *
 * @param uri Local file URI (image picker) or blob URL on web
 * @param type 'avatar' | 'profile_gallery' | 'chat' | 'proof'
 * @param mediaId When provided with type profile_gallery, backend updates this row's file/url instead of creating.
 */
export async function uploadMedia(
    uri: string,
    type: 'avatar' | 'profile_gallery' | 'chat' | 'proof' | 'round_answer_image',
    mediaId?: number | null
): Promise<MediaItem> {
    const formData = new FormData();

    const isWebBlob = Platform.OS === 'web' && uri.startsWith('blob:');
    if (isWebBlob) {
        const res = await fetch(uri);
        const blob = await res.blob();
        const ext = (blob.type || 'image/jpeg').split('/')[1] || 'jpeg';
        const name = `upload-${Date.now()}.${ext}`;
        formData.append('file', blob as unknown as Blob, name);
    } else {
        const filename = uri.split('/').pop() || `upload-${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : 'jpg';
        const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
        (formData as any).append('file', {
            uri,
            name: filename,
            type: mimeType,
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

    let json: any;
    try {
        json = await response.json();
    } catch {
        throw new Error(response.ok ? 'Invalid response' : `Upload failed (${response.status})`);
    }
    const data = json?.data;

    if (!response.ok) {
        const msg =
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
