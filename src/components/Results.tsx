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
	const [imageError, setImageError] = useState(false)

	useEffect(() => {
		async function getImg() {
			const data = await fetchRecipeImage(meal)
			if (data) setImageUrl(data.url)
		}
		getImg()
	}, [meal])

	const fallbackSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'%3E%3Crect fill='%23f3f4f6' width='56' height='56'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-size='28' font-family='Arial'%3E${getMealTypeIcon(mealType)}%3C/text%3E%3C/svg%3E`

	return (
		<div
			className="group bg-white border border-gray-200 rounded-xl p-3 cursor-pointer flex flex-row items-center gap-3 hover:shadow-md hover:border-purple-200 hover:-translate-y-0.5 transition-all duration-200"
			onClick={() => onNavigate(dayIndex, mealType, meal)}
			style={{ height: '80px' }}
		>
			{/* Image: 56x56px square on the left */}
			<img
				src={imageError ? fallbackSvg : imageUrl || `https://source.unsplash.com/60x60/?${encodeURIComponent(meal.title)},food`}
				alt={meal.title}
				className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
				onError={() => setImageError(true)}
			/>

			{/* Content wrapper */}
			<div className="flex-1 min-w-0 flex flex-col">
				{/* Row 1: Badge and Calorie count */}
				<div className="flex items-center justify-between mb-1">
					<span className={`px-2 py-0.5 text-xs font-bold ${getMealTypeColor(mealType)}`}>
						{mealType}
					</span>
					<span className="text-sm font-semibold text-gray-900">
						{meal.nutrition?.calories || 0} kcal
					</span>
				</div>

				{/* Row 2: Meal title */}
				<h3 className="text-base font-semibold text-gray-900 line-clamp-1 group-hover:text-purple-600 transition-colors mb-1">
					{meal.title}
				</h3>

				{/* Row 3: Nutrition + Arrow */}
				<div className="flex items-center justify-between">
					<span className="text-xs text-gray-600">
						P:{meal.nutrition?.protein || 0} C:{meal.nutrition?.carbs || 0} F:{meal.nutrition?.fat || 0}
					</span>
					<ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
				</div>
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
		<div className="flex flex-col space-y-3 w-full bg-gray-50/30 p-4 md:p-5 rounded-3xl border border-gray-100/50 border-b border-gray-200">
			<h2 className="text-xl font-black text-gray-900 mb-1 px-1 tracking-tight w-8 h-8">
				{day.day}
			</h2>

			{/* Meal Cards - Full width, stacked vertically */}
			<div className="space-y-2 w-full">
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
				<div className="grid md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
					{days.map((d, index) => (
						<DayCard key={d.day} day={d} index={index} onNavigate={handleNavigate} />
					))}
				</div>
			</div>
		</div>
	)
}))

export default Results
