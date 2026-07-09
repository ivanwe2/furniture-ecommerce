'use client'

import * as React from 'react'
import { imageUrl } from '@/lib/images'
import type { Media } from '@/payload-types'

type LexicalNode = Record<string, unknown>

function renderChildren(nodes: LexicalNode[] | undefined): React.ReactNode {
  if (!nodes) return null
  return nodes.map((child, i) => <React.Fragment key={String(child.id ?? i)}>{renderNode(child)}</React.Fragment>)
}

function renderHeading(level: number, children: React.ReactNode) {
  switch (level) {
    case 1:
      return <h1 className="mb-4 text-2xl font-bold text-ink">{children}</h1>
    case 2:
      return <h2 className="mb-4 text-xl font-bold text-ink">{children}</h2>
    case 3:
      return <h3 className="mb-4 text-lg font-bold text-ink">{children}</h3>
    default:
      return <h4 className="mb-4 text-base font-bold text-ink">{children}</h4>
  }
}

function renderNode(node: LexicalNode): React.ReactNode {
  if (!node || typeof node !== 'object') return null

  const type = node.type as string | undefined
  const children = node.children as LexicalNode[] | undefined

  switch (type) {
    case 'paragraph':
      return <p className="mb-4 text-ink">{renderChildren(children)}</p>

    case 'heading': {
      const tag = String(node.tag ?? 'h2')
      const level = parseInt(tag.replace('h', ''), 10) || 2
      return renderHeading(level, renderChildren(children))
    }

    case 'list': {
      const isBullet = node.format === 'bullet'
      if (isBullet) {
        return <ul className="mb-4 list-disc pl-6 text-ink">{renderChildren(children)}</ul>
      }
      return <ol className="mb-4 list-decimal pl-6 text-ink">{renderChildren(children)}</ol>
    }

    case 'listitem':
      return <li className="mb-1">{renderChildren(children)}</li>

    case 'text': {
      const text = String(node.text ?? '')
      if (node.bold) return <strong>{text}</strong>
      if (node.italic) return <em>{text}</em>
      if (node.underline) return <u>{text}</u>
      if (node.strikethrough) return <s>{text}</s>
      return text
    }

    case 'link': {
      const linkData = node.fields as Record<string, unknown> | undefined
      const href = String(linkData?.url ?? '')
      const isExternal = href.startsWith('http')
      return (
        <a
          href={href}
          className="text-brass underline hover:opacity-80"
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
        >
          {renderChildren(children)}
        </a>
      )
    }

    case 'image': {
      const imgData = node.fields as Record<string, unknown> | undefined
      const filename = String(imgData?.filename ?? '')
      const alt = String(imgData?.alt ?? '')
      if (!filename) return null
      const src = imageUrl({ filename } as Pick<Media, 'filename'>, 'detail')
      return <img src={src} alt={alt} className="mb-4 h-auto max-w-full rounded" />
    }

    default:
      return renderChildren(children)
  }
}

export default function PageSlugClient({ content }: { content: LexicalNode | null }) {
  if (!content) return null
  const root = content.root as LexicalNode | undefined
  if (!root || !Array.isArray(root.children)) return null
  return <>{renderChildren(root.children)}</>
}
