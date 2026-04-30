export type ReadingStats = {
	wordCount: number
	readingMinutes: number
}

const DEFAULT_UNITS_PER_MINUTE = 360

export function htmlToReadableText(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/\s+/g, ' ')
		.trim()
}

export function estimateReadingStats(content: string, unitsPerMinute = DEFAULT_UNITS_PER_MINUTE): ReadingStats {
	const text = content.includes('<') ? htmlToReadableText(content) : content.replace(/\s+/g, ' ').trim()
	const wordCount = countReadableUnits(text)
	const safeSpeed = Math.max(1, unitsPerMinute)
	const readingMinutes = Math.max(1, Math.ceil(wordCount / safeSpeed))

	return {
		wordCount,
		readingMinutes
	}
}

function countReadableUnits(text: string): number {
	const cjkCount = (text.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).length
	const withoutCjk = text.replace(/[\u3400-\u9fff\uf900-\ufaff]/g, ' ')
	const wordCount = (withoutCjk.match(/[a-zA-Z0-9]+(?:[-_'][a-zA-Z0-9]+)*/g) || []).length

	return cjkCount + wordCount
}
