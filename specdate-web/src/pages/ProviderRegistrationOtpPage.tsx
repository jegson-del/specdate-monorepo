import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AppDownload } from '../components/AppDownload'
import { useAlert } from '../components/AlertProvider'
import {
  PROVIDER_REGISTRATION_STORAGE_KEY,
  sendProviderEmailOtp,
  submitProviderRegistration,
  type ProviderRegistrationPayload,
} from '../lib/providerRegistration'

const otpCodePattern = /^\d{6}$/

type LocationState = {
  payload?: ProviderRegistrationPayload
}

function readStoredPayload() {
  const stored = sessionStorage.getItem(PROVIDER_REGISTRATION_STORAGE_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as ProviderRegistrationPayload
  } catch {
    return null
  }
}

export default function ProviderRegistrationOtpPage() {
  const { showAlert } = useAlert()
  const location = useLocation()
  const navigate = useNavigate()
  const routePayload = (location.state as LocationState | null)?.payload
  const payload = useMemo(() => routePayload ?? readStoredPayload(), [routePayload])
  const [otpCode, setOtpCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (routePayload) {
      sessionStorage.setItem(PROVIDER_REGISTRATION_STORAGE_KEY, JSON.stringify(routePayload))
    }
  }, [routePayload])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!payload) return

    const code = otpCode.trim()
    if (!otpCodePattern.test(code)) {
      setError('Enter the 6-digit code we sent to your email.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      await submitProviderRegistration(payload, code)
      sessionStorage.removeItem(PROVIDER_REGISTRATION_STORAGE_KEY)
      showAlert({
        tone: 'success',
        title: 'Provider application received',
        message: 'We emailed your confirmation and sent your details to our admin team for review.',
        durationMs: 8000,
      })
      navigate('/register/provider/success', { replace: true, state: { email: payload.email } })
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'We could not submit your provider application. Please check the code and try again.'
      setError(message)
      showAlert({
        tone: 'error',
        title: 'Application not submitted',
        message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resendCode = async () => {
    if (!payload) return

    setError(null)
    setIsResending(true)
    try {
      await sendProviderEmailOtp(payload.email)
      showAlert({
        tone: 'info',
        title: 'New code sent',
        message: `We sent another 6-digit verification code to ${payload.email}.`,
      })
    } catch (resendError) {
      const message =
        resendError instanceof Error ? resendError.message : 'We could not resend the verification code.'
      setError(message)
      showAlert({
        tone: 'error',
        title: 'Verification code not sent',
        message,
      })
    } finally {
      setIsResending(false)
    }
  }

  if (!payload) {
    return (
      <ProviderRegistrationShell label="Provider verification">
        <section className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-black/35 p-8 text-center backdrop-blur-md">
          <h1 className="text-3xl font-light tracking-wide text-white">Start your application</h1>
          <p className="mt-3 text-sm text-white/65">
            We need your provider details before we can send a verification code.
          </p>
          <Link
            to="/register/provider"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-pink-600 px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Register as a provider
          </Link>
        </section>
      </ProviderRegistrationShell>
    )
  }

  return (
    <ProviderRegistrationShell label="Provider verification">
      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-light tracking-wide text-white sm:text-4xl">
          Check your email
        </h1>
        <p className="mt-3 text-white/65">
          Enter the 6-digit code we sent to {payload.email} to complete your provider registration.
        </p>

        <form
          className="mt-10 rounded-2xl border border-white/10 bg-black/35 p-6 shadow-2xl shadow-pink-950/20 backdrop-blur-md"
          noValidate
          onSubmit={onSubmit}
        >
          <label htmlFor="otp-code" className="block text-sm font-medium text-white/80">
            Email verification code
          </label>
          <input
            id="otp-code"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            value={otpCode}
            onChange={(event) => {
              setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))
              setError(null)
            }}
            placeholder="123456"
            className={`mt-2 w-full rounded-xl border bg-black/45 px-4 py-3 text-center text-2xl tracking-[0.4em] text-white placeholder:text-white/25 focus:outline-none focus:ring-2 ${
              error
                ? 'border-red-400/70 focus:border-red-400 focus:ring-red-500/40'
                : 'border-white/15 focus:border-pink-500/60 focus:ring-pink-500/40'
            }`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'err-otp-code' : 'hint-otp-code'}
          />
          <p id="hint-otp-code" className="mt-3 text-xs text-white/45">
            The code expires in 10 minutes. Check spam if it is not in your inbox.
          </p>
          {error && (
            <p id="err-otp-code" className="mt-3 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isResending}
            className="mt-6 w-full rounded-full bg-pink-600 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting application...' : 'Complete registration'}
          </button>

          <div className="mt-4 flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              disabled={isSubmitting || isResending}
              onClick={resendCode}
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-pink-400/60 hover:text-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResending ? 'Sending...' : 'Resend code'}
            </button>
            <Link
              to="/register/provider"
              className="rounded-full px-4 py-2 text-xs font-semibold text-pink-300 transition hover:text-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              Edit provider details
            </Link>
          </div>
        </form>
      </main>
    </ProviderRegistrationShell>
  )
}

export function ProviderRegistrationSuccessPage() {
  const location = useLocation()
  const email = ((location.state as { email?: string } | null)?.email ?? '').trim()

  return (
    <ProviderRegistrationShell label="Provider application submitted">
      <main className="mx-auto max-w-xl px-4 py-14 text-center sm:px-6 md:py-20">
        <section className="rounded-2xl border border-green-400/25 bg-black/35 p-8 shadow-2xl shadow-pink-950/20 backdrop-blur-md">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-200">
            Application received
          </p>
          <h1 className="mt-4 text-3xl font-light tracking-wide text-white sm:text-4xl">
            Thanks for registering with DateUsher.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/65">
            We have emailed your confirmation{email ? ` to ${email}` : ''} and sent your details to
            our admin team for review. While we check your application, download the app so you are
            ready when your provider account is approved.
          </p>
          <AppDownload title="" variant="stack" size="lg" className="mt-8 justify-center" />
          <Link
            to="/"
            className="mt-8 inline-flex items-center justify-center rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-white/80 transition hover:border-pink-400/60 hover:text-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            Back to home
          </Link>
        </section>
      </main>
    </ProviderRegistrationShell>
  )
}

function ProviderRegistrationShell({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-900 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat bg-fixed text-white">
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="rounded text-sm font-medium text-pink-400 transition hover:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            Back to home
          </Link>
          <span className="text-sm text-white/50">{label}</span>
        </div>
      </header>
      {children}
    </div>
  )
}
