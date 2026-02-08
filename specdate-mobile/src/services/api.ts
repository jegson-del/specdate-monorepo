import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import Constants from 'expo-constants';

// API base URL. On a physical device, 127.0.0.1/localhost = the device itself, so backend is unreachable.
// Set EXPO_PUBLIC_API_URL in .env to your PC's LAN IP (e.g. http://192.168.1.5:8000/api) when using a real device.
const getBaseUrl = (): string => {
    const override = process.env.EXPO_PUBLIC_API_URL?.trim();
    if (override) {
        const base = override.replace(/\/$/, '');
        return base.endsWith('/api') ? base : base + '/api';
    }

    const debuggerHost = Constants.expoConfig?.hostUri;
    const androidEmulatorHost = '10.0.2.2'; // Only works on Android emulator

    if (debuggerHost) {
        const ip = debuggerHost.split(':')[0];
        // On a physical device, 127.0.0.1/localhost = the phone, not your PC. Never use it for API.
        if (ip === '127.0.0.1' || ip === 'localhost') {
            if (__DEV__) {
                console.warn(
                    '[API] hostUri is 127.0.0.1/localhost – on a physical device this points to the device itself. ' +
                    'Set EXPO_PUBLIC_API_URL in .env to your PC IP (e.g. http://192.168.1.5:8000/api) and restart Expo.'
                );
            }
            return `http://${androidEmulatorHost}:8000/api`;
        }
        return `http://${ip}:8000/api`;
    }

    return `http://${androidEmulatorHost}:8000/api`;
};

const API_URL = getBaseUrl();

if (__DEV__) {
    console.log('[API] baseURL:', API_URL);
}
const AUTH_TOKEN_KEY = 'specdate.authToken';

export function getApiBaseUrl(): string {
    return API_URL;
}

export const api = axios.create({

    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// In-memory auth token (persisted via expo-secure-store)
let authToken: string | null = null;

function applyAuthToken(token: string | null) {
    authToken = token;
    if (token) {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (api.defaults.headers.common as any).Authorization;
    }
}

export async function setAuthToken(token: string | null) {
    applyAuthToken(token);
    try {
        if (token) {
            await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
        } else {
            await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
        }
    } catch {
        // Non-blocking: if storage fails, keep in-memory auth working.
    }
}

export function getAuthToken() {
    return authToken;
}

export async function bootstrapAuthToken() {
    try {
        const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        if (typeof token === 'string' && token.length > 0) {
            applyAuthToken(token);
        }
    } catch {
        // ignore
    }
    return authToken;
}

api.interceptors.request.use(async (config) => {
    // If a specific request already set auth, don't override it.
    if (!config.headers?.Authorization && authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
});
