'use client'

import { useEffect } from 'react'
import { useCart } from '@/lib/cart/store'

/**
 * Triggers cart rehydration once, after mount. The store uses
 * `skipHydration: true` (SSR-safe), so the persisted cart is not loaded until
 * `rehydrate()` runs in an effect — matching the server-rendered skeleton on
 * first paint, then swapping in the real cart. Mounted once in the site layout.
 */
export function CartHydrator() {
  useEffect(() => {
    void useCart.persist.rehydrate()
  }, [])
  return null
}
