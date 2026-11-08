import { memo, useCallback, useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { DayMeals, Meal } from '../utils/types'
import { fetchMealImage, sessionCache, titleToKey } from '../lib/mealImages'
import MealImagePlaceholder from './MealImagePlaceholder'

function getMealTypeIcon(mealType: string): string {
	const icons = {
		Breakfast: '🍳',
		Lunch: '🥗',
		Dinner: '🍽️'
	}
	return icons[mealType as keyof typeof icons] || '🍴'
}

export const MealCard = memo(function MealCard({
	meal,
	mealType,
	dayIndex,
	onNavigate,
	preferMealImageUrl = false
}: {
	meal: Meal;
	mealType: string;
	dayIndex: number;
	onNavigate: (dayIndex: number, mealType: string, meal: Meal) => void;
	preferMealImageUrl?: boolean;
}) {
	const [imageUrl, setImageUrl] = useState<string | null>(preferMealImageUrl ? meal.imageUrl || null : null)
	const [imageError, setImageError] = useState(false)
	const [imageLoaded, setImageLoaded] = useState(false)

	useEffect(() => {
		let cancelled = false
		if (preferMealImageUrl && meal.imageUrl) {
			setImageUrl(meal.imageUrl)
			return () => { cancelled = true }
		}

		async function getImg() {
			try {
				const url = await fetchMealImage(meal.title)
				if (!cancelled) {
					if (url) {
						setImageUrl(url)
					} else {
						setImageError(true)
					}
				}
			} catch {
				if (!cancelled) setImageError(true)
			}
		}
		getImg()
		return () => { cancelled = true }
	}, [meal.title, meal.imageUrl, preferMealImageUrl])

	const handleImageError = useCallback(() => {
		sessionCache.delete(titleToKey(meal.title))
		setImageUrl(null)
		setImageError(true)
	}, [meal.title])

	function getRecipeEmoji(title: string): string {
		const t = title.toLowerCase()
		if (t.includes('salad')) return '🥗'
		if (t.includes('wrap') || t.includes('burrito')) return '🌯'
		if (t.includes('taco')) return '🌮'
		if (t.includes('sandwich') || t.includes('burger') || t.includes('sub')) return '🥪'
		if (t.includes('pasta') || t.includes('spaghetti') || t.includes('noodle')) return '🍝'
		if (t.includes('pizza')) return '🍕'
		if (t.includes('soup') || t.includes('stew') || t.includes('chili')) return '🍲'
		if (t.includes('rice') || t.includes('quinoa') || t.includes('grain')) return '🍚'
		if (t.includes('egg') || t.includes('omelet') || t.includes('scramble')) return '🍳'
		if (t.includes('pancake') || t.includes('waffle') || t.includes('french toast')) return '🥞'
		if (t.includes('toast') || t.includes('avocado toast')) return '🥑'
		if (t.includes('smoothie') || t.includes('shake')) return '🥤'
		if (t.includes('strawberry') || t.includes('berry')) return '🍓'
		if (t.includes('apple')) return '🍎'
		if (t.includes('banana')) return '🍌'
		if (t.includes('grape')) return '🍇'
		if (t.includes('orange')) return '🍊'
		if (t.includes('chicken') || t.includes('turkey') || t.includes('meat') || t.includes('beef')) return '🍗'
		if (t.includes('fish') || t.includes('salmon') || t.includes('tuna') || t.includes('shrimp')) return '🐟'
		if (t.includes('bean') || t.includes('lentil') || t.includes('black')) return '🫘'
		if (t.includes('potato') || t.includes('fries') || t.includes('sweet')) return '🍟'
		if (t.includes('bread') || t.includes('toast') || t.includes('bagel')) return '🍞'
		if (t.includes('tortilla')) return '🫓'
		if (t.includes('cheese')) return '🧀'
		if (t.includes('bacon') || t.includes('sausage')) return '🥓'
		if (t.includes('pancake') || t.includes('waffle')) return '🥞'
		if (t.includes('oatmeal') || t.includes('oats') || t.includes('cereal')) return '🥣'
		if (t.includes('fruit')) return '🍓'
		if (t.includes('cookie') || t.includes('brownie')) return '🍪'
		if (t.includes('muffin')) return '🧁'
		return getMealTypeIcon(mealType)
	}

	const fallbackSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'%3E%3Crect fill='%23f3f4f6' width='56' height='56' rx='10'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-size='26'%3E${getRecipeEmoji(meal.title)}%3C/text%3E%3C/svg%3E`

	const cal = meal.nutrition?.calories ?? 0
	const p = meal.nutrition?.protein ?? 0
	const c = meal.nutrition?.carbs ?? 0
	const f = meal.nutrition?.fat ?? 0

	return (
		<div
			className="group w-full cursor-pointer flex flex-row items-center gap-4 px-3.5 py-3.5 bg-white rounded-2xl border border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-300"
			role="button"
			tabIndex={0}
			onClick={() => onNavigate(dayIndex, mealType, meal)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()
					onNavigate(dayIndex, mealType, meal)
				}
			}}
		>
			<div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden relative bg-gray-50">
				{!imageLoaded && !imageError && (
					<div className="absolute inset-0 flex items-center justify-center">
						<MealImagePlaceholder mealType={mealType} />
					</div>
				)}
				{imageUrl && !imageError && (
					<img
						src={imageUrl}
						alt={meal.title}
						className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
						onLoad={() => setImageLoaded(true)}
						onError={handleImageError}
					/>
				)}
				{imageError && (
					<img src={fallbackSvg} alt={meal.title} className="w-full h-full object-cover" />
				)}
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-[14px] font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-purple-600 transition-colors">
					{meal.title}
				</p>
			</div>
			<ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 transition-colors flex-shrink-0" />
		</div>
	)
})

