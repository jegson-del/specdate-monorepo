import { useEffect, useState } from 'react'
import {
  fetchPublicSuccessStories,
  type PublicSuccessStory,
} from '../lib/publicSuccessStories'

export function useSuccessStories(limit = 6) {
  const [stories, setStories] = useState<PublicSuccessStory[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadStories = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const nextStories = await fetchPublicSuccessStories(limit)
        if (!cancelled) {
          setStories(nextStories)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Success stories could not be loaded.')
          setStories([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadStories()

    return () => {
      cancelled = true
    }
  }, [limit])

  return { error, isLoading, stories }
}
