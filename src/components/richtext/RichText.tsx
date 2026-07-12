import * as React from 'react'
import clsx from 'clsx'
import { imageUrl } from '@/lib/images'
import type { Media } from '@/payload-types'

/**
 * Minimal server-side renderer for Payload's Lexical rich text. Handles the
 * default editor features plus tables (EXPERIMENTAL_TableFeature). Shared by the
 * product description and the legal pages so there's a single place to extend.
 */
type LexicalNode = Record<string, unknown>

function renderChildren(nodes: LexicalNode[] | undefined): React.ReactNode {
  if (!nodes) return null
  return nodes.map((child, i) => (
    <React.Fragment key={String(child.id ?? i)}>{renderNode(child)}</React.Fragment>
  ))
}

function renderHeading(level: number, children: React.ReactNode): React.ReactNode {
  switch (level) {
    case 1:
      return <h1 className="mb-4 mt-6 text-2xl font-bold text-ink">{children}</h1>
    case 2:
      return <h2 className="mb-3 mt-6 text-xl font-bold text-ink">{children}</h2>
    case 3:
      return <h3 className="mb-2 mt-4 text-lg font-semibold text-ink">{children}</h3>
    default:
      return <h4 className="mb-2 mt-4 text-base font-semibold text-ink">{children}</h4>
  }
}

function renderNode(node: LexicalNode): React.ReactNode {
  if (!node || typeof node !== 'object') return null

  const type = node.type as string | undefined
  const children = node.children as LexicalNode[] | undefined

  switch (type) {
    case 'paragraph':
      return <p className="mb-4 leading-relaxed text-ink">{renderChildren(children)}</p>

    case 'heading': {
      const tag = String(node.tag ?? 'h2')
      const level = parseInt(tag.replace('h', ''), 10) || 2
      return renderHeading(level, renderChildren(children))
    }

    case 'list': {
      const isBullet = node.listType === 'bullet' || node.format === 'bullet'
      return isBullet ? (
        <ul className="mb-4 list-disc pl-6 text-ink">{renderChildren(children)}</ul>
      ) : (
        <ol className="mb-4 list-decimal pl-6 text-ink">{renderChildren(children)}</ol>
      )
    }

    case 'listitem':
      return <li className="mb-1">{renderChildren(children)}</li>

    case 'quote':
      return (
        <blockquote className="mb-4 border-l-4 border-brass/40 pl-4 italic text-steel">
          {renderChildren(children)}
        </blockquote>
      )

    case 'horizontalrule':
      return <hr className="my-6 border-sand" />

    case 'table':
      return (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm text-ink">
            <tbody>{renderChildren(children)}</tbody>
          </table>
        </div>
      )

    case 'tablerow':
      return <tr>{renderChildren(children)}</tr>

    case 'tablecell': {
      const isHeader = Boolean(node.headerState)
      const className = clsx(
        'border border-sand px-3 py-2 text-left align-top',
        isHeader && 'bg-sand font-semibold',
      )
      return isHeader ? (
        <th className={className}>{renderChildren(children)}</th>
      ) : (
        <td className={className}>{renderChildren(children)}</td>
      )
    }

    case 'text': {
      let el: React.ReactNode = String(node.text ?? '')
      if (node.bold) el = <strong>{el}</strong>
      if (node.italic) el = <em>{el}</em>
      if (node.underline) el = <u>{el}</u>
      if (node.strikethrough) el = <s>{el}</s>
      return el
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

    case 'upload':
    case 'image': {
      const media = (node.value ?? node.fields) as Record<string, unknown> | undefined
      const filename = typeof media?.filename === 'string' ? media.filename : ''
      if (!filename) return null
      const alt = typeof media?.alt === 'string' ? media.alt : ''
      return (
        <img
          src={imageUrl({ filename } as Pick<Media, 'filename'>, 'detail')}
          alt={alt}
          className="mb-4 h-auto max-w-full rounded"
        />
      )
    }

    default:
      return renderChildren(children)
  }
}

export function RichText({ content }: { content: unknown }): React.ReactNode {
  if (!content || typeof content !== 'object') return null
  const root = (content as { root?: unknown }).root
  if (!root || typeof root !== 'object') return null
  const children = (root as { children?: unknown }).children
  if (!Array.isArray(children)) return null
  return <>{renderChildren(children as LexicalNode[])}</>
}
