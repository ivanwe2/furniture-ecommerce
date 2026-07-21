import Link from 'next/link'
import { t } from '@/lib/i18n/bg'
import { Container } from '@/components/ui'
import { HingeBackdrop } from '@/components/home/HingeBackdrop'
import { getSettings, getCategoryTree, getCompany, type CategoryNode } from '@/lib/payload/queries'
import { imageUrl, imageSrcSet } from '@/lib/images'
import type { Media } from '@/payload-types'

export async function generateMetadata() {
  const homeTitle = t('seo.homeTitle')
  const description = t('seo.homeDesc')
  return {
    // `absolute` so the layout's `%s | Настех` template isn't appended.
    title: { absolute: homeTitle },
    description,
    alternates: { canonical: '/' },
    openGraph: {
      title: homeTitle,
      description,
      type: 'website',
      url: '/',
    },
  }
}

/** One category tile: real cover image, or a hatched placeholder with a mono
 *  index + "[ продуктов кадър ]" caption in the engineering-drawing style. */
function CategoryCard({ cat, idx }: { cat: CategoryNode; idx: string }) {
  const img = cat.image && cat.image.filename ? (cat.image as Media) : null
  const hint = cat.children.slice(0, 3).map((c) => c.name).join(' · ')

  return (
    <Link
      href={`/category/${cat.slug}`}
      className="group flex flex-col border border-ink/14 bg-raised transition-colors hover:border-brass"
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b border-ink/10">
        {img ? (
          <img
            src={imageUrl(img, 'card')}
            srcSet={imageSrcSet(img, ['thumb', 'card'])}
            alt={img.alt ?? cat.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="hatch absolute inset-0" />
        )}
        <span className="absolute left-4 top-3.5 font-mono text-[13px] font-medium tracking-[0.1em] text-ink">
          {idx}
        </span>
        {!img && (
          <span className="absolute bottom-3 left-4 font-mono text-[10px] tracking-[0.12em] text-steel">
            {t('home.productShot')}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3 p-5 pt-4">
        <div>
          <div className="font-display text-xl font-semibold tracking-[-0.01em] text-ink sm:text-[23px]">
            {cat.name}
          </div>
          {hint && <div className="mt-1.5 font-mono text-[11px] tracking-[0.06em] text-steel">{hint}</div>}
        </div>
        <span aria-hidden="true" className="text-xl text-brass">
          →
        </span>
      </div>
    </Link>
  )
}

export default async function HomePage() {
  const [settings, categories, company] = await Promise.all([
    getSettings(),
    getCategoryTree(),
    getCompany(),
  ])

  const catalogRoot = categories.find((c) => c.slug === 'mebelen-obkov')
  const displayCats = (catalogRoot && catalogRoot.children.length > 0 ? catalogRoot.children : categories).slice(0, 5)
  const catalogHref = catalogRoot ? `/category/${catalogRoot.slug}` : '/search'
  const heroTitle = settings.heroTitle?.trim() || t('home.heroTitle')
  const heroLead = settings.heroSubtitle?.trim() || t('home.heroLead')

  return (
    <>
      {/* Hero — engineering overlay + WebGL hinge backdrop behind the copy. */}
      <section className="hero-stage border-b border-ink/12">
        <Container className="relative" data-hero-stage>
          <HingeBackdrop />

          <div className="eng-overlay" aria-hidden="true">
            <div className="eng-grid" />
            <div className="eng-ruler" />
            <div className="eng-dim" />
            <div className="eng-cap eng-cap-top" />
            <div className="eng-cap eng-cap-bottom" />
            <span className="eng-label">{t('home.heroArtLabel')}</span>
            <div className="eng-cross">
              <div className="eng-cross-h" />
              <div className="eng-cross-v" />
              <div className="eng-cross-box" />
            </div>
          </div>

          <div className="relative z-[1] max-w-xl py-16 sm:py-24 lg:py-28">
            <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-brass-dark sm:text-xs">
              {t('home.heroSlogan')}
            </div>
            <h1 className="font-display text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.025em] text-balance text-ink sm:text-5xl lg:text-6xl">
              {heroTitle}
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-ink2 sm:text-lg">{heroLead}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href={catalogHref}
                className="inline-flex items-center justify-center gap-2.5 bg-brass px-6 py-3.5 text-sm font-semibold text-raised transition hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 ring-offset-cream"
              >
                {t('home.heroCta')}
                <span aria-hidden="true" className="text-base">
                  →
                </span>
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center border border-ink/28 px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 ring-offset-cream"
              >
                {t('nav.contact')}
              </Link>
            </div>
            <div className="mt-11 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.1em] text-steel">
              <span>{t('home.statYears')}</span>
              <span className="hidden h-3 w-px bg-ink/20 sm:inline-block" aria-hidden="true" />
              <span>гр. {company.city}</span>
              <span className="hidden h-3 w-px bg-ink/20 sm:inline-block" aria-hidden="true" />
              <span>{t('home.statCod')}</span>
            </div>
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section className="py-14 sm:py-20">
        <Container>
          <div className="mb-9 flex items-end justify-between gap-4 border-b border-ink/18 pb-5">
            <div>
              <div className="mb-2.5 font-mono text-xs uppercase tracking-[0.18em] text-brass-dark">
                {t('home.categoriesTitle')} / {String(displayCats.length).padStart(2, '0')}
              </div>
              <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-[34px]">
                {t('home.categoriesHeading')}
              </h2>
            </div>
            <Link
              href={catalogHref}
              className="shrink-0 font-mono text-xs uppercase tracking-[0.1em] text-ink transition-colors hover:text-brass"
            >
              {t('home.viewAll')} <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayCats.map((cat, i) => (
              <CategoryCard key={cat.id} cat={cat} idx={String(i + 1).padStart(2, '0')} />
            ))}

            <Link
              href={catalogHref}
              className="group flex min-h-[200px] flex-col justify-between bg-dark p-6 text-on-dark-bright transition hover:brightness-[1.15]"
            >
              <span className="font-mono text-xs uppercase tracking-[0.16em] text-brass-light">
                {t('home.ctaEyebrow')}
              </span>
              <div>
                <div className="font-display text-2xl font-semibold tracking-[-0.02em]">{t('home.ctaTitle')}</div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-on-dark-muted">
                    {t('home.ctaMeta')}
                  </span>
                  <span aria-hidden="true" className="text-xl">
                    →
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </Container>
      </section>

      {/* Trust band */}
      <section className="border-y border-ink/12 bg-sand py-12 sm:py-14">
        <Container>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-11">
            <div className="flex gap-5">
              <span className="pt-0.5 font-mono text-[15px] text-brass-dark">01</span>
              <div>
                <div className="font-display text-lg font-semibold text-ink sm:text-[19px]">
                  {t('home.trust1Title')}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink2">{t('home.trust1Body')}</p>
              </div>
            </div>
            <div className="flex gap-5">
              <span className="pt-0.5 font-mono text-[15px] text-brass-dark">02</span>
              <div>
                <div className="font-display text-lg font-semibold text-ink sm:text-[19px]">
                  {t('home.trust2Title')}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink2">{t('home.trust2Body')}</p>
              </div>
            </div>
            <div className="flex gap-5">
              <span className="pt-0.5 font-mono text-[15px] text-brass-dark">03</span>
              <div>
                <div className="font-display text-lg font-semibold text-ink sm:text-[19px]">
                  {t('home.trust3Title')}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink2">{t('home.trust3Body')}</p>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
