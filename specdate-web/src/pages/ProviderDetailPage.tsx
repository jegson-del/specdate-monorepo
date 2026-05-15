import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchPublicProvider,
  providerImage,
  providerLocation,
  type PublicProvider,
} from '../lib/publicProviders'
import { Seo } from '../components/Seo'

export default function ProviderDetailPage() {
  const { providerId = '' } = useParams()
  const [provider, setProvider] = useState<PublicProvider | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetchPublicProvider(providerId)
      .then((result) => {
        if (!cancelled) {
          setProvider(result)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProvider(null)
          setError(err instanceof Error ? err.message : 'Provider could not be loaded.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [providerId])

  if (isLoading) {
    return <ProviderShell body={<div className="h-[70vh] animate-pulse rounded-lg bg-white/10" />} />
  }

  if (error || !provider) {
    return (
      <ProviderShell
        body={
          <section className="rounded-lg border border-white/10 bg-black/35 p-8 text-center">
            <h1 className="text-2xl font-black">Provider unavailable</h1>
            <p className="mt-2 text-sm text-white/65">{error || 'This provider is not available.'}</p>
            <Link className="mt-5 inline-flex font-bold text-pink-200" to="/providers">
              Browse providers
            </Link>
          </section>
        }
      />
    )
  }

  const images = provider.gallery.length > 0 ? provider.gallery : [{ id: 0, url: providerImage(provider) }]

  return (
    <ProviderShell
      body={
        <>
          <Seo
            title={`${provider.name} - Date provider`}
            description={`${provider.name} is a DateUsher provider${providerLocation(provider) ? ` in ${providerLocation(provider)}` : ''}. View date experience details, offers, and booking information.`}
            path={`/providers/${provider.id}`}
            image={providerImage(provider)}
          />
          <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <Link to="/providers" className="rounded text-sm font-bold text-pink-200 hover:text-white">
                Back to providers
              </Link>
              <p className="mt-6 text-sm font-black uppercase tracking-[0.24em] text-pink-300">
                {provider.category}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                {provider.name}
              </h1>
              <p className="mt-4 text-base text-white/70">{providerLocation(provider)}</p>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/75">
                {provider.description || 'Provider details are being polished for launch.'}
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/35 p-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Stat label="Offer" value={`${provider.discountPercentage}%`} />
                <Stat label="Rating" value={provider.rating ? provider.rating.toFixed(1) : 'New'} />
                <Stat label="Booking" value={provider.bookingRequired ? 'Required' : 'Flexible'} />
                <Stat label="Currency" value={provider.currency} />
              </div>
              <Link
                to="/get-started"
                className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-lg bg-pink-600 text-sm font-black text-white transition hover:bg-pink-500"
              >
                Open in app
              </Link>
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {images.slice(0, 6).map((image) => (
              <img
                key={image.id}
                src={image.url}
                alt=""
                className="aspect-[4/3] w-full rounded-lg object-cover"
                loading="lazy"
              />
            ))}
          </section>

          {provider.reviews.length > 0 ? (
            <section className="mt-8 rounded-lg border border-white/10 bg-black/35 p-5">
              <h2 className="text-lg font-black">Recent reviews</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {provider.reviews.map((review) => (
                  <article key={review.id} className="rounded-lg bg-white p-4 text-slate-950">
                    <p className="text-sm font-black">{review.userName}</p>
                    <p className="mt-1 text-sm font-bold text-pink-700">{review.rating}/5</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{review.text}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      }
    />
  )
}

function ProviderShell({ body }: { body: ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-950 bg-[url('/bg.png')] bg-cover bg-center bg-fixed text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">{body}</div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  )
}
