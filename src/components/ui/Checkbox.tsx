'use client'

import clsx from 'clsx'
import React from 'react'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export function Checkbox({ id, className, label, ...props }: CheckboxProps) {
  const checkboxId = id ?? props.name
  return (
    <div className="flex items-start gap-2">
      <input
        id={checkboxId}
        type="checkbox"
        className={clsx(
          'h-4 w-4 rounded border border-steel bg-cream text-brass',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-1 ring-offset-cream',
          'cursor-pointer',
          className,
        )}
        {...props}
      />
      {label && checkboxId && (
        <label htmlFor={checkboxId} className="text-sm text-ink leading-tight cursor-pointer">
          {label}
        </label>
      )}
    </div>
  )
}
