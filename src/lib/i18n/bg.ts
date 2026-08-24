export const bg = {
  common: { addToCart: 'Добави', search: 'Търсене', close: 'Затвори',
    back: 'Назад', next: 'Напред', home: 'Начало', retry: 'Опитай отново',
    unitDefault: 'бр.', pageOf: 'Страница {page} от {total}',
    skipToContent: 'Прескочи към съдържанието',
    priceOnRequest: 'по запитване', vatIncluded: 'Цените са с включено ДДС.' },
  logo: { name: 'Настех',
    // „НАСТЕХ" set with Latin look-alike capitals + interpuncts, as on the
    // storefront sign. Decorative only — the accessible name is logo.name.
    wordmark: 'H·A·C·T·E·X·' },
  nav: { categories: 'Категории', contact: 'Контакти', menu: 'Меню',
    subcategories: 'Подкатегории', catalog: 'Каталог', brands: 'Марки' },
  home: { featured: 'Акценти', categoriesTitle: 'Категории',
    heroSlogan: 'Мебелен обков · производство и търговия',
    heroTitle: 'Качествени решения за вашия дом',
    heroLead: 'Мебелен обков от водещи европейски производители. Доказано качество и бърза консултация.',
    heroCta: 'Разгледай каталога',
    heroArtLabel: 'ART.01 · ПАНТА Ø35',
    statYears: '20+ години опит',
    statRep: 'Официален представител',
    categoriesHeading: 'Разгледай по категория',
    viewAll: 'Виж всички',
    productShot: '[ Продуктов кадър ]',
    ctaEyebrow: 'Целият каталог',
    ctaTitle: 'Виж всичко',
    ctaMeta: 'Обков · механизми',
    trust1Title: 'Дългогодишен опит',
    trust1Body: 'Над 20 години работа с мебелен обков и механизми.',
    trust2Title: 'Официален представител',
    trust2Body: 'Оригинален обков от водещи европейски производители, с гаранция за качество.',
    trust3Title: 'Бърза консултация',
    trust3Body: 'Свържете се за оферта, наличности и съвет.' },
  catalog: { fromPrice: 'от {price}', from: 'от', inStock: 'в наличност',
    outOfStock: 'изчерпан' },
  filter: {
    brand: 'Марка',
    all: 'Всички',
    emptyForBrand: 'Няма продукти от тази марка в категорията.',
    clear: 'Изчисти филтъра',
  },
  sort: {
    label: 'Подреди',
    nameAsc: 'По име',
    priceAsc: 'Най-евтини',
    priceDesc: 'Най-скъпи',
    newest: 'Най-нови',
  },
  category: { allIn: 'Всички продукти в категорията',
    empty: 'Все още няма продукти в тази категория.',
    notFoundTitle: 'Категория не е намерена' },
  product: { itemsTitle: 'Артикули и цени', colName: 'Наименование',
    colUnit: 'Мярка', colLength: 'Дължина (мм)', colColor: 'Цвят',
    colSku: 'Код', colPrice: 'Цена', colQty: 'Количество',
    added: 'Добавено', onRequest: 'по запитване', soldOut: 'Изчерпан',
    inStockSummary: 'Артикули в наличност',
    notFoundTitle: 'Продукт не е намерен',
    qtyDecrease: 'Намали количество', qtyIncrease: 'Увеличи количество',
    galleryOpen: 'Отвори {name} - снимка {n}', photoAlt: 'Снимка {n}',
    galleryZoom: '{name} - увеличено изображение',
    prevPhoto: 'Предишна снимка', nextPhoto: 'Следваща снимка' },
  search: { placeholder: 'Търси продукт или код…',
    resultsFor: 'Резултати за', empty: 'Няма намерени продукти.',
    title: 'Търсене', browsePrompt: 'Разгледайте категориите:' },
  cart: { title: 'Количка', empty: 'Количката е празна.',
    goShopping: 'Към каталога', total: 'Общо', remove: 'Премахни',
    stale: 'Този артикул вече не е наличен и няма да бъде поръчан.',
    codNote: 'Плащане при доставка (наложен платеж).',
    deliveryNote: 'Доставката се заплаща на куриера по тарифа на Еконт/Спиди.',
    checkout: 'Към поръчка',
    itemSingular: 'артикул', itemPlural: 'артикула' },
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
    tooLong: 'Текстът е твърде дълъг.',
    pageTitle: 'Нещо се обърка' },
  brand: { notFoundTitle: 'Марка не е намерена' },
  brands: {
    title: 'Марки',
    lead: 'Официален представител на водещи производители. Разгледайте продуктите по марка.',
    countOne: '{count} продукт',
    countMany: '{count} продукта',
    empty: 'Все още няма добавени марки.',
    // Kept short on purpose — at 375px a longer heading wraps to three lines
    // and crowds the „виж всички" link sitting beside it.
    homeTitle: 'Нашите марки',
  },
  notFound: { title: 'Страницата не е намерена',
    body: 'Потърсете продукт или разгледайте категориите.' },
  footer: { info: 'Информация', categories: 'Категории',
    workingHours: 'Работно време', contact: 'Контакт',
    tagline: 'Мебелен обков - производство и търговия. Ъгли, щифтове, панти, механизми и аксесоари за мебели.' },
  store: { info: 'Информация за магазина', centralOffice: 'Централен офис',
    phone: 'Телефон', email: 'Имейл', workingHours: 'Работно време',
    callNow: 'Позвънете сега' },
  legal: { terms: 'Общи условия', privacy: 'Политика за поверителност',
    deliveryPayment: 'Доставка и плащане', returns: 'Право на отказ',
    cookies: 'Бисквитки' },
  cookie: { notice: 'Този сайт използва бисквитки само с техническа цел - запазване на съдържанието на количката.', learnMore: 'Научете повече', dismiss: 'Разбрах' },
  seo: {
    siteName: 'Настех',
    homeTitle: 'Мебелен Обков | Настех',
    homeDesc: 'Онлайн каталог с мебелен обков - ъгли, щифтове, панти, механизми и аксесоари за мебели. Официален представител на водещи марки.',
    categoryDesc: 'Продукти в категория {name} - мебелен обков от Настех.',
    productDesc: '{name} - артикули, цени и наличности. Мебелен обков от Настех.',
    brandDesc: 'Продукти на марка {name} - мебелен обков от Настех.',
    searchDesc: 'Резултати от търсенето за "{q}" в каталога на Настех.',
    contactDesc: 'Контакти, адрес и работно време на Настех ООД - мебелен обков в Пловдив.',
    pageDesc: '{title} - информация от Настех.',
  },
  siteLock: {
    // ASCII ONLY — this goes into the `WWW-Authenticate` header, and HTTP header
    // values are latin1 ByteStrings (Cyrillic throws at response construction).
    // Not a visible-copy regression: current browsers no longer show the realm.
    realm: 'Nasteh - site in development',
    title: 'Сайтът е в разработка',
    body: 'В момента подготвяме онлайн каталога и все още не приемаме поръчки. Благодарим за търпението!',
    contact: 'За запитвания: info@nasteh.bg',
    unlockCta: 'Вход за тестване',
    unlockHint: 'Само за екипа по разработката',
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
 * resolve. Never throws - unlike `t`, which is for statically-known keys.
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
