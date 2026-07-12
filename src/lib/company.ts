/**
 * Canonical store contact details for Настех ООД.
 *
 * Single source of truth for the storefront footer, contact page,
 * LocalBusiness schema, and order/contact emails, so the address and phone
 * never drift between them. The Payload `site-settings` global mirrors these
 * as owner-editable defaults; wiring that global into the storefront is a
 * post-launch item.
 */
export interface CompanyInfo {
  name: string
  city: string
  addressLine: string
  phoneDisplay: string
  phoneHref: string
  email: string
  emailHref: string
  workingHours: { weekdays: string; saturday: string }
}

export const company: CompanyInfo = {
  name: 'Настех ООД',
  city: 'Пловдив',
  addressLine: 'ул. „Жан Жорес“ 9',
  phoneDisplay: '0898 272 567',
  phoneHref: 'tel:+359898272567',
  email: 'nastehsales@gmail.com',
  emailHref: 'mailto:nastehsales@gmail.com',
  workingHours: {
    weekdays: 'Пон-Пет: 08:30-17:30',
    saturday: 'Съб: 09:00-14:00',
  },
}
