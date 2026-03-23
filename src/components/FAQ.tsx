import { memo, useState, useCallback } from 'react'
import { Store, PencilLine, Salad, Banknote, RefreshCw, ScanLine } from 'lucide-react'

interface FAQItem {
	question: string
	answer: string
	icon: React.ReactNode
}

const FAQ_ITEMS: FAQItem[] = [
	{
		question: 'What stores do you support?',
		answer: 'Edible works with any grocery receipt format. Our OCR technology reads text from supermarkets, farmers markets, specialty stores, and delivery apps. Just take a clear photo!',
		icon: <Store className="w-5 h-5 text-purple-500" />
	},
	{
		question: 'Can I edit the meal plan?',
		answer: 'Yes! You can swap meals, adjust portion sizes, and customize recipes. You can also regenerate plans with different diet preferences to get new recommendations.',
		icon: <PencilLine className="w-5 h-5 text-purple-500" />
	},
	{
		question: 'How many diets do you support?',
		answer: 'We support 8 dietary preferences: Balanced, Keto, Vegan, Vegetarian, Paleo, Low-Carb, High-Protein, and Mediterranean. Mix and match to find what works for you.',
		icon: <Salad className="w-5 h-5 text-purple-500" />
	},
	{
		question: 'Is this really free?',
		answer: 'Yes! Edible is completely free. Generate unlimited meal plans, save recipes, and export PDFs. No credit card required, no ads, no hidden fees.',
		icon: <Banknote className="w-5 h-5 text-purple-500" />
	},
	{
		question: "What if I don't like a recipe?",
		answer: "Simply regenerate your meal plan and you'll get different recipes. You can also click on individual recipes to see alternatives or manually adjust your plan.",
		icon: <RefreshCw className="w-5 h-5 text-purple-500" />
	},
	{
		question: 'How accurate is the OCR?',
		answer: 'Our OCR captures 95%+ of items from clear receipts. For best results, use good lighting and avoid shadows. You can always manually add or remove items if needed.',
		icon: <ScanLine className="w-5 h-5 text-purple-500" />
	}
]

const FAQRow = memo(function FAQRow({
	question,
	answer,
	icon,
	isOpen,
	onToggle
}: {
	question: string
	answer: string
	icon: React.ReactNode
	isOpen: boolean
	onToggle: () => void
}) {
	return (
		<div className="border border-gray-200 rounded-2xl overflow-hidden bg-white transition-all duration-200">
			<button
				onClick={onToggle}
				className="w-full px-5 py-4 text-left flex items-center gap-4"
			>
				{/* Icon */}
				<div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
					{icon}
				</div>

				{/* Question */}
				<span className="flex-1 font-semibold text-gray-900 text-sm md:text-base">
					{question}
				</span>

				{/* Toggle */}
				<span className="text-2xl font-light text-gray-400 flex-shrink-0 leading-none">
					{isOpen ? '×' : '+'}
				</span>
			</button>

			{/* Answer */}
			{isOpen && (
				<div className="px-5 pb-5 pt-1">
					<p className="ml-14 text-gray-500 text-sm leading-relaxed">
						{answer}
					</p>
				</div>
			)}
		</div>
	)
})

const FAQ = memo(function FAQ() {
	const [openIndex, setOpenIndex] = useState<number | null>(0)

	const handleToggle = useCallback((index: number) => {
		setOpenIndex(openIndex === index ? null : index)
	}, [openIndex])

	return (
		<section id="faq" className="py-20 md:py-24 bg-purple-50">
			<div className="max-w-3xl mx-auto px-4">
				{/* Section Header */}
				<div className="text-center">
					<h2 className="text-3xl md:text-4xl font-bold text-gray-900">
						Frequently Asked Questions
					</h2>
					<p className="text-gray-500 text-center mb-12 mt-3 text-sm md:text-base">
						Everything you need to know about turning your groceries into great meals.
					</p>
				</div>

				{/* FAQ Rows */}
				<div className="space-y-3">
					{FAQ_ITEMS.map((item, idx) => (
						<FAQRow
							key={idx}
							question={item.question}
							answer={item.answer}
							icon={item.icon}
							isOpen={openIndex === idx}
							onToggle={() => handleToggle(idx)}
						/>
					))}
				</div>
			</div>
		</section>
	)
})

export default FAQ
