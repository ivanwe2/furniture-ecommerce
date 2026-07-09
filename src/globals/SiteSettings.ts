import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Настройки на сайта',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'companyName',
      type: 'text',
      required: true,
      defaultValue: 'Настех ООД',
      label: 'Име на фирмата',
    },
    { name: 'eik', type: 'text', label: 'ЕИК' },
    {
      name: 'addressLine',
      type: 'text',
      required: true,
      defaultValue: 'ул. „Жан Жорес“ 9',
      label: 'Адрес',
    },
    {
      name: 'city',
      type: 'text',
      defaultValue: 'Пловдив',
      label: 'Град',
    },
    {
      name: 'phones',
      type: 'array',
      label: 'Телефони',
      defaultValue: [{ number: '0898 272 567' }],
      fields: [
        { name: 'number', type: 'text', required: true, label: 'Номер' },
      ],
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      defaultValue: 'nastehsales@gmail.com',
      label: 'Имейл',
    },
    {
      name: 'workingHours',
      type: 'textarea',
      defaultValue: 'Пон–Пет: 08:30–17:30\nСъб: 09:00–14:00',
      label: 'Работно време',
    },
    { name: 'heroTitle', type: 'text', label: 'Начална страница — заглавие' },
    {
      name: 'heroSubtitle',
      type: 'textarea',
      label: 'Начална страница — подзаглавие',
    },
    { name: 'announcement', type: 'text', label: 'Обявление (лента)' },
    {
      name: 'social',
      type: 'group',
      label: 'Социални мрежи',
      fields: [
        { name: 'facebook', type: 'text', label: 'Facebook URL' },
      ],
    },
  ],
}
