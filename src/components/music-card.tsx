'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from '../app/(home)/stores/config-store'
import { CARD_SPACING } from '@/consts'
import MusicSVG from '@/svgs/music.svg'
import PlaySVG from '@/svgs/play.svg'
import { HomeDraggableLayer } from '../app/(home)/home-draggable-layer'
import { Pause, SkipForward } from 'lucide-react'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { getNextTrackIndex, MUSIC_TRACKS } from '@/lib/music-playlist'
import { getHomeMusicCardPosition } from '@/lib/home-card-position'

export default function MusicCard() {
	const pathname = usePathname()
	const center = useCenterStore()
	const { cardStyles, siteContent } = useConfigStore()
	const styles = cardStyles.musicCard
	const hiCardStyles = cardStyles.hiCard
	const socialButtonsStyles = cardStyles.socialButtons
	const shareCardStyles = cardStyles.shareCard
	const likePositionStyles = cardStyles.likePosition

	const [isPlaying, setIsPlaying] = useState(false)
	const [currentIndex, setCurrentIndex] = useState(0)
	const [progress, setProgress] = useState(0)
	const audioRef = useRef<HTMLAudioElement | null>(null)
	const currentIndexRef = useRef(0)
	const currentTrack = MUSIC_TRACKS[currentIndex] ?? MUSIC_TRACKS[0]

	const isHomePage = pathname === '/'

	const position = useMemo(() => {
		// If not on home page, always position at bottom-right corner when playing
		if (!isHomePage) {
			return {
				x: center.width - styles.width - 16,
				y: center.height - styles.height - 16
			}
		}

		// Default position on home page
		return getHomeMusicCardPosition(
			center,
			{
				hiCard: hiCardStyles,
				socialButtons: socialButtonsStyles,
				shareCard: shareCardStyles,
				likePosition: likePositionStyles,
				musicCard: styles
			},
			CARD_SPACING
		)
	}, [isHomePage, center, styles, hiCardStyles, socialButtonsStyles, shareCardStyles, likePositionStyles])

	const { x, y } = position

	// Initialize audio element
	useEffect(() => {
		if (!audioRef.current) {
			audioRef.current = new Audio()
		}

		const audio = audioRef.current

		const updateProgress = () => {
			if (audio.duration) {
				setProgress((audio.currentTime / audio.duration) * 100)
			}
		}

		const handleEnded = () => {
			const nextIndex = getNextTrackIndex(currentIndexRef.current, MUSIC_TRACKS.length)
			currentIndexRef.current = nextIndex
			setCurrentIndex(nextIndex)
			setProgress(0)
		}

		const handleTimeUpdate = () => {
			updateProgress()
		}

		const handleLoadedMetadata = () => {
			updateProgress()
		}

		const handleAudioError = () => {
			setIsPlaying(false)
			setProgress(0)
		}

		audio.addEventListener('timeupdate', handleTimeUpdate)
		audio.addEventListener('ended', handleEnded)
		audio.addEventListener('loadedmetadata', handleLoadedMetadata)
		audio.addEventListener('error', handleAudioError)

		return () => {
			audio.removeEventListener('timeupdate', handleTimeUpdate)
			audio.removeEventListener('ended', handleEnded)
			audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
			audio.removeEventListener('error', handleAudioError)
		}
	}, [])

	// Handle currentIndex change - load new audio
	useEffect(() => {
		currentIndexRef.current = currentIndex
		if (audioRef.current) {
			const wasPlaying = !audioRef.current.paused
			audioRef.current.pause()
			audioRef.current.src = currentTrack.src
			audioRef.current.loop = false
			setProgress(0)

			if (wasPlaying) {
				audioRef.current.play().catch(error => {
					console.error(error)
					setIsPlaying(false)
				})
			}
		}
	}, [currentIndex, currentTrack.src])

	// Handle play/pause state change
	useEffect(() => {
		if (!audioRef.current) return

		if (isPlaying) {
			audioRef.current.play().catch(error => {
				console.error(error)
				setIsPlaying(false)
			})
		} else {
			audioRef.current.pause()
		}
	}, [isPlaying])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (audioRef.current) {
				audioRef.current.pause()
				audioRef.current.src = ''
			}
		}
	}, [])

	const togglePlayPause = () => {
		setIsPlaying(!isPlaying)
	}

	const switchToNextTrack = () => {
		setCurrentIndex(index => getNextTrackIndex(index, MUSIC_TRACKS.length))
	}

	// Hide component if not on home page and not playing
	if (!isHomePage && !isPlaying) {
		return null
	}

	return (
		<HomeDraggableLayer cardKey='musicCard' x={x} y={y} width={styles.width} height={styles.height}>
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className={clsx('flex items-center gap-3', !isHomePage && 'fixed')}>
				{siteContent.enableChristmas && (
					<>
						<img
							src='/images/christmas/snow-10.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 120, left: -8, top: -12, opacity: 0.8 }}
						/>
						<img
							src='/images/christmas/snow-11.webp'
							alt='Christmas decoration'
							className='pointer-events-none absolute'
							style={{ width: 80, right: -10, top: -12, opacity: 0.8 }}
						/>
					</>
				)}

				<button type='button' onClick={switchToNextTrack} className='flex min-w-0 flex-1 items-center gap-3 text-left' title='切换下一首'>
					<MusicSVG className='h-8 w-8 shrink-0' />

					<div className='min-w-0 flex-1'>
						<div className='text-secondary flex items-center gap-1.5 text-sm'>
							<span className='truncate'>{currentTrack.title}</span>
							<SkipForward size={13} className='shrink-0 opacity-55' />
						</div>
						{currentTrack.artist && <div className='text-secondary/70 mt-0.5 truncate text-[11px]'>{currentTrack.artist}</div>}

						<div className='mt-1 h-2 rounded-full bg-white/60'>
							<div className='bg-linear h-full rounded-full transition-all duration-300' style={{ width: `${progress}%` }} />
						</div>
					</div>
				</button>

				<button onClick={togglePlayPause} className='flex h-10 w-10 items-center justify-center rounded-full bg-white transition-opacity hover:opacity-80'>
					{isPlaying ? <Pause className='text-brand h-4 w-4' /> : <PlaySVG className='text-brand ml-1 h-4 w-4' />}
				</button>
			</Card>
		</HomeDraggableLayer>
	)
}
