'use client'

import dynamic from 'next/dynamic'
import { Download, FileUp, RotateCcw } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createWhiteboardFile, createWhiteboardFilename, parseWhiteboardFile, WHITEBOARD_STORAGE_KEY, type WhiteboardFile } from '@/lib/excalidraw-storage'

type ExcalidrawAPI = {
	getSceneElements: () => readonly unknown[]
	getAppState: () => Record<string, unknown>
	getFiles: () => Record<string, unknown>
	updateScene: (sceneData: { elements?: readonly unknown[]; appState?: Record<string, unknown> }) => void
	resetScene: () => void
	history: {
		clear: () => void
	}
}

const Excalidraw = dynamic(() => import('@excalidraw/excalidraw').then(mod => mod.Excalidraw), {
	ssr: false,
	loading: () => <div className='flex h-full items-center justify-center text-sm text-secondary'>白板加载中...</div>
})

export default function WhiteboardClient() {
	const [initialData, setInitialData] = useState<WhiteboardFile | null>(() => loadStoredWhiteboard())
	const [saveState, setSaveState] = useState('未修改')
	const apiRef = useRef<ExcalidrawAPI | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const saveTimerRef = useRef<number | null>(null)

	const excalidrawInitialData = useMemo(() => {
		if (!initialData) {
			return {
				appState: {
					viewBackgroundColor: '#fffaf4',
					currentItemStrokeColor: '#5B423F'
				}
			}
		}

		return {
			elements: initialData.elements,
			appState: initialData.appState,
			files: initialData.files
		}
	}, [initialData])

	const persistScene = useCallback((elements: readonly unknown[], appState: Record<string, unknown>, files: Record<string, unknown>) => {
		if (saveTimerRef.current) {
			window.clearTimeout(saveTimerRef.current)
		}

		setSaveState('保存中...')
		saveTimerRef.current = window.setTimeout(() => {
			try {
				const data = createWhiteboardFile(elements, sanitizeAppState(appState), files)
				localStorage.setItem(WHITEBOARD_STORAGE_KEY, JSON.stringify(data))
				setSaveState('已自动保存')
			} catch (error) {
				console.error('Failed to save whiteboard:', error)
				setSaveState('保存失败')
			}
		}, 350)
	}, [])

	const handleExport = () => {
		const api = apiRef.current
		if (!api) return

		const data = createWhiteboardFile(api.getSceneElements(), sanitizeAppState(api.getAppState()), api.getFiles())
		const blob = new Blob([JSON.stringify(data, null, '\t')], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = createWhiteboardFilename()
		link.click()
		URL.revokeObjectURL(url)
		toast.success('白板已导出')
	}

	const handleImportFile = async (file: File) => {
		try {
			const data = parseWhiteboardFile(await file.text())
			localStorage.setItem(WHITEBOARD_STORAGE_KEY, JSON.stringify(data))
			setInitialData(data)
			apiRef.current?.updateScene({
				elements: data.elements,
				appState: data.appState
			})
			setSaveState('已导入')
			toast.success('白板已导入')
		} catch (error: any) {
			toast.error(error?.message || '导入失败')
		}
	}

	const handleClear = () => {
		if (!confirm('确定要清空当前白板吗？')) return
		apiRef.current?.resetScene()
		apiRef.current?.history.clear()
		localStorage.removeItem(WHITEBOARD_STORAGE_KEY)
		setInitialData(null)
		setSaveState('已清空')
	}

	return (
		<div className='flex h-dvh flex-col overflow-hidden bg-[#f7f1e8] pt-24 max-sm:pt-22'>
			<input
				ref={fileInputRef}
				type='file'
				accept='.excalidraw,application/json'
				className='hidden'
				onChange={async e => {
					const file = e.target.files?.[0]
					if (file) await handleImportFile(file)
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			<div className='mx-auto flex w-full max-w-[1440px] shrink-0 items-center justify-between gap-4 px-6 pb-4 max-sm:flex-col max-sm:items-start max-sm:px-4'>
				<div>
					<h1 className='text-primary text-2xl font-semibold'>白板</h1>
					<p className='text-secondary mt-1 text-sm'>独立 Excalidraw 画布，自动保存在当前浏览器。</p>
				</div>
				<div className='flex flex-wrap items-center gap-2'>
					<span className='rounded-full border bg-white/60 px-3 py-1.5 text-xs text-secondary'>{saveState}</span>
					<ToolButton icon={FileUp} label='导入' onClick={() => fileInputRef.current?.click()} />
					<ToolButton icon={Download} label='导出' onClick={handleExport} />
					<ToolButton icon={RotateCcw} label='清空' onClick={handleClear} tone='danger' />
				</div>
			</div>

			<div className='mx-auto min-h-0 w-full max-w-[1440px] flex-1 px-6 pb-6 max-sm:px-4'>
				<div className='h-full min-h-[620px] overflow-hidden rounded-2xl border bg-white shadow-sm'>
					<Excalidraw
						excalidrawAPI={api => {
							apiRef.current = api as ExcalidrawAPI
						}}
						initialData={excalidrawInitialData as any}
						onChange={(elements, appState, files) => persistScene(elements, appState as unknown as Record<string, unknown>, files as unknown as Record<string, unknown>)}
						theme='light'
						name='Oxidaner Whiteboard'
						UIOptions={{
							canvasActions: {
								saveToActiveFile: false,
								loadScene: false,
								clearCanvas: false,
								toggleTheme: true
							}
						}}
					/>
				</div>
			</div>
		</div>
	)
}

function ToolButton({
	icon: Icon,
	label,
	onClick,
	tone = 'default'
}: {
	icon: React.ComponentType<{ className?: string }>
	label: string
	onClick: () => void
	tone?: 'default' | 'danger'
}) {
	return (
		<button
			type='button'
			onClick={onClick}
			className={cn(
				'flex items-center gap-2 rounded-xl border bg-white/70 px-3 py-2 text-sm shadow-sm transition-colors hover:bg-white',
				tone === 'danger' && 'text-red-500 hover:border-red-200'
			)}>
			<Icon className='size-4' />
			{label}
		</button>
	)
}

function loadStoredWhiteboard() {
	if (typeof window === 'undefined') return null

	const stored = localStorage.getItem(WHITEBOARD_STORAGE_KEY)
	if (!stored) return null

	try {
		return parseWhiteboardFile(stored)
	} catch (error) {
		console.error('Failed to restore whiteboard:', error)
		return null
	}
}

function sanitizeAppState(appState: Record<string, unknown>) {
	const { collaborators, ...serializableAppState } = appState
	return serializableAppState
}
