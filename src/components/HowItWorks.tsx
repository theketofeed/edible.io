import { memo } from 'react'
import React from 'react'
import { FileText, Salad, Sparkles } from 'lucide-react'

interface Step {
	number: number
	icon: React.ReactNode
	title: string
	description: string
}

const STEPS: Step[] = [
	{
		number: 1,
		icon: <FileText size={64} className="text-purple-600" />,
		title: 'Upload Receipt',
		description: 'Snap a photo of your grocery receipt or paste your shopping list. Our AI extracts ingredients instantly'
	},
	{
		number: 2,
		icon: <Salad size={64} className="text-purple-600" />,
		title: 'Choose Your Diet',
		description: 'Select from 8 dietary preferences: Keto, Vegan, Paleo, and more. Customize to match your lifestyle'
	},
	{
		number: 3,
		icon: <Sparkles size={64} className="text-purple-600" />,
		title: 'Get Your Plan',
		description: 'Receive a personalized meal plan with step-by-step recipes using only what you bought. No food waste!'
	}
]

const HowItWorks = memo(function HowItWorks() {
	return (
		<section className="py-12 md:py-16 bg-gradient-to-b from-purple-50 via-purple-50/50 to-white">
			<div className="max-w-6xl mx-auto px-6 md:px-8">
				{/* Section Header */}
				<div className="text-center mb-16">
					{/* Badge - matching HeroSection style */}
					<div className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/40 backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] mb-5 before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white/50 before:to-white/0 before:opacity-60 before:pointer-events-none">
						<span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_0_3px_rgba(168,85,247,0.15)]" />
						<span className="text-[11px] sm:text-[12px] font-medium text-gray-900">
							How it works
						</span>
					</div>

					{/* Main Heading - smaller and bolder */}
					<h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
						How <span className="text-purple-600">Edible</span> Works
					</h2>

					{/* Subtitle - reduced size */}
					<p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
						Transform your groceries into meal plans in 3 simple steps
					</p>
				</div>

				{/* Steps Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
					{STEPS.map((step, index) => (
						<div
							key={step.number}
							className="group h-full"
							style={{
								animation: `fadeInUp 0.6s ease-out ${index * 100}ms both`
							}}
						>
							{/* Card */}
							<div className="h-full bg-white rounded-3xl border border-gray-100 p-8 flex flex-col items-center justify-between relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-2 group-hover:border-purple-100">

								{/* Ripple Background Effect */}
								<div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-64 pointer-events-none flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity duration-700">
									<div className="absolute w-24 h-24 rounded-full border border-purple-100/60" />
									<div className="absolute w-40 h-40 rounded-full border border-purple-100/40" />
									<div className="absolute w-60 h-60 rounded-full border border-purple-50/30" />
									<div className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-purple-100/20 to-purple-100/20 blur-xl" />
								</div>

								{/* Floating Icon Container */}
								<div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-white to-gray-50 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-black/5 flex items-center justify-center mb-12 mt-4 group-hover:scale-110 transition-transform duration-500 ease-out">
									<div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/5 to-purple-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
									{React.cloneElement(step.icon as React.ReactElement, {
										className: 'w-8 h-8 text-gray-700 group-hover:text-purple-600 transition-colors duration-300',
										strokeWidth: 1.5
									})}

									{/* Small orbiting dots decorations */}
									<div className="absolute -top-1 right-2 w-2 h-2 rounded-full bg-purple-200 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-100" />
									<div className="absolute bottom-2 -left-1 w-1.5 h-1.5 rounded-full bg-purple-300 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-200" />
								</div>

								{/* Content - Bottom Aligned */}
								<div className="relative z-10 w-full text-left mt-auto">
									<div className="text-purple-400 font-bold text-sm mb-3 tracking-wide uppercase opacity-90">
										Step {step.number}
									</div>
									<h3 className="text-xl font-extrabold text-gray-900 mb-3 group-hover:text-purple-900 transition-colors duration-300">
										{step.title}
									</h3>
									<p className="text-gray-500 leading-relaxed text-sm font-medium">
										{step.description}
									</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Animation keyframes */}
			<style>{`
				@keyframes fadeInUp {
					from {
						opacity: 0;
						transform: translateY(30px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
			`}</style>
		</section>
	)
})

export default HowItWorks
