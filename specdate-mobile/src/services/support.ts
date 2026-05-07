import { api } from './api';

export type SupportCategory =
  | 'safety'
  | 'account'
  | 'payments'
  | 'moderation'
  | 'privacy'
  | 'technical'
  | 'other';

export type SupportTicketStatus = 'open' | 'pending_admin' | 'pending_user' | 'resolved' | 'closed';

export type SupportTicket = {
  id: number;
  user_id: number;
  category: SupportCategory;
  subject: string;
  status: SupportTicketStatus;
  last_message_at?: string | null;
  resolved_at?: string | null;
  unread_count: number;
  created_at: string;
  user?: {
    id: number;
    name: string;
    username?: string | null;
  } | null;
};

export type SupportMessage = {
  id: number;
  support_ticket_id: number;
  sender_id?: number | null;
  sender_role: 'user' | 'admin' | 'system';
  body: string;
  read_at?: string | null;
  created_at: string;
  sender?: {
    id: number;
    name: string;
    username?: string | null;
  } | null;
};

export type PaginatedSupportTickets = {
  data: SupportTicket[];
  current_page: number;
  last_page: number;
  total: number;
};

export const SUPPORT_CATEGORIES: { value: SupportCategory; label: string; helper: string }[] = [
  { value: 'safety', label: 'Safety concern', helper: 'Harassment, threats, scams, or urgent safety issues' },
  { value: 'account', label: 'Account access', helper: 'Login, pause, profile, or account changes' },
  { value: 'payments', label: 'Payments/Credits', helper: 'Credits, charges, refunds, or provider booking issues' },
  { value: 'moderation', label: 'Report follow-up', helper: 'Questions about reports, blocks, or moderation actions' },
  { value: 'privacy', label: 'Privacy request', helper: 'Data, deletion, privacy rights, or policy questions' },
  { value: 'technical', label: 'Technical issue', helper: 'Bugs, notifications, media upload, or app problems' },
  { value: 'other', label: 'Other', helper: 'Anything else the support team should review' },
];

export const SupportService = {
  async getTickets() {
    const response = await api.get('/support/tickets');
    return response.data as { success: boolean; data: PaginatedSupportTickets; message: string };
  },

  async createTicket(input: { category: SupportCategory; subject: string; message: string }) {
    const response = await api.post('/support/tickets', input);
    return response.data as { success: boolean; data: SupportTicket; message: string };
  },

  async getTicket(ticketId: number | string) {
    const response = await api.get(`/support/tickets/${ticketId}`);
    return response.data as {
      success: boolean;
      data: { ticket: SupportTicket; messages: SupportMessage[] };
      message: string;
    };
  },

  async sendMessage(ticketId: number | string, body: string) {
    const response = await api.post(`/support/tickets/${ticketId}/messages`, { body });
    return response.data as { success: boolean; data: SupportMessage; message: string };
  },

  async markRead(ticketId: number | string) {
    const response = await api.post(`/support/tickets/${ticketId}/read`);
    return response.data;
  },
};
