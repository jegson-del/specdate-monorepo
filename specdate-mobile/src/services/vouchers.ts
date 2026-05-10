import { api } from './api';
import type { ProviderMarketplaceItem } from './providers';

export type DateVoucherStatus = 'pending_provider' | 'active' | 'rejected' | 'redeemed' | 'cancelled' | 'expired';

export type DateVoucherUser = {
  id: number;
  name: string;
  username?: string | null;
  avatar?: string | null;
};

export type DateVoucherItem = {
  id: number;
  spec_date_id: number;
  provider_profile_id: number;
  owner_id: number;
  winner_user_id: number;
  requested_by_user_id: number;
  voucher_code: string;
  qr_token: string;
  discount_percentage: number;
  minimum_spend?: number | null;
  booking_required: boolean;
  status: DateVoucherStatus;
  expires_at?: string | null;
  redeemed_at?: string | null;
  total_spent?: number | null;
  spend_recorded_at?: string | null;
  created_at?: string | null;
  provider?: Pick<ProviderMarketplaceItem, 'id' | 'user_id' | 'name' | 'category' | 'city' | 'address' | 'phone' | 'imageUrl' | 'discountPercentage' | 'minimumSpend' | 'bookingRequired' | 'idRequired'> | null;
  date?: {
    id: number;
    date_code: string;
    is_owner: boolean;
    spec?: {
      id: number;
      title: string;
      location_city?: string | null;
    } | null;
  } | null;
  owner?: DateVoucherUser | null;
  winner?: DateVoucherUser | null;
};

export type DateVoucherPreview = {
  date: DateVoucherItem['date'];
  provider: DateVoucherItem['provider'];
  voucher_terms: {
    discount_percentage: number;
    minimum_spend?: number | null;
    booking_required: boolean;
    id_required: boolean;
    initial_status: DateVoucherStatus;
  };
};

export type PaginatedDateVouchers = {
  data: DateVoucherItem[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
};

export const VoucherService = {
  async getVouchers(params?: { page?: number; per_page?: number }) {
    const response = await api.get('/date-vouchers', { params });
    return response.data as { success: boolean; data: PaginatedDateVouchers; message: string };
  },

  async getVoucher(voucherId: number | string) {
    const response = await api.get(`/date-vouchers/${voucherId}`);
    return response.data as { success: boolean; data: DateVoucherItem; message: string };
  },

  async preview(dateCode: string, providerProfileId: number | string) {
    const response = await api.post('/date-vouchers/preview', {
      date_code: dateCode.trim().toUpperCase(),
      provider_profile_id: providerProfileId,
    });
    return response.data as { success: boolean; data: DateVoucherPreview; message: string };
  },

  async create(dateCode: string, providerProfileId: number | string) {
    const response = await api.post('/date-vouchers', {
      date_code: dateCode.trim().toUpperCase(),
      provider_profile_id: providerProfileId,
    });
    return response.data as { success: boolean; data: DateVoucherItem; message: string };
  },

  async getProviderBookings(params?: { page?: number; per_page?: number }) {
    const response = await api.get('/provider/bookings', { params });
    return response.data as { success: boolean; data: PaginatedDateVouchers; message: string };
  },

  async approve(voucherId: number | string) {
    const response = await api.post(`/provider/bookings/${voucherId}/approve`);
    return response.data as { success: boolean; data: DateVoucherItem; message: string };
  },

  async reject(voucherId: number | string) {
    const response = await api.post(`/provider/bookings/${voucherId}/reject`);
    return response.data as { success: boolean; data: DateVoucherItem; message: string };
  },
};
