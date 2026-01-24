import { api, getAuthToken, setAuthToken } from './api';

export const AuthService = {
    register: async (data: any) => {
        const resp = await api.post('/register', data);
        const token = resp?.data?.data?.token ?? resp?.data?.token;
        if (typeof token === 'string' && token.length > 0) {
            await setAuthToken(token);
        }
        return resp;
    },

    login: async (data: any) => {
        const resp = await api.post('/login', data);
        const token = resp?.data?.data?.token ?? resp?.data?.token;
        if (typeof token === 'string' && token.length > 0) {
            await setAuthToken(token);
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
        await setAuthToken(null);
    }
};
