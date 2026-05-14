export function safeParseMaybeJson(v: any): any {
    if (Array.isArray(v)) return v;
    if (typeof v !== 'string') return v;
    const trimmed = v.trim();
    if (!trimmed) return v;
    if (!(trimmed.startsWith('[') || trimmed.startsWith('{'))) return v;
    try {
        return JSON.parse(trimmed);
    } catch {
        return v;
    }
}

export function requirementIcon(field: string) {
    switch (field) {
        case 'age':
            return 'calendar-account';
        case 'height':
            return 'human-male-height';
        case 'genotype':
            return 'dna';
        case 'sex':
            return 'gender-male-female';
        case 'is_smoker':
            return 'smoking';
        case 'occupation':
            return 'briefcase';
        case 'qualification':
            return 'school';
        case 'city':
        case 'country':
            return 'map-marker';
        default:
            return 'checkbox-marked-circle-outline';
    }
}

export function isAudioMedia(media?: any) {
    return String(media?.type ?? '').includes('_audio') || String(media?.mime_type ?? '').startsWith('audio/');
}

export function isVideoMedia(media?: any) {
    return String(media?.type ?? '').includes('_video') || String(media?.mime_type ?? '').startsWith('video/');
}

export function toNumber(v: any): number | null {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

export function cmToFeetInches(cm: number) {
    const realFeet = (cm * 0.393701) / 12;
    const feet = Math.floor(realFeet);
    const inches = Math.round((realFeet - feet) * 12);
    return { feet, inches: inches === 12 ? 0 : inches, feetAdjusted: inches === 12 ? feet + 1 : feet };
}
