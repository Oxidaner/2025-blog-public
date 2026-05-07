'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { DialogModal } from '@/components/dialog-modal'
import { MERMAID_RENDER_CONFIG } from '@/lib/mermaid-config'
import { cn } from '@/lib/utils'

let mermaidInitialized = false

type ArticleLightboxState = {
	kind: 'image' | 'table' | 'mermaid'
	title: string
	src?: string
	html?: string
}

type BlogArticleEnhancementsProps = {
	contentKey?: string
}

function clearColumnHover(tableFrame: HTMLElement) {
	tableFrame.classList.remove('is-column-hovering')
	tableFrame.querySelectorAll('.is-column-hovered').forEach(cell => {
		cell.classList.remove('is-column-hovered')
	})
}

function highlightTableColumn(tableFrame: HTMLElement, cell: HTMLElement) {
	const row = cell.parentElement
	if (!row) return
	const index = Array.from(row.children).indexOf(cell)
	if (index < 0) return

	clearColumnHover(tableFrame)
	tableFrame.classList.add('is-column-hovering')
	const rows = Array.from(tableFrame.querySelectorAll('tr'))
	for (const tableRow of rows) {
		const targetCell = tableRow.children[index]
		if (targetCell instanceof HTMLElement) {
			targetCell.classList.add('is-column-hovered')
		}
	}
}

function getCleanOuterHtml(element: HTMLElement) {
	const clone = element.cloneNode(true) as HTMLElement
	clone.classList.remove('is-column-hovering')
	clone.querySelectorAll('.is-column-hovered').forEach(cell => {
		cell.classList.remove('is-column-hovered')
	})
	return clone.outerHTML
}

function getSvgOrientation(svg: string) {
	const match = svg.match(/viewBox=["'][^"']*?\s([\d.]+)\s([\d.]+)["']/i)
	if (!match) return 'balanced'
	const width = Number(match[1])
	const height = Number(match[2])
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 'balanced'
	if (height / width > 1.25) return 'tall'
	if (width / height > 1.25) return 'wide'
	return 'balanced'
}

