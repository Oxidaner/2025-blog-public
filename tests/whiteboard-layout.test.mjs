import assert from 'node:assert/strict'
import test from 'node:test'

import { WHITEBOARD_CANVAS_CLASS_NAME, WHITEBOARD_CANVAS_REGION_CLASS_NAME, WHITEBOARD_HEADER_CLASS_NAME, WHITEBOARD_PAGE_CLASS_NAME } from '../src/lib/whiteboard-layout.ts'

test('whiteboard page fills the viewport without an intermediate header stage', () => {
	assert.equal(WHITEBOARD_HEADER_CLASS_NAME, '')
	assert.match(WHITEBOARD_PAGE_CLASS_NAME, /\bh-dvh\b/)
	assert.match(WHITEBOARD_PAGE_CLASS_NAME, /\bp-0\b/)
	assert.doesNotMatch(WHITEBOARD_PAGE_CLASS_NAME, /pt-24|pt-22/)
})

test('whiteboard canvas fills the route without creating a hidden scroll container', () => {
	assert.match(WHITEBOARD_CANVAS_REGION_CLASS_NAME, /\bflex-1\b/)
	assert.match(WHITEBOARD_CANVAS_REGION_CLASS_NAME, /\bp-0\b/)
	assert.doesNotMatch(WHITEBOARD_CANVAS_REGION_CLASS_NAME, /max-w-\[/)
	assert.match(WHITEBOARD_CANVAS_CLASS_NAME, /\bh-full\b/)
	assert.match(WHITEBOARD_CANVAS_CLASS_NAME, /\bmin-h-0\b/)
	assert.doesNotMatch(WHITEBOARD_CANVAS_CLASS_NAME, /rounded-|border|shadow/)
	assert.doesNotMatch(WHITEBOARD_CANVAS_CLASS_NAME, /min-h-\[\d+px\]/)
})
