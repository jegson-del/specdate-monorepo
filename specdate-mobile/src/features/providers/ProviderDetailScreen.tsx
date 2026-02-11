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
import { Text, useTheme, IconButton, Button, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ImageViewerModal } from '../profile/components';
import { AddReviewModal, SeeAllReviewsModal } from './components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_ITEM_SIZE = 72;
const GALLERY_GAP = 8;

type ProviderCategory = 'Restaurant' | 'Cafe' | 'Cinema' | 'Activity' | 'Lounge';

export type ProviderItem = {
  id: string;
  name: string;
  category: ProviderCategory;
  city: string;
  price: '₦' | '₦₦' | '₦₦₦';
  rating: number;
  imageUrl: string;
};

type ProviderDetail = {
  mainImage: string;
  images: string[];
  website?: string;
  description: string;
  address: string;
  menu?: { title: string; items: string[] };
  voucherTitle: string;
  voucherDescription: string;
};

export type ProviderReview = {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  text: string;
  date: string;
};

/** Dummy reviews per provider – design ready for when API is added. Each has reviewer, text, date, rating. */
const MOCK_REVIEWS: Record<string, ProviderReview[]> = {
  p1: [
    { id: 'r1', userName: 'Chioma O.', rating: 5, text: 'Perfect spot for a first date. Food was great and the vibe was relaxed. We had the jollof and suya platter – both amazing.', date: '2 weeks ago' },
    { id: 'r2', userName: 'Tunde M.', rating: 4, text: 'Good experience. Would come again with my partner. Service was a bit slow but the food made up for it.', date: '1 month ago' },
    { id: 'r3', userName: 'Amara K.', rating: 5, text: 'Came here for our anniversary. The staff went out of their way to make it special. Chapman is a must-try.', date: '3 weeks ago' },
    { id: 'r4', userName: 'Folake S.', rating: 4, text: 'Nice atmosphere and tasty food. Portions are generous. Will definitely be back.', date: '1 month ago' },
    { id: 'r5', userName: 'Ibrahim D.', rating: 5, text: 'Best pepper soup in Lekki. Brought my date here and we both loved it. Great for a casual but memorable evening.', date: '2 months ago' },
  ],
  p2: [
    { id: 'r6', userName: 'Amara K.', rating: 5, text: 'The Vineyard never disappoints. Wine selection and service top notch. Perfect for a special date night.', date: '3 weeks ago' },
    { id: 'r7', userName: 'David O.', rating: 4, text: 'Intimate setting and good wine pairings. A bit on the pricey side but worth it for the experience.', date: '1 month ago' },
    { id: 'r8', userName: 'Ngozi E.', rating: 5, text: 'Celebrated my birthday here. The team made it so special. Food and wine were excellent.', date: '2 weeks ago' },
  ],
};

/** Fallback dummy reviews for providers without specific mock data – so list design is always visible. */
const DEFAULT_MOCK_REVIEWS: ProviderReview[] = [
  { id: 'd1', userName: 'Guest User', rating: 4, text: 'Really enjoyed the experience. Great atmosphere and friendly staff. Would recommend for a date.', date: '3 weeks ago' },
  { id: 'd2', userName: 'Sarah T.', rating: 5, text: 'Lovely place. We had a great time and the service was excellent. Will visit again.', date: '1 month ago' },
  { id: 'd3', userName: 'Michael B.', rating: 4, text: 'Good food and nice vibe. Perfect for a first date or casual catch-up.', date: '2 months ago' },
];

