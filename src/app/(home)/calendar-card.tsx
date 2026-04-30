'use client'

import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from './stores/config-store'
import { CARD_SPACING } from '@/consts'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { cn } from '@/lib/utils'
import { HomeDraggableLayer } from './home-draggable-layer'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/hooks/use-auth'
import initialTodos from '@/app/todos/list.json'
import { HOLIDAYS_2026, type HolidayInfo } from '@/app/todos/holidays'
import { pushTodos } from '@/app/todos/services/push-todos'
import type { TodoItem, TodoMap } from '@/app/todos/types'

dayjs.locale('zh-cn')

export default function CalendarCard() {
	const center = useCenterStore()
	const { cardStyles, siteContent } = useConfigStore()
	const now = dayjs()
	const [visibleMonth, setVisibleMonth] = useState(now.startOf('month'))
	const [todos, setTodos] = useState<TodoMap>(initialTodos as TodoMap)
	const [selectedDate, setSelectedDate] = useState<string | null>(null)
	const [draftTodos, setDraftTodos] = useState<TodoItem[]>([])
	const [isSaving, setIsSaving] = useState(false)
	const [hoveredHoliday, setHoveredHoliday] = useState<HolidayInfo | null>(null)
	const keyInputRef = useRef<HTMLInputElement>(null)
	const { isAuth, setPrivateKey } = useAuthStore()

	const currentDateKey = now.format('YYYY-MM-DD')
	const isCurrentMonthVisible = visibleMonth.isSame(now, 'month')
	const firstDayOfMonth = visibleMonth.startOf('month')
	const firstDayWeekday = (firstDayOfMonth.day() + 6) % 7
	const daysInMonth = visibleMonth.daysInMonth()
	const currentWeekday = (now.day() + 6) % 7
	const styles = cardStyles.calendarCard
	const hiCardStyles = cardStyles.hiCard
	const clockCardStyles = cardStyles.clockCard

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x + CARD_SPACING + hiCardStyles.width / 2
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - clockCardStyles.offset + CARD_SPACING
	const selectedHoliday = selectedDate ? HOLIDAYS_2026[selectedDate] : null

	const openTodoDialog = (dateKey: string) => {
		setSelectedDate(dateKey)
		setDraftTodos((todos[dateKey] ?? []).map(item => ({ ...item })))
	}

	const addDraftTodo = () => {
		const nowIso = new Date().toISOString()
		setDraftTodos(prev => [
			...prev,
			{
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				text: '',
				done: false,
				createdAt: nowIso
			}
		])
	}

	const updateDraftTodo = (id: string, patch: Partial<TodoItem>) => {
		setDraftTodos(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)))
	}

	const removeDraftTodo = (id: string) => {
		setDraftTodos(prev => prev.filter(item => item.id !== id))
	}

	const closeTodoDialog = () => {
		if (isSaving) return
		setSelectedDate(null)
		setDraftTodos([])
	}

	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			setPrivateKey(text)
			await saveSelectedTodos()
		} catch (error) {
			console.error('Failed to read private key:', error)
			toast.error('读取密钥文件失败')
		}
	}

	const handleSaveClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
			return
		}
		saveSelectedTodos()
	}

	const saveSelectedTodos = async () => {
		if (!selectedDate) return
		setIsSaving(true)

		try {
			const nowIso = new Date().toISOString()
			const nextItems = draftTodos
				.map(item => ({
					...item,
					text: item.text.trim(),
					updatedAt: nowIso
				}))
				.filter(item => item.text.length > 0)
			const nextTodos = { ...todos }

			if (nextItems.length > 0) {
				nextTodos[selectedDate] = nextItems
			} else {
				delete nextTodos[selectedDate]
			}

			await pushTodos(nextTodos)
			setTodos(nextTodos)
			setSelectedDate(null)
			setDraftTodos([])
			toast.success('待办已保存')
		} catch (error: any) {
			console.error('Failed to save todos:', error)
			toast.error(`保存失败: ${error?.message || '未知错误'}`)
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<>
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handleChoosePrivateKey(f)
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>
			<HomeDraggableLayer cardKey='calendarCard' x={x} y={y} width={styles.width} height={styles.height}>
				<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className='flex flex-col'>
					{siteContent.enableChristmas && (
						<>
							<img
								src='/images/christmas/snow-7.webp'
								alt='Christmas decoration'
								className='pointer-events-none absolute'
								style={{ width: 150, right: -12, top: -12, opacity: 0.8 }}
							/>
						</>
					)}

					{hoveredHoliday && (
						<div
							className={cn(
								'pointer-events-none absolute top-10 left-1/2 z-10 -translate-x-1/2 rounded-full border bg-white/85 px-3 py-1 text-xs shadow-sm backdrop-blur-sm',
								hoveredHoliday.type === 'holiday' ? 'text-red-500' : 'text-amber-600'
							)}>
							{hoveredHoliday.name}
						</div>
					)}

					<div className='text-secondary flex items-center justify-between text-sm'>
						<button
							type='button'
							onClick={() => setVisibleMonth(prev => prev.subtract(1, 'month'))}
							className='hover:text-primary flex size-7 items-center justify-center rounded-lg transition-colors'
							aria-label='上个月'>
							<ChevronLeft size={16} />
						</button>
						<div className='flex flex-col items-center leading-tight'>
							<span className='text-primary font-medium'>{visibleMonth.format('YYYY年M月')}</span>
							<span className='text-[11px]'>{now.format('YYYY/M/D ddd')}</span>
						</div>
						<div className='flex items-center gap-1'>
							<button
								type='button'
								onClick={() => setVisibleMonth(now.startOf('month'))}
								disabled={isCurrentMonthVisible}
								className='hover:text-primary disabled:text-secondary/40 flex size-7 items-center justify-center rounded-lg transition-colors disabled:cursor-default'
								aria-label='回到今天'
								title='回到今天'>
								<CalendarDays size={15} />
							</button>
							<button
								type='button'
								onClick={() => setVisibleMonth(prev => prev.add(1, 'month'))}
								className='hover:text-primary flex size-7 items-center justify-center rounded-lg transition-colors'
								aria-label='下个月'>
								<ChevronRight size={16} />
							</button>
						</div>
					</div>
					<ul
						className={cn(
							'text-secondary mt-4 grid h-[244px] min-h-0 flex-1 grid-cols-7 grid-rows-[20px_repeat(6,minmax(0,1fr))] gap-2 text-sm',
							(styles.height < 240 || styles.width < 240) && 'text-xs'
						)}>
						{new Array(7).fill(0).map((_, index) => {
							const isCurrentWeekday = index === currentWeekday && isCurrentMonthVisible
							return (
								<li key={index} className={cn('flex items-center justify-center font-medium', isCurrentWeekday && 'text-brand')}>
									{dates[index]}
								</li>
							)
						})}

						{new Array(firstDayWeekday).fill(0).map((_, index) => (
							<li key={`empty-${index}`} />
						))}

						{new Array(daysInMonth).fill(0).map((_, index) => {
							const day = index + 1
							const date = firstDayOfMonth.date(day)
							const dateKey = date.format('YYYY-MM-DD')
							const isToday = dateKey === currentDateKey
							const holiday = HOLIDAYS_2026[dateKey]
							const isHoveredHoliday = !!holiday && !!hoveredHoliday && holiday.name === hoveredHoliday.name && holiday.type === hoveredHoliday.type
							const dayTodos = todos[dateKey] ?? []
							const doneCount = dayTodos.filter(item => item.done).length

							return (
								<li key={day}>
									<button
										type='button'
										onClick={() => openTodoDialog(dateKey)}
										onMouseEnter={() => setHoveredHoliday(holiday ?? null)}
										onMouseLeave={() => setHoveredHoliday(null)}
										className={cn(
											'hover:bg-card/80 grid h-full min-h-0 w-full grid-rows-[1fr_10px] place-items-center rounded-lg border border-transparent text-center transition-colors',
											isToday && 'bg-linear text-primary border-white/50 font-medium',
											isHoveredHoliday && holiday.type === 'holiday' && 'border-red-300 bg-red-500/10 text-red-500',
											isHoveredHoliday && holiday.type === 'workday' && 'border-amber-300 bg-amber-500/10 text-amber-600'
										)}>
										<span className='self-end pb-0.5 leading-none'>{day}</span>
										<span className='flex h-2.5 items-center justify-center gap-1'>
											{holiday && (
												<span className={cn('size-1.5 rounded-full', holiday.type === 'holiday' ? 'bg-red-500' : 'bg-amber-500')} title={holiday.name} />
											)}
											{dayTodos.length > 0 && (
												<span className='size-1.5 rounded-full bg-emerald-500' title={`${dayTodos.length} 个待办，${doneCount} 个完成`} />
											)}
										</span>
									</button>
								</li>
							)
						})}
					</ul>
				</Card>
			</HomeDraggableLayer>

			{selectedDate && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm' onClick={closeTodoDialog}>
					<div className='bg-card w-full max-w-[420px] rounded-2xl border p-5 shadow-xl' onClick={e => e.stopPropagation()}>
						<div className='mb-4 flex items-start justify-between gap-4'>
							<div>
								<h3 className='text-primary text-lg font-semibold'>{dayjs(selectedDate).format('YYYY年M月D日 dddd')}</h3>
								{selectedHoliday && (
									<p className={cn('mt-1 text-sm', selectedHoliday.type === 'holiday' ? 'text-red-500' : 'text-amber-600')}>{selectedHoliday.name}</p>
								)}
							</div>
							<button
								type='button'
								onClick={closeTodoDialog}
								disabled={isSaving}
								className='hover:bg-card/80 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors'
								aria-label='关闭'>
								<X size={16} />
							</button>
						</div>

						<div className='flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1'>
							{draftTodos.length === 0 ? (
								<div className='text-secondary rounded-xl border border-dashed py-8 text-center text-sm'>暂无待办</div>
							) : (
								draftTodos.map(item => (
									<div key={item.id} className='flex items-center gap-2 rounded-xl border bg-white/35 p-2'>
										<button
											type='button'
											onClick={() => updateDraftTodo(item.id, { done: !item.done })}
											className={cn(
												'flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
												item.done ? 'bg-brand text-white' : 'bg-white/50'
											)}
											aria-label={item.done ? '标记为未完成' : '标记为完成'}>
											{item.done && <Check size={16} />}
										</button>
										<input
											value={item.text}
											onChange={e => updateDraftTodo(item.id, { text: e.target.value })}
											placeholder='输入待办事项'
											className={cn(
												'text-primary min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/35',
												item.done && 'text-secondary line-through'
											)}
										/>
										<button
											type='button'
											onClick={() => removeDraftTodo(item.id)}
											className='hover:bg-card/80 text-secondary flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors'
											aria-label='删除待办'>
											<Trash2 size={15} />
										</button>
									</div>
								))
							)}
						</div>

						<div className='mt-4 flex items-center justify-between gap-3'>
							<button type='button' onClick={addDraftTodo} className='flex items-center gap-2 rounded-xl border bg-white/45 px-3 py-2 text-sm'>
								<Plus size={15} />
								新增待办
							</button>
							<button type='button' onClick={handleSaveClick} disabled={isSaving} className='brand-btn px-5'>
								{isSaving ? '保存中...' : isAuth ? '保存' : '导入密钥'}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}

const dates = ['一', '二', '三', '四', '五', '六', '日']
