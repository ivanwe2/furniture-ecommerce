import { formatPrice, formatEur } from '@/lib/money'

interface OrderEmailData {
  orderNumber: string
  totalEurCents: number
  customerName: string
  customerPhone: string
  customerEmail: string
  deliveryMethod: string
  addressOrOffice: string
  city: string
  note?: string | null
  lines: Array<{
    itemName: string
    itemSku: string
    unit: string
    qty: number
    unitPriceEurCents: number
    lineTotalEurCents: number
  }>
}

export function orderOwnerHtml(data: OrderEmailData): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nasteh.bg'
  return `
<!DOCTYPE html><html lang="bg"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;font-family:sans-serif;background:#F6F3EC;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
<tr><td style="padding:24px 20px;border-bottom:1px solid #d4cfc5;background:#F6F3EC;">
<strong style="font-size:18px;color:#8A6D3B;">НАСТЕХ</strong>
</td></tr>
<tr><td style="padding:20px;">
<h2 style="margin:0 0 12px;font-size:16px;">Нова поръчка ${data.orderNumber} — ${formatEur(data.totalEurCents)}</h2>
<table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
<tr><td style="padding:4px 0;font-size:14px;"><strong>Клиент:</strong> ${data.customerName}</td></tr>
<tr><td style="padding:4px 0;font-size:14px;"><a href="tel:${data.customerPhone}" style="color:#8A6D3B;">${data.customerPhone}</a></td></tr>
<tr><td style="padding:4px 0;font-size:14px;"><a href="mailto:${data.customerEmail}" style="color:#8A6D3B;">${data.customerEmail}</a></td></tr>
</table>
<table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
<tr><td style="padding:4px 0;font-size:14px;"><strong>Доставка:</strong> ${data.deliveryMethod}</td></tr>
<tr><td style="padding:4px 0;font-size:14px;">${data.city} — ${data.addressOrOffice}</td></tr>
</table>
<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:16px;">
<tr style="background:#d4cfc5;"><th style="padding:8px;text-align:left;font-size:12px;">Артикул</th><th style="padding:8px;text-align:center;font-size:12px;">Код</th><th style="padding:8px;text-align:right;font-size:12px;">Цена</th><th style="padding:8px;text-align:center;font-size:12px;">Кол.</th><th style="padding:8px;text-align:right;font-size:12px;">Общо</th></tr>
${data.lines.map(l => `<tr style="border-bottom:1px solid #d4cfc5;"><td style="padding:8px;font-size:13px;">${l.itemName}</td><td style="padding:8px;text-align:center;font-size:12px;font-family:monospace;">${l.itemSku}</td><td style="padding:8px;text-align:right;font-size:13px;">${formatEur(l.unitPriceEurCents)}</td><td style="padding:8px;text-align:center;font-size:13px;">${l.qty}</td><td style="padding:8px;text-align:right;font-size:13px;">${formatEur(l.lineTotalEurCents)}</td></tr>`).join('')}
<tr style="background:#d4cfc5;"><td colspan="4" style="padding:8px;text-align:right;font-weight:bold;font-size:14px;">Общо:</td><td style="padding:8px;text-align:right;font-size:14px;font-weight:bold;">${formatEur(data.totalEurCents)}</td></tr>
</table>
${data.note ? `<p style="font-size:13px;color:#6b6559;margin:0 0 12px;"><strong>Бележка:</strong> ${data.note}</p>` : ''}
<p style="font-size:12px;color:#6b6559;margin:0;"><a href="${siteUrl}/admin/collections/orders" style="color:#8A6D3B;">Види в административния панел →</a></p>
</td></tr>
<tr><td style="padding:16px 20px;font-size:11px;color:#6b6559;border-top:1px solid #d4cfc5;">
Настех ООД · Пловдив
</td></tr>
</table>
</body></html>`
}

export function orderOwnerText(data: OrderEmailData): string {
  return [
    `Нова поръчка ${data.orderNumber} — ${formatEur(data.totalEurCents)}`,
    '',
    `Клиент: ${data.customerName}`,
    `Телефон: ${data.customerPhone}`,
    `Имейл: ${data.customerEmail}`,
    '',
    `Доставка: ${data.deliveryMethod}`, `${data.city} — ${data.addressOrOffice}`,
    '',
    ...data.lines.map(l => `${l.itemName} (${l.itemSku}) x${l.qty} = ${formatEur(l.lineTotalEurCents)}`),
    '',
    `Общо: ${formatEur(data.totalEurCents)}`,
  ].join('\n')
}

