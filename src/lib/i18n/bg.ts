export const bg = {
  common: { addToCart: 'Добави', search: 'Търсене', close: 'Затвори',
    back: 'Назад', next: 'Напред', home: 'Начало', retry: 'Опитай отново',
    unitDefault: 'бр.', pageOf: 'Страница {page} от {total}',
    skipToContent: 'Прескочи към съдържанието',
    priceOnRequest: 'по запитване', vatIncluded: 'Цените са с включено ДДС.' },
  logo: { name: 'Настех',
    // „НАСТЕХ" drawn with Latin look-alike capitals, as on the storefront sign.
    // Decorative only — the accessible name is logo.name.
    wordmark: 'HACTEX' },
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
  // Admin → Продукти → Импорт (src/components/admin/import). Owner-facing.
  adminImport: {
    listLink: 'Импорт от JSON',
    title: 'Импорт на продукти',
    breadcrumb: 'Импорт',
    intro: 'Качете JSON файл с продукти. Преди да се запише каквото и да е, ще видите какво ще се промени.',
    rulesTitle: 'Как работи',
    ruleCreate: 'Нов продуктов код създава нов продукт като чернова — публикувате го ръчно след преглед.',
    ruleUpdate: 'За вече съществуващ код се обновяват само цената и наличността. Име, описание, категория и снимки не се променят.',
    ruleCategories: 'Липсващите категории и марки се създават автоматично.',
    ruleImages: 'Снимките се изтеглят от линковете във файла. Ако някой сайт не позволи изтегляне, ще можете да качите снимката ръчно.',
    chooseFile: 'Изберете JSON файл',
    dropHint: 'или го пуснете тук',
    checking: 'Проверка на файла…',
    chooseAnother: 'Друг файл',
    summaryCreate: 'Нови',
    summaryUpdate: 'За обновяване',
    summaryUnchanged: 'Без промяна',
    summaryError: 'С грешки',
    newCategories: 'Ще бъдат създадени нови категории: {count}. Те се появяват в менюто на сайта веднага, дори продуктите да са чернови.',
    newBrands: 'Ще бъдат създадени нови марки: {count}.',
    unknownKeys: 'Непознати полета във файла (ще бъдат пропуснати): {keys}',
    colRow: '№',
    colSku: 'Код',
    colName: 'Наименование',
    colCategory: 'Категория',
    colBrand: 'Марка',
    colPrice: 'Цена',
    colStock: 'Наличност',
    colImage: 'Снимка',
    colStatus: 'Действие',
    isNew: 'нова',
    isNewBrand: 'нова',
    statusCreate: 'Нов продукт',
    statusUpdate: 'Обновяване',
    statusUnchanged: 'Без промяна',
    statusError: 'Грешка',
    changePrice: 'Цена: {from} → {to}',
    changeStock: 'Наличност: {from} → {to}',
    changeImage: 'Добавяне на снимка',
    imageLink: 'Отвори линка',
    noImage: 'няма',
    start: 'Импортирай ({count})',
    nothingToDo: 'Няма какво да се импортира — всички редове са без промяна или с грешки.',
    stop: 'Спри',
    stopped: 'Импортът е спрян. Обработените дотук редове са запазени — пуснете същия файл отново, за да продължите.',
    progress: 'Обработени {done} от {total}',
    running: 'Импортът тече. Не затваряйте страницата.',
    resultCreated: 'Създаден',
    resultUpdated: 'Обновен',
    resultUnchanged: 'Без промяна',
    resultError: 'Грешка',
    resultPending: 'Изчаква',
    resultRunning: 'Обработва се…',
    imageAttached: 'Снимката е добавена',
    imageKept: 'Продуктът вече има снимка',
    imageFailed: 'Снимката не е изтеглена: {reason}',
    manualHint: 'Отворете линка, запазете снимката и я качете тук.',
    uploadImage: 'Качи снимка',
    uploading: 'Качване…',
    doneTitle: 'Импортът приключи',
    doneSummary: 'Създадени: {created} · Обновени: {updated} · Без промяна: {unchanged} · Грешки: {errors}',
    imagesMissing: 'Продукти без снимка: {count}. Можете да ги качите по-долу или по-късно от страницата на продукта.',
    toProducts: 'Към продуктите',
    openProduct: 'Отвори продукта',
    issues: {
      fileNotJson: 'Файлът не е валиден JSON.',
      fileNotArray: 'Файлът трябва да съдържа списък (масив) от продукти.',
      fileEmpty: 'Файлът не съдържа продукти.',
      fileTooMany: 'Файлът съдържа повече от {max} продукта. Разделете го на части.',
      fileTooLarge: 'Файлът е по-голям от {max} MB.',
      notObject: 'Редът не е продукт (очаква се обект с полета).',
      skuMissing: 'Липсва продуктов код (sku).',
      skuInvalid: 'Невалиден продуктов код (sku).',
      skuNumeric: 'Кодът е записан като число — проверете дали не са изгубени водещи нули.',
      skuDuplicate: 'Кодът се повтаря — вече е използван на ред {row}.',
      nameMissing: 'Липсва наименование (name).',
      tooLong: 'Полето „{field}“ е твърде дълго.',
      fieldType: 'Полето „{field}“ трябва да е текст.',
      categoryMissing: 'Липсва категория (category).',
      categoryInvalid: 'Невалидна категория — използвайте „Категория > Подкатегория“.',
      categoryTooDeep: 'Категорията има повече от 3 нива.',
      priceMissing: 'Липсва цена (price).',
      priceInvalid: 'Невалидна цена: {value}.',
      priceRounded: 'Цената {value} има повече от 2 знака след десетичната точка и ще бъде закръглена до {rounded}.',
      currencyInvalid: 'Валутата трябва да е EUR (във файла: {value}).',
      stockInvalid: 'Невалидна наличност: {value}.',
      stockNegative: 'Отрицателна наличност ({value}) — ще бъде записана като 0.',
      stockMissingNew: 'Няма наличност — ще бъде записана като 0 (изчерпан).',
      unitInvalid: 'Невалидна мярка „{value}“. Допустими: бр., м, компл., чифт.',
      imageUrlInvalid: 'Невалиден линк към снимка — снимката ще бъде пропусната.',
      skuConflict: 'Кодът вече съществува в повече от един продукт — поправете го ръчно.',
      saveFailed: 'Продуктът не беше записан: {message}',
      network: 'Няма връзка със сървъра. Опитайте отново.',
      unauthorized: 'Сесията е изтекла — влезте отново.',
      generic: 'Възникна грешка. Опитайте отново.',
    },
    imageFailures: {
      blocked: 'сайтът не позволява автоматично изтегляне',
      notFound: 'снимката вече не съществува (404)',
      notImage: 'линкът не води до снимка',
      unsupported: 'неподдържан формат',
      tooLarge: 'снимката е твърде голяма',
      timeout: 'сайтът не отговори навреме',
      network: 'сайтът е недостъпен',
      forbiddenHost: 'линкът води към вътрешен адрес',
      httpError: 'сайтът върна грешка',
    },
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
