import { z } from 'zod'
import { normalizeInternationalPhone } from '../lib/providerFormValidation'

export const SERVICE_TYPE_VALUES = [
  'hotel',
  'spa',
  'restaurant',
  'venue',
  'experience',
  'other',
] as const

export type ProviderServiceTypeValue = (typeof SERVICE_TYPE_VALUES)[number]

const E164_OUTPUT = /^\+[1-9]\d{6,14}$/

/**
 * Builds the provider registration schema with a dynamic country whitelist (ISO alpha-2).
 */
export function createProviderRegistrationSchema(validCountryCodes: ReadonlySet<string>) {
  return z.object({
    businessName: z
      .string()
      .trim()
      .min(2, { message: 'Business name must be at least 2 characters.' })
      .max(120, { message: 'Business name must be at most 120 characters.' }),

    serviceType: z
      .string()
      .min(1, { message: 'Please select a type of service.' })
      .refine(
        (val): val is ProviderServiceTypeValue =>
          (SERVICE_TYPE_VALUES as readonly string[]).includes(val),
        { message: 'Please select a type of service.' },
      )
      .transform((s) => s as ProviderServiceTypeValue),

    email: z
      .string()
      .trim()
      .min(1, { message: 'Email is required.' })
      .max(254, { message: 'Email is too long.' })
      .pipe(z.email({ error: () => ({ message: 'Enter a valid email address.' }) })),

    address: z
      .string()
      .transform((s) => s.trim().replace(/\r\n/g, '\n'))
      .refine((s) => s.length >= 10, {
        message: 'Address must be at least 10 characters (street, building, area).',
      })
      .refine((s) => s.length <= 500, {
        message: 'Address must be at most 500 characters.',
      })
      .refine((s) => /[\p{L}\p{N}]/u.test(s), {
        message: 'Address must include letters or numbers.',
      }),

    country: z
      .string()
      .trim()
      .transform((s) => s.toUpperCase())
      .refine((s) => s.length === 2, { message: 'Please select a country.' })
      .refine((s) => validCountryCodes.has(s), {
        message: 'Please choose a valid country from the list.',
      }),

    phone: z
      .string()
      .trim()
      .min(1, { message: 'Phone number is required.' })
      .refine((s) => s.startsWith('+'), {
        message: 'Include country code with + (e.g. +44 for UK, +234 for Nigeria).',
      })
      .transform((s) => normalizeInternationalPhone(s))
      .refine((s) => E164_OUTPUT.test(s), {
        message: 'Use a valid international number: + and 7–15 digits (e.g. +44 20 7946 0958).',
      }),

    notes: z
      .string()
      .trim()
      .max(2000, { message: 'Message must be at most 2000 characters.' })
      .optional()
      .default(''),
  })
}

export type ProviderRegistrationSchema = ReturnType<typeof createProviderRegistrationSchema>

/** Form default shape (react-hook-form) */
export type ProviderRegistrationFormInput = z.input<ProviderRegistrationSchema>

/** Parsed / API-ready shape after Zod transforms */
export type ProviderRegistrationOutput = z.output<ProviderRegistrationSchema>