export function orderCustomerHtml(data: OrderEmailData): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nasteh.bg'
  return `
<!DOCTYPE html><html lang="bg"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;font-family:sans-serif;background:#F6F3EC;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
<tr><td style="padding:24px 20px;border-bottom:1px solid #d4cfc5;background:#F6F3EC;">
<strong style="font-size:18px;color:#8A6D3B;">НАСТЕХ</strong>
</td></tr>
<tr><td style="padding:20px;">
<h2 style="margin:0 0 12px;font-size:16px;">Потвърждение на поръчка ${data.orderNumber}</h2>
<p style="font-size:14px;margin:0 0 16px;">Благодарим Ви за поръчката. Ще се свържем с Вас по телефона за потвърждение.</p>
<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:16px;">
<tr style="background:#d4cfc5;"><th style="padding:8px;text-align:left;font-size:12px;">Артикул</th><th style="padding:8px;text-align:center;font-size:12px;">Код</th><th style="padding:8px;text-align:right;font-size:12px;">Цена</th><th style="padding:8px;text-align:center;font-size:12px;">Кол.</th><th style="padding:8px;text-align:right;font-size:12px;">Общо</th></tr>
${data.lines.map(l => `<tr style="border-bottom:1px solid #d4cfc5;"><td style="padding:8px;font-size:13px;">${l.itemName}</td><td style="padding:8px;text-align:center;font-size:12px;font-family:monospace;">${l.itemSku}</td><td style="padding:8px;text-align:right;font-size:13px;">${formatEur(l.unitPriceEurCents)}</td><td style="padding:8px;text-align:center;font-size:13px;">${l.qty}</td><td style="padding:8px;text-align:right;font-size:13px;">${formatEur(l.lineTotalEurCents)}</td></tr>`).join('')}
<tr style="background:#d4cfc5;"><td colspan="4" style="padding:8px;text-align:right;font-weight:bold;font-size:14px;">Общо:</td><td style="padding:8px;text-align:right;font-size:14px;font-weight:bold;">${formatEur(data.totalEurCents)}</td></tr>
</table>
<p style="font-size:13px;color:#6b6559;margin:0 0 12px;"><strong>Доставка:</strong> ${data.deliveryMethod} — ${data.addressOrOffice}, ${data.city}</p>
<p style="font-size:13px;color:#6b6559;margin:0 0 12px;">Плащане при доставка (наложен платеж).</p>
<hr style="border:none;border-top:1px solid #d4cfc5;margin:16px 0;"/>
<p style="font-size:12px;color:#6b6559;margin:0;"><strong>Продавач:</strong> Настех ООД, Пловдив</p>
<p style="font-size:12px;color:#6b6559;margin:4px 0 0;"><a href="${siteUrl}/pravo-na-otkaz" style="color:#8A6D3B;">Право на отказ →</a></p>
</td></tr>
<tr><td style="padding:16px 20px;font-size:11px;color:#6b6559;border-top:1px solid #d4cfc5;">
Настех ООД · Пловдив
</td></tr>
</table>
</body></html>`
}

export function orderCustomerText(data: OrderEmailData): string {
  return [
    `Потвърждение на поръчка ${data.orderNumber} — Настех`,
    '',
    'Благодарим Ви за поръчката. Ще се свържем с Вас по телефона за потвърждение.',
    '',
    ...data.lines.map(l => `${l.itemName} (${l.itemSku}) x${l.qty} = ${formatEur(l.lineTotalEurCents)}`),
    `Общо: ${formatEur(data.totalEurCents)}`,
    '',
    `Доставка: ${data.deliveryMethod} — ${data.addressOrOffice}, ${data.city}`,
    'Плащане при доставка (наложен платеж).',
  ].join('\n')
}

export function contactOwnerHtml(data: { name: string; email: string; phone?: string; message: string }): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nasteh.bg'
  return `
<!DOCTYPE html><html lang="bg"><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;font-family:sans-serif;background:#F6F3EC;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
<tr><td style="padding:24px 20px;border-bottom:1px solid #d4cfc5;background:#F6F3EC;">
<strong style="font-size:18px;color:#8A6D3B;">НАСТЕХ</strong>
</td></tr>
<tr><td style="padding:20px;">
<h2 style="margin:0 0 12px;font-size:16px;">Запитване от сайта — ${data.name}</h2>
<table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
<tr><td style="padding:4px 0;font-size:14px;"><strong>Име:</strong> ${data.name}</td></tr>
${data.email ? `<tr><td style="padding:4px 0;font-size:14px;"><a href="mailto:${data.email}" style="color:#8A6D3B;">${data.email}</a></td></tr>` : ''}
${data.phone ? `<tr><td style="padding:4px 0;font-size:14px;"><a href="tel:${data.phone}" style="color:#8A6D3B;">${data.phone}</a></td></tr>` : ''}
</table>
<div style="background:#d4cfc5;padding:12px;border-radius:4px;font-size:14px;white-space:pre-wrap;">${data.message}</div>
<p style="font-size:12px;color:#6b6559;margin:12px 0 0;"><a href="${siteUrl}/admin" style="color:#8A6D3B;">Административен панел →</a></p>
</td></tr>
<tr><td style="padding:16px 20px;font-size:11px;color:#6b6559;border-top:1px solid #d4cfc5;">
Настех ООД · Пловдив
</td></tr>
</table>
</body></html>`
}

export function contactOwnerText(data: { name: string; email: string; phone?: string; message: string }): string {
  return [
    `Запитване от сайта — ${data.name}`,
    '',
    `Име: ${data.name}`,
    data.email ? `Имейл: ${data.email}` : '',
    data.phone ? `Телефон: ${data.phone}` : '',
    '',
    data.message,
  ].filter(Boolean).join('\n')
}
