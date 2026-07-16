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
          'mt-0.5 h-4 w-4 shrink-0 border border-ink/30 bg-raised accent-brass',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-1 ring-offset-raised',
          'cursor-pointer',
          className,
        )}
        {...props}
      />
      {label && checkboxId && (
        <label htmlFor={checkboxId} className="cursor-pointer text-sm leading-snug text-ink2">
          {label}
        </label>
      )}
    </div>
  )
}
