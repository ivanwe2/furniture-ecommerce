'use server'
import 'server-only'

import nodemailer, { type Transporter } from 'nodemailer'
import { company } from '@/lib/company'
import { formatEur } from '@/lib/money'
import type { Order } from '@/payload-types'

const SMTP_HOST = process.env.SMTP_HOST ?? ''
const SMTP_PORT = Number(process.env.SMTP_PORT ?? '587')
const SMTP_USER = process.env.SMTP_USER ?? ''
const SMTP_PASS = process.env.SMTP_PASS ?? ''
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'Настех <no-reply@nasteh.bg>'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nasteh.bg'
const ORDER_INBOX_EMAIL = process.env.ORDER_INBOX_EMAIL ?? ''

let transporter: Transporter | null = null

/**
 * Lazily build the SMTP transport from env. Returns null when SMTP is
 * unconfigured (local dev) so email is skipped rather than throwing. Works
 * against any authenticated SMTP endpoint the sysadmin points us at (the
 * domain's mail host, Workspace relay, or a local relay with no auth).
 */
function getTransporter(): Transporter | null {
  if (!SMTP_HOST) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // 465 = implicit TLS; 587 = STARTTLS (upgraded automatically)
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      // No-auth = the in-stack `mail` relay on the trusted internal network
      // (self-signed / opportunistic TLS) → don't fail on its cert. An authed
      // endpoint is a real external smarthost → keep strict cert validation.
      tls: SMTP_USER ? undefined : { rejectUnauthorized: false },
    })
  }
  return transporter
}

async function sendEmail(to: string, subject: string, html: string, text: string, replyTo?: string) {
  const tx = getTransporter()
  if (!tx) {
    console.log('[email] dev mode - skipped (no SMTP_HOST)', { to, subject })
    return
  }
  await tx.sendMail({ from: EMAIL_FROM, to, subject, html, text, replyTo })
}

interface OrderLine {
  itemName: string
  itemSku: string
  unit: string
  qty: number
  unitPriceEurCents: number
  lineTotalEurCents: number
}

function normalizeLines(orderLines: Order['lines']): OrderLine[] {
  if (!orderLines) return []
  return orderLines.map((l) => ({
    itemName: l.itemName ?? '',
    itemSku: l.itemSku ?? '',
    unit: l.unit ?? 'бр.',
    qty: l.qty,
    unitPriceEurCents: l.unitPriceEurCents,
    lineTotalEurCents: l.lineTotalEurCents,
  }))
}

/** Bulgarian long date + time from an ISO timestamp (order.createdAt). */
function formatOrderDate(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date()
  try {
    return new Intl.DateTimeFormat('bg-BG', { dateStyle: 'long', timeStyle: 'short' }).format(d)
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ')
  }
}

export async function sendOrderEmails(order: Order, customerEmail: string) {
  const orderNumber = (order.orderNumber ?? '') as string
  const orderDate = formatOrderDate(order.createdAt)
  const lines = normalizeLines(order.lines)
  const totalFormatted = formatEur(order.totalEurCents)

  // Owner email
  if (ORDER_INBOX_EMAIL) {
    await sendEmail(
      ORDER_INBOX_EMAIL,
      `Нова поръчка ${orderNumber} - ${totalFormatted}`,
      orderOwnerHtml({ orderNumber, orderDate, totalEurCents: order.totalEurCents, customerName: order.customer.name, customerPhone: order.customer.phone, customerEmail: order.customer.email, deliveryMethod: order.delivery.method, addressOrOffice: order.delivery.addressOrOffice, city: order.delivery.city, note: order.customer.note, lines }),
      orderOwnerText({ orderNumber, orderDate, totalEurCents: order.totalEurCents, customerName: order.customer.name, customerPhone: order.customer.phone, customerEmail: order.customer.email, deliveryMethod: order.delivery.method, addressOrOffice: order.delivery.addressOrOffice, city: order.delivery.city, note: order.customer.note, lines }),
    )
  }

  // Customer email
  await sendEmail(
    customerEmail,
    `Потвърждение на поръчка ${orderNumber} - Настех`,
    orderCustomerHtml({ orderNumber, orderDate, totalEurCents: order.totalEurCents, deliveryMethod: order.delivery.method, addressOrOffice: order.delivery.addressOrOffice, city: order.delivery.city, lines }),
    orderCustomerText({ orderNumber, orderDate, totalEurCents: order.totalEurCents, deliveryMethod: order.delivery.method, addressOrOffice: order.delivery.addressOrOffice, city: order.delivery.city, lines }),
    ORDER_INBOX_EMAIL,
  )
}

