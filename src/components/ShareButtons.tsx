import { useEffect, useRef, useState } from 'react'
import { Link2, Check, Share2, Twitter } from 'lucide-react'

interface ShareButtonsProps {
	title: string
	url?: string
	className?: string
}

export default function ShareButtons({ title, url, className = '' }: ShareButtonsProps) {
	const [copied, setCopied] = useState(false)
	const timerRef = useRef<number | null>(null)

	useEffect(() => {
		return () => {
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
		} catch {
			handleCopy()
		}
	}

	const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`

	const buttonClass =
		'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors'

	return (
		<div className={`inline-flex items-center gap-0.5 ${className}`}>
			{canNativeShare && (
				<button type="button" onClick={handleNativeShare} aria-label="Share this post" className={buttonClass}>
					<Share2 className="w-3.5 h-3.5" />
					Share
				</button>
			)}
			<button type="button" onClick={handleCopy} aria-label="Copy link to this post" className={buttonClass}>
				{copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Link2 className="w-3.5 h-3.5" />}
				{copied ? 'Copied!' : 'Copy link'}
			</button>
			<a
				href={xHref}
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Share on X (Twitter)"
				className={buttonClass}
			>
				<Twitter className="w-3.5 h-3.5" />
				X
			</a>
		</div>
	)
}
