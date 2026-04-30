'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { BookOpen, Clock, Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'

type TocItem = {
	id: string
	text: string
	level: number
}

type ReadingDashboardProps = {
	toc: TocItem[]
	wordCount: number
	readingMinutes: number
	delay?: number
}

export function ReadingDashboard({ toc, wordCount, readingMinutes, delay = 0 }: ReadingDashboardProps) {
	const [progress, setProgress] = useState(0)
	const [activeId, setActiveId] = useState<string | null>(toc[0]?.id ?? null)
	const activeHeading = useMemo(() => toc.find(item => item.id === activeId) || toc[0], [activeId, toc])

	useEffect(() => {
		const update = () => {
			const doc = document.documentElement
			const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight)
			const nextProgress = Math.round(Math.min(1, Math.max(0, window.scrollY / maxScroll)) * 100)

			let currentId = toc[0]?.id ?? null
			for (const item of toc) {
				const element = document.getElementById(item.id)
				if (!element) continue
				if (element.getBoundingClientRect().top <= 140) currentId = item.id
				else break
			}

			setProgress(nextProgress)
			setActiveId(currentId)
		}

		update()
		window.addEventListener('scroll', update, { passive: true })
		window.addEventListener('resize', update)
		return () => {
			window.removeEventListener('scroll', update)
			window.removeEventListener('resize', update)
		}
	}, [toc])

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay }}
			className='bg-card w-full rounded-xl border p-3 text-sm'>
			<div className='mb-3 flex items-center justify-between gap-3'>
				<h2 className='text-secondary font-medium'>阅读</h2>
				<span className='text-brand text-xs font-semibold'>{progress}%</span>
			</div>
			<div className='bg-border/50 h-1.5 overflow-hidden rounded-full'>
				<div className='bg-brand h-full rounded-full transition-[width]' style={{ width: `${progress}%` }} />
			</div>
			<div className='mt-3 grid grid-cols-2 gap-2'>
				<ReadingStat icon={Clock} label={`${readingMinutes} 分钟`} />
				<ReadingStat icon={BookOpen} label={`${wordCount} 字`} />
			</div>
			<div className='mt-3 flex items-start gap-2 rounded-lg bg-white/35 px-2.5 py-2'>
				<Gauge size={15} className='text-brand mt-0.5 shrink-0' />
				<div className='min-w-0'>
					<div className='text-secondary text-xs'>正在读</div>
					<div className={cn('text-primary mt-0.5 line-clamp-2 text-xs leading-relaxed', !activeHeading && 'text-secondary')}>
						{activeHeading?.text || '正文'}
					</div>
				</div>
			</div>
		</motion.div>
	)
}

function ReadingStat({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string }) {
	return (
		<div className='flex items-center gap-1.5 rounded-lg bg-white/35 px-2 py-1.5 text-xs'>
			<Icon size={14} className='text-brand shrink-0' />
			<span className='text-secondary truncate'>{label}</span>
		</div>
	)
}
