/**
 * Validation helpers for global provider registration (addresses + E.164-style phone).
 */

/** Remove spaces, dashes, parentheses; keep leading + and digits only after first char */
export function normalizeInternationalPhone(input: string): string {
  const t = input.trim()
  if (t.length === 0) return ''
  const hasPlus = t.startsWith('+')
  const digits = t.replace(/\D/g, '')
  if (!hasPlus) {
    // If user omitted +, reject — we require explicit country code
    return digits.length > 0 ? `+${digits}` : ''
  }
  return `+${digits}`
}

/**
 * E.164: optional +, then country code + subscriber number, max 15 digits total (excluding +).
 * Requires leading + and first digit after + is 1–9 (no leading 0 on country code).
 */
const E164_REGEX = /^\+[1-9]\d{6,14}$/

export function validateInternationalPhone(input: string): { ok: true; normalized: string } | { ok: false; message: string } {
  const raw = input.trim()
  if (raw.length === 0) {
    return { ok: false, message: 'Phone number is required.' }
  }
  if (!raw.startsWith('+')) {
    return { ok: false, message: 'Include country code with + (e.g. +44 for UK, +234 for Nigeria).' }
  }
  const normalized = normalizeInternationalPhone(raw)
  if (!E164_REGEX.test(normalized)) {
    return {
      ok: false,
      message: 'Use a valid international number: + and 7–15 digits (e.g. +44 20 7946 0958).',
    }
  }
  return { ok: true, normalized }
}

const ADDRESS_MIN = 10
const ADDRESS_MAX = 500

export function validateAddress(input: string): { ok: true; value: string } | { ok: false; message: string } {
  const value = input.trim().replace(/\r\n/g, '\n')
  if (value.length < ADDRESS_MIN) {
    return { ok: false, message: `Address must be at least ${ADDRESS_MIN} characters (street, building, area).` }
  }
  if (value.length > ADDRESS_MAX) {
    return { ok: false, message: `Address must be at most ${ADDRESS_MAX} characters.` }
  }
  // At least one letter or digit (allows international scripts)
  if (!/[\p{L}\p{N}]/u.test(value)) {
    return { ok: false, message: 'Address must include letters or numbers.' }
  }
  return { ok: true, value }
}

export function validateCountryCode(
  code: string,
  validCodes: ReadonlySet<string>,
): { ok: true; code: string } | { ok: false; message: string } {
  const c = code.trim().toUpperCase()
  if (!c) {
    return { ok: false, message: 'Please select a country.' }
  }
  if (!/^[A-Z]{2}$/.test(c)) {
    return { ok: false, message: 'Invalid country selection.' }
  }
  if (!validCodes.has(c)) {
    return { ok: false, message: 'Please choose a valid country from the list.' }
  }
  return { ok: true, code: c }
}

export function validateEmail(input: string): { ok: true; value: string } | { ok: false; message: string } {
  const value = input.trim()
  if (!value) {
    return { ok: false, message: 'Email is required.' }
  }
  // Practical RFC 5322–oriented pattern (not exhaustive)
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  if (!emailRegex.test(value) || value.length > 254) {
    return { ok: false, message: 'Enter a valid email address.' }
  }
  return { ok: true, value }
}

export function validateBusinessName(input: string): { ok: true; value: string } | { ok: false; message: string } {
  const value = input.trim()
  if (value.length < 2) {
    return { ok: false, message: 'Business name must be at least 2 characters.' }
  }
  if (value.length > 120) {
    return { ok: false, message: 'Business name must be at most 120 characters.' }
  }
  return { ok: true, value }
}
