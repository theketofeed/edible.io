import { memo, useState, useCallback } from 'react'

interface FAQItem {
	question: string
	answer: string
}

const FAQ_ITEMS: FAQItem[] = [
	{
		question: 'What stores do you support?',
		answer: 'Edible works with any grocery receipt format. Our OCR technology reads text from supermarkets, farmers markets, specialty stores, and delivery apps. Just take a clear photo!'
	},
	{
		question: 'Can I edit the meal plan?',
		answer: 'Yes! You can swap meals, adjust portion sizes, and customize recipes. You can also regenerate plans with different diet preferences to get new recommendations.'
	},
	{
		question: 'How many diets do you support?',
		answer: 'We support 8 dietary preferences: Balanced, Keto, Vegan, Vegetarian, Paleo, Low-Carb, High-Protein, and Mediterranean. Mix and match to find what works for you.'
	},
	{
		question: 'Is this really free?',
		answer: 'Yes! Edible is completely free. Generate unlimited meal plans, save recipes, and export PDFs. No credit card required, no ads, no hidden fees.'
	},
	{
		question: 'What if I don\'t like a recipe?',
		answer: 'Simply regenerate your meal plan and you\'ll get different recipes. You can also click on individual recipes to see alternatives or manually adjust your plan.'
	},
	{
		question: 'How accurate is the OCR?',
		answer: 'Our OCR captures 95%+ of items from clear receipts. For best results, use good lighting and avoid shadows. You can always manually add or remove items if needed.'
	}
]

const FAQItem = memo(function FAQItem({
	question,
	answer,
	isOpen,
	onToggle
}: {
	question: string
	answer: string
	isOpen: boolean
	onToggle: () => void
}) {
	return (
		<div className="border border-gray-200 rounded-lg overflow-hidden hover:border-purple-200 transition-colors duration-200">
			<button
				onClick={onToggle}
				className="w-full px-6 py-4 md:py-5 text-left bg-white hover:bg-purple-50 transition-colors duration-200 flex items-center justify-between"
			>
				<h3 className="font-semibold text-gray-900 text-sm md:text-base pr-4">
					{question}
				</h3>
				<span className={`text-purple-600 font-bold text-xl flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
					▼
				</span>
			</button>

			{isOpen && (
				<div className="px-6 py-4 md:py-5 bg-purple-50 border-t border-gray-200">
					<p className="text-gray-700 text-sm md:text-base leading-relaxed">
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
		<section className="py-20 md:py-24 bg-purple-50">
			<div className="max-w-3xl mx-auto px-4">
				{/* Section Header */}
				<div className="text-center mb-12">
					<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
						Frequently Asked Questions
					</h2>
				</div>

				{/* FAQ Items */}
				<div className="space-y-3">
					{FAQ_ITEMS.map((item, idx) => (
						<FAQItem
							key={idx}
							question={item.question}
							answer={item.answer}
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
