import { memo } from 'react'

interface Testimonial {
	quote: string
	author: string
	role: string
	subhead: string
	rating: number
}

const TESTIMONIALS: Testimonial[] = [
	{
		quote: "Edible saves me hours every week. I used to spend Sunday meal planning, now I just take a picture of my receipt. Game changer!",
		author: "Sarah Mitchell",
		role: "Busy Parent",
		subhead: "SAVED 5 HOURS A WEEK",
		rating: 5
	},
	{
		quote: "Finally, a tool that understands what I actually have in my kitchen. No more recipes with missing ingredients. Love it!",
		author: "James Rodriguez",
		role: "Home Cook",
		subhead: "NO MORE MISSING INGREDIENTS",
		rating: 4
	},
	{
		quote: "The vegan meal plans are incredible. I've discovered so many recipes I never would have tried. Highly recommend!",
		author: "Emma Chen",
		role: "Fitness Enthusiast",
		subhead: "DISCOVERED NEW RECIPES",
		rating: 5
	},
	{
		quote: "This is exactly what I needed to cut down on food waste. My grocery bill has gone down significantly.",
		author: "Michael Chang",
		role: "Budget Shopper",
		subhead: "REDUCED GROCERY BILL",
		rating: 5
	}
]

const Testimonials = memo(function Testimonials() {
	return (
		<section className="py-20 bg-gray-50 overflow-hidden">
			<div className="max-w-7xl mx-auto px-4 mb-14 text-center">
				<h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
					What Home Cooks Are Saying
				</h2>
			</div>

			<div className="relative w-full overflow-hidden">
				{/* Gradient Masks for smooth fade out at edges */}
				<div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
				<div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />

				{/* Scrolling Container */}
				<div className="flex w-max animate-scroll gap-4 md:gap-6 hover:[animation-play-state:paused] py-4 px-4">
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
	return (
		<div className="w-[300px] md:w-[380px] bg-white rounded-2xl p-8 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-gray-100/50 flex flex-col items-center text-center transition-transform duration-300 hover:-translate-y-1">
			<h4 className="text-[11px] md:text-xs font-bold text-purple-700 uppercase tracking-widest mb-4">
				{testimonial.subhead}
			</h4>
			<div className="flex gap-1.5 mb-6">
				{Array.from({ length: 5 }).map((_, i) => (
					<svg key={i} className={`w-5 h-5 md:w-6 md:h-6 ${i < testimonial.rating ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
						<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
					</svg>
				))}
			</div>
			<p className="text-gray-700 text-[15px] md:text-[17px] leading-relaxed italic mb-8 flex-grow">
				"{testimonial.quote}"
			</p>
			<div>
				<h5 className="font-bold text-gray-900 text-[15px] md:text-[16px] leading-tight mb-1">{testimonial.author}</h5>
				<p className="text-gray-500 text-[13px] md:text-[14px]">{testimonial.role}</p>
			</div>
		</div>
	)
}

export default Testimonials
