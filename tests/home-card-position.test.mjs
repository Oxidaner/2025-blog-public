import assert from 'node:assert/strict'
import test from 'node:test'

import { getHomeMusicCardPosition, getHomeSocialButtonsPosition } from '../src/lib/home-card-position.ts'

const center = {
	x: 500,
	y: 400
}

const cardStyles = {
	hiCard: { width: 360, height: 288 },
	socialButtons: { width: 315, height: 48 },
	shareCard: { width: 200, height: 180 },
	likePosition: { width: 54, height: 54 },
	musicCard: { width: 293, height: 66, offsetX: null, offsetY: null }
}

test('getHomeMusicCardPosition places music card to the right of like position', () => {
	const position = getHomeMusicCardPosition(center, cardStyles, 16)

	assert.deepEqual(position, {
		x: 651,
		y: 700
	})
})

test('getHomeMusicCardPosition respects explicit offsets', () => {
	const position = getHomeMusicCardPosition(
		center,
		{
			...cardStyles,
			musicCard: { ...cardStyles.musicCard, offsetX: -40, offsetY: 24 }
		},
		16
	)

	assert.deepEqual(position, {
		x: 460,
		y: 424
	})
})

test('getHomeSocialButtonsPosition nudges the social buttons down from the hero card', () => {
	const position = getHomeSocialButtonsPosition(center, cardStyles, 16)

	assert.deepEqual(position, {
		x: 365,
		y: 578
	})
})
