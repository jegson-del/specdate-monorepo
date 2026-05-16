import { useState, type Dispatch, type SetStateAction } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { QueryClient } from '@tanstack/react-query';
import { MediaModerationError, MediaService } from '../../../services/media';
import { confirmMediaShareWithAiScan } from '../../../utils/confirmMediaShareWithAiScan';
import { imageUriWithCacheBust } from '../../../utils/imageUrl';
import type { UploadProgressState } from '../../../components';

type ProfileMediaType = 'avatar' | 'profile_gallery';

type UseProfileMediaUploadParams = {
    user: any;
    queryClient: QueryClient;
    refetchUser: () => Promise<unknown>;
    localAvatarMediaId?: number;
    setLocalAvatarUri: Dispatch<SetStateAction<string | null>>;
    setLocalAvatarMediaId: Dispatch<SetStateAction<number | undefined>>;
    setImages: Dispatch<SetStateAction<(string | null)[]>>;
};

export function useProfileMediaUpload({
    user,
    queryClient,
    refetchUser,
    localAvatarMediaId,
    setLocalAvatarUri,
    setLocalAvatarMediaId,
    setImages,
}: UseProfileMediaUploadParams) {
    const [imgLoading, setImgLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<UploadProgressState>(null);

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

    const uploadImageAndRefresh = async (
        uri: string,
        type: ProfileMediaType,
        mediaId?: number,
        replaceSlotIndex?: number
    ) => {
        const confirmed = await confirmMediaShareWithAiScan();
        if (!confirmed) return;

        setImgLoading(true);
        const label = type === 'avatar' ? 'avatar' : 'profile photo';
        let keepProgressOpen = false;
        try {
            setUploadProgress({
                title: 'Uploading media',
                message: `Uploading your ${label}.`,
            });
            const uploaded = await MediaService.upload(uri, type, mediaId);
            setUploadProgress({
                title: 'Reviewing media',
                message: `Checking your ${label} with our safety review.`,
            });
            const media = await MediaService.waitForModeration(uploaded);
            const uploadedUrl = media?.url && (media.url as string).startsWith('http') ? media.url : null;

            if (uploadedUrl) {
                const cacheBustedUrl = imageUriWithCacheBust(uploadedUrl, Date.now()) ?? uploadedUrl;
                queryClient.setQueryData(['user'], (old: any) => {
                    if (!old) return old;
                    if (type === 'avatar') {
                        return {
                            ...old,
                            profile: {
                                ...(old.profile || {}),
                                avatar: uploadedUrl,
                                avatar_media_id: media?.id ?? mediaId ?? old.profile?.avatar_media_id,
                                updated_at: new Date().toISOString(),
                            },
                        };
                    }
                    const prev = (old.images || []) as string[];
                    const nextImages = [...prev];
                    if (replaceSlotIndex != null) {
                        nextImages[replaceSlotIndex] = uploadedUrl;
                    } else {
                        nextImages.push(uploadedUrl);
                    }
                    return { ...old, images: nextImages.filter(Boolean).slice(0, 6) };
                });

                if (type === 'avatar') {
                    setLocalAvatarUri(cacheBustedUrl);
                    setLocalAvatarMediaId(media?.id ?? mediaId);
                } else {
                    setImages((prev) => {
                        if (replaceSlotIndex != null) {
                            const next = [...prev];
                            next[replaceSlotIndex] = uploadedUrl;
                            return [...next, ...new Array(6).fill(null)].slice(0, 6);
                        }
                        const filled = prev.filter(Boolean) as string[];
                        return [...filled, uploadedUrl, ...new Array(6 - filled.length - 1).fill(null)].slice(0, 6);
                    });
                }
            }
            await queryClient.invalidateQueries({ queryKey: ['user'] });
            await refetchUser();
            Alert.alert('Success', 'Image uploaded successfully.');
        } catch (e: any) {
            const msg = e?.message || e?.response?.data?.message || 'Upload failed. Try again.';
            if (e instanceof MediaModerationError || ['flagged', 'failed', 'timeout'].includes(String(e?.status ?? ''))) {
                keepProgressOpen = true;
                setUploadProgress({
                    title: 'Image not saved',
                    message: msg,
                    status: 'error',
                    dismissLabel: 'OK',
                    onDismiss: () => setUploadProgress(null),
                });
            } else {
                Alert.alert('Upload Failed', msg);
            }
        } finally {
            if (!keepProgressOpen) {
                setUploadProgress(null);
            }
            setImgLoading(false);
        }
    };

    const takePhotoWithCamera = async (type: ProfileMediaType, replaceSlotIndex?: number) => {
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
                ? user?.profile_gallery_media?.[replaceSlotIndex]?.id
                : type === 'avatar'
                    ? localAvatarMediaId ?? user?.profile?.avatar_media_id
                    : undefined;
            await uploadImageAndRefresh(result.assets[0].uri, type, mediaId, replaceSlotIndex);
        }
    };

    const pickFromGallery = async (type: ProfileMediaType, replaceSlotIndex?: number) => {
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
                ? user?.profile_gallery_media?.[replaceSlotIndex]?.id
                : type === 'avatar'
                    ? localAvatarMediaId ?? user?.profile?.avatar_media_id
                    : undefined;
            await uploadImageAndRefresh(result.assets[0].uri, type, mediaId, replaceSlotIndex);
        }
    };

    return {
        imgLoading,
        uploadProgress,
        takePhotoWithCamera,
        pickFromGallery,
    };
}
