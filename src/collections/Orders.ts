import type { CollectionConfig } from 'payload'

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Поръчка', plural: 'Поръчки' },
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'createdAt', 'status', 'totalEurCents', 'customer.name'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
    create: () => false,
  },
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      unique: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'нова',
      label: 'Статус',
      options: [
        { label: 'Нова', value: 'нова' },
        { label: 'Потвърдена', value: 'потвърдена' },
        { label: 'Изпратена', value: 'изпратена' },
        { label: 'Доставена', value: 'доставена' },
        { label: 'Отказана', value: 'отказана' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'customer',
      type: 'group',
      label: 'Клиент',
      fields: [
        { name: 'name', type: 'text', required: true, label: 'Име' },
        { name: 'phone', type: 'text', required: true, label: 'Телефон' },
        { name: 'email', type: 'email', required: true, label: 'Имейл' },
        { name: 'note', type: 'textarea', label: 'Бележка' },
      ],
    },
    {
      name: 'delivery',
      type: 'group',
      label: 'Доставка',
      fields: [
        {
          name: 'method',
          type: 'select',
          required: true,
          label: 'Доставка до',
          options: [
            { label: 'Адрес', value: 'адрес' },
            { label: 'Офис на Еконт', value: 'офис на Еконт' },
            { label: 'Офис на Спиди', value: 'офис на Спиди' },
          ],
        },
        {
          name: 'addressOrOffice',
          type: 'text',
          required: true,
          label: 'Адрес / Офис',
        },
        { name: 'city', type: 'text', required: true, label: 'Град' },
      ],
    },
    {
      name: 'lines',
      type: 'array',
      label: 'Позиции',
      fields: [
        { name: 'productId', type: 'text', label: 'Продукт ID' },
        { name: 'productName', type: 'text', label: 'Име на продукт' },
        { name: 'itemSku', type: 'text', label: 'SKU' },
        { name: 'itemName', type: 'text', label: 'Наименование' },
        { name: 'unit', type: 'text', label: 'Мярка' },
        {
          name: 'qty',
          type: 'number',
          required: true,
          min: 1,
          label: 'Количество',
          admin: { step: 1 },
        },
        {
          name: 'unitPriceEurCents',
          type: 'number',
          required: true,
          label: 'Ед. цена (евроцентове)',
          admin: { step: 1 },
        },
        {
          name: 'lineTotalEurCents',
          type: 'number',
          required: true,
          label: 'Общо за позицията (евроцентове)',
          admin: { step: 1 },
        },
      ],
    },
    {
      name: 'totalEurCents',
      type: 'number',
      required: true,
      label: 'Общо (евроцентове)',
      admin: { step: 1, position: 'sidebar' },
    },
    {
      name: 'meta',
      type: 'group',
      label: 'Метаданни',
      fields: [
        { name: 'ip', type: 'text', label: 'IP адрес' },
        { name: 'userAgent', type: 'text', label: 'User-Agent' },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        if (operation === 'create' && !data.orderNumber) {
          const now = new Date()
          const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
          // Generate NAS-YYYYMMDD-XXXX where XXXX is crypto-random base36 upper
          let orderNumber: string
          while (true) {
            const bytes = new Uint8Array(4)
            crypto.getRandomValues(bytes)
            const randomStr = Array.from(bytes)
              .map((b) => b.toString(36).toUpperCase())
              .join('')
              .slice(0, 4)
            orderNumber = `NAS-${dateStr}-${randomStr}`
            // Check uniqueness
            const existing = await data.payload.find({
              collection: 'orders',
              depth: 0,
              overrideAccess: true,
              where: { orderNumber: { equals: orderNumber } },
            })
            if (existing.docs.length === 0) break
          }
          data.orderNumber = orderNumber
        }
        return data
      },
    ],
  },
}