export function BlogArticleEnhancements({ contentKey }: BlogArticleEnhancementsProps) {
	const [lightbox, setLightbox] = useState<ArticleLightboxState | null>(null)

	useEffect(() => {
		const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-blog-article-content]'))
		if (roots.length === 0) return

		let cancelled = false
		const cleanupFns: Array<() => void> = []

		async function renderMermaidBlocks() {
			const blocks = roots.flatMap(root => Array.from(root.querySelectorAll<HTMLElement>('.mermaid-block[data-mermaid-code]')))
			if (blocks.length === 0) return

			try {
				const mod = await import('mermaid')
				const mermaid = mod.default

				if (!mermaidInitialized) {
					mermaid.initialize(MERMAID_RENDER_CONFIG)
					mermaidInitialized = true
				}

				await Promise.all(
					blocks.map(async (block, index) => {
						if (cancelled || block.dataset.rendered === 'true') return
						const code = block.dataset.mermaidCode || ''
						const id = `server-mermaid-${index}-${Math.random().toString(36).slice(2)}`

						try {
							const { svg } = await mermaid.render(id, code)
							if (cancelled) return
							block.innerHTML = svg
							block.dataset.mermaidOrientation = getSvgOrientation(svg)
							block.dataset.rendered = 'true'
						} catch (error) {
							if (cancelled) return
							block.classList.add('mermaid-block-error')
							block.textContent = error instanceof Error ? error.message : 'Mermaid render failed'
						}
					})
				)
			} catch {
				blocks.forEach(block => {
					block.classList.add('mermaid-block-error')
					block.textContent = 'Mermaid render failed'
				})
			}
		}

		function addZoomHandlers(element: HTMLElement, title: string, open: () => void) {
			element.classList.add('article-zoomable')
			element.setAttribute('title', title)
			const handleClick = (event: MouseEvent) => {
				const target = event.target as HTMLElement | null
				if (target?.closest('a, button, input, textarea, select')) return
				open()
			}
			const handleKeyDown = (event: KeyboardEvent) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()
					open()
				}
			}
			element.addEventListener('click', handleClick)
			element.addEventListener('keydown', handleKeyDown)
			element.setAttribute('tabindex', '0')
			cleanupFns.push(() => {
				element.removeEventListener('click', handleClick)
				element.removeEventListener('keydown', handleKeyDown)
			})
		}

		function addTableColumnHover(tableFrame: HTMLElement) {
			const handlePointerOver = (event: PointerEvent) => {
				const cell = (event.target as HTMLElement | null)?.closest('th, td')
				if (!(cell instanceof HTMLElement) || !tableFrame.contains(cell)) return
				highlightTableColumn(tableFrame, cell)
			}
			const handleFocusIn = (event: FocusEvent) => {
				const cell = (event.target as HTMLElement | null)?.closest('th, td')
				if (!(cell instanceof HTMLElement) || !tableFrame.contains(cell)) return
				highlightTableColumn(tableFrame, cell)
			}
			const handleClear = () => clearColumnHover(tableFrame)

			tableFrame.addEventListener('pointerover', handlePointerOver)
			tableFrame.addEventListener('pointerleave', handleClear)
			tableFrame.addEventListener('focusin', handleFocusIn)
			tableFrame.addEventListener('focusout', handleClear)
			cleanupFns.push(() => {
				tableFrame.removeEventListener('pointerover', handlePointerOver)
				tableFrame.removeEventListener('pointerleave', handleClear)
				tableFrame.removeEventListener('focusin', handleFocusIn)
				tableFrame.removeEventListener('focusout', handleClear)
			})
		}

		for (const root of roots) {
			const images = Array.from(root.querySelectorAll<HTMLImageElement>('img:not([data-markdown-image])'))
			for (const image of images) {
				addZoomHandlers(image, '点击放大图片', () => {
					setLightbox({
						kind: 'image',
						title: image.alt || image.title || '图片预览',
						src: image.currentSrc || image.src
					})
				})
			}

			const tables = Array.from(root.querySelectorAll<HTMLElement>('.markdown-table-frame'))
			for (const table of tables) {
				addTableColumnHover(table)
				addZoomHandlers(table, '点击放大表格', () => {
					setLightbox({
						kind: 'table',
						title: '表格预览',
						html: getCleanOuterHtml(table)
					})
				})
			}

			const mermaidBlocks = Array.from(root.querySelectorAll<HTMLElement>('.mermaid-block'))
			for (const block of mermaidBlocks) {
				addZoomHandlers(block, '点击放大图表', () => {
					setLightbox({
						kind: 'mermaid',
						title: 'Mermaid 图表',
						html: block.outerHTML
					})
				})
			}
		}

		void renderMermaidBlocks()

		return () => {
			cancelled = true
			cleanupFns.forEach(cleanup => cleanup())
		}
	}, [contentKey])

	useEffect(() => {
		if (lightbox?.kind !== 'table') return
		const tableFrame = document.querySelector<HTMLElement>('.article-lightbox-html-table .markdown-table-frame')
		if (!tableFrame) return

		const handlePointerOver = (event: PointerEvent) => {
			const cell = (event.target as HTMLElement | null)?.closest('th, td')
			if (!(cell instanceof HTMLElement) || !tableFrame.contains(cell)) return
			highlightTableColumn(tableFrame, cell)
		}
		const handleClear = () => clearColumnHover(tableFrame)

		tableFrame.addEventListener('pointerover', handlePointerOver)
		tableFrame.addEventListener('pointerleave', handleClear)
		return () => {
			tableFrame.removeEventListener('pointerover', handlePointerOver)
			tableFrame.removeEventListener('pointerleave', handleClear)
		}
	}, [lightbox])

	return (
		<DialogModal open={!!lightbox} onClose={() => setLightbox(null)} className='article-lightbox-panel max-w-none bg-white/95 p-4'>
			{lightbox && (
				<div className={cn('article-lightbox-content', `article-lightbox-content-${lightbox.kind}`)}>
					<div className='article-lightbox-header'>
						<div className='truncate text-sm font-medium'>{lightbox.title}</div>
						<button type='button' className='article-lightbox-close' onClick={() => setLightbox(null)} aria-label='关闭'>
							<X size={16} />
						</button>
					</div>
					{lightbox.kind === 'image' && lightbox.src && <img src={lightbox.src} alt={lightbox.title} className='article-lightbox-image' />}
					{lightbox.html && <div className={cn('article-lightbox-html', `article-lightbox-html-${lightbox.kind}`)} dangerouslySetInnerHTML={{ __html: lightbox.html }} />}
				</div>
			)}
		</DialogModal>
	)
}
