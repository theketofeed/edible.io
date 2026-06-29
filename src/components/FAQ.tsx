import { memo, useState, useCallback } from 'react'
import { Store, PencilLine, Salad, Banknote, RefreshCw, Sparkles } from 'lucide-react'

interface FAQItem {
	question: string
	answer: string
	icon: React.ReactNode
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Is Edible free?',
    answer: 'You get 1 free meal plan — no account needed. After that, start a 7-day free trial to keep generating plans. Cancel anytime, no questions asked.',
    icon: <Banknote className="w-5 h-5 text-purple-500" />
  },
  {
    question: 'What stores do you support?',
    answer: 'Any store, any format. Edible reads receipts from supermarkets, wholesale stores, farmers markets, and grocery delivery apps. As long as the photo is clear, it works.',
    icon: <Store className="w-5 h-5 text-purple-500" />
  },
  {
    question: 'Can I edit the meal plan?',
    answer: 'Yes — you can regenerate your plan with a different diet preference anytime, or tap into any recipe to see the full details. Your saved plans stay in your dashboard so you can switch between them whenever you want.',
    icon: <PencilLine className="w-5 h-5 text-purple-500" />
  },
  {
    question: 'How many diets do you support?',
    answer: 'Eight: Balanced, Keto, Vegan, Vegetarian, Paleo, Low-Carb, High-Protein, and Mediterranean. Pick one when you generate and Edible builds the whole week around it.',
    icon: <Salad className="w-5 h-5 text-purple-500" />
  },
  {
    question: "What if I don't like a recipe?",
    answer: "Regenerate your plan and you'll get a completely different set of meals. You can regenerate as many times as you want during your trial.",
    icon: <RefreshCw className="w-5 h-5 text-purple-500" />
  },
  {
    question: "What makes Edible different?",
    answer: 'Every other meal planner gives you recipes and tells you to go shopping. Edible works the other way — you start with what you already bought, and it builds your week around that. No food waste, no extra trips, meals you can actually make tonight.',
    icon: <Sparkles className="w-5 h-5 text-purple-500" />
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
		<div className="border border-gray-200 rounded-xl md:rounded-2xl overflow-hidden bg-white transition-all duration-200">
			<button
				onClick={onToggle}
				className="w-full px-4 md:px-5 py-3 md:py-4 text-left flex items-center gap-3 md:gap-4"
			>
				{/* Icon */}
				<div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
					{icon}
				</div>

				{/* Question */}
				<span className="flex-1 font-semibold text-gray-900 text-sm md:text-base">
					{question}
				</span>

				{/* Toggle */}
				<span className="text-xl md:text-2xl font-light text-gray-400 flex-shrink-0 leading-none">
					{isOpen ? '×' : '+'}
				</span>
			</button>

			{/* Answer */}
			{isOpen && (
				<div className="px-4 md:px-5 pb-4 md:pb-5 pt-1">
					<p className="ml-11 md:ml-14 text-gray-500 text-sm leading-relaxed">
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
		<section id="faq" className="py-12 md:py-20 lg:py-24 bg-purple-50">
			<div className="max-w-3xl mx-auto px-4">
				{/* Section Header */}
				<div className="text-center">
					<h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
						Frequently Asked Questions
					</h2>
					<p className="text-gray-500 text-center mb-8 md:mb-12 mt-2 md:mt-3 text-sm md:text-base">
						Everything you need to know about turning your groceries into great meals.
					</p>
				</div>

				{/* FAQ Rows */}
				<div className="space-y-2 md:space-y-3">
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
