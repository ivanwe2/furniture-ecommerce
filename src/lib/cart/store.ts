'use client'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type CartLine = { productSlug: string; sku: string; qty: number }

type CartState = {
  lines: CartLine[]
  hydrated: boolean
  add: (l: Omit<CartLine, 'qty'>, qty?: number) => void
  setQty: (sku: string, qty: number) => void
  remove: (sku: string) => void
  clear: () => void
}

const clamp = (q: number) => Math.min(999, Math.max(1, Math.trunc(q) || 1))

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [], hydrated: false,
      add: (l, qty = 1) => set((s) => {
        const ex = s.lines.find((x) => x.sku === l.sku)
        return ex
          ? { lines: s.lines.map((x) => x.sku === l.sku ? { ...x, qty: clamp(x.qty + qty) } : x) }
          : { lines: [...s.lines, { ...l, qty: clamp(qty) }] }
      }),
      setQty: (sku, qty) => set((s) => ({ lines: s.lines.map((x) => x.sku === sku ? { ...x, qty: clamp(qty) } : x) })),
      remove: (sku) => set((s) => ({ lines: s.lines.filter((x) => x.sku !== sku) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: 'nasteh-cart-v1',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      onRehydrateStorage: () => (state) => { if (state) state.hydrated = true },
    },
  ),
)
