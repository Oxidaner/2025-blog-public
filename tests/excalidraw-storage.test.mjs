import assert from 'node:assert/strict'
import test from 'node:test'

import { createWhiteboardFile, createWhiteboardFilename, parseWhiteboardFile } from '../src/lib/excalidraw-storage.ts'

const elements = [
	{
		id: 'rect-1',
		type: 'rectangle',
		x: 10,
		y: 20
	}
]

const appState = {
	viewBackgroundColor: '#ffffff',
	zoom: {
		value: 1
	}
}

test('createWhiteboardFile serializes an excalidraw-compatible JSON payload', () => {
	const file = createWhiteboardFile(elements, appState, { image: { id: 'image' } })

	assert.equal(file.type, 'excalidraw')
	assert.equal(file.version, 2)
	assert.equal(file.source, 'https://website.oxidaner.shop/whiteboard')
	assert.deepEqual(file.elements, elements)
	assert.deepEqual(file.appState, appState)
	assert.deepEqual(file.files, { image: { id: 'image' } })
})

test('parseWhiteboardFile accepts valid excalidraw JSON', () => {
	const parsed = parseWhiteboardFile(JSON.stringify(createWhiteboardFile(elements, appState, {})))

	assert.deepEqual(parsed.elements, elements)
	assert.deepEqual(parsed.appState, appState)
	assert.deepEqual(parsed.files, {})
})

test('parseWhiteboardFile rejects invalid whiteboard JSON', () => {
	assert.throws(() => parseWhiteboardFile('{'), /白板文件不是有效的 JSON/)
	assert.throws(() => parseWhiteboardFile(JSON.stringify({ type: 'not-excalidraw' })), /不是有效的 Excalidraw 文件/)
})

test('createWhiteboardFilename uses local date and pads values', () => {
	const filename = createWhiteboardFilename(new Date('2026-05-02T03:04:05.000Z'))

	assert.match(filename, /^whiteboard-2026-05-02-\d{2}-\d{2}\.excalidraw$/)
})
