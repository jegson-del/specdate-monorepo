import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Button, useTheme, TextInput, SegmentedButtons, HelperText, Searchbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';
import { profileSchema, ProfileFormData } from '../../utils/validation';
// We need to update validation.ts too, but for now we update strict typing here if needed locally
// Actually ProfileFormData comes from validation.ts so we should update that file first or cast here.
// But let's assume we will update validation.ts next.

import { ProfileService } from '../../services/profile';
import { MotiView } from 'moti';
import axios from 'axios';
import * as Location from 'expo-location';
import { Dropdown } from 'react-native-paper-dropdown';
import { OCCUPATION_OPTIONS, QUALIFICATION_OPTIONS } from '../../constants/profileOptions';

let didTryAutoProfileLocationPrefill = false;

let DateTimePicker: any = null;
let DateTimePickerAndroid: any = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-community/datetimepicker');
    DateTimePicker = mod?.default ?? null;
    DateTimePickerAndroid = mod?.DateTimePickerAndroid ?? null;
} catch {
    DateTimePicker = null;
    DateTimePickerAndroid = null;
}

function formatYYYYMMDD(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

const OTHER_VALUE = '__other__';

const HEIGHT_OPTIONS = Array.from({ length: 121 }, (_, i) => {
    const cm = i + 130; // 130cm to 250cm
    const realFeet = (cm * 0.393701) / 12;
    const feet = Math.floor(realFeet);
    const inches = Math.round((realFeet - feet) * 12);
    return {
        label: `${cm} cm (${feet}'${inches}")`,
        value: String(cm),
    };
});

const ETHNICITY_OPTIONS = [
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
];

export default function ProfileScreen({ navigation }: any) {
    const theme = useTheme();
    const promptText = { color: theme.colors.primary, opacity: 0.98 };
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [locLoading, setLocLoading] = useState(false);
    const [locHint, setLocHint] = useState<string | null>(null);
    const [showDobPicker, setShowDobPicker] = useState(false);

    const [occupationSearch, setOccupationSearch] = useState('');
    const [qualificationSearch, setQualificationSearch] = useState('');
    const [ethnicitySearch, setEthnicitySearch] = useState('');

    const [occupationSelect, setOccupationSelect] = useState<string | undefined>(undefined);
    const [qualificationSelect, setQualificationSelect] = useState<string | undefined>(undefined);
    const [ethnicitySelect, setEthnicitySelect] = useState<string | undefined>(undefined);

    const [occupationOther, setOccupationOther] = useState('');
    const [qualificationOther, setQualificationOther] = useState('');
    const [ethnicityOther, setEthnicityOther] = useState('');

    const [form, setForm] = useState<Partial<ProfileFormData>>({
        full_name: '',
        dob: '',
        sex: 'Male',
        occupation: '',
        qualification: '',
        hobbies: '',
        is_smoker: false,
        is_drug_user: false,
        sexual_orientation: 'Heterosexual',
        latitude: undefined,
        longitude: undefined,
        city: '',
        state: '',
        country: '',
        height: undefined,
        ethnicity: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateForm = (patch: Partial<ProfileFormData>) => {
        setForm((prev) => ({ ...prev, ...patch }));
    };

    const occupationOptions = useMemo(() => {
        const base = OCCUPATION_OPTIONS.map((v) => ({ label: v, value: v }));
        const q = occupationSearch.trim().toLowerCase();
        const filtered = q ? base.filter((o) => o.label.toLowerCase().includes(q)) : base;
        return [...filtered, { label: 'Other…', value: OTHER_VALUE }];
    }, [occupationSearch]);

    const qualificationOptions = useMemo(() => {
        const base = QUALIFICATION_OPTIONS.map((v) => ({ label: v, value: v }));
        const q = qualificationSearch.trim().toLowerCase();
        const filtered = q ? base.filter((o) => o.label.toLowerCase().includes(q)) : base;
        return [...filtered, { label: 'Other…', value: OTHER_VALUE }];
    }, [qualificationSearch]);

    const ethnicityOptions = useMemo(() => {
        const base = ETHNICITY_OPTIONS.map((v) => ({ label: v, value: v }));
        const q = ethnicitySearch.trim().toLowerCase();
        const filtered = q ? base.filter((o) => o.label.toLowerCase().includes(q)) : base;
        return [...filtered, { label: 'Other…', value: OTHER_VALUE }];
    }, [ethnicitySearch]);

    const dobDate = useMemo(() => {
        const raw = (form.dob || '').trim();
        if (!raw) return new Date(2000, 0, 1);
        const parsed = new Date(raw);
        return isNaN(parsed.getTime()) ? new Date(2000, 0, 1) : parsed;
    }, [form.dob]);

    const openDobPicker = () => {
        // Android: prefer imperative API to avoid mount/unmount glitches.
        if (Platform.OS === 'android' && DateTimePickerAndroid) {
            DateTimePickerAndroid.open({
                value: dobDate,
                mode: 'date',
                is24Hour: true,
                maximumDate: new Date(),
                onChange: (event: any, selected?: Date) => {
                    // event.type: 'set' | 'dismissed' | 'neutralButtonPressed'
                    if (event?.type !== 'set') return;
                    if (!selected) return;
                    setForm((prev) => ({ ...prev, dob: formatYYYYMMDD(selected) }));
                },
            });
            return;
        }

        // iOS / others: fall back to component rendering.
        setShowDobPicker(true);
    };

    const prefillFromLocation = async () => {
        setLocLoading(true);
        setLocHint(null);
        try {
            const perm = await Location.requestForegroundPermissionsAsync();
            if (perm.status !== 'granted') {
                // Non-blocking: user can fill manually
                setLocHint('Location permission not granted (fill manually).');
                return;
            }

            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                setLocHint('Location services are off (fill manually).');
                return;
            }

            let pos = await Location.getLastKnownPositionAsync();
            if (!pos) {
                pos = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
            }
            if (!pos) {
                setLocHint('Could not detect location (fill manually).');
                return;
            }

            const { latitude, longitude } = pos.coords;
            const places = await Location.reverseGeocodeAsync({ latitude, longitude });
            const place = places?.[0];

            setForm((prev) => ({
                ...prev,
                latitude,
                longitude,
                city: place?.city ?? prev.city,
                state: place?.region ?? prev.state,
                country: place?.country ?? prev.country,
            }));
        } catch (e) {
            setLocHint('Could not detect location (fill manually).');
        } finally {
            setLocLoading(false);
        }
    };

    useEffect(() => {
        if (didTryAutoProfileLocationPrefill) return;
        didTryAutoProfileLocationPrefill = true;
        if (form.country || form.city || form.state) return;
        void prefillFromLocation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // If profile already has values (future: GET /user), initialize dropdown selections.
    useEffect(() => {
        const occ = (form.occupation || '').trim();
        if (occ) {
            if (OCCUPATION_OPTIONS.includes(occ as any)) {
                setOccupationSelect(occ);
            } else {
                setOccupationSelect(OTHER_VALUE);
                setOccupationOther(occ);
            }
        }

        const qual = (form.qualification || '').trim();
        if (qual) {
            if (QUALIFICATION_OPTIONS.includes(qual as any)) {
                setQualificationSelect(qual);
            } else {
                setQualificationSelect(OTHER_VALUE);
                setQualificationOther(qual);
            }
        }

        const eth = (form.ethnicity || '').trim();
        if (eth) {
            if (ETHNICITY_OPTIONS.includes(eth)) {
                setEthnicitySelect(eth);
            } else {
                setEthnicitySelect(OTHER_VALUE);
                setEthnicityOther(eth);
            }
        }
        // run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSave = async () => {
        setLoading(true);
        setErrors({});
        try {
            // Validate
            profileSchema.parse(form);

            // API Call
            await ProfileService.update(form);

            Alert.alert("Success", "Profile updated!", [
                {
                    text: "Continue",
                    onPress: () =>
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Home' }],
                        }),
                }
            ]);

        } catch (error: any) {
            if (error instanceof z.ZodError) {
                const fieldErrors: Record<string, string> = {};
                error.issues.forEach((issue) => {
                    const path = issue.path[0];
                    if (path) {
                        fieldErrors[path.toString()] = issue.message;
                    }
                });
                setErrors(fieldErrors);
                console.log("Validation errors:", fieldErrors);
                Alert.alert("Validation Error", "Please check the highlighted fields.");
            } else {
                if (axios.isAxiosError(error)) {
                    const status = error.response?.status;
                    const msg = (error.response?.data as any)?.message;
                    Alert.alert("Error", msg || `Failed to update profile (${status ?? 'no status'})`);
                    console.error('Profile update error:', status, error.response?.data);
                    return;
                }
                console.error(error);
                Alert.alert("Error", "Failed to update profile. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.colors.background,
                    paddingTop: insets.top,
                    paddingRight: insets.right,
                    paddingBottom: insets.bottom,
                    paddingLeft: insets.left,
                },
            ]}
        >
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Text variant="headlineSmall" style={[styles.screenTitle, { color: theme.colors.onSurface }]}>
                    Complete Your Profile
                </Text>
                <Text variant="bodyMedium" style={[styles.screenSubtitle, styles.screenSubtitleText, promptText]}>
                    Tell us more about yourself to find your perfect spec.
                </Text>

                <MotiView animate={{ opacity: 1 }} style={styles.form}>

                    <TextInput
                        mode="outlined"
                        label="Full Name"
                        value={form.full_name}
                        onChangeText={(t) => updateForm({ full_name: t })}
                        style={styles.input}
                        error={!!errors.full_name}
                    />
                    {errors.full_name && <HelperText type="error">{errors.full_name}</HelperText>}

                    <TextInput
                        mode="outlined"
                        label="Date of Birth"
                        value={form.dob}
                        onChangeText={(t) => updateForm({ dob: t })}
                        style={styles.input}
                        error={!!errors.dob}
                        placeholder="YYYY-MM-DD"
                        editable={DateTimePicker ? false : true}
                        right={DateTimePicker ? <TextInput.Icon icon="calendar" onPress={openDobPicker} /> : undefined}
                    />
                    {errors.dob && <HelperText type="error">{errors.dob}</HelperText>}

                    {DateTimePicker ? (
                        Platform.OS !== 'android' && showDobPicker ? (
                            <DateTimePicker
                                value={dobDate}
                                mode="date"
                                display="default"
                                onChange={(event: any, selected?: Date) => {
                                    if (event?.type === 'dismissed') {
                                        setShowDobPicker(false);
                                        return;
                                    }
                                    if (!selected) return;
                                    setShowDobPicker(false);
                                    setForm((prev) => ({ ...prev, dob: formatYYYYMMDD(selected) }));
                                }}
                                maximumDate={new Date()}
                            />
                        ) : null
                    ) : (
                        <HelperText type="info">
                            Install `@react-native-community/datetimepicker` to enable calendar DOB selection.
                        </HelperText>
                    )}

                    <Text variant="bodyLarge" style={{ marginTop: 10, color: theme.colors.onSurface }}>Gender</Text>
                    <SegmentedButtons
                        value={form.sex || 'Male'}
                        onValueChange={(val) => updateForm({ sex: val as any })}
                        buttons={[
                            { value: 'Male', label: 'Male' },
                            { value: 'Female', label: 'Female' },
                            { value: 'Other', label: 'Other' },
                        ]}
                        style={styles.segmented}
                    />

                    <Text variant="bodyLarge" style={{ marginTop: 10, color: theme.colors.onSurface }}>Sexual Orientation</Text>
                    <SegmentedButtons
                        value={form.sexual_orientation || 'Heterosexual'}
                        onValueChange={(val) => updateForm({ sexual_orientation: val })}
                        buttons={[
                            { value: 'Heterosexual', label: 'Heterosexual' },
                            { value: 'Homosexual', label: 'Homosexual' },
                            { value: 'Bisexual', label: 'Bisexual' },
                            // { value: 'Other', label: 'Other' }, // Can expand if needed
                        ]}
                        style={styles.segmented}
                    />
                    {errors.sexual_orientation && <HelperText type="error">{errors.sexual_orientation}</HelperText>}

                    <Text variant="bodyLarge" style={{ marginTop: 10, color: theme.colors.onSurface }}>Smoker?</Text>
                    <SegmentedButtons
                        value={form.is_smoker ? 'yes' : 'no'}
                        onValueChange={(val) => updateForm({ is_smoker: val === 'yes' })}
                        buttons={[
                            { value: 'no', label: 'No' },
                            { value: 'yes', label: 'Yes' },
                        ]}
                        style={styles.segmented}
                    />
                    {errors.is_smoker && <HelperText type="error">{errors.is_smoker}</HelperText>}

                    <Text variant="bodyLarge" style={{ marginTop: 10, color: theme.colors.onSurface }}>Drug use?</Text>
                    <SegmentedButtons
                        value={form.is_drug_user ? 'yes' : 'no'}
                        onValueChange={(val) => updateForm({ is_drug_user: val === 'yes' })}
                        buttons={[
                            { value: 'no', label: 'No' },
                            { value: 'yes', label: 'Yes' },
                        ]}
                        style={styles.segmented}
                    />
                    {errors.is_drug_user && <HelperText type="error">{errors.is_drug_user}</HelperText>}
                    <Dropdown
                        label="Occupation"
                        placeholder="Select occupation"
                        mode="outlined"
                        options={occupationOptions}
                        value={occupationSelect}
                        onSelect={(v) => {
                            setOccupationSelect(v);
                            setOccupationSearch('');
                            if (v === OTHER_VALUE) {
                                // keep whatever the user typed previously (if any)
                                setForm((prev) => ({ ...prev, occupation: occupationOther }));
                                return;
                            }
                            setForm((prev) => ({ ...prev, occupation: v || '' }));
                        }}
                        error={!!errors.occupation}
                        CustomMenuHeader={() => (
                            <View style={styles.searchHeader}>
                                <Searchbar
                                    placeholder="Search occupation"
                                    value={occupationSearch}
                                    onChangeText={setOccupationSearch}
                                    autoCapitalize="none"
                                />
                            </View>
                        )}
                    />
                    {errors.occupation && <HelperText type="error">{errors.occupation}</HelperText>}

                    {occupationSelect === OTHER_VALUE ? (
                        <TextInput
                            mode="outlined"
                            label="Occupation (Other)"
                            value={occupationOther}
                            onChangeText={(t) => {
                                setOccupationOther(t);
                                setForm((prev) => ({ ...prev, occupation: t }));
                            }}
                            style={styles.input}
                            error={!!errors.occupation}
                        />
                    ) : null}

                    <Dropdown
                        label="Qualification"
                        placeholder="Select qualification"
                        mode="outlined"
                        options={qualificationOptions}
                        value={qualificationSelect}
                        onSelect={(v) => {
                            setQualificationSelect(v);
                            setQualificationSearch('');
                            if (v === OTHER_VALUE) {
                                setForm((prev) => ({ ...prev, qualification: qualificationOther }));
                                return;
                            }
                            setForm((prev) => ({ ...prev, qualification: v || '' }));
                        }}
                        error={!!errors.qualification}
                        CustomMenuHeader={() => (
                            <View style={styles.searchHeader}>
                                <Searchbar
                                    placeholder="Search qualification"
                                    value={qualificationSearch}
                                    onChangeText={setQualificationSearch}
                                    autoCapitalize="none"
                                />
                            </View>
                        )}
                    />
                    {errors.qualification && <HelperText type="error">{errors.qualification}</HelperText>}

                    {qualificationSelect === OTHER_VALUE ? (
                        <TextInput
                            mode="outlined"
                            label="Qualification (Other)"
                            value={qualificationOther}
                            onChangeText={(t) => {
                                setQualificationOther(t);
                                setForm((prev) => ({ ...prev, qualification: t }));
                            }}
                            style={styles.input}
                            error={!!errors.qualification}
                        />
                    ) : null}

                    <Dropdown
                        label="Height"
                        placeholder="Select height"
                        mode="outlined"
                        options={HEIGHT_OPTIONS}
                        value={form.height ? String(form.height) : undefined}
                        onSelect={(v) => updateForm({ height: v ? parseInt(v, 10) : undefined })}
                        error={!!errors.height}
                    />
                    {errors.height && <HelperText type="error">{errors.height}</HelperText>}

                    <Dropdown
                        label="Ethnicity"
                        placeholder="Select ethnicity"
                        mode="outlined"
                        options={ethnicityOptions}
                        value={ethnicitySelect}
                        onSelect={(v) => {
                            setEthnicitySelect(v);
                            setEthnicitySearch('');
                            if (v === OTHER_VALUE) {
                                setForm((prev) => ({ ...prev, ethnicity: ethnicityOther }));
                                return;
                            }
                            setForm((prev) => ({ ...prev, ethnicity: v || '' }));
                        }}
                        error={!!errors.ethnicity}
                        CustomMenuHeader={() => (
                            <View style={styles.searchHeader}>
                                <Searchbar
                                    placeholder="Search ethnicity"
                                    value={ethnicitySearch}
                                    onChangeText={setEthnicitySearch}
                                    autoCapitalize="none"
                                />
                            </View>
                        )}
                    />
                    {errors.ethnicity && <HelperText type="error">{errors.ethnicity}</HelperText>}

                    {ethnicitySelect === OTHER_VALUE ? (
                        <TextInput
                            mode="outlined"
                            label="Ethnicity (Other)"
                            value={ethnicityOther}
                            onChangeText={(t) => {
                                setEthnicityOther(t);
                                setForm((prev) => ({ ...prev, ethnicity: t }));
                            }}
                            style={styles.input}
                            error={!!errors.ethnicity}
                        />
                    ) : null}

                    <TextInput
                        mode="outlined"
                        label="Hobbies"
                        value={form.hobbies}
                        onChangeText={(t) => updateForm({ hobbies: t })}
                        style={styles.input}
                        multiline
                    />
                    {errors.hobbies && <HelperText type="error">{errors.hobbies}</HelperText>}

                    <TextInput
                        mode="outlined"
                        label="City"
                        value={form.city}
                        onChangeText={(t) => updateForm({ city: t })}
                        style={styles.input}
                    />
                    {errors.city && <HelperText type="error">{errors.city}</HelperText>}

                    <TextInput
                        mode="outlined"
                        label="State"
                        value={form.state}
                        onChangeText={(t) => updateForm({ state: t })}
                        style={styles.input}
                    />
                    {errors.state && <HelperText type="error">{errors.state}</HelperText>}

                    <TextInput
                        mode="outlined"
                        label="Country"
                        value={form.country}
                        onChangeText={(t) => updateForm({ country: t })}
                        style={styles.input}
                    />
                    {errors.country && <HelperText type="error">{errors.country}</HelperText>}

                    {locLoading ? (
                        <HelperText type="info">Detecting your location…</HelperText>
                    ) : locHint ? (
                        <HelperText type="info">{locHint}</HelperText>
                    ) : null}

                    <Button
                        mode="contained"
                        onPress={handleSave}
                        loading={loading}
                        style={styles.button}
                        contentStyle={{ height: 50 }}
                    >
                        Save & Continue
                    </Button>
                </MotiView>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 24,
    },
    screenTitle: {
        marginBottom: 8,
        fontWeight: '900',
    },
    screenSubtitle: {
        marginBottom: 20,
    },
    screenSubtitleText: {
        fontWeight: '900',
    },
    form: {
        gap: 12,
    },
    input: {
        backgroundColor: 'transparent',
    },
    searchHeader: {
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 4,
    },
    button: {
        marginTop: 30,
        borderRadius: 12,
    },
    segmented: {
        marginBottom: 10,
    }
});
