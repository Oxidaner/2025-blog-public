import assert from 'node:assert/strict'
import test from 'node:test'

import { getSiteOrigin, toAbsoluteSiteUrl } from '../src/lib/site-url.ts'

test('getSiteOrigin prefers SITE_URL and normalizes trailing slash', () => {
	assert.equal(getSiteOrigin({ SITE_URL: 'https://blog.example.com/' }), 'https://blog.example.com')
})

test('getSiteOrigin falls back to NEXT_PUBLIC_SITE_URL and VERCEL_URL', () => {
	assert.equal(getSiteOrigin({ NEXT_PUBLIC_SITE_URL: 'https://public.example.com/path/' }), 'https://public.example.com')
	assert.equal(getSiteOrigin({ VERCEL_URL: 'preview.example.vercel.app' }), 'https://preview.example.vercel.app')
})

test('toAbsoluteSiteUrl leaves absolute and data URLs unchanged', () => {
	assert.equal(toAbsoluteSiteUrl('/blog/post', { SITE_URL: 'https://blog.example.com' }), 'https://blog.example.com/blog/post')
	assert.equal(toAbsoluteSiteUrl('https://cdn.example.com/a.png', { SITE_URL: 'https://blog.example.com' }), 'https://cdn.example.com/a.png')
	assert.equal(toAbsoluteSiteUrl('data:image/png;base64,abc', { SITE_URL: 'https://blog.example.com' }), 'data:image/png;base64,abc')
})
