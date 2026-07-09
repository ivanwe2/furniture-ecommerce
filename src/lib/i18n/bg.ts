export const bg = {
  common: { addToCart: 'Добави', search: 'Търсене', close: 'Затвори',
    back: 'Назад', home: 'Начало', retry: 'Опитай отново',
    priceOnRequest: 'по запитване', vatIncluded: 'Цените са с включено ДДС.' },
  nav: { categories: 'Категории', contact: 'Контакти', menu: 'Меню' },
  home: { featured: 'Акценти', categoriesTitle: 'Категории',
    heroEyebrow: 'Обков и механизми за мебели',
    heroCta: 'Разгледай каталога',
    trust1: 'Дългогодишен опит с мебелен обков',
    trust2: 'Плащане при доставка — наложен платеж',
    trust3: 'Бърза връзка и консултация' },
  catalog: { fromPrice: 'от {price}', inStock: 'в наличност',
    outOfStock: 'изчерпан' },
  category: { allIn: 'Всички продукти в категорията',
    empty: 'Все още няма продукти в тази категория.' },
  product: { itemsTitle: 'Артикули и цени', colName: 'Наименование',
    colUnit: 'Мярка', colLength: 'Дължина (мм)', colColor: 'Цвят',
    colSku: 'Код', colPrice: 'Цена', colQty: 'Количество',
    added: 'Добавено', onRequest: 'по запитване',
    inStockSummary: 'Артикули в наличност' },
  search: { placeholder: 'Търси продукт или код…',
    resultsFor: 'Резултати за', empty: 'Няма намерени продукти.' },
  cart: { title: 'Количка', empty: 'Количката е празна.',
    goShopping: 'Към каталога', total: 'Общо', remove: 'Премахни',
    stale: 'Този артикул вече не е наличен и няма да бъде поръчан.',
    codNote: 'Плащане при доставка (наложен платеж).',
    deliveryNote: 'Доставката се заплаща на куриера по тарифа на Еконт/Спиди.',
    checkout: 'Към поръчка' },
  checkout: { title: 'Поръчка', name: 'Име и фамилия', phone: 'Телефон',
    email: 'Имейл', method: 'Доставка до', methodAddress: 'Адрес',
    methodEcont: 'Офис на Еконт', methodSpeedy: 'Офис на Спиди',
    city: 'Град', addressLabel: 'Адрес за доставка',
    officeLabel: 'Офис (име или адрес)', note: 'Бележка към поръчката',
    consent: 'Съгласен съм с Общите условия и Политиката за поверителност.',
    submit: 'Изпрати поръчката', submitting: 'Изпращане…',
    successTitle: 'Благодарим за поръчката!',
    successBody: 'Изпратихме потвърждение на имейла ви. Ще се свържем с вас по телефона за уточнение на доставката.',
    orderNumber: 'Номер на поръчка' },
  contact: { title: 'Контакти', message: 'Съобщение',
    send: 'Изпрати', success: 'Съобщението е изпратено. Благодарим!',
    aboutSku: 'Запитване относно артикул: ' },
  errors: { generic: 'Възникна грешка. Опитайте отново.',
    required: 'Полето е задължително.',
    invalidEmail: 'Невалиден имейл адрес.',
    invalidPhone: 'Невалиден телефонен номер.',
    captcha: 'Моля, потвърдете, че не сте робот.',
    rateLimited: 'Твърде много опити. Опитайте отново след няколко минути.',
    cartStale: 'Част от артикулите вече не са налични. Прегледайте количката.',
    consentRequired: 'Необходимо е съгласие с условията.',
    pageTitle: 'Нещо се обърка' },
  notFound: { title: 'Страницата не е намерена',
    body: 'Потърсете продукт или разгледайте категориите.' },
  footer: { info: 'Информация', categories: 'Категории',
    workingHours: 'Работно време' },
  store: { info: 'Информация за магазина', centralOffice: 'Централен офис',
    phone: 'Телефон', email: 'Имейл', workingHours: 'Работно време',
    callNow: 'Позвънете сега' },
  cookie: { notice: 'Този сайт използва бисквитки само с техническа цел — запазване на съдържанието на количката.', learnMore: 'Научете повече', dismiss: 'Разбрах' },
  seo: {
    siteName: 'Настех — мебелен обков',
    homeDesc: 'Онлайн каталог с мебелинен обков — ъгли, щифтове, панти, механизми и аксесоари за мебели. Плащане при доставка.',
    categoryDesc: 'Продукти в категория {name} — мебелен обков от Настех.',
    productDesc: '{name} — артикули, цени и наличности. Мебелен обков от Настех.',
    brandDesc: 'Продукти на марка {name} — мебелинен обков от Настех.',
    searchDesc: 'Резултати от търсенето за "{q}" в каталога на Настех.',
    contactDesc: 'Контакти, адрес и работно време на Настех ООД — мебелен обков в Пловдив.',
  },
} as const

export type BgKeys = keyof typeof bg

type NestedKeys<T, Prefix extends string = ''> = {
  [K in keyof T]: T[K] extends string
    ? `${Prefix}${K & string}`
    : T[K] extends object
      ? NestedKeys<T[K], `${Prefix}${K & string}.`>
      : never;
}[keyof T]

export type DotPath = NestedKeys<typeof bg>

function resolve(key: DotPath): string {
  const parts = key.split('.')
  let current: unknown = bg
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      throw new TypeError(`Cannot resolve i18n path: ${key}`)
    }
    current = (current as Record<string, unknown>)[part]
  }
  if (typeof current !== 'string') {
    throw new TypeError(`Expected string at i18n path: ${key}`)
  }
  return current
}

export function t(key: DotPath): string {
  return resolve(key)
}

/**
 * Loose lookup for dynamic keys (e.g. error keys returned by server actions).
 * Returns the resolved Bulgarian string, or the key unchanged if it does not
 * resolve. Never throws — unlike `t`, which is for statically-known keys.
 */
export function tSafe(key: string): string {
  const parts = key.split('.')
  let current: unknown = bg
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return key
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : key
}
