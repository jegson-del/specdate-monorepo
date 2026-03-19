import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppDownload, DateProvidersSection, Footer, Gallery, Hero } from '../components'

const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Register as provider', href: '/register/provider' },
  { label: 'Sign in', href: '/login' },
] as const

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => {
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat bg-fixed text-white">
      {/* Nav bar - sits above hero, not overlapping the image */}
      <div className="relative z-30 w-full bg-gradient-to-b from-black/50 to-transparent px-4 pt-6 pb-4 sm:px-6 sm:pt-6 sm:pb-4">
        <div className="flex items-center justify-end">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
            aria-label="Toggle navigation menu"
            onClick={() => setMenuOpen((isOpen) => !isOpen)}
            className="inline-flex items-center justify-center rounded-full border border-pink-400/60 bg-black/35 p-2 text-pink-300 shadow-lg backdrop-blur-sm transition hover:border-pink-300 hover:text-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-500 lg:hidden"
          >
            <span className="sr-only">Menu</span>
            <svg
              className={`h-6 w-6 transition-transform duration-300 ${menuOpen ? 'rotate-90' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {menuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <path d="M3 6h18" />
                  <path d="M3 12h18" />
                  <path d="M3 18h18" />
                </>
              )}
            </svg>
          </button>

          <nav className="hidden items-center gap-6 lg:flex xl:gap-8" aria-label="Primary navigation">
            {NAV_LINKS.map(({ label, href }) =>
              href.startsWith('/') ? (
                <Link
                  key={href}
                  to={href}
                  className="text-base font-extrabold tracking-wide text-white drop-shadow-lg transition hover:text-white/90 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
                >
                  {label}
                </Link>
              ) : (
                <a
                  key={href}
                  href={href}
                  className="text-base font-extrabold tracking-wide text-white drop-shadow-lg transition hover:text-white/90 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
                >
                  {label}
                </a>
              ),
            )}
          </nav>
        </div>

        <div
          id="mobile-nav-menu"
          className={`overflow-hidden transition-all duration-300 ease-out lg:hidden ${menuOpen ? 'mt-3 max-h-[22rem] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <nav
            className={`rounded-2xl border border-pink-400/40 bg-black/55 p-4 backdrop-blur-md transition-all duration-300 ease-out ${menuOpen ? 'translate-y-0 scale-100' : '-translate-y-2 scale-95'}`}
          >
            <ul className="space-y-2">
              {NAV_LINKS.map(({ label, href }) => (
                <li key={`mobile-${href}`}>
                  {href.startsWith('/') ? (
                    <Link
                      to={href}
                      onClick={closeMenu}
                      className="block rounded-lg px-3 py-2 text-sm font-bold tracking-wide text-white transition hover:bg-pink-500/15 hover:text-white/90 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      {label}
                    </Link>
                  ) : (
                    <a
                      href={href}
                      onClick={closeMenu}
                      className="block rounded-lg px-3 py-2 text-sm font-bold tracking-wide text-white transition hover:bg-pink-500/15 hover:text-white/90 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      {label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <Hero minHeight="min-h-[85vh]">
        <h1 className="text-4xl font-bold tracking-tight drop-shadow-lg sm:text-5xl md:text-6xl lg:hidden">
          Your perfect date, curated
        </h1>
        <p className="mt-4 text-lg text-white/90 sm:text-xl lg:hidden">
          Connect with people who match what you’re looking for.
        </p>
        <Link
          to="/get-started"
          className="mt-8 inline-block rounded-full bg-pink-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          Get started
        </Link>
        <AppDownload title="Download the app" className="mt-6 lg:mt-8" />
      </Hero>
      <Gallery />
      <DateProvidersSection />
      <Footer />
    </div>
  )
}
