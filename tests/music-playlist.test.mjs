import assert from 'node:assert/strict'
import test from 'node:test'

import { MUSIC_TRACKS, getNextTrackIndex } from '../src/lib/music-playlist.ts'

test('MUSIC_TRACKS includes the local Yi Cheng Shan Lu slot', () => {
	const track = MUSIC_TRACKS.find(item => item.title === '一程山路')

	assert.equal(track?.artist, '毛不易')
	assert.equal(track?.src, '/music/yi-cheng-shan-lu.mp3')
})

test('getNextTrackIndex advances in order and wraps around', () => {
	assert.equal(getNextTrackIndex(0, 2), 1)
	assert.equal(getNextTrackIndex(1, 2), 0)
	assert.equal(getNextTrackIndex(0, 0), 0)
})
