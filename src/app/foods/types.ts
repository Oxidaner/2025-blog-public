export type FoodWishlistType = 'dish' | 'restaurant'
export type FoodPriority = 'low' | 'medium' | 'high'
export type FoodEntryTypeFilter = 'all' | 'wishlist' | 'visited'
export type FoodSortMode = 'rating' | 'recent' | 'price' | 'stars'

export type FoodDish = {
	id: string
	name: string
	rating: number
	tags: string[]
	note: string
}

export type FoodWishlistItem = {
	id: string
	name: string
	type: FoodWishlistType
	city: string
	area: string
	tags: string[]
	priority: FoodPriority
	note: string
	dianpingUrl: string
	createdAt: string
	done: boolean
}

export type FoodRestaurant = {
	id: string
	name: string
	city: string
	area: string
	address: string
	dianpingUrl: string
	cover: string
	cuisine: string
	pricePerPerson: number | null
	rating: number
	visitedAt: string
	tags: string[]
	note: string
	recommendedDishes: FoodDish[]
	avoidDishes: FoodDish[]
}

export type FoodCollection = {
	wishlist: FoodWishlistItem[]
	restaurants: FoodRestaurant[]
}

export type FoodFilterOptions = {
	query: string
	type: FoodEntryTypeFilter
	city: string
	tag: string
}
