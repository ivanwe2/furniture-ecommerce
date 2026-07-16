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
        <label htmlFor={inputId} className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-steel">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="text"
        className={clsx(
          'w-full border border-ink/20 bg-raised px-3.5 py-2.5 text-sm text-ink transition-colors',
          'placeholder:text-steel/60',
          'focus-visible:outline-none focus-visible:border-brass focus-visible:ring-1 focus-visible:ring-brass',
          error && 'border-danger focus-visible:border-danger focus-visible:ring-danger',
          className,
        )}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && inputId && (
        <p id={`${inputId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
