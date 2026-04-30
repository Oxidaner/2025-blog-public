'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { Network } from 'lucide-react'
import type { BlogIndexItem } from '@/hooks/use-blog-index'
import { buildArticleGraph } from '@/lib/article-graph'

type ArticleGraphViewProps = {
	items: BlogIndexItem[]
}

export function ArticleGraphView({ items }: ArticleGraphViewProps) {
	const graph = useMemo(() => buildArticleGraph(items, { width: 760, height: 380, maxItems: 18 }), [items])
	const nodeMap = useMemo(() => new Map(graph.nodes.map(node => [node.id, node])), [graph.nodes])

	return (
		<motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} className='card relative w-full max-w-[840px] overflow-hidden'>
			<div className='mb-3 flex items-center justify-between gap-3'>
				<div className='flex items-center gap-3'>
					<span className='text-brand flex size-8 items-center justify-center rounded-lg bg-white/50'>
						<Network size={17} />
					</span>
					<div>
						<div className='font-medium'>文章图谱</div>
						<div className='text-secondary text-xs'>
							{graph.nodes.length} 篇文章 / {graph.links.length} 条关联
						</div>
					</div>
				</div>
			</div>

			<div className='overflow-x-auto'>
				<svg viewBox='0 0 760 380' className='min-h-[320px] w-full min-w-[680px]' role='img' aria-label='文章关联图谱'>
					<defs>
						<linearGradient id='article-link-gradient' x1='0%' x2='100%' y1='0%' y2='0%'>
							<stop offset='0%' stopColor='var(--color-brand)' stopOpacity='0.22' />
							<stop offset='100%' stopColor='var(--color-secondary)' stopOpacity='0.18' />
						</linearGradient>
					</defs>
					<g>
						{graph.links.map(link => {
							const source = nodeMap.get(link.source)
							const target = nodeMap.get(link.target)
							if (!source || !target) return null

							return (
								<line
									key={`${link.source}-${link.target}`}
									x1={source.x}
									y1={source.y}
									x2={target.x}
									y2={target.y}
									stroke='url(#article-link-gradient)'
									strokeWidth={Math.min(4, 1 + link.strength)}
									strokeLinecap='round'
								/>
							)
						})}
					</g>
					<g>
						{graph.nodes.map((node, index) => (
							<a href={`/blog/${node.slug}`} key={node.slug}>
								<g className='group cursor-pointer'>
									<circle cx={node.x} cy={node.y} r={node.radius + 7} fill='transparent' />
									<circle
										cx={node.x}
										cy={node.y}
										r={node.radius}
										className='fill-white/85 stroke-[var(--color-border)] transition-colors group-hover:fill-[var(--color-brand)]'
									/>
									<text
										x={node.x}
										y={node.y + 4}
										textAnchor='middle'
										className='pointer-events-none fill-[var(--color-brand)] text-[11px] font-semibold group-hover:fill-white'>
										{index + 1}
									</text>
									<text
										x={node.x}
										y={node.y + node.radius + 18}
										textAnchor='middle'
										className='pointer-events-none fill-[var(--color-primary)] text-[11px] font-medium'>
										{truncateLabel(node.title)}
									</text>
									{node.category && (
										<text
											x={node.x}
											y={node.y + node.radius + 33}
											textAnchor='middle'
											className='pointer-events-none fill-[var(--color-secondary)] text-[10px]'>
											{node.category}
										</text>
									)}
								</g>
							</a>
						))}
					</g>
				</svg>
			</div>
		</motion.div>
	)
}

function truncateLabel(value: string) {
	const normalized = value.trim()
	return normalized.length > 13 ? `${normalized.slice(0, 12)}...` : normalized
}
