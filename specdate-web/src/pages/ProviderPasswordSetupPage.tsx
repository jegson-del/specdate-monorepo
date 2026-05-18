import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { AppDownload } from '../components/AppDownload'
import { getApiOrigin } from '../lib/apiBase'
import {
  providerPasswordSetupSchema,
  type ProviderPasswordSetupInput,
} from '../schemas/providerPasswordSetupSchema'

const inputClass =
  'mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-white/35 focus:border-pink-500/60 focus:outline-none focus:ring-2 focus:ring-pink-500/40'
const inputErrorClass = ' border-red-400/70 focus:border-red-400 focus:ring-red-500/40'

type ApiError = {
  message?: string
  errors?: Record<string, string[]>
}

export default function ProviderPasswordSetupPage() {
  const [searchParams] = useSearchParams()
  const email = useMemo(() => searchParams.get('email')?.trim() ?? '', [searchParams])
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProviderPasswordSetupInput>({
    resolver: zodResolver(providerPasswordSetupSchema),
    defaultValues: {
      password: '',
      passwordConfirmation: '',
      termsAccepted: false,
    },
    mode: 'onTouched',
  })

  const apiBase = getApiOrigin()
  const hasLinkData = Boolean(email && token)

  const extractErrorMessage = (result: unknown) => {
    if (!result || typeof result !== 'object') {
      return 'We could not set your password. Please try again.'
    }

    const response = result as ApiError

    return (
      response.errors?.token?.[0] ||
      response.errors?.email?.[0] ||
      response.errors?.password?.[0] ||
      response.message ||
      'We could not set your password. Please try again.'
    )
  }

  const onSubmit = async (data: ProviderPasswordSetupInput) => {
    if (!hasLinkData) {
      setSubmitError('This setup link is missing required information. Please open the latest approval email.')
      return
    }

    setSubmitError(null)

    const response = await fetch(`${apiBase}/api/provider-password/setup`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        token,
        password: data.password,
        password_confirmation: data.passwordConfirmation,
        terms_accepted: data.termsAccepted,
      }),
    })
    const result = await response.json().catch(() => null)

    if (!response.ok) {
      setSubmitError(extractErrorMessage(result))
      return
    }

    setCompleted(true)
  }

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
          <span className="text-sm text-white/50">Provider access</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        {completed ? (
          <section className="rounded-3xl border border-pink-400/30 bg-black/45 p-7 shadow-2xl shadow-pink-950/30 backdrop-blur-md">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-pink-200">
              Password set
            </p>
            <h1 className="mt-4 text-3xl font-light tracking-wide text-white sm:text-4xl">
              Your provider account is ready
            </h1>
            <p className="mt-4 text-white/70">
              Download the DateUsher app and log in with {email} and your new password.
            </p>
            <AppDownload title="" variant="stack" size="lg" className="mt-8" />
          </section>
        ) : (
          <>
            <h1 className="text-3xl font-light tracking-wide text-white sm:text-4xl">
              Set your provider password
            </h1>
            <p className="mt-3 text-white/65">
              Create the password you will use to log in to DateUsher as a provider.
            </p>

            {!hasLinkData && (
              <p
                className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                role="alert"
              >
                This setup link is missing required information. Please open the latest approval email.
              </p>
            )}

            {submitError && (
              <p
                className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                role="alert"
              >
                {submitError}
              </p>
            )}

            <form className="mt-10 space-y-6" noValidate onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/80">
                  Provider email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  className={`${inputClass} opacity-75`}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/80">
                  New password <span className="text-pink-400">*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className={`${inputClass}${errors.password ? inputErrorClass : ''}`}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'err-password' : undefined}
                  {...register('password')}
                />
                {errors.password && (
                  <p id="err-password" className="mt-1.5 text-sm text-red-300" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password-confirmation" className="block text-sm font-medium text-white/80">
                  Confirm password <span className="text-pink-400">*</span>
                </label>
                <input
                  id="password-confirmation"
                  type="password"
                  autoComplete="new-password"
                  className={`${inputClass}${errors.passwordConfirmation ? inputErrorClass : ''}`}
                  aria-invalid={Boolean(errors.passwordConfirmation)}
                  aria-describedby={
                    errors.passwordConfirmation ? 'err-password-confirmation' : undefined
                  }
                  {...register('passwordConfirmation')}
                />
                {errors.passwordConfirmation && (
                  <p
                    id="err-password-confirmation"
                    className="mt-1.5 text-sm text-red-300"
                    role="alert"
                  >
                    {errors.passwordConfirmation.message}
                  </p>
                )}
              </div>

              <label className="flex gap-3 rounded-2xl border border-white/12 bg-black/35 p-4 text-sm text-white/70">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-black text-pink-600 focus:ring-pink-500"
                  {...register('termsAccepted')}
                />
                <span>
                  I agree to the DateUsher provider terms and understand that approved providers
                  must keep booking details accurate.
                </span>
              </label>
              {errors.termsAccepted && (
                <p className="mt-1.5 text-sm text-red-300" role="alert">
                  {errors.termsAccepted.message}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !hasLinkData}
                className="w-full rounded-full bg-pink-600 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Setting password...' : 'Set password'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
