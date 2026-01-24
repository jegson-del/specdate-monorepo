import { api } from './api';

export const ProfileService = {
    update: async (data: any) => {
        return api.put('/profile', data);
    },

    // Future methods: getProfile, uploadPhoto, etc.
};
