type CenterPoint = {
	x: number
	y: number
}

type CardSize = {
	width: number
	height: number
}

type OffsetCard = {
	width: number
	height: number
	offsetX: number | null
	offsetY: number | null
}

type HomeMusicPositionStyles = {
	hiCard: CardSize
	socialButtons: CardSize
	shareCard: CardSize
	likePosition: CardSize
	musicCard: OffsetCard
}

type HomeSocialPositionStyles = {
	hiCard: CardSize
	socialButtons: OffsetCard
}

const SOCIAL_BUTTONS_Y_NUDGE = 18

export function getHomeSocialButtonsPosition(center: CenterPoint, styles: HomeSocialPositionStyles, spacing: number) {
	return {
		x: styles.socialButtons.offsetX !== null ? center.x + styles.socialButtons.offsetX : center.x + styles.hiCard.width / 2 - styles.socialButtons.width,
		y: styles.socialButtons.offsetY !== null ? center.y + styles.socialButtons.offsetY : center.y + styles.hiCard.height / 2 + spacing + SOCIAL_BUTTONS_Y_NUDGE
	}
}

export function getHomeMusicCardPosition(center: CenterPoint, styles: HomeMusicPositionStyles, spacing: number) {
	if (styles.musicCard.offsetX !== null || styles.musicCard.offsetY !== null) {
		return {
			x: styles.musicCard.offsetX !== null ? center.x + styles.musicCard.offsetX : getDefaultMusicX(center, styles, spacing),
			y: styles.musicCard.offsetY !== null ? center.y + styles.musicCard.offsetY : getDefaultMusicY(center, styles, spacing)
		}
	}

	return {
		x: getDefaultMusicX(center, styles, spacing),
		y: getDefaultMusicY(center, styles, spacing)
	}
}

function getDefaultLikeX(center: CenterPoint, styles: HomeMusicPositionStyles, spacing: number) {
	return center.x + styles.hiCard.width / 2 - styles.socialButtons.width + styles.shareCard.width + spacing
}

function getDefaultLikeY(center: CenterPoint, styles: HomeMusicPositionStyles, spacing: number) {
	return center.y + styles.hiCard.height / 2 + spacing + styles.socialButtons.height + spacing + styles.musicCard.height + spacing
}

function getDefaultMusicX(center: CenterPoint, styles: HomeMusicPositionStyles, spacing: number) {
	return getDefaultLikeX(center, styles, spacing) + styles.likePosition.width + spacing
}

function getDefaultMusicY(center: CenterPoint, styles: HomeMusicPositionStyles, spacing: number) {
	const likeY = getDefaultLikeY(center, styles, spacing)
	return likeY + (styles.likePosition.height - styles.musicCard.height) / 2
}
