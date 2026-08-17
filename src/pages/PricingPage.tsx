import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PricingSection from '../components/PricingSection'

export default function PricingPage() {
	const navigate = useNavigate()

	useEffect(() => {
		document.title = 'Edible Pricing — Plans Starting at $3.99/mo'
		const meta = document.querySelector('meta[name="description"]')
		if (meta) meta.setAttribute('content', 'Choose between Edible Pro ($3.99/mo or $2.50/mo annual) and the Founding Member plan ($19 one-time). Unlimited meal plans, saved recipes, PDF export, and more.')
		const ogTitle = document.querySelector('meta[property="og:title"]')
		if (ogTitle) ogTitle.setAttribute('content', 'Edible Pricing — Plans Starting at $3.99/mo')
		const ogDesc = document.querySelector('meta[property="og:description"]')
		if (ogDesc) ogDesc.setAttribute('content', 'Choose between Edible Pro ($3.99/mo or $2.50/mo annual) and the Founding Member plan ($19 one-time). Unlimited meal plans, saved recipes, PDF export, and more.')
		const twTitle = document.querySelector('meta[name="twitter:title"]')
		if (twTitle) twTitle.setAttribute('content', 'Edible Pricing — Plans Starting at $3.99/mo')
		const twDesc = document.querySelector('meta[name="twitter:description"]')
		if (twDesc) twDesc.setAttribute('content', 'Choose between Edible Pro ($3.99/mo or $2.50/mo annual) and the Founding Member plan ($19 one-time). Unlimited meal plans, saved recipes, PDF export, and more.')
	}, [])

	return (
		<div>
			<PricingSection onAuthRequired={() => navigate('/')} />
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
