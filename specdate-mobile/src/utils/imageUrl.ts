/**
 * Returns the value only if it is a non-empty string and looks like an absolute image URL.
 * Use this before passing to <Image source={{ uri }} /> or Avatar so we never pass invalid uris.
 */
export function toImageUri(value: unknown): string | null {
    if (typeof value !== 'string' || value.trim() === '') return null;
    const u = value.trim();
    return u.startsWith('http://') || u.startsWith('https://') ? u : null;
}
