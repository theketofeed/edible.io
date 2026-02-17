import { memo } from 'react'
import { Quote } from 'lucide-react'

interface Testimonial {
	quote: string
	author: string
	role: string
	imageColor: string
	highlight: string
}

const TESTIMONIALS: Testimonial[] = [
	{
		quote: "The progress tracker is fantastic. It's motivating to see how much I've improved over time. The app has a great mix of common and challenging words.",
		author: "Fatima Khoury",
		role: "dilatory_curtains_98",
		imageColor: "bg-orange-200",
		highlight: "challenging"
	},
	{
		quote: "Edible saves me hours every week. I used to spend Sunday meal planning, now I just take a picture of my receipt. Game changer!",
		author: "Sarah Mitchell",
		role: "busy_parent_88",
		imageColor: "bg-purple-200",
		highlight: "Game changer"
	},
	{
		quote: "Finally, a tool that understands what I actually have in my kitchen. No more recipes with missing ingredients. Love it!",
		author: "James Rodriguez",
		role: "home_cook_nyc",
		imageColor: "bg-blue-200",
		highlight: "missing ingredients"
	},
	{
		quote: "The vegan meal plans are incredible. I've discovered so many recipes I never would have tried. Highly recommend!",
		author: "Emma Chen",
		role: "plant_based_emma",
		imageColor: "bg-green-200",
		highlight: "Highly recommend"
	},
	{
		quote: "This is exactly what I needed to cut down on food waste. My grocery bill has gone down significantly.",
		author: "Michael Chang",
		role: "budget_eats_22",
		imageColor: "bg-red-200",
		highlight: "cut down on food waste"
	}
]

const Testimonials = memo(function Testimonials() {
	return (
		<section className="py-20 bg-gray-50 overflow-hidden">
			<div className="max-w-7xl mx-auto px-4 mb-16 text-center">
				<span className="inline-block py-1 px-3 rounded-full bg-purple-100 text-purple-600 text-xs font-bold tracking-wider mb-4 border border-purple-200">
					TESTIMONIALS
				</span>
				<h2 className="text-4xl md:text-5xl font-black text-gray-900">
					What Home Cooks Are Saying
				</h2>
			</div>

			<div className="relative w-full overflow-hidden">
				{/* Gradient Masks for smooth fade out at edges */}
				<div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-r from-gray-50 to-transparent z-10" />
				<div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-l from-gray-50 to-transparent z-10" />

				{/* Scrolling Container */}
				<div className="flex w-max animate-scroll gap-6 md:gap-8 hover:[animation-play-state:paused] py-4">
					{/* First set of testimonials */}
					{TESTIMONIALS.map((testimonial, idx) => (
						<TestimonialCard key={`1-${idx}`} testimonial={testimonial} />
					))}
					{/* Duplicate set for seamless loop */}
					{TESTIMONIALS.map((testimonial, idx) => (
						<TestimonialCard key={`2-${idx}`} testimonial={testimonial} />
					))}
					{/* Triplicate set for wider screens/seamlessness */}
					{TESTIMONIALS.map((testimonial, idx) => (
						<TestimonialCard key={`3-${idx}`} testimonial={testimonial} />
					))}
				</div>
			</div>
		</section>
	)
})

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
	// Simple highlight logic
	const parts = testimonial.quote.split(testimonial.highlight)

	return (
		<div className="w-[300px] md:w-[380px] bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col transition-transform duration-300 hover:-translate-y-1">
			<div className="mb-6">
				<Quote className="w-8 h-8 text-purple-200 fill-purple-100" />
			</div>

			<p className="text-gray-600 text-[15px] leading-relaxed mb-8 flex-grow">
				"{parts[0]}
				<span className="text-orange-500 font-semibold">{testimonial.highlight}</span>
				{parts[1]}"
			</p>

			<div className="flex items-center gap-4 border-t border-gray-50 pt-6">
				<div className={`w-12 h-12 rounded-full ${testimonial.imageColor} border-2 border-white shadow-sm`} />
				<div>
					<h4 className="font-bold text-gray-900 text-sm">{testimonial.author}</h4>
					<p className="text-gray-400 text-xs">{testimonial.role}</p>
				</div>
			</div>
		</div>
	)
}

export default Testimonials
