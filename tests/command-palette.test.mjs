import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCommandItems, filterCommandItems, pickRandomArticle } from '../src/lib/command-palette.ts'

const articles = [
	{
		slug: 'dubbo-admin-rag',
		title: 'Dubbo Admin RAG 重构逻辑',
		summary: '从查资料到检索流水线',
		category: '开源',
		tags: ['Dubbo', 'RAG'],
		date: '2026-04-29T12:09'
	},
	{
		slug: 'claudecode-install',
		title: 'Claude Code 安装指南',
		summary: '安装和配置记录',
		category: '',
		tags: ['AI'],
		date: '2026-01-16T11:54'
	}
]

test('buildCommandItems includes navigation, random, and article entries', () => {
	const items = buildCommandItems(articles)

	assert.ok(items.some(item => item.id === 'nav:home' && item.href === '/'))
	assert.ok(items.some(item => item.id === 'action:random-article'))
	assert.ok(items.some(item => item.id === 'article:dubbo-admin-rag' && item.href === '/blog/dubbo-admin-rag'))
})

test('filterCommandItems matches title, summary, category, and tags', () => {
	const items = buildCommandItems(articles)

	assert.deepEqual(
		filterCommandItems(items, '检索').map(item => item.id),
		['article:dubbo-admin-rag']
	)
	assert.deepEqual(
		filterCommandItems(items, '开源 dubbo').map(item => item.id),
		['article:dubbo-admin-rag']
	)
	assert.deepEqual(
		filterCommandItems(items, 'AI').map(item => item.id),
		['article:claudecode-install']
	)
})

test('pickRandomArticle uses injected random source deterministically', () => {
	assert.equal(pickRandomArticle(articles, () => 0.75)?.slug, 'claudecode-install')
	assert.equal(
		pickRandomArticle([], () => 0),
		null
	)
})
