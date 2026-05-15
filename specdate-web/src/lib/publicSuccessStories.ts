import { publicApiBase } from './publicProviders'

export type PublicSuccessStory = {
  id: number
  title: string
  body: string
  attribution: string
  location: string | null
  storyType: string
  imageUrl: string | null
  rating: number | null
  isFeatured: boolean
  publishedAt: string | null
  provider: {
    city: string | null
    country: string | null
    id: number
    name: string
  } | null
}

type ApiEnvelope<T> = {
  data: T
  message?: string
}

type Paginated<T> = {
  data: T[]
}

export async function fetchPublicSuccessStories(perPage = 6) {
  const query = new URLSearchParams({ per_page: String(perPage) })
  const response = await fetch(`${publicApiBase()}/api/public/success-stories?${query.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  const result = (await response.json().catch(() => null)) as ApiEnvelope<Paginated<PublicSuccessStory>> | null

  if (!response.ok || !result) {
    throw new Error(result?.message || 'Success stories could not be loaded.')
  }

  return result.data.data
}
