export const OTHER_VALUE = '__other__';

export const HEIGHT_OPTIONS = Array.from({ length: 121 }, (_, i) => {
    const cm = i + 130;
    const realFeet = (cm * 0.393701) / 12;
    const feet = Math.floor(realFeet);
    const inches = Math.round((realFeet - feet) * 12);
    return { label: `${cm} cm (${feet}'${inches}")`, value: String(cm) };
});

export const ETHNICITY_OPTIONS = [
    'Asian',
    'Black / African Descent',
    'Hispanic / Latino',
    'Middle Eastern',
    'Native American / Indigenous',
    'Pacific Islander',
    'South Asian',
    'White / Caucasian',
    'Multiracial / Mixed',
    'Prefer not to say',
] as const;

export const DRINKING_OPTIONS = [
    { label: 'No', value: 'no' },
    { label: 'Socially', value: 'socially' },
    { label: 'Occasionally', value: 'occasionally' },
];

export function normalizeStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
    return [];
}

export function getFilteredOptions(base: readonly string[], query: string) {
    const q = query.trim().toLowerCase();
    const baseObjs = base.map((v) => ({ label: v, value: v }));
    const filtered = q ? baseObjs.filter((o) => o.label.toLowerCase().includes(q)) : baseObjs;
    return [...filtered, { label: 'Other...', value: OTHER_VALUE }];
}

export function formatYYYYMMDD(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export function latestAdultDob() {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    d.setHours(23, 59, 59, 999);
    return d;
}
