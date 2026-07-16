'use client'

import clsx from 'clsx'
import React from 'react'

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'error'> {
  label?: string
  error?: string | null
}

export function Textarea({
  id,
  className,
  label,
  error,
  ...props
}: TextareaProps) {
  const textareaId = id ?? props.name
  return (
    <div className="flex flex-col gap-1.5">
      {label && textareaId && (
        <label htmlFor={textareaId} className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-steel">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={clsx(
          'w-full border border-ink/20 bg-raised px-3.5 py-2.5 text-sm text-ink transition-colors',
          'placeholder:text-steel/60 resize-y min-h-[120px]',
          'focus-visible:outline-none focus-visible:border-brass focus-visible:ring-1 focus-visible:ring-brass',
          error && 'border-danger focus-visible:border-danger focus-visible:ring-danger',
          className,
        )}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...props}
      />
      {error && textareaId && (
        <p id={`${textareaId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
