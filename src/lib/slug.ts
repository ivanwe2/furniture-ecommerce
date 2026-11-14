const MAP: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',
  м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',
  ш:'sh',щ:'sht',ъ:'a',ь:'y',ю:'yu',я:'ya',
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .split('')
    .map((ch) => MAP[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

/**
 * The slug a document is saved with: the one typed in the admin, passed
 * through `slugify`, else one made from the name. Every slug is therefore
 * lowercase ASCII — a pasted Cyrillic slug („амортисьор") used to be stored
 * as-is and its page answered 404, because route params arrive URL-encoded.
 * Idempotent: an already-clean slug comes back unchanged, so re-saving never
 * moves a URL. undefined = nothing usable, leave the field alone.
 */
export function normalizeSlug(slug: unknown, name: unknown): string | undefined {
  const fromSlug = typeof slug === 'string' ? slugify(slug) : ''
  if (fromSlug) return fromSlug
  const fromName = typeof name === 'string' ? slugify(name) : ''
  return fromName || undefined
}
