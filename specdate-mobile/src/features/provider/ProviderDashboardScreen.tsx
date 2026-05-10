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
import { Text, TextInput, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../services/api';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Dropdown } from 'react-native-paper-dropdown';
import { ImageViewerModal } from '../profile/components';
import type { ReviewItem } from '../providers/components';
import { DEFAULT_MOCK_REVIEWS } from '../providers/mockReviews';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_ITEM_SIZE = 72;
const GALLERY_GAP = 8;
const DASHBOARD_CARD_GAP = 8;
const DASHBOARD_CARD_WIDTH = Math.floor((SCREEN_WIDTH - 40 - DASHBOARD_CARD_GAP * 2) / 3);

type ProviderBooking = {
  id: number | string;
  owner_name: string;
  winner_name: string;
  date_code?: string;
  requested_at?: string;
  status?: string;
};

function SectionTitle({ children, theme }: { children: string; theme: any }) {
  return (
    <Text style={[sectionStyles.title, { color: theme.colors.onSurface }]}>{children}</Text>
  );
}

function DashboardCard({
  title,
  value,
  helper,
  icon,
  color,
  onPress,
  theme,
}: {
  title: string;
  value: string | number;
  helper?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  onPress?: () => void;
  theme: any;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.dashboardCard, { backgroundColor: theme.colors.surface }]}
    >
      <View style={[styles.dashboardIcon, { backgroundColor: `${color}18` }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.dashboardValue, { color: theme.colors.onSurface }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.dashboardTitle, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
        {title}
      </Text>
      {helper ? (
        <Text style={[styles.dashboardHelper, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
          {helper}
        </Text>
      ) : null}
    </TouchableOpacity>
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
  const [gallery, setGallery] = useState<any[]>([]);

  const [discountPercentage, setDiscountPercentage] = useState('10');
  const [editMode, setEditMode] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [minimumSpend, setMinimumSpend] = useState('');
  const [minimumSpendEnabled, setMinimumSpendEnabled] = useState(false);
  const [bookingRequired, setBookingRequired] = useState(false);
  const [idRequired, setIdRequired] = useState(false);
  const [counts, setCounts] = useState({
    unread_notifications: 0,
    unread_messages: 0,
    pending_bookings: 0,
    confirmed_bookings: 0,
    unconfirmed_bookings: 0,
  });
  const [upcomingBookings, setUpcomingBookings] = useState<ProviderBooking[]>([]);

  const [galleryViewerVisible, setGalleryViewerVisible] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  // Reviews: from dashboard when API returns them; otherwise same shared dummy reviews as detail page
  const reviews = (profile?.reviews as ReviewItem[] | undefined) ?? DEFAULT_MOCK_REVIEWS;
  const ratingDisplay = profile?.rating != null ? Number(profile.rating).toFixed(1) : null;

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get('/provider/dashboard');
      const data = response.data as any;
      setProfile(data.profile);
      setGallery(data.gallery || []);
      setCounts(data.counts || {
        unread_notifications: 0,
        unread_messages: 0,
        pending_bookings: 0,
        confirmed_bookings: 0,
        unconfirmed_bookings: 0,
      });
      setUpcomingBookings(data.upcoming_bookings || []);
      if (data.profile) {
        setCompanyName(data.profile.company_name || '');
        setDescription(data.profile.description || '');
        setWebsite(data.profile.website || '');
        setPhone(data.profile.phone || '');
        setAddress(data.profile.address || '');
        setCity(data.profile.city || '');
        setCountry(data.profile.country || '');
        setDiscountPercentage(String(data.profile.discount_percentage ?? 10));
        setMinimumSpend(data.profile.minimum_spend != null ? String(Math.round(Number(data.profile.minimum_spend))) : '');
        setMinimumSpendEnabled(data.profile.minimum_spend != null && Number(data.profile.minimum_spend) > 0);
        setBookingRequired(Boolean(data.profile.booking_required));
        setIdRequired(Boolean(data.profile.id_required));
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
        discount_percentage: parseInt(discountPercentage, 10) || 10,
        minimum_spend: minimumSpendEnabled && minimumSpend.trim() ? Number(minimumSpend) : null,
        booking_required: bookingRequired,
        id_required: idRequired,
      });
      setEditMode(false);
      Alert.alert('Success', 'Settings updated.');
      fetchDashboard();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update settings.');
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

  const formatMinimumSpend = () => {
    if (!minimumSpendEnabled) return 'No minimum';
    const amount = Number(minimumSpend || profile?.minimum_spend || 0);
    if (!amount) return 'No minimum spend';
    return `Minimum spend ₦${amount.toLocaleString()}`;
  };

  const formatMinimumSpendShort = () => {
    if (!minimumSpendEnabled) return 'No min';
    const amount = Number(minimumSpend || profile?.minimum_spend || 0);
    return amount ? `Min ₦${amount.toLocaleString()}` : 'No min';
  };

  const startEditing = () => {
    setEditMode(true);
  };

  if (loading && !refreshing && !profile) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12, backgroundColor: theme.colors.primary }]}>
        <View style={styles.topBarTitleWrap}>
      
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {companyName || 'Dashboard'}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.headerIconButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <MaterialCommunityIcons name="bell-outline" size={22} color="#fff" />
          {counts.unread_notifications > 0 ? <Text style={styles.headerBadge}>{counts.unread_notifications}</Text> : null}
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.headerIconButton}
          onPress={() => navigation.navigate('Messages')}
        >
          <MaterialCommunityIcons name="message-text-outline" size={22} color="#fff" />
          {counts.unread_messages > 0 ? <Text style={styles.headerBadge}>{counts.unread_messages}</Text> : null}
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + (editMode ? 126 : 32) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
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
          <View style={styles.dashboardGrid}>
            <DashboardCard
              title="Bookings"
              value={counts.confirmed_bookings}
              helper="Confirmed"
              icon="calendar-check"
              color={theme.colors.primary}
              theme={theme}
              onPress={() => navigation.navigate('ProviderBookings', { initialFilter: 'confirmed' })}
            />
            <DashboardCard
              title="Upcoming"
              value={counts.unconfirmed_bookings}
              helper="Pending"
              icon="calendar-clock"
              color="#0891B2"
              theme={theme}
              onPress={() => navigation.navigate('ProviderBookings', { initialFilter: 'pending' })}
            />
            <DashboardCard
              title="Discount"
              value={`${discountPercentage}%`}
              helper={formatMinimumSpendShort()}
              icon="ticket-percent"
              color="#16A34A"
              theme={theme}
            />
            <DashboardCard
              title="Reviews"
              value={reviews.length}
              helper="View all"
              icon="star-outline"
              color="#F59E0B"
              theme={theme}
              onPress={() => navigation.navigate('ProviderReviews', { reviews })}
            />
            <DashboardCard
              title="Scan"
              value="QR"
              helper="Voucher"
              icon="qrcode-scan"
              color="#DC2626"
              theme={theme}
              onPress={() => navigation.navigate('QRScanner')}
            />
            <DashboardCard
              title="Settings"
              value="Tools"
              helper={editMode ? 'Editing' : ' Logout'}
              icon="cog-outline"
              color="#64748B"
              theme={theme}
              onPress={() => navigation.navigate('ProviderSettings')}
            />
          </View>

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
          <View style={styles.inlineSectionHeader}>
            <Text style={[sectionStyles.title, { color: theme.colors.onSurface }]}>About</Text>
            {!editMode ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={startEditing}
                style={[styles.inlineEditButton, { backgroundColor: theme.colors.primary }]}
                accessibilityLabel="Edit provider profile"
              >
                <MaterialCommunityIcons name="pencil" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
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

          <TouchableOpacity activeOpacity={0.8} onPress={startEditing} disabled={editMode}>
            <SectionTitle theme={theme}>Address</SectionTitle>
          </TouchableOpacity>
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

          <TouchableOpacity activeOpacity={0.8} onPress={startEditing} disabled={editMode}>
            <SectionTitle theme={theme}>Agreed discount</SectionTitle>
          </TouchableOpacity>
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
                    Applied to date vouchers created for your venue.
                  </Text>
                </>
              )}
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.8} onPress={startEditing} disabled={editMode}>
            <SectionTitle theme={theme}>Booking terms</SectionTitle>
          </TouchableOpacity>
          <View style={[styles.bookingTermsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            {editMode ? (
              <>
                {minimumSpendEnabled ? (
                <TextInput
                  mode="outlined"
                  label="Minimum spend"
                  value={minimumSpend}
                  onChangeText={(value) => setMinimumSpend(value.replace(/[^0-9.]/g, ''))}
                  keyboardType="numeric"
                  left={<TextInput.Affix text="₦" />}
                  style={[styles.input, { backgroundColor: theme.colors.surface }]}
                  dense
                />
                ) : null}
                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={[styles.switchTitle, { color: theme.colors.onSurface }]}>Minimum spend</Text>
                    <Text style={[styles.switchText, { color: theme.colors.onSurfaceVariant }]}>
                      Show whether this venue requires a minimum bill.
                    </Text>
                  </View>
                  <View style={styles.yesNoToggle}>
                    <TouchableOpacity
                      style={[styles.yesNoOption, minimumSpendEnabled && { backgroundColor: theme.colors.primary }]}
                      onPress={() => setMinimumSpendEnabled(true)}
                    >
                      <Text style={[styles.yesNoText, { color: minimumSpendEnabled ? '#fff' : theme.colors.onSurfaceVariant }]}>Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.yesNoOption, !minimumSpendEnabled && { backgroundColor: theme.colors.primary }]}
                      onPress={() => setMinimumSpendEnabled(false)}
                    >
                      <Text style={[styles.yesNoText, { color: !minimumSpendEnabled ? '#fff' : theme.colors.onSurfaceVariant }]}>No</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={[styles.switchTitle, { color: theme.colors.onSurface }]}>Booking required</Text>
                    <Text style={[styles.switchText, { color: theme.colors.onSurfaceVariant }]}>
                      Daters will see if they must book before attending.
                    </Text>
                  </View>
                  <View style={styles.yesNoToggle}>
                    <TouchableOpacity
                      style={[styles.yesNoOption, bookingRequired && { backgroundColor: theme.colors.primary }]}
                      onPress={() => setBookingRequired(true)}
                    >
                      <Text style={[styles.yesNoText, { color: bookingRequired ? '#fff' : theme.colors.onSurfaceVariant }]}>Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.yesNoOption, !bookingRequired && { backgroundColor: theme.colors.primary }]}
                      onPress={() => setBookingRequired(false)}
                    >
                      <Text style={[styles.yesNoText, { color: !bookingRequired ? '#fff' : theme.colors.onSurfaceVariant }]}>No</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={[styles.switchTitle, { color: theme.colors.onSurface }]}>ID required</Text>
                    <Text style={[styles.switchText, { color: theme.colors.onSurfaceVariant }]}>
                      Daters will see if they need valid ID for verification.
                    </Text>
                  </View>
                  <View style={styles.yesNoToggle}>
                    <TouchableOpacity
                      style={[styles.yesNoOption, idRequired && { backgroundColor: theme.colors.primary }]}
                      onPress={() => setIdRequired(true)}
                    >
                      <Text style={[styles.yesNoText, { color: idRequired ? '#fff' : theme.colors.onSurfaceVariant }]}>Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.yesNoOption, !idRequired && { backgroundColor: theme.colors.primary }]}
                      onPress={() => setIdRequired(false)}
                    >
                      <Text style={[styles.yesNoText, { color: !idRequired ? '#fff' : theme.colors.onSurfaceVariant }]}>No</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.termsRow}>
                  <View style={styles.switchCopy}>
                    <Text style={[styles.switchTitle, { color: theme.colors.onSurface }]}>Minimum spend</Text>
                    <Text style={[styles.switchText, { color: theme.colors.onSurfaceVariant }]}>{formatMinimumSpend()}</Text>
                  </View>
                  <View style={styles.yesNoToggle}>
                    <View style={[styles.yesNoOption, minimumSpendEnabled && { backgroundColor: theme.colors.primary }]}>
                      <Text style={[styles.yesNoText, { color: minimumSpendEnabled ? '#fff' : theme.colors.onSurfaceVariant }]}>Yes</Text>
                    </View>
                    <View style={[styles.yesNoOption, !minimumSpendEnabled && { backgroundColor: theme.colors.primary }]}>
                      <Text style={[styles.yesNoText, { color: !minimumSpendEnabled ? '#fff' : theme.colors.onSurfaceVariant }]}>No</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={[styles.switchTitle, { color: theme.colors.onSurface }]}>Booking required</Text>
                    <Text style={[styles.switchText, { color: theme.colors.onSurfaceVariant }]}>
                      {bookingRequired ? 'Daters must book before arrival.' : 'Walk-ins are allowed.'}
                    </Text>
                  </View>
                  <View style={styles.yesNoToggle}>
                    <View style={[styles.yesNoOption, bookingRequired && { backgroundColor: theme.colors.primary }]}>
                      <Text style={[styles.yesNoText, { color: bookingRequired ? '#fff' : theme.colors.onSurfaceVariant }]}>Yes</Text>
                    </View>
                    <View style={[styles.yesNoOption, !bookingRequired && { backgroundColor: theme.colors.primary }]}>
                      <Text style={[styles.yesNoText, { color: !bookingRequired ? '#fff' : theme.colors.onSurfaceVariant }]}>No</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={[styles.switchTitle, { color: theme.colors.onSurface }]}>ID required</Text>
                    <Text style={[styles.switchText, { color: theme.colors.onSurfaceVariant }]}>
                      {idRequired ? 'Daters must bring valid ID.' : 'No ID check is required.'}
                    </Text>
                  </View>
                  <View style={styles.yesNoToggle}>
                    <View style={[styles.yesNoOption, idRequired && { backgroundColor: theme.colors.primary }]}>
                      <Text style={[styles.yesNoText, { color: idRequired ? '#fff' : theme.colors.onSurfaceVariant }]}>Yes</Text>
                    </View>
                    <View style={[styles.yesNoOption, !idRequired && { backgroundColor: theme.colors.primary }]}>
                      <Text style={[styles.yesNoText, { color: !idRequired ? '#fff' : theme.colors.onSurfaceVariant }]}>No</Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>

        </View>
      </ScrollView>

      {editMode ? (
        <View style={[styles.saveBar, { paddingBottom: insets.bottom + 12, backgroundColor: theme.colors.surface }]}>
          <Button mode="outlined" onPress={() => setEditMode(false)} style={styles.saveBarButton}>
            Cancel
          </Button>
          <Button mode="contained" onPress={handleSaveSettings} loading={loading} style={styles.saveBarButton}>
            Save changes
          </Button>
        </View>
      ) : null}


      <ImageViewerModal
        visible={galleryViewerVisible}
        images={galleryImages}
        initialIndex={galleryInitialIndex}
        onClose={() => setGalleryViewerVisible(false)}
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
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  topBarTitleWrap: { flex: 1 },
  topBarEyebrow: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    overflow: 'hidden',
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 18,
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
  content: { paddingTop: 16 },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DASHBOARD_CARD_GAP,
    marginBottom: 10,
  },
  dashboardCard: {
    width: DASHBOARD_CARD_WIDTH,
    minHeight: 92,
    borderRadius: 14,
    padding: 10,
    justifyContent: 'space-between',
  },
  dashboardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardValue: { fontSize: 15, fontWeight: '800', marginTop: 8 },
  dashboardTitle: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  dashboardHelper: { fontSize: 10, marginTop: 1 },
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
  inlineSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineEditButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  addressText: { fontSize: 15, flex: 1 },
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
  bookingTermsCard: {
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  termsText: { fontSize: 15, fontWeight: '700', flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchCopy: { flex: 1 },
  switchTitle: { fontSize: 15, fontWeight: '800' },
  switchText: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  yesNoToggle: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 999,
    backgroundColor: '#F3F0FA',
  },
  yesNoOption: {
    minWidth: 42,
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  yesNoText: { fontSize: 12, fontWeight: '800' },
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
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 0 },
  saveBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E7DDFB',
  },
  saveBarButton: { flex: 1 },
});
