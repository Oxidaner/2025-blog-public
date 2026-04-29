'use client'

import { useEffect, useId, useMemo, useState } from 'react'

type MermaidState = {
	svg: string
	error: string | null
	loading: boolean
}

let mermaidInitialized = false

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
					mermaid.initialize({
						startOnLoad: false,
						securityLevel: 'strict',
						theme: 'neutral'
					})
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

	return <div className='mermaid-block' dangerouslySetInnerHTML={{ __html: state.svg }} />
}
