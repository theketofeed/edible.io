import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const TITLE = 'Blog | Edible'
const DESCRIPTION = 'Meal planning tips, app comparisons, and guides to help you spend less time deciding what to cook.'

const posts = [
	{
		title: '5 Best Meal Planning Apps in 2026',
		excerpt: 'Comparing five popular meal planning apps — Mealime, AnyList, Edible, Paprika, and PlateJoy — to help you pick the one that fits your household.',
		readingTime: '4 min read',
		date: 'August 19, 2026',
		href: '/blog/best-meal-planning-apps',
	},
]

export default function Blog() {
	useEffect(() => {
		document.title = TITLE
		const meta = document.querySelector('meta[name="description"]')
		if (meta) meta.setAttribute('content', DESCRIPTION)
		const ogTitle = document.querySelector('meta[property="og:title"]')
		if (ogTitle) ogTitle.setAttribute('content', TITLE)
		const ogDesc = document.querySelector('meta[property="og:description"]')
		if (ogDesc) ogDesc.setAttribute('content', DESCRIPTION)
	}, [])

	return (
		<article className="max-w-[760px] mx-auto px-5 sm:px-6 py-10 md:py-16">
			<h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-3" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900 }}>
				Blog
			</h1>
			<p className="text-gray-400 text-sm mb-10">
				Meal planning tips, app comparisons, and guides.
			</p>

			<div className="space-y-6">
				{posts.map((post) => (
					<Link
						key={post.href}
						to={post.href}
						className="group block bg-white border border-gray-200 rounded-2xl px-6 py-6 sm:py-8 hover:shadow-lg hover:border-purple-200 transition-all duration-200"
					>
						<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
							<h2 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>
								{post.title}
							</h2>
							<span className="text-xs text-gray-400 whitespace-nowrap sm:mt-1">{post.readingTime}</span>
						</div>
						<p className="text-gray-500 text-sm leading-relaxed mb-4">
							{post.excerpt}
						</p>
						<div className="flex items-center justify-between">
							<span className="text-xs text-gray-400">{post.date}</span>
							<span className="text-sm font-semibold text-purple-600 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
								Read more <span className="text-xs">→</span>
							</span>
						</div>
					</Link>
				))}
			</div>
		</article>
	)
}
