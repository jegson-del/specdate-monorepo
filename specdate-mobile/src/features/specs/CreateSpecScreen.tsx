import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, ProgressBar, IconButton, HelperText, SegmentedButtons, Switch } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useCreateSpec, CreateSpecPayload } from '../../hooks/useSpecs';
import { Dropdown } from 'react-native-paper-dropdown';
import { useUser } from '../../hooks/useUser';
import { OCCUPATION_OPTIONS, QUALIFICATION_OPTIONS, SEX_OPTIONS } from '../../constants/profileOptions';
import { MultiSelectModal } from './components/MultiSelectModal';

// --- Constants & Options ---

const DURATION_DAYS = Array.from({ length: 14 }, (_, i) => ({
    label: `${i + 1} Day${i === 0 ? '' : 's'}`,
    value: String(i + 1),
}));

const MAX_PARTICIPANTS_OPTIONS = [
    { label: '10 People', value: '10' },
    { label: '20 People', value: '20' },
    { label: '30 People', value: '30' },
    { label: '50 People', value: '50' },
    { label: '100 People', value: '100' },
];

const AGE_RANGES = [
    { label: '18 - 25', value: '18-25' },
    { label: '21 - 30', value: '21-30' },
    { label: '25 - 35', value: '25-35' },
    { label: '30 - 40', value: '30-40' },
    { label: '35 - 50', value: '35-50' },
    { label: 'All Ages (18+)', value: '18-99' },
];

const GENOTYPES = [
    { label: 'AA Only', value: 'AA' },
    { label: 'AA, AS', value: 'AA,AS' },
    { label: 'Any', value: 'ANY' },
];

const HEIGHT_MINS = [
    { label: 'Any Height', value: '0' },
    { label: '160cm+ (5\'3")', value: '160' },
    { label: '170cm+ (5\'7")', value: '170' },
    { label: '180cm+ (5\'11")', value: '180' },
    { label: '190cm+ (6\'3")', value: '190' },
];

// --- Types ---

type Step = 1 | 2 | 3;

const STEP_FROM = { opacity: 0, translateX: 10 };
const STEP_ANIMATE = { opacity: 1, translateX: 0 };

function StepWrapper({ children, style }: { children: React.ReactNode; style?: any }) {
    // Reanimated can throw `connectAnimatedNodes ... child ... does not exist` on Android
    // during TextInput re-renders. Keep it simple/stable on Android.
    if (Platform.OS === 'android') {
        return <View style={style}>{children}</View>;
    }
    return (
        <MotiView from={STEP_FROM} animate={STEP_ANIMATE} style={style}>
            {children}
        </MotiView>
    );
}

