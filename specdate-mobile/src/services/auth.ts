import { api } from './api';

export const AuthService = {
    register: async (data: any) => {
        return api.post('/register', data);
    },

    // Placeholder for OTP - assuming backend will have this endpoint
    requestOtp: async (channel: 'email' | 'mobile', contact: string) => {
        // return api.post('/request-otp', { channel, contact });
        console.log('Requesting OTP via', channel, 'for', contact);
        return Promise.resolve({ success: true }); // Mock for now
    },

    verifyOtp: async (code: string) => {
        // return api.post('/verify-otp', { code });
        console.log('Verifying OTP', code);
        return Promise.resolve({ success: true }); // Mock for now
    }
};
