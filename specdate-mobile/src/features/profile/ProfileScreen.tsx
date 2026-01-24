import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Button, useTheme, TextInput, SegmentedButtons, HelperText, Searchbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';
import { profileSchema, ProfileFormData } from '../../utils/validation';
import { ProfileService } from '../../services/profile';
import { MotiView } from 'moti';
import axios from 'axios';
import * as Location from 'expo-location';
import { Dropdown } from 'react-native-paper-dropdown';

let didTryAutoProfileLocationPrefill = false;

let DateTimePicker: any = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    DateTimePicker = require('@react-native-community/datetimepicker')?.default ?? null;
} catch {
    DateTimePicker = null;
}

function formatYYYYMMDD(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

const OCCUPATION_OPTIONS = [
    'Student',
    'Employed (Private)',
    'Employed (Government)',
    'Self-employed',
    'Freelancer',
    'Business owner',
    'Unemployed',
    'Homemaker',
    'Retired',
];

const QUALIFICATION_OPTIONS = [
    'High School',
    'Diploma',
    'Bachelor’s',
    'Master’s',
    'PhD',
    'Professional Certification',
];

const OTHER_VALUE = '__other__';

export default function ProfileScreen({ navigation }: any) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [locLoading, setLocLoading] = useState(false);
    const [locHint, setLocHint] = useState<string | null>(null);
    const [showDobPicker, setShowDobPicker] = useState(false);

    const [occupationSearch, setOccupationSearch] = useState('');
    const [qualificationSearch, setQualificationSearch] = useState('');
    const [occupationSelect, setOccupationSelect] = useState<string | undefined>(undefined);
    const [qualificationSelect, setQualificationSelect] = useState<string | undefined>(undefined);
    const [occupationOther, setOccupationOther] = useState('');
    const [qualificationOther, setQualificationOther] = useState('');

    const [form, setForm] = useState<Partial<ProfileFormData>>({
        full_name: '',
        dob: '',
        sex: 'Male',
        occupation: '',
        qualification: '',
        hobbies: '',
        sexual_orientation: 'Heterosexual',
        latitude: undefined,
        longitude: undefined,
        city: '',
        state: '',
        country: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

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

    const dobDate = useMemo(() => {
        const raw = (form.dob || '').trim();
        if (!raw) return new Date(2000, 0, 1);
        const parsed = new Date(raw);
        return isNaN(parsed.getTime()) ? new Date(2000, 0, 1) : parsed;
    }, [form.dob]);

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
            if (OCCUPATION_OPTIONS.includes(occ)) {
                setOccupationSelect(occ);
            } else {
                setOccupationSelect(OTHER_VALUE);
                setOccupationOther(occ);
            }
        }

        const qual = (form.qualification || '').trim();
        if (qual) {
            if (QUALIFICATION_OPTIONS.includes(qual)) {
                setQualificationSelect(qual);
            } else {
                setQualificationSelect(OTHER_VALUE);
                setQualificationOther(qual);
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
                <Text variant="headlineMedium" style={{ color: theme.colors.primary, marginBottom: 10 }}>
                    Complete Your Profile
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginBottom: 30 }}>
                    Tell us more about yourself to find your perfect spec.
                </Text>

                <MotiView animate={{ opacity: 1 }} style={styles.form}>

                    <TextInput
                        mode="outlined"
                        label="Full Name"
                        value={form.full_name}
                        onChangeText={(t) => setForm({ ...form, full_name: t })}
                        style={styles.input}
                        error={!!errors.full_name}
                    />
                    {errors.full_name && <HelperText type="error">{errors.full_name}</HelperText>}

                    <TextInput
                        mode="outlined"
                        label="Date of Birth"
                        value={form.dob}
                        onChangeText={(t) => setForm({ ...form, dob: t })}
                        style={styles.input}
                        error={!!errors.dob}
                        placeholder="YYYY-MM-DD"
                        editable={DateTimePicker ? false : true}
                        right={DateTimePicker ? <TextInput.Icon icon="calendar" onPress={() => setShowDobPicker(true)} /> : undefined}
                    />
                    {errors.dob && <HelperText type="error">{errors.dob}</HelperText>}

                    {DateTimePicker ? (
                        showDobPicker ? (
                            <DateTimePicker
                                value={dobDate}
                                mode="date"
                                display={Platform.OS === 'android' ? 'calendar' : 'default'}
                                onChange={(event: any, selected?: Date) => {
                                    if (Platform.OS === 'android') setShowDobPicker(false);
                                    if (event?.type === 'dismissed') return;
                                    if (!selected) return;
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
                        onValueChange={(val) => setForm({ ...form, sex: val as any })}
                        buttons={[
                            { value: 'Male', label: 'Male' },
                            { value: 'Female', label: 'Female' },
                            { value: 'Other', label: 'Other' },
                        ]}
                        style={styles.segmented}
                    />

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

                    <TextInput
                        mode="outlined"
                        label="Hobbies"
                        value={form.hobbies}
                        onChangeText={(t) => setForm({ ...form, hobbies: t })}
                        style={styles.input}
                        multiline
                    />

                    <TextInput
                        mode="outlined"
                        label="City"
                        value={form.city}
                        onChangeText={(t) => setForm({ ...form, city: t })}
                        style={styles.input}
                    />

                    <TextInput
                        mode="outlined"
                        label="State"
                        value={form.state}
                        onChangeText={(t) => setForm({ ...form, state: t })}
                        style={styles.input}
                    />

                    <TextInput
                        mode="outlined"
                        label="Country"
                        value={form.country}
                        onChangeText={(t) => setForm({ ...form, country: t })}
                        style={styles.input}
                    />

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
