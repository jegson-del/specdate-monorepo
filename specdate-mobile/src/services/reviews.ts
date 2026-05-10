import { api } from './api';

export type ReviewUser = {
  id: number;
  name: string;
  username?: string | null;
};

export type ReviewContext = {
  voucher: {
    id: number;
    voucher_code: string;
    discount_percentage: number;
    total_spent?: number | null;
    redeemed_at?: string | null;
    date_code?: string | null;
    spec?: {
      id: number;
      title: string;
      location_city?: string | null;
    } | null;
  };
  provider: {
    id: number;
    name: string;
    city?: string | null;
    category?: string | null;
  };
  partner?: ReviewUser | null;
  reviews: {
    provider?: { id: number; rating: number; comment?: string | null } | null;
    partner?: { id: number; rating: number; comment?: string | null } | null;
    dismissed_at?: string | null;
    is_complete: boolean;
  };
};

export type ProviderReviewInput = {
  rating: number;
  comment?: string;
};

export type PartnerReviewInput = {
  rating: number;
  chemistry_rating?: number | null;
  safety_rating?: number | null;
  would_meet_again?: boolean | null;
  comment?: string;
};

export const ReviewService = {
  async getPendingPrompts() {
    const response = await api.get('/review-prompts');
    return response.data as { success: boolean; data: ReviewContext[]; message: string };
  },

  async getContext(voucherId: number | string) {
    const response = await api.get(`/date-vouchers/${voucherId}/review-context`);
    return response.data as { success: boolean; data: ReviewContext; message: string };
  },

  async submitProviderReview(voucherId: number | string, input: ProviderReviewInput) {
    const response = await api.post(`/date-vouchers/${voucherId}/provider-review`, {
      rating: input.rating,
      comment: input.comment?.trim() || null,
    });
    return response.data;
  },

  async submitPartnerReview(voucherId: number | string, input: PartnerReviewInput) {
    const response = await api.post(`/date-vouchers/${voucherId}/partner-review`, {
      rating: input.rating,
      chemistry_rating: input.chemistry_rating ?? null,
      safety_rating: input.safety_rating ?? null,
      would_meet_again: input.would_meet_again ?? null,
      comment: input.comment?.trim() || null,
    });
    return response.data;
  },

  async dismissPrompt(voucherId: number | string) {
    const response = await api.post(`/date-vouchers/${voucherId}/review-dismiss`);
    return response.data;
  },
};