export const DayCard = memo(function DayCard({
	day,
	index,
	onNavigate,
	isLast,
	preferMealImageUrl = false
}: {
	day: DayMeals;
	index: number;
	onNavigate: (dayIndex: number, mealType: string, meal: Meal) => void;
	isLast?: boolean;
	preferMealImageUrl?: boolean;
}) {
	return (
		<div className="relative w-full">
			{!isLast && (
				<div className="absolute left-[26px] top-20 bottom-[-40px] w-0.5 bg-gray-100 hidden md:block" />
			)}
			<div className="flex flex-col md:flex-row gap-6 items-start">
				<div className="hidden md:flex flex-col items-center pt-2">
					<div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 flex flex-col items-center justify-center">
						<span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Day</span>
						<span className="text-xl font-black text-gray-900 leading-none">{index + 1}</span>
					</div>
				</div>
				<div className="flex-1 flex flex-col space-y-5 w-full">
					<div className="flex items-center justify-between">
						<h2 className="text-[20px] font-black text-gray-900 tracking-tight">
							{day.day}
						</h2>
						<div className="text-[11px] font-bold text-purple-400 uppercase tracking-widest hidden sm:block">
							Structured Plan
						</div>
					</div>
					<div className="space-y-4 w-full">
						<div className="flex flex-col gap-2">
							<p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#92400e' }}>Breakfast</p>
							<MealCard meal={day.Breakfast} mealType="Breakfast" dayIndex={index} onNavigate={onNavigate} preferMealImageUrl={preferMealImageUrl} />
						</div>
						{day.Lunch && (
							<div className="flex flex-col gap-2">
								<p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#065f46' }}>Lunch</p>
								<MealCard meal={day.Lunch} mealType="Lunch" dayIndex={index} onNavigate={onNavigate} preferMealImageUrl={preferMealImageUrl} />
							</div>
						)}
						{day.Dinner && (
							<div className="flex flex-col gap-2">
								<p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#5b21b6' }}>Dinner</p>
								<MealCard meal={day.Dinner} mealType="Dinner" dayIndex={index} onNavigate={onNavigate} preferMealImageUrl={preferMealImageUrl} />
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
})
