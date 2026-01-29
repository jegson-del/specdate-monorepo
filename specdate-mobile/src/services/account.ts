import { api } from './api';

/**
 * Account lifecycle: pause, unpause, delete.
 * Consumed by profile/account UI only.
 */
export const AccountService = {
    pause: async (): Promise<{ is_paused: boolean }> => {
        const res = await api.post('/account/pause');
        const data = (res.data as any)?.data ?? res.data;
        return data ?? { is_paused: true };
    },

    unpause: async (): Promise<{ is_paused: boolean }> => {
        const res = await api.post('/account/unpause');
        const data = (res.data as any)?.data ?? res.data;
        return data ?? { is_paused: false };
    },

    deleteAccount: async (): Promise<void> => {
        await api.delete('/account');
    },
};
