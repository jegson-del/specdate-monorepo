import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DATE_PROVIDER_PLACEHOLDERS, type DateProviderCard } from '../data/dateProviders'

function StarRating({ value, uniqueId }: { value: number; uniqueId: string }) {
  const filled = Math.round(value * 2) / 2
  const fullStars = Math.floor(filled)
  const showHalf = filled % 1 >= 0.5
  const gradId = `star-half-${uniqueId}`
  return (
    <div className="flex items-center gap-0.5 text-yellow-400" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        if (i < fullStars) {
          return (
            <svg key={i} className="h-4 w-4 fill-current" viewBox="0 0 20 20" aria-hidden>
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
          )
        }
        if (i === fullStars && showHalf) {
          return (
            <svg key={i} className="h-4 w-4" viewBox="0 0 20 20" aria-hidden>
              <defs>
                <linearGradient id={gradId} x1="0" x2="100%" y1="0" y2="0">
                  <stop offset="50%" stopColor="currentColor" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.2)" />
                </linearGradient>
              </defs>
              <path
                fill={`url(#${gradId})`}
                className="text-yellow-400"
                d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"
              />
            </svg>
          )
        }
        return (
          <svg key={i} className="h-4 w-4 fill-white/20" viewBox="0 0 20 20" aria-hidden>
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        )
      })}
      <span className="ml-1 text-sm font-medium text-white/80">{value.toFixed(1)}</span>
    </div>
  )
}

function ProviderCard({ provider }: { provider: DateProviderCard }) {
  return (
    <article className="group relative w-[min(100%,280px)] shrink-0 snap-center overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-lg backdrop-blur-sm transition hover:border-pink-500/40">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={provider.imageUrl}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-pink-600/90 px-2.5 py-0.5 text-xs font-semibold text-white">
          {provider.type}
        </span>
      </div>
      <div className="space-y-1.5 p-4">
        <h3 className="font-semibold text-white">{provider.name}</h3>
        <p className="text-sm text-white/60">{provider.location}</p>
        <StarRating value={provider.rating} uniqueId={provider.id} />
      </div>
    </article>
  )
}

/** Pixels advanced per tick; tick ms — tune for “slow” drift */
const AUTO_SCROLL_PX = 0.75
const AUTO_SCROLL_TICK_MS = 40

/** Repeat items so the track is always wider than the viewport (otherwise there’s nothing to scroll). */
const CAROUSEL_LOOPS = 2

export function DateProvidersSection() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const tick = () => {
      const el = scrollerRef.current
      if (!el || paused) return
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0) return
      const next = el.scrollLeft + AUTO_SCROLL_PX
      if (next >= max - 0.5) {
        el.scrollTo({ left: 0, behavior: 'auto' })
      } else {
        el.scrollLeft = next
      }
    }

    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | undefined
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return
      intervalId = window.setInterval(tick, AUTO_SCROLL_TICK_MS)
    }, 150)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      if (intervalId != null) window.clearInterval(intervalId)
    }
  }, [paused])

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    const step = Math.min(el.clientWidth * 0.85, 320)
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <section
      id="date-providers"
      className="scroll-mt-8 py-16 sm:py-20 md:py-24"
      aria-labelledby="date-providers-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center md:mb-12">
          <h2
            id="date-providers-heading"
            className="text-white text-4xl font-extrabold tracking-tight sm:text-5xl drop-shadow-lg pb-2"
          >
            Our date providers
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/65 sm:text-base">
            Hotels, spas, restaurants, venues, and experiences, curated spots where our daters love to go.
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-2.5 text-white backdrop-blur-sm transition hover:border-pink-500/50 hover:bg-black/70 md:flex"
            aria-label="Previous providers"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-2.5 text-white backdrop-blur-sm transition hover:border-pink-500/50 hover:bg-black/70 md:flex"
            aria-label="Next providers"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div
            ref={scrollerRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-12 [&::-webkit-scrollbar]:hidden"
            role="region"
            aria-roledescription="carousel"
            aria-label="Featured date providers"
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => {
              window.setTimeout(() => setPaused(false), 2500)
            }}
          >
            {Array.from({ length: CAROUSEL_LOOPS }, (_, loop) =>
              DATE_PROVIDER_PLACEHOLDERS.map((p) => (
                <ProviderCard key={`${p.id}-loop-${loop}`} provider={p} />
              )),
            ).flat()}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 text-center sm:mt-12">
          <p className="max-w-lg text-sm text-white/70 sm:text-base">
            Become a provider let our daters discover and patronize your services.
          </p>
          <Link
            to="/register/provider"
            className="inline-flex items-center justify-center rounded-full bg-pink-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Become a provider
          </Link>
        </div>
      </div>
    </section>
  )
}
