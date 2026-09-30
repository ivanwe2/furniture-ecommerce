'use client'
import { Button } from '@payloadcms/ui'
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import clsx from 'clsx'
import type {
  ApplyRequest,
  ApplyResponse,
  ImageFailure,
  ImageUploadResponse,
  PreviewResponse,
  PreviewRow,
} from '@/lib/import/api'
import { MAX_FILE_BYTES, type Issue } from '@/lib/import/contract'
import { t } from '@/lib/i18n/bg'
import { formatEur } from '@/lib/money'

type Props = { apiRoute: string; adminRoute: string }

type PreviewOk = Extract<PreviewResponse, { ok: true }>
type Loaded = { fileName: string; records: unknown[]; preview: PreviewOk }

type ManualState = { state: 'uploading' } | { state: 'done' } | { state: 'error'; message: string }
type RowResult =
  | { state: 'pending' }
  | { state: 'running' }
  | { state: 'failed'; message: string }
  | { state: 'done'; response: Extract<ApplyResponse, { ok: true }>; manual?: ManualState }

type Run = 'idle' | 'running' | 'stopped' | 'done'

function fill(template: string, params: Record<string, string>): string {
  return Object.entries(params).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template)
}

function issueText(issue: Issue): string {
  const params = { ...issue.params }
  // The server sends raw cents; the owner reads euros.
  if (issue.key === 'priceRounded' && params.cents) params.rounded = formatEur(Number(params.cents))
  return fill(t(`adminImport.issues.${issue.key}`), params)
}

function failureText(reason: ImageFailure): string {
  return fill(t('adminImport.imageFailed'), { reason: t(`adminImport.imageFailures.${reason}`) })
}

async function postJson<T>(url: string, body: unknown): Promise<T | { ok: false; error: Issue }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.status === 401) return { ok: false, error: { key: 'unauthorized' } }
    return (await res.json()) as T
  } catch {
    return { ok: false, error: { key: 'network' } }
  }
}

type PlannedRow = Exclude<PreviewRow, { status: 'error' }>
const isActionable = (row: PreviewRow): row is PlannedRow => row.status === 'create' || row.status === 'update'

