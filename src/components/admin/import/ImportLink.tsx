'use client'
import { Button, useConfig } from '@payloadcms/ui'
import { t } from '@/lib/i18n/bg'

/** „Импорт от JSON" in the Products list header → the import view. */
export function ImportLink() {
  const { config } = useConfig()
  return (
    <Button el="link" to={`${config.routes.admin}/collections/products/import`} buttonStyle="secondary" size="small" margin={false}>
      {t('adminImport.listLink')}
    </Button>
  )
}
