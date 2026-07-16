'use client'

import clsx from 'clsx'
import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'ok' | 'danger' | 'steel'
}

const variantStyles: Record<'default' | 'ok' | 'danger' | 'steel', string> = {
  default: 'border-brass/40 text-brass-dark',
  ok: 'border-ok/40 text-ok',
  danger: 'border-danger/40 text-danger',
  steel: 'border-ink/20 text-steel',
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.1em]',
        variantStyles[variant ?? 'default'],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
