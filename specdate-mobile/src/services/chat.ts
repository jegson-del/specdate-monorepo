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
  spec_date_id: number;
  spec_id: number;
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

export type ChatMessage = {
  id: number;
  chat_thread_id: number;
  sender_id: number;
  body?: string | null;
  media?: ChatMedia | null;
  read_at?: string | null;
  created_at: string;
  sender?: ChatUser | null;
};

export const ChatService = {
  async getThreads() {
    const response = await api.get('/chats');
    return response.data as { success: boolean; data: ChatThread[]; message: string };
  },

  async getThread(threadId: number | string) {
    const response = await api.get(`/chats/${threadId}`);
    return response.data as {
      success: boolean;
      data: { thread: ChatThread; messages: ChatMessage[] };
      message: string;
    };
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
