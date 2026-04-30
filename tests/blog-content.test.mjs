import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { readBlogFromDisk } from '../src/lib/blog-content.ts'

test('readBlogFromDisk reads config, markdown, and cover from a blog folder', async () => {
	const root = await mkdtemp(path.join(tmpdir(), 'blog-content-'))

	try {
		const blogsDir = path.join(root, 'blogs')
		const postDir = path.join(blogsDir, 'hello-world')
		await mkdir(postDir, { recursive: true })
		await writeFile(path.join(postDir, 'config.json'), JSON.stringify({ title: 'Hello', date: '2026-04-30T10:00', cover: '/blogs/hello-world/cover.png' }))
		await writeFile(path.join(postDir, 'index.md'), '# Hello\n\nBody')

		const blog = await readBlogFromDisk('hello-world', blogsDir)

		assert.equal(blog?.slug, 'hello-world')
		assert.equal(blog?.config.title, 'Hello')
		assert.equal(blog?.markdown, '# Hello\n\nBody')
		assert.equal(blog?.cover, '/blogs/hello-world/cover.png')
	} finally {
		await rm(root, { recursive: true, force: true })
	}
})

test('readBlogFromDisk rejects traversal slugs', async () => {
	assert.equal(await readBlogFromDisk('../secret', path.join(tmpdir(), 'missing-blogs')), null)
})
