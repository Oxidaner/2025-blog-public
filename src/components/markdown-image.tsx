'use client'

import { useState } from 'react'
import { DialogModal } from '@/components/dialog-modal'

type MarkdownImageProps = {
	src: string
	alt?: string
	title?: string
}

export function MarkdownImage({ src, alt = '', title = '' }: MarkdownImageProps) {
	const [display, setDisplay] = useState(false)

	return (
		<>
			<img data-markdown-image src={src} alt={alt} title={title} loading='lazy' onClick={() => setDisplay(true)} className='cursor-pointer transition-opacity hover:opacity-80' />
			<DialogModal open={display} onClose={() => setDisplay(false)} className='max-w-none bg-transparent p-0'>
				<img src={src} alt={alt} className='max-h-[92vh] max-w-[94vw] rounded-2xl object-contain shadow-2xl' />
			</DialogModal>
		</>
	)
}
