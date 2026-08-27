import { useState } from 'react'
import { Play } from 'lucide-react'

const VIDEO_ID = 'LVVDWEBtkac'
const POSTER_URL = '/demo-video-poster.png'

export default function DemoVideo() {
	const [isPlaying, setIsPlaying] = useState(false)

	return (
		<section aria-labelledby="demo-video-heading" className="py-12 md:py-20 bg-white">
			<div className="max-w-6xl mx-auto px-6 sm:px-6 md:px-8 text-center">
				<p className="text-sm sm:text-base font-bold uppercase tracking-[0.18em] text-purple-600 mb-3">See it in action</p>
				<h2 id="demo-video-heading" className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
					Watch Edible turn groceries into meals
				</h2>
				<p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto leading-relaxed mb-8 md:mb-10">
					Watch a real grocery list turn into a full week of meals in seconds.
				</p>

				<div className="w-full max-w-[380px] mx-auto aspect-[9/16] rounded-2xl overflow-hidden border border-gray-200 shadow-lg bg-gray-100">
					{isPlaying ? (
						<iframe
							className="w-full h-full"
							src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
							title="Edible app demo: turning a grocery list into a meal plan"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
							allowFullScreen
						/>
					) : (
						<button
							type="button"
							onClick={() => setIsPlaying(true)}
							aria-label="Play demo video"
							className="group relative block w-full h-full cursor-pointer"
						>
							<img
								src={POSTER_URL}
								alt="Edible app showing a generated meal, Bacon and Spinach Pasta Bake"
								className="absolute inset-0 w-full h-full bg-[#f8f5ff] object-contain"
							/>
							<span className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" />
							<span className="absolute inset-0 flex items-center justify-center">
								<span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-purple-600 shadow-lg transition-transform group-hover:scale-105">
									<Play className="w-7 h-7 fill-current ml-1" aria-hidden="true" />
								</span>
							</span>
						</button>
					)}
				</div>
			</div>
		</section>
	)
}