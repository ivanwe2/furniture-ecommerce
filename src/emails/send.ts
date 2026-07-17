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

export async function sendOrderEmails(order: Order, customerEmail: string) {
  const orderNumber = (order.orderNumber ?? '') as string
  const totalFormatted = formatEur(order.totalEurCents)
  const lines = normalizeLines(order.lines)

  // Owner email
  if (ORDER_INBOX_EMAIL) {
    await sendEmail(
      ORDER_INBOX_EMAIL,
      `Нова поръчка ${orderNumber} - ${totalFormatted}`,
      orderOwnerHtml({ orderNumber, totalEurCents: order.totalEurCents, customerName: order.customer.name, customerPhone: order.customer.phone, customerEmail: order.customer.email, deliveryMethod: order.delivery.method, addressOrOffice: order.delivery.addressOrOffice, city: order.delivery.city, note: order.customer.note, lines }),
      orderOwnerText({ orderNumber, totalEurCents: order.totalEurCents, customerName: order.customer.name, customerPhone: order.customer.phone, customerEmail: order.customer.email, deliveryMethod: order.delivery.method, addressOrOffice: order.delivery.addressOrOffice, city: order.delivery.city, note: order.customer.note, lines }),
    )
  }

  // Customer email
  await sendEmail(
    customerEmail,
    `Потвърждение на поръчка ${orderNumber} - Настех`,
    orderCustomerHtml({ orderNumber, totalEurCents: order.totalEurCents, deliveryMethod: order.delivery.method, addressOrOffice: order.delivery.addressOrOffice, city: order.delivery.city, lines }),
    orderCustomerText({ orderNumber, totalEurCents: order.totalEurCents, deliveryMethod: order.delivery.method, addressOrOffice: order.delivery.addressOrOffice, city: order.delivery.city, lines }),
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

// --- HTML templates ---

function orderOwnerHtml(d: {
  orderNumber: string; totalEurCents: number; customerName: string; customerPhone: string; customerEmail: string;
  deliveryMethod: string; addressOrOffice: string; city: string; note?: string | null;
  lines: OrderLine[]
}): string {
  return `
<!DOCTYPE html><html lang="bg"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;font-family:sans-serif;background:#F6F3EC;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
<tr><td style="padding:24px 20px;border-bottom:1px solid #d4cfc5;background:#F6F3EC;">
<strong style="font-size:18px;color:#8A6D3B;">НАСТЕХ</strong>
</td></tr>
<tr><td style="padding:20px;">
<h2 style="margin:0 0 12px;font-size:16px;">Нова поръчка ${d.orderNumber} - ${formatEur(d.totalEurCents)}</h2>
<table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
<tr><td style="padding:4px 0;font-size:14px;"><strong>Клиент:</strong> ${d.customerName}</td></tr>
<tr><td style="padding:4px 0;font-size:14px;"><a href="tel:${d.customerPhone}" style="color:#8A6D3B;">${d.customerPhone}</a></td></tr>
<tr><td style="padding:4px 0;font-size:14px;"><a href="mailto:${d.customerEmail}" style="color:#8A6D3B;">${d.customerEmail}</a></td></tr>
</table>
<table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
<tr><td style="padding:4px 0;font-size:14px;"><strong>Доставка:</strong> ${d.deliveryMethod}</td></tr>
<tr><td style="padding:4px 0;font-size:14px;">${d.city} - ${d.addressOrOffice}</td></tr>
</table>
<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:16px;">
<tr style="background:#d4cfc5;"><th style="padding:8px;text-align:left;font-size:12px;">Артикул</th><th style="padding:8px;text-align:center;font-size:12px;">Код</th><th style="padding:8px;text-align:right;font-size:12px;">Цена</th><th style="padding:8px;text-align:center;font-size:12px;">Кол.</th><th style="padding:8px;text-align:right;font-size:12px;">Общо</th></tr>
${d.lines.map(l => `<tr style="border-bottom:1px solid #d4cfc5;"><td style="padding:8px;font-size:13px;">${l.itemName}</td><td style="padding:8px;text-align:center;font-size:12px;font-family:monospace;">${l.itemSku}</td><td style="padding:8px;text-align:right;font-size:13px;">${formatEur(l.unitPriceEurCents)}</td><td style="padding:8px;text-align:center;font-size:13px;">${l.qty}</td><td style="padding:8px;text-align:right;font-size:13px;">${formatEur(l.lineTotalEurCents)}</td></tr>`).join('')}
<tr style="background:#d4cfc5;"><td colspan="4" style="padding:8px;text-align:right;font-weight:bold;font-size:14px;">Общо:</td><td style="padding:8px;text-align:right;font-size:14px;font-weight:bold;">${formatEur(d.totalEurCents)}</td></tr>
</table>
${d.note ? `<p style="font-size:13px;color:#6b6559;margin:0 0 12px;"><strong>Бележка:</strong> ${d.note}</p>` : ''}
<p style="font-size:12px;color:#6b6559;margin:0;"><a href="${SITE_URL}/admin/collections/orders" style="color:#8A6D3B;">Види в административния панел →</a></p>
</td></tr>
<tr><td style="padding:16px 20px;font-size:11px;color:#6b6559;border-top:1px solid #d4cfc5;">
${company.name} · ${company.addressLine}, гр. ${company.city} · ${company.phoneDisplay}
</td></tr>
</table>
</body></html>`
}

function orderOwnerText(d: {
  orderNumber: string; totalEurCents: number; customerName: string; customerPhone: string; customerEmail: string;
  deliveryMethod: string; addressOrOffice: string; city: string; note?: string | null;
  lines: OrderLine[]
}): string {
  return [
    `Нова поръчка ${d.orderNumber} - ${formatEur(d.totalEurCents)}`,
    '',
    `Клиент: ${d.customerName}`, `${d.customerPhone}`, `${d.customerEmail}`,
    '',
    `Доставка: ${d.deliveryMethod}`, `${d.city} - ${d.addressOrOffice}`,
    '',
    ...d.lines.map(l => `${l.itemName} (${l.itemSku}) x${l.qty} = ${formatEur(l.lineTotalEurCents)}`),
    '',
    `Общо: ${formatEur(d.totalEurCents)}`,
  ].join('\n')
}

function orderCustomerHtml(d: {
  orderNumber: string; totalEurCents: number;
  deliveryMethod: string; addressOrOffice: string; city: string;
  lines: OrderLine[]
}): string {
  return `
<!DOCTYPE html><html lang="bg"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;font-family:sans-serif;background:#F6F3EC;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
<tr><td style="padding:24px 20px;border-bottom:1px solid #d4cfc5;background:#F6F3EC;">
<strong style="font-size:18px;color:#8A6D3B;">НАСТЕХ</strong>
</td></tr>
<tr><td style="padding:20px;">
<h2 style="margin:0 0 12px;font-size:16px;">Потвърждение на поръчка ${d.orderNumber}</h2>
<p style="font-size:14px;margin:0 0 16px;">Благодарим Ви за поръчката. Ще се свържем с Вас по телефона за потвърждение.</p>
<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:16px;">
<tr style="background:#d4cfc5;"><th style="padding:8px;text-align:left;font-size:12px;">Артикул</th><th style="padding:8px;text-align:center;font-size:12px;">Код</th><th style="padding:8px;text-align:right;font-size:12px;">Цена</th><th style="padding:8px;text-align:center;font-size:12px;">Кол.</th><th style="padding:8px;text-align:right;font-size:12px;">Общо</th></tr>
${d.lines.map(l => `<tr style="border-bottom:1px solid #d4cfc5;"><td style="padding:8px;font-size:13px;">${l.itemName}</td><td style="padding:8px;text-align:center;font-size:12px;font-family:monospace;">${l.itemSku}</td><td style="padding:8px;text-align:right;font-size:13px;">${formatEur(l.unitPriceEurCents)}</td><td style="padding:8px;text-align:center;font-size:13px;">${l.qty}</td><td style="padding:8px;text-align:right;font-size:13px;">${formatEur(l.lineTotalEurCents)}</td></tr>`).join('')}
<tr style="background:#d4cfc5;"><td colspan="4" style="padding:8px;text-align:right;font-weight:bold;font-size:14px;">Общо:</td><td style="padding:8px;text-align:right;font-size:14px;font-weight:bold;">${formatEur(d.totalEurCents)}</td></tr>
</table>
<p style="font-size:13px;color:#6b6559;margin:0 0 12px;"><strong>Доставка:</strong> ${d.deliveryMethod} - ${d.addressOrOffice}, ${d.city}</p>
<p style="font-size:13px;color:#6b6559;margin:0 0 12px;">Плащане при доставка (наложен платеж).</p>
<hr style="border:none;border-top:1px solid #d4cfc5;margin:16px 0;"/>
<p style="font-size:12px;color:#6b6559;margin:0;"><strong>Продавач:</strong> ${company.name}, ${company.addressLine}, гр. ${company.city}</p>
<p style="font-size:12px;color:#6b6559;margin:4px 0 0;"><a href="${company.phoneHref}" style="color:#8A6D3B;">${company.phoneDisplay}</a> · <a href="${company.emailHref}" style="color:#8A6D3B;">${company.email}</a></p>
<p style="font-size:12px;color:#6b6559;margin:4px 0 0;"><a href="${SITE_URL}/returns" style="color:#8A6D3B;">Право на отказ →</a></p>
</td></tr>
<tr><td style="padding:16px 20px;font-size:11px;color:#6b6559;border-top:1px solid #d4cfc5;">
${company.name} · ${company.addressLine}, гр. ${company.city} · ${company.phoneDisplay}
</td></tr>
</table>
</body></html>`
}

function orderCustomerText(d: {
  orderNumber: string; totalEurCents: number;
  deliveryMethod: string; addressOrOffice: string; city: string;
  lines: OrderLine[]
}): string {
  return [
    `Потвърждение на поръчка ${d.orderNumber} - Настех`,
    '',
    'Благодарим Ви за поръчката. Ще се свържем с Вас по телефона за потвърждение.',
    '',
    ...d.lines.map(l => `${l.itemName} (${l.itemSku}) x${l.qty} = ${formatEur(l.lineTotalEurCents)}`),
    `Общо: ${formatEur(d.totalEurCents)}`,
    '',
    `Доставка: ${d.deliveryMethod} - ${d.addressOrOffice}, ${d.city}`,
    'Плащане при доставка (наложен платеж).',
    '',
    `${company.name} · ${company.addressLine}, гр. ${company.city}`,
    `${company.phoneDisplay} · ${company.email}`,
  ].join('\n')
}

function contactOwnerHtml(d: { name: string; email: string; phone?: string; message: string }): string {
  return `
<!DOCTYPE html><html lang="bg"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;font-family:sans-serif;background:#F6F3EC;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
<tr><td style="padding:24px 20px;border-bottom:1px solid #d4cfc5;background:#F6F3EC;">
<strong style="font-size:18px;color:#8A6D3B;">НАСТЕХ</strong>
</td></tr>
<tr><td style="padding:20px;">
<h2 style="margin:0 0 12px;font-size:16px;">Запитване от сайта - ${d.name}</h2>
<table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
<tr><td style="padding:4px 0;font-size:14px;"><strong>Име:</strong> ${d.name}</td></tr>
${d.email ? `<tr><td style="padding:4px 0;font-size:14px;"><a href="mailto:${d.email}" style="color:#8A6D3B;">${d.email}</a></td></tr>` : ''}
${d.phone ? `<tr><td style="padding:4px 0;font-size:14px;"><a href="tel:${d.phone}" style="color:#8A6D3B;">${d.phone}</a></td></tr>` : ''}
</table>
<div style="background:#d4cfc5;padding:12px;border-radius:4px;font-size:14px;white-space:pre-wrap;">${d.message}</div>
<p style="font-size:12px;color:#6b6559;margin:12px 0 0;"><a href="${SITE_URL}/admin" style="color:#8A6D3B;">Административен панел →</a></p>
</td></tr>
<tr><td style="padding:16px 20px;font-size:11px;color:#6b6559;border-top:1px solid #d4cfc5;">
${company.name} · ${company.addressLine}, гр. ${company.city} · ${company.phoneDisplay}
</td></tr>
</table>
</body></html>`
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
