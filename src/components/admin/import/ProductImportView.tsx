import { Gutter, SetStepNav } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import { t } from '@/lib/i18n/bg'
import { ProductImport } from '@/components/admin/import/ProductImport'

/**
 * /admin/collections/products/import. Payload gates collection views on login;
 * the permission check below additionally hides the tool from anyone who could
 * not create products by hand.
 */
export function ProductImportView({ initPageResult }: AdminViewServerProps) {
  const { req, permissions } = initPageResult
  if (!req.user || !permissions.collections?.products?.create) return null
  const { admin, api } = req.payload.config.routes

  return (
    <Gutter className="nasteh-import">
      <SetStepNav
        nav={[
          { label: req.payload.collections.products.config.labels.plural, url: '/collections/products' },
          { label: t('adminImport.breadcrumb') },
        ]}
      />
      <h1 className="nasteh-import__title">{t('adminImport.title')}</h1>
      <p className="nasteh-import__intro">{t('adminImport.intro')}</p>
      <ProductImport apiRoute={api} adminRoute={admin} />
    </Gutter>
  )
}
