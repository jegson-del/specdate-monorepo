import { api } from './api';

export type ChatUser = {
  id: number;
  name: string;
  username?: string | null;
  avatar?: string | null;
};

export type ChatMedia = {
  id: number;
  user_id?: number | null;
  file_path?: string | null;
  url: string;
  type?: string | null;
  mime_type?: string | null;
  size?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ChatThread = {
  id: number;
  type?: 'match' | 'provider' | string;
  spec_date_id?: number | null;
  spec_id?: number | null;
  customer_id?: number | null;
  provider_id?: number | null;
  date_code?: string | null;
  spec?: {
    id: number;
    title: string;
    location_city?: string | null;
  } | null;
  other_user?: ChatUser | null;
  last_message?: {
    id: number;
    body?: string | null;
    sender_id: number;
    created_at: string;
  } | null;
  last_message_at?: string | null;
  unread_count: number;
  created_at: string;
};

export type PaginatedChatThreads = {
  data: ChatThread[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
};

export type ChatMessage = {
  id: number;
  chat_thread_id: number;
  sender_id: number;
  body?: string | null;
  media?: ChatMedia | null;
  read_at?: string | null;
  created_at: string;
  sender?: ChatUser | null;
  archived?: boolean;
};

export type ChatThreadPagination = {
  per_page: number;
  has_more: boolean;
  next_before_id?: number | null;
};

export type ChatArchive = {
  id: number;
  chat_thread_id: number;
  from_message_id: number;
  to_message_id: number;
  from_sent_at: string;
  to_sent_at: string;
  message_count: number;
  status: string;
  stored_at?: string | null;
};

export const ChatService = {
  async getThreads(params?: { page?: number; per_page?: number }) {
    const response = await api.get('/chats', { params });
    return response.data as { success: boolean; data: PaginatedChatThreads; message: string };
  },

  async getThread(threadId: number | string, params?: { before_id?: number; per_page?: number }) {
    const response = await api.get(`/chats/${threadId}`, { params });
    return response.data as {
      success: boolean;
      data: { thread: ChatThread; messages: ChatMessage[]; pagination: ChatThreadPagination };
      message: string;
    };
  },

  async getArchives(threadId: number | string) {
    const response = await api.get(`/chats/${threadId}/archives`);
    return response.data as { success: boolean; data: ChatArchive[]; message: string };
  },

  async getArchive(threadId: number | string, archiveId: number | string) {
    const response = await api.get(`/chats/${threadId}/archives/${archiveId}`);
    return response.data as {
      success: boolean;
      data: { archive: ChatArchive; messages: ChatMessage[] };
      message: string;
    };
  },

  async openProviderThread(providerId: number | string) {
    const response = await api.post(`/providers/${providerId}/chat`);
    return response.data as { success: boolean; data: ChatThread; message: string };
  },

  async sendMessage(threadId: number | string, body: string, mediaId?: number) {
    const payload: { body?: string; media_id?: number } = {};
    if (body.trim()) payload.body = body.trim();
    if (mediaId) payload.media_id = mediaId;
    const response = await api.post(`/chats/${threadId}/messages`, payload);
    return response.data as { success: boolean; data: ChatMessage; message: string };
  },

  async markRead(threadId: number | string) {
    const response = await api.post(`/chats/${threadId}/read`);
    return response.data;
  },
};
