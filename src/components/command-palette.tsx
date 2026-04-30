'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, FileText, Home, PanelsTopLeft, Search, Shuffle, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useBlogIndex } from '@/hooks/use-blog-index'
import { buildCommandItems, filterCommandItems, pickRandomArticle, type CommandPaletteItem } from '@/lib/command-palette'
import { cn } from '@/lib/utils'

const iconMap: Record<CommandPaletteItem['type'], React.ComponentType<{ size?: number; className?: string }>> = {
	nav: Home,
	article: FileText,
	action: Shuffle
}

export function CommandPalette() {
	const router = useRouter()
	const { items } = useBlogIndex()
	const inputRef = useRef<HTMLInputElement>(null)
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [selectedIndex, setSelectedIndex] = useState(0)
	const commandItems = useMemo(() => buildCommandItems(items), [items])
	const visibleItems = useMemo(() => filterCommandItems(commandItems, query), [commandItems, query])

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault()
				setOpen(prev => !prev)
			}

			if (event.key === 'Escape') {
				setOpen(false)
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [])

	useEffect(() => {
		if (!open) return
		const timer = window.setTimeout(() => inputRef.current?.focus(), 20)
		return () => window.clearTimeout(timer)
	}, [open])

	useEffect(() => {
		setSelectedIndex(0)
	}, [query])

	const close = () => {
		setOpen(false)
		setQuery('')
	}

	const runCommand = (item?: CommandPaletteItem) => {
		if (!item) return

		if (item.type === 'action') {
			const article = pickRandomArticle(items)
			if (article) {
				router.push(`/blog/${article.slug}`)
				close()
			}
			return
		}

		if (item.href) {
			router.push(item.href)
			close()
		}
	}

	if (!open) return null

	return (
		<div className='fixed inset-0 z-[100] flex items-start justify-center bg-black/20 px-4 pt-[14vh] backdrop-blur-sm' onMouseDown={close}>
			<motion.div
				initial={{ opacity: 0, scale: 0.96, y: -8 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				className='bg-card w-full max-w-[560px] overflow-hidden rounded-2xl border shadow-2xl'
				onMouseDown={event => event.stopPropagation()}
				role='dialog'
				aria-modal='true'>
				<div className='flex items-center gap-3 border-b px-4 py-3'>
					<Search size={18} className='text-secondary shrink-0' />
					<input
						ref={inputRef}
						value={query}
						onChange={event => setQuery(event.target.value)}
						onKeyDown={event => {
							if (event.key === 'ArrowDown') {
								event.preventDefault()
								setSelectedIndex(index => Math.min(index + 1, Math.max(visibleItems.length - 1, 0)))
							}
							if (event.key === 'ArrowUp') {
								event.preventDefault()
								setSelectedIndex(index => Math.max(index - 1, 0))
							}
							if (event.key === 'Enter') {
								event.preventDefault()
								runCommand(visibleItems[selectedIndex])
							}
						}}
						placeholder='搜索文章或页面'
						className='text-primary min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/35'
					/>
					<button
						type='button'
						onClick={close}
						className='text-secondary hover:text-primary flex size-8 shrink-0 items-center justify-center rounded-lg'
						aria-label='关闭'>
						<X size={16} />
					</button>
				</div>

				<div className='max-h-[360px] overflow-y-auto p-2'>
					{visibleItems.length === 0 ? (
						<div className='text-secondary px-3 py-8 text-center text-sm'>没有匹配结果</div>
					) : (
						visibleItems.map((item, index) => {
							const Icon = item.id === 'nav:blog' ? PanelsTopLeft : iconMap[item.type]
							const selected = index === selectedIndex

							return (
								<button
									key={item.id}
									type='button'
									onMouseEnter={() => setSelectedIndex(index)}
									onClick={() => runCommand(item)}
									className={cn(
										'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
										selected ? 'bg-brand/10 text-primary' : 'text-secondary hover:text-primary hover:bg-white/55'
									)}>
									<span
										className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg border bg-white/50', selected && 'border-brand/30 text-brand')}>
										<Icon size={17} />
									</span>
									<span className='min-w-0 flex-1'>
										<span className='block truncate text-sm font-medium'>{item.title}</span>
										{item.subtitle && <span className='text-secondary mt-0.5 block truncate text-xs'>{item.subtitle}</span>}
									</span>
									<ArrowRight size={15} className={cn('shrink-0 opacity-0 transition-opacity', selected && 'opacity-100')} />
								</button>
							)
						})
					)}
				</div>
			</motion.div>
		</div>
	)
}
