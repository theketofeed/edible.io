import { memo, useCallback } from 'react'
import { Shield, Sparkles, Leaf } from 'lucide-react'

interface Props {
	onCTAClick?: () => void
}

const FinalCTA = memo(function FinalCTA({ onCTAClick }: Props) {
	const handleScroll = useCallback(() => {
		const uploadSection = document.getElementById('upload-section')
		if (uploadSection) {
			uploadSection.scrollIntoView({ behavior: 'smooth' })
		}
		onCTAClick?.()
	}, [onCTAClick])

	return (
		<section className="py-24 md:py-32 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-50 via-white to-white">
			<div className="max-w-4xl mx-auto px-4 text-center">
				{/* Top Label */}
				<div className="text-sm font-bold tracking-[0.2em] text-gray-400 uppercase mb-6 animate-fade-in">
					Stop Staring at Your Fridge
				</div>

				{/* Title */}
				<h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-8 tracking-tight leading-tight">
					Transform your <br className="hidden md:block" />
					<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-800 to-purple-600">Leftovers</span> today
				</h2>

				{/* Subtitle */}
				<p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
					Turn random ingredients into delicious meal plans in seconds.
				</p>

				{/* CTA Button */}
				<button
					onClick={handleScroll}
					className="
						inline-block px-8 md:px-12 py-3.5 md:py-4
						bg-purple-600 hover:bg-purple-700 text-white font-bold text-base md:text-lg
						rounded-full shadow-xl hover:shadow-purple-900/20 hover:-translate-y-1
						transition-all duration-300
						mb-12
					"
				>
					Generate Meal Plan
				</button>

				{/* Trust Badges */}
				<div className="grid grid-cols-2 md:flex md:flex-row items-center justify-center gap-y-6 gap-x-4 md:gap-12 text-gray-500 font-medium text-xs sm:text-sm md:text-base px-2">
					<div className="flex items-center justify-center gap-2">
						<div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
							<Shield size={16} strokeWidth={2.5} />
						</div>
						<span className="text-left">No sign-up required</span>
					</div>
					<div className="flex items-center justify-center gap-2">
						<div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
							<Leaf size={16} strokeWidth={2.5} />
						</div>
						<span className="text-left">Zero Food Waste</span>
					</div>
					<div className="flex items-center justify-center gap-2 col-span-2 md:col-span-1 mt-1 md:mt-0">
						<div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
							<Sparkles size={16} strokeWidth={2.5} />
						</div>
						<span className="text-left">Instant AI Recipes</span>
					</div>
				</div>
			</div>
		</section>
	)
})

export default FinalCTA
