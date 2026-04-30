export type CommandArticle = {
	slug: string
	title?: string
	summary?: string
	category?: string
	tags?: string[]
	date?: string
}

export type CommandPaletteItem = {
	id: string
	type: 'nav' | 'article' | 'action'
	title: string
	subtitle?: string
	href?: string
	keywords: string[]
}

export const NAV_COMMAND_ITEMS: CommandPaletteItem[] = [
	{
		id: 'nav:home',
		type: 'nav',
		title: '首页',
		subtitle: '回到桌面',
		href: '/',
		keywords: ['home', 'index', 'desktop', '主页']
	},
	{
		id: 'nav:blog',
		type: 'nav',
		title: '近期文章',
		subtitle: '浏览所有博客',
		href: '/blog',
		keywords: ['blog', 'posts', '文章']
	},
	{
		id: 'nav:projects',
		type: 'nav',
		title: '我的设备',
		subtitle: '看看常用装备',
		href: '/projects',
		keywords: ['projects', 'device', '设备']
	},
	{
		id: 'nav:about',
		type: 'nav',
		title: '关于网站',
		subtitle: '站点和作者信息',
		href: '/about',
		keywords: ['about', 'profile', '关于']
	},
	{
		id: 'nav:share',
		type: 'nav',
		title: '推荐分享',
		subtitle: '收藏的内容',
		href: '/share',
		keywords: ['share', 'links', '推荐']
	},
	{
		id: 'nav:bloggers',
		type: 'nav',
		title: '优秀博客',
		subtitle: '更多值得读的站点',
		href: '/bloggers',
		keywords: ['bloggers', 'friends', '博客']
	}
]

export function buildCommandItems(articles: CommandArticle[]): CommandPaletteItem[] {
	const articleItems = articles
		.slice()
		.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
		.map(item => {
			const title = (item.title || item.slug).trim()
			const category = item.category?.trim()
			const tags = item.tags || []

			return {
				id: `article:${item.slug}`,
				type: 'article' as const,
				title,
				subtitle: category ? `${category} / ${item.summary || item.slug}` : item.summary || item.slug,
				href: `/blog/${item.slug}`,
				keywords: [item.slug, title, item.summary || '', category || '', ...tags]
			}
		})

	return [
		...NAV_COMMAND_ITEMS,
		{
			id: 'action:random-article',
			type: 'action',
			title: '随便读一篇',
			subtitle: articles.length > 0 ? `${articles.length} 篇文章里抽一篇` : '暂无文章',
			keywords: ['random', 'shuffle', '随机', '随便']
		},
		...articleItems
	]
}

export function filterCommandItems(items: CommandPaletteItem[], query: string, limit = 12): CommandPaletteItem[] {
	const tokens = normalizeSearchText(query).split(' ').filter(Boolean)

	if (tokens.length === 0) return items.slice(0, limit)

	return items
		.filter(item => {
			const haystack = normalizeSearchText([item.title, item.subtitle || '', ...item.keywords].join(' '))
			return tokens.every(token => haystack.includes(token))
		})
		.slice(0, limit)
}

export function pickRandomArticle<T>(articles: T[], random: () => number = Math.random): T | null {
	if (articles.length === 0) return null
	const index = Math.min(articles.length - 1, Math.floor(random() * articles.length))
	return articles[index]
}

function normalizeSearchText(value: string) {
	return value.toLocaleLowerCase().replace(/\s+/g, ' ').trim()
}
