import { forwardRef, memo, useMemo, useEffect, useState, useCallback } from 'react'
import { Copy, Download, RefreshCw, ChevronRight, X, Bookmark, Check, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { MealPlanResult, DayMeals, Meal } from '../utils/types'
import { fetchMealImage } from '../lib/unsplashApi'
import { useAuth } from '../context/AuthContext'
import { saveMealPlan } from '../lib/db'
import logo from '../assets/Transparent logo.png'

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
	onNavigate,
	isLast
}: {
	day: DayMeals;
	index: number;
	onNavigate: (dayIndex: number, mealType: string, meal: Meal) => void;
	isLast?: boolean;
}) {
	return (
		<div className="relative w-full">
			{/* Timeline Connector Line */}
			{!isLast && (
				<div className="absolute left-[26px] top-20 bottom-[-40px] w-0.5 bg-gray-100 hidden md:block" />
			)}

			<div className="flex flex-col md:flex-row gap-6 items-start">
				{/* Day Indicator - Desktop */}
				<div className="hidden md:flex flex-col items-center pt-2">
					<div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 flex flex-col items-center justify-center">
						<span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Day</span>
						<span className="text-xl font-black text-gray-900 leading-none">{index + 1}</span>
					</div>
				</div>

				{/* Card Content */}
				<div className="flex-1 flex flex-col space-y-5 w-full bg-white p-6 md:p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-gray-100/50 hover:shadow-[0_12px_45px_rgba(0,0,0,0.05)] transition-all duration-500">
					<div className="flex items-center justify-between">
						<h2 className="text-[20px] font-black text-gray-900 tracking-tight">
							{day.day}
						</h2>
						{/* Daily Meta (Optional) */}
						<div className="text-[11px] font-bold text-purple-400 uppercase tracking-widest hidden sm:block">
							Structured Plan
						</div>
					</div>

					{/* Meal Cards - Full width, stacked vertically */}
					<div className="space-y-3 w-full">
						<MealCard meal={day.Breakfast} mealType="Breakfast" dayIndex={index} onNavigate={onNavigate} />
						<MealCard meal={day.Lunch} mealType="Lunch" dayIndex={index} onNavigate={onNavigate} />
						<MealCard meal={day.Dinner} mealType="Dinner" dayIndex={index} onNavigate={onNavigate} />
					</div>
				</div>
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

				@media print {
					.no-print { display: none !important; }
					.print-only { display: block !important; }
					.screen-only { display: none !important; }
					
					body { background: white !important; padding: 0 !important; margin: 0 !important; }
					.print-content { width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
					
					/* Force single column for print */
					.grid { display: block !important; }
					.grid > div { 
						margin-bottom: 2rem !important; 
						page-break-inside: avoid !important;
						border: 1px solid #eee !important;
						box-shadow: none !important;
						width: 100% !important;
					}
					
					/* Typography for print */
					h1 { color: #1a0533 !important; }
					.text-gray-400 { color: #666 !important; }
					
					/* Force backgrounds to print */
					* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
				}
				
				/* Force 1-column layout for PDF export specifically */
				.pdf-export-mode .grid-layout-vertical {
					display: flex !important;
					flex-direction: column !important;
					gap: 3rem !important;
				}
				.pdf-export-mode .grid-layout-vertical > div {
					width: 100% !important;
					max-width: 100% !important;
				}

				.print-only { display: none; }
			`}</style>
			<div className="screen-only mb-10">
				<h1 className="text-3xl md:text-4xl font-bold mb-3 text-center text-gray-900 tracking-tight">
					{title}
				</h1>
				<p className="text-gray-400 text-[13px] font-bold text-center mb-8 uppercase tracking-widest leading-none">Grounded in {result.sourceItems.length} grocery items</p>

				<div className="flex items-center justify-center gap-4 no-print flex-wrap">
					<motion.button 
						whileHover={{ y: -2, scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						transition={{ duration: 0.1 }}
						className="h-12 px-6 rounded-2xl bg-white/40 backdrop-blur-md text-gray-700 text-[14px] font-bold border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:bg-white/60 transition-all flex items-center" 
						onClick={onCopy}
					>
						<div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center mr-3 border border-gray-100/50">
							<Copy className="w-4 h-4 text-gray-500" />
						</div>
						Copy Text
					</motion.button>

					<motion.button 
						whileHover={{ y: -2, scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						transition={{ duration: 0.1 }}
						className="h-12 px-6 rounded-2xl bg-white/40 backdrop-blur-md text-gray-700 text-[14px] font-bold border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:bg-white/60 transition-all flex items-center" 
						onClick={onDownload}
					>
						<div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center mr-3 border border-purple-100/50">
							<Download className="w-4 h-4 text-purple-500" />
						</div>
						Export PDF
					</motion.button>

					<motion.button 
						whileHover={{ y: -2, scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						transition={{ duration: 0.1 }}
						className="h-12 px-7 rounded-2xl bg-gradient-to-br from-[#D9C4FF] to-[#C6A0F6] text-gray-900 text-[14px] font-extrabold shadow-[0_10px_25px_rgba(198,160,246,0.35)] hover:shadow-[0_15px_35px_rgba(198,160,246,0.45)] transition-all flex items-center" 
						onClick={onRegenerate}
					>
						<RefreshCw className="w-4 h-4 mr-2.5 text-gray-900/70" />
						Regenerate
					</motion.button>

					<motion.button 
						whileHover={{ y: -2, scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						transition={{ duration: 0.1 }}
						className={`h-12 px-7 rounded-2xl text-[14px] font-extrabold flex items-center shadow-[0_12px_30px_rgba(0,0,0,0.15)] transition-all duration-300 ${
							saved 
								? 'bg-emerald-500 text-white save-btn-saved' 
								: 'bg-neutral-900 text-white hover:bg-black'
						}`}
						onClick={handleSavePlanClick}
						disabled={saved}
					>
						{saved ? (
							<>
								<Bookmark className="w-5 h-5 mr-2.5" fill="white" strokeWidth={3} />
								Plan Saved
							</>
						) : (
							<>
								<Bookmark className="w-5 h-5 mr-2.5 text-purple-300" fill="none" strokeWidth={2.2} />
								Save to Account
							</>
						)}
					</motion.button>
				</div>
			</div>

			<div ref={ref} className="w-full print-content">
				<div className="print-only text-center mb-12">
					<div className="inline-flex items-center gap-2 mb-4">
						<img src={logo} alt="Edible.io" className="w-10 h-10 object-contain" />
						<h1 className="text-4xl font-black text-gray-900 tracking-tight">
							Edible<span className="text-[#C6A0F6]">.io</span>
						</h1>
					</div>
					<h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
					<p className="text-sm text-gray-500 font-medium">Personalized Meal Plan • Grounded in {result.sourceItems.length} grocery items</p>
					<div className="w-24 h-1.5 bg-[#C6A0F6]/30 mx-auto mt-6 rounded-full" />
				</div>

				{/* Days Vertical Flow */}
				<div className="flex flex-col gap-10 md:gap-14 w-full max-w-4xl mx-auto grid-layout-vertical">
					{days.map((d, index) => (
						<DayCard 
							key={d.day} 
							day={d} 
							index={index} 
							onNavigate={handleNavigate} 
							isLast={index === days.length - 1} 
						/>
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
