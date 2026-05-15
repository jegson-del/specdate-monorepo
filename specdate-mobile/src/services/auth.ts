import { api, getAuthToken, setAuthToken } from './api';
import { clearMediaUploadLimitsCache, prefetchMediaUploadLimits } from './media';
import { configureRevenueCatForUser, resetRevenueCatSession } from './revenueCat';

function extractUserId(resp: any): number | string | undefined {
    return resp?.data?.data?.user?.id ?? resp?.data?.user?.id;
}

export const AuthService = {
    sendOtp: async (channel: 'email' | 'mobile', target: string) => {
        const resp = await api.post('/send-otp', { channel, target });
        return resp;
    },

    register: async (data: any) => {
        const resp = await api.post('/register', data);
        const token = resp?.data?.data?.token ?? resp?.data?.token;
        if (typeof token === 'string' && token.length > 0) {
            await setAuthToken(token);
            void configureRevenueCatForUser(extractUserId(resp));
            void prefetchMediaUploadLimits();
        }
        return resp;
    },

    login: async (data: any) => {
        const resp = await api.post('/login', data);
        const token = resp?.data?.data?.token ?? resp?.data?.token;
        if (typeof token === 'string' && token.length > 0) {
            await setAuthToken(token);
            void configureRevenueCatForUser(extractUserId(resp));
            void prefetchMediaUploadLimits();
        }
        return resp;
    },

    setToken: async (token: string) => {
        await setAuthToken(token);
    },

    getToken: async () => {
        return getAuthToken();
    },

    logout: async () => {
        try {
            await api.post('/logout');
        } catch {
            // Proceed to clear token even if backend call fails (e.g. offline)
        }
        await setAuthToken(null);
        await resetRevenueCatSession();
        clearMediaUploadLimitsCache();
    },
};
