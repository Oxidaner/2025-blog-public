import fs from 'node:fs/promises'
import path from 'node:path'

import type { BlogConfig } from '../app/blog/types'

export type LoadedBlogContent = {
	slug: string
	config: BlogConfig
	markdown: string
	cover?: string
}

export const BLOGS_DIR = path.join(process.cwd(), 'public', 'blogs')

export function isSafeBlogSlug(slug: string): boolean {
	return Boolean(slug) && !slug.includes('/') && !slug.includes('\\') && !slug.includes('\0') && slug !== '.' && slug !== '..'
}

export async function readBlogFromDisk(slug: string, blogsDir = BLOGS_DIR): Promise<LoadedBlogContent | null> {
	if (!isSafeBlogSlug(slug)) return null

	const blogDir = path.join(blogsDir, slug)
	const markdownPath = path.join(blogDir, 'index.md')
	const configPath = path.join(blogDir, 'config.json')

	let markdown: string
	try {
		markdown = await fs.readFile(markdownPath, 'utf8')
	} catch {
		return null
	}

	let config: BlogConfig = {}
	try {
		config = JSON.parse(await fs.readFile(configPath, 'utf8')) as BlogConfig
	} catch {
		config = {}
	}

	return {
		slug,
		config,
		markdown,
		cover: config.cover
	}
}
