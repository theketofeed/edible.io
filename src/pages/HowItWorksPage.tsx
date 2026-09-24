import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import HowItWorksSticky from '../components/HowItWorksSticky'
import Seo from '../components/Seo'

const TITLE = 'How Edible Works. Turn Groceries Into Meal Plans'
const DESCRIPTION = 'Upload your grocery receipt or paste your shopping list, choose a diet, and get a personalized weekly meal plan in seconds. Four simple steps to eliminate food waste.'

export default function HowItWorksPage() {
	return (
		<div>
			<Seo title={TITLE} description={DESCRIPTION} path="/how-it-works" />
			<HowItWorksSticky headingLevel="h1" />
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
