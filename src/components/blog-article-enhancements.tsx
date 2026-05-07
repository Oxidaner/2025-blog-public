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
				addZoomHandlers(table, '点击放大表格', () => {
					setLightbox({
						kind: 'table',
						title: '表格预览',
						html: table.outerHTML
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
