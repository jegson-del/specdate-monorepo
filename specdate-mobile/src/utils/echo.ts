import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Required for laravel-echo to find the globally available Pusher library
(global as any).Pusher = Pusher;

// Key and cluster must match backend .env (PUSHER_APP_KEY, PUSHER_APP_CLUSTER) for real-time RoundAnswered / RoundStarted
export const echo = new Echo({
    broadcaster: 'pusher',
    key: '7dc5e59b1d29871efb2a',
    cluster: 'eu',
    forceTLS: true,
});
