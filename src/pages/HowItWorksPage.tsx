import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import HowItWorks from '../components/HowItWorks'

export default function HowItWorksPage() {
	useEffect(() => {
		document.title = 'How Edible Works — Turn Groceries Into Meal Plans'
		const meta = document.querySelector('meta[name="description"]')
		if (meta) meta.setAttribute('content', 'Upload your grocery receipt or paste your shopping list, choose a diet, and get a personalized weekly meal plan in seconds. Three simple steps to eliminate food waste.')
		const ogTitle = document.querySelector('meta[property="og:title"]')
		if (ogTitle) ogTitle.setAttribute('content', 'How Edible Works — Turn Groceries Into Meal Plans')
		const ogDesc = document.querySelector('meta[property="og:description"]')
		if (ogDesc) ogDesc.setAttribute('content', 'Upload your grocery receipt or paste your shopping list, choose a diet, and get a personalized weekly meal plan in seconds. Three simple steps to eliminate food waste.')
		const twTitle = document.querySelector('meta[name="twitter:title"]')
		if (twTitle) twTitle.setAttribute('content', 'How Edible Works — Turn Groceries Into Meal Plans')
		const twDesc = document.querySelector('meta[name="twitter:description"]')
		if (twDesc) twDesc.setAttribute('content', 'Upload your grocery receipt or paste your shopping list, choose a diet, and get a personalized weekly meal plan in seconds. Three simple steps to eliminate food waste.')
	}, [])

	return (
		<div>
			<HowItWorks />
			<div className="max-w-3xl mx-auto px-4 py-12">
				<Link
					to="/"
					className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-purple-200 active:scale-95"
				>
					<ArrowLeft className="w-5 h-5" />
					Back to homepage
				</Link>
			</div>
		</div>
	)
}
