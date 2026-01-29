/**
 * Returns the value only if it is a non-empty string and looks like an absolute image URL.
 * Use this before passing to <Image source={{ uri }} /> or Avatar so we never pass invalid uris.
 */
export function toImageUri(value: unknown): string | null {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const u = value.trim();
    return u.startsWith('http://') || u.startsWith('https://') ? u : null;
}

/**
 * Appends a cache-bust query param to the URI so the Image component refetches when content changes
 * (e.g. after avatar/profile update). Use profile.updated_at or any value that changes when the image changes.
 */
export function imageUriWithCacheBust(uri: string | null, version?: string | number | null): string | null {
    if (!uri) return null;
    if (version == null || version === '') return uri;
    const sep = uri.includes('?') ? '&' : '?';
    return `${uri}${sep}v=${encodeURIComponent(String(version))}`;
}
