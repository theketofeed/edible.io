import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import FAQ from '../components/FAQ'

export default function FAQPage() {
	useEffect(() => {
		document.title = 'Edible FAQ — Common Questions Answered'
		const meta = document.querySelector('meta[name="description"]')
		if (meta) meta.setAttribute('content', 'Answers to common questions about Edible: pricing, supported stores, diet options, meal plan editing, and what makes Edible different from other meal planners.')
		const ogTitle = document.querySelector('meta[property="og:title"]')
		if (ogTitle) ogTitle.setAttribute('content', 'Edible FAQ — Common Questions Answered')
		const ogDesc = document.querySelector('meta[property="og:description"]')
		if (ogDesc) ogDesc.setAttribute('content', 'Answers to common questions about Edible: pricing, supported stores, diet options, meal plan editing, and what makes Edible different from other meal planners.')
		const twTitle = document.querySelector('meta[name="twitter:title"]')
		if (twTitle) twTitle.setAttribute('content', 'Edible FAQ — Common Questions Answered')
		const twDesc = document.querySelector('meta[name="twitter:description"]')
		if (twDesc) twDesc.setAttribute('content', 'Answers to common questions about Edible: pricing, supported stores, diet options, meal plan editing, and what makes Edible different from other meal planners.')
	}, [])

	return (
		<div>
			<FAQ />
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