export async function sendContactEmail(data: { name: string; email: string; phone?: string; message: string }, _ip: string) {
  if (!ORDER_INBOX_EMAIL) return

  await sendEmail(
    ORDER_INBOX_EMAIL,
    `Запитване от сайта - ${data.name}`,
    contactOwnerHtml({ name: data.name, email: data.email, phone: data.phone, message: data.message }),
    contactOwnerText({ name: data.name, email: data.email, phone: data.phone, message: data.message }),
  )
}

// --- Brand palette (emails need inline hex; mirrors the storefront tokens) ---
const C = {
  page: '#f5f1e8', // cream page background
  panel: '#ffffff', // content card
  ink: '#26211d', // headings / body
  muted: '#6e665a', // secondary text
  bronze: '#785a3a', // wordmark + links/accents (the logo bronze)
  line: '#e4ddce', // hairlines
  thead: '#efe9dc', // table header fill
}
const FONT = "'Golos Text', -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
const MONO = "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace"

/**
 * HTML-escape a value before interpolating it into an email body. Order/contact
 * fields (name, address, note, message, …) are customer-supplied and land in the
 * OWNER's inbox — without this, a customer could inject markup/links there.
 * Covers text content and double-quoted attribute values (e.g. `href`).
 */
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Wordmark header — the logo's uppercase, letter-spaced bronze lockup. */
function header(): string {
  return `<tr><td style="padding:28px 24px 20px;border-bottom:1px solid ${C.line};">
<div style="font-family:${FONT};font-size:22px;font-weight:700;letter-spacing:0.16em;color:${C.bronze};">НАСТЕХ</div>
<div style="font-family:${MONO};font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:${C.muted};margin-top:5px;">Мебелен обков</div>
</td></tr>`
}

function footer(): string {
  return `<tr><td style="padding:18px 24px;font-size:11px;line-height:1.6;color:${C.muted};border-top:1px solid ${C.line};">
${company.name} · ЕИК ${company.eik} · ${company.addressLine}, гр. ${company.city}<br/>
${company.phoneDisplay} · ${company.email}
</td></tr>`
}

/** Wrap inner content in the branded, email-safe outer shell. */
function shell(inner: string): string {
  return `<!DOCTYPE html><html lang="bg"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:${C.page};font-family:${FONT};color:${C.ink};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.panel};border:1px solid ${C.line};">
${header()}
<tr><td style="padding:24px;">${inner}</td></tr>
${footer()}
</table></td></tr></table></body></html>`
}

function eyebrow(text: string): string {
  return `<div style="font-family:${MONO};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${C.bronze};">${text}</div>`
}

