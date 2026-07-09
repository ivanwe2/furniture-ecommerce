'use client'

import { Skeleton } from '@/components/ui'

export default function Loading() {
  return (
    <div className="space-y-8 py-12">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3] w-full" />
        ))}
      </div>
    </div>
  )
}
