import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import dayjs from 'dayjs'
import blogIndex from '@/../public/blogs/index.json'
import type { BlogConfig, BlogIndexItem } from '@/app/blog/types'
import { BlogServerPreview } from '@/components/blog-server-preview'
import LiquidGrass from '@/components/liquid-grass'
import { readBlogFromDisk, type LoadedBlogContent } from '@/lib/blog-content'
import { renderMarkdown } from '@/lib/markdown-renderer'
import { toAbsoluteSiteUrl } from '@/lib/site-url'

type BlogPageProps = {
	params: Promise<{ id: string }>
}

type ResolvedBlog = LoadedBlogContent & {
	config: BlogConfig
}

const posts = blogIndex as BlogIndexItem[]

function getIndexItem(slug: string): BlogIndexItem | undefined {
	return posts.find(item => item.slug === slug)
}

async function getBlog(slug: string): Promise<ResolvedBlog | null> {
	const blog = await readBlogFromDisk(slug)
	if (!blog) return null

	const indexItem = getIndexItem(slug)
	const config = {
		...(indexItem || {}),
		...blog.config
	}

	return {
		...blog,
		config,
		cover: config.cover
	}
}

function getTitle(blog: ResolvedBlog, slug: string): string {
	return blog.config.title || slug
}

function getSummary(blog: ResolvedBlog): string | undefined {
	return blog.config.summary
}

function getDisplayDate(date?: string): string {
	if (!date) return ''
	const parsed = dayjs(date)
	return parsed.isValid() ? parsed.format('YYYY年 M月 D日') : ''
}

function getIsoDate(date?: string): string | undefined {
	if (!date) return undefined
	const parsed = new Date(date)
	return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

export function generateStaticParams() {
	return posts.filter(post => post.slug).map(post => ({ id: post.slug }))
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
	const { id: slug } = await params
	const blog = await getBlog(slug)
	if (!blog) {
		return {
			title: '文章不存在'
		}
	}

	const title = getTitle(blog, slug)
	const description = getSummary(blog)
	const cover = blog.cover ? toAbsoluteSiteUrl(blog.cover) : undefined
	const images = cover && !cover.startsWith('data:') ? [cover] : undefined
	const publishedTime = getIsoDate(blog.config.date)
	const tags = blog.config.tags || []

	return {
		title,
		description,
		alternates: {
			canonical: `/blog/${slug}`
		},
		openGraph: {
			type: 'article',
			title,
			description,
			url: `/blog/${slug}`,
			images,
			publishedTime,
			tags
		},
		twitter: {
			card: images ? 'summary_large_image' : 'summary',
			title,
			description,
			images
		}
	}
}

export default async function Page({ params }: BlogPageProps) {
	const { id: slug } = await params
	const blog = await getBlog(slug)
	if (!blog) notFound()

	const { html, toc } = await renderMarkdown(blog.markdown)
	const title = getTitle(blog, slug)
	const tags = blog.config.tags || []
	const date = getDisplayDate(blog.config.date)
	const cover = blog.cover ? toAbsoluteSiteUrl(blog.cover) : undefined

	return (
		<>
			<BlogServerPreview html={html} toc={toc} title={title} tags={tags} date={date} summary={blog.config.summary} cover={cover} slug={slug} />

			<Link
				href={`/write/${slug}`}
				className='absolute top-4 right-6 rounded-xl border bg-white/60 px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80 max-sm:hidden'>
				编辑
			</Link>

			{slug === 'liquid-grass' && <LiquidGrass />}
		</>
	)
}
