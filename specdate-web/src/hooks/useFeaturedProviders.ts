import { useEffect, useState } from 'react'
import { fetchPublicProviders, type PublicProvider } from '../lib/publicProviders'

export function useFeaturedProviders(limit = 8) {
  const [providers, setProviders] = useState<PublicProvider[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadProviders = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await fetchPublicProviders({ page: 1, perPage: limit })
        if (!cancelled) {
          setProviders(result.data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Providers could not be loaded.')
          setProviders([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadProviders()

    return () => {
      cancelled = true
    }
  }, [limit])

  return { error, isLoading, providers }
}
