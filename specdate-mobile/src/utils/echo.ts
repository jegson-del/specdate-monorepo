import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getApiBaseUrl, getAuthToken } from '../services/api';

// Required for laravel-echo to find the globally available Pusher library
(global as any).Pusher = Pusher;

// Key and cluster must match backend .env (PUSHER_APP_KEY, PUSHER_APP_CLUSTER) for real-time RoundAnswered / RoundStarted
export const echo = new Echo({
    broadcaster: 'pusher',
    key: process.env.EXPO_PUBLIC_PUSHER_APP_KEY,
    cluster: process.env.EXPO_PUBLIC_PUSHER_APP_CLUSTER,
    forceTLS: true,
    authEndpoint: getApiBaseUrl().replace(/\/api$/, '/broadcasting/auth'),
    auth: {
        headers: {
            Authorization: getAuthToken() ? `Bearer ${getAuthToken()}` : '',
            Accept: 'application/json',
        },
    },
});