const MOCK_DETAILS: Record<string, ProviderDetail> = {
  p1: {
    mainImage: 'https://picsum.photos/seed/dateusher-provider-3/800/500',
    images: [
      'https://picsum.photos/seed/dateusher-d1a/400/300',
      'https://picsum.photos/seed/dateusher-d1b/400/300',
      'https://picsum.photos/seed/dateusher-d1c/400/300',
      'https://picsum.photos/seed/dateusher-d1d/400/300',
    ],
    website: 'https://example.com/nilebites',
    description: 'Nile Bites brings you authentic flavours in a relaxed setting—perfect for a first date or a special evening. Our menu features fresh, locally sourced ingredients and a curated selection of drinks.',
    address: '12 Admiralty Way, Lekki Phase 1, Lagos',
    menu: {
      title: 'Popular dishes',
      items: ['Jollof Rice & Grilled Chicken', 'Pepper Soup Combo', 'Suya Platter', 'Chapman & Mocktails'],
    },
    voucherTitle: '15% off your first date',
    voucherDescription: 'DateUsher users get 15% off the total bill when you book through the app. Valid for two people, any day.',
  },
  p2: {
    mainImage: 'https://picsum.photos/seed/dateusher-provider-6/800/500',
    images: [
      'https://picsum.photos/seed/dateusher-d2a/400/300',
      'https://picsum.photos/seed/dateusher-d2b/400/300',
    ],
    website: 'https://example.com/thevineyard',
    description: 'The Vineyard offers an intimate dining experience with a focus on wine pairings and contemporary Nigerian cuisine. Ideal for a memorable date night.',
    address: 'Plot 45, Maitama, Abuja',
    voucherTitle: 'Free dessert for two',
    voucherDescription: 'Book your date through DateUsher and enjoy a complimentary dessert platter with two drinks.',
  },
};

function getDetail(provider: ProviderItem): ProviderDetail {
  const d = MOCK_DETAILS[provider.id];
  if (d) return d;
  return {
    mainImage: provider.imageUrl,
    images: [provider.imageUrl],
    website: undefined,
    description: `${provider.name} is a great choice for your date. Enjoy a relaxed atmosphere and quality service in ${provider.city}.`,
    address: `${provider.city}, Nigeria`,
    voucherTitle: 'DateUsher partner offer',
    voucherDescription: 'Select this venue for your date and unlock an exclusive discount when you book through the app.',
  };
}

