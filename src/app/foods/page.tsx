'use client'

import { useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Check, ExternalLink, MapPin, Pencil, Plus, Save, Search, Star, Trash2, Utensils, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/hooks/use-auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { collectFoodCities, collectFoodTags, filterFoodEntries, sortFoodEntries } from '@/lib/food-recommendations'
import initialFoods from './list.json'
import { pushFoods } from './services/push-foods'
import type { FoodCollection, FoodDish, FoodEntryTypeFilter, FoodPriority, FoodRestaurant, FoodSortMode, FoodWishlistItem, FoodWishlistType } from './types'

type DishGroup = 'recommendedDishes' | 'avoidDishes'

const COMMON_TAGS = ['火锅', '烧烤', '日料', '韩餐', '川菜', '粤菜', '湘菜', '甜品', '咖啡', '面包', '快餐', '聚餐', '约会', '工作餐', '宵夜', '外卖', '排队久', '适合拍照', '性价比高', '偏辣', '清淡', '重口', '稳定', '踩雷']

const typeLabels: Record<FoodWishlistType, string> = {
	dish: '菜品',
	restaurant: '饭店'
}

const priorityLabels: Record<FoodPriority, string> = {
	high: '高',
	medium: '中',
	low: '低'
}

function cloneFoods(foods: FoodCollection): FoodCollection {
	return JSON.parse(JSON.stringify(foods)) as FoodCollection
}

function createId(prefix: string) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function todayDate() {
	return new Date().toISOString().slice(0, 10)
}

function splitTags(value: string) {
	return value
		.split(',')
		.map(tag => tag.trim())
		.filter(Boolean)
}

function joinTags(tags: string[]) {
	return tags.join(', ')
}

export default function FoodsPage() {
	const [foods, setFoods] = useState<FoodCollection>(() => cloneFoods(initialFoods as FoodCollection))
	const [originalFoods, setOriginalFoods] = useState<FoodCollection>(() => cloneFoods(initialFoods as FoodCollection))
	const [query, setQuery] = useState('')
	const [typeFilter, setTypeFilter] = useState<FoodEntryTypeFilter>('all')
	const [cityFilter, setCityFilter] = useState('all')
	const [tagFilter, setTagFilter] = useState('all')
	const [sortMode, setSortMode] = useState<FoodSortMode>('rating')
	const [isEditMode, setIsEditMode] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const keyInputRef = useRef<HTMLInputElement>(null)

	const { isAuth, setPrivateKey } = useAuthStore()
	const { siteContent } = useConfigStore()
	const hideEditButton = siteContent.hideEditButton ?? false

	const cities = useMemo(() => collectFoodCities(foods), [foods])
	const tags = useMemo(() => Array.from(new Set([...COMMON_TAGS, ...collectFoodTags(foods)])).sort(), [foods])
	const visibleFoods = useMemo(() => {
		const filtered = filterFoodEntries(foods, {
			query,
			type: typeFilter,
			city: cityFilter,
			tag: tagFilter
		})
		return sortFoodEntries(filtered, sortMode)
	}, [foods, query, typeFilter, cityFilter, tagFilter, sortMode])

	const handleChoosePrivateKey = async (file: File) => {
		try {
			const text = await file.text()
			setPrivateKey(text)
			await handleSave()
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

		handleSave()
	}

	const handleSave = async () => {
		setIsSaving(true)

		try {
			await pushFoods({ foods })
			setOriginalFoods(cloneFoods(foods))
			setIsEditMode(false)
			toast.success('保存成功！')
		} catch (error: any) {
			console.error('Failed to save foods:', error)
			toast.error(`保存失败: ${error?.message || '未知错误'}`)
		} finally {
			setIsSaving(false)
		}
	}

	const handleCancel = () => {
		setFoods(cloneFoods(originalFoods))
		setIsEditMode(false)
	}

	const addWishlistItem = () => {
		const now = new Date().toISOString()
		setFoods(prev => ({
			...prev,
			wishlist: [
				{
					id: createId('want'),
					name: '想吃的东西',
					type: 'dish',
					city: '',
					area: '',
					tags: [],
					priority: 'medium',
					note: '',
					dianpingUrl: '',
					createdAt: now,
					done: false
				},
				...prev.wishlist
			]
		}))
	}

	const addRestaurant = () => {
		setFoods(prev => ({
			...prev,
			restaurants: [
				{
					id: createId('restaurant'),
					name: '新饭店',
					city: '',
					area: '',
					address: '',
					dianpingUrl: '',
					cover: '',
					cuisine: '',
					pricePerPerson: null,
					rating: 3,
					visitedAt: todayDate(),
					tags: [],
					note: '',
					recommendedDishes: [],
					avoidDishes: []
				},
				...prev.restaurants
			]
		}))
	}

	const updateWishlistItem = (id: string, patch: Partial<FoodWishlistItem>) => {
		setFoods(prev => ({
			...prev,
			wishlist: prev.wishlist.map(item => (item.id === id ? { ...item, ...patch } : item))
		}))
	}

	const deleteWishlistItem = (id: string) => {
		setFoods(prev => ({
			...prev,
			wishlist: prev.wishlist.filter(item => item.id !== id)
		}))
	}

	const updateRestaurant = (id: string, patch: Partial<FoodRestaurant>) => {
		setFoods(prev => ({
			...prev,
			restaurants: prev.restaurants.map(item => (item.id === id ? { ...item, ...patch } : item))
		}))
	}

	const deleteRestaurant = (id: string) => {
		setFoods(prev => ({
			...prev,
			restaurants: prev.restaurants.filter(item => item.id !== id)
		}))
	}

	const addDish = (restaurantId: string, group: DishGroup) => {
		const dish: FoodDish = {
			id: createId('dish'),
			name: '新菜品',
			rating: group === 'recommendedDishes' ? 4 : 2,
			tags: [],
			note: ''
		}

		setFoods(prev => ({
			...prev,
			restaurants: prev.restaurants.map(restaurant => (restaurant.id === restaurantId ? { ...restaurant, [group]: [...restaurant[group], dish] } : restaurant))
		}))
	}

	const updateDish = (restaurantId: string, group: DishGroup, dishId: string, patch: Partial<FoodDish>) => {
		setFoods(prev => ({
			...prev,
			restaurants: prev.restaurants.map(restaurant =>
				restaurant.id === restaurantId
					? {
							...restaurant,
							[group]: restaurant[group].map(dish => (dish.id === dishId ? { ...dish, ...patch } : dish))
						}
					: restaurant
			)
		}))
	}

	const deleteDish = (restaurantId: string, group: DishGroup, dishId: string) => {
		setFoods(prev => ({
			...prev,
			restaurants: prev.restaurants.map(restaurant =>
				restaurant.id === restaurantId
					? {
							...restaurant,
							[group]: restaurant[group].filter(dish => dish.id !== dishId)
						}
					: restaurant
			)
		}))
	}

	const buttonText = isAuth ? '保存' : '导入密钥'

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

			<div className='flex flex-col items-center px-6 pt-32 pb-12 max-sm:px-4 max-sm:pt-28'>
				<div className='w-full max-w-[1240px] space-y-6'>
					<div className='flex flex-wrap items-start justify-between gap-4'>
						<div>
							<h1 className='text-primary text-3xl font-bold'>美食饭店</h1>
							<p className='text-secondary mt-2 text-sm'>记录想吃清单、去过的饭店、推荐菜和踩雷菜。</p>
						</div>

						<div className='flex gap-3 max-sm:hidden'>
							{isEditMode ? (
								<>
									<ActionButton icon={X} label='取消' onClick={handleCancel} disabled={isSaving} />
									<ActionButton icon={Plus} label='想吃' onClick={addWishlistItem} disabled={isSaving} />
									<ActionButton icon={Utensils} label='饭店' onClick={addRestaurant} disabled={isSaving} />
									<ActionButton icon={Save} label={isSaving ? '保存中...' : buttonText} onClick={handleSaveClick} disabled={isSaving} variant='brand' />
								</>
							) : (
								!hideEditButton && <ActionButton icon={Pencil} label='编辑' onClick={() => setIsEditMode(true)} />
							)}
						</div>
					</div>

					<div className='card relative grid gap-3 p-4 max-lg:grid-cols-2 max-sm:grid-cols-1 lg:grid-cols-[minmax(240px,1.5fr)_140px_140px_160px_160px]'>
						<label className='relative block'>
							<Search className='text-secondary pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
							<input
								value={query}
								onChange={e => setQuery(e.target.value)}
								placeholder='搜索饭店、菜品、城市、地区、标签或点评链接'
								className='w-full rounded-xl border bg-white/55 py-2.5 pr-3 pl-9 text-sm outline-none transition-colors focus:bg-white/80'
							/>
						</label>
						<Select value={typeFilter} onChange={value => setTypeFilter(value as FoodEntryTypeFilter)}>
							<option value='all'>全部</option>
							<option value='wishlist'>想吃</option>
							<option value='visited'>已去过</option>
						</Select>
						<Select value={cityFilter} onChange={setCityFilter}>
							<option value='all'>全部城市</option>
							{cities.map(city => (
								<option key={city} value={city}>
									{city}
								</option>
							))}
						</Select>
						<Select value={tagFilter} onChange={setTagFilter}>
							<option value='all'>全部标签</option>
							{tags.map(tag => (
								<option key={tag} value={tag}>
									{tag}
								</option>
							))}
						</Select>
						<Select value={sortMode} onChange={value => setSortMode(value as FoodSortMode)}>
							<option value='rating'>推荐分数</option>
							<option value='recent'>最近去过</option>
							<option value='price'>人均价格</option>
							<option value='stars'>星级最高</option>
						</Select>
					</div>

					<section>
						<SectionHeader title='想吃清单' count={visibleFoods.wishlist.length} />
						<div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
							{visibleFoods.wishlist.map(item => (
								<WishlistCard key={item.id} item={item} isEditMode={isEditMode} onChange={patch => updateWishlistItem(item.id, patch)} onDelete={() => deleteWishlistItem(item.id)} />
							))}
							{visibleFoods.wishlist.length === 0 && <EmptyState text='还没有匹配的想吃记录' />}
						</div>
					</section>

					<section>
						<SectionHeader title='已去过饭店' count={visibleFoods.restaurants.length} />
						<div className='grid gap-5 lg:grid-cols-2'>
							{visibleFoods.restaurants.map(restaurant => (
								<RestaurantCard
									key={restaurant.id}
									restaurant={restaurant}
									isEditMode={isEditMode}
									onChange={patch => updateRestaurant(restaurant.id, patch)}
									onDelete={() => deleteRestaurant(restaurant.id)}
									onAddDish={group => addDish(restaurant.id, group)}
									onUpdateDish={(group, dishId, patch) => updateDish(restaurant.id, group, dishId, patch)}
									onDeleteDish={(group, dishId) => deleteDish(restaurant.id, group, dishId)}
								/>
							))}
							{visibleFoods.restaurants.length === 0 && <EmptyState text='还没有匹配的饭店记录' />}
						</div>
					</section>
				</div>
			</div>
		</>
	)
}

function ActionButton({
	icon: Icon,
	label,
	onClick,
	disabled,
	variant = 'default'
}: {
	icon: React.ComponentType<{ className?: string }>
	label: string
	onClick: () => void
	disabled?: boolean
	variant?: 'default' | 'brand'
}) {
	return (
		<motion.button
			type='button'
			whileHover={{ scale: disabled ? 1 : 1.05 }}
			whileTap={{ scale: disabled ? 1 : 0.95 }}
			onClick={onClick}
			disabled={disabled}
			className={cn(
				'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
				variant === 'brand' ? 'brand-btn' : 'bg-card backdrop-blur-sm hover:bg-white/80'
			)}>
			<Icon className='size-4' />
			{label}
		</motion.button>
	)
}

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
	return (
		<select value={value} onChange={e => onChange(e.target.value)} className='w-full rounded-xl border bg-white/55 px-3 py-2.5 text-sm outline-none transition-colors focus:bg-white/80'>
			{children}
		</select>
	)
}

