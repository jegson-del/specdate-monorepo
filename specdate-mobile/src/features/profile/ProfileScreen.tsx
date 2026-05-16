import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Alert, Platform, RefreshControl } from 'react-native';
import { Text, Button, useTheme, TextInput, SegmentedButtons, Searchbar, IconButton, Surface, Divider, HelperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { z } from 'zod';
import { profileSchema, ProfileFormData } from '../../utils/validation';
import { ProfileService } from '../../services/profile';
import { useUser } from '../../hooks/useUser';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Dropdown } from 'react-native-paper-dropdown';
import { IDEAL_DATE_OPTIONS, JOB_TITLE_OPTIONS, OCCUPATION_OPTIONS, QUALIFICATION_OPTIONS, RELIGION_OPTIONS } from '../../constants/profileOptions';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ImageViewerModal, ProfileHeader, ProfilePhotosSection, ProfileWalletSection } from './components';
import { toImageUri, imageUriWithCacheBust } from '../../utils/imageUrl';
import { MultiSelectModal } from '../specs/components/MultiSelectModal';
import { MediaPickerSheet, UploadProgressModal } from '../../components';
import { useProfileMediaUpload } from './hooks/useProfileMediaUpload';
import {
    DRINKING_OPTIONS,
    ETHNICITY_OPTIONS,
    HEIGHT_OPTIONS,
    OTHER_VALUE,
    formatYYYYMMDD,
    latestAdultDob,
    normalizeStringArray,
} from './profileScreenOptions';
import { styles } from './profileScreenStyles';

type ProfileMediaSheetState = {
    type: 'avatar' | 'profile_gallery';
    index?: number;
} | null;

// --- DATE PICKER SETUP ---
let DateTimePicker: any = null;
let DateTimePickerAndroid: any = null;
try {
    const mod = require('@react-native-community/datetimepicker');
    DateTimePicker = mod?.default ?? null;
    DateTimePickerAndroid = mod?.DateTimePickerAndroid ?? null;
} catch {
    DateTimePicker = null;
    DateTimePickerAndroid = null;
}