export default function ProviderDetailScreen({ route, navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const provider = route.params?.provider as ProviderItem | undefined;

  const detail = useMemo(() => (provider ? getDetail(provider) : null), [provider]);

  const baseReviews = useMemo(
    () => (provider ? (MOCK_REVIEWS[provider.id] ?? DEFAULT_MOCK_REVIEWS) : []),
    [provider?.id]
  );
  const [userReviews, setUserReviews] = useState<ProviderReview[]>([]);
  const reviews = useMemo(() => [...userReviews, ...baseReviews], [userReviews, baseReviews]);

  const [submitting, setSubmitting] = useState(false);

  const [galleryViewerVisible, setGalleryViewerVisible] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  const [addReviewModalVisible, setAddReviewModalVisible] = useState(false);
  const [seeAllReviewsVisible, setSeeAllReviewsVisible] = useState(false);

  const REVIEWS_PREVIEW_COUNT = 3;
  const reviewsPreview = useMemo(() => reviews.slice(0, REVIEWS_PREVIEW_COUNT), [reviews]);
  const hasMoreReviews = reviews.length > REVIEWS_PREVIEW_COUNT;

  const openGalleryAt = (index: number) => {
    setGalleryInitialIndex(index);
    setGalleryViewerVisible(true);
  };

  const closeAddReviewModal = () => setAddReviewModalVisible(false);

  const openWebsite = () => {
    const url = detail?.website;
    if (url) {
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open link.'));
    } else {
      Alert.alert('No website', 'Website link is not available for this provider.');
    }
  };

  const handleSelectProvider = () => {
    Alert.alert(
      'Select venue',
      'You’ll be taken to confirm this venue for your date and to claim your discount voucher.',
      [
        { text: 'Cancel' },
        { text: 'Continue', onPress: () => navigation.goBack() },
      ]
    );
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
    const newReview: ProviderReview = {
      id: `user-${Date.now()}`,
      userName: 'You',
      rating,
      text: trimmed,
      date: 'Just now',
    };
    setUserReviews((prev) => [newReview, ...prev]);
    closeAddReviewModal();
    setSubmitting(false);
    Alert.alert('Thanks!', 'Your review has been posted.');
  };

  if (!provider || !detail) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.outline }}>Provider not found.</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>Go back</Button>
      </View>
    );
  }

  const allImages = [detail.mainImage, ...detail.images.filter((u) => u !== detail.mainImage)];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4, paddingHorizontal: 4 }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} iconColor={theme.colors.onSurface} />
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>{provider.name}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main image (tappable to open gallery at 0) + Visit website overlay */}
        <View style={styles.mainImageWrap}>
          <TouchableOpacity activeOpacity={1} onPress={() => openGalleryAt(0)}>
            <Image source={{ uri: detail.mainImage }} style={styles.mainImage} />
          </TouchableOpacity>
          <View style={[styles.ratingPill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <MaterialCommunityIcons name="star" size={16} color="#FCD34D" />
            <Text style={styles.ratingText}>{provider.rating.toFixed(1)}</Text>
          </View>
          {detail.website && (
            <TouchableOpacity
              onPress={openWebsite}
              activeOpacity={0.9}
              style={styles.visitWebsiteOverlay}
            >
              <MaterialCommunityIcons name="open-in-new" size={18} color="#fff" />
              <Text style={styles.visitWebsiteOverlayText}>Visit website</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.content, { paddingHorizontal: 20 }]}>
          {/* Gallery section - view all images in same preview */}
          <SectionTitle theme={theme}>Gallery</SectionTitle>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.galleryStrip, { paddingLeft: 0, paddingRight: 0, marginBottom: 8 }]}
          >
            {allImages.map((uri, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.9}
                onPress={() => openGalleryAt(i)}
                style={styles.galleryItemWrap}
              >
                <Image source={{ uri }} style={styles.galleryItem} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={[styles.galleryHint, { color: theme.colors.onSurfaceVariant }]}>Tap any image to view full screen</Text>
          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: theme.colors.onSurface }]}>{provider.name}</Text>
            <View style={[styles.priceChip, { backgroundColor: theme.colors.primaryContainer || theme.colors.primary + '30' }]}>
              <Text style={[styles.priceText, { color: theme.colors.onPrimaryContainer || theme.colors.primary }]}>{provider.price}</Text>
            </View>
          </View>
          <Text style={[styles.categoryCity, { color: theme.colors.onSurfaceVariant }]}>{provider.category} · {provider.city}</Text>

          {/* Description */}
          <SectionTitle theme={theme}>About</SectionTitle>
          <Text style={[styles.bodyText, { color: theme.colors.onSurface }]}>{detail.description}</Text>

          {/* Address */}
          <SectionTitle theme={theme}>Address</SectionTitle>
          <View style={[styles.addressRow, { backgroundColor: theme.colors.surfaceVariant || theme.colors.surface }]}>
            <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
            <Text style={[styles.addressText, { color: theme.colors.onSurface }]}>{detail.address}</Text>
          </View>

          {/* Menu (if available) */}
          {detail.menu && (
            <>
              <SectionTitle theme={theme}>{detail.menu.title}</SectionTitle>
              <Surface style={[styles.menuCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                {detail.menu.items.map((item, i) => (
                  <Text key={i} style={[styles.menuItem, { color: theme.colors.onSurface }]}>{item}</Text>
                ))}
              </Surface>
            </>
          )}

          {/* Voucher / discount */}
          <SectionTitle theme={theme}>DateUsher offer</SectionTitle>
          <View style={[styles.voucherCard, { backgroundColor: theme.colors.primaryContainer || theme.colors.primary + '18', borderColor: theme.colors.primary + '40' }]}>
            <MaterialCommunityIcons name="ticket-percent" size={28} color={theme.colors.primary} />
            <View style={styles.voucherBody}>
              <Text style={[styles.voucherTitle, { color: theme.colors.onSurface }]}>{detail.voucherTitle}</Text>
              <Text style={[styles.voucherDesc, { color: theme.colors.onSurfaceVariant }]}>{detail.voucherDescription}</Text>
            </View>
          </View>

          {/* Reviews – preview + See all when many, Add a review button */}
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

          {reviews.length > 0 ? (
            <View style={styles.reviewList}>
              {reviewsPreview.map((r) => (
                <View key={r.id} style={[styles.reviewCard, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.reviewCardHeader}>
                    <View>
                      <Text style={[styles.reviewReviewerLabel, { color: theme.colors.onSurfaceVariant }]}>Reviewer</Text>
                      <Text style={[styles.reviewUserName, { color: theme.colors.onSurface }]}>{r.userName}</Text>
                    </View>
                    <View style={styles.reviewRatingRow}>
                      <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
                      <Text style={[styles.reviewRatingText, { color: theme.colors.onSurfaceVariant }]}>{r.rating.toFixed(0)}</Text>
                    </View>
                  </View>
                  <Text style={[styles.reviewText, { color: theme.colors.onSurface }]}>{r.text}</Text>
                  <Text style={[styles.reviewDate, { color: theme.colors.onSurfaceVariant }]}>{r.date}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.noReviews, { color: theme.colors.onSurfaceVariant }]}>No reviews yet. Tap "Add a review" to share your experience.</Text>
          )}
          {hasMoreReviews && (
            <TouchableOpacity onPress={() => setSeeAllReviewsVisible(true)} style={styles.seeAllReviewsInline}>
              <Text style={[styles.seeAllReviewsInlineText, { color: theme.colors.primary }]}>See all {reviews.length} reviews</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          )}

          {/* CTA: Select this venue for your date – custom primary button */}
          <View style={styles.ctaWrap}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSelectProvider}
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={styles.primaryButtonText}>Select this venue for your date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <SeeAllReviewsModal
        visible={seeAllReviewsVisible}
        onDismiss={() => setSeeAllReviewsVisible(false)}
        reviews={reviews}
      />

      <AddReviewModal
        visible={addReviewModalVisible}
        onDismiss={closeAddReviewModal}
        onSubmit={handleSubmitReview}
        submitting={submitting}
      />

      <ImageViewerModal
        visible={galleryViewerVisible}
        images={allImages}
        initialIndex={galleryInitialIndex}
        onClose={() => setGalleryViewerVisible(false)}
      />
    </View>
  );
}

function SectionTitle({ children, theme }: { children: string; theme: any }) {
  return (
    <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  mainImageWrap: {
    position: 'relative',
    width: SCREEN_WIDTH,
  },
  mainImage: {
    width: SCREEN_WIDTH,
    height: 240,
    backgroundColor: '#e0e0e0',
  },
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
  galleryStrip: {
    flexDirection: 'row',
    gap: GALLERY_GAP,
    paddingTop: 14,
    paddingBottom: 8,
  },
  galleryItemWrap: { borderRadius: 10, overflow: 'hidden' },
  galleryItem: {
    width: GALLERY_ITEM_SIZE,
    height: GALLERY_ITEM_SIZE,
    backgroundColor: '#eee',
    borderRadius: 10,
  },
  galleryHint: { fontSize: 12, marginBottom: 4 },
  content: { paddingTop: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  name: { fontSize: 22, fontWeight: '800', flex: 1 },
  priceChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  priceText: { fontSize: 13, fontWeight: '800' },
  categoryCity: { fontSize: 14, marginTop: 4 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 8,
  },
  bodyText: { fontSize: 15, lineHeight: 22 },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  addressText: { fontSize: 15, flex: 1 },
  menuCard: {
    padding: 14,
    borderRadius: 12,
  },
  menuItem: {
    fontSize: 15,
    paddingVertical: 4,
  },
  voucherCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  voucherBody: { flex: 1 },
  voucherTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  voucherDesc: { fontSize: 14, lineHeight: 20 },
  // Reviews
  reviewsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  seeAllReviewsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 8,
  },
  seeAllReviewsInlineText: { fontSize: 14, fontWeight: '700' },
  addReviewBtn: { borderRadius: 20 },
  reviewList: { gap: 12 },
  reviewCard: {
    padding: 14,
    borderRadius: 12,
  },
  reviewCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  reviewReviewerLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  reviewUserName: { fontSize: 15, fontWeight: '700' },
  reviewRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewRatingText: { fontSize: 13, fontWeight: '700' },
  reviewText: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  reviewDate: { fontSize: 12 },
  noReviews: { fontSize: 14, fontStyle: 'italic', marginBottom: 8 },
  ctaWrap: { marginTop: 28, marginBottom: 16 },
});