function SectionHeader({ title, count }: { title: string; count: number }) {
	return (
		<div className='mb-4 flex items-center gap-3'>
			<h2 className='text-primary text-xl font-semibold'>{title}</h2>
			<span className='bg-card text-secondary rounded-full border px-2.5 py-1 text-xs'>{count}</span>
		</div>
	)
}

function EmptyState({ text }: { text: string }) {
	return <div className='card relative flex min-h-32 items-center justify-center text-sm text-secondary'>{text}</div>
}

function WishlistCard({
	item,
	isEditMode,
	onChange,
	onDelete
}: {
	item: FoodWishlistItem
	isEditMode: boolean
	onChange: (patch: Partial<FoodWishlistItem>) => void
	onDelete: () => void
}) {
	if (isEditMode) {
		return (
			<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className='card relative space-y-3'>
				<div className='flex items-start gap-3'>
					<input value={item.name} onChange={e => onChange({ name: e.target.value })} className='min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none' />
					<button type='button' onClick={onDelete} className='text-secondary hover:text-red-500 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors' aria-label='删除想吃记录'>
						<Trash2 className='size-4' />
					</button>
				</div>
				<div className='grid gap-2 sm:grid-cols-3'>
					<Select value={item.type} onChange={value => onChange({ type: value as FoodWishlistType })}>
						<option value='dish'>菜品</option>
						<option value='restaurant'>饭店</option>
					</Select>
					<input value={item.city} onChange={e => onChange({ city: e.target.value })} placeholder='城市' className='rounded-xl border bg-white/45 px-3 py-2 text-sm outline-none' />
					<input value={item.area} onChange={e => onChange({ area: e.target.value })} placeholder='地区/商圈' className='rounded-xl border bg-white/45 px-3 py-2 text-sm outline-none' />
				</div>
				<div className='grid gap-2 sm:grid-cols-[120px_1fr]'>
					<Select value={item.priority} onChange={value => onChange({ priority: value as FoodPriority })}>
						<option value='high'>高优先级</option>
						<option value='medium'>中优先级</option>
						<option value='low'>低优先级</option>
					</Select>
					<input value={joinTags(item.tags)} onChange={e => onChange({ tags: splitTags(e.target.value) })} placeholder='标签，用逗号分隔' className='rounded-xl border bg-white/45 px-3 py-2 text-sm outline-none' />
				</div>
				<input value={item.dianpingUrl} onChange={e => onChange({ dianpingUrl: e.target.value })} placeholder='大众点评链接' className='w-full rounded-xl border bg-white/45 px-3 py-2 text-sm outline-none' />
				<textarea value={item.note} onChange={e => onChange({ note: e.target.value })} placeholder='备注' rows={3} className='w-full resize-none rounded-xl border bg-white/45 px-3 py-2 text-sm outline-none' />
				<label className='text-secondary flex items-center gap-2 text-sm'>
					<input type='checkbox' checked={item.done} onChange={e => onChange({ done: e.target.checked })} />
					已经去吃过
				</label>
			</motion.div>
		)
	}

	return (
		<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className='card relative flex flex-col gap-3'>
			<div className='flex items-start justify-between gap-3'>
				<div>
					<div className='flex flex-wrap items-center gap-2'>
						<h3 className={cn('text-lg font-semibold', item.done && 'text-secondary line-through')}>{item.name}</h3>
						<span className='bg-brand/10 text-brand rounded-full px-2 py-0.5 text-xs'>{typeLabels[item.type]}</span>
						<span className='rounded-full border px-2 py-0.5 text-xs text-secondary'>优先级 {priorityLabels[item.priority]}</span>
					</div>
					<div className='text-secondary mt-2 flex flex-wrap items-center gap-2 text-xs'>
						{item.city && <span>{item.city}</span>}
						{item.area && <span>{item.area}</span>}
					</div>
				</div>
				{item.done && <Check className='text-brand size-5 shrink-0' />}
			</div>
			<TagRow tags={item.tags} />
			{item.note && <p className='text-secondary text-sm leading-relaxed'>{item.note}</p>}
			{item.dianpingUrl && <DianpingLink href={item.dianpingUrl} />}
		</motion.div>
	)
}

