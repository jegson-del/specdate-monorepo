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

/** RHF submit values match input; resolver has already applied Zod transforms — safe to treat as output for API. */
function asParsedOutput(data: ProviderRegistrationFormInput): ProviderRegistrationOutput {
  return data as unknown as ProviderRegistrationOutput
}

const inputClass =
  'mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-white/35 focus:border-pink-500/60 focus:outline-none focus:ring-2 focus:ring-pink-500/40'
const inputErrorClass = ' border-red-400/70 focus:border-red-400 focus:ring-red-500/40'

const defaultValues: ProviderRegistrationFormInput = {
  businessName: '',
  serviceType: '',
  email: '',
  address: '',
  country: '',
  phone: '',
  notes: '',
}

/**
 * Provider registration — Zod schema + react-hook-form + TypeScript.
 */
export default function ProviderRegisterPage() {
  const countryOptions = useMemo(() => getCountryOptions(), [])
  const validCountryCodes = useMemo(() => getValidCountryCodes(), [])
  const schema = useMemo(
    () => createProviderRegistrationSchema(validCountryCodes),
    [validCountryCodes],
  )

  const [submittedOk, setSubmittedOk] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProviderRegistrationFormInput>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched',
  })

  const onValid = (data: ProviderRegistrationFormInput) => {
    const parsed = asParsedOutput(data)
    const payload = {
      businessName: parsed.businessName,
      serviceType: parsed.serviceType,
      email: parsed.email,
      address: parsed.address,
      countryCode: parsed.country,
      phoneE164: parsed.phone,
      notes: parsed.notes ?? '',
    }
    console.info('[Provider registration — wire to API]', payload)
    setSubmittedOk(true)
    reset(defaultValues)
  }

  return (
    <div className="min-h-screen bg-gray-900 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat bg-fixed text-white">
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="text-sm font-medium text-pink-400 transition hover:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500 rounded"
          >
            ← Back to home
          </Link>
          <span className="text-sm text-white/50">Provider registration</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-light tracking-wide text-white sm:text-4xl">
          Register as a provider
        </h1>
        <p className="mt-3 text-white/65">
          Join Dateusher and reach daters worldwide. Use your full street address, country, and
          international phone number (with country code).
        </p>

        {submittedOk && (
          <p
            className="mt-6 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-200"
            role="status"
          >
            Thanks — your details look valid. Connect your API to save submissions; we logged a preview
            in the browser console for development.
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
              <option value="">Select…</option>
              {SERVICE_TYPE_VALUES.map((v) => (
                <option key={v} value={v}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
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
              placeholder="Building name, street, district, city — as you would write on mail"
              className={`${inputClass} resize-y${errors.address ? inputErrorClass : ''}`}
              aria-invalid={Boolean(errors.address)}
              aria-describedby={errors.address ? 'err-address' : undefined}
              {...register('address')}
            />
            <p className="mt-1 text-xs text-white/45">
              10–500 characters. Any language / script is allowed.
            </p>
            {errors.address && (
              <p id="err-address" className="mt-1.5 text-sm text-red-300" role="alert">
                {errors.address.message}
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
              <option value="">Select country…</option>
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
              International format (E.164): start with <strong className="text-white/70">+</strong> and
              your country code, then the number (spaces optional). Example: +234 801 234 5678, +1 415
              555 2671.
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
              placeholder="Tell us about your location, capacity, or partnership goals…"
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

          <button
            type="submit"
            className="w-full rounded-full bg-pink-600 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Submit interest
          </button>
          <p className="text-center text-xs text-white/45">
            Form submission will be connected to your backend later.
          </p>
        </form>
      </main>
    </div>
  )
}
