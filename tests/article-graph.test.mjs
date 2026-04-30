import assert from 'node:assert/strict'
import test from 'node:test'

import { buildArticleGraph } from '../src/lib/article-graph.ts'

const articles = [
	{
		slug: 'dubbo-admin-rag',
		title: 'Dubbo Admin RAG 重构逻辑',
		category: '开源',
		tags: ['Dubbo', 'RAG'],
		date: '2026-04-29T12:09'
	},
	{
		slug: 'dubbo-mcp',
		title: 'Dubbo Admin MCP 设计解析',
		category: '开源',
		tags: ['Dubbo'],
		date: '2026-04-29T12:13'
	},
	{
		slug: 'claude-code',
		title: 'Claude Code 安装指南',
		category: '工具',
		tags: ['AI'],
		date: '2026-01-16T11:54'
	}
]

test('buildArticleGraph links articles that share category or tags', () => {
	const graph = buildArticleGraph(articles)
	const link = graph.links.find(item => item.source === 'dubbo-mcp' && item.target === 'dubbo-admin-rag')

	assert.equal(graph.nodes.length, 3)
	assert.ok(link)
	assert.deepEqual(link?.reasons, ['开源', 'Dubbo'])
	assert.equal(link?.strength, 2)
})

test('buildArticleGraph produces deterministic node positions', () => {
	const first = buildArticleGraph(articles)
	const second = buildArticleGraph(articles)

	assert.deepEqual(
		first.nodes.map(node => ({ slug: node.slug, x: node.x, y: node.y })),
		second.nodes.map(node => ({ slug: node.slug, x: node.x, y: node.y }))
	)
})
