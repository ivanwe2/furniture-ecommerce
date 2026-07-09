import { z } from 'zod'

const phoneRegex = /^[\d\s+]{9,}$/

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'errors.required'),
  phone: z.string().trim().regex(phoneRegex, 'errors.invalidPhone').optional(),
  email: z.string().trim().email('errors.invalidEmail'),
  message: z.string().trim().min(10, 'errors.required'),
  turnstileToken: z.string().trim().min(1, 'errors.required'),
})

export type ContactInput = z.infer<typeof contactSchema>