function RestaurantCard({
	restaurant,
	isEditMode,
	onChange,
	onDelete,
	onAddDish,
	onUpdateDish,
	onDeleteDish
}: {
	restaurant: FoodRestaurant
	isEditMode: boolean
	onChange: (patch: Partial<FoodRestaurant>) => void
	onDelete: () => void
	onAddDish: (group: DishGroup) => void
	onUpdateDish: (group: DishGroup, dishId: string, patch: Partial<FoodDish>) => void
	onDeleteDish: (group: DishGroup, dishId: string) => void
}) {
	if (isEditMode) {
		return (
			<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className='card relative space-y-4'>
				<div className='flex items-start gap-3'>
					<input value={restaurant.name} onChange={e => onChange({ name: e.target.value })} className='min-w-0 flex-1 bg-transparent text-xl font-semibold outline-none' />
					<button type='button' onClick={onDelete} className='text-secondary hover:text-red-500 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors' aria-label='删除饭店'>
						<Trash2 className='size-4' />
					</button>
				</div>

				<div className='grid gap-2 sm:grid-cols-3'>
					<input value={restaurant.city} onChange={e => onChange({ city: e.target.value })} placeholder='城市' className='rounded-xl border bg-white/45 px-3 py-2 text-sm outline-none' />
					<input value={restaurant.area} onChange={e => onChange({ area: e.target.value })} placeholder='地区/商圈' className='rounded-xl border bg-white/45 px-3 py-2 text-sm outline-none' />
					<input value={restaurant.cuisine} onChange={e => onChange({ cuisine: e.target.value })} placeholder='菜系' className='rounded-xl border bg-white/45 px-3 py-2 text-sm outline-none' />
				</div>
				<input value={restaurant.address} onChange={e => onChange({ address: e.target.value })} placeholder='详细地址' className='w-full rounded-xl border bg-white/45 px-3 py-2 text-sm outline-none' />
				<div className='grid gap-2 sm:grid-cols-3'>
					<input
						type='number'
						value={restaurant.pricePerPerson ?? ''}
						onChange={e => onChange({ pricePerPerson: e.target.value ? Number(e.target.value) : null })}
						placeholder='人均'
						className='rounded-xl border bg-white/45 px-3 py-2 text-sm outline-none'
					/>
					<input type='date' value={restaurant.visitedAt} onChange={e => onChange({ visitedAt: e.target.value })} className='rounded-xl border bg-white/45 px-3 py-2 text-sm outline-none' />
					<div className='flex items-center rounded-xl border bg-white/45 px-3 py-2'>
						<RatingStars value={restaurant.rating} onChange={rating => onChange({ rating })} />
					</div>
				</div>
				<input value={restaurant.dianpingUrl} onChange={e => onChange({ dianpingUrl: e.target.value })} placeholder='大众点评链接' className='w-full rounded-xl border bg-white/45 px-3 py-2 text-sm outline-none' />
				<input value={restaurant.cover} onChange={e => onChange({ cover: e.target.value })} placeholder='主图 URL（可选）' className='w-full rounded-xl border bg-white/45 px-3 py-2 text-sm outline-none' />
				<input value={joinTags(restaurant.tags)} onChange={e => onChange({ tags: splitTags(e.target.value) })} placeholder='标签，用逗号分隔' className='w-full rounded-xl border bg-white/45 px-3 py-2 text-sm outline-none' />
				<textarea value={restaurant.note} onChange={e => onChange({ note: e.target.value })} placeholder='整体备注' rows={3} className='w-full resize-none rounded-xl border bg-white/45 px-3 py-2 text-sm outline-none' />

				<DishEditor title='推荐菜' group='recommendedDishes' dishes={restaurant.recommendedDishes} onAdd={onAddDish} onUpdate={onUpdateDish} onDelete={onDeleteDish} />
				<DishEditor title='踩雷菜' group='avoidDishes' dishes={restaurant.avoidDishes} onAdd={onAddDish} onUpdate={onUpdateDish} onDelete={onDeleteDish} />
			</motion.div>
		)
	}

	return (
		<motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className='card relative overflow-hidden'>
			<div className='grid gap-5 md:grid-cols-[180px_1fr]'>
				<div className='relative flex h-44 items-center justify-center overflow-hidden rounded-2xl border bg-white/45'>
					{restaurant.cover ? (
						<img src={restaurant.cover} alt={restaurant.name} className='h-full w-full object-cover transition-transform duration-300 hover:scale-105' />
					) : (
						<Utensils className='text-secondary size-12' />
					)}
				</div>
				<div className='min-w-0 space-y-3'>
					<div className='flex flex-wrap items-start justify-between gap-3'>
						<div>
							<h3 className='text-primary text-xl font-semibold'>{restaurant.name}</h3>
							<div className='text-secondary mt-2 flex flex-wrap items-center gap-2 text-xs'>
								{restaurant.city && <span>{restaurant.city}</span>}
								{restaurant.area && <span>{restaurant.area}</span>}
								{restaurant.cuisine && <span>{restaurant.cuisine}</span>}
								{restaurant.pricePerPerson !== null && <span>人均 ¥{restaurant.pricePerPerson}</span>}
								{restaurant.visitedAt && <span>{restaurant.visitedAt}</span>}
							</div>
						</div>
						<RatingStars value={restaurant.rating} />
					</div>
					{restaurant.address && (
						<div className='text-secondary flex items-center gap-1.5 text-sm'>
							<MapPin className='size-4 shrink-0' />
							<span>{restaurant.address}</span>
						</div>
					)}
					<TagRow tags={restaurant.tags} />
					{restaurant.note && <p className='text-secondary text-sm leading-relaxed'>{restaurant.note}</p>}
					{restaurant.dianpingUrl && <DianpingLink href={restaurant.dianpingUrl} />}
				</div>
			</div>
			<div className='mt-5 grid gap-4 md:grid-cols-2'>
				<DishList title='推荐菜' dishes={restaurant.recommendedDishes} accent='brand' />
				<DishList title='踩雷菜' dishes={restaurant.avoidDishes} accent='danger' />
			</div>
		</motion.article>
	)
}

