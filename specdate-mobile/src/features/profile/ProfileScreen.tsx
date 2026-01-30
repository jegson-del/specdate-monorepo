import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Text, Button, useTheme, TextInput, SegmentedButtons, Searchbar, Avatar, IconButton, Surface, Divider, ActivityIndicator, HelperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { z } from 'zod';
import { profileSchema, ProfileFormData } from '../../utils/validation';
import { ProfileService } from '../../services/profile';
import { useUser } from '../../hooks/useUser';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Dropdown } from 'react-native-paper-dropdown';
import { OCCUPATION_OPTIONS, QUALIFICATION_OPTIONS } from '../../constants/profileOptions';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProfileImageGrid, ImageViewerModal, ConfirmModal } from './components';
import { MediaService } from '../../services/media';
import { AuthService } from '../../services/auth';
import { AccountService } from '../../services/account';
import { toImageUri, imageUriWithCacheBust } from '../../utils/imageUrl';

// --- OPTIONS & CONSTANTS ---
const OTHER_VALUE = '__other__';
const HEIGHT_OPTIONS = Array.from({ length: 121 }, (_, i) => {
    const cm = i + 130;
    const realFeet = (cm * 0.393701) / 12;
    const feet = Math.floor(realFeet);
    const inches = Math.round((realFeet - feet) * 12);
    return { label: `${cm} cm (${feet}'${inches}")`, value: String(cm) };
});
const ETHNICITY_OPTIONS = [
    'Asian', 'Black / African Descent', 'Hispanic / Latino', 'Middle Eastern',
    'Native American / Indigenous', 'Pacific Islander', 'South Asian', 'White / Caucasian',
    'Multiracial / Mixed', 'Prefer not to say',
];
const DRINKING_OPTIONS = [
    { label: 'No', value: 'no' },
    { label: 'Socially', value: 'socially' },
    { label: 'Occasionally', value: 'occasionally' },
];

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

