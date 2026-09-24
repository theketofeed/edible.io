import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import FAQ from '../components/FAQ'
import Seo from '../components/Seo'

const TITLE = 'Edible FAQ. Common Questions Answered'
const DESCRIPTION = 'Answers to common questions about Edible: pricing, supported stores, diet options, meal plan editing, and what makes Edible different from other meal planners.'

export default function FAQPage() {
	return (
		<div>
			<Seo title={TITLE} description={DESCRIPTION} path="/faq" />
			<FAQ headingLevel="h1" />
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
