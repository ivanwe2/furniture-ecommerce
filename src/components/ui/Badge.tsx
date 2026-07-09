'use client'

import clsx from 'clsx'
import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'ok' | 'danger' | 'steel'
}

const variantStyles: Record<'default' | 'ok' | 'danger' | 'steel', string> = {
  default: 'bg-brass/15 text-brass',
  ok: 'bg-ok/15 text-ok',
  danger: 'bg-danger/15 text-danger',
  steel: 'bg-steel/15 text-steel',
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variantStyles[variant ?? 'default'],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
