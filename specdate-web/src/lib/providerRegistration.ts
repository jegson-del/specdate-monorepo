import { getApiOrigin } from './apiBase'

export type ProviderRegistrationPayload = {
  business_name: string
  service_type: string
  email: string
  address: string
  city: string
  postcode: string
  country_code: string
  country_name: string
  phone: string
  notes: string
  invite_token?: string
}

export type ProviderRegistrationErrorResponse = {
  message?: string
  errors?: Record<string, string[]>
  data?: { errors?: Record<string, string[]> }
}

export const PROVIDER_REGISTRATION_STORAGE_KEY = 'dateusher.providerRegistration.pending'

export function getApiBase() {
  return getApiOrigin()
}

export function extractProviderRegistrationError(result: unknown, fallback: string) {
  if (!result || typeof result !== 'object') return fallback

  const response = result as ProviderRegistrationErrorResponse

  return (
    response.message ||
    response.errors?.otp_code?.[0] ||
    response.errors?.email?.[0] ||
    response.errors?.phone?.[0] ||
    response.data?.errors?.otp_code?.[0] ||
    fallback
  )
}

export async function sendProviderEmailOtp(email: string) {
  const response = await fetch(`${getApiBase()}/api/send-otp`, {
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
    throw new Error(
      extractProviderRegistrationError(
        result,
        'We could not send the verification code. Please check the email and try again.',
      ),
    )
  }
}

export async function validateProviderInvite(token: string) {
  const query = new URLSearchParams({ token })
  const response = await fetch(`${getApiBase()}/api/provider-invites/validate?${query.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(extractProviderRegistrationError(result, 'This provider invite is invalid or expired.'))
  }

  return result?.data as {
    provider_name: string
    email: string
    service_type?: string | null
    personal_message?: string | null
  }
}

export async function submitProviderRegistration(
  payload: ProviderRegistrationPayload,
  otpCode: string,
) {
  const response = await fetch(`${getApiBase()}/api/provider-registrations`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      otp_code: otpCode,
    }),
  })
  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      extractProviderRegistrationError(
        result,
        'We could not submit your provider application. Please check the code and try again.',
      ),
    )
  }
}
