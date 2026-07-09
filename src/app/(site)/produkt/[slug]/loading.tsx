'use client'

import { Skeleton } from '@/components/ui'

export default function ProductLoading() {
  return (
    <div className="space-y-8 py-8">
      {/* Breadcrumb skeleton */}
      <Skeleton className="h-5 w-40" />

      {/* Gallery + info skeleton */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[55%_45%]">
        <Skeleton className="aspect-[4/3] rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Items table skeleton */}
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
