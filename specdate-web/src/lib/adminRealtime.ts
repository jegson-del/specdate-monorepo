import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { getApiBase } from './adminApi'

declare global {
  interface Window {
    Pusher: typeof Pusher
  }
}

export function createAdminEcho(token: string) {
  const key = import.meta.env.VITE_PUSHER_APP_KEY
  if (!key || !token) return null

  window.Pusher = Pusher

  const cluster = import.meta.env.VITE_PUSHER_APP_CLUSTER || 'eu'
  const scheme = import.meta.env.VITE_PUSHER_SCHEME || 'https'
  const host = import.meta.env.VITE_PUSHER_HOST || `ws-${cluster}.pusher.com`
  const port = Number(import.meta.env.VITE_PUSHER_PORT || 443)
  const apiBase = getApiBase()

  return new Echo({
    auth: {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    authEndpoint: `${apiBase}/broadcasting/auth`,
    broadcaster: 'pusher',
    cluster,
    enabledTransports: ['ws', 'wss'],
    forceTLS: scheme === 'https',
    key,
    wsHost: host,
    wsPort: port,
    wssPort: port,
  })
}
