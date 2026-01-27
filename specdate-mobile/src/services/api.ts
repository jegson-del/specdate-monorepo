import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Replace with your local IP if running on device (e.g., http://192.168.1.5:8000/api)
// For emulator 10.0.2.2 usually maps to localhost
const API_URL = 'http://10.0.2.2:8000/api';
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
