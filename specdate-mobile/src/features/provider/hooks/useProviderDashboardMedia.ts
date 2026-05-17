import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MediaModerationError, MediaService } from '../../../services/media';
import { confirmMediaShareWithAiScan } from '../../../utils/confirmMediaShareWithAiScan';
import type { UploadProgressState } from '../../../components';
import type { ProviderDashboardProfile, ProviderGalleryImage } from '../types';

type Params = {
  profile: ProviderDashboardProfile | null;
  gallery: any[];
  fetchDashboard: () => Promise<void>;
  setLoading: (loading: boolean) => void;
};

export function useProviderDashboardMedia({
  profile,
  gallery,
  fetchDashboard,
  setLoading,
}: Params) {
  const [galleryViewerVisible, setGalleryViewerVisible] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [mediaUploadProgress, setMediaUploadProgress] = useState<UploadProgressState>(null);

  const galleryImageItems = useMemo<ProviderGalleryImage[]>(() => [
    ...(profile?.image ? [{ url: profile.image, kind: 'cover' as const }] : []),
    ...gallery.map((item: any) => ({ id: item.id, url: item.url, kind: 'gallery' as const })),
  ], [gallery, profile?.image]);

  const galleryImages = useMemo(
    () => galleryImageItems.map((item) => item.url),
    [galleryImageItems],
  );

  const uploadMedia = useCallback(async (
    asset: any,
    type: 'avatar' | 'provider_gallery',
    skipRefresh = false,
    itemLabel?: string,
    mediaId?: number | null,
  ) => {
    const confirmed = await confirmMediaShareWithAiScan();
    if (!confirmed) {
      return;
    }

    const label = itemLabel ?? (type === 'avatar' ? 'cover photo' : 'gallery photo');
    let keepProgressOpen = false;

    try {
      setLoading(true);
      setMediaUploadProgress({
        title: 'Uploading media',
        message: `Uploading your ${label}.`,
      });

      const uploaded = await MediaService.upload(
        asset.uri,
        type,
        mediaId ?? null,
        asset.mimeType || 'image/jpeg',
      );

      setMediaUploadProgress({
        title: 'Reviewing media',
        message: `Checking your ${label} with our safety review. This can take a moment.`,
      });

      await MediaService.waitForModeration(uploaded);
      if (!skipRefresh) {
        void fetchDashboard();
        Alert.alert('Success', 'Image uploaded.');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Upload failed.';
      if (error instanceof MediaModerationError || ['flagged', 'failed', 'timeout'].includes(String(error?.status ?? ''))) {
        keepProgressOpen = true;
        setMediaUploadProgress({
          title: 'Image not saved',
          message: msg,
          status: 'error',
          dismissLabel: 'OK',
          onDismiss: () => setMediaUploadProgress(null),
        });
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      if (!keepProgressOpen) {
        setMediaUploadProgress(null);
      }
      if (!skipRefresh) {
        setLoading(false);
      }
    }
  }, [fetchDashboard, setLoading]);

  const pickAvatar = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadMedia(result.assets[0], 'avatar');
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image');
    }
  }, [uploadMedia]);

  const pickGallery = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        setLoading(true);
        for (const [index, asset] of result.assets.entries()) {
          await uploadMedia(asset, 'provider_gallery', true, `gallery photo ${index + 1} of ${result.assets.length}`);
        }
        void fetchDashboard();
        setLoading(false);
        Alert.alert('Success', 'Gallery updated.');
      }
    } catch {
      Alert.alert('Error', 'Failed to pick images');
      setLoading(false);
    }
  }, [fetchDashboard, setLoading, uploadMedia]);

  const pickGalleryReplacement = useCallback(async (mediaId: number, index: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadMedia(result.assets[0], 'provider_gallery', false, `gallery photo ${index + 1}`, mediaId);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image');
    }
  }, [uploadMedia]);

  const openGalleryAt = useCallback((index: number) => {
    setGalleryInitialIndex(index);
    setGalleryViewerVisible(true);
  }, []);

  const editGalleryImageAt = useCallback((index: number) => {
    const item = galleryImageItems[index];
    if (!item) {
      return;
    }

    if (item.kind === 'cover') {
      pickAvatar();
      return;
    }

    if (item.id) {
      pickGalleryReplacement(item.id, index);
    }
  }, [galleryImageItems, pickAvatar, pickGalleryReplacement]);

  const handleHeroImagePress = useCallback(() => {
    if (profile?.image) {
      openGalleryAt(0);
      return;
    }

    pickAvatar();
  }, [openGalleryAt, pickAvatar, profile?.image]);

  return {
    galleryViewerVisible,
    setGalleryViewerVisible,
    galleryInitialIndex,
    mediaUploadProgress,
    galleryImageItems,
    galleryImages,
    pickAvatar,
    pickGallery,
    editGalleryImageAt,
    handleHeroImagePress,
    openGalleryAt,
  };
}