function DishEditor({
	title,
	group,
	dishes,
	onAdd,
	onUpdate,
	onDelete
}: {
	title: string
	group: DishGroup
	dishes: FoodDish[]
	onAdd: (group: DishGroup) => void
	onUpdate: (group: DishGroup, dishId: string, patch: Partial<FoodDish>) => void
	onDelete: (group: DishGroup, dishId: string) => void
}) {
	return (
		<div className='rounded-2xl border bg-white/30 p-3'>
			<div className='mb-3 flex items-center justify-between'>
				<h4 className='text-sm font-medium'>{title}</h4>
				<button type='button' onClick={() => onAdd(group)} className='text-brand flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/60'>
					<Plus className='size-3.5' />
					新增
				</button>
			</div>
			<div className='space-y-3'>
				{dishes.map(dish => (
					<div key={dish.id} className='rounded-xl border bg-white/35 p-3'>
						<div className='flex items-center gap-2'>
							<input value={dish.name} onChange={e => onUpdate(group, dish.id, { name: e.target.value })} className='min-w-0 flex-1 bg-transparent text-sm font-medium outline-none' />
							<RatingStars value={dish.rating} onChange={rating => onUpdate(group, dish.id, { rating })} />
							<button type='button' onClick={() => onDelete(group, dish.id)} className='text-secondary hover:text-red-500 flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors' aria-label='删除菜品'>
								<Trash2 className='size-3.5' />
							</button>
						</div>
						<input value={joinTags(dish.tags)} onChange={e => onUpdate(group, dish.id, { tags: splitTags(e.target.value) })} placeholder='标签，用逗号分隔' className='mt-2 w-full rounded-lg border bg-white/45 px-2 py-1.5 text-xs outline-none' />
						<input value={dish.note} onChange={e => onUpdate(group, dish.id, { note: e.target.value })} placeholder='备注' className='mt-2 w-full rounded-lg border bg-white/45 px-2 py-1.5 text-xs outline-none' />
					</div>
				))}
				{dishes.length === 0 && <div className='text-secondary rounded-xl border border-dashed py-4 text-center text-xs'>暂无菜品</div>}
			</div>
		</div>
	)
}

