import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendMail = vi.fn()

// `server-only` throws outside a react-server condition; the module under test
// is pure string-building, so stub it out.
vi.mock('server-only', () => ({}))
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail }) },
}))

/** Import fresh so the module-level SMTP config is read from the stubbed env. */
async function renderContact(data: { name: string; email: string; phone?: string; message: string }) {
  vi.stubEnv('SMTP_HOST', 'mail')
  vi.stubEnv('ORDER_INBOX_EMAIL', 'orders@nasteh.bg')
  vi.resetModules()
  const { sendContactEmail } = await import('./send')
  await sendContactEmail(data, '127.0.0.1')
  const call = sendMail.mock.calls.at(-1)?.[0] as { html: string; text: string } | undefined
  if (!call) throw new Error('sendMail was not called')
  return call
}

beforeEach(() => {
  sendMail.mockClear()
})

describe('email shell', () => {
  it('renders the fascia header with the Cyrillic wordmark', async () => {
    const { html } = await renderContact({ name: 'Иван', email: 'i@nasteh.bg', message: 'Здравейте' })
    expect(html).toContain('НАСТЕХ')
    // the dark bar, and the background on the <td> (Outlook drops it off a div)
    expect(html).toMatch(/<td[^>]+background:#221e19/)
    // The site's Latin look-alike mark must NOT be used here: email clients
    // strip webfonts, so "HACTEX" would fall back to a normal face and read as
    // a meaningless Latin word rather than „Настех".
    expect(html).not.toContain('HACTEX')
  })

  it('declares both colour schemes so dark-mode clients leave the bar alone', async () => {
    const { html } = await renderContact({ name: 'Иван', email: 'i@nasteh.bg', message: 'Здравейте' })
    expect(html).toContain('name="color-scheme"')
    expect(html).toContain('name="supported-color-schemes"')
  })
})

describe('customer-supplied content', () => {
  it('escapes markup before it reaches the owner inbox', async () => {
    const { html } = await renderContact({
      name: '<script>alert(1)</script>',
      email: '"onmouseover="alert(1)',
      message: 'a & b <img src=x onerror=alert(1)>',
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;script&gt;')
    // the address is interpolated into a mailto href — quotes must not break out
    expect(html).not.toContain('"onmouseover="')
  })
})

describe('order emails', () => {
  const order = {
    id: 1,
    orderNumber: 'NAS-20261114-TEST',
    createdAt: '2026-11-14T10:00:00.000Z',
    updatedAt: '2026-11-14T10:00:00.000Z',
    totalEurCents: 1290,
    customer: { name: 'Тест', phone: '0888123456', email: 'client@example.com', note: null },
    delivery: { method: 'адрес', addressOrOffice: 'ул. Тестова 1', city: 'Пловдив' },
    lines: [{ productId: 'p', itemSku: 'A1', itemName: 'Панта', unit: 'бр.', qty: 1, unitPriceEurCents: 1290, lineTotalEurCents: 1290 }],
  }

  async function load() {
    vi.stubEnv('SMTP_HOST', 'mail')
    vi.stubEnv('ORDER_INBOX_EMAIL', 'orders@nasteh.bg')
    vi.resetModules()
    return import('./send')
  }

  it('still sends the customer confirmation when the owner email fails, then reports the failure', async () => {
    const { sendOrderEmails } = await load()
    sendMail.mockImplementation(async (msg: { to: string }) => {
      if (msg.to === 'orders@nasteh.bg') throw new Error('owner inbox rejected')
    })
    await expect(sendOrderEmails(order as never, 'client@example.com')).rejects.toThrow(/owner/)
    const recipients = sendMail.mock.calls.map((c) => (c[0] as { to: string }).to)
    expect(recipients).toEqual(['orders@nasteh.bg', 'client@example.com'])
    sendMail.mockReset()
  })

  it('resolves when both sends succeed', async () => {
    const { sendOrderEmails } = await load()
    sendMail.mockResolvedValue({})
    await expect(sendOrderEmails(order as never, 'client@example.com')).resolves.toBeUndefined()
    expect(sendMail).toHaveBeenCalledTimes(2)
    sendMail.mockReset()
  })
})
