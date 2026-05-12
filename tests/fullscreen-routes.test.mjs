import assert from 'node:assert/strict'
import test from 'node:test'

import { isFullscreenRoute } from '../src/lib/fullscreen-routes.ts'

test('whiteboard route uses immersive fullscreen layout chrome', () => {
	assert.equal(isFullscreenRoute('/whiteboard'), true)
	assert.equal(isFullscreenRoute('/whiteboard?from=nav'), true)
	assert.equal(isFullscreenRoute('/whiteboard/'), true)
	assert.equal(isFullscreenRoute('/foods'), false)
})
