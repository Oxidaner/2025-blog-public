import type { FoodCollection, FoodDish, FoodFilterOptions, FoodRestaurant, FoodSortMode, FoodWishlistItem } from '@/app/foods/types'

function normalizeText(value: string | number | null | undefined) {
	return `${value ?? ''}`.trim().toLowerCase()
}

function queryTokens(query: string) {
	return normalizeText(query)
		.split(/\s+/)
		.map(token => token.trim())
		.filter(Boolean)
}

function dishText(dish: FoodDish) {
	return [dish.name, dish.rating, dish.note, ...dish.tags].map(normalizeText).join(' ')
}

function wishlistText(item: FoodWishlistItem) {
	return [item.name, item.type, item.city, item.area, item.priority, item.note, item.dianpingUrl, ...item.tags].map(normalizeText).join(' ')
}

function restaurantText(item: FoodRestaurant) {
	return [
		item.name,
		item.city,
		item.area,
		item.address,
		item.dianpingUrl,
		item.cuisine,
		item.pricePerPerson,
		item.rating,
		item.visitedAt,
		item.note,
		...item.tags,
		...item.recommendedDishes.map(dishText),
		...item.avoidDishes.map(dishText)
	]
		.map(normalizeText)
		.join(' ')
}

function itemMatchesTokens(text: string, tokens: string[]) {
	return tokens.every(token => text.includes(token))
}

function wishlistMatchesFilters(item: FoodWishlistItem, filters: FoodFilterOptions, tokens: string[]) {
	if (filters.type === 'visited') return false
	if (filters.city !== 'all' && item.city !== filters.city) return false
	if (filters.tag !== 'all' && !item.tags.includes(filters.tag)) return false
	return itemMatchesTokens(wishlistText(item), tokens)
}

function restaurantTags(item: FoodRestaurant) {
	return [...item.tags, ...item.recommendedDishes.flatMap(dish => dish.tags), ...item.avoidDishes.flatMap(dish => dish.tags)]
}

function restaurantMatchesFilters(item: FoodRestaurant, filters: FoodFilterOptions, tokens: string[]) {
	if (filters.type === 'wishlist') return false
	if (filters.city !== 'all' && item.city !== filters.city) return false
	if (filters.tag !== 'all' && !restaurantTags(item).includes(filters.tag)) return false
	return itemMatchesTokens(restaurantText(item), tokens)
}

function maxDishRating(item: FoodRestaurant) {
	const dishRatings = [...item.recommendedDishes, ...item.avoidDishes].map(dish => dish.rating)
	return Math.max(item.rating, ...dishRatings)
}

function compareDateDesc(left: string, right: string) {
	return new Date(right).getTime() - new Date(left).getTime()
}

function sortWishlist(wishlist: FoodWishlistItem[], mode: FoodSortMode) {
	const sorted = [...wishlist]

	if (mode === 'recent') {
		return sorted.sort((a, b) => compareDateDesc(a.createdAt, b.createdAt))
	}

	const priorityValue: Record<FoodWishlistItem['priority'], number> = {
		high: 3,
		medium: 2,
		low: 1
	}

	return sorted.sort((a, b) => priorityValue[b.priority] - priorityValue[a.priority] || compareDateDesc(a.createdAt, b.createdAt))
}

function sortRestaurants(restaurants: FoodRestaurant[], mode: FoodSortMode) {
	const sorted = [...restaurants]

	if (mode === 'recent') {
		return sorted.sort((a, b) => compareDateDesc(a.visitedAt, b.visitedAt))
	}

	if (mode === 'price') {
		return sorted.sort((a, b) => (a.pricePerPerson ?? Number.POSITIVE_INFINITY) - (b.pricePerPerson ?? Number.POSITIVE_INFINITY))
	}

	if (mode === 'stars') {
		return sorted.sort((a, b) => maxDishRating(b) - maxDishRating(a) || b.rating - a.rating)
	}

	return sorted.sort((a, b) => b.rating - a.rating || compareDateDesc(a.visitedAt, b.visitedAt))
}

export function filterFoodEntries(foods: FoodCollection, filters: FoodFilterOptions): FoodCollection {
	const tokens = queryTokens(filters.query)

	return {
		wishlist: foods.wishlist.filter(item => wishlistMatchesFilters(item, filters, tokens)),
		restaurants: foods.restaurants.filter(item => restaurantMatchesFilters(item, filters, tokens))
	}
}

export function sortFoodEntries(foods: FoodCollection, mode: FoodSortMode): FoodCollection {
	return {
		wishlist: sortWishlist(foods.wishlist, mode),
		restaurants: sortRestaurants(foods.restaurants, mode)
	}
}

export function collectFoodCities(foods: FoodCollection) {
	return Array.from(new Set([...foods.wishlist.map(item => item.city), ...foods.restaurants.map(item => item.city)].filter(Boolean))).sort()
}

export function collectFoodTags(foods: FoodCollection) {
	return Array.from(new Set([...foods.wishlist.flatMap(item => item.tags), ...foods.restaurants.flatMap(restaurantTags)].filter(Boolean))).sort()
}
