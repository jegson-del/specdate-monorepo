import { api } from './api';

export type ReportTargetType =
  | 'user'
  | 'message'
  | 'media'
  | 'profile'
  | 'provider_profile'
  | 'provider_review'
  | 'date_partner_review'
  | 'spec'
  | 'round_answer';

export async function reportContent(input: {
  target_type: ReportTargetType;
  target_id: number;
  reason: string;
  details?: string;
}) {
  const response = await api.post('/reports', input);
  return response.data;
}

export async function blockUser(userId: number, reason?: string) {
  const response = await api.post('/blocks', { user_id: userId, reason });
  return response.data;
}

export async function unblockUser(userId: number) {
  const response = await api.delete(`/blocks/${userId}`);
  return response.data;
}

export async function getBlockedUsers() {
  const response = await api.get('/blocks');
  return response.data as { success: boolean; data: { blocked_user_ids: number[] }; message: string };
}

export const ModerationService = {
  reportContent,
  blockUser,
  unblockUser,
  getBlockedUsers,
};
