export function getApiOrigin() {
  return (import.meta.env.VITE_API_URL || '')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '')
}
