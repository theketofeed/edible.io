import { forwardRef } from 'react'
import { Clock, ChefHat, Timer } from 'lucide-react'
import type { Meal } from '../utils/types'

interface RecipePDFTemplateProps {
	meal: Meal
	dayName: string
	mealType: string
	imageSrc?: string | null
	canSeeChefTips: boolean
}

const RecipePDFTemplate = forwardRef<HTMLDivElement, RecipePDFTemplateProps>(
	function RecipePDFTemplate({ meal, dayName, mealType, imageSrc, canSeeChefTips }, ref) {
		const safeMeal = {
			...meal,
			title: meal.title || 'Untitled Recipe',
			ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
			instructions: Array.isArray(meal.instructions) ? meal.instructions : [meal.instructions || 'No instructions provided.'],
			prepTime: meal.prepTime || 0,
			cookTime: meal.cookTime || 0,
			totalTime: meal.totalTime || (meal.prepTime || 0) + (meal.cookTime || 0)
		}

		return (
			<div ref={ref} className="pdf-only pdf-export-container p-12 bg-white text-gray-900 w-[800px]">
				{/* Section 1: Header + Title + Image + Times + Ingredients */}
				<section className="pdf-section pdf-section-first">
					<div className="flex items-end justify-between border-b-2 border-purple-100 pb-6 mb-8 w-full">
						<div>
							<h2 className="text-2xl font-black tracking-tight leading-none flex whitespace-nowrap items-baseline">Edible</h2>
							<p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Personalized AI Chef</p>
						</div>
						<div className="text-right">
							<p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{dayName}</p>
							<p className="text-sm font-black text-purple-600 uppercase tracking-tight">{mealType}</p>
						</div>
					</div>

					<h1 className="text-4xl font-black text-gray-900 mb-8 leading-tight tracking-tight pdf-word-wrap">
						{safeMeal.title}
					</h1>

					{imageSrc && (
						<div className="pdf-hero mb-8 rounded-[2rem] overflow-hidden h-[260px] border border-gray-100 shadow-sm pdf-avoid-break">
							<img src={imageSrc} alt={safeMeal.title} className="w-full h-full object-cover" />
						</div>
					)}

					<div className="mb-10 pdf-avoid-break">
						<div className="flex gap-8 mb-10 pb-8 border-b border-gray-50">
							<div className="flex items-center gap-3">
								<Clock className="w-5 h-5 text-orange-500" />
								<div>
									<p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Prep</p>
									<p className="text-sm font-bold">{safeMeal.prepTime} min</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<ChefHat className="w-5 h-5 text-emerald-500" />
								<div>
									<p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Cook</p>
									<p className="text-sm font-bold">{safeMeal.cookTime} min</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<Timer className="w-5 h-5 text-purple-600" />
								<div>
									<p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
									<p className="text-sm font-bold">{safeMeal.totalTime} min</p>
								</div>
							</div>
						</div>
					</div>

					<div className="pdf-avoid-break">
						<h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
							<div className="w-1 h-6 bg-purple-500 rounded-full"></div>
							Ingredients
						</h2>
						<ul className="space-y-3">
							{safeMeal.ingredients.map((ing, i) => (
								<li key={i} className="flex gap-4 items-center py-2 border-b border-gray-50 pdf-avoid-break">
									<div className="w-1.5 h-1.5 rounded-full bg-purple-200"></div>
									<span className="text-gray-700 font-medium pdf-word-wrap">{ing}</span>
								</li>
							))}
						</ul>
					</div>
				</section>

				{/* Section 2: Instructions */}
				<section className="pdf-section pdf-page-break pt-8">
					<h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
						<div className="w-1 h-6 bg-purple-500 rounded-full"></div>
						Instructions
					</h2>
					<div className="space-y-6">
						{safeMeal.instructions.map((step, i) => (
							<div key={i} className="flex gap-5 pdf-avoid-break">
								<div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 font-black text-sm flex-shrink-0">
									{i + 1}
								</div>
								<p className="text-gray-700 leading-relaxed font-medium pt-1 pdf-word-wrap">
									{step}
								</p>
							</div>
						))}
					</div>
				</section>

				{/* Section 3: Chef Tips (optional) */}
				{canSeeChefTips && safeMeal.tips && safeMeal.tips.length > 0 && (
					<section className="pdf-section pdf-page-break pt-8">
						<h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
							<div className="w-1 h-6 bg-purple-500 rounded-full"></div>
							Chef Tips
						</h2>
						<div className="space-y-4">
							{safeMeal.tips.map((tip, i) => (
								<div key={i} className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100/50 italic text-gray-700 font-medium pdf-avoid-break pdf-word-wrap">
									"{tip}"
								</div>
							))}
						</div>
					</section>
				)}

				{/* Section 4: Nutrition */}
				{safeMeal.nutrition && (
					<section className="pdf-section pdf-page-break pt-8">
						<h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
							<div className="w-1 h-6 bg-purple-500 rounded-full"></div>
							Nutrition Guide (per serving)
						</h2>
						<div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 mb-10 w-full box-border">
							<div className="divide-y divide-gray-100">
								{[
									{ label: 'Calories', value: `${safeMeal.nutrition.calories}kcal` },
									{ label: 'Protein', value: `${safeMeal.nutrition.protein}g` },
									{ label: 'Carbohydrates', value: `${safeMeal.nutrition.carbs}g` },
									{ label: 'Fat', value: `${safeMeal.nutrition.fat}g` },
									...(safeMeal.nutrition.fiber !== undefined ? [{ label: 'Dietary Fibre', value: `${safeMeal.nutrition.fiber}g` }] : []),
									...(safeMeal.nutrition.sugars !== undefined ? [{ label: 'Sugars', value: `${safeMeal.nutrition.sugars}g` }] : []),
									...(safeMeal.nutrition.sodium !== undefined ? [{ label: 'Sodium', value: `${safeMeal.nutrition.sodium}mg` }] : []),
								].map((row, i) => (
									<div key={i} className="flex items-center justify-between py-5 px-1 border-b border-gray-100 last:border-b-0">
										<span className="text-gray-600 font-medium text-[15px]">{row.label}</span>
										<span className="text-gray-900 font-bold text-[15px]">{row.value}</span>
									</div>
								))}
							</div>
						</div>
					</section>
				)}

				{/* Footer */}
				<div className="mt-16 pt-8 border-t border-gray-100 text-center">
					<p className="text-sm text-gray-400 font-medium italic">
						Made with love by Edible. Your Personal AI Chef
					</p>
				</div>
			</div>
		)
	}
)

export default RecipePDFTemplate