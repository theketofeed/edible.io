import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Share2, Twitter, X } from 'lucide-react'

interface ShareButtonsProps {
	title: string
	url?: string
	className?: string
}

export default function ShareButtons({ title, url, className = '' }: ShareButtonsProps) {
	const [isOpen, setIsOpen] = useState(false)
	const [copied, setCopied] = useState(false)
	const timerRef = useRef<number | null>(null)

	useEffect(() => {
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setIsOpen(false)
		}
		document.addEventListener('keydown', handleEscape)

		return () => {
			document.removeEventListener('keydown', handleEscape)
			if (timerRef.current) window.clearTimeout(timerRef.current)
		}
	}, [])

	const shareUrl = url ?? window.location.href
	const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(shareUrl)
		} catch {
			const textarea = document.createElement('textarea')
			textarea.value = shareUrl
			textarea.style.position = 'fixed'
			textarea.style.opacity = '0'
			document.body.appendChild(textarea)
			textarea.select()
			document.execCommand('copy')
			document.body.removeChild(textarea)
		}
		setCopied(true)
		if (timerRef.current) window.clearTimeout(timerRef.current)
		timerRef.current = window.setTimeout(() => setCopied(false), 2000)
	}

	const handleNativeShare = async () => {
		try {
			await navigator.share({ title, url: shareUrl })
			setIsOpen(false)
		} catch {
			// Closing or cancelling native share should leave the modal open.
		}
	}

	const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`

	const buttonClass = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors'

	return (
		<div className={`inline-flex ${className}`}>
			<button type="button" onClick={() => setIsOpen(true)} aria-label="Share this post" className={buttonClass}>
				<Share2 className="w-3.5 h-3.5" />
				Share
			</button>

			{isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-5" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsOpen(false)}>
					<div className="absolute inset-0 bg-black/20" />
					<div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
						<button type="button" onClick={() => setIsOpen(false)} aria-label="Close share dialog" className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900">
							<X className="h-4 w-4" />
						</button>
						<h2 id="share-dialog-title" className="pr-8 text-lg font-bold text-gray-900">Share this post</h2>
						<p className="mt-1 text-sm text-gray-500">Send it to someone who would find it useful.</p>
						<div className="mt-5 flex flex-col gap-2">
							<button type="button" onClick={handleCopy} className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50">
								{copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
								{copied ? 'Copied!' : 'Copy link'}
							</button>
							{canNativeShare && <button type="button" onClick={handleNativeShare} className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"><Share2 className="h-4 w-4" />Share from your device</button>}
							<a href={xHref} target="_blank" rel="noopener noreferrer" aria-label="Share on X (Twitter)" className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"><Twitter className="h-4 w-4" />Share on X</a>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
