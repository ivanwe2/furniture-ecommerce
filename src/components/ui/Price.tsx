'use client'

import { formatEur } from '@/lib/money'
import clsx from 'clsx'
import React from 'react'

interface PriceProps extends React.HTMLAttributes<HTMLSpanElement> {
  eurCents: number
}

export function Price({ eurCents, className, ...props }: PriceProps) {
  return (
    <span
      className={clsx('tabular-nums font-medium', className)}
      {...props}
    >
      {formatEur(eurCents)}
    </span>
  )
}