export function ProductImport({ apiRoute, adminRoute }: Props) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [run, setRun] = useState<Run>('idle')
  const [results, setResults] = useState<Record<number, RowResult>>({})
  const stopRequested = useRef(false)

  const setResult = useCallback((index: number, result: RowResult) => {
    setResults((prev) => ({ ...prev, [index]: result }))
  }, [])

  // Closing the tab mid-run leaves a partial import (safe — a re-run finishes
  // it — but surprising), so the browser asks first.
  useEffect(() => {
    if (run !== 'running') return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [run])

  async function readFile(file: File) {
    setFileError(null)
    setLoaded(null)
    setResults({})
    setRun('idle')
    if (file.size > MAX_FILE_BYTES) {
      setFileError(issueText({ key: 'fileTooLarge', params: { max: String(MAX_FILE_BYTES / (1024 * 1024)) } }))
      return
    }
    let records: unknown
    try {
      records = JSON.parse(await file.text())
    } catch {
      setFileError(issueText({ key: 'fileNotJson' }))
      return
    }
    setChecking(true)
    const preview = await postJson<PreviewResponse>(`${apiRoute}/products/import/preview`, { records })
    setChecking(false)
    if (!preview.ok) {
      setFileError(issueText(preview.error))
      return
    }
    setLoaded({ fileName: file.name, records: Array.isArray(records) ? records : [], preview })
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // picking the same file again must re-trigger
    if (file) void readFile(file)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file && run !== 'running') void readFile(file)
  }

  async function startImport() {
    if (!loaded) return
    const rows = loaded.preview.rows.filter(isActionable)
    stopRequested.current = false
    setRun('running')
    setResults(Object.fromEntries(rows.map((row) => [row.index, { state: 'pending' } as RowResult])))

    // Two rows with the same image link share one download (and one media file).
    const images = new Map<string, { mediaId: number } | { failure: ImageFailure }>()

    for (const row of rows) {
      if (stopRequested.current) {
        setRun('stopped')
        return
      }
      setResult(row.index, { state: 'running' })
      const known = row.imageUrl ? images.get(row.imageUrl) : undefined
      const body: ApplyRequest = {
        record: loaded.records[row.index],
        ...(known && 'mediaId' in known ? { reuseMediaId: known.mediaId } : {}),
        ...(known && 'failure' in known ? { previousFailure: known.failure } : {}),
      }
      const response = await postJson<ApplyResponse>(`${apiRoute}/products/import/apply`, body)
      if (!response.ok) {
        setResult(row.index, { state: 'failed', message: issueText(response.error) })
        if (response.error.key === 'unauthorized') {
          setRun('stopped')
          return
        }
        continue
      }
      if (row.imageUrl && !known) {
        if (response.image.kind === 'attached') images.set(row.imageUrl, { mediaId: response.image.mediaId })
        if (response.image.kind === 'failed') images.set(row.imageUrl, { failure: response.image.reason })
      }
      setResult(row.index, { state: 'done', response })
    }
    setRun('done')
  }

  async function uploadImage(index: number, productId: number, file: File) {
    const current = results[index]
    if (current?.state !== 'done') return
    setResult(index, { ...current, manual: { state: 'uploading' } })
    let outcome: ManualState
    try {
      const res = await fetch(`${apiRoute}/products/import/image/${productId}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file,
      })
      const body = (await res.json()) as ImageUploadResponse
      if (body.ok) outcome = { state: 'done' }
      else if ('reason' in body) outcome = { state: 'error', message: failureText(body.reason) }
      else outcome = { state: 'error', message: issueText(body.error) }
    } catch {
      outcome = { state: 'error', message: issueText({ key: 'network' }) }
    }
    setResult(index, { ...current, manual: outcome })
  }

  const preview = loaded?.preview
  const counts = preview
    ? {
        create: preview.rows.filter((r) => r.status === 'create').length,
        update: preview.rows.filter((r) => r.status === 'update').length,
        unchanged: preview.rows.filter((r) => r.status === 'unchanged').length,
        error: preview.rows.filter((r) => r.status === 'error').length,
      }
    : null
  const actionable = preview ? preview.rows.filter(isActionable).length : 0
  const processed = Object.values(results).filter((r) => r.state === 'done' || r.state === 'failed').length
  const done = Object.values(results).flatMap((r) => (r.state === 'done' ? [r.response] : []))
  const failed = Object.values(results).filter((r) => r.state === 'failed').length
  const imagesMissing = Object.values(results).filter(
    (r) => r.state === 'done' && r.response.image.kind === 'failed' && r.manual?.state !== 'done',
  ).length

  return (
    <div className="nasteh-import__body">
      <section className="nasteh-import__rules" aria-labelledby="nasteh-import-rules">
        <h2 id="nasteh-import-rules">{t('adminImport.rulesTitle')}</h2>
        <ul>
          <li>{t('adminImport.ruleCreate')}</li>
          <li>{t('adminImport.ruleUpdate')}</li>
          <li>{t('adminImport.ruleCategories')}</li>
          <li>{t('adminImport.ruleImages')}</li>
        </ul>
      </section>

      <div
        className={clsx('nasteh-import__drop', dragging && 'nasteh-import__drop--active')}
        onDragOver={(event) => {
          event.preventDefault()
          if (run !== 'running') setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          id="nasteh-import-file"
          className="nasteh-import__file"
          type="file"
          accept="application/json,.json"
          onChange={onPick}
          disabled={run === 'running' || checking}
        />
        <label htmlFor="nasteh-import-file" className="nasteh-import__pick">
          {loaded ? t('adminImport.chooseAnother') : t('adminImport.chooseFile')}
        </label>
        <span className="nasteh-import__hint">{loaded ? loaded.fileName : t('adminImport.dropHint')}</span>
      </div>

      <div aria-live="polite" className="nasteh-import__live">
        {checking && <p>{t('adminImport.checking')}</p>}
        {fileError && (
          <p className="nasteh-import__error" role="alert">
            {fileError}
          </p>
        )}
      </div>

      {preview && counts && (
        <>
          <ul className="nasteh-import__summary">
            <li>
              <strong>{counts.create}</strong> {t('adminImport.summaryCreate')}
            </li>
            <li>
              <strong>{counts.update}</strong> {t('adminImport.summaryUpdate')}
            </li>
            <li>
              <strong>{counts.unchanged}</strong> {t('adminImport.summaryUnchanged')}
            </li>
            <li className={clsx(counts.error > 0 && 'nasteh-import__summary--error')}>
              <strong>{counts.error}</strong> {t('adminImport.summaryError')}
            </li>
          </ul>

          {(preview.newCategories > 0 || preview.newBrands > 0 || preview.unknownKeys.length > 0) && (
            <div className="nasteh-import__notes">
              {preview.newCategories > 0 && (
                <p>{fill(t('adminImport.newCategories'), { count: String(preview.newCategories) })}</p>
              )}
              {preview.newBrands > 0 && <p>{fill(t('adminImport.newBrands'), { count: String(preview.newBrands) })}</p>}
              {preview.unknownKeys.length > 0 && (
                <p>{fill(t('adminImport.unknownKeys'), { keys: preview.unknownKeys.join(', ') })}</p>
              )}
            </div>
          )}

          {!preview.mediaStorage.ok && (
            <div className="nasteh-import__warning" role="alert">
              <strong>{t('adminImport.mediaStorageTitle')}</strong>
              <p>
                {fill(t('adminImport.mediaStorageBody'), {
                  dir: preview.mediaStorage.dir,
                  code: preview.mediaStorage.code,
                })}
              </p>
            </div>
          )}

          <div className="nasteh-import__actions">
            {run === 'running' ? (
              <Button
                buttonStyle="secondary"
                margin={false}
                onClick={() => {
                  stopRequested.current = true
                }}
              >
                {t('adminImport.stop')}
              </Button>
            ) : run === 'idle' ? (
              actionable > 0 ? (
                <Button buttonStyle="primary" margin={false} onClick={() => void startImport()}>
                  {fill(t('adminImport.start'), { count: String(actionable) })}
                </Button>
              ) : (
                <p>{t('adminImport.nothingToDo')}</p>
              )
            ) : (
              <Button el="link" to={`${adminRoute}/collections/products`} buttonStyle="secondary" margin={false}>
                {t('adminImport.toProducts')}
              </Button>
            )}
          </div>

          <div aria-live="polite" className="nasteh-import__live">
            {run === 'running' && (
              <p>
                {t('adminImport.running')}{' '}
                {fill(t('adminImport.progress'), { done: String(processed), total: String(actionable) })}
              </p>
            )}
            {run === 'stopped' && <p>{t('adminImport.stopped')}</p>}
            {run === 'done' && (
              <div className="nasteh-import__done">
                <h2>{t('adminImport.doneTitle')}</h2>
                <p>
                  {fill(t('adminImport.doneSummary'), {
                    created: String(done.filter((r) => r.status === 'created').length),
                    updated: String(done.filter((r) => r.status === 'updated').length),
                    unchanged: String(done.filter((r) => r.status === 'unchanged').length + counts.unchanged),
                    errors: String(failed + counts.error),
                  })}
                </p>
                {imagesMissing > 0 && <p>{fill(t('adminImport.imagesMissing'), { count: String(imagesMissing) })}</p>}
              </div>
            )}
          </div>
          {run === 'running' && <progress className="nasteh-import__progress" value={processed} max={actionable} />}

          <div className="nasteh-import__table-wrap">
            <table className="nasteh-import__table">
              <thead>
                <tr>
                  <th scope="col">{t('adminImport.colRow')}</th>
                  <th scope="col">{t('adminImport.colSku')}</th>
                  <th scope="col">{t('adminImport.colName')}</th>
                  <th scope="col">{t('adminImport.colCategory')}</th>
                  <th scope="col">{t('adminImport.colBrand')}</th>
                  <th scope="col">{t('adminImport.colPrice')}</th>
                  <th scope="col">{t('adminImport.colStock')}</th>
                  <th scope="col">{t('adminImport.colImage')}</th>
                  <th scope="col">{t('adminImport.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <PreviewTableRow
                    key={row.index}
                    row={row}
                    result={results[row.index]}
                    adminRoute={adminRoute}
                    onUpload={(productId, file) => void uploadImage(row.index, productId, file)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

type RowProps = {
  row: PreviewRow
  result: RowResult | undefined
  adminRoute: string
  onUpload: (productId: number, file: File) => void
}

function PreviewTableRow({ row, result, adminRoute, onUpload }: RowProps) {
  const issues = row.status === 'error' ? row.errors : []
  const imageUrl = row.status === 'error' ? null : row.imageUrl

  let price = '—'
  let stock = '—'
  if (row.status === 'create') {
    price = formatEur(row.priceEurCents)
    stock = String(row.stockQty)
  } else if (row.status === 'update' || row.status === 'unchanged') {
    if (row.changes.price) price = `${formatEur(row.changes.price.from)} → ${formatEur(row.changes.price.to)}`
    if (row.changes.stock) stock = `${row.changes.stock.from} → ${row.changes.stock.to}`
  }

  return (
    <tr className={clsx(`nasteh-import__row--${row.status}`)}>
      <td>{row.index + 1}</td>
      <td className="nasteh-import__mono">{row.sku ?? '—'}</td>
      <td>
        {row.name ?? '—'}
        {(issues.length > 0 || row.warnings.length > 0) && (
          <ul className="nasteh-import__issues">
            {issues.map((issue, i) => (
              <li key={`e${i}`} className="nasteh-import__issue--error">
                {issueText(issue)}
              </li>
            ))}
            {row.warnings.map((issue, i) => (
              <li key={`w${i}`} className="nasteh-import__issue--warning">
                {issueText(issue)}
              </li>
            ))}
          </ul>
        )}
      </td>
      <td>
        {row.status === 'create'
          ? row.categoryPath.map((step, i) => (
              <span key={i} className="nasteh-import__crumb">
                {i > 0 && ' › '}
                {step.name}
                {!step.exists && <em className="nasteh-import__new"> ({t('adminImport.isNew')})</em>}
              </span>
            ))
          : '—'}
      </td>
      <td>
        {row.status === 'create' && row.brand ? (
          <>
            {row.brand.name}
            {!row.brand.exists && <em className="nasteh-import__new"> ({t('adminImport.isNewBrand')})</em>}
          </>
        ) : (
          '—'
        )}
      </td>
      <td className="nasteh-import__num">{price}</td>
      <td className="nasteh-import__num">{stock}</td>
      <td>
        {imageUrl ? (
          <a href={imageUrl} target="_blank" rel="noopener noreferrer nofollow">
            {t('adminImport.imageLink')}
          </a>
        ) : (
          t('adminImport.noImage')
        )}
      </td>
      <td>
        <RowStatus row={row} result={result} adminRoute={adminRoute} onUpload={onUpload} />
      </td>
    </tr>
  )
}

function RowStatus({ row, result, adminRoute, onUpload }: RowProps) {
  if (!result) {
    const planned = {
      create: t('adminImport.statusCreate'),
      update: t('adminImport.statusUpdate'),
      unchanged: t('adminImport.statusUnchanged'),
      error: t('adminImport.statusError'),
    }[row.status]
    const details: string[] = []
    if ((row.status === 'update' || row.status === 'unchanged') && row.changes.image) {
      details.push(t('adminImport.changeImage'))
    }
    return (
      <>
        <span className={`nasteh-import__status nasteh-import__status--${row.status}`}>{planned}</span>
        {details.map((d) => (
          <span key={d} className="nasteh-import__detail">
            {d}
          </span>
        ))}
      </>
    )
  }
  if (result.state === 'pending') return <span className="nasteh-import__detail">{t('adminImport.resultPending')}</span>
  if (result.state === 'running') return <span className="nasteh-import__detail">{t('adminImport.resultRunning')}</span>
  if (result.state === 'failed') {
    return (
      <>
        <span className="nasteh-import__status nasteh-import__status--error">{t('adminImport.resultError')}</span>
        <span className="nasteh-import__detail nasteh-import__issue--error">{result.message}</span>
      </>
    )
  }

  const { response, manual } = result
  const label = {
    created: t('adminImport.resultCreated'),
    updated: t('adminImport.resultUpdated'),
    unchanged: t('adminImport.resultUnchanged'),
  }[response.status]
  const { image } = response
  const inputId = `nasteh-import-image-${row.index}`

  return (
    <>
      <span className={`nasteh-import__status nasteh-import__status--${response.status}`}>{label}</span>
      <a className="nasteh-import__detail" href={`${adminRoute}/collections/products/${response.productId}`}>
        {t('adminImport.openProduct')}
      </a>
      {image.kind === 'attached' && <span className="nasteh-import__detail">{t('adminImport.imageAttached')}</span>}
      {image.kind === 'kept' && <span className="nasteh-import__detail">{t('adminImport.imageKept')}</span>}
      {image.kind === 'failed' &&
        (manual?.state === 'done' ? (
          <span className="nasteh-import__detail">{t('adminImport.imageAttached')}</span>
        ) : (
          <div className="nasteh-import__manual">
            <span className="nasteh-import__issue--warning">{failureText(image.reason)}</span>
            <span className="nasteh-import__detail">{t('adminImport.manualHint')}</span>
            <input
              id={inputId}
              className="nasteh-import__file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              disabled={manual?.state === 'uploading'}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) onUpload(response.productId, file)
              }}
            />
            <label htmlFor={inputId} className="nasteh-import__pick nasteh-import__pick--small">
              {manual?.state === 'uploading' ? t('adminImport.uploading') : t('adminImport.uploadImage')}
            </label>
            {manual?.state === 'error' && <span className="nasteh-import__issue--error">{manual.message}</span>}
          </div>
        ))}
    </>
  )
}
