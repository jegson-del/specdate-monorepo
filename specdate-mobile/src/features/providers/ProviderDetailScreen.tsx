import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ImageViewerModal } from '../profile/components';
import { AddReviewModal, SeeAllReviewsModal } from './components';
import { getMockReviewsForProvider } from './mockReviews';
import { ChatService } from '../../services/chat';
import { ProviderService, type ProviderMarketplaceItem } from '../../services/providers';
import { toImageUri } from '../../utils/imageUrl';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_ITEM_SIZE = 72;
const GALLERY_GAP = 8;

export type ProviderItem = ProviderMarketplaceItem;
export type ProviderReview = import('./components/SeeAllReviewsModal').ReviewItem;

function buildAddress(provider: ProviderItem) {
  return [provider.address, provider.city, provider.country].filter(Boolean).join(', ');
}

export default function ProviderDetailScreen({ route, navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const routeProvider = route.params?.provider as ProviderItem | undefined;
  const providerId = route.params?.providerId ?? routeProvider?.id;

  const { data: providerResponse } = useQuery({
    queryKey: ['provider', String(providerId)],
    queryFn: () => ProviderService.getProvider(providerId as number | string),
    enabled: providerId != null,
  });

  const provider = providerResponse?.data ?? routeProvider;
  const [submitting, setSubmitting] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [galleryViewerVisible, setGalleryViewerVisible] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [addReviewModalVisible, setAddReviewModalVisible] = useState(false);
  const [seeAllReviewsVisible, setSeeAllReviewsVisible] = useState(false);

  const baseReviews = useMemo(
    () => getMockReviewsForProvider(provider?.id != null ? String(provider.id) : undefined),
    [provider?.id]
  );
  const [userReviews, setUserReviews] = useState<ProviderReview[]>([]);
  const reviews = useMemo(() => [...userReviews, ...baseReviews], [userReviews, baseReviews]);
  const reviewsPreview = useMemo(() => reviews.slice(0, 3), [reviews]);

  const galleryImages = useMemo(() => {
    if (!provider) return [];
    const mainImage = toImageUri(provider.imageUrl);
    const gallery = provider.gallery?.map((item) => toImageUri(item.url)).filter(Boolean) as string[] | undefined;
    return [mainImage, ...(gallery ?? [])].filter(Boolean) as string[];
  }, [provider]);

  if (!provider) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.outline }}>Provider not found.</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>Go back</Button>
      </View>
    );
  }

  const mainImage = galleryImages[0] ?? null;
  const address = buildAddress(provider) || 'Address will be shared by the provider.';
  const ratingLabel = provider.rating != null ? provider.rating.toFixed(1) : provider.isVerified ? 'Verified' : 'New';
  const hasMoreReviews = reviews.length > reviewsPreview.length;

  const openGalleryAt = (index: number) => {
    setGalleryInitialIndex(index);
    setGalleryViewerVisible(true);
  };

  const openWebsite = () => {
    const url = provider.website?.trim();
    if (!url) {
      Alert.alert('No website', 'Website link is not available for this provider.');
      return;
    }

    Linking.openURL(url.startsWith('http') ? url : `https://${url}`).catch(() => {
      Alert.alert('Error', 'Could not open link.');
    });
  };

  const handleSelectProvider = () => {
    Alert.alert(
      'Select venue',
      'You will be taken to confirm this venue for your date and claim your discount voucher.',
      [{ text: 'Cancel' }, { text: 'Continue', onPress: () => navigation.navigate('CreateDateVoucher', { provider }) }]
    );
  };

  const handleMessageProvider = async () => {
    if (!provider.user_id) {
      Alert.alert('Provider chat unavailable', 'This provider needs a live provider account before chat can open.');
      return;
    }

    try {
      setOpeningChat(true);
      const response = await ChatService.openProviderThread(provider.user_id);
      navigation.navigate('ChatThread', { threadId: response.data.id });
    } catch (error: any) {
      Alert.alert('Could not open chat', error?.response?.data?.message || 'Please try again.');
    } finally {
      setOpeningChat(false);
    }
  };

  const handleSubmitReview = (rating: number, text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      Alert.alert('Too short', 'Please write at least a few words for your review.');
      return;
    }
    if (rating < 1) {
      Alert.alert('Add a rating', 'Please tap the stars to rate your experience.');
      return;
    }

    setSubmitting(true);
    setUserReviews((prev) => [
      { id: `user-${Date.now()}`, userName: 'You', rating, text: trimmed, date: 'Just now' },
      ...prev,
    ]);
    setAddReviewModalVisible(false);
    setSubmitting(false);
    Alert.alert('Thanks!', 'Your review has been posted.');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} iconColor={theme.colors.onSurface} />
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>{provider.name}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainImageWrap}>
          <TouchableOpacity activeOpacity={1} onPress={() => galleryImages.length > 0 && openGalleryAt(0)}>
            {mainImage ? (
              <Image source={{ uri: mainImage }} style={styles.mainImage} />
            ) : (
              <View style={[styles.mainImage, styles.mainImagePlaceholder]}>
                <MaterialCommunityIcons name="storefront-outline" size={44} color="#64748B" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.ratingPill}>
            <MaterialCommunityIcons name={provider.rating != null ? 'star' : provider.isVerified ? 'check-decagram' : 'store-outline'} size={16} color="#FCD34D" />
            <Text style={styles.ratingText}>{ratingLabel}</Text>
          </View>

          {provider.website ? (
            <TouchableOpacity onPress={openWebsite} activeOpacity={0.9} style={styles.visitWebsiteOverlay}>
              <MaterialCommunityIcons name="open-in-new" size={18} color="#fff" />
              <Text style={styles.visitWebsiteOverlayText}>Visit website</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.content}>
          <SectionTitle theme={theme}>Gallery</SectionTitle>
          {galleryImages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryStrip}>
              {galleryImages.map((uri, index) => (
                <TouchableOpacity key={`${uri}-${index}`} activeOpacity={0.9} onPress={() => openGalleryAt(index)} style={styles.galleryItemWrap}>
                  <Image source={{ uri }} style={styles.galleryItem} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={[styles.emptyInline, { color: theme.colors.onSurfaceVariant }]}>No gallery photos yet.</Text>
          )}

          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: theme.colors.onSurface }]}>{provider.name}</Text>
            <View style={[styles.priceChip, { backgroundColor: theme.colors.primaryContainer || theme.colors.primary + '30' }]}>
              <Text style={[styles.priceText, { color: theme.colors.onPrimaryContainer || theme.colors.primary }]}>
                {provider.discountPercentage ?? 10}% off
              </Text>
            </View>
          </View>
          <Text style={[styles.categoryCity, { color: theme.colors.onSurfaceVariant }]}>
            {provider.category}{provider.city ? ` · ${provider.city}` : ''}
          </Text>

          <SectionTitle theme={theme}>About</SectionTitle>
          <Text style={[styles.bodyText, { color: theme.colors.onSurface }]}>
            {provider.description || `${provider.name} is a DateUsher provider.`}
          </Text>

          <SectionTitle theme={theme}>Address</SectionTitle>
          <View style={[styles.addressRow, { backgroundColor: theme.colors.surfaceVariant || theme.colors.surface }]}>
            <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
            <Text style={[styles.addressText, { color: theme.colors.onSurface }]}>{address}</Text>
          </View>

          <SectionTitle theme={theme}>Booking terms</SectionTitle>
          <View style={[styles.bookingTermsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <View style={styles.termsRow}>
              <MaterialCommunityIcons name="cash-multiple" size={22} color={theme.colors.primary} />
              <Text style={[styles.termsText, { color: theme.colors.onSurface }]}>
                {provider.minimumSpend ? `Minimum spend ₦${Number(provider.minimumSpend).toLocaleString()}` : 'No minimum spend'}
              </Text>
            </View>
            <View style={styles.termsRow}>
              <MaterialCommunityIcons
                name={provider.bookingRequired ? 'calendar-check-outline' : 'calendar-remove-outline'}
                size={22}
                color={provider.bookingRequired ? '#16A34A' : theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.termsText, { color: theme.colors.onSurface }]}>
                {provider.bookingRequired ? 'Booking required before arrival' : 'Walk-ins allowed'}
              </Text>
            </View>
          </View>

          <SectionTitle theme={theme}>DateUsher offer</SectionTitle>
          <View style={[styles.voucherCard, { backgroundColor: theme.colors.primaryContainer || theme.colors.primary + '18', borderColor: theme.colors.primary + '40' }]}>
            <MaterialCommunityIcons name="ticket-percent" size={28} color={theme.colors.primary} />
            <View style={styles.voucherBody}>
              <Text style={[styles.voucherTitle, { color: theme.colors.onSurface }]}>DateUsher partner offer</Text>
              <Text style={[styles.voucherDesc, { color: theme.colors.onSurfaceVariant }]}>
                Select this venue for your date and unlock {provider.discountPercentage ?? 10}% off when you book through the app.
              </Text>
            </View>
          </View>

          <View style={styles.reviewsSectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Reviews</Text>
            <Button
              mode="outlined"
              onPress={() => setAddReviewModalVisible(true)}
              icon="pencil"
              style={[styles.addReviewBtn, { borderColor: theme.colors.primary }]}
              labelStyle={{ color: theme.colors.primary, fontWeight: '700' }}
              compact
            >
              Add a review
            </Button>
          </View>

          {reviewsPreview.length > 0 ? (
            <View style={styles.reviewList}>
              {reviewsPreview.map((review) => (
                <View key={review.id} style={[styles.reviewCard, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.reviewCardHeader}>
                    <View>
                      <Text style={[styles.reviewReviewerLabel, { color: theme.colors.onSurfaceVariant }]}>Reviewer</Text>
                      <Text style={[styles.reviewUserName, { color: theme.colors.onSurface }]}>{review.userName}</Text>
                    </View>
                    <View style={styles.reviewRatingRow}>
                      <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
                      <Text style={[styles.reviewRatingText, { color: theme.colors.onSurfaceVariant }]}>{review.rating.toFixed(0)}</Text>
                    </View>
                  </View>
                  <Text style={[styles.reviewText, { color: theme.colors.onSurface }]}>{review.text}</Text>
                  <Text style={[styles.reviewDate, { color: theme.colors.onSurfaceVariant }]}>{review.date}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.noReviews, { color: theme.colors.onSurfaceVariant }]}>No reviews yet.</Text>
          )}

          {hasMoreReviews ? (
            <TouchableOpacity onPress={() => setSeeAllReviewsVisible(true)} style={styles.seeAllReviewsInline}>
              <Text style={[styles.seeAllReviewsInlineText, { color: theme.colors.primary }]}>See all {reviews.length} reviews</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          ) : null}

          <View style={styles.ctaWrap}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleMessageProvider}
              disabled={openingChat}
              style={[styles.secondaryButton, { borderColor: theme.colors.primary }]}
            >
              <MaterialCommunityIcons name="message-text-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
                {openingChat ? 'Opening...' : 'Message provider'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={handleSelectProvider} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.primaryButtonText}>Select this venue for your date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <SeeAllReviewsModal visible={seeAllReviewsVisible} onDismiss={() => setSeeAllReviewsVisible(false)} reviews={reviews} />
      <AddReviewModal visible={addReviewModalVisible} onDismiss={() => setAddReviewModalVisible(false)} onSubmit={handleSubmitReview} submitting={submitting} />
      <ImageViewerModal visible={galleryViewerVisible} images={galleryImages} initialIndex={galleryInitialIndex} onClose={() => setGalleryViewerVisible(false)} />
    </View>
  );
}

function SectionTitle({ children, theme }: { children: string; theme: any }) {
  return <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  scroll: { flex: 1 },
  mainImageWrap: { position: 'relative', width: SCREEN_WIDTH },
  mainImage: { width: SCREEN_WIDTH, height: 240, backgroundColor: '#E8EEF6' },
  mainImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  ratingPill: {
    position: 'absolute',
    top: 200,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  ratingText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  visitWebsiteOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  visitWebsiteOverlayText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  content: { paddingTop: 8, paddingHorizontal: 20 },
  galleryStrip: { flexDirection: 'row', gap: GALLERY_GAP, paddingTop: 14, paddingBottom: 8 },
  galleryItemWrap: { borderRadius: 10, overflow: 'hidden' },
  galleryItem: { width: GALLERY_ITEM_SIZE, height: GALLERY_ITEM_SIZE, backgroundColor: '#eee', borderRadius: 10 },
  emptyInline: { fontSize: 13, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  name: { fontSize: 22, fontWeight: '800', flex: 1 },
  priceChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  priceText: { fontSize: 13, fontWeight: '800' },
  categoryCity: { fontSize: 14, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginTop: 20, marginBottom: 8 },
  bodyText: { fontSize: 15, lineHeight: 22 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12 },
  addressText: { fontSize: 15, flex: 1 },
  bookingTermsCard: { gap: 12, padding: 16, borderRadius: 16, borderWidth: 1 },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  termsText: { fontSize: 15, fontWeight: '700', flex: 1 },
  voucherCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  voucherBody: { flex: 1 },
  voucherTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  voucherDesc: { fontSize: 14, lineHeight: 20 },
  reviewsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 12, gap: 8 },
  addReviewBtn: { borderRadius: 20 },
  reviewList: { gap: 12 },
  reviewCard: { padding: 14, borderRadius: 12 },
  reviewCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  reviewReviewerLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  reviewUserName: { fontSize: 15, fontWeight: '700' },
  reviewRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewRatingText: { fontSize: 13, fontWeight: '700' },
  reviewText: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  reviewDate: { fontSize: 12 },
  noReviews: { fontSize: 14, fontStyle: 'italic', marginBottom: 8 },
  seeAllReviewsInline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12, paddingVertical: 8 },
  seeAllReviewsInlineText: { fontSize: 14, fontWeight: '700' },
  ctaWrap: { gap: 10, marginTop: 28, marginBottom: 16 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1 },
  secondaryButtonText: { fontSize: 16, fontWeight: '700' },
});
