export type ArticleGraphItem = {
	slug: string
	title?: string
	category?: string
	tags?: string[]
	date?: string
}

export type ArticleGraphNode = {
	id: string
	slug: string
	title: string
	category?: string
	date?: string
	x: number
	y: number
	radius: number
}

export type ArticleGraphLink = {
	source: string
	target: string
	reasons: string[]
	strength: number
}

export type ArticleGraph = {
	nodes: ArticleGraphNode[]
	links: ArticleGraphLink[]
}

type ArticleGraphOptions = {
	width?: number
	height?: number
	maxItems?: number
}

export function buildArticleGraph(items: ArticleGraphItem[], options: ArticleGraphOptions = {}): ArticleGraph {
	const width = options.width ?? 760
	const height = options.height ?? 360
	const maxItems = options.maxItems ?? 18
	const sorted = items
		.slice()
		.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
		.slice(0, maxItems)

	const centerX = width / 2
	const centerY = height / 2
	const radiusX = Math.max(120, width / 2 - 92)
	const radiusY = Math.max(90, height / 2 - 68)
	const nodeRadius = sorted.length <= 8 ? 18 : 14

	const nodes = sorted.map((item, index) => {
		const angle = sorted.length <= 1 ? -Math.PI / 2 : -Math.PI / 2 + (Math.PI * 2 * index) / sorted.length

		return {
			id: item.slug,
			slug: item.slug,
			title: (item.title || item.slug).trim(),
			category: item.category?.trim() || undefined,
			date: item.date,
			x: Math.round(centerX + Math.cos(angle) * radiusX),
			y: Math.round(centerY + Math.sin(angle) * radiusY),
			radius: nodeRadius
		}
	})

	const links: ArticleGraphLink[] = []

	for (let i = 0; i < sorted.length; i += 1) {
		for (let j = i + 1; j < sorted.length; j += 1) {
			const reasons = getSharedReasons(sorted[i], sorted[j])

			if (reasons.length > 0) {
				links.push({
					source: sorted[i].slug,
					target: sorted[j].slug,
					reasons,
					strength: reasons.length
				})
			}
		}
	}

	return { nodes, links }
}

function getSharedReasons(a: ArticleGraphItem, b: ArticleGraphItem): string[] {
	const reasons: string[] = []
	const categoryA = a.category?.trim()
	const categoryB = b.category?.trim()

	if (categoryA && categoryA === categoryB) {
		reasons.push(categoryA)
	}

	const bTags = new Set((b.tags || []).map(tag => tag.trim()).filter(Boolean))
	for (const tag of a.tags || []) {
		const value = tag.trim()
		if (value && bTags.has(value) && !reasons.includes(value)) {
			reasons.push(value)
		}
	}

	return reasons
}
