import { Wordmark } from '@/components/layout/Wordmark'

/**
 * The storefront sign, rebuilt on the page: the wordmark alone on a dark
 * fascia. Client feedback — the business-card lockup „мн мн не се вижда", so
 * the mark moves out of the header and gets a band of its own where it can
 * actually be read.
 */
export function SignBand() {
  return (
    <section className="bg-dark">
      <div className="flex items-center justify-center px-6 py-14 sm:py-16 lg:py-20">
        <Wordmark className="text-on-dark-bright text-[7vw] sm:text-[42px] lg:text-[56px]" />
      </div>
    </section>
  )
}
