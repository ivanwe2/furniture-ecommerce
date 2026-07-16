'use client'

import clsx from 'clsx'
import React from 'react'

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'error'> {
  label?: string
  error?: string | null
  options: { value: string; label: string }[]
}

export function Select({
  id,
  className,
  label,
  error,
  options,
  ...props
}: SelectProps) {
  const selectId = id ?? props.name
  return (
    <div className="flex flex-col gap-1.5">
      {label && selectId && (
        <label htmlFor={selectId} className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-steel">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={clsx(
          'w-full border border-ink/20 bg-raised px-3.5 py-2.5 text-sm text-ink transition-colors',
          'focus-visible:outline-none focus-visible:border-brass focus-visible:ring-1 focus-visible:ring-brass',
          error && 'border-danger focus-visible:border-danger focus-visible:ring-danger',
          className,
        )}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && selectId && (
        <p id={`${selectId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
