import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Linking,
} from 'react-native';
import { OneSignal } from 'react-native-onesignal';
import { Text, TextInput, Button, IconButton, useTheme, Surface, ActivityIndicator, FAB } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../services/api';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Dropdown } from 'react-native-paper-dropdown';
import { ImageViewerModal } from '../profile/components';
import { SeeAllReviewsModal } from '../providers/components';
import type { ReviewItem } from '../providers/components';
import { DEFAULT_MOCK_REVIEWS } from '../providers/mockReviews';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_ITEM_SIZE = 72;
const GALLERY_GAP = 8;

function SectionTitle({ children, theme }: { children: string; theme: any }) {
  return (
    <Text style={[sectionStyles.title, { color: theme.colors.onSurface }]}>{children}</Text>
  );
}

const sectionStyles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '800', marginTop: 20, marginBottom: 8 },
});

export default function ProviderDashboardScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_discounts: 0, used_discounts: 0 });

  const [discountPercentage, setDiscountPercentage] = useState('10');
  const [editMode, setEditMode] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  const [galleryViewerVisible, setGalleryViewerVisible] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [seeAllReviewsVisible, setSeeAllReviewsVisible] = useState(false);

  // Reviews: from dashboard when API returns them; otherwise same shared dummy reviews as detail page
  const reviews = (profile?.reviews as ReviewItem[] | undefined) ?? DEFAULT_MOCK_REVIEWS;
  const REVIEWS_PREVIEW_COUNT = 3;
  const reviewsPreview = reviews.slice(0, REVIEWS_PREVIEW_COUNT);
  const ratingDisplay = profile?.rating != null ? Number(profile.rating).toFixed(1) : null;

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get('/provider/dashboard');
      const data = response.data as any;
      setProfile(data.profile);
      setGallery(data.gallery || []);
      setDiscounts(data.discounts || []);
      setStats(data.stats || { total_discounts: 0, used_discounts: 0 });
      if (data.profile) {
        setCompanyName(data.profile.company_name || '');
        setDescription(data.profile.description || '');
        setWebsite(data.profile.website || '');
        setPhone(data.profile.phone || '');
        setAddress(data.profile.address || '');
        setCity(data.profile.city || '');
        setCountry(data.profile.country || '');
        setDiscountPercentage(String(data.profile.discount_percentage ?? 10));
      }
    } catch {
      Alert.alert('Error', 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchDashboard(); }, [fetchDashboard]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      await api.post('/provider/settings', {
        company_name: companyName,
        description,
        website,
        phone,
        address,
        city,
        country,
        discount_percentage: parseInt(discountPercentage, 10),
      });
      setEditMode(false);
      Alert.alert('Success', 'Settings updated.');
      fetchDashboard();
    } catch {
      Alert.alert('Error', 'Failed to update settings.');
    } finally {
      setLoading(false);
    }
  };

  const uploadMedia = async (asset: any, type: 'avatar' | 'provider_gallery', skipRefresh = false) => {
    try {
      setLoading(true);
      const uri = asset.uri;
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: uri.split('/').pop() || 'image.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);
      formData.append('type', type);

      await api.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (!skipRefresh) fetchDashboard();
      if (!skipRefresh) Alert.alert('Success', 'Image uploaded.');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Upload failed.';
      Alert.alert('Error', msg);
    } finally {
      if (!skipRefresh) setLoading(false);
    }
  };

  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Updated to use MediaTypeOptions
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadMedia(result.assets[0], 'avatar');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Updated to use MediaTypeOptions
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        setLoading(true);
        // Upload sequentially
        for (const asset of result.assets) {
          await uploadMedia(asset, 'provider_gallery', true);
        }
        fetchDashboard();
        setLoading(false);
        Alert.alert('Success', 'Gallery updated.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick images');
      setLoading(false);
    }
  };

  const galleryImages = [
    ...(profile?.image ? [profile.image] : []),
    ...gallery.map((m: any) => m.url),
  ];
  const openGalleryAt = (index: number) => {
    setGalleryInitialIndex(index);
    setGalleryViewerVisible(true);
  };
  const openWebsite = () => {
    const url = website?.trim();
    if (url) {
      Linking.openURL(url.startsWith('http') ? url : `https://${url}`).catch(() =>
        Alert.alert('Error', 'Could not open link.')
      );
    } else {
      Alert.alert('No website', 'Add a website in Edit mode.');
    }
  };

  const discountOptions = [
    { label: '10%', value: '10' },
    { label: '20%', value: '20' },
    { label: '30%', value: '30' },
    { label: '40%', value: '40' },
    { label: '50%', value: '50' },
  ];

  if (loading && !refreshing && !profile) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header bar: title + edit + logout */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Text style={[styles.topBarTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {companyName || 'Provider dashboard'}
          </Text>
          <IconButton
            icon={editMode ? 'check' : 'pencil'}
            size={22}
            onPress={editMode ? handleSaveSettings : () => setEditMode(true)}
            iconColor={theme.colors.primary}
          />
          <IconButton
            icon="logout"
            size={22}
            onPress={() => {
              api.post('/logout').finally(() => {
                OneSignal.logout();
                navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
              });
            }}
            iconColor={theme.colors.onSurfaceVariant}
          />
        </View>

        {/* Hero image (match ProviderDetailScreen) */}
        <View style={styles.mainImageWrap}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => galleryImages.length > 0 && openGalleryAt(0)}
          >
            {profile?.image ? (
              <Image source={{ uri: profile.image }} style={styles.mainImage} />
            ) : (
              <View style={[styles.mainImagePlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
                <TouchableOpacity onPress={editMode ? pickAvatar : undefined}>
                  <MaterialCommunityIcons name="store-plus" size={48} color={theme.colors.onSurfaceVariant} />
                  <Text style={[styles.placeholderLabel, { color: theme.colors.onSurfaceVariant }]}>Add cover photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
          {profile?.image && editMode && (
            <TouchableOpacity style={styles.editPhotoBadge} onPress={pickAvatar}>
              <MaterialCommunityIcons name="camera" size={18} color="#fff" />
            </TouchableOpacity>
          )}
          {/* Rating pill (match ProviderDetailScreen) – on hero image; profile.rating when API returns it */}
          {profile?.image && (
            <View style={[styles.ratingPill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
              <MaterialCommunityIcons name="star" size={16} color="#FCD34D" />
              <Text style={styles.ratingText}>{ratingDisplay ?? '—'}</Text>
            </View>
          )}
          {website?.trim() && !editMode && (
            <TouchableOpacity onPress={openWebsite} style={styles.visitWebsiteOverlay}>
              <MaterialCommunityIcons name="open-in-new" size={18} color="#fff" />
              <Text style={styles.visitWebsiteText}>Visit website</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.content, { paddingHorizontal: 20 }]}>
          {/* Gallery strip (match ProviderDetailScreen) */}
          <SectionTitle theme={theme}>Gallery</SectionTitle>
          {galleryImages.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryStrip}
            >
              {galleryImages.map((uri: string, i: number) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.9}
                  onPress={() => openGalleryAt(i)}
                  style={styles.galleryItemWrap}
                >
                  <Image source={{ uri }} style={styles.galleryItem} />
                </TouchableOpacity>
              ))}
              <View style={styles.galleryItemWrap}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={pickGallery}
                  style={[styles.galleryItem, { backgroundColor: theme.colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' }]}
                >
                  <MaterialCommunityIcons name="plus" size={32} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <TouchableOpacity
              onPress={pickGallery}
              style={[styles.galleryPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}
            >
              <MaterialCommunityIcons name="image-plus" size={32} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.galleryPlaceholderText, { color: theme.colors.onSurfaceVariant }]}>
                {editMode ? 'Tap to add photo' : 'No photos yet'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Company info (About, Address – match ProviderDetailScreen) */}
          {editMode && (
            <>
              <SectionTitle theme={theme}>Company name</SectionTitle>
              <TextInput
                mode="outlined"
                label="Company name"
                value={companyName}
                onChangeText={setCompanyName}
                style={[styles.input, { backgroundColor: theme.colors.surface }]}
                dense
              />
            </>
          )}
          <SectionTitle theme={theme}>About</SectionTitle>
          {editMode ? (
            <TextInput
              mode="outlined"
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              dense
            />
          ) : (
            <Text style={[styles.bodyText, { color: theme.colors.onSurface }]}>
              {description || 'Add a description in Edit mode.'}
            </Text>
          )}

          <SectionTitle theme={theme}>Address</SectionTitle>
          {editMode ? (
            <>
              <TextInput
                mode="outlined"
                label="Address"
                value={address}
                onChangeText={setAddress}
                style={[styles.input, { backgroundColor: theme.colors.surface }]}
                dense
              />
              <View style={styles.rowInputs}>
                <TextInput
                  mode="outlined"
                  label="City"
                  value={city}
                  onChangeText={setCity}
                  style={[styles.input, styles.inputHalf, { backgroundColor: theme.colors.surface }]}
                  dense
                />
                <TextInput
                  mode="outlined"
                  label="Country"
                  value={country}
                  onChangeText={setCountry}
                  style={[styles.input, styles.inputHalf, { backgroundColor: theme.colors.surface }]}
                  dense
                />
              </View>
              <TextInput
                mode="outlined"
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={[styles.input, { backgroundColor: theme.colors.surface }]}
                dense
              />
              <TextInput
                mode="outlined"
                label="Website"
                value={website}
                onChangeText={setWebsite}
                keyboardType="url"
                style={[styles.input, { backgroundColor: theme.colors.surface }]}
                dense
              />
            </>
          ) : (
            <>
              <View style={[styles.addressRow, { backgroundColor: theme.colors.surfaceVariant || theme.colors.surface }]}>
                <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
                <Text style={[styles.addressText, { color: theme.colors.onSurface }]}>
                  {[address, city, country].filter(Boolean).join(', ') || 'Add address in Edit mode.'}
                </Text>
              </View>
              {/* Website row (ProviderProfile.website) – match Address row style */}
              {website?.trim() ? (
                <TouchableOpacity
                  onPress={openWebsite}
                  style={[styles.addressRow, { backgroundColor: theme.colors.surfaceVariant || theme.colors.surface, marginTop: 8 }]}
                >
                  <MaterialCommunityIcons name="open-in-new" size={20} color={theme.colors.primary} />
                  <Text style={[styles.addressText, { color: theme.colors.onSurface }]} numberOfLines={1}>
                    {website.trim()}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              ) : null}
            </>
          )}

          {/* Reviews (match ProviderDetailScreen – view reviews) */}
          <View style={styles.reviewsSectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Reviews</Text>
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
            <Text style={[styles.noReviews, { color: theme.colors.onSurfaceVariant }]}>
              No reviews yet. Reviews from customers will appear here when the API is connected.
            </Text>
          )}
          {reviews.length > 0 && (
            <TouchableOpacity onPress={() => setSeeAllReviewsVisible(true)} style={styles.seeAllReviewsInline}>
              <Text style={[styles.seeAllReviewsInlineText, { color: theme.colors.primary }]}>See all {reviews.length} reviews</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          )}

          {/* QR code section – card that matches voucher style + FAB stays */}
          <SectionTitle theme={theme}>Scan QR code</SectionTitle>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('QRScanner')}
            style={[styles.qrCard, { backgroundColor: theme.colors.primaryContainer || theme.colors.primary + '18', borderColor: theme.colors.primary + '40' }]}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={32} color={theme.colors.primary} />
            <View style={styles.qrCardBody}>
              <Text style={[styles.qrCardTitle, { color: theme.colors.onSurface }]}>Redeem a discount</Text>
              <Text style={[styles.qrCardDesc, { color: theme.colors.onSurfaceVariant }]}>
                Scan a customer's QR code to mark their discount as redeemed.
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.primary} />
          </TouchableOpacity>

          {/* Agreed discount (DateUsher offer style) */}
          <SectionTitle theme={theme}>Agreed discount</SectionTitle>
          <View style={[styles.voucherCard, { backgroundColor: theme.colors.primaryContainer || theme.colors.primary + '18', borderColor: theme.colors.primary + '40' }]}>
            <MaterialCommunityIcons name="ticket-percent" size={28} color={theme.colors.primary} />
            <View style={styles.voucherBody}>
              {editMode ? (
                <Dropdown
                  label="Percentage"
                  mode="outlined"
                  value={discountPercentage}
                  onSelect={(v) => setDiscountPercentage(v || '10')}
                  options={discountOptions}
                />
              ) : (
                <>
                  <Text style={[styles.voucherTitle, { color: theme.colors.onSurface }]}>
                    {discountPercentage}% off for SpecDate users
                  </Text>
                  <Text style={[styles.voucherDesc, { color: theme.colors.onSurfaceVariant }]}>
                    Applied to all discounts generated for your venue.
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Statistics – tappable, lead to lists */}
          <SectionTitle theme={theme}>Statistics</SectionTitle>
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statsTouch}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ProviderDiscountList', { type: 'generated' })}
            >
              <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <MaterialCommunityIcons name="ticket-outline" size={28} color={theme.colors.primary} />
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>{stats.total_discounts}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Generated</Text>
                <Text style={[styles.statLink, { color: theme.colors.primary }]}>View list</Text>
              </Surface>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statsTouch}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ProviderDiscountList', { type: 'redeemed' })}
            >
              <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <MaterialCommunityIcons name="ticket-confirmation" size={28} color="#16a34a" />
                <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.used_discounts}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Redeemed</Text>
                <Text style={[styles.statLink, { color: theme.colors.primary }]}>View list</Text>
              </Surface>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Scan QR FAB – unchanged */}
      <FAB
        icon="qrcode-scan"
        label="Scan QR"
        style={[styles.fab, { bottom: insets.bottom + 16, right: 16, backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('QRScanner')}
        color="#fff"
      />

      <ImageViewerModal
        visible={galleryViewerVisible}
        images={galleryImages}
        initialIndex={galleryInitialIndex}
        onClose={() => setGalleryViewerVisible(false)}
      />

      <SeeAllReviewsModal
        visible={seeAllReviewsVisible}
        onDismiss={() => setSeeAllReviewsVisible(false)}
        reviews={reviews}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
  },
  mainImageWrap: { position: 'relative', width: SCREEN_WIDTH },
  mainImage: {
    width: SCREEN_WIDTH,
    height: 220,
    backgroundColor: '#e0e0e0',
  },
  mainImagePlaceholder: {
    width: SCREEN_WIDTH,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderLabel: { fontSize: 14, fontWeight: '600' },
  editPhotoBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  visitWebsiteText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  content: { paddingTop: 8 },
  galleryStrip: {
    flexDirection: 'row',
    gap: GALLERY_GAP,
    paddingBottom: 8,
  },
  galleryItemWrap: { borderRadius: 10, overflow: 'hidden' },
  galleryItem: {
    width: GALLERY_ITEM_SIZE,
    height: GALLERY_ITEM_SIZE,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  galleryPlaceholder: {
    width: GALLERY_ITEM_SIZE,
    height: GALLERY_ITEM_SIZE,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  galleryPlaceholderText: { fontSize: 11 },
  input: { marginBottom: 8 },
  inputHalf: { flex: 1 },
  rowInputs: { flexDirection: 'row', gap: 10 },
  bodyText: { fontSize: 15, lineHeight: 22 },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  addressText: { fontSize: 15, flex: 1 },
  qrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  qrCardBody: { flex: 1 },
  qrCardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  qrCardDesc: { fontSize: 14, lineHeight: 20 },
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
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statsTouch: { flex: 1 },
  statCard: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    minHeight: 120,
  },
  statValue: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  statLabel: { fontSize: 13, marginTop: 4 },
  statLink: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  // Rating pill (match ProviderDetailScreen)
  ratingPill: {
    position: 'absolute',
    top: 180,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  // Reviews (match ProviderDetailScreen)
  reviewsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 0 },
  seeAllReviewsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 8,
  },
  seeAllReviewsInlineText: { fontSize: 14, fontWeight: '700' },
  reviewList: { gap: 12 },
  reviewCard: { padding: 14, borderRadius: 12 },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewReviewerLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  reviewUserName: { fontSize: 15, fontWeight: '700' },
  reviewRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewRatingText: { fontSize: 13, fontWeight: '700' },
  reviewText: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  reviewDate: { fontSize: 12 },
  noReviews: { fontSize: 14, fontStyle: 'italic', marginBottom: 8 },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
  },
});
