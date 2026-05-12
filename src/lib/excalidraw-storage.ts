export const WHITEBOARD_STORAGE_KEY = 'oxidaner:whiteboard:v1'
export const WHITEBOARD_SOURCE = 'https://website.oxidaner.shop/whiteboard'

export type WhiteboardFile = {
	type: 'excalidraw'
	version: 2
	source: string
	elements: unknown[]
	appState: Record<string, unknown>
	files: Record<string, unknown>
}

export function createWhiteboardFile(elements: readonly unknown[], appState: Record<string, unknown> = {}, files: Record<string, unknown> = {}): WhiteboardFile {
	return {
		type: 'excalidraw',
		version: 2,
		source: WHITEBOARD_SOURCE,
		elements: [...elements],
		appState,
		files
	}
}

export function parseWhiteboardFile(text: string): WhiteboardFile {
	let parsed: unknown

	try {
		parsed = JSON.parse(text)
	} catch {
		throw new Error('白板文件不是有效的 JSON')
	}

	if (!isWhiteboardLike(parsed)) {
		throw new Error('不是有效的 Excalidraw 文件')
	}

	return {
		type: 'excalidraw',
		version: 2,
		source: typeof parsed.source === 'string' ? parsed.source : WHITEBOARD_SOURCE,
		elements: parsed.elements,
		appState: isRecord(parsed.appState) ? parsed.appState : {},
		files: isRecord(parsed.files) ? parsed.files : {}
	}
}

export function createWhiteboardFilename(now = new Date()) {
	const year = now.getFullYear()
	const month = String(now.getMonth() + 1).padStart(2, '0')
	const day = String(now.getDate()).padStart(2, '0')
	const hour = String(now.getHours()).padStart(2, '0')
	const minute = String(now.getMinutes()).padStart(2, '0')
	return `whiteboard-${year}-${month}-${day}-${hour}-${minute}.excalidraw`
}

function isWhiteboardLike(value: unknown): value is {
	type?: unknown
	source?: unknown
	elements: unknown[]
	appState?: unknown
	files?: unknown
} {
	if (!isRecord(value)) return false
	return Array.isArray(value.elements) && (value.type === undefined || value.type === 'excalidraw')
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}
