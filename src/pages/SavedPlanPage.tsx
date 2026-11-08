import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, CheckCircle2, Loader2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Meal } from '../utils/types'
import { countMeals } from '../lib/planCover'
import { normalizeSavedPlan } from '../lib/savedPlan'
import { downloadPlanAsPDF } from '../utils/pdfHelper'
import { usePlan } from '../hooks/usePlan'
import BulkDownloadButton from '../components/BulkDownloadButton'
import { DayCard } from '../components/PlanDays'
import logo from '../assets/favicon.png'

type SavedPlan = { id: string; title: string; planData: unknown }
type ToastKind = 'success' | 'error' | 'info'

interface Props {
	plan: SavedPlan | undefined
	isLoading: boolean
	isActive: boolean
	onBack: () => void
	onActivate: (id: string) => Promise<void>
	onViewPlanner: () => void
	onUpgradeRequired: (trigger: string) => void
}

const DIET_COLORS: Record<string, string> = {
	Balanced: '#16a34a',
	Keto: '#b45309',
	Vegan: '#047857',
	'High-Protein': '#dc2626',
	Mediterranean: '#1d4ed8',
	Vegetarian: '#15803d',
	Paleo: '#c2410c'
}

export default function SavedPlanPage({
	plan,
	isLoading,
	isActive,
	onBack,
	onActivate,
	onViewPlanner,
	onUpgradeRequired
}: Props) {
	const navigate = useNavigate()
	const location = useLocation()
	const { canExportPDF } = usePlan()
	const printableRef = useRef<HTMLDivElement>(null)
	const [activationOpen, setActivationOpen] = useState(false)
	const [activatingLoading, setActivatingLoading] = useState(false)
	const [downloadingPDF, setDownloadingPDF] = useState(false)
	const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null)

	useEffect(() => {
		if (!toast) return
		const timer = window.setTimeout(() => setToast(null), 2600)
		return () => window.clearTimeout(timer)
	}, [toast])

	const showToast = (kind: ToastKind, message: string) => setToast({ kind, message })

	if (isLoading) {
		return (
			<div role="status" style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#6B7280', fontSize: 13 }}>
				<Loader2 size={18} className="animate-spin" style={{ color: '#C6A0F6' }} />
				Loading saved plans...
			</div>
		)
	}

	if (!plan) {
		return (
			<div style={{ padding: '56px 20px', textAlign: 'center', background: '#FFFFFF', border: '1px solid #EDE9E2', borderRadius: 18 }}>
				<p style={{ color: '#374151', fontWeight: 700, marginBottom: 16 }}>Plan not found</p>
				<button onClick={onBack} style={{ border: 0, borderRadius: 10, padding: '10px 16px', background: '#C6A0F6', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>
					<ArrowLeft size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
					Saved Plans
				</button>
			</div>
		)
	}

	const { title, result } = normalizeSavedPlan({ title: plan.title, plan_data: plan.planData })
	const dietColor = DIET_COLORS[result.diet] || '#16a34a'

	const handleOpenMeal = (dayIndex: number, mealType: string, meal: Meal) => {
		const returnTo = `${location.pathname}${location.search}`
		navigate(`/recipe/${dayIndex}/${mealType}`, {
			state: { meal, from: location.pathname, returnTo }
		})
	}

	const handleDownloadPDF = async () => {
		if (!canExportPDF) {
			onUpgradeRequired('pdf_export')
			return
		}
		if (!printableRef.current) return

		setDownloadingPDF(true)
		const filename = `${title.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').replace(/\s+/g, '-') || 'meal-plan'}.pdf`
		try {
			const downloaded = await downloadPlanAsPDF(printableRef.current, { filename, margin: 0.5 })
			showToast(downloaded ? 'success' : 'error', downloaded ? 'Downloaded PDF' : 'Failed to generate PDF')
		} finally {
			setDownloadingPDF(false)
		}
	}

	const handleActivate = async () => {
		setActivatingLoading(true)
		try {
			await onActivate(plan.id)
		} finally {
			setActivatingLoading(false)
			setActivationOpen(false)
		}
	}

	return (
		<div style={{ maxWidth: 860, margin: '0 auto' }}>
			<style>{`
				.saved-plan-print { width: 100%; max-width: 100%; margin: 0; padding: 0; background: transparent; }
				.saved-plan-print.pdf-export-mode { width: 816px !important; max-width: 816px !important; margin: 0 auto; padding: 32px !important; box-sizing: border-box; background: #fff !important; }
				.saved-plan-pdf-header { display: none; }
				.saved-plan-print.pdf-export-mode .saved-plan-pdf-header { display: block; }
				.saved-plan-print .grid-layout-vertical { width: 100%; max-width: 100%; }
				.saved-plan-print .grid-layout-vertical > div { width: 100%; max-width: 100%; }
				.saved-plan-print.pdf-export-mode .grid-layout-vertical { display: flex; flex-direction: column; gap: 3rem; }
				.saved-plan-print.pdf-export-mode .grid-layout-vertical > div { width: 100%; max-width: 100%; }
			`}</style>
			<header style={{ marginBottom: 22 }}>
				<button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid #EDE9E2', borderRadius: 10, padding: '8px 12px', background: '#FFFFFF', color: '#6B7280', fontWeight: 700, cursor: 'pointer', marginBottom: 18 }}>
					<ArrowLeft size={16} />
					Saved Plans
				</button>
				<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
					<h1 style={{ color: '#111827', fontSize: 25, fontWeight: 800, lineHeight: 1.2 }}>{title}</h1>
					{isActive && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 999, padding: '5px 10px', background: '#F3E8FF', color: '#7C3AED', fontSize: 11, fontWeight: 800 }}><CheckCircle2 size={13} />ACTIVE</span>}
				</div>
				<p style={{ marginTop: 7, color: '#6B7280', fontSize: 13 }}>
					<span style={{ color: dietColor, fontWeight: 700 }}>{result.totalDays}-day {result.diet} plan</span>
					{' · '}{countMeals(plan.planData)} meals
				</p>
				{result.sourceItems.length > 0 && (
					<p style={{ marginTop: 6, color: '#9CA3AF', fontSize: 12, fontWeight: 600 }}>
						Grounded in {result.sourceItems.length} grocery items
					</p>
				)}
			</header>

			<div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
				<BulkDownloadButton result={result} showToast={showToast} onUpgradeRequired={onUpgradeRequired} />
				{isActive ? (
					<>
						<span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '12px 18px', borderRadius: 14, background: '#111827', color: '#FFFFFF', fontSize: 13, fontWeight: 800 }}>
							<Check size={16} />Active plan
						</span>
						<button onClick={onViewPlanner} style={{ border: '1px solid #C6A0F6', borderRadius: 14, padding: '12px 18px', background: '#FFFFFF', color: '#7C3AED', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
							View in Meal Planner
						</button>
					</>
				) : (
					<button onClick={() => setActivationOpen(true)} style={{ border: 0, borderRadius: 14, padding: '12px 18px', background: 'linear-gradient(135deg, #D9C4FF, #C6A0F6)', color: '#111827', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
						Use this plan
					</button>
				)}
				<button onClick={handleDownloadPDF} disabled={downloadingPDF} style={{ border: '1px solid #EDE9E2', borderRadius: 14, padding: '12px 18px', background: '#FFFFFF', color: '#374151', fontSize: 13, fontWeight: 800, cursor: downloadingPDF ? 'wait' : 'pointer', opacity: downloadingPDF ? 0.7 : 1 }}>
					{downloadingPDF ? 'Preparing PDF...' : 'Download Plan (PDF)'}
				</button>
			</div>

			<div ref={printableRef} className="saved-plan-print meal-plan-pdf">
				<div className="saved-plan-pdf-header text-center mb-10">
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
						<span style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
							<img src={logo} alt="" aria-hidden="true" style={{ display: 'block', width: 32, height: 32, objectFit: 'contain', transform: 'translateY(2px)' }} />
						</span>
						<span style={{ color: '#111827', fontSize: 32, fontWeight: 900, lineHeight: 1 }}>Edible</span>
					</div>
					<h2 style={{ color: '#1F2937', fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>{title}</h2>
					{result.sourceItems.length > 0 && (
						<p style={{ color: '#6B7280', fontSize: 14, fontWeight: 500, margin: 0 }}>
							Personalized Meal Plan · Grounded in {result.sourceItems.length} grocery items
						</p>
					)}
				</div>
				<div className="flex flex-col gap-10 md:gap-14 w-full max-w-4xl mx-auto grid-layout-vertical">
					{result.days.map((day, index) => (
						<DayCard
							key={`${day.day}-${index}`}
							day={day}
							index={index}
							onNavigate={handleOpenMeal}
							isLast={index === result.days.length - 1}
							preferMealImageUrl
						/>
					))}
				</div>
			</div>

			{toast && (
				<div role="status" aria-live="polite" style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 2000, padding: '10px 18px', borderRadius: 999, background: toast.kind === 'error' ? '#B91C1C' : '#111827', color: '#FFFFFF', fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
					{toast.message}
				</div>
			)}

			{activationOpen && (
				<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={() => { if (!activatingLoading) setActivationOpen(false) }}>
					<div role="dialog" aria-modal="true" aria-labelledby="saved-plan-activation-title" style={{ background: '#FFFFFF', borderRadius: 24, padding: 32, maxWidth: 400, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', margin: '0 16px' }} onClick={event => event.stopPropagation()}>
						<h3 id="saved-plan-activation-title" style={{ fontSize: 22, fontWeight: 900, color: '#111827', marginBottom: 8 }}>Switch to this plan?</h3>
						<p style={{ color: '#6B7280', fontSize: 14.5, marginBottom: 24, lineHeight: 1.5 }}>Meal Planner will start showing this plan from today. Your current plan stays saved, so you can always switch back.</p>
						<div style={{ display: 'flex', gap: 12 }}>
							<button onClick={() => setActivationOpen(false)} disabled={activatingLoading} style={{ flex: 1, padding: '14px 0', borderRadius: 14, border: '1px solid #EDE9E2', background: '#FFFFFF', color: '#111827', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
							<button onClick={handleActivate} disabled={activatingLoading} style={{ flex: 1, padding: '14px 0', borderRadius: 14, border: 0, background: '#C6A0F6', color: '#FFFFFF', fontWeight: 700, cursor: activatingLoading ? 'not-allowed' : 'pointer', opacity: activatingLoading ? 0.7 : 1 }}>
								{activatingLoading ? 'Switching...' : 'Switch Plan'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
