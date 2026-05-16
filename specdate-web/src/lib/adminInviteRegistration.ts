import { getApiBase, pickApiError } from './adminApi'

async function parseJson(response: Response) {
  return response.json().catch(() => null)
}

export async function validateAdminInvite(token: string) {
  const query = new URLSearchParams({ token })
  const response = await fetch(`${getApiBase()}/api/admin-invites/validate?${query.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  const result = await parseJson(response)
  if (!response.ok) {
    throw new Error(pickApiError(result, 'This admin invite is invalid or expired.'))
  }
  return result?.data as { name?: string | null; email: string; expires_at: string }
}

export async function sendAdminInviteOtp(token: string) {
  const response = await fetch(`${getApiBase()}/api/admin-invites/send-otp`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  const result = await parseJson(response)
  if (!response.ok) {
    throw new Error(pickApiError(result, 'Verification code could not be sent.'))
  }
}

export async function registerAdminInvite(payload: {
  token: string
  name: string
  username: string
  email: string
  password: string
  password_confirmation: string
  otp_code: string
}) {
  const response = await fetch(`${getApiBase()}/api/admin-invites/register`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const result = await parseJson(response)
  if (!response.ok) {
    throw new Error(pickApiError(result, 'Admin registration could not be completed.'))
  }
}
