import { memo, useState, useEffect, useCallback } from 'react'
import avatar1 from '../assets/avatars/avatar1.jpg'
import avatar2 from '../assets/avatars/avatar2.jpg'
import avatar3 from '../assets/avatars/avatar3.jpg'

const HeroSection = memo(function HeroSection() {
	const [displayText, setDisplayText] = useState('')
	const [wordIndex, setWordIndex] = useState(0)
	const [isDeleting, setIsDeleting] = useState(false)

	useEffect(() => {
		const words = ['receipts', 'lists']
		const currentWord = words[wordIndex]
		const typingSpeed = isDeleting ? 50 : 100
		const pauseDuration = 2000

		const timeout = setTimeout(() => {
			if (!isDeleting) {
				if (displayText.length < currentWord.length) {
					setDisplayText(currentWord.substring(0, displayText.length + 1))
				} else {
					setTimeout(() => setIsDeleting(true), pauseDuration)
				}
			} else {
				if (displayText.length > 0) {
					setDisplayText(displayText.substring(0, displayText.length - 1))
				} else {
					setIsDeleting(false)
					setWordIndex((wordIndex + 1) % words.length)
				}
			}
		}, typingSpeed)

		return () => clearTimeout(timeout)
	}, [displayText, wordIndex, isDeleting])

	const scrollToUpload = useCallback(() => {
		const el = document.getElementById('upload-section')
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}
	}, [])

	return (
		<section id="home" className="mt-8 mb-10 md:mt-11 md:mb-14">
			<div className="max-w-4xl mx-auto text-center px-4">
				{/* Hero badge */}
				<div className="relative inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-gray-100/50 mb-6 transition-transform hover:scale-[1.02] cursor-default">
					<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.1)]" />
					<span className="text-[12px] font-bold text-gray-700 tracking-wide">
						1K+ plans generated for 100+ home cooks
					</span>
				</div>

				{/* Headline */}
				<h1 className="heading text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6 leading-[1.1]">
					Turn grocery
					<br className="sm:hidden" />
					<span className="italic px-2 sm:px-3 py-0.5 sm:py-1 rounded-md bg-[#E9D5FF] inline-block mx-1 whitespace-nowrap">
						{displayText}
						<span className="animate-pulse">|</span>
					</span>
					<br className="hidden sm:block" />
					into meal plans instantly
				</h1>

				{/* Subcopy */}
				<p className="text-base sm:text-lg text-gray-500 mb-8 max-w-2xl mx-auto font-medium leading-relaxed">
					Upload a grocery receipt or list and get a personalized, diet‑friendly plan that uses only what you bought.
				</p>

				{/* CTA */}
				<div className="flex justify-center mb-10">
					<button
						onClick={scrollToUpload}
						className="h-14 px-10 rounded-full text-base font-bold bg-[#C6A0F6] text-gray-900 shadow-[0_8px_24px_rgba(198,160,246,0.5)] hover:bg-[#b58df5] hover:-translate-y-1 transition-all duration-300"
					>
						Try Edible for Free
					</button>
				</div>

				{/* Social proof */}
				<div className="flex flex-col items-center gap-3">
					<div className="flex items-center gap-3 px-4 py-2 bg-white/50 rounded-full border border-white/50 shadow-sm">
						<div className="flex -space-x-2.5">
							<img src={avatar1} alt="User 1" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
							<img src={avatar2} alt="User 2" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
							<img src={avatar3} alt="User 3" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
						</div>
						<div className="flex flex-col items-start gap-0.5">
							<div className="flex items-center gap-1">
								<span className="font-bold text-gray-900 text-[14px]">1k+</span>
								<div className="flex gap-0.5">
									{[1, 2, 3, 4, 5].map(i => (
										<svg key={i} className="w-3 h-3 text-yellow-500 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
									))}
								</div>
							</div>
							<p className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">Success stories</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
})

export default HeroSection