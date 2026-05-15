import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchPublicProviders,
  providerImage,
  providerLocation,
  type PublicProvider,
} from '../lib/publicProviders'
import { Seo } from '../components/Seo'

const SERVICE_FILTERS = ['All services', 'Hotel', 'Restaurant', 'Spa', 'Venue', 'Experience'] as const
const PROVIDERS_PER_PAGE = 18

export default function ProvidersBrowsePage() {
  const [providers, setProviders] = useState<PublicProvider[]>([])
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [service, setService] = useState<(typeof SERVICE_FILTERS)[number]>('All services')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [totalProviders, setTotalProviders] = useState(0)

  const filters = useMemo(
    () => ({
      category: service === 'All services' ? '' : service,
      city,
      country,
      q: query,
    }),
    [city, country, query, service],
  )

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    setPage(1)

    fetchPublicProviders({ ...filters, page: 1, perPage: PROVIDERS_PER_PAGE })
      .then((result) => {
        if (cancelled) return
        setProviders(result.data)
        setPage(result.current_page ?? 1)
        setLastPage(result.last_page ?? 1)
        setTotalProviders(result.total ?? result.data.length)
      })
      .catch((err) => {
        if (cancelled) return
        setProviders([])
        setError(err instanceof Error ? err.message : 'Providers could not be loaded.')
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [filters])

  const hasMoreProviders = page < lastPage

  const loadMoreProviders = async () => {
    if (isLoadingMore || !hasMoreProviders) return

    const nextPage = page + 1
    setIsLoadingMore(true)
    setError(null)

    try {
      const result = await fetchPublicProviders({
        ...filters,
        page: nextPage,
        perPage: PROVIDERS_PER_PAGE,
      })
      setProviders((current) => {
        const seen = new Set(current.map((provider) => provider.id))
        const next = result.data.filter((provider) => !seen.has(provider.id))
        return [...current, ...next]
      })
      setPage(result.current_page ?? nextPage)
      setLastPage(result.last_page ?? nextPage)
      setTotalProviders(result.total ?? providers.length + result.data.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'More providers could not be loaded.')
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 bg-[url('/bg.png')] bg-cover bg-center bg-fixed text-white">
      <Seo
        title="Date providers"
        description="Browse DateUsher date providers, venues, restaurants, spas, hotels, and experiences for planned dates."
        path="/providers"
      />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/"
              className="rounded text-sm font-bold text-pink-200 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              Back to home
            </Link>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Browse providers
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/70">
              Explore verified date-ready hotels, restaurants, spas, venues, and experiences.
            </p>
          </div>
          <Link
            to="/register/provider"
            className="inline-flex w-fit items-center justify-center rounded-full bg-pink-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-950"
          >
            Become a provider
          </Link>
        </div>

        <form
          className="mb-8 rounded-lg border border-white/10 bg-black/35 p-4 shadow-2xl shadow-black/20 backdrop-blur-md sm:p-5"
          aria-label="Provider search and filters"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr_1fr_1fr] lg:items-end">
            <TextField label="Search" value={query} onChange={setQuery} placeholder="Hotel, spa, restaurant..." />
            <TextField label="Country" value={country} onChange={setCountry} placeholder="United Kingdom" />
            <TextField label="City" value={city} onChange={setCity} placeholder="London" />

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/55">
                Service
              </span>
              <select
                value={service}
                onChange={(event) => setService(event.target.value as (typeof SERVICE_FILTERS)[number])}
                className="h-12 w-full rounded-lg border border-white/10 bg-white px-4 text-sm font-semibold text-gray-950 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/40"
              >
                {SERVICE_FILTERS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-white/65">
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5">
              {isLoading
                ? 'Loading providers'
                : `${providers.length} of ${totalProviders} verified providers`}
            </span>
            {error ? (
              <span className="rounded-full border border-rose-300/30 bg-rose-500/15 px-3 py-1.5 text-rose-100">
                {error}
              </span>
            ) : null}
          </div>
        </form>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-80 animate-pulse rounded-lg bg-white/10" />
            ))}
          </div>
        ) : providers.length > 0 ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
            {hasMoreProviders ? (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={loadMoreProviders}
                  disabled={isLoadingMore}
                  className="h-12 rounded-lg bg-pink-600 px-8 text-sm font-black text-white shadow-lg transition hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingMore ? 'Loading more...' : 'Load more providers'}
                </button>
              </div>
            ) : (
              <p className="mt-8 text-center text-sm font-bold text-white/55">
                You have reached the end of the provider list.
              </p>
            )}
          </>
        ) : (
          <section className="rounded-lg border border-white/10 bg-black/35 p-8 text-center">
            <h2 className="text-xl font-black">No providers found</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/65">
              Try a wider search, or check back as approved DateUsher providers come online.
            </p>
          </section>
        )}
      </section>
    </main>
  )
}

function TextField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/55">
        {label}
      </span>
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-lg border border-white/10 bg-white px-4 text-sm font-semibold text-gray-950 outline-none placeholder:text-gray-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/40"
      />
    </label>
  )
}

function ProviderCard({ provider }: { provider: PublicProvider }) {
  return (
    <Link
      to={`/providers/${provider.id}`}
      className="group overflow-hidden rounded-lg border border-white/10 bg-black/30 shadow-xl backdrop-blur-sm transition hover:border-pink-400/60 focus:outline-none focus:ring-2 focus:ring-pink-500"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={providerImage(provider)}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <span className="absolute left-4 top-4 rounded-full bg-pink-600/90 px-3 py-1 text-xs font-bold text-white">
          {provider.category}
        </span>
      </div>
      <div className="p-5">
        <h2 className="text-xl font-bold text-white">{provider.name}</h2>
        <p className="mt-1 text-sm text-white/60">{providerLocation(provider)}</p>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-yellow-300">
            {provider.rating ? `${provider.rating.toFixed(1)} rated` : 'New provider'}
          </span>
          <span className="font-bold text-pink-200">{provider.discountPercentage}% offer</span>
        </div>
      </div>
    </Link>
  )
}
