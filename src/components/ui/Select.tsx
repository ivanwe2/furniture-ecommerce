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
        <label htmlFor={selectId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={clsx(
          'w-full rounded border border-steel bg-cream px-3 py-2 text-sm text-ink',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-1 ring-offset-cream',
          error && 'border-danger focus-visible:ring-danger',
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
        <p id={`${selectId}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
