import { MetadataRoute } from 'next'
import blogIndex from '@/../public/blogs/index.json'
import type { BlogIndexItem } from '@/app/blog/types'
import { getSiteOrigin } from '@/lib/site-url'

export const dynamic = 'force-static'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl = getSiteOrigin()

	let posts: BlogIndexItem[] = blogIndex

	const postEntries: MetadataRoute.Sitemap = posts.map(post => ({
		url: `${baseUrl}/blog/${post.slug}`,
		lastModified: post.date ? new Date(post.date) : new Date(),
		changeFrequency: 'weekly',
		priority: 0.8
	}))

	const staticEntries: MetadataRoute.Sitemap = [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: 'daily',
			priority: 1
		}
	]

	return [...staticEntries, ...postEntries]
}
