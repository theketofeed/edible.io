import { memo, useState, useEffect, useCallback } from 'react'
import { Salad } from 'lucide-react'
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
				{/* Hero badge - Frosted glass design */}
				<div className="relative inline-flex items-center gap-2.5 px-5 py-1.5 rounded-full bg-white/75 backdrop-blur-lg shadow-md border border-white/60 mb-6 transition-transform hover:scale-[1.02] cursor-default">
					<Salad className="w-4 h-4 text-violet-400" />
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

				{/* Social proof - PostPlanify style */}
				<div className="flex items-center justify-center gap-3">
					<div className="flex -space-x-3">
						<img src={avatar1} alt="User 1" className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm" />
						<img src={avatar2} alt="User 2" className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm" />
						<img src={avatar3} alt="User 3" className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm" />
					</div>
					<div className="flex flex-col items-start gap-1">
						<div className="flex gap-1 text-sm">
							⭐⭐⭐⭐⭐
						</div>
						<p className="text-xs text-gray-500 font-medium">Trusted by 1,000+ home cooks</p>
					</div>
				</div>
			</div>
		</section>
	)
})

export default HeroSection