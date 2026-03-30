import { forwardRef, memo, useMemo, useEffect, useState, useCallback } from 'react'
import { Copy, Download, RefreshCw, ChevronRight, X, Bookmark, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { MealPlanResult, DayMeals, Meal } from '../utils/types'
import { fetchMealImage } from '../lib/unsplashApi'
import { useAuth } from '../context/AuthContext'
import { saveMealPlan } from '../lib/db'

interface Props {
	result: MealPlanResult
	onCopy: () => void
	onDownload: () => void
	onRegenerate: () => void
	setAuthOpen: (open: boolean) => void
	showToast: (type: 'success' | 'error' | 'info', message: string) => void
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

function getMealTypeGlass(mealType: string): string {
	const styles = {
		Breakfast: 'bg-amber-50/80 text-amber-700 border border-amber-200/60 backdrop-blur-sm',
		Lunch: 'bg-emerald-50/80 text-emerald-700 border border-emerald-200/60 backdrop-blur-sm',
		Dinner: 'bg-violet-50/80 text-violet-700 border border-violet-200/60 backdrop-blur-sm'
	}
	return styles[mealType as keyof typeof styles] || 'bg-gray-100/80 text-gray-600 border border-gray-200/60'
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
			<span className="bg-gray-50 text-gray-500 rounded-full px-3 py-1 text-[11px] font-bold border border-gray-100/50">
				{nutrition.calories} kcal
			</span>
			<span className="bg-gray-50 text-gray-500 rounded-full px-3 py-1 text-[11px] font-bold border border-gray-100/50">
				{nutrition.carbs} C
			</span>
			<span className="bg-gray-50 text-gray-500 rounded-full px-3 py-1 text-[11px] font-bold border border-gray-100/50">
				{nutrition.protein} P
			</span>
			<span className="bg-gray-50 text-gray-500 rounded-full px-3 py-1 text-[11px] font-bold border border-gray-100/50">
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
			const url = await fetchMealImage(meal.title)
			if (url) setImageUrl(url)
		}
		getImg()
	}, [meal.title])

	const fallbackSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'%3E%3Crect fill='%23f3f4f6' width='56' height='56' rx='10'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-size='26'%3E${getMealTypeIcon(mealType)}%3C/text%3E%3C/svg%3E`

	const cal = meal.nutrition?.calories ?? 0
	const p = meal.nutrition?.protein ?? 0
	const c = meal.nutrition?.carbs ?? 0
	const f = meal.nutrition?.fat ?? 0

	return (
		<div
			className="group bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.02)] border border-gray-50/50 cursor-pointer flex flex-row items-center gap-4 px-3.5 py-3.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300"
			onClick={() => onNavigate(dayIndex, mealType, meal)}
		>
			{/* Image */}
			<img
				src={imageError ? fallbackSvg : (imageUrl || fallbackSvg)}
				alt={meal.title}
				className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
				onError={() => setImageError(true)}
			/>

			{/* Content */}
			<div className="flex-1 min-w-0">
				{/* Title */}
				<p className="text-[15px] font-bold text-gray-900 leading-tight line-clamp-1 group-hover:text-purple-600 transition-colors mb-2">
					{meal.title}
				</p>

				{/* Badge — centered between title and macros */}
				<div className="mb-1.5">
					<span className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${getMealTypeGlass(mealType)}`}>
						{mealType}
					</span>
				</div>

				{/* Macros — all on one line */}
				<p className="text-[11px] text-gray-400 font-bold tracking-tight uppercase">
				<span className="text-gray-900">{cal}</span> kcal &nbsp;·&nbsp; <span className="text-gray-900">{c}</span> carbs &nbsp;·&nbsp; <span className="text-gray-900">{p}</span> protein
				</p>
			</div>

			{/* Arrow */}
			<ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 transition-colors flex-shrink-0" />
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
		<div className="flex flex-col space-y-4 w-full bg-white p-5 md:p-6 rounded-[2rem] shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-gray-50/50">
			<h2 className="text-[17px] font-bold text-gray-900 mb-1 tracking-tight whitespace-nowrap">
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

const Results = memo(forwardRef<HTMLDivElement, Props>(function Results({ result, onCopy, onDownload, onRegenerate, setAuthOpen, showToast }, ref) {
	const navigate = useNavigate()
	const { user } = useAuth()
	const [showSaveModal, setShowSaveModal] = useState(false)
	const [savePlanTitle, setSavePlanTitle] = useState(`My ${result.diet} Plan`)
	const [isSaving, setIsSaving] = useState(false)
	const [saved, setSaved] = useState(false)

	const title = useMemo(() => `Your ${result.totalDays}-Day ${result.diet} Meal Plan`, [result.totalDays, result.diet])
	const days = useMemo(() => result.days, [result.days])

	const handleNavigate = (dayIndex: number, mealType: string, meal: Meal) => {
		navigate(`/recipe/${dayIndex}/${mealType}`, { state: { meal } })
	}

	const handleSavePlanClick = useCallback(() => {
		if (!user) {
			setAuthOpen(true)
			return
		}
		setSavePlanTitle(`My ${result.diet} Plan`)
		setShowSaveModal(true)
	}, [user, result.diet, setAuthOpen])

	const handleSaveConfirm = useCallback(async () => {
		if (!user || !savePlanTitle.trim()) return

		setIsSaving(true)
		try {
			await saveMealPlan(result, savePlanTitle.trim())
			showToast('success', 'Meal plan saved successfully!')
			setShowSaveModal(false)
			setSaved(true)
			setTimeout(() => setSaved(false), 2500)
		} catch (error) {
			console.error('Failed to save meal plan:', error)
			showToast('error', 'Failed to save meal plan. Please try again.')
		} finally {
			setIsSaving(false)
		}
	}, [user, result, savePlanTitle, showToast])

	return (
		<div className="w-full max-w-7xl mx-auto px-4 py-8 animate-fadeIn">
			<style>{`
				@keyframes saveBookmarkPulse {
					0% { transform: scale(1); }
					30% { transform: scale(1.15); }
					60% { transform: scale(0.95); }
					100% { transform: scale(1); }
				}
				.save-btn-saved {
					animation: saveBookmarkPulse 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
				}
			`}</style>
			<div className="screen-only mb-10">
				<h1 className="text-3xl md:text-4xl font-bold mb-3 text-center text-gray-900 tracking-tight">
					{title}
				</h1>
				<p className="text-gray-400 text-[13px] font-bold text-center mb-8 uppercase tracking-widest leading-none">Grounded in {result.sourceItems.length} grocery items</p>

				<div className="flex items-center justify-center gap-3 no-print flex-wrap">
					<button className="h-11 px-5 rounded-full bg-white text-gray-600 text-[14px] font-bold border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all" onClick={onCopy}>
						<Copy className="w-4 h-4 mr-2" />
						Copy
					</button>
					<button className="h-11 px-5 rounded-full bg-white text-gray-600 text-[14px] font-bold border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all" onClick={onDownload}>
						<Download className="w-4 h-4 mr-2" />
						PDF
					</button>
					<button className="h-11 px-6 rounded-full bg-[#C6A0F6] text-gray-900 text-[14px] font-bold shadow-[0_4px_14px_rgba(198,160,246,0.3)] hover:shadow-[0_6px_20px_rgba(198,160,246,0.4)] hover:-translate-y-0.5 transition-all" onClick={onRegenerate}>
						<RefreshCw className="w-4 h-4 mr-2" />
						Regenerate
					</button>
					<button 
						className={`h-11 px-6 rounded-full text-[14px] font-bold flex items-center shadow-lg transition-all duration-300 hover:-translate-y-0.5 ${
							saved 
								? 'bg-emerald-500 text-white save-btn-saved' 
								: 'bg-black text-white hover:bg-gray-800'
						}`}
						onClick={handleSavePlanClick}
						disabled={saved}
					>
						{saved ? (
							<>
								<Check className="w-4 h-4 mr-2" strokeWidth={3} />
								Saved
							</>
						) : (
							<>
								<Bookmark className="w-4 h-4 mr-2" fill="none" />
								Save Plan
							</>
						)}
					</button>
				</div>
			</div>

			<div ref={ref} className="w-full print-content">
				<div className="print-only text-center mb-8">
					<h1 className="heading text-3xl font-bold text-purple-900">
						Edible<span style={{ color: '#C6A0F6' }}>.io</span>
					</h1>
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

			{/* Save Plan Modal */}
			{showSaveModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fadeIn">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-bold text-gray-900">Save Meal Plan</h2>
							<button
								onClick={() => setShowSaveModal(false)}
								className="text-gray-400 hover:text-gray-600 transition-colors"
								disabled={isSaving}
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="mb-6">
							<label className="block text-sm font-semibold text-gray-700 mb-2">Plan Title</label>
							<input
								type="text"
								value={savePlanTitle}
								onChange={(e) => setSavePlanTitle(e.target.value)}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
								placeholder="e.g., My Balanced Plan"
								disabled={isSaving}
							/>
						</div>

						<div className="flex gap-3">
							<button
								onClick={() => setShowSaveModal(false)}
								className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
								disabled={isSaving}
							>
								Cancel
							</button>
							<button
								onClick={handleSaveConfirm}
								disabled={isSaving || !savePlanTitle.trim()}
								className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:bg-emerald-400 disabled:cursor-not-allowed"
							>
								{isSaving ? 'Saving...' : 'Save'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}))

export default Results
