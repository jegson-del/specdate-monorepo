import { api } from './api';

export type ProviderCategoryItem = {
  id: number;
  name: string;
  slug?: string | null;
};

export type ProviderGalleryItem = {
  id: number;
  url: string;
};

export type ProviderMarketplaceItem = {
  id: number;
  user_id: number;
  name: string;
  category: string;
  categories: ProviderCategoryItem[];
  city?: string | null;
  country?: string | null;
  address?: string | null;
  description?: string | null;
  website?: string | null;
  phone?: string | null;
  imageUrl?: string | null;
  gallery?: ProviderGalleryItem[];
  discountPercentage: number;
  minimumSpend?: number | null;
  bookingRequired: boolean;
  idRequired: boolean;
  isVerified: boolean;
  rating?: number | null;
  reviewsCount: number;
  reviews?: { id: string; userName: string; rating: number; text: string; date: string }[];
  created_at?: string | null;
};

export type ProviderReviewItem = { id: string; userName: string; rating: number; text: string; date: string };

export type PaginatedResponse<T> = {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
};

export const ProviderService = {
  async getProviders(params?: { q?: string; category?: string; service?: string; country?: string; city?: string; page?: number; per_page?: number }) {
    const response = await api.get('/providers', { params });
    return response.data as { message: string; data: PaginatedResponse<ProviderMarketplaceItem> };
  },

  async getProvider(providerId: number | string) {
    const response = await api.get(`/providers/${providerId}`);
    return response.data as { message: string; data: ProviderMarketplaceItem };
  },

  async getProviderReviews(providerId: number | string, params?: { page?: number; per_page?: number }) {
    const response = await api.get(`/providers/${providerId}/reviews`, { params });
    return response.data as { message: string; data: PaginatedResponse<ProviderReviewItem> };
  },
};
