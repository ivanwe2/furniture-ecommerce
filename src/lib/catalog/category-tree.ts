/**
 * Category-tree helpers. Kept free of Payload imports so they are unit-testable
 * without booting the CMS; the shape below is structurally what `CategoryNode`
 * already is.
 */
export type TreeNode = { id: number | string; slug: string; children: TreeNode[] }

/** Every id in a node's subtree, the node itself first. */
function subtreeIds(node: TreeNode): string[] {
  return [String(node.id), ...node.children.flatMap(subtreeIds)]
}

/**
 * The ids of the category with `slug` **and all of its descendants** — what a
 * listing needs, since products hang off leaf categories while customers browse
 * from the parent.
 *
 * The previous inline version walked the whole tree pushing only ids whose slug
 * matched. Slugs are unique, so it always returned exactly one id and a parent
 * category listed nothing at all — `/category/mebelen-obkov`, with 11 children
 * and 23 products beneath it, rendered an empty grid.
 *
 * Returns `[]` when the slug is not in the tree, which callers treat as "no
 * such category" rather than "everything".
 */
export function collectSubtreeIds(nodes: TreeNode[], slug: string): string[] {
  for (const node of nodes) {
    if (node.slug === slug) return subtreeIds(node)
    const found = collectSubtreeIds(node.children, slug)
    if (found.length > 0) return found
  }
  return []
}
