export type MusicTrack = {
	title: string
	artist?: string
	src: string
}

export const MUSIC_TRACKS: MusicTrack[] = [
	{
		title: 'Close To You',
		src: '/music/close-to-you.mp3'
	},
	{
		title: '一程山路',
		artist: '毛不易',
		src: '/music/yi-cheng-shan-lu.mp3'
	}
]

export function getNextTrackIndex(currentIndex: number, trackCount: number): number {
	if (trackCount <= 0) return 0
	return (currentIndex + 1) % trackCount
}
