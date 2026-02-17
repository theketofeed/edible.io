import { forwardRef, memo, useMemo, useEffect, useState } from 'react'
import { Copy, Download, RefreshCw, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { MealPlanResult, DayMeals, Meal } from '../utils/types'
import { fetchRecipeImage } from '../lib/unsplashApi'

interface Props {
	result: MealPlanResult
	onCopy: () => void
	onDownload: () => void
	onRegenerate: () => void
}

// Helper to get high-quality placeholder images from Unsplash
function getMealPlaceholder(mealType: string): string {
	const placeholders: Record<string, string> = {
		Breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=200&h=200&fit=crop',
		Lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop',
		Dinner: 'https://images.unsplash.com/photo-1546093610-5f52e8aa3efc?w=200&h=200&fit=crop'
	}
	return placeholders[mealType] || placeholders.Dinner
}

function getMealTypeColor(mealType: string): string {
	const colors = {
		Breakfast: 'bg-orange-100 text-orange-700 border border-orange-200',
		Lunch: 'bg-green-100 text-green-700 border border-green-200',
		Dinner: 'bg-purple-100 text-purple-700 border border-purple-200'
	}
	return colors[mealType as keyof typeof colors] || 'bg-gray-100 text-gray-700'
}

function getMealTypeIcon(mealType: string): string {
	const icons = {
		Breakfast: '🍳',
		Lunch: '🥗',
		Dinner: '🍽️'
	}
	return icons[mealType as keyof typeof icons] || '🍴'
}

const NutritionBadges = memo(function NutritionBadges({ nutrition }: {
	nutrition: {
		calories: number;
		protein: number;
		carbs: number;
		fat: number;
	}
}) {
	return (
		<div className="flex flex-wrap gap-2 mt-2">
			<span className="bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-medium">
				{nutrition.calories} kcal
			</span>
			<span className="bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-medium">
				{nutrition.carbs} C
			</span>
			<span className="bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-medium">
				{nutrition.protein} P
			</span>
			<span className="bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-medium">
				{nutrition.fat} F
			</span>
		</div>
	)
})

const MealCard = memo(function MealCard({
	meal,
	mealType,
	dayIndex,
	onNavigate
}: {
	meal: Meal;
	mealType: string;
	dayIndex: number;
	onNavigate: (dayIndex: number, mealType: string, meal: Meal) => void
}) {
	const [imageUrl, setImageUrl] = useState<string | null>(null)

	useEffect(() => {
		async function getImg() {
			const data = await fetchRecipeImage(meal)
			if (data) setImageUrl(data.url)
		}
		getImg()
	}, [meal])

	return (
		<div
			className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col gap-3 w-full hover:scale-102"
			onClick={() => onNavigate(dayIndex, mealType, meal)}
		>
			{/* Top section: Image and meal type badge */}
			<div className="flex items-start gap-3">
				{/* Food Image - Smaller */}
				<div className="flex-shrink-0">
					<img
						src={imageUrl || getMealPlaceholder(mealType)}
						alt={meal.title}
						className="w-14 h-14 rounded-full object-cover shadow-sm"
					/>
				</div>

				{/* Meal Type Badge */}
				<div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold uppercase mt-0.5 ${getMealTypeColor(mealType)} flex-shrink-0`}>
					<span>{getMealTypeIcon(mealType)}</span>
					<span>{mealType}</span>
				</div>
			</div>

			{/* Meal Title - Allow text wrap */}
			<div className="flex-1">
				<h3 className="font-bold text-sm text-gray-900 mb-2 leading-snug">
					{meal.title}
				</h3>

				{/* Nutrition Badges - Compact, wrapping layout */}
				<div className="flex flex-wrap gap-1">
					<span className="bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap">
						{meal.nutrition?.calories || 0}cal
					</span>
					<span className="bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap">
						P:{meal.nutrition?.protein || 0}
					</span>
					<span className="bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap">
						C:{meal.nutrition?.carbs || 0}
					</span>
					<span className="bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap">
						F:{meal.nutrition?.fat || 0}
					</span>
				</div>
			</div>

			{/* Click indicator at bottom */}
			<div className="flex justify-end pt-1 border-t border-gray-100">
				<ChevronRight className="w-4 h-4 text-gray-300" />
			</div>
		</div>
	)
})

// Memoized day card to prevent re-rendering of unchanged days
const DayCard = memo(function DayCard({
	day,
	index,
	onNavigate
}: {
	day: DayMeals;
	index: number;
	onNavigate: (dayIndex: number, mealType: string, meal: Meal) => void
}) {
	return (
		<div className="flex flex-col space-y-4 w-full bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
			<h2 className="text-2xl font-bold text-gray-800 mb-2 px-1">
				{day.day}
			</h2>

			{/* Meal Cards - Full width, stacked vertically */}
			<div className="space-y-4 w-full">
				<MealCard meal={day.Breakfast} mealType="Breakfast" dayIndex={index} onNavigate={onNavigate} />
				<MealCard meal={day.Lunch} mealType="Lunch" dayIndex={index} onNavigate={onNavigate} />
				<MealCard meal={day.Dinner} mealType="Dinner" dayIndex={index} onNavigate={onNavigate} />
			</div>
		</div>
	)
})

const Results = memo(forwardRef<HTMLDivElement, Props>(function Results({ result, onCopy, onDownload, onRegenerate }, ref) {
	const navigate = useNavigate()

	const title = useMemo(() => `Your ${result.totalDays}-Day ${result.diet} Meal Plan`, [result.totalDays, result.diet])
	const days = useMemo(() => result.days, [result.days])

	const handleNavigate = (dayIndex: number, mealType: string, meal: Meal) => {
		navigate(`/recipe/${dayIndex}/${mealType}`, { state: { meal } })
	}

	return (
		<div className="w-full max-w-7xl mx-auto px-4 py-8 animate-fadeIn">
			<div className="screen-only mb-8">
				<h1 className="text-4xl font-black mb-4 text-center text-gray-900 tracking-tight">
					{title}
				</h1>
				<p className="text-gray-500 text-sm text-center mb-6">Grounded in {result.sourceItems.length} grocery items</p>

				<div className="flex items-center justify-center gap-2 no-print">
					<button className="btn border border-gray-300 bg-white hover:bg-gray-50 text-sm py-2 px-4 rounded-lg flex items-center shadow-sm transition-all" onClick={onCopy}>
						<Copy className="w-4 h-4 mr-2" />
						Copy Text
					</button>
					<button className="btn border border-gray-300 bg-white hover:bg-gray-50 text-sm py-2 px-4 rounded-lg flex items-center shadow-sm transition-all" onClick={onDownload}>
						<Download className="w-4 h-4 mr-2" />
						PDF
					</button>
					<button className="btn bg-purple-600 text-white hover:bg-purple-700 text-sm py-2 px-4 rounded-lg flex items-center shadow-md transition-all" onClick={onRegenerate}>
						<RefreshCw className="w-4 h-4 mr-2" />
						Regenerate
					</button>
				</div>
			</div>

			<div ref={ref} className="w-full print-content">
				<div className="print-only text-center mb-8">
					<h1 className="heading text-3xl font-bold text-purple-900">Edible.io</h1>
					<p className="text-xl font-semibold text-gray-800">{title}</p>
					<p className="text-sm text-gray-600">Generated from your uploaded grocery list</p>
				</div>

				{/* Days Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
					{days.map((d, index) => (
						<DayCard key={d.day} day={d} index={index} onNavigate={handleNavigate} />
					))}
				</div>
			</div>
		</div>
	)
}))

export default Results
