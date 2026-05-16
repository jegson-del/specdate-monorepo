export const DURATION_DAYS = Array.from({ length: 30 }, (_, i) => ({
    label: `${i + 1} Day${i === 0 ? '' : 's'}`,
    value: String(i + 1),
}));

export const MAX_PARTICIPANTS_OPTIONS = [
    { label: '10 People', value: '10' },
    { label: '20 People', value: '20' },
    { label: '30 People', value: '30' },
    { label: '50 People', value: '50' },
    { label: '100 People', value: '100' },
];

export const AGE_RANGES = [
    { label: '18 - 25', value: '18-25' },
    { label: '21 - 30', value: '21-30' },
    { label: '25 - 35', value: '25-35' },
    { label: '30 - 40', value: '30-40' },
    { label: '35 - 50', value: '35-50' },
    { label: 'All Ages (18+)', value: '18-99' },
];

export const GENOTYPES = [
    { label: 'AA Only', value: 'AA' },
    { label: 'AA, AS', value: 'AA,AS' },
    { label: 'Any', value: 'ANY' },
];

export const HEIGHT_MINS = [
    { label: 'Any Height', value: '0' },
    { label: '160cm+ (5\'3")', value: '160' },
    { label: '170cm+ (5\'7")', value: '170' },
    { label: '180cm+ (5\'11")', value: '180' },
    { label: '190cm+ (6\'3")', value: '190' },
];

export type CreateSpecStep = 1 | 2 | 3;

export const normalizeStringArray = (xs: string[]) => xs.map((s) => s.trim()).filter(Boolean);

export const isAllSelected = (selected: string[], opts: string[]) => {
    const set = new Set(selected);
    return opts.every((o) => set.has(o));
};

export const strictLabel = (strict: boolean) => (strict ? 'Strict' : 'Flexible');
