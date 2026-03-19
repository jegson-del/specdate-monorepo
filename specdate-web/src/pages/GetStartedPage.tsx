import { Link } from 'react-router-dom'
import { AppDownload } from '../components/AppDownload'

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-gray-900 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat bg-fixed text-white">
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="text-sm font-medium text-pink-400 transition hover:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500 rounded"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-14 sm:px-6 md:max-w-xl md:py-20">
        <h1 className="text-center text-3xl font-light tracking-wide text-white sm:text-4xl">
          Get started
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-white/65">
          Download the Dateusher app, or register your business as a date provider.
        </p>

        <section
          className="mt-12 rounded-2xl border border-white/10 bg-black/35 p-8 backdrop-blur-md"
          aria-labelledby="download-heading"
        >
          <h2 id="download-heading" className="text-center text-lg font-medium text-white">
            Download from the App Store or Google Play
          </h2>
          <p className="mt-2 text-center text-sm text-white/55">
            Get the app on your phone iOS and Android.
          </p>
          <AppDownload
            title=""
            variant="stack"
            size="lg"
            className="mt-8 justify-center"
          />
        </section>

        <div className="relative my-10 flex items-center justify-center" role="separator">
          <div className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <span className="absolute bg-gray-900/80 px-4 text-xs font-medium uppercase tracking-widest text-white/45">
            or
          </span>
        </div>

        <section
          className="rounded-2xl border border-pink-500/25 bg-pink-950/20 p-8 backdrop-blur-md"
          aria-labelledby="provider-heading"
        >
          <h2 id="provider-heading" className="text-center text-lg font-medium text-white">
            Register as a provider
          </h2>
          <p className="mt-2 text-center text-sm text-white/65">
            Hotels, spas, restaurants, venues let our daters discover and book your services.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/register/provider"
              className="inline-flex items-center justify-center rounded-full bg-pink-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              Become a provider
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