export default function CreateSpecScreen({ navigation }: any) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const createSpec = useCreateSpec();
    const me = useUser();
    const subtleText = { color: theme.colors.onSurface, opacity: 0.84 };
    const promptText = { color: theme.colors.primary, opacity: 0.98 };

    const [step, setStep] = useState<Step>(1);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('');
    const [duration, setDuration] = useState<string>('3'); // Default 3 days
    const [restrictLocation, setRestrictLocation] = useState<'open' | 'city' | 'country'>('open');

    // Bouncer (Requirements)
    const [ageRange, setAgeRange] = useState<string>('18-99');
    const [minHeight, setMinHeight] = useState<string>('0');
    const [genotype, setGenotype] = useState<string>('ANY');
    const [isAgeCompulsory, setIsAgeCompulsory] = useState(true);
    const [isHeightCompulsory, setIsHeightCompulsory] = useState(false);
    const [isGenotypeCompulsory, setIsGenotypeCompulsory] = useState(false);

    const [sexSelected, setSexSelected] = useState<string[]>([]);
    const [isSexCompulsory, setIsSexCompulsory] = useState(false);

    const [smokerPref, setSmokerPref] = useState<'any' | 'non_smoker' | 'smoker'>('any');
    const [isSmokerCompulsory, setIsSmokerCompulsory] = useState(false);

    const [occupationSelected, setOccupationSelected] = useState<string[]>([]);
    const [isOccupationCompulsory, setIsOccupationCompulsory] = useState(false);

    const [qualificationSelected, setQualificationSelected] = useState<string[]>([]);
    const [isQualificationCompulsory, setIsQualificationCompulsory] = useState(false);

    // Room Settings
    const [maxParticipants, setMaxParticipants] = useState<string>('30');

    useEffect(() => {
        const profile = (me.data as any)?.profile;
        if (!profile) return;

        // Prefill location fields from user profile (editable).
        if (!city.trim() && typeof profile.city === 'string') setCity(profile.city);
        if (!country.trim() && typeof profile.country === 'string') setCountry(profile.country);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [me.data]);

    const sexOptions = useMemo(() => Array.from(SEX_OPTIONS), []);
    const occupationOptions = useMemo(() => Array.from(OCCUPATION_OPTIONS), []);
    const qualificationOptions = useMemo(() => Array.from(QUALIFICATION_OPTIONS), []);

    const normalizeStringArray = (xs: string[]) => xs.map((s) => s.trim()).filter(Boolean);
    const isAllSelected = (selected: string[], opts: string[]) => {
        const set = new Set(selected);
        return opts.every((o) => set.has(o));
    };

    const strictLabel = (strict: boolean) => (strict ? 'Strict' : 'Flexible');

    const checklist = useMemo(() => {
        const lines: { label: string; value: string }[] = [];

        lines.push({ label: 'Title', value: title.trim() || '—' });
        lines.push({ label: 'Description', value: description.trim() ? description.trim() : '—' });

        const loc = [city.trim(), country.trim()].filter(Boolean).join(', ');
        lines.push({ label: 'Location', value: loc || '—' });

        lines.push({ label: 'Duration', value: `${duration} day(s)` });
        lines.push({ label: 'Max participants', value: maxParticipants });

        if (restrictLocation === 'open') {
            lines.push({ label: 'Join location', value: 'Open to anywhere' });
        } else if (restrictLocation === 'city') {
            lines.push({ label: 'Join location', value: city.trim() ? `Only my city (${city.trim()})` : 'Only my city' });
        } else {
            lines.push({ label: 'Join location', value: country.trim() ? `Only my country (${country.trim()})` : 'Only my country' });
        }

        // Requirements
        if (ageRange !== '18-99') lines.push({ label: `Age (${strictLabel(isAgeCompulsory)})`, value: ageRange.replace('-', '–') });
        if (minHeight !== '0') lines.push({ label: `Min height (${strictLabel(isHeightCompulsory)})`, value: `${minHeight}cm+` });
        if (genotype !== 'ANY') lines.push({ label: `Genotype (${strictLabel(isGenotypeCompulsory)})`, value: genotype });

        const sexSel = normalizeStringArray(sexSelected);
        if (sexSel.length > 0 && !isAllSelected(sexSel, sexOptions)) {
            lines.push({ label: `Gender (${strictLabel(isSexCompulsory)})`, value: sexSel.join(', ') });
        }

        if (smokerPref !== 'any') {
            lines.push({
                label: `Smoker (${strictLabel(isSmokerCompulsory)})`,
                value: smokerPref === 'smoker' ? 'Smoker' : 'Non-smoker',
            });
        }

        const occSel = normalizeStringArray(occupationSelected);
        if (occSel.length > 0) lines.push({ label: `Occupation (${strictLabel(isOccupationCompulsory)})`, value: occSel.join(', ') });

        const qualSel = normalizeStringArray(qualificationSelected);
        if (qualSel.length > 0) lines.push({ label: `Qualification (${strictLabel(isQualificationCompulsory)})`, value: qualSel.join(', ') });

        return lines;
    }, [
        ageRange,
        city,
        country,
        description,
        duration,
        genotype,
        isAgeCompulsory,
        isGenotypeCompulsory,
        isHeightCompulsory,
        isOccupationCompulsory,
        isQualificationCompulsory,
        isSexCompulsory,
        isSmokerCompulsory,
        maxParticipants,
        minHeight,
        occupationSelected,
        qualificationSelected,
        restrictLocation,
        sexOptions,
        sexSelected,
        smokerPref,
        title,
    ]);

    // --- Actions ---

    const handleNext = () => {
        if (step === 1) {
            if (!title.trim()) {
                Alert.alert('Required', 'Please add a catchy title for your Spec.');
                return;
            }
            if (!city.trim()) {
                Alert.alert('Required', 'Please enter a city/location.');
                return;
            }
            setStep(2);
            return;
        }
        if (step === 2) {
            setStep(3);
            return;
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep((s) => (s - 1) as Step);
        } else {
            navigation.goBack();
        }
    };

    const handleSubmit = async () => {
        const payload: CreateSpecPayload = {
            title,
            description,
            location_city: city,
            duration: parseInt(duration, 10),
            max_participants: parseInt(maxParticipants, 10),
            requirements: [],
        };

        // Construct requirements

        // Age
        const [minAge, maxAge] = ageRange.split('-').map(Number);
        if (ageRange !== '18-99') {
            // Backend currently supports simple operators, so we express "between" as >= and <=.
            payload.requirements.push({
                field: 'age',
                operator: '>=',
                value: minAge,
                is_compulsory: isAgeCompulsory,
            });
            payload.requirements.push({
                field: 'age',
                operator: '<=',
                value: maxAge,
                is_compulsory: isAgeCompulsory,
            });
        }

        // Height
        if (minHeight !== '0') {
            payload.requirements.push({
                field: 'height',
                operator: '>=',
                value: minHeight,
                is_compulsory: isHeightCompulsory,
            });
        }

        // Genotype
        if (genotype !== 'ANY') {
            const values = genotype.split(',');
            payload.requirements.push({
                field: 'genotype',
                operator: 'in',
                value: values,
                is_compulsory: isGenotypeCompulsory,
            });
        }

        // Location restriction (always compulsory if enabled)
        if (restrictLocation === 'city' && city.trim()) {
            payload.requirements.push({
                field: 'city',
                operator: '=',
                value: city.trim(),
                is_compulsory: true,
            });
        }
        if (restrictLocation === 'country' && country.trim()) {
            payload.requirements.push({
                field: 'country',
                operator: '=',
                value: country.trim(),
                is_compulsory: true,
            });
        }

        // Gender / Sex (omit if none or all selected)
        const sexSel = normalizeStringArray(sexSelected);
        if (sexSel.length > 0 && !isAllSelected(sexSel, sexOptions)) {
            payload.requirements.push({
                field: 'sex',
                operator: 'in',
                value: sexSel,
                is_compulsory: isSexCompulsory,
            });
        }

        // Smoker preference
        if (smokerPref !== 'any') {
            payload.requirements.push({
                field: 'is_smoker',
                operator: '=',
                value: smokerPref === 'smoker' ? '1' : '0',
                is_compulsory: isSmokerCompulsory,
            });
        }

        // Occupation (multi)
        const occSel = normalizeStringArray(occupationSelected);
        if (occSel.length > 0) {
            payload.requirements.push({
                field: 'occupation',
                operator: 'in',
                value: occSel,
                is_compulsory: isOccupationCompulsory,
            });
        }

        // Qualification (multi)
        const qualSel = normalizeStringArray(qualificationSelected);
        if (qualSel.length > 0) {
            payload.requirements.push({
                field: 'qualification',
                operator: 'in',
                value: qualSel,
                is_compulsory: isQualificationCompulsory,
            });
        }

        try {
            await createSpec.mutateAsync(payload);
            console.log('Spec created successfully, showing alert...');
            // Wrap in setTimeout to avoid race conditions with UI updates/loading state
            setTimeout(() => {
                Alert.alert('Success', 'Your Spec is live! Let the applications roll in.', [
                    { text: 'OK', onPress: () => navigation.navigate('Home') }
                ]);
            }, 500);
        } catch (e: any) {
            console.error('Spec creation failed', e);
            const msg = e.response?.data?.message || 'Failed to create spec';
            setTimeout(() => {
                Alert.alert('Error', msg);
            }, 500);
        }
    };

    // --- Render Steps ---

    const renderStep1 = () => (
        <StepWrapper style={styles.stepContent}>
            <Text variant="headlineSmall" style={[styles.stepTitle, { color: theme.colors.onSurface }]}>The Vibe</Text>
            <Text variant="bodyMedium" style={[styles.stepSubtitle, styles.stepSubtitleText, promptText]}>
                What kind of connection are you looking for?
            </Text>

            <TextInput
                mode="outlined"
                label="Headline / Title"
                placeholder="e.g. Dinner date this Friday?"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
                textColor={theme.colors.onSurface}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
            />

            <TextInput
                mode="outlined"
                label="Details (Optional)"
                placeholder="Describe the plan..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                style={styles.input}
                textColor={theme.colors.onSurface}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
            />

            <TextInput
                mode="outlined"
                label="City / Location"
                value={city}
                onChangeText={setCity}
                style={styles.input}
                textColor={theme.colors.onSurface}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
            />

            <TextInput
                mode="outlined"
                label="Country (optional)"
                value={country}
                onChangeText={setCountry}
                style={styles.input}
                textColor={theme.colors.onSurface}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
            />

            <View style={styles.reqBlock}>
                <Text variant="titleMedium" style={[styles.reqTitle, { color: theme.colors.onSurface }]}>
                    Location restriction
                </Text>
                <Text variant="bodySmall" style={[styles.reqHint, subtleText]}>
                    Do you want to restrict who can join based on location?
                </Text>
                <SegmentedButtons
                    value={restrictLocation}
                    onValueChange={(v) => setRestrictLocation(v as any)}
                    buttons={[
                        {
                            value: 'open',
                            label: 'Open',
                            style: [
                                { flex: 1, borderWidth: 1, borderColor: theme.colors.outline },
                                restrictLocation === 'open'
                                    ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    : { backgroundColor: theme.colors.elevation.level2 },
                            ],
                            labelStyle: [
                                { fontSize: 12 },
                                restrictLocation === 'open'
                                    ? { color: theme.colors.onPrimary, fontWeight: '900' }
                                    : { color: theme.colors.onSurface, fontWeight: '800' },
                            ],
                        },
                        {
                            value: 'city',
                            label: 'My city',
                            style: [
                                { flex: 1, borderWidth: 1, borderColor: theme.colors.outline },
                                restrictLocation === 'city'
                                    ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    : { backgroundColor: theme.colors.elevation.level2 },
                            ],
                            labelStyle: [
                                { fontSize: 12 },
                                restrictLocation === 'city'
                                    ? { color: theme.colors.onPrimary, fontWeight: '900' }
                                    : { color: theme.colors.onSurface, fontWeight: '800' },
                            ],
                        },
                        {
                            value: 'country',
                            label: 'My country',
                            style: [
                                { flex: 1, borderWidth: 1, borderColor: theme.colors.outline },
                                restrictLocation === 'country'
                                    ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    : { backgroundColor: theme.colors.elevation.level2 },
                            ],
                            labelStyle: [
                                { fontSize: 11 },
                                restrictLocation === 'country'
                                    ? { color: theme.colors.onPrimary, fontWeight: '900' }
                                    : { color: theme.colors.onSurface, fontWeight: '800' },
                            ],
                        },
                    ]}
                />
                {restrictLocation !== 'open' ? (
                    <Text variant="bodySmall" style={[subtleText, { marginTop: 8 }]}>
                        This will be saved as a compulsory requirement.
                    </Text>
                ) : null}
            </View>

            <Dropdown
                label="Duration (How long is this open?)"
                mode="outlined"
                options={DURATION_DAYS}
                value={duration}
                onSelect={(v) => setDuration(v || '3')}
            />
        </StepWrapper>
    );

    const renderStep2 = () => (
        <StepWrapper style={styles.stepContent}>
            <Text variant="headlineSmall" style={[styles.stepTitle, { color: theme.colors.onSurface }]}>The Bouncer</Text>
            <Text variant="bodyMedium" style={[styles.stepSubtitle, styles.stepSubtitleText, promptText]}>
                Set your requirements. "Compulsory" means they MUST match.
            </Text>

            {/* Age */}
            <View style={styles.reqBlock}>
                <View style={styles.reqHeader}>
                    <Text variant="titleMedium" style={[styles.reqTitle, { color: theme.colors.onSurface }]}>Age Range</Text>
                    <View style={styles.switchWrap}>
                        <Text variant="labelSmall" style={[styles.reqLabel, { color: theme.colors.onSurface }]}>Strict?</Text>
                        <Switch value={isAgeCompulsory} onValueChange={setIsAgeCompulsory} />
                    </View>
                </View>
                <Dropdown
                    label="Age Preference"
                    mode="outlined"
                    options={AGE_RANGES}
                    value={ageRange}
                    onSelect={(v) => setAgeRange(v || '18-99')}
                />
            </View>

            {/* Height */}
            <View style={styles.reqBlock}>
                <View style={styles.reqHeader}>
                    <Text variant="titleMedium" style={[styles.reqTitle, { color: theme.colors.onSurface }]}>Min Height</Text>
                    <View style={styles.switchWrap}>
                        <Text variant="labelSmall" style={[styles.reqLabel, { color: theme.colors.onSurface }]}>Strict?</Text>
                        <Switch value={isHeightCompulsory} onValueChange={setIsHeightCompulsory} />
                    </View>
                </View>
                <Dropdown
                    label="Minimum Height"
                    mode="outlined"
                    options={HEIGHT_MINS}
                    value={minHeight}
                    onSelect={(v) => setMinHeight(v || '0')}
                />
            </View>

            {/* Genotype */}
            <View style={styles.reqBlock}>
                <View style={styles.reqHeader}>
                    <Text variant="titleMedium" style={[styles.reqTitle, { color: theme.colors.onSurface }]}>Genotype</Text>
                    <View style={styles.switchWrap}>
                        <Text variant="labelSmall" style={[styles.reqLabel, { color: theme.colors.onSurface }]}>Strict?</Text>
                        <Switch value={isGenotypeCompulsory} onValueChange={setIsGenotypeCompulsory} />
                    </View>
                </View>
                <Dropdown
                    label="Genotype Preference"
                    mode="outlined"
                    options={GENOTYPES}
                    value={genotype}
                    onSelect={(v) => setGenotype(v || 'ANY')}
                />
            </View>

            {/* Gender */}
            <View style={styles.reqBlock}>
                <View style={styles.reqHeader}>
                    <Text variant="titleMedium" style={[styles.reqTitle, { color: theme.colors.onSurface }]}>Gender</Text>
                    <View style={styles.switchWrap}>
                        <Text variant="labelSmall" style={[styles.reqLabel, { color: theme.colors.onSurface }]}>Strict?</Text>
                        <Switch value={isSexCompulsory} onValueChange={setIsSexCompulsory} />
                    </View>
                </View>
                <MultiSelectModal
                    title="Select gender(s)"
                    options={sexOptions}
                    value={sexSelected}
                    onChange={setSexSelected}
                    placeholder="Any (all genders)"
                />
            </View>

            {/* Smoker */}
            <View style={styles.reqBlock}>
                <View style={styles.reqHeader}>
                    <Text variant="titleMedium" style={[styles.reqTitle, { color: theme.colors.onSurface }]}>Smoker</Text>
                    <View style={styles.switchWrap}>
                        <Text variant="labelSmall" style={[styles.reqLabel, { color: theme.colors.onSurface }]}>Strict?</Text>
                        <Switch value={isSmokerCompulsory} onValueChange={setIsSmokerCompulsory} />
                    </View>
                </View>
                <SegmentedButtons
                    value={smokerPref}
                    onValueChange={(v) => setSmokerPref(v as any)}
                    buttons={[
                        {
                            value: 'any',
                            label: "I don't mind",
                            style: [
                                { flex: 1, borderWidth: 1, borderColor: theme.colors.outline, paddingHorizontal: 4 },
                                smokerPref === 'any'
                                    ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    : { backgroundColor: theme.colors.elevation.level2 },
                            ],
                            labelStyle: [
                                { fontSize: 10 },
                                smokerPref === 'any'
                                    ? { color: theme.colors.onPrimary, fontWeight: '900' }
                                    : { color: theme.colors.onSurface, fontWeight: '800' },
                            ],
                        },
                        {
                            value: 'non_smoker',
                            label: 'Non-smoker',
                            style: [
                                { flex: 1, borderWidth: 1, borderColor: theme.colors.outline },
                                smokerPref === 'non_smoker'
                                    ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    : { backgroundColor: theme.colors.elevation.level2 },
                            ],
                            labelStyle: [
                                { fontSize: 11 },
                                smokerPref === 'non_smoker'
                                    ? { color: theme.colors.onPrimary, fontWeight: '900' }
                                    : { color: theme.colors.onSurface, fontWeight: '800' },
                            ],
                        },
                        {
                            value: 'smoker',
                            label: 'Smoker',
                            style: [
                                { flex: 1, borderWidth: 1, borderColor: theme.colors.outline },
                                smokerPref === 'smoker'
                                    ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    : { backgroundColor: theme.colors.elevation.level2 },
                            ],
                            labelStyle: [
                                { fontSize: 11 },
                                smokerPref === 'smoker'
                                    ? { color: theme.colors.onPrimary, fontWeight: '900' }
                                    : { color: theme.colors.onSurface, fontWeight: '800' },
                            ],
                        },
                    ]}
                />
            </View>

            {/* Occupation */}
            <View style={styles.reqBlock}>
                <View style={styles.reqHeader}>
                    <Text variant="titleMedium" style={[styles.reqTitle, { color: theme.colors.onSurface }]}>Occupation</Text>
                    <View style={styles.switchWrap}>
                        <Text variant="labelSmall" style={[styles.reqLabel, { color: theme.colors.onSurface }]}>Strict?</Text>
                        <Switch value={isOccupationCompulsory} onValueChange={setIsOccupationCompulsory} />
                    </View>
                </View>
                <MultiSelectModal
                    title="Select occupation(s)"
                    options={occupationOptions}
                    value={occupationSelected}
                    onChange={setOccupationSelected}
                    placeholder="Any occupation"
                />
            </View>

            {/* Qualification */}
            <View style={styles.reqBlock}>
                <View style={styles.reqHeader}>
                    <Text variant="titleMedium" style={[styles.reqTitle, { color: theme.colors.onSurface }]}>Qualification</Text>
                    <View style={styles.switchWrap}>
                        <Text variant="labelSmall" style={[styles.reqLabel, { color: theme.colors.onSurface }]}>Strict?</Text>
                        <Switch value={isQualificationCompulsory} onValueChange={setIsQualificationCompulsory} />
                    </View>
                </View>
                <MultiSelectModal
                    title="Select qualification(s)"
                    options={qualificationOptions}
                    value={qualificationSelected}
                    onChange={setQualificationSelected}
                    placeholder="Any qualification"
                />
            </View>
        </StepWrapper>
    );

    const renderStep3 = () => (
        <StepWrapper style={styles.stepContent}>
            <Text variant="headlineSmall" style={[styles.stepTitle, { color: theme.colors.onSurface }]}>Final Details</Text>

            <View style={styles.reqBlock}>
                <Text variant="titleMedium" style={[styles.reqTitle, { color: theme.colors.onSurface }]}>Room Capacity</Text>
                <Text variant="bodySmall" style={[styles.reqHint, subtleText]}>
                    How many approved people do you want to manage?
                </Text>
                <Dropdown
                    label="Max Participants"
                    mode="outlined"
                    options={MAX_PARTICIPANTS_OPTIONS}
                    value={maxParticipants}
                    onSelect={(v) => setMaxParticipants(v || '30')}
                />
            </View>

            <View style={styles.summaryCard}>
                <Text variant="titleSmall" style={{ color: theme.colors.primary }}>Ready to Post?</Text>
                <View style={{ marginTop: 10, gap: 8 }}>
                    {checklist.map((row) => (
                        <View key={row.label} style={{ flexDirection: 'row', gap: 10 }}>
                            <Text style={{ width: 120, fontWeight: '900', color: theme.colors.onSurface }}>
                                {row.label}
                            </Text>
                            <Text style={{ flex: 1, color: theme.colors.onSurface, opacity: 0.85 }}>
                                {row.value}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        </StepWrapper>
    );

    if (me.data?.is_paused) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
                <Text variant="titleMedium" style={{ textAlign: 'center', marginBottom: 12 }}>
                    Your account is paused
                </Text>
                <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 24, color: theme.colors.onSurfaceVariant }}>
                    Unpause your account in Profile to create a spec.
                </Text>
                <Button mode="contained" onPress={() => navigation.navigate('Profile')}>
                    Go to Profile
                </Button>
                <Button mode="text" onPress={() => navigation.goBack()} style={{ marginTop: 8 }}>
                    Back
                </Button>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <IconButton icon="close" onPress={() => navigation.goBack()} />
                <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Create Spec</Text>
                <View style={{ width: 40 }} />
            </View>

            <ProgressBar progress={step / 3} color={theme.colors.primary} style={styles.progress} />

            <ScrollView contentContainerStyle={styles.scroll}>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
                {step > 1 && (
                    <Button mode="outlined" onPress={handleBack} style={{ flex: 1, marginRight: 10 }}>
                        Back
                    </Button>
                )}
                <Button
                    mode="contained"
                    onPress={step === 3 ? handleSubmit : handleNext}
                    style={{ flex: 2 }}
                    loading={createSpec.isPending}
                >
                    {step === 3 ? 'Publish Spec' : 'Next'}
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
    progress: { height: 4 },
    scroll: { padding: 24 },
    stepContent: { gap: 16 },
    stepTitle: { marginBottom: 8, fontWeight: '900' },
    stepSubtitle: { marginBottom: 20 },
    stepSubtitleText: { fontWeight: '900' },
    input: { backgroundColor: 'transparent' },
    footer: {
        paddingHorizontal: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        flexDirection: 'row',
    },
    reqBlock: {
        backgroundColor: 'rgba(0,0,0,0.02)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
    },
    reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    switchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    reqTitle: { fontWeight: '900' },
    reqLabel: { fontWeight: '800' },
    reqHint: { marginBottom: 10 },
    summaryCard: {
        backgroundColor: 'rgba(124, 58, 237, 0.08)',
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
        borderWidth: 1,
        borderColor: 'rgba(124, 58, 237, 0.2)',
    }
});