function formatYYYYMMDD(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function ProfileScreen({ navigation }: any) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const { data: user, isRefetching, refetch: refetchUser } = useUser();

    // --- STATE ---
    const [loading, setLoading] = useState(false);
    const [locLoading, setLocLoading] = useState(false);
    const [imgLoading, setImgLoading] = useState(false);

    // UI Local State
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

    // Images (Mock for now, will connect to backend later)
    const [images, setImages] = useState<(string | null)[]>(new Array(6).fill(null));
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

    const [form, setForm] = useState<Partial<ProfileFormData>>({
        full_name: '',
        dob: '',
        sex: 'Male',
        occupation: '',
        qualification: '',
        hobbies: '',
        is_smoker: false,
        is_drug_user: false,
        drinking: 'no',
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

    // Cache-bust avatar and gallery URIs so Image components refetch when profile/avatar updates (same URL, new content)
    const profileUpdatedAt = user?.profile?.updated_at ?? null;
    const avatarUri = useMemo(
        () => imageUriWithCacheBust(toImageUri(user?.profile?.avatar), profileUpdatedAt) ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(form?.full_name || user?.name || 'User')}&size=512&background=7C3AED&color=ffffff`,
        [user?.profile?.avatar, profileUpdatedAt, form?.full_name, user?.name]
    );
    const imagesWithCacheBust = useMemo(
        () => images.map((u) => (u ? (imageUriWithCacheBust(u, profileUpdatedAt) ?? u) : null)),
        [images, profileUpdatedAt]
    );
    const imagesFilled = useMemo(() => imagesWithCacheBust.filter(Boolean) as string[], [imagesWithCacheBust]);
    type ConfirmAction = 'pause' | 'unpause' | 'delete' | null;
    const [confirmModal, setConfirmModal] = useState<ConfirmAction>(null);
    const [accountActionLoading, setAccountActionLoading] = useState(false);

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
    const qualificationOptions = useMemo(() => getFilteredOptions(QUALIFICATION_OPTIONS, qualificationSearch), [qualificationSearch]);
    const ethnicityOptions = useMemo(() => getFilteredOptions(ETHNICITY_OPTIONS, ethnicitySearch), [ethnicitySearch]);

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
        setForm({
            full_name: profile?.full_name || user.name || '',
            dob: profile?.dob ? formatYYYYMMDD(new Date(profile.dob)) : '',
            sex: profile?.sex || 'Male',
            occupation: profile?.occupation || '',
            qualification: profile?.qualification || '',
            hobbies: profile?.hobbies || '',
            is_smoker: profile?.is_smoker ?? false,
            is_drug_user: profile?.is_drug_user ?? false,
            drinking: profile?.drinking || 'no',
            sexual_orientation: profile?.sexual_orientation || 'Heterosexual',
            latitude: profile?.latitude,
            longitude: profile?.longitude,
            city: profile?.city || '',
            state: profile?.state || '',
            country: profile?.country || '',
            height: profile?.height,
            ethnicity: profile?.ethnicity || '',
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
        initDropdown(form.qualification, QUALIFICATION_OPTIONS, setQualificationSelect, setQualificationOther);
        initDropdown(form.ethnicity, ETHNICITY_OPTIONS, setEthnicitySelect, setEthnicityOther);
    }, [form.occupation, form.qualification, form.ethnicity]);

    // --- HANDLERS ---
    const ensureMediaLibraryPermission = async (): Promise<boolean> => {
        const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (existing.status === 'granted') return true;
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        return status === 'granted';
    };

    const ensureCameraPermission = async (): Promise<boolean> => {
        const existing = await ImagePicker.getCameraPermissionsAsync();
        if (existing.status === 'granted') return true;
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        return status === 'granted';
    };

    const uploadImageAndRefresh = async (uri: string, type: 'avatar' | 'profile_gallery', mediaId?: number) => {
        setImgLoading(true);
        try {
            const media = await MediaService.upload(uri, type, mediaId);
            const uploadedUrl = media?.url && (media.url as string).startsWith('http') ? media.url : null;
            // Optimistic update: show the new image immediately using the URL returned from upload
            if (uploadedUrl) {
                queryClient.setQueryData(['user'], (old: any) => {
                    if (!old) return old;
                    if (type === 'avatar') {
                        return { ...old, profile: { ...(old.profile || {}), avatar: uploadedUrl } };
                    }
                    const prev = (old.images || []) as string[];
                    return { ...old, images: [...prev, uploadedUrl] };
                });
                if (type === 'profile_gallery') {
                    setImages((prev) => {
                        const filled = prev.filter(Boolean) as string[];
                        const next = [...filled, uploadedUrl, ...new Array(6 - filled.length - 1).fill(null)].slice(0, 6);
                        return next;
                    });
                }
            }
            await queryClient.invalidateQueries({ queryKey: ['user'] });
            Alert.alert('Success', 'Image uploaded successfully.');
        } catch (e: any) {
            const msg = e?.message || e?.response?.data?.message || 'Upload failed. Try again.';
            Alert.alert('Upload Failed', msg);
        } finally {
            setImgLoading(false);
        }
    };

    const takePhotoWithCamera = async (type: 'avatar' | 'profile_gallery', replaceSlotIndex?: number) => {
        const granted = await ensureCameraPermission();
        if (!granted) {
            Alert.alert('Camera access needed', 'Allow camera access to take a new photo.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: type === 'avatar',
            aspect: type === 'avatar' ? [1, 1] : undefined,
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            const mediaId = type === 'profile_gallery' && replaceSlotIndex != null
                ? (user as any)?.profile_gallery_media?.[replaceSlotIndex]?.id
                : type === 'avatar'
                    ? (user as any)?.profile?.avatar_media_id
                    : undefined;
            await uploadImageAndRefresh(result.assets[0].uri, type, mediaId);
        }
    };

    /** replaceSlotIndex: when set for profile_gallery, backend updates that slot (media_id) instead of creating. */
    const pickFromGallery = async (type: 'avatar' | 'profile_gallery', replaceSlotIndex?: number) => {
        const granted = await ensureMediaLibraryPermission();
        if (!granted) {
            Alert.alert('Photo access needed', 'Allow access to your photos to pick an image.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: type === 'avatar',
            aspect: type === 'avatar' ? [1, 1] : undefined,
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            const mediaId = type === 'profile_gallery' && replaceSlotIndex != null
                ? (user as any)?.profile_gallery_media?.[replaceSlotIndex]?.id
                : type === 'avatar'
                    ? (user as any)?.profile?.avatar_media_id
                    : undefined;
            await uploadImageAndRefresh(result.assets[0].uri, type, mediaId);
        }
    };

    const openDobPicker = () => {
        if (Platform.OS === 'android' && DateTimePickerAndroid) {
            DateTimePickerAndroid.open({
                value: dobDate,
                mode: 'date',
                is24Hour: true,
                maximumDate: new Date(),
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
            queryClient.invalidateQueries({ queryKey: ['user'] });
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
                console.error(error);
                Alert.alert("Error", "Failed to update profile.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await AuthService.logout();
        queryClient.removeQueries({ queryKey: ['user'] });
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    };

    const handlePauseAccount = () => {
        if (user?.is_paused) {
            setConfirmModal('unpause');
        } else {
            setConfirmModal('pause');
        }
    };

    const handleDeleteAccount = () => {
        setConfirmModal('delete');
    };

    const handleConfirmModalConfirm = async () => {
        if (!confirmModal) return;
        setAccountActionLoading(true);
        try {
            if (confirmModal === 'pause') {
                await AccountService.pause();
                queryClient.invalidateQueries({ queryKey: ['user'] });
            } else if (confirmModal === 'unpause') {
                await AccountService.unpause();
                queryClient.invalidateQueries({ queryKey: ['user'] });
            } else if (confirmModal === 'delete') {
                await AccountService.deleteAccount();
                await AuthService.logout();
                queryClient.removeQueries({ queryKey: ['user'] });
                setConfirmModal(null);
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                return;
            }
            setConfirmModal(null);
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? e?.message ?? 'Something went wrong.';
            Alert.alert('Error', msg);
        } finally {
            setAccountActionLoading(false);
        }
    };

    const confirmModalConfig =
        confirmModal === 'pause'
            ? {
                title: 'Pause account?',
                message:
                    'Your profile will be hidden from others and you won\'t be able to create specs. You can still log in and unpause anytime.',
                confirmLabel: 'Pause',
                destructive: false,
            }
            : confirmModal === 'unpause'
                ? {
                    title: 'Unpause account?',
                    message: 'Your profile will be visible again and you can create specs.',
                    confirmLabel: 'Unpause',
                    destructive: false,
                }
                : confirmModal === 'delete'
                    ? {
                        title: 'Delete account?',
                        message: 'This is permanent. All your data will be removed. You will not be able to recover your account.',
                        confirmLabel: 'Delete account',
                        destructive: true,
                    }
                    : null;

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
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
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
                    <View style={{ width: 40 }} />
                </View>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <Avatar.Image
                            size={120}
                            source={{ uri: avatarUri }}
                            style={{ backgroundColor: theme.colors.surfaceVariant }}
                        />
                        <TouchableOpacity
                            style={[styles.editBadge, { backgroundColor: theme.colors.primary }]}
                            onPress={() => {
                                if (imgLoading) return;
                                Alert.alert('Change avatar', '', [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Take photo', onPress: () => takePhotoWithCamera('avatar') },
                                    { text: 'Choose from library', onPress: () => pickFromGallery('avatar') },
                                ]);
                            }}
                            activeOpacity={0.8}
                            disabled={imgLoading}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessible
                            accessibilityRole="button"
                            accessibilityLabel="Edit avatar"
                        >
                            {imgLoading ? (
                                <ActivityIndicator size={18} color={theme.colors.onPrimary} />
                            ) : (
                                <MaterialCommunityIcons name="pencil" size={18} color={theme.colors.onPrimary} />
                            )}
                        </TouchableOpacity>
                    </View>
                    <Text variant="headlineMedium" style={[styles.nameText, { color: theme.colors.onSurface }]}>
                        {form?.full_name || user?.name || 'Your Name'}
                    </Text>
                    <View style={styles.headerMeta}>
                        <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.onSurfaceVariant} />
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                            {form?.city || user?.profile?.city || 'Add location'}
                        </Text>
                        {form?.dob && (
                            <>
                                <Text style={{ color: theme.colors.onSurfaceVariant, marginHorizontal: 8 }}>•</Text>
                                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {new Date().getFullYear() - new Date(form?.dob ?? '').getFullYear()} y/o
                                </Text>
                            </>
                        )}
                    </View>
                </View>

                {/* Balance / Wallet */}
                <Surface style={[styles.walletSection, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
                    <View style={styles.walletHeader}>
                        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary, marginBottom: 0 }]}>
                            Wallet
                        </Text>
                        <TouchableOpacity
                            onPress={() => Alert.alert('Coming soon', 'Top up and transaction history will be available soon.')}
                            style={[styles.walletTopUp, { backgroundColor: theme.colors.primaryContainer }]}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons name="plus-circle" size={18} color={theme.colors.primary} />
                            <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: '700', marginLeft: 6 }}>
                                Top up
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.walletRow}>
                        <View style={[styles.walletCard, { backgroundColor: theme.colors.errorContainer }]}>
                            <View style={[styles.walletIconWrap, { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
                                {/* Red Spark (Life) */}
                                {/* Red Spark (Life) */}
                                <MaterialCommunityIcons
                                    name="lightning-bolt"
                                    size={34}
                                    color={theme.colors.error}
                                    style={{
                                        shadowColor: theme.colors.error,
                                        shadowOffset: { width: 0, height: 0 },
                                        shadowOpacity: 0.8,
                                        shadowRadius: 8,
                                        elevation: 5, // Android glow
                                    }}
                                />
                            </View>
                            <Text variant="headlineSmall" style={[styles.walletAmount, { color: theme.colors.onSurface }]}>
                                {user?.balance?.red_sparks ?? 0}
                            </Text>
                            <Text variant="bodySmall" numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.colors.onSurfaceVariant, fontWeight: '600' }}>
                                Red Sparks
                            </Text>
                        </View>
                        <View style={[styles.walletCard, { backgroundColor: theme.colors.primaryContainer }]}>
                            <View style={[styles.walletIconWrap, { backgroundColor: 'rgba(124,58,237,0.2)' }]}>
                                {/* Blue Spark (Credit) */}
                                {/* Blue Spark (Credit) */}
                                <MaterialCommunityIcons
                                    name="lightning-bolt"
                                    size={34}
                                    color={theme.colors.primary}
                                    style={{
                                        shadowColor: theme.colors.primary,
                                        shadowOffset: { width: 0, height: 0 },
                                        shadowOpacity: 0.8,
                                        shadowRadius: 8,
                                        elevation: 5, // Android glow
                                    }}
                                />
                            </View>
                            <Text variant="headlineSmall" style={[styles.walletAmount, { color: theme.colors.onSurface }]}>
                                {user?.balance?.blue_sparks ?? 0}
                            </Text>
                            <Text variant="bodySmall" numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.colors.onSurfaceVariant, fontWeight: '600' }}>
                                Blue Sparks
                            </Text>
                        </View>
                    </View>
                </Surface>

                {/* Info Text */}
                <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        Public Photos
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                        Add up to 6 photos to show off your best self.
                    </Text>
                    <ProfileImageGrid
                        images={imagesWithCacheBust}
                        maxSlots={6}
                        readOnly={false}
                        onImagePress={openImageViewer}
                        onEditSlot={(index) => {
                            Alert.alert('Photo', '', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Take photo', onPress: () => takePhotoWithCamera('profile_gallery', index) },
                                { text: 'Choose from library', onPress: () => pickFromGallery('profile_gallery', index) },
                            ]);
                        }}
                    />
                </Surface>

                {/* Form Fields */}
                <Surface style={[styles.section, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        Basic Details
                    </Text>

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
                            maximumDate={new Date()}
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
                            else setForm((p) => ({ ...p, occupation: v || '' }));
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

                {/* Account Actions */}
                <Surface style={[styles.accountSection, { backgroundColor: theme.colors.elevation.level1 }]} elevation={0}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                        Account
                    </Text>

                    <TouchableOpacity
                        onPress={handlePauseAccount}
                        style={[styles.accountActionItem, { borderColor: theme.colors.outline }]}
                        activeOpacity={0.7}
                    >
                        <View style={styles.accountActionLeft}>
                            <View style={[styles.accountIconContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
                                <MaterialCommunityIcons
                                    name={user?.is_paused ? 'play-circle' : 'pause-circle'}
                                    size={22}
                                    color={theme.colors.secondary}
                                />
                            </View>
                            <View style={styles.accountActionText}>
                                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                                    {user?.is_paused ? 'Paused' : 'Pause Account'}
                                </Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                                    {user?.is_paused
                                        ? 'Your profile is hidden. Tap to unpause.'
                                        : 'Hide your profile temporarily'}
                                </Text>
                            </View>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>

                    <Divider style={styles.divider} />

                    <TouchableOpacity
                        onPress={handleLogout}
                        style={[styles.accountActionItem, { borderColor: theme.colors.outline }]}
                        activeOpacity={0.7}
                    >
                        <View style={styles.accountActionLeft}>
                            <View style={[styles.accountIconContainer, { backgroundColor: theme.colors.errorContainer }]}>
                                <MaterialCommunityIcons name="logout" size={22} color={theme.colors.error} />
                            </View>
                            <View style={styles.accountActionText}>
                                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                                    Log Out
                                </Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                                    Sign out of your account
                                </Text>
                            </View>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>

                    <Divider style={styles.divider} />

                    <TouchableOpacity
                        onPress={handleDeleteAccount}
                        style={[styles.accountActionItem, styles.deleteActionItem, { borderColor: theme.colors.error }]}
                        activeOpacity={0.7}
                    >
                        <View style={styles.accountActionLeft}>
                            <View style={[styles.accountIconContainer, { backgroundColor: theme.colors.errorContainer }]}>
                                <MaterialCommunityIcons name="delete-outline" size={22} color={theme.colors.error} />
                            </View>
                            <View style={styles.accountActionText}>
                                <Text variant="bodyLarge" style={{ color: theme.colors.error, fontWeight: '700' }}>
                                    Delete My Account
                                </Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                                    Permanently delete your account
                                </Text>
                            </View>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                </Surface>

            </ScrollView>

            <ImageViewerModal
                visible={viewerVisible}
                images={imagesFilled}
                initialIndex={viewerInitialIndex}
                onClose={() => setViewerVisible(false)}
                onReplace={(index) => { setViewerVisible(false); pickFromGallery('profile_gallery', index); }}
            />

            {confirmModalConfig && (
                <ConfirmModal
                    visible={!!confirmModal}
                    title={confirmModalConfig.title}
                    message={confirmModalConfig.message}
                    confirmLabel={confirmModalConfig.confirmLabel}
                    onConfirm={handleConfirmModalConfirm}
                    onCancel={() => setConfirmModal(null)}
                    destructive={confirmModalConfig.destructive}
                    loading={accountActionLoading}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {},
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        marginBottom: 8,
    },
    backButton: {
        margin: 0,
    },
    screenTitle: {
        fontWeight: '800',
        fontSize: 20,
        letterSpacing: -0.5,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        borderRadius: 20,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    headerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    nameText: {
        fontWeight: 'bold',
    },
    section: {
        marginHorizontal: 16,
        marginBottom: 20,
        padding: 20,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    walletSection: {
        marginHorizontal: 16,
        marginBottom: 20,
        padding: 20,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    walletHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    walletTopUp: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
    },
    walletRow: {
        flexDirection: 'row',
        gap: 12,
    },
    walletCard: {
        flex: 1,
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        minHeight: 100,
        justifyContent: 'center',
    },
    walletIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    walletAmount: {
        fontWeight: '900',
        marginBottom: 4,
    },
    sectionTitle: {
        marginBottom: 20,
        fontWeight: '800',
        textTransform: 'uppercase',
        fontSize: 11,
        letterSpacing: 1.2,
    },
    input: {
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
    },
    inputContent: {
        paddingHorizontal: 0,
    },
    divider: {
        marginVertical: 8,
        opacity: 0.3,
    },
    rowInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    lifestyleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        flexWrap: 'wrap',
    },
    lifestyleLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        minWidth: 140,
    },
    lifestyleLabelText: {
        fontWeight: '600',
    },
    lifestylePills: {
        flexGrow: 1,
        minWidth: 200,
    },
    saveButton: {
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 8,
        borderRadius: 16,
        elevation: 2,
    },
    accountSection: {
        marginHorizontal: 16,
        marginTop: 24,
        marginBottom: 20,
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    accountActionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    deleteActionItem: {
        borderWidth: 1.5,
    },
    accountActionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    accountIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    accountActionText: {
        flex: 1,
    },
});
