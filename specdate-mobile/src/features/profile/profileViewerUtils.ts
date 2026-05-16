export const DUMMY_IMAGES = [
    'https://picsum.photos/seed/profile-a/600/800',
    'https://picsum.photos/seed/profile-b/600/800',
    'https://picsum.photos/seed/profile-c/600/800',
    'https://picsum.photos/seed/profile-d/600/800',
];

export function formatAge(dob?: string) {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    return new Date().getFullYear() - d.getFullYear();
}

export function cmToFeetInches(cm: number) {
    const realFeet = (cm * 0.393701) / 12;
    const feet = Math.floor(realFeet);
    const inches = Math.round((realFeet - feet) * 12);
    return `${feet}'${inches === 12 ? 0 : inches}"`;
}

export function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export function getIdealDateIcon(label: string) {
    const key = label.toLowerCase();
    if (key.includes('dinner') || key.includes('brunch') || key.includes('dessert') || key.includes('cooking')) return 'silverware-fork-knife';
    if (key.includes('coffee')) return 'coffee-outline';
    if (key.includes('swimming') || key.includes('beach')) return 'swim';
    if (key.includes('cinema')) return 'movie-open-outline';
    if (key.includes('music') || key.includes('dancing') || key.includes('karaoke')) return 'music-note-outline';
    if (key.includes('hiking')) return 'hiking';
    if (key.includes('gallery') || key.includes('museum')) return 'palette-outline';
    if (key.includes('arcade') || key.includes('bowling')) return 'gamepad-variant-outline';
    if (key.includes('wine')) return 'glass-wine';
    if (key.includes('trip')) return 'car-outline';
    if (key.includes('book')) return 'book-open-page-variant-outline';
    if (key.includes('comedy')) return 'microphone-variant';
    if (key.includes('fitness') || key.includes('gym')) return 'dumbbell';
    if (key.includes('picnic')) return 'basket-outline';
    return 'heart-outline';
}
