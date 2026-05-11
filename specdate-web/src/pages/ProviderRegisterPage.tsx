import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { getCountryOptions, getValidCountryCodes } from '../data/countryOptions'
import {
  createProviderRegistrationSchema,
  SERVICE_TYPE_VALUES,
  type ProviderRegistrationFormInput,
  type ProviderRegistrationOutput,
} from '../schemas/providerRegistrationSchema'

function asParsedOutput(data: ProviderRegistrationFormInput): ProviderRegistrationOutput {
  return data as unknown as ProviderRegistrationOutput
}

const inputClass =
  'mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-white/35 focus:border-pink-500/60 focus:outline-none focus:ring-2 focus:ring-pink-500/40'
const inputErrorClass = ' border-red-400/70 focus:border-red-400 focus:ring-red-500/40'
const otpCodePattern = /^\d{6}$/

const defaultValues: ProviderRegistrationFormInput = {
  businessName: '',
  serviceType: '',
  email: '',
  address: '',
  postcode: '',
  country: '',
  phone: '',
  notes: '',
  otpCode: '',
}

export default function ProviderRegisterPage() {
  const countryOptions = useMemo(() => getCountryOptions(), [])
  const validCountryCodes = useMemo(() => getValidCountryCodes(), [])
  const schema = useMemo(
    () => createProviderRegistrationSchema(validCountryCodes),
    [validCountryCodes],
  )
  const [submittedOk, setSubmittedOk] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null)
  const [isSendingOtp, setIsSendingOtp] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProviderRegistrationFormInput>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched',
  })

  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

  const extractErrorMessage = (result: unknown, fallback: string) => {
    if (!result || typeof result !== 'object') return fallback

    const response = result as {
      message?: string
      errors?: Record<string, string[]>
      data?: { errors?: Record<string, string[]> }
    }

    return (
      response.message ||
      response.errors?.otp_code?.[0] ||
      response.errors?.email?.[0] ||
      response.errors?.phone?.[0] ||
      response.data?.errors?.otp_code?.[0] ||
      fallback
    )
  }

  const sendEmailOtp = async (email: string) => {
    setSubmitError(null)
    setStatusMessage(null)
    setSubmittedOk(false)
    setIsSendingOtp(true)

    try {
      const response = await fetch(`${apiBase}/api/send-otp`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: 'email',
          target: email,
        }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        setSubmitError(
          extractErrorMessage(
            result,
            'We could not send the verification code. Please check the email and try again.',
          ),
        )
        return false
      }

      setOtpSentTo(email)
      setStatusMessage(`We sent a 6-digit verification code to ${email}. Enter it below to submit.`)
      return true
    } finally {
      setIsSendingOtp(false)
    }
  }

  const onValid = async (data: ProviderRegistrationFormInput) => {
    const parsed = asParsedOutput(data)
    const normalizedEmail = parsed.email.toLowerCase()

    if (otpSentTo !== normalizedEmail) {
      await sendEmailOtp(normalizedEmail)
      return
    }

    if (!otpCodePattern.test(parsed.otpCode ?? '')) {
      setError('otpCode', {
        type: 'manual',
        message: 'Enter the 6-digit code we sent to your email.',
      })
      return
    }

    const country = countryOptions.find((option) => option.code === parsed.country)
    const payload = {
      business_name: parsed.businessName,
      service_type: parsed.serviceType,
      email: normalizedEmail,
      address: parsed.address,
      postcode: parsed.postcode,
      country_code: parsed.country,
      country_name: country?.name ?? parsed.country,
      phone: parsed.phone,
      notes: parsed.notes ?? '',
      otp_code: parsed.otpCode,
    }

    setSubmitError(null)
    setStatusMessage(null)
    setSubmittedOk(false)

    const response = await fetch(`${apiBase}/api/provider-registrations`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const result = await response.json().catch(() => null)

    if (!response.ok) {
      setSubmitError(
        extractErrorMessage(
          result,
          'We could not submit your provider application. Please check the form and try again.',
        ),
      )
      return
    }

    setSubmittedOk(true)
    setOtpSentTo(null)
    setStatusMessage(null)
    reset(defaultValues)
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
          <span className="text-sm text-white/50">Provider registration</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-light tracking-wide text-white sm:text-4xl">
          Register as a provider
        </h1>
        <p className="mt-3 text-white/65">
          Join DateUsher and reach daters worldwide. Use your full street address, country, and
          international phone number with country code.
        </p>

        {submittedOk && (
          <p
            className="mt-6 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-200"
            role="status"
          >
            Thanks. Your provider application has been received. We have emailed you a confirmation
            and sent the details to our admin team for review.
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

        {statusMessage && (
          <p
            className="mt-6 rounded-xl border border-pink-400/40 bg-pink-500/10 px-4 py-3 text-sm text-pink-100"
            role="status"
          >
            {statusMessage}
          </p>
        )}

        <form className="mt-10 space-y-6" noValidate onSubmit={handleSubmit(onValid)}>
          <div>
            <label htmlFor="business-name" className="block text-sm font-medium text-white/80">
              Business name <span className="text-pink-400">*</span>
            </label>
            <input
              id="business-name"
              autoComplete="organization"
              placeholder="Your venue or brand"
              className={`${inputClass}${errors.businessName ? inputErrorClass : ''}`}
              aria-invalid={Boolean(errors.businessName)}
              aria-describedby={errors.businessName ? 'err-businessName' : undefined}
              {...register('businessName')}
            />
            {errors.businessName && (
              <p id="err-businessName" className="mt-1.5 text-sm text-red-300" role="alert">
                {errors.businessName.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="service-type" className="block text-sm font-medium text-white/80">
              Type of service <span className="text-pink-400">*</span>
            </label>
            <select
              id="service-type"
              autoComplete="off"
              className={`${inputClass}${errors.serviceType ? inputErrorClass : ''}`}
              aria-invalid={Boolean(errors.serviceType)}
              aria-describedby={errors.serviceType ? 'err-serviceType' : undefined}
              {...register('serviceType')}
            >
              <option value="">Select...</option>
              {SERVICE_TYPE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
            {errors.serviceType && (
              <p id="err-serviceType" className="mt-1.5 text-sm text-red-300" role="alert">
                {errors.serviceType.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/80">
              Contact email <span className="text-pink-400">*</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@business.com"
              className={`${inputClass}${errors.email ? inputErrorClass : ''}`}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'err-email' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p id="err-email" className="mt-1.5 text-sm text-red-300" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-white/80">
              Street address <span className="text-pink-400">*</span>
            </label>
            <textarea
              id="address"
              rows={4}
              autoComplete="street-address"
              placeholder="Building name, street, district, city"
              className={`${inputClass} resize-y${errors.address ? inputErrorClass : ''}`}
              aria-invalid={Boolean(errors.address)}
              aria-describedby={errors.address ? 'err-address' : undefined}
              {...register('address')}
            />
            <p className="mt-1 text-xs text-white/45">
              10-500 characters. Any language or script is allowed.
            </p>
            {errors.address && (
              <p id="err-address" className="mt-1.5 text-sm text-red-300" role="alert">
                {errors.address.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="postcode" className="block text-sm font-medium text-white/80">
              Postcode / zipcode <span className="text-pink-400">*</span>
            </label>
            <input
              id="postcode"
              autoComplete="postal-code"
              placeholder="SW1A 1AA or 10001"
              className={`${inputClass}${errors.postcode ? inputErrorClass : ''}`}
              aria-invalid={Boolean(errors.postcode)}
              aria-describedby={errors.postcode ? 'err-postcode' : undefined}
              {...register('postcode')}
            />
            {errors.postcode && (
              <p id="err-postcode" className="mt-1.5 text-sm text-red-300" role="alert">
                {errors.postcode.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-white/80">
              Country / region <span className="text-pink-400">*</span>
            </label>
            <select
              id="country"
              autoComplete="country"
              className={`${inputClass}${errors.country ? inputErrorClass : ''}`}
              aria-invalid={Boolean(errors.country)}
              aria-describedby={errors.country ? 'err-country' : undefined}
              {...register('country')}
            >
              <option value="">Select country...</option>
              {countryOptions.map(({ code, name }) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            {errors.country && (
              <p id="err-country" className="mt-1.5 text-sm text-red-300" role="alert">
                {errors.country.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-white/80">
              Phone number <span className="text-pink-400">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+44 20 7946 0958"
              className={`${inputClass}${errors.phone ? inputErrorClass : ''}`}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'err-phone' : undefined}
              {...register('phone')}
            />
            <p className="mt-1 text-xs text-white/45">
              International format: start with + and your country code, then the number.
            </p>
            {errors.phone && (
              <p id="err-phone" className="mt-1.5 text-sm text-red-300" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-white/80">
              Message (optional)
            </label>
            <textarea
              id="notes"
              rows={4}
              placeholder="Tell us about your location, capacity, or partnership goals..."
              className={`${inputClass} resize-y${errors.notes ? inputErrorClass : ''}`}
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? 'err-notes' : undefined}
              {...register('notes')}
            />
            {errors.notes && (
              <p id="err-notes" className="mt-1.5 text-sm text-red-300" role="alert">
                {errors.notes.message}
              </p>
            )}
          </div>

          {otpSentTo && (
            <div className="rounded-2xl border border-white/12 bg-black/35 p-4 shadow-2xl shadow-pink-950/20">
              <label htmlFor="otp-code" className="block text-sm font-medium text-white/80">
                Email verification code <span className="text-pink-400">*</span>
              </label>
              <input
                id="otp-code"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                className={`${inputClass}${errors.otpCode ? inputErrorClass : ''}`}
                aria-invalid={Boolean(errors.otpCode)}
                aria-describedby={errors.otpCode ? 'err-otpCode' : 'hint-otpCode'}
                {...register('otpCode')}
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p id="hint-otpCode" className="text-xs text-white/45">
                  The code expires in 10 minutes. Check spam if it is not in your inbox.
                </p>
                <button
                  type="button"
                  disabled={isSendingOtp || isSubmitting}
                  onClick={handleSubmit((data) => sendEmailOtp(asParsedOutput(data).email.toLowerCase()))}
                  className="self-start rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-pink-400/60 hover:text-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
                >
                  {isSendingOtp ? 'Sending...' : 'Resend code'}
                </button>
              </div>
              {errors.otpCode && (
                <p id="err-otpCode" className="mt-1.5 text-sm text-red-300" role="alert">
                  {errors.otpCode.message}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isSendingOtp}
            className="w-full rounded-full bg-pink-600 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting || isSendingOtp
              ? otpSentTo
                ? 'Submitting...'
                : 'Sending code...'
              : otpSentTo
                ? 'Submit verified application'
                : 'Send verification code'}
          </button>
          <p className="text-center text-xs text-white/45">
            We review every provider before they appear in the marketplace.
          </p>
        </form>
      </main>
    </div>
  )
}
