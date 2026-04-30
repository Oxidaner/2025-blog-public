'use client'

import { useEffect } from 'react'

let mermaidInitialized = false

export function BlogArticleEnhancements() {
	useEffect(() => {
		const blocks = Array.from(document.querySelectorAll<HTMLElement>('[data-blog-article-content] .mermaid-block[data-mermaid-code]'))
		if (blocks.length === 0) return

		let cancelled = false

		async function renderMermaidBlocks() {
			try {
				const mod = await import('mermaid')
				const mermaid = mod.default

				if (!mermaidInitialized) {
					mermaid.initialize({
						startOnLoad: false,
						securityLevel: 'strict',
						theme: 'neutral'
					})
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

		void renderMermaidBlocks()

		return () => {
			cancelled = true
		}
	}, [])

	return null
}
