import LikeButton from '@/components/like-button'
import { ANIMATION_DELAY, CARD_SPACING } from '@/consts'
import { motion } from 'motion/react'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from './stores/config-store'
import { HomeDraggableLayer } from './home-draggable-layer'
import { getHomeLikePosition } from '@/lib/home-card-position'

export default function LikePosition() {
	const center = useCenterStore()
	const { cardStyles, siteContent } = useConfigStore()
	const styles = cardStyles.likePosition
	const hiCardStyles = cardStyles.hiCard
	const socialButtonsStyles = cardStyles.socialButtons
	const musicCardStyles = cardStyles.musicCard
	const shareCardStyles = cardStyles.shareCard

	const defaultPosition = getHomeLikePosition(
		center,
		{
			hiCard: hiCardStyles,
			socialButtons: socialButtonsStyles,
			shareCard: shareCardStyles,
			likePosition: styles,
			musicCard: musicCardStyles
		},
		CARD_SPACING
	)
	const x = styles.offsetX !== null ? center.x + styles.offsetX : defaultPosition.x
	const y = styles.offsetY !== null ? center.y + styles.offsetY : defaultPosition.y

	return (
		<HomeDraggableLayer cardKey='likePosition' x={x} y={y} width={styles.width} height={styles.height}>
			<motion.div className='absolute max-sm:static' initial={{ left: x, top: y }} animate={{ left: x, top: y }}>
				{siteContent.enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-13.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 40, left: -4, top: -4, opacity: 0.9 }}
						/>
					</>
				)}

				<LikeButton delay={cardStyles.shareCard.order * ANIMATION_DELAY * 1000} />
			</motion.div>
		</HomeDraggableLayer>
	)
}