export default function ProfileScreen({ navigation, route }: any) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const { data: user, isRefetching, refetch: refetchUser } = useUser();
    const adultDobLimit = latestAdultDob();
    const afterRegistration = route?.params?.afterRegistration === true;

    // --- STATE ---
    const [loading, setLoading] = useState(false);
    const [locLoading, setLocLoading] = useState(false);

    // UI Local State
    const [showDobPicker, setShowDobPicker] = useState(false);
    const [occupationSearch, setOccupationSearch] = useState('');
    const [jobTitleSearch, setJobTitleSearch] = useState('');
    const [qualificationSearch, setQualificationSearch] = useState('');
    const [ethnicitySearch, setEthnicitySearch] = useState('');

    const [occupationSelect, setOccupationSelect] = useState<string | undefined>(undefined);
    const [jobTitleSelect, setJobTitleSelect] = useState<string | undefined>(undefined);
    const [qualificationSelect, setQualificationSelect] = useState<string | undefined>(undefined);
    const [ethnicitySelect, setEthnicitySelect] = useState<string | undefined>(undefined);

    const [occupationOther, setOccupationOther] = useState('');
    const [jobTitleOther, setJobTitleOther] = useState('');
    const [qualificationOther, setQualificationOther] = useState('');
    const [ethnicityOther, setEthnicityOther] = useState('');

    // Images (Mock for now, will connect to backend later)
    const [images, setImages] = useState<(string | null)[]>(new Array(6).fill(null));
    const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
    const [localAvatarMediaId, setLocalAvatarMediaId] = useState<number | undefined>(undefined);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
    const [profileMediaSheet, setProfileMediaSheet] = useState<ProfileMediaSheetState>(null);
    const { imgLoading, uploadProgress, takePhotoWithCamera, pickFromGallery } = useProfileMediaUpload({
        user,
        queryClient,
        refetchUser,
        localAvatarMediaId,
        setLocalAvatarUri,
        setLocalAvatarMediaId,
        setImages,
    });

    const [form, setForm] = useState<Partial<ProfileFormData>>({
        username: '',
        full_name: '',
        dob: '',
        sex: 'Male',
        occupation: '',
        job_title: '',
        qualification: '',
        hobbies: '',
        ideal_dates: [],
        is_smoker: false,
        is_drug_user: false,
        drinking: 'no',
        sexual_orientation: 'Heterosexual',
        latitude: undefined,
        longitude: undefined,
        city: '',
        state: '',
        country: '',
        country_code: '',
        height: undefined,
        ethnicity: '',
        religion: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Cache-bust avatar and gallery URIs so Image components refetch when profile/avatar updates (same URL, new content)
    const profileUpdatedAt = user?.profile?.updated_at ?? null;
    const accountUsername = useMemo(() => {
        const raw = String(form?.username || user?.username || user?.name || '').trim();
        if (!raw) return '';
        return raw.startsWith('@') ? raw : `@${raw}`;
    }, [form?.username, user?.username, user?.name]);
    const avatarUri = useMemo(
        () => imageUriWithCacheBust(localAvatarUri || toImageUri(user?.profile?.avatar), profileUpdatedAt) ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(form?.full_name || accountUsername || 'User')}&size=512&background=7C3AED&color=ffffff`,
        [localAvatarUri, user?.profile?.avatar, profileUpdatedAt, form?.full_name, accountUsername]
    );
    const imagesWithCacheBust = useMemo(
        () => images.map((u) => (u ? (imageUriWithCacheBust(u, profileUpdatedAt) ?? u) : null)),
        [images, profileUpdatedAt]
    );
    const imagesFilled = useMemo(() => imagesWithCacheBust.filter(Boolean) as string[], [imagesWithCacheBust]);
    // --- HELPERS ---
    const updateForm = (patch: Partial<ProfileFormData>) => setForm((prev) => ({ ...prev, ...patch }));

    const dobDate = useMemo(() => {
        const raw = (form?.dob || '').trim();
        if (!raw) return new Date(2000, 0, 1);
        const parsed = new Date(raw);
        return isNaN(parsed.getTime()) ? new Date(2000, 0, 1) : parsed;
    }, [form?.dob]);

    // --- OPTIONS MEMO ---
    const getFilteredOptions = (base: readonly string[], query: string) => {
        const q = query.trim().toLowerCase();
        const baseObjs = base.map((v) => ({ label: v, value: v }));
        const filtered = q ? baseObjs.filter((o) => o.label.toLowerCase().includes(q)) : baseObjs;
        return [...filtered, { label: 'Other…', value: OTHER_VALUE }];
    };
    const occupationOptions = useMemo(() => getFilteredOptions(OCCUPATION_OPTIONS, occupationSearch), [occupationSearch]);
    const jobTitleOptions = useMemo(() => getFilteredOptions(JOB_TITLE_OPTIONS, jobTitleSearch), [jobTitleSearch]);
    const qualificationOptions = useMemo(() => getFilteredOptions(QUALIFICATION_OPTIONS, qualificationSearch), [qualificationSearch]);
    const ethnicityOptions = useMemo(() => getFilteredOptions(ETHNICITY_OPTIONS, ethnicitySearch), [ethnicitySearch]);
    const shouldShowJobTitle = !!form.occupation && !['Student', 'Unemployed'].includes(String(form.occupation));

    // Refetch user when Profile screen gains focus so form always pre-fills from latest server data
    useFocusEffect(
        useCallback(() => {
            queryClient.invalidateQueries({ queryKey: ['user'] });
        }, [queryClient])
    );

    // --- EFFECTS ---
    useEffect(() => {
        // Load user profile data into form only when we have a real user (id) so we never overwrite with empty/partial refetch
        if (!user || typeof user.id !== 'number') return;
        const profile = user.profile && typeof user.profile === 'object' ? user.profile : {};
        setLocalAvatarUri(toImageUri(profile?.avatar));
        setLocalAvatarMediaId(profile?.avatar_media_id);
        setForm({
            username: user.username || user.name || '',
            full_name: profile?.full_name || '',
            dob: profile?.dob ? formatYYYYMMDD(new Date(profile.dob)) : '',
            sex: profile?.sex || 'Male',
            occupation: profile?.occupation || '',
            job_title: profile?.job_title || '',
            qualification: profile?.qualification || '',
            hobbies: profile?.hobbies || '',
            ideal_dates: normalizeStringArray(profile?.ideal_dates),
            is_smoker: profile?.is_smoker ?? false,
            is_drug_user: profile?.is_drug_user ?? false,
            drinking: profile?.drinking || 'no',
            sexual_orientation: profile?.sexual_orientation || 'Heterosexual',
            latitude: profile?.latitude,
            longitude: profile?.longitude,
            city: profile?.city || '',
            state: profile?.state || '',
            country: profile?.country || '',
            country_code: profile?.country_code || '',
            height: profile?.height,
            ethnicity: profile?.ethnicity || '',
            religion: profile?.religion || '',
        });
        // Load user images from either images[] or profile_gallery_media[] (API can return either)
        const urlList =
            Array.isArray(user.images) && user.images.length > 0
                ? (user.images as string[])
                : (user as any).profile_gallery_media?.map((m: { url?: string }) => m?.url).filter(Boolean) ?? [];
        const valid = urlList.map((u: string) => toImageUri(u) ?? null).filter(Boolean) as string[];
        const newImages = [...valid, ...new Array(6 - valid.length).fill(null)].slice(0, 6);
        setImages(newImages);
    }, [user]);

    useEffect(() => {
        // Initialize dropdowns based on existing form data
        const initDropdown = (val: string | undefined, options: readonly string[], setSelect: any, setOther: any) => {
            if (!val) return;
            if (options.includes(val)) {
                setSelect(val);
            } else {
                setSelect(OTHER_VALUE);
                setOther(val);
            }
        };
        initDropdown(form.occupation, OCCUPATION_OPTIONS, setOccupationSelect, setOccupationOther);
        initDropdown(form.job_title, JOB_TITLE_OPTIONS, setJobTitleSelect, setJobTitleOther);
        initDropdown(form.qualification, QUALIFICATION_OPTIONS, setQualificationSelect, setQualificationOther);
        initDropdown(form.ethnicity, ETHNICITY_OPTIONS, setEthnicitySelect, setEthnicityOther);
    }, [form.occupation, form.job_title, form.qualification, form.ethnicity]);

    // --- HANDLERS ---
    const openDobPicker = () => {
        if (Platform.OS === 'android' && DateTimePickerAndroid) {
            DateTimePickerAndroid.open({
                value: dobDate,
                mode: 'date',
                is24Hour: true,
                maximumDate: adultDobLimit,
                onChange: (event: any, selected?: Date) => {
                    if (event?.type !== 'set' || !selected) return;
                    updateForm({ dob: formatYYYYMMDD(selected) });
                },
            });
        } else {
            setShowDobPicker(true);
        }
    };

    const handleSave = async () => {
        const payload = form ?? {};
        setLoading(true);
        setErrors({});
        try {
            profileSchema.parse(payload);
            await ProfileService.update(payload);
            await queryClient.invalidateQueries({ queryKey: ['user'] });
            const refreshedUser = await refetchUser();
            if (afterRegistration) {
                if (refreshedUser.data?.profile_complete !== true) {
                    Alert.alert(
                        "Finish profile setup",
                        "Please complete all required profile details before going to Home."
                    );
                    return;
                }
                Alert.alert("Success", "Profile completed. Welcome to DateUsher.", [
                    {
                        text: "Go to Home",
                        onPress: () => navigation.reset({
                            index: 0,
                            routes: [{ name: 'Home' }],
                        }),
                    },
                ], { cancelable: false });
                return;
            }
            Alert.alert("Success", "Profile updated!");
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                const fieldErrors: Record<string, string> = {};
                error.issues.forEach((issue) => {
                    if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message;
                });
                setErrors(fieldErrors);
                const message = Object.values(fieldErrors).length > 0
                    ? Object.values(fieldErrors).join('\n')
                    : 'Please check the highlighted fields.';
                Alert.alert("Validation Error", message);
            } else {
                const apiErrors = error?.response?.data?.errors ?? error?.response?.data?.data?.errors;
                if (apiErrors && typeof apiErrors === 'object') {
                    const fieldErrors: Record<string, string> = {};
                    Object.entries(apiErrors).forEach(([field, messages]) => {
                        if (Array.isArray(messages)) {
                            fieldErrors[field] = String(messages[0] ?? '');
                        } else if (typeof messages === 'string') {
                            fieldErrors[field] = messages;
                        }
                    });
                    setErrors(fieldErrors);
                    const message = Object.values(fieldErrors).filter(Boolean).join('\n') || 'Please check the highlighted fields.';
                    Alert.alert("Validation Error", message);
                    return;
                }
                console.error(error);
                Alert.alert("Error", "Failed to update profile.");
            }
        } finally {
            setLoading(false);
        }
    };

    const openImageViewer = (index: number) => {
        const filled = imagesWithCacheBust.filter(Boolean) as string[];
        const idx = filled.indexOf(imagesWithCacheBust[index] as string);
        setViewerInitialIndex(idx >= 0 ? idx : 0);
        setViewerVisible(true);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={[theme.colors.elevation.level1, theme.colors.background]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280 }}
            />

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={loading || isRefetching}
                        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['user'] })}
                        colors={[theme.colors.primary]}
                    />
                }
            >
                {/* Top Navigation */}
                <View style={[styles.topNav, { paddingTop: insets.top + 8, paddingBottom: 8 }]}>
                    <IconButton
                        icon="arrow-left"
                        iconColor={theme.colors.onSurface}
                        size={24}
                        onPress={() => {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.navigate('Home');
                            }
                        }}
                        style={styles.backButton}
                    />
                    <Text variant="titleLarge" style={[styles.screenTitle, { color: theme.colors.onSurface }]}>
                        Edit Profile
                    </Text>
                    <IconButton
                        icon="cog-outline"
                        iconColor={theme.colors.onSurface}
                        size={24}
                        onPress={() => navigation.navigate('Settings')}
                        style={styles.backButton}
                        accessibilityLabel="Open settings"
                    />
                </View>

                <ProfileHeader
                    avatarUri={avatarUri}
                    fullName={form?.full_name}
                    accountUsername={accountUsername}
                    locationLabel={form?.city || user?.profile?.city}
                    dob={form?.dob}
                    imgLoading={imgLoading}
                    onEditAvatar={() => {
                        if (imgLoading) return;
                        setProfileMediaSheet({ type: 'avatar' });
                    }}
                />
                <ProfileWalletSection
                    credits={user?.balance?.credits ?? 0}
                    onTransactionsPress={() => navigation.navigate('CreditsTransactions')}
                    onTopUpPress={() => navigation.navigate('TopUpCredits')}
                />

                <ProfilePhotosSection
                    images={imagesWithCacheBust}
                    onImagePress={openImageViewer}
                    onEditSlot={(index) => setProfileMediaSheet({ type: 'profile_gallery', index })}
                />

                {/* Form Fields */}
                <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        Basic Details
                    </Text>

                    <TextInput
                        mode="flat"
                        label="Username"
                        value={form?.username}
                        onChangeText={(t) => updateForm({ username: t })}
                        style={styles.input}
                        error={!!errors.username}
                        contentStyle={styles.inputContent}
                        underlineColor="transparent"
                        autoCapitalize="none"
                    />
                    {!!errors.username && <HelperText type="error" visible>{errors.username}</HelperText>}

                    <Divider style={styles.divider} />

                    <TextInput
                        mode="flat"
                        label="Full Name"
                        value={form?.full_name}
                        onChangeText={(t) => updateForm({ full_name: t })}
                        style={styles.input}
                        error={!!errors.full_name}
                        contentStyle={styles.inputContent}
                        underlineColor="transparent"
                    />
                    {!!errors.full_name && <HelperText type="error" visible>{errors.full_name}</HelperText>}

                    <Divider style={styles.divider} />

                    <TextInput
                        mode="flat"
                        label="City"
                        value={form?.city}
                        onChangeText={(t) => updateForm({ city: t })}
                        style={styles.input}
                        error={!!errors.city}
                        contentStyle={styles.inputContent}
                        underlineColor="transparent"
                    />
                    {!!errors.city && <HelperText type="error" visible>{errors.city}</HelperText>}

                    <Divider style={styles.divider} />

                    <TextInput
                        mode="flat"
                        label="State / Province"
                        value={form?.state}
                        onChangeText={(t) => updateForm({ state: t })}
                        style={styles.input}
                        error={!!errors.state}
                        contentStyle={styles.inputContent}
                        underlineColor="transparent"
                    />
                    {!!errors.state && <HelperText type="error" visible>{errors.state}</HelperText>}

                    <Divider style={styles.divider} />

                    <TextInput
                        mode="flat"
                        label="Country"
                        value={form?.country}
                        onChangeText={(t) => updateForm({ country: t, country_code: undefined })}
                        style={styles.input}
                        error={!!errors.country}
                        contentStyle={styles.inputContent}
                        underlineColor="transparent"
                    />
                    {!!errors.country && <HelperText type="error" visible>{errors.country}</HelperText>}

                    <Divider style={styles.divider} />

                    <TextInput
                        mode="flat"
                        label="Date of Birth"
                        value={form.dob}
                        error={!!errors.dob}
                        editable={false}
                        right={<TextInput.Icon icon="calendar" onPress={openDobPicker} />}
                        style={styles.input}
                        contentStyle={styles.inputContent}
                        underlineColor="transparent"
                    />
                    {!!errors.dob && <HelperText type="error" visible>{errors.dob}</HelperText>}
                    {/* DateTimePicker rendering logic */}
                    {DateTimePicker && Platform.OS !== 'android' && showDobPicker && (
                        <DateTimePicker
                            value={dobDate}
                            mode="date"
                            display="default"
                            onChange={(e: any, d?: Date) => {
                                setShowDobPicker(false);
                                if (d) updateForm({ dob: formatYYYYMMDD(d) });
                            }}
                            maximumDate={adultDobLimit}
                        />
                    )}

                    <Divider style={styles.divider} />

                    <View style={styles.rowInput}>
                        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Gender</Text>
                        <SegmentedButtons
                            value={form?.sex || 'Male'}
                            onValueChange={(val) => updateForm({ sex: val as any })}
                            buttons={[
                                { value: 'Male', label: 'M' },
                                { value: 'Female', label: 'F' },
                                { value: 'Other', label: 'O' },
                            ]}
                            style={{ flex: 1, marginLeft: 16 }}
                            density="small"
                        />
                    </View>

                    <Divider style={styles.divider} />

                    <Dropdown
                        label="Occupation"
                        placeholder="Select..."
                        mode="flat"
                        options={occupationOptions}
                        value={occupationSelect}
                        onSelect={(v) => {
                            setOccupationSelect(v);
                            setOccupationSearch('');
                            if (v === OTHER_VALUE) setForm((p) => ({ ...p, occupation: occupationOther }));
                            else setForm((p) => ({
                                ...p,
                                occupation: v || '',
                                job_title: ['Student', 'Unemployed'].includes(String(v || '')) ? '' : p.job_title,
                            }));
                        }}
                        CustomMenuHeader={() => (
                            <Searchbar placeholder="Search..." value={occupationSearch} onChangeText={setOccupationSearch} />
                        )}
                    />
                    {!!errors.occupation && <HelperText type="error" visible>{errors.occupation}</HelperText>}
                    {occupationSelect === OTHER_VALUE && (
                        <TextInput label="Specify Occupation" value={occupationOther} onChangeText={(t) => { setOccupationOther(t); updateForm({ occupation: t }); }} mode="flat" style={styles.input} />
                    )}

                    <Divider style={styles.divider} />

                    {shouldShowJobTitle && (
                        <>
                            <Dropdown
                                label="Job"
                                placeholder="Select..."
                                mode="flat"
                                options={jobTitleOptions}
                                value={jobTitleSelect}
                                onSelect={(v) => {
                                    setJobTitleSelect(v);
                                    setJobTitleSearch('');
                                    if (v === OTHER_VALUE) setForm((p) => ({ ...p, job_title: jobTitleOther }));
                                    else setForm((p) => ({ ...p, job_title: v || '' }));
                                }}
                                CustomMenuHeader={() => (
                                    <Searchbar placeholder="Search..." value={jobTitleSearch} onChangeText={setJobTitleSearch} />
                                )}
                            />
                            {!!errors.job_title && <HelperText type="error" visible>{errors.job_title}</HelperText>}
                            {jobTitleSelect === OTHER_VALUE && (
                                <TextInput label="Specify Job" value={jobTitleOther} onChangeText={(t) => { setJobTitleOther(t); updateForm({ job_title: t }); }} mode="flat" style={styles.input} />
                            )}

                            <Divider style={styles.divider} />
                        </>
                    )}

                    <Dropdown
                        label="Qualification"
                        placeholder="Select..."
                        mode="flat"
                        options={qualificationOptions}
                        value={qualificationSelect}
                        onSelect={(v) => {
                            setQualificationSelect(v);
                            setQualificationSearch('');
                            if (v === OTHER_VALUE) setForm((p) => ({ ...p, qualification: qualificationOther }));
                            else setForm((p) => ({ ...p, qualification: v || '' }));
                        }}
                        CustomMenuHeader={() => (
                            <Searchbar placeholder="Search..." value={qualificationSearch} onChangeText={setQualificationSearch} />
                        )}
                    />
                    {!!errors.qualification && <HelperText type="error" visible>{errors.qualification}</HelperText>}
                    {qualificationSelect === OTHER_VALUE && (
                        <TextInput label="Specify Qualification" value={qualificationOther} onChangeText={(t) => { setQualificationOther(t); updateForm({ qualification: t }); }} mode="flat" style={styles.input} />
                    )}

                    <Divider style={styles.divider} />

                    <Dropdown
                        label="Height (cm)"
                        placeholder="Select..."
                        mode="flat"
                        options={HEIGHT_OPTIONS}
                        value={form?.height != null ? String(form.height) : undefined}
                        onSelect={(v) => updateForm({ height: v ? Number(v) : undefined })}
                    />
                    {!!errors.height && <HelperText type="error" visible>{errors.height}</HelperText>}

                    <Divider style={styles.divider} />

                    <Dropdown
                        label="Ethnicity"
                        placeholder="Select..."
                        mode="flat"
                        options={ethnicityOptions}
                        value={ethnicitySelect}
                        onSelect={(v) => {
                            setEthnicitySelect(v);
                            setEthnicitySearch('');
                            if (v === OTHER_VALUE) setForm((p) => ({ ...p, ethnicity: ethnicityOther }));
                            else setForm((p) => ({ ...p, ethnicity: v || '' }));
                        }}
                        CustomMenuHeader={() => (
                            <Searchbar placeholder="Search..." value={ethnicitySearch} onChangeText={setEthnicitySearch} />
                        )}
                    />
                    {!!errors.ethnicity && <HelperText type="error" visible>{errors.ethnicity}</HelperText>}
                    {ethnicitySelect === OTHER_VALUE && (
                        <TextInput label="Specify Ethnicity" value={ethnicityOther} onChangeText={(t) => { setEthnicityOther(t); updateForm({ ethnicity: t }); }} mode="flat" style={styles.input} />
                    )}
                </Surface>

                <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        Religion
                    </Text>
                    <Dropdown
                        label="Religion (optional)"
                        mode="outlined"
                        options={[
                            { label: 'Prefer not to say', value: '' },
                            ...Array.from(RELIGION_OPTIONS).filter((r) => r !== 'Any').map((r) => ({ label: r, value: r })),
                        ]}
                        value={form?.religion ?? ''}
                        onSelect={(v) => updateForm({ religion: v ?? '' })}
                    />
                </Surface>

                <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        About Me
                    </Text>
                    <TextInput
                        mode="flat"
                        label="Bio / Hobbies"
                        value={form.hobbies}
                        onChangeText={(t) => updateForm({ hobbies: t })}
                        style={[styles.input, { minHeight: 80 }]}
                        multiline
                        placeholder="What do you love doing?"
                        underlineColor="transparent"
                        error={!!errors.hobbies}
                    />
                    {!!errors.hobbies && <HelperText type="error" visible>{errors.hobbies}</HelperText>}

                    <Divider style={{ marginVertical: 14 }} />
                    <MultiSelectModal
                        title="Select ideal dates"
                        label="Ideal date ideas"
                        actionPlacement="header"
                        options={IDEAL_DATE_OPTIONS}
                        value={normalizeStringArray(form?.ideal_dates)}
                        onChange={(next) => updateForm({ ideal_dates: next })}
                        placeholder="Add date ideas"
                    />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2, marginBottom: 10 }}>
                        Pick examples of where you enjoy dating so people get a feel for your vibe.
                    </Text>
                </Surface>

                <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        Lifestyle
                    </Text>
                    <View style={styles.lifestyleRow}>
                        <View style={styles.lifestyleLabel}>
                            <MaterialCommunityIcons name="smoking" size={20} color={theme.colors.onSurfaceVariant} />
                            <Text variant="bodyLarge" style={[styles.lifestyleLabelText, { color: theme.colors.onSurface }]}>
                                Smoker
                            </Text>
                        </View>
                        <SegmentedButtons
                            value={form?.is_smoker ? 'yes' : 'no'}
                            onValueChange={(v) => updateForm({ is_smoker: v === 'yes' })}
                            buttons={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]}
                            density="small"
                            style={styles.lifestylePills}
                        />
                    </View>
                    <Divider style={styles.divider} />
                    <View style={styles.lifestyleRow}>
                        <View style={styles.lifestyleLabel}>
                            <MaterialCommunityIcons name="glass-cocktail" size={20} color={theme.colors.onSurfaceVariant} />
                            <Text variant="bodyLarge" style={[styles.lifestyleLabelText, { color: theme.colors.onSurface }]}>
                                Drinking
                            </Text>
                        </View>
                        <View style={styles.lifestylePills}>
                            <Dropdown
                                label=""
                                placeholder="Select..."
                                mode="flat"
                                options={DRINKING_OPTIONS}
                                value={form?.drinking || 'no'}
                                onSelect={(v) => updateForm({ drinking: (v as string) || 'no' })}
                            />
                        </View>
                    </View>
                    <Divider style={styles.divider} />
                    <View style={styles.lifestyleRow}>
                        <View style={styles.lifestyleLabel}>
                            <MaterialCommunityIcons name="pill" size={20} color={theme.colors.onSurfaceVariant} />
                            <Text variant="bodyLarge" style={[styles.lifestyleLabelText, { color: theme.colors.onSurface }]}>
                                Drug Use
                            </Text>
                        </View>
                        <SegmentedButtons
                            value={form?.is_drug_user ? 'yes' : 'no'}
                            onValueChange={(v) => updateForm({ is_drug_user: v === 'yes' })}
                            buttons={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]}
                            density="small"
                            style={styles.lifestylePills}
                        />
                    </View>
                </Surface>

                {/* Main Action Button */}
                <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={loading}
                    style={styles.saveButton}
                    contentStyle={{ height: 50 }}
                >
                    Save Changes
                </Button>

            </ScrollView>

            <ImageViewerModal
                visible={viewerVisible}
                images={imagesFilled}
                initialIndex={viewerInitialIndex}
                onClose={() => setViewerVisible(false)}
                onReplace={(index) => {
                    setViewerVisible(false);
                    setProfileMediaSheet({ type: 'profile_gallery', index });
                }}
            />

            <MediaPickerSheet
                visible={profileMediaSheet !== null}
                title={profileMediaSheet?.type === 'avatar' ? 'Change avatar' : 'Photo'}
                onDismiss={() => setProfileMediaSheet(null)}
                options={profileMediaSheet ? [
                    {
                        icon: 'camera-outline',
                        label: 'Take photo',
                        helper: 'Use your camera now',
                        onPress: () => takePhotoWithCamera(profileMediaSheet.type, profileMediaSheet.index),
                    },
                    {
                        icon: 'image-outline',
                        label: 'Choose from library',
                        helper: 'Pick an existing photo',
                        onPress: () => pickFromGallery(profileMediaSheet.type, profileMediaSheet.index),
                    },
                ] : []}
            />

            <UploadProgressModal progress={uploadProgress} />

        </View>
    );
}

