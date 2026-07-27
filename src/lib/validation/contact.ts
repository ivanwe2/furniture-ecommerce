import { z } from 'zod'

const phoneRegex = /^[\d\s+]{9,}$/

// See checkout.ts — same reasoning: Next's 1 MB action limit is not a validation
// bound, so cap every free-text field explicitly.
const MAX_SHORT = 120 // name, phone, email
const MAX_MESSAGE = 5000

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'errors.required').max(MAX_SHORT, 'errors.tooLong'),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'errors.invalidPhone')
    .max(MAX_SHORT, 'errors.tooLong')
    .optional(),
  email: z.string().trim().email('errors.invalidEmail').max(MAX_SHORT, 'errors.tooLong'),
  message: z.string().trim().min(10, 'errors.required').max(MAX_MESSAGE, 'errors.tooLong'),
  altcha: z.string().trim().min(1, 'errors.captcha').max(4096, 'errors.captcha'),
})

export type ContactInput = z.infer<typeof contactSchema>
