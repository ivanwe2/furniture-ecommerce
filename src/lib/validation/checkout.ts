import { z } from 'zod'

const phoneRegex = /^[\d\s+]{9,}$/

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, 'errors.required'),
  phone: z.string().trim().regex(phoneRegex, 'errors.invalidPhone').min(9, 'errors.required'),
  email: z.string().trim().email('errors.invalidEmail'),
  method: z.enum(['address', 'econt', 'speedy'], { errorMap: () => ({ message: 'errors.required' }) }),
  city: z.string().trim().min(2, 'errors.required'),
  addressOrOffice: z.string().trim().min(2, 'errors.required'),
  note: z.string().optional(),
  turnstileToken: z.string().trim().min(1, 'errors.required'),
  consent: z.literal(true, { errorMap: () => ({ message: 'errors.consentRequired' }) }),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>
