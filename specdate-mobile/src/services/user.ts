import { api } from './api';

export const UserService = {
    /**
     * Get all users with optional filters (pagination included in response).
     */
    async getAll(params: { page?: number; query?: string; sex?: string; city?: string }) {
        const response = await api.get('/users', { params });
        return response.data;
    },

    /**
     * Get a single user's public profile.
     */
    async getOne(id: string) {
        const response = await api.get(`/users/${id}`);
        return response.data;
    },
};
