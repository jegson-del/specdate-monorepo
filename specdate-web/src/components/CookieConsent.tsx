import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type CookiePreferences = {
  essential: true
  preferences: boolean
  analytics: boolean
  marketing: boolean
}

const STORAGE_KEY = 'dateusher.cookie-consent.v1'

const defaultPreferences: CookiePreferences = {
  essential: true,
  preferences: false,
  analytics: false,
  marketing: false,
}

function savePreferences(preferences: CookiePreferences) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...preferences,
      savedAt: new Date().toISOString(),
    }),
  )
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [personalising, setPersonalising] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      const timer = window.setTimeout(() => setVisible(true), 450)
      return () => window.clearTimeout(timer)
    }
  }, [])

  const closeWith = (nextPreferences: CookiePreferences) => {
    savePreferences(nextPreferences)
    setVisible(false)
  }

  const acceptAll = () => {
    closeWith({
      essential: true,
      preferences: true,
      analytics: true,
      marketing: true,
    })
  }

  const refuseOptional = () => {
    closeWith(defaultPreferences)
  }

  const toggle = (key: keyof Omit<CookiePreferences, 'essential'>) => {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  return (
    <div
      aria-live="polite"
      className={`fixed inset-x-0 bottom-0 z-[80] px-4 pb-4 transition-all duration-500 ease-out sm:px-6 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-8 opacity-0'
      }`}
    >
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-gray-950/95 text-white shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="grid gap-0 lg:grid-cols-[1fr_22rem]">
          <div className="p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-pink-300">
              Cookie choices
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
              Help us make DateUsher work smoothly
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72">
              We use essential cookies to keep the website secure and working. With your permission,
              we may also use preference, analytics, and marketing cookies to improve DateUsher and
              understand what people find useful.
            </p>
            <p className="mt-3 text-sm text-white/60">
              Read more in our{' '}
              <Link to="/cookie-policy" className="font-bold text-pink-200 underline underline-offset-4">
                Cookie Policy
              </Link>
              ,{' '}
              <Link to="/privacy" className="font-bold text-pink-200 underline underline-offset-4">
                Privacy Policy
              </Link>
              , and{' '}
              <Link to="/terms" className="font-bold text-pink-200 underline underline-offset-4">
                Terms of Service
              </Link>
              .
            </p>
          </div>

          <div className="border-t border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div
              className={`grid transition-all duration-300 ease-out ${
                personalising ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="mb-4 space-y-3">
                  <CookieToggle label="Essential" helper="Security, consent, and core website features." enabled locked />
                  <CookieToggle
                    label="Preferences"
                    helper="Remember choices such as display or region settings."
                    enabled={preferences.preferences}
                    onToggle={() => toggle('preferences')}
                  />
                  <CookieToggle
                    label="Analytics"
                    helper="Understand page performance and improve the experience."
                    enabled={preferences.analytics}
                    onToggle={() => toggle('analytics')}
                  />
                  <CookieToggle
                    label="Marketing"
                    helper="Measure campaigns and reduce repeated ads."
                    enabled={preferences.marketing}
                    onToggle={() => toggle('marketing')}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              {personalising ? (
                <button
                  type="button"
                  onClick={() => closeWith(preferences)}
                  className="rounded-full bg-pink-600 px-5 py-3 text-sm font-black text-white transition hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
                >
                  Save my choices
                </button>
              ) : (
                <button
                  type="button"
                  onClick={acceptAll}
                  className="rounded-full bg-pink-600 px-5 py-3 text-sm font-black text-white transition hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
                >
                  Accept all cookies
                </button>
              )}
              <button
                type="button"
                onClick={refuseOptional}
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white/88 transition hover:border-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                Refuse optional cookies
              </button>
              <button
                type="button"
                onClick={() => setPersonalising((current) => !current)}
                className="rounded-full px-5 py-3 text-sm font-black text-pink-200 transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                {personalising ? 'Hide choices' : 'Personalise my cookies'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CookieToggle({
  label,
  helper,
  enabled,
  locked = false,
  onToggle,
}: {
  label: string
  helper: string
  enabled: boolean
  locked?: boolean
  onToggle?: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/25 p-3">
      <div>
        <p className="text-sm font-black text-white">{label}</p>
        <p className="mt-1 text-xs leading-5 text-white/55">{helper}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={locked}
        aria-pressed={enabled}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled ? 'bg-pink-500' : 'bg-white/18'
        } ${locked ? 'cursor-not-allowed opacity-80' : 'focus:outline-none focus:ring-2 focus:ring-pink-400'}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            enabled ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}
