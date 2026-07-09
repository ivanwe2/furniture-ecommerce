'use client'

import clsx from 'clsx'
import React from 'react'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'error'> {
  label?: string
  error?: string | null
}

export function Input({
  id,
  className,
  label,
  error,
  ...props
}: InputProps) {
  const inputId = id ?? props.name
  return (
    <div className="flex flex-col gap-1.5">
      {label && inputId && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="text"
        className={clsx(
          'w-full rounded border border-steel bg-cream px-3 py-2 text-sm text-ink',
          'placeholder:text-steel/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-1 ring-offset-cream',
          error && 'border-danger focus-visible:ring-danger',
          className,
        )}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && inputId && (
        <p id={`${inputId}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
