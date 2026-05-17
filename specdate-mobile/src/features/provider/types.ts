import type { ReviewItem } from '../providers/components';

export type ProviderDashboardCounts = {
  unread_notifications: number;
  unread_messages: number;
  pending_bookings: number;
  confirmed_bookings: number;
  unconfirmed_bookings: number;
};

export type ProviderBooking = {
  id: number | string;
  owner_name: string;
  winner_name: string;
  date_code?: string;
  requested_at?: string;
  status?: string;
};

export type ProviderGalleryImage = {
  id?: number;
  url: string;
  kind: 'cover' | 'gallery';
};

export type ProviderDashboardProfile = {
  id?: number | string;
  image?: string;
  company_name?: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  currency?: string;
  discount_percentage?: number | string;
  minimum_spend?: number | string | null;
  booking_required?: boolean | number;
  id_required?: boolean | number;
  rating?: number | string | null;
  reviews?: ReviewItem[];
};

export type ProviderDashboardForm = {
  companyName: string;
  description: string;
  website: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  discountPercentage: string;
  minimumSpend: string;
  minimumSpendEnabled: boolean;
  bookingRequired: boolean;
  idRequired: boolean;
};