function DishList({ title, dishes, accent }: { title: string; dishes: FoodDish[]; accent: 'brand' | 'danger' }) {
	return (
		<div className='rounded-2xl border bg-white/30 p-4'>
			<h4 className={cn('mb-3 text-sm font-medium', accent === 'brand' ? 'text-brand' : 'text-red-500')}>{title}</h4>
			<div className='space-y-3'>
				{dishes.map(dish => (
					<div key={dish.id} className='space-y-1'>
						<div className='flex items-center justify-between gap-2'>
							<span className='font-medium'>{dish.name}</span>
							<RatingStars value={dish.rating} size='sm' />
						</div>
						<TagRow tags={dish.tags} compact />
						{dish.note && <p className='text-secondary text-xs leading-relaxed'>{dish.note}</p>}
					</div>
				))}
				{dishes.length === 0 && <div className='text-secondary text-xs'>暂无记录</div>}
			</div>
		</div>
	)
}

function RatingStars({ value, onChange, size = 'md' }: { value: number; onChange?: (value: number) => void; size?: 'sm' | 'md' }) {
	const iconClass = size === 'sm' ? 'size-3.5' : 'size-4'
	return (
		<div className='flex items-center gap-0.5'>
			{[1, 2, 3, 4, 5].map(star => {
				const active = star <= value
				const content = <Star className={cn(iconClass, active ? 'fill-amber-400 text-amber-400' : 'text-secondary/40')} />

				if (!onChange) {
					return <span key={star}>{content}</span>
				}

				return (
					<button key={star} type='button' onClick={() => onChange(star)} className='rounded p-0.5 transition-transform hover:scale-110' aria-label={`${star} 星`}>
						{content}
					</button>
				)
			})}
		</div>
	)
}

function TagRow({ tags, compact = false }: { tags: string[]; compact?: boolean }) {
	if (tags.length === 0) return null

	return (
		<div className='flex flex-wrap gap-1.5'>
			{tags.map(tag => (
				<span key={tag} className={cn('bg-card text-secondary rounded-full border', compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs')}>
					{tag}
				</span>
			))}
		</div>
	)
}

function DianpingLink({ href }: { href: string }) {
	return (
		<a href={href} target='_blank' rel='noopener noreferrer' className='text-brand inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-75'>
			大众点评
			<ExternalLink className='size-3.5' />
		</a>
	)
}
