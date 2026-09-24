import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PricingSection from '../components/PricingSection'
import Seo from '../components/Seo'

const TITLE = 'Edible Pricing. Plans Starting at $3.99/mo'
const DESCRIPTION = 'Choose between Edible Pro ($3.99/mo or $2.50/mo annual) and the Founding Member plan ($19 one-time). Unlimited meal plans, saved recipes, PDF export, and more.'

export default function PricingPage() {
	const navigate = useNavigate()

	return (
		<div>
			<Seo title={TITLE} description={DESCRIPTION} path="/pricing" />
			<PricingSection headingLevel="h1" onAuthRequired={() => navigate('/')} />
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
