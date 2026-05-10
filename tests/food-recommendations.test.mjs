import assert from 'node:assert/strict'
import test from 'node:test'

import { collectFoodCities, collectFoodTags, filterFoodEntries, sortFoodEntries } from '../src/lib/food-recommendations.ts'

const foods = {
	wishlist: [
		{
			id: 'want-ramen',
			name: '豚骨拉面',
			type: 'dish',
			city: '上海',
			area: '静安寺',
			tags: ['日料', '面食'],
			priority: 'high',
			note: '想找一家汤底浓的',
			dianpingUrl: 'https://www.dianping.com/search/keyword/1/10_%E6%8B%89%E9%9D%A2',
			createdAt: '2026-05-02T12:00:00.000Z',
			done: false
		}
	],
	restaurants: [
		{
			id: 'rest-hotpot',
			name: '山城火锅',
			city: '上海',
			area: '静安寺',
			address: '南京西路 100 号',
			dianpingUrl: 'https://www.dianping.com/shop/hotpot',
			cover: '',
			cuisine: '火锅',
			pricePerPerson: 160,
			rating: 5,
			visitedAt: '2026-05-01',
			tags: ['聚餐', '偏辣'],
			note: '锅底稳定，适合朋友聚餐',
			recommendedDishes: [
				{
					id: 'dish-beef',
					name: '雪花牛肉',
					rating: 5,
					tags: ['必点'],
					note: '肉质不错'
				}
			],
			avoidDishes: [
				{
					id: 'dish-dessert',
					name: '红糖糍粑',
					rating: 2,
					tags: ['油腻'],
					note: '炸得太硬'
				}
			]
		},
		{
			id: 'rest-bistro',
			name: '小巷西餐',
			city: '杭州',
			area: '武林',
			address: '武林路 88 号',
			dianpingUrl: 'https://www.dianping.com/shop/bistro',
			cover: '',
			cuisine: '西餐',
			pricePerPerson: 220,
			rating: 4,
			visitedAt: '2026-05-08',
			tags: ['约会'],
			note: '环境好',
			recommendedDishes: [
				{
					id: 'dish-pasta',
					name: '松露意面',
					rating: 4,
					tags: ['稳定'],
					note: '香气足'
				}
			],
			avoidDishes: []
		}
	]
}

test('filterFoodEntries matches city, area, restaurant, dish, tags, and dianping links', () => {
	assert.deepEqual(
		filterFoodEntries(foods, { query: '静安寺 必点', type: 'all', city: 'all', tag: 'all' }).restaurants.map(item => item.id),
		['rest-hotpot']
	)

	assert.deepEqual(
		filterFoodEntries(foods, { query: '拉面', type: 'all', city: 'all', tag: 'all' }).wishlist.map(item => item.id),
		['want-ramen']
	)

	assert.deepEqual(
		filterFoodEntries(foods, { query: 'bistro', type: 'all', city: 'all', tag: 'all' }).restaurants.map(item => item.id),
		['rest-bistro']
	)
})

test('filterFoodEntries applies type, city, and tag filters', () => {
	const result = filterFoodEntries(foods, { query: '', type: 'visited', city: '上海', tag: '偏辣' })

	assert.deepEqual(
		result.restaurants.map(item => item.id),
		['rest-hotpot']
	)
	assert.deepEqual(result.wishlist, [])
})

test('sortFoodEntries ranks restaurants by score and date', () => {
	assert.deepEqual(
		sortFoodEntries(foods, 'rating').restaurants.map(item => item.id),
		['rest-hotpot', 'rest-bistro']
	)
	assert.deepEqual(
		sortFoodEntries(foods, 'recent').restaurants.map(item => item.id),
		['rest-bistro', 'rest-hotpot']
	)
})

test('collectFoodCities and collectFoodTags return sorted unique values', () => {
	assert.deepEqual(collectFoodCities(foods), ['上海', '杭州'])
	assert.deepEqual(collectFoodTags(foods), ['偏辣', '必点', '日料', '油腻', '稳定', '约会', '聚餐', '面食'])
})
