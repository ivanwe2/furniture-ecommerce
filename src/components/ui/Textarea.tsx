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
        <label htmlFor={textareaId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={clsx(
          'w-full rounded border border-steel bg-cream px-3 py-2 text-sm text-ink',
          'placeholder:text-steel/60 resize-y min-h-[120px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-1 ring-offset-cream',
          error && 'border-danger focus-visible:ring-danger',
          className,
        )}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...props}
      />
      {error && textareaId && (
        <p id={`${textareaId}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
