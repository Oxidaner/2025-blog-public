import siteContent from '@/config/site-content.json'
import { BlogArticleEnhancements } from '@/components/blog-article-enhancements'
import { BlogSidebar } from '@/components/blog-sidebar'
import type { TocItem } from '@/lib/markdown-renderer'
import { estimateReadingStats } from '@/lib/reading-metrics'

type BlogServerPreviewProps = {
	html: string
	toc: TocItem[]
	title: string
	tags: string[]
	date: string
	summary?: string
	cover?: string
	slug?: string
}

export function BlogServerPreview({ html, toc, title, tags, date, summary, cover, slug }: BlogServerPreviewProps) {
	const summaryInContent = siteContent.summaryInContent ?? false
	const readingStats = estimateReadingStats(html)

	return (
		<div className='mx-auto flex max-w-[1140px] justify-center gap-6 px-6 pt-28 pb-12 max-sm:px-0'>
			<article className='card bg-article static flex-1 overflow-auto rounded-xl p-8'>
				<h1 className='text-center text-2xl font-semibold'>{title}</h1>

				{tags.length > 0 && (
					<div className='text-secondary mt-4 flex flex-wrap items-center justify-center gap-3 px-8 text-center text-sm'>
						{tags.map(t => (
							<span key={t}>#{t}</span>
						))}
					</div>
				)}

				{date && <div className='text-secondary mt-3 text-center text-sm'>{date}</div>}

				{summary && summaryInContent && <div className='text-secondary mt-6 cursor-text text-center text-sm'>“{summary}”</div>}

				<div className='prose mt-6 max-w-none cursor-text' data-blog-article-content dangerouslySetInnerHTML={{ __html: html }} />
				<BlogArticleEnhancements />
			</article>

			<BlogSidebar cover={cover} summary={summary} toc={toc} slug={slug} wordCount={readingStats.wordCount} readingMinutes={readingStats.readingMinutes} />
		</div>
	)
}
