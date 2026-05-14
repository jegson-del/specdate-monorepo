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

export type ModerationStatus = 'active' | 'warned' | 'suspended' | 'permanently_banned' | string;

export type ModerationStatusPayload = {
  user: {
    id: number;
    moderation_status: ModerationStatus;
    strike_count: number;
    risk_score?: number;
    last_violation_at?: string | null;
    is_paused?: boolean;
    suspended_until?: string | null;
    banned_at?: string | null;
    ban_reason?: string | null;
  };
  active_strikes: Array<{
    id: number;
    case_id?: number | null;
    strike_number: number;
    category: string;
    severity: string;
    reason: string;
    active: boolean;
    expires_at?: string | null;
    created_at?: string | null;
  }>;
  active_appeals: Array<{
    id: number;
    case_id?: number | null;
    action_id?: number | null;
    status: string;
    appeal_text: string;
    decision_note?: string | null;
    submitted_at?: string | null;
    reviewed_at?: string | null;
  }>;
  appealable_actions: Array<{
    id: number;
    case_id?: number | null;
    action: string;
    reason?: string | null;
    created_at?: string | null;
  }>;
};

export async function getModerationStatus() {
  const response = await api.get('/me/moderation');
  return response.data as { success: boolean; data: ModerationStatusPayload; message: string };
}

export async function submitModerationAppeal(input: { case_id?: number; action_id?: number; appeal_text: string }) {
  const response = await api.post('/moderation/appeals', input);
  return response.data;
}

export const ModerationService = {
  reportContent,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getModerationStatus,
  submitModerationAppeal,
};
