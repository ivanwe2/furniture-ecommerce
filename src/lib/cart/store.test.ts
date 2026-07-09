import { describe, expect, it } from 'vitest'
import { useCart } from '@/lib/cart/store'

describe('cart store reducer logic', () => {
  it('add creates new line', () => {
    useCart.getState().add({ productSlug: 'test', sku: 'SKU1' }, 3)
    const { lines } = useCart.getState()
    expect(lines).toHaveLength(1)
    expect(lines[0]!).toEqual({ productSlug: 'test', sku: 'SKU1', qty: 3 })
  })

  it('add increments existing line', () => {
    useCart.getState().add({ productSlug: 'test', sku: 'SKU1' }, 5)
    const { lines } = useCart.getState()
    expect(lines[0]!.qty).toBe(8)
  })

  it('add clamps qty to max 999', () => {
    useCart.getState().clear()
    useCart.getState().add({ productSlug: 'test', sku: 'SKU2' }, 1500)
    const { lines } = useCart.getState()
    expect(lines[0]!.qty).toBe(999)
  })

  it('add clamps qty to min 1', () => {
    useCart.getState().clear()
    useCart.getState().add({ productSlug: 'test', sku: 'SKU3' }, -5)
    const { lines } = useCart.getState()
    expect(lines[0]!.qty).toBe(1)
  })

  it('setQty clamps to valid range', () => {
    useCart.getState().clear()
    useCart.getState().add({ productSlug: 'test', sku: 'SKU4' }, 10)
    useCart.getState().setQty('SKU4', 2000)
    expect(useCart.getState().lines[0]!.qty).toBe(999)
    useCart.getState().setQty('SKU4', -3)
    expect(useCart.getState().lines[0]!.qty).toBe(1)
  })

  it('remove deletes line by sku', () => {
    useCart.getState().clear()
    useCart.getState().add({ productSlug: 'test', sku: 'SKU5' }, 2)
    useCart.getState().add({ productSlug: 'test', sku: 'SKU6' }, 3)
    useCart.getState().remove('SKU5')
    const { lines } = useCart.getState()
    expect(lines).toHaveLength(1)
    expect(lines[0]!.sku).toBe('SKU6')
  })

  it('clear removes all lines', () => {
    useCart.getState().add({ productSlug: 'test', sku: 'SKU7' }, 1)
    useCart.getState().clear()
    expect(useCart.getState().lines).toHaveLength(0)
  })
})
