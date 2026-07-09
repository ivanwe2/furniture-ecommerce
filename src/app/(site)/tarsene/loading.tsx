'use client'

import { Skeleton } from '@/components/ui'

export default function SearchLoading() {
  return (
    <div className="space-y-6 py-8">
      {/* Breadcrumb skeleton */}
      <Skeleton className="h-5 w-40" />

      {/* Heading skeleton */}
      <Skeleton className="h-8 w-64" />

      {/* Products grid skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3]" />
        ))}
      </div>
    </div>
  )
}
