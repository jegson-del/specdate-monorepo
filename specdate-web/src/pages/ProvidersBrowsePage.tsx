import { Link } from 'react-router-dom'
import { DATE_PROVIDER_PLACEHOLDERS } from '../data/dateProviders'

const SERVICE_FILTERS = ['All services', 'Hotels', 'Restaurants', 'Spas', 'Venues', 'Experiences'] as const

export default function ProvidersBrowsePage() {
  return (
    <main className="min-h-screen bg-gray-950 bg-[url('/bg.png')] bg-cover bg-center bg-fixed text-white">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/"
              className="text-sm font-bold text-pink-200 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 rounded"
            >
              Back to home
            </Link>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Browse providers
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/70">
              Explore date-ready hotels, restaurants, spas, venues, and experiences. This page uses
              placeholder listings until live provider browsing is connected.
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
          className="mb-8 rounded-[2rem] border border-white/10 bg-black/35 p-4 shadow-2xl shadow-black/20 backdrop-blur-md sm:p-5"
          aria-label="Provider search and filters"
        >
          <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr_1fr_1fr_auto] lg:items-end">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/55">
                Search
              </span>
              <input
                type="search"
                placeholder="Search hotels, spas, restaurants..."
                className="h-12 w-full rounded-2xl border border-white/10 bg-white px-4 text-sm font-semibold text-gray-950 outline-none placeholder:text-gray-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/40"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/55">
                Country
              </span>
              <select className="h-12 w-full rounded-2xl border border-white/10 bg-white px-4 text-sm font-semibold text-gray-950 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/40">
                <option>United Kingdom</option>
                <option>United States</option>
                <option>Canada</option>
                <option>Nigeria</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/55">
                City
              </span>
              <select className="h-12 w-full rounded-2xl border border-white/10 bg-white px-4 text-sm font-semibold text-gray-950 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/40">
                <option>All cities</option>
                <option>London</option>
                <option>Manchester</option>
                <option>Birmingham</option>
                <option>Edinburgh</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/55">
                Service
              </span>
              <select className="h-12 w-full rounded-2xl border border-white/10 bg-white px-4 text-sm font-semibold text-gray-950 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/40">
                {SERVICE_FILTERS.map((service) => (
                  <option key={service}>{service}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="h-12 rounded-2xl bg-pink-600 px-6 text-sm font-black text-white shadow-lg transition hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-950"
            >
              Filter
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-white/65">
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5">
              Design only
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5">
              {DATE_PROVIDER_PLACEHOLDERS.length} sample providers
            </span>
          </div>
        </form>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DATE_PROVIDER_PLACEHOLDERS.map((provider) => (
            <article
              key={provider.id}
              className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-xl backdrop-blur-sm"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={provider.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute left-4 top-4 rounded-full bg-pink-600/90 px-3 py-1 text-xs font-bold text-white">
                  {provider.type}
                </span>
              </div>
              <div className="p-5">
                <h2 className="text-xl font-bold text-white">{provider.name}</h2>
                <p className="mt-1 text-sm text-white/60">{provider.location}</p>
                <p className="mt-4 text-sm font-semibold text-yellow-300">
                  {provider.rating.toFixed(1)} rated
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
