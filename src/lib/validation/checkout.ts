import { z } from 'zod'

const phoneRegex = /^[\d\s+]{9,}$/

// Upper bounds on every free-text field. Next caps a server action body at 1 MB,
// but without these a single order could still carry ~1 MB of text into the DB
// and into the owner's inbox. Generous enough that no real order is refused.
const MAX_SHORT = 120 // name, phone, email, city
const MAX_ADDRESS = 300
const MAX_NOTE = 2000

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, 'errors.required').max(MAX_SHORT, 'errors.tooLong'),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'errors.invalidPhone')
    .min(9, 'errors.required')
    .max(MAX_SHORT, 'errors.tooLong'),
  email: z.string().trim().email('errors.invalidEmail').max(MAX_SHORT, 'errors.tooLong'),
  method: z.enum(['address', 'econt', 'speedy'], { errorMap: () => ({ message: 'errors.required' }) }),
  city: z.string().trim().min(2, 'errors.required').max(MAX_SHORT, 'errors.tooLong'),
  addressOrOffice: z.string().trim().min(2, 'errors.required').max(MAX_ADDRESS, 'errors.tooLong'),
  note: z.string().max(MAX_NOTE, 'errors.tooLong').optional(),
  // The Altcha payload is a base64 blob; 4 KB is far above a real solution.
  altcha: z.string().trim().min(1, 'errors.captcha').max(4096, 'errors.captcha'),
  consent: z.literal(true, { errorMap: () => ({ message: 'errors.consentRequired' }) }),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>
