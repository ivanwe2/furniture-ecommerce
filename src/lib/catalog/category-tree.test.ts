import { describe, expect, it } from 'vitest'
import { collectSubtreeIds, type TreeNode } from './category-tree'

const node = (id: number, slug: string, children: TreeNode[] = []): TreeNode => ({ id, slug, children })

// Mirrors the real shape: products hang off the leaves, customers browse the root.
const tree: TreeNode[] = [
  node(1, 'mebelen-obkov', [
    node(2, 'panti'),
    node(3, 'drzhki', [node(4, 'drzhki-relsa'), node(5, 'drzhki-knob')]),
  ]),
  node(6, 'mehanizmi-za-vgrazhdane', [node(7, 'povdigachi')]),
]

describe('collectSubtreeIds', () => {
  it('returns the parent AND every descendant — the bug that emptied parent listings', () => {
    // Previously this returned only ['1'], so /category/mebelen-obkov showed
    // nothing even though 23 products sat in its children.
    expect(collectSubtreeIds(tree, 'mebelen-obkov').sort()).toEqual(['1', '2', '3', '4', '5'])
  })

  it('collects a mid-level node with its own children', () => {
    expect(collectSubtreeIds(tree, 'drzhki').sort()).toEqual(['3', '4', '5'])
  })

  it('returns just the id for a leaf', () => {
    expect(collectSubtreeIds(tree, 'panti')).toEqual(['2'])
    expect(collectSubtreeIds(tree, 'povdigachi')).toEqual(['7'])
  })

  it('finds nodes in later root branches', () => {
    expect(collectSubtreeIds(tree, 'mehanizmi-za-vgrazhdane').sort()).toEqual(['6', '7'])
  })

  it('returns [] for an unknown slug — callers must not read that as "everything"', () => {
    expect(collectSubtreeIds(tree, 'nope')).toEqual([])
    expect(collectSubtreeIds([], 'panti')).toEqual([])
  })

  it('returns ids as strings, matching the query layer', () => {
    for (const id of collectSubtreeIds(tree, 'mebelen-obkov')) expect(typeof id).toBe('string')
  })
})
