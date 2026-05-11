import { z } from 'zod'

export const providerPasswordSetupSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters.' })
      .max(128, { message: 'Password must be at most 128 characters.' }),
    passwordConfirmation: z.string().min(1, { message: 'Confirm your password.' }),
    termsAccepted: z.boolean().refine((value) => value, {
      message: 'You must accept the provider terms to continue.',
    }),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Passwords do not match.',
    path: ['passwordConfirmation'],
  })

export type ProviderPasswordSetupInput = z.input<typeof providerPasswordSetupSchema>
export type ProviderPasswordSetupOutput = z.output<typeof providerPasswordSetupSchema>
