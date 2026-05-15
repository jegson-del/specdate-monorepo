import { api } from './api';

export type UserFilterOption = {
    name: string;
    code?: string | null;
    count: number;
};

export type UserFilterOptionsResponse = {
    countries: UserFilterOption[];
    cities: UserFilterOption[];
};

export const UserService = {
    /**
     * Get all users with optional filters (pagination included in response).
     */
    async getAll(params: { page?: number; per_page?: number; query?: string; sex?: string; city?: string; country?: string }) {
        const response = await api.get('/users', { params });
        return response.data;
    },

    async getFilterOptions(params: { query?: string; sex?: string; country?: string }): Promise<UserFilterOptionsResponse> {
        const response = await api.get('/users/filter-options', { params });
        return ((response.data as any)?.data ?? response.data) as UserFilterOptionsResponse;
    },

    /**
     * Get a single user's public profile.
     */
    async getOne(id: string) {
        const response = await api.get(`/users/${id}`);
        return response.data;
    },
};
