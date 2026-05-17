import React, { useCallback, useMemo } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, View } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UploadProgressModal } from '../../components';
import { ImageViewerModal } from '../profile/components';
import type { ReviewItem } from '../providers/components';
import { DEFAULT_MOCK_REVIEWS } from '../providers/mockReviews';
import { formatMoney } from '../../utils/currency';
import {
  ProviderBookingTermsSection,
  ProviderBusinessInfoSection,
  ProviderDashboardCards,
  ProviderDashboardHeader,
  ProviderDiscountSection,
  ProviderGallerySection,
  ProviderHero,
  ProviderSaveBar,
  providerDashboardStyles as styles,
} from './components/ProviderDashboardSections';
import { useProviderDashboard } from './hooks/useProviderDashboard';
import { useProviderDashboardMedia } from './hooks/useProviderDashboardMedia';

export default function ProviderDashboardScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    loading,
    setLoading,
    refreshing,
    profile,
    gallery,
    counts,
    editMode,
    setEditMode,
    form,
    updateForm,
    fetchDashboard,
    onRefresh,
    saveSettings,
  } = useProviderDashboard();

  const {
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
  } = useProviderDashboardMedia({
    profile,
    gallery,
    fetchDashboard,
    setLoading,
  });

  const reviews = (profile?.reviews as ReviewItem[] | undefined) ?? DEFAULT_MOCK_REVIEWS;
  const ratingDisplay = profile?.rating != null ? Number(profile.rating).toFixed(1) : null;

  const minimumSpendDisplay = useMemo(() => {
    if (!form.minimumSpendEnabled) {
      return 'No minimum';
    }

    const amount = Number(form.minimumSpend || profile?.minimum_spend || 0);
    return amount ? `Minimum spend ${formatMoney(amount, form.currency, form.country)}` : 'No minimum spend';
  }, [form.country, form.currency, form.minimumSpend, form.minimumSpendEnabled, profile?.minimum_spend]);

  const minimumSpendShortDisplay = useMemo(() => {
    if (!form.minimumSpendEnabled) {
      return 'No min';
    }

    const amount = Number(form.minimumSpend || profile?.minimum_spend || 0);
    return amount ? `Min ${formatMoney(amount, form.currency, form.country)}` : 'No min';
  }, [form.country, form.currency, form.minimumSpend, form.minimumSpendEnabled, profile?.minimum_spend]);

  const startEditing = useCallback(() => {
    setEditMode(true);
  }, [setEditMode]);

  const openWebsite = useCallback(() => {
    const url = form.website.trim();
    if (url) {
      Linking.openURL(url.startsWith('http') ? url : `https://${url}`).catch(() =>
        Alert.alert('Error', 'Could not open link.')
      );
      return;
    }

    Alert.alert('No website', 'Add a website in Edit mode.');
  }, [form.website]);

  if (loading && !refreshing && !profile) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ProviderDashboardHeader
        companyName={form.companyName}
        counts={counts}
        insetsTop={insets.top}
        navigation={navigation}
        theme={theme}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + (editMode ? 126 : 32) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <ProviderHero
          profile={profile}
          website={form.website}
          editMode={editMode}
          ratingDisplay={ratingDisplay}
          onPressImage={handleHeroImagePress}
          onPressEditImage={pickAvatar}
          onOpenWebsite={openWebsite}
          theme={theme}
        />

        <View style={[styles.content, { paddingHorizontal: 20 }]}>
          <ProviderDashboardCards
            counts={counts}
            discountPercentage={form.discountPercentage}
            minimumSpendShortDisplay={minimumSpendShortDisplay}
            reviewsCount={reviews.length}
            editMode={editMode}
            navigation={navigation}
            reviews={reviews}
            theme={theme}
          />

          <ProviderGallerySection
            galleryImageItems={galleryImageItems}
            galleryImages={galleryImages}
            editMode={editMode}
            onOpenGalleryAt={openGalleryAt}
            onEditGalleryImageAt={editGalleryImageAt}
            onPickGallery={pickGallery}
            theme={theme}
          />

          <ProviderBusinessInfoSection
            form={form}
            editMode={editMode}
            updateForm={updateForm}
            onStartEditing={startEditing}
            onOpenWebsite={openWebsite}
            theme={theme}
          />

          <ProviderDiscountSection
            form={form}
            editMode={editMode}
            updateForm={updateForm}
            onStartEditing={startEditing}
            theme={theme}
          />

          <ProviderBookingTermsSection
            form={form}
            editMode={editMode}
            minimumSpendDisplay={minimumSpendDisplay}
            updateForm={updateForm}
            onStartEditing={startEditing}
            theme={theme}
          />
        </View>
      </ScrollView>

      {editMode ? (
        <ProviderSaveBar
          bottomInset={insets.bottom}
          loading={loading}
          onCancel={() => setEditMode(false)}
          onSave={saveSettings}
          theme={theme}
        />
      ) : null}

      <ImageViewerModal
        visible={galleryViewerVisible}
        images={galleryImages}
        initialIndex={galleryInitialIndex}
        onClose={() => setGalleryViewerVisible(false)}
        onReplace={editGalleryImageAt}
      />

      <UploadProgressModal progress={mediaUploadProgress} />
    </View>
  );
}
