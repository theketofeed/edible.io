import { memo } from 'react'

interface Testimonial {
	quote: string
	author: string
	role: string
	rating: number
}

const TESTIMONIALS: Testimonial[] = [
	{
		quote: "Edible saves me hours every week. I used to spend Sunday meal planning, now I just take a picture of my receipt. Game changer!",
		author: "Sarah Mitchell",
		role: "Busy Parent",
		rating: 5
	},
	{
		quote: "Finally, a tool that understands what I actually have in my kitchen. No more recipes with missing ingredients. Love it!",
		author: "James Rodriguez",
		role: "Home Cook",
		rating: 5
	},
	{
		quote: "The vegan meal plans are incredible. I've discovered so many recipes I never would have tried. Highly recommend!",
		author: "Emma Chen",
		role: "Plant-Based Enthusiast",
		rating: 5
	}
]

const Testimonials = memo(function Testimonials() {
	return (
		<section className="py-20 md:py-24 bg-gray-50">
			<div className="max-w-5xl mx-auto px-4">
				{/* Section Header */}
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
						What Home Cooks Are Saying
					</h2>
				</div>

				{/* Testimonials Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
					{TESTIMONIALS.map((testimonial, idx) => (
						<div
							key={idx}
							className="bg-white rounded-xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow duration-300"
						>
							{/* Star Rating */}
							<div className="flex gap-1 mb-4">
								{[...Array(testimonial.rating)].map((_, i) => (
									<span key={i} className="text-lg text-purple-600">★</span>
								))}
							</div>

							{/* Quote */}
							<blockquote className="text-gray-800 text-base md:text-lg italic font-medium leading-relaxed mb-6 min-h-24">
								"{testimonial.quote}"
							</blockquote>

							{/* Author */}
							<div>
								<p className="font-semibold text-gray-900 text-sm md:text-base">
									{testimonial.author}
								</p>
								<p className="text-gray-600 text-xs md:text-sm">
									{testimonial.role}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
})

export default Testimonials