/** Shared items table (owner + customer). Total row carries the ДДС note. */
function itemsTable(lines: OrderLine[], totalEurCents: number): string {
  const th = `padding:8px 6px;border-bottom:2px solid ${C.line};font-family:${MONO};font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${C.muted};`
  const td = `padding:9px 6px;border-bottom:1px solid ${C.line};font-size:13px;color:${C.ink};`
  const rows = lines.map((l) => `<tr>
<td style="${td}">${esc(l.itemName)}<br/><span style="font-family:${MONO};font-size:11px;color:${C.muted};">${esc(l.itemSku)}</span></td>
<td style="${td}text-align:center;white-space:nowrap;">${l.qty} ${esc(l.unit)}</td>
<td style="${td}text-align:right;white-space:nowrap;">${formatEur(l.unitPriceEurCents)}</td>
<td style="${td}text-align:right;white-space:nowrap;">${formatEur(l.lineTotalEurCents)}</td>
</tr>`).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:14px 0 6px;">
<tr><th align="left" style="${th}">Артикул</th><th align="center" style="${th}">Кол.</th><th align="right" style="${th}">Цена</th><th align="right" style="${th}">Общо</th></tr>
${rows}
<tr><td colspan="3" align="right" style="padding:12px 6px 4px;font-weight:700;font-size:15px;color:${C.ink};">Общо (с ДДС):</td><td align="right" style="padding:12px 6px 4px;font-weight:700;font-size:15px;color:${C.ink};">${formatEur(totalEurCents)}</td></tr>
</table>`
}

function link(href: string, label: string): string {
  return `<a href="${esc(href)}" style="color:${C.bronze};">${esc(label)}</a>`
}

// --- HTML templates ---

function orderOwnerHtml(d: {
  orderNumber: string; orderDate: string; totalEurCents: number; customerName: string; customerPhone: string; customerEmail: string;
  deliveryMethod: string; addressOrOffice: string; city: string; note?: string | null;
  lines: OrderLine[]
}): string {
  const row = `padding:3px 0;font-size:14px;color:${C.ink};`
  return shell(`
${eyebrow('Нова поръчка')}
<h1 style="margin:4px 0 2px;font-size:22px;color:${C.ink};">№ ${d.orderNumber}</h1>
<div style="font-size:13px;color:${C.muted};">${d.orderDate}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
<tr><td style="${row}"><strong>Клиент:</strong> ${esc(d.customerName)}</td></tr>
<tr><td style="${row}">${link('tel:' + d.customerPhone, d.customerPhone)}</td></tr>
<tr><td style="${row}">${link('mailto:' + d.customerEmail, d.customerEmail)}</td></tr>
<tr><td style="${row}"><strong>Доставка:</strong> ${esc(d.deliveryMethod)} — ${esc(d.city)}, ${esc(d.addressOrOffice)}</td></tr>
</table>
${itemsTable(d.lines, d.totalEurCents)}
${d.note ? `<p style="font-size:13px;color:${C.muted};margin:10px 0 0;"><strong>Бележка:</strong> ${esc(d.note)}</p>` : ''}
<p style="font-size:12px;color:${C.muted};margin:16px 0 0;">${link(SITE_URL + '/admin/collections/orders', 'Виж в административния панел →')}</p>`)
}

function orderOwnerText(d: {
  orderNumber: string; orderDate: string; totalEurCents: number; customerName: string; customerPhone: string; customerEmail: string;
  deliveryMethod: string; addressOrOffice: string; city: string; note?: string | null;
  lines: OrderLine[]
}): string {
  return [
    `Нова поръчка ${d.orderNumber} - ${formatEur(d.totalEurCents)}`,
    d.orderDate,
    '',
    `Клиент: ${d.customerName}`, `${d.customerPhone}`, `${d.customerEmail}`,
    '',
    `Доставка: ${d.deliveryMethod} - ${d.city}, ${d.addressOrOffice}`,
    '',
    ...d.lines.map((l) => `${l.itemName} (${l.itemSku}) ${l.qty} ${l.unit} x ${formatEur(l.unitPriceEurCents)} = ${formatEur(l.lineTotalEurCents)}`),
    '',
    `Общо (с ДДС): ${formatEur(d.totalEurCents)}`,
    ...(d.note ? ['', `Бележка: ${d.note}`] : []),
  ].join('\n')
}

function orderCustomerHtml(d: {
  orderNumber: string; orderDate: string; totalEurCents: number;
  deliveryMethod: string; addressOrOffice: string; city: string;
  lines: OrderLine[]
}): string {
  return shell(`
${eyebrow('Потвърждение на поръчка')}
<h1 style="margin:4px 0 2px;font-size:22px;color:${C.ink};">№ ${d.orderNumber}</h1>
<div style="font-size:13px;color:${C.muted};">${d.orderDate}</div>
<p style="font-size:14px;line-height:1.6;margin:16px 0;color:${C.ink};">Благодарим Ви за поръчката! Ще се свържем с Вас по телефона за потвърждение.</p>
${itemsTable(d.lines, d.totalEurCents)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 0;">
<tr><td style="padding:3px 0;font-size:13px;color:${C.muted};"><strong style="color:${C.ink};">Доставка:</strong> ${esc(d.deliveryMethod)} — ${esc(d.city)}, ${esc(d.addressOrOffice)}</td></tr>
<tr><td style="padding:3px 0;font-size:13px;color:${C.muted};"><strong style="color:${C.ink};">Плащане:</strong> при доставка (наложен платеж). Цените са с включено ДДС.</td></tr>
</table>
<hr style="border:none;border-top:1px solid ${C.line};margin:18px 0;"/>
<p style="font-size:12px;line-height:1.6;color:${C.muted};margin:0;">
<strong style="color:${C.ink};">Продавач:</strong> ${company.name}, ЕИК ${company.eik}<br/>
${company.addressLine}, гр. ${company.city} · ${link(company.phoneHref, company.phoneDisplay)} · ${link(company.emailHref, company.email)}<br/>
${link(SITE_URL + '/returns', 'Право на отказ →')}</p>`)
}

function orderCustomerText(d: {
  orderNumber: string; orderDate: string; totalEurCents: number;
  deliveryMethod: string; addressOrOffice: string; city: string;
  lines: OrderLine[]
}): string {
  return [
    `Потвърждение на поръчка ${d.orderNumber} - Настех`,
    d.orderDate,
    '',
    'Благодарим Ви за поръчката! Ще се свържем с Вас по телефона за потвърждение.',
    '',
    ...d.lines.map((l) => `${l.itemName} (${l.itemSku}) ${l.qty} ${l.unit} x ${formatEur(l.unitPriceEurCents)} = ${formatEur(l.lineTotalEurCents)}`),
    '',
    `Общо (с ДДС): ${formatEur(d.totalEurCents)}`,
    '',
    `Доставка: ${d.deliveryMethod} - ${d.city}, ${d.addressOrOffice}`,
    'Плащане при доставка (наложен платеж). Цените са с включено ДДС.',
    '',
    `${company.name}, ЕИК ${company.eik} · ${company.addressLine}, гр. ${company.city}`,
    `${company.phoneDisplay} · ${company.email}`,
  ].join('\n')
}

function contactOwnerHtml(d: { name: string; email: string; phone?: string; message: string }): string {
  const row = `padding:3px 0;font-size:14px;color:${C.ink};`
  return shell(`
${eyebrow('Запитване от сайта')}
<h1 style="margin:4px 0 12px;font-size:22px;color:${C.ink};">${esc(d.name)}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
${d.email ? `<tr><td style="${row}">${link('mailto:' + d.email, d.email)}</td></tr>` : ''}
${d.phone ? `<tr><td style="${row}">${link('tel:' + d.phone, d.phone)}</td></tr>` : ''}
</table>
<div style="background:${C.page};border:1px solid ${C.line};padding:14px;font-size:14px;line-height:1.6;white-space:pre-wrap;color:${C.ink};">${esc(d.message)}</div>
<p style="font-size:12px;color:${C.muted};margin:14px 0 0;">${link(SITE_URL + '/admin', 'Административен панел →')}</p>`)
}

function contactOwnerText(d: { name: string; email: string; phone?: string; message: string }): string {
  return [
    `Запитване от сайта - ${d.name}`,
    '',
    `Име: ${d.name}`,
    d.email ? `Имейл: ${d.email}` : '',
    d.phone ? `Телефон: ${d.phone}` : '',
    '',
    d.message,
  ].filter(Boolean).join('\n')
}
