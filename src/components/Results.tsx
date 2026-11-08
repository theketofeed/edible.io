import { forwardRef, memo, useMemo, useState, useCallback } from 'react'
import { track, Events } from '../lib/analytics'
import { Download, RefreshCw, X, Bookmark, Check, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import type { MealPlanResult, Meal } from '../utils/types'
import { fetchMealImages, sessionCache, titleToKey } from '../lib/mealImages'
import { useAuth } from '../context/AuthContext'
import { usePlan } from '../hooks/usePlan'
import { saveMealPlan } from '../lib/db'
import logo from '../assets/favicon.png'
import BulkDownloadButton from './BulkDownloadButton'
import { DayCard } from './PlanDays'

interface Props {
	result: MealPlanResult
	onDownload: () => void
	onRegenerate: () => void
	setAuthOpen: (open: boolean) => void
	showToast: (type: 'success' | 'error' | 'info', message: string) => void
	onUpgradeRequired?: (trigger: string) => void
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
				{nutrition.carbs}g carbs
			</span>
			<span className="bg-gray-50 text-gray-500 rounded-full px-3 py-1 text-[11px] font-bold border border-gray-100/50">
				{nutrition.protein}g protein
			</span>
			<span className="bg-gray-50 text-gray-500 rounded-full px-3 py-1 text-[11px] font-bold border border-gray-100/50">
				{nutrition.fat}g fat
			</span>
		</div>
	)
})

const Results = memo(forwardRef<HTMLDivElement, Props>(function Results({ result, onDownload, onRegenerate, setAuthOpen, showToast, onUpgradeRequired }, ref) {
	const navigate = useNavigate()
	const location = useLocation()
	const { user } = useAuth()
	const { canExportPDF } = usePlan()
	const [showSaveModal, setShowSaveModal] = useState(false)
	const [savePlanTitle, setSavePlanTitle] = useState(`My ${result.diet} Plan`)
	const [isSaving, setIsSaving] = useState(false)
	const [saved, setSaved] = useState(false)

	const title = useMemo(() => `Your ${result.totalDays}-Day ${result.diet} Meal Plan`, [result.totalDays, result.diet])
	const days = useMemo(() => result.days, [result.days])

	const handleNavigate = (dayIndex: number, mealType: string, meal: Meal) => {
		navigate(`/recipe/${dayIndex}/${mealType}`, { state: { meal, from: location.pathname } })
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
			// Pre-fetch images for every meal so URLs are stored in plan_data
			const mealTitles: string[] = []
			for (const day of result.days) {
				if (day.Breakfast?.title) mealTitles.push(day.Breakfast.title)
				if (day.Lunch?.title) mealTitles.push(day.Lunch.title)
				if (day.Dinner?.title) mealTitles.push(day.Dinner.title)
			}
			await fetchMealImages(mealTitles)

			// Attach imageUrl to each meal before persisting
			const enriched = {
				...result,
				days: result.days.map(day => ({
					...day,
					Breakfast: day.Breakfast ? { ...day.Breakfast, imageUrl: sessionCache.get(titleToKey(day.Breakfast.title)) || undefined } : day.Breakfast,
					Lunch: day.Lunch ? { ...day.Lunch, imageUrl: sessionCache.get(titleToKey(day.Lunch.title)) || undefined } : day.Lunch,
					Dinner: day.Dinner ? { ...day.Dinner, imageUrl: sessionCache.get(titleToKey(day.Dinner.title)) || undefined } : day.Dinner,
				}))
			}

			await saveMealPlan(enriched, savePlanTitle.trim())
			showToast('success', 'Meal plan saved successfully!')
			track(Events.PLAN_SAVED, { diet: result.diet, days: result.totalDays })
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
				.meal-plan-pdf.pdf-export-mode .grid-layout-vertical {
					display: flex !important;
					flex-direction: column !important;
					gap: 3rem !important;
				}
				.meal-plan-pdf.pdf-export-mode .grid-layout-vertical > div {
					width: 100% !important;
					max-width: 100% !important;
				}

				.print-only { display: none; }
				.meal-plan-pdf.pdf-export-mode {
					width: 816px !important;
					max-width: 816px !important;
					margin: 0 auto !important;
					padding: 32px !important;
					box-sizing: border-box !important;
					background: white !important;
				}
				.meal-plan-pdf.pdf-export-mode .print-only { display: block !important; }
				.meal-plan-pdf.pdf-export-mode .no-print { display: none !important; }
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
					onClick={() => {
						if (!canExportPDF) {
							onUpgradeRequired?.('pdf_export')
							return
						}
						onDownload()
					}}
				>
					<div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center mr-3 border border-purple-100/50">
						<Download className="w-4 h-4 text-purple-500" />
					</div>
					Download Plan (PDF)
				</motion.button>

				<BulkDownloadButton result={result} showToast={showToast} onUpgradeRequired={onUpgradeRequired} />

				<motion.button 
					whileHover={!saved ? { y: -2, scale: 1.02 } : undefined}
					whileTap={!saved ? { scale: 0.98 } : undefined}
					transition={{ duration: 0.1 }}
					className={`h-12 px-7 rounded-2xl text-[14px] font-bold flex items-center transition-all ${
						saved 
							? 'bg-black text-white shadow-[0_8px_32px_rgba(0,0,0,0.2)]' 
							: 'bg-black/70 hover:bg-black text-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.16)] border border-black/50'
					} ${saved ? 'save-btn-saved' : ''}`}
					onClick={() => {
						if (!user) {
							onUpgradeRequired?.('save_plan')
							return
						}
						setShowSaveModal(true)
					}}
				>
					{saved ? (
						<>
							<Check className="w-5 h-5 mr-2.5" />
							Saved!
						</>
					) : user ? (
						<>
							<Bookmark className="w-5 h-5 mr-2.5" fill="currentColor" />
							Save to Account
						</>
					) : (
						<>
							<Bookmark className="w-5 h-5 mr-2.5" fill="none" strokeWidth={2.2} />
							Save to Account
						</>
					)}
				</motion.button>
				</div>
			</div>

			<div ref={ref} className="w-full print-content meal-plan-pdf">
				<div className="print-only text-center mb-12">
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
						<span style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
							<img src={logo} alt="" aria-hidden="true" style={{ display: 'block', width: 32, height: 32, objectFit: 'contain', transform: 'translateY(2px)' }} />
						</span>
						<h1 style={{ color: '#111827', fontSize: 36, fontWeight: 900, lineHeight: 1, margin: 0 }}>
							Edible
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

				<div className="no-print mt-10 flex justify-center">
					<motion.button
						whileHover={{ y: -2, scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						transition={{ duration: 0.1 }}
						className="h-12 px-7 rounded-2xl bg-gradient-to-br from-[#D9C4FF] to-[#C6A0F6] text-gray-900 text-[14px] font-extrabold shadow-[0_10px_25px_rgba(198,160,246,0.35)] hover:shadow-[0_15px_35px_rgba(198,160,246,0.45)] transition-all flex items-center"
						onClick={onRegenerate}
					>
						<RefreshCw className="w-4 h-4 mr-2.5 text-gray-900/70" />
						Regenerate this plan
					</motion.button>
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
