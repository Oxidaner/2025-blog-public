'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { MERMAID_RENDER_CONFIG } from '@/lib/mermaid-config'

type MermaidState = {
	svg: string
	error: string | null
	loading: boolean
}

let mermaidInitialized = false

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

export function MermaidBlock({ code }: { code: string }) {
	const reactId = useId()
	const diagramId = useMemo(() => `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [reactId])
	const [state, setState] = useState<MermaidState>({ svg: '', error: null, loading: true })

	useEffect(() => {
		let cancelled = false

		async function renderDiagram() {
			setState({ svg: '', error: null, loading: true })

			try {
				const mod = await import('mermaid')
				const mermaid = mod.default

				if (!mermaidInitialized) {
					mermaid.initialize(MERMAID_RENDER_CONFIG)
					mermaidInitialized = true
				}

				const { svg } = await mermaid.render(diagramId, code)
				if (!cancelled) {
					setState({ svg, error: null, loading: false })
				}
			} catch (error) {
				if (!cancelled) {
					setState({
						svg: '',
						error: error instanceof Error ? error.message : 'Mermaid 渲染失败',
						loading: false
					})
				}
			}
		}

		renderDiagram()

		return () => {
			cancelled = true
		}
	}, [code, diagramId])

	if (state.loading) {
		return <div className='mermaid-block mermaid-block-loading'>Mermaid 渲染中...</div>
	}

	if (state.error) {
		return (
			<div className='mermaid-block mermaid-block-error'>
				<div className='mermaid-block-error-title'>Mermaid 语法错误</div>
				<pre>{state.error}</pre>
			</div>
		)
	}

	return <div className='mermaid-block' data-mermaid-orientation={getSvgOrientation(state.svg)} dangerouslySetInnerHTML={{ __html: state.svg }} />
}
