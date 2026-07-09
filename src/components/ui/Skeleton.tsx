'use client'

import clsx from 'clsx'
import React from 'react'

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('animate-pulse rounded bg-sand', className)}
      {...props}
    />
  )
}
