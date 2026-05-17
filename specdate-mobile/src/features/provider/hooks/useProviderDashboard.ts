import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../../services/api';
import { normalizeCurrency } from '../../../utils/currency';
import type {
  ProviderBooking,
  ProviderDashboardCounts,
  ProviderDashboardForm,
  ProviderDashboardProfile,
} from '../types';

const EMPTY_COUNTS: ProviderDashboardCounts = {
  unread_notifications: 0,
  unread_messages: 0,
  pending_bookings: 0,
  confirmed_bookings: 0,
  unconfirmed_bookings: 0,
};

const EMPTY_FORM: ProviderDashboardForm = {
  companyName: '',
  description: '',
  website: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  currency: 'USD',
  discountPercentage: '10',
  minimumSpend: '',
  minimumSpendEnabled: false,
  bookingRequired: false,
  idRequired: false,
};

function formFromProfile(profile?: ProviderDashboardProfile | null): ProviderDashboardForm {
  if (!profile) {
    return EMPTY_FORM;
  }

  const minimumSpend = profile.minimum_spend != null
    ? String(Math.round(Number(profile.minimum_spend)))
    : '';

  return {
    companyName: profile.company_name || '',
    description: profile.description || '',
    website: profile.website || '',
    phone: profile.phone || '',
    address: profile.address || '',
    city: profile.city || '',
    country: profile.country || '',
    currency: normalizeCurrency(profile.currency, profile.country),
    discountPercentage: String(profile.discount_percentage ?? 10),
    minimumSpend,
    minimumSpendEnabled: profile.minimum_spend != null && Number(profile.minimum_spend) > 0,
    bookingRequired: Boolean(profile.booking_required),
    idRequired: Boolean(profile.id_required),
  };
}

export function useProviderDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProviderDashboardProfile | null>(null);
  const [gallery, setGallery] = useState<any[]>([]);
  const [counts, setCounts] = useState<ProviderDashboardCounts>(EMPTY_COUNTS);
  const [upcomingBookings, setUpcomingBookings] = useState<ProviderBooking[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<ProviderDashboardForm>(EMPTY_FORM);

  const updateForm = useCallback(<K extends keyof ProviderDashboardForm>(
    key: K,
    value: ProviderDashboardForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get('/provider/dashboard');
      const data = response.data as any;

      setProfile(data.profile);
      setGallery(data.gallery || []);
      setCounts(data.counts || EMPTY_COUNTS);
      setUpcomingBookings(data.upcoming_bookings || []);

      if (data.profile) {
        setForm(formFromProfile(data.profile));
      }
    } catch {
      Alert.alert('Error', 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchDashboard();
  }, [fetchDashboard]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, [fetchDashboard]);

  const saveSettings = useCallback(async () => {
    try {
      setLoading(true);
      await api.post('/provider/settings', {
        company_name: form.companyName,
        description: form.description,
        website: form.website,
        phone: form.phone,
        address: form.address,
        city: form.city,
        country: form.country,
        currency: form.currency,
        discount_percentage: parseInt(form.discountPercentage, 10) || 10,
        minimum_spend: form.minimumSpendEnabled && form.minimumSpend.trim()
          ? Number(form.minimumSpend)
          : null,
        booking_required: form.bookingRequired,
        id_required: form.idRequired,
      });
      setEditMode(false);
      Alert.alert('Success', 'Settings updated.');
      void fetchDashboard();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update settings.');
    } finally {
      setLoading(false);
    }
  }, [fetchDashboard, form]);

  return {
    loading,
    setLoading,
    refreshing,
    profile,
    gallery,
    counts,
    upcomingBookings,
    editMode,
    setEditMode,
    form,
    updateForm,
    fetchDashboard,
    onRefresh,
    saveSettings,
  };
}
