'use client'

import clsx from 'clsx'
import React from 'react'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'ok' | 'danger'
}

const variantStyles: Record<'info' | 'ok' | 'danger', string> = {
  info: 'bg-steel/10 border-steel text-ink',
  ok: 'bg-ok/10 border-ok text-ok',
  danger: 'bg-danger/10 border-danger text-danger',
}

export function Alert({
  className,
  variant = 'info',
  children,
  ...props
}: AlertProps) {
  return (
    <div
      className={clsx(
        'rounded border px-4 py-3 text-sm',
        variantStyles[variant ?? 'info'],
        className,
      )}
      role="alert"
      {...props}
    >
      {children}
    </div>
  )
}
