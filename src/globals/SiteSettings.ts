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
      fields: [
        { name: 'number', type: 'text', required: true, label: 'Номер' },
      ],
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      label: 'Имейл',
    },
    { name: 'workingHours', type: 'textarea', label: 'Работно време' },
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
