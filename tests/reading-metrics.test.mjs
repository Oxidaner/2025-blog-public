import assert from 'node:assert/strict'
import test from 'node:test'

import { estimateReadingStats, htmlToReadableText } from '../src/lib/reading-metrics.ts'

test('htmlToReadableText removes tags and normalizes whitespace', () => {
	assert.equal(htmlToReadableText('<h1>标题</h1><p>Hello&nbsp;世界</p><script>ignore()</script>'), '标题 Hello 世界')
})

test('estimateReadingStats counts readable units and clamps minutes to one', () => {
	const stats = estimateReadingStats('<p>Hello 世界，Dubbo Admin</p>')

	assert.equal(stats.wordCount, 5)
	assert.equal(stats.readingMinutes, 1)
})

test('estimateReadingStats rounds longer articles up by reading speed', () => {
	const content = `<p>${'测试'.repeat(260)}</p>`
	const stats = estimateReadingStats(content, 300)

	assert.equal(stats.wordCount, 520)
	assert.equal(stats.readingMinutes, 2)
})
