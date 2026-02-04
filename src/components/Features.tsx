import { memo } from 'react'

interface Feature {
	icon: string
	title: string
	description: string
}

const FEATURES: Feature[] = [
	{
		icon: '♻️',
		title: 'No Food Waste',
		description: 'Use exactly what you have. Reduce waste and save money on groceries'
	},
	{
		icon: '⏱️',
		title: 'Save Time & Money',
		description: 'Meal planning in minutes, not hours. Perfect shopping lists included'
	},
	{
		icon: '🎯',
		title: 'Dietary Freedom',
		description: '8 diet preferences supported. Customize to your health goals'
	},
	{
		icon: '👨‍🍳',
		title: 'Realistic Recipes',
		description: 'AI-generated meals use your actual groceries. No missing ingredients'
	},
	{
		icon: '⚖️',
		title: 'Smart Portions',
		description: 'Balanced nutrition with realistic serving sizes for your family'
	},
	{
		icon: '📖',
		title: 'Easy to Follow',
		description: 'Simple instructions with prep and cook times. Great for all skill levels'
	}
]

const Features = memo(function Features() {
	return (
		<section className="py-20 md:py-24 bg-white">
			<div className="max-w-5xl mx-auto px-4">
				{/* Section Header */}
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
						Why Choose Edible?
					</h2>
					<p className="text-lg text-gray-600">
						Intelligent meal planning that actually works
					</p>
				</div>

				{/* Features Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
					{FEATURES.map((feature, idx) => (
						<div
							key={idx}
							className="group"
						>
							<div className="bg-white rounded-xl p-6 md:p-8 border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all duration-300 h-full">
								{/* Checkmark Icon */}
								<div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 text-lg font-bold mb-4">
									✓
								</div>

								{/* Feature Icon */}
								<div className="text-3xl md:text-4xl mb-3">
									{feature.icon}
								</div>

								{/* Title */}
								<h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
									{feature.title}
								</h3>

								{/* Description */}
								<p className="text-gray-600 text-sm md:text-base leading-relaxed">
									{feature.description}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
})

export default Features
