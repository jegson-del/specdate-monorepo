export type PublicProviderCategory = {
  id: number
  name: string
  slug: string
}

export type PublicProvider = {
  id: number
  name: string
  category: string
  categories: PublicProviderCategory[]
  city: string | null
  country: string | null
  currency: string
  address: string | null
  description: string | null
  website: string | null
  phone: string | null
  imageUrl: string | null
  gallery: { id: number; url: string }[]
  reviews: { date: string | null; id: string; rating: number; text: string; userName: string }[]
  discountPercentage: number
  minimumSpend: number | null
  bookingRequired: boolean
  idRequired: boolean
  isVerified: boolean
  rating: number | null
  reviewsCount: number
  created_at: string
}

type ApiEnvelope<T> = {
  data: T
  message?: string
}

type Paginated<T> = {
  current_page?: number
  data: T[]
  last_page?: number
  per_page?: number
  total?: number
}

const fallbackImage = '/bg.png'

export function publicApiBase() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
}

export function providerImage(provider: PublicProvider) {
  return provider.imageUrl || provider.gallery[0]?.url || fallbackImage
}

export function providerLocation(provider: PublicProvider) {
  return [provider.city, provider.country].filter(Boolean).join(', ') || 'Location coming soon'
}

export async function fetchPublicProviders(filters: {
  category?: string
  city?: string
  country?: string
  page?: number
  perPage?: number
  q?: string
} = {}) {
  const query = new URLSearchParams({
    page: String(filters.page ?? 1),
    per_page: String(filters.perPage ?? 18),
  })
  Object.entries(filters).forEach(([key, value]) => {
    if (key === 'page' || key === 'perPage') return
    if (typeof value === 'string' && value.trim()) {
      query.set(key, value.trim())
    }
  })

  const response = await fetch(`${publicApiBase()}/api/public/providers?${query.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  const result = (await response.json().catch(() => null)) as ApiEnvelope<Paginated<PublicProvider>> | null

  if (!response.ok || !result) {
    throw new Error(result?.message || 'Providers could not be loaded.')
  }

  return result.data
}

export async function fetchPublicProvider(providerId: string) {
  const response = await fetch(`${publicApiBase()}/api/public/providers/${providerId}`, {
    headers: { Accept: 'application/json' },
  })
  const result = (await response.json().catch(() => null)) as ApiEnvelope<PublicProvider> | null

  if (!response.ok || !result) {
    throw new Error(result?.message || 'Provider could not be loaded.')
  }

  return result.data
}
