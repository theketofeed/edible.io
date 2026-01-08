import { useCallback, useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import UploadArea from './components/UploadArea'
import DietSelector from './components/DietSelector'
import Loading from './components/Loading'
import Results from './components/Results'
import ErrorBoundary from './components/ErrorBoundary'
import { generateMealPlan } from './lib/mealPlanGenerator'
import type { DietType, MealPlanResult } from './utils/types'
import { useReactToPrint } from 'react-to-print'
import html2pdf from 'html2pdf.js/dist/include/html2pdf.es.js'
import ToastContainer, { ToastKind, ToastMessage } from './components/Toast'

export default function App() {
	const [diet, setDiet] = useState<DietType>('Balanced')
	const [groceryItems, setGroceryItems] = useState<string[]>([])
	const [planDaysSelection, setPlanDaysSelection] = useState<number | 'auto'>('auto')
	const [sourceText, setSourceText] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [result, setResult] = useState<MealPlanResult | null>(null)
	const printRef = useRef<HTMLDivElement | null>(null)
	const [toasts, setToasts] = useState<ToastMessage[]>([])

	const showToast = useCallback((type: ToastKind, message: string, autoClose = 4200) => {
		const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
		setToasts((prev) => [...prev, { id, type, message, autoClose }])
	}, [])

	const dismissToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id))
	}, [])

	const canGenerate = useMemo(() => groceryItems.length > 0, [groceryItems])

	// Automatic plan length based on grocery items count
	const autoPlanDays = useMemo(() => {
		const n = groceryItems.length
		if (n >= 26) return 7
		if (n >= 16) return 5
		if (n >= 10) return 3
		if (n > 0) return 2
		return 1
	}, [groceryItems])

	const effectivePlanDays = planDaysSelection === 'auto' ? autoPlanDays : planDaysSelection

	const onItemsDetected = useCallback((items: string[], rawText: string) => {
		setError(null)
		setGroceryItems(items)
		setSourceText(rawText)
		if (items.length) {
			showToast('success', `Great! Detected ${items.length} grocery items.`)
		}
	}, [showToast])

	const onItemError = useCallback((message: string) => {
		showToast('error', message)
		setGroceryItems([])
	}, [showToast])

	const handleGenerate = useCallback(async () => {
		if (!groceryItems.length) {
			const message = 'No grocery items found. Try a clearer photo.'
			setError(message)
			showToast('error', message)
			return
		}
		setError(null)
		setIsLoading(true)
		try {
			console.log('[App] Generating meal plan with days:', effectivePlanDays)
			const plan = await generateMealPlan({ items: groceryItems, diet, sourceText, days: effectivePlanDays })
			setResult(plan)
			// Only show info toast if we used fallback (no API key or API failed)
			const hasKey = !!import.meta.env.VITE_OPENAI_API_KEY
			if (!hasKey) {
				showToast('info', 'Add your OpenAI key in .env file for real AI plans (restart dev server after adding)')
			} else {
				showToast('success', 'Your meal plan is ready!')
			}
		} catch (e: any) {
			console.error('[App] generation error:', e)
			setError(e?.message || 'Failed to generate meal plan.')
			showToast('error', e?.message || 'Failed to generate meal plan.')
		} finally {
			setIsLoading(false)
		}
	}, [diet, groceryItems, showToast, sourceText, effectivePlanDays])

	const handleRegenerate = useCallback(() => {
		if (!canGenerate) return
		void handleGenerate()
	}, [canGenerate, handleGenerate])

	const handleCopy = useCallback(async () => {
		if (!result) return
		const text = result.days.map(d =>
			`${d.day}\n- Breakfast: ${d.Breakfast.title} (⏱️ Prep: ${d.Breakfast.prepTime} min | Cook: ${d.Breakfast.cookTime} min | Total: ${d.Breakfast.totalTime} min)\n- Lunch: ${d.Lunch.title} (⏱️ Prep: ${d.Lunch.prepTime} min | Cook: ${d.Lunch.cookTime} min | Total: ${d.Lunch.totalTime} min)\n- Dinner: ${d.Dinner.title} (⏱️ Prep: ${d.Dinner.prepTime} min | Cook: ${d.Dinner.cookTime} min | Total: ${d.Dinner.totalTime} min)`
		).join('\n\n')
		try {
			await navigator.clipboard.writeText(text)
			alert('Meal plan copied to clipboard.')
		} catch {
			alert('Could not copy to clipboard.')
		}
	}, [result])

	const handlePrint = useReactToPrint({
		content: () => printRef.current,
		documentTitle: result ? `Edible.io – Your ${result.totalDays}-Day ${result.diet} Meal Plan` : 'Edible.io-Meal-Plan',
		pageStyle: `
			@page {
				margin: 1in;
			}
			@media print {
				.no-print {
					display: none !important;
				}
				.print-only {
					display: block !important;
				}
			}
		`
	})

	const triggerDownload = useCallback(async () => {
		if (!printRef.current) {
			console.error('[Print] Ref is null')
			showToast('error', 'Content not ready for printing')
			return
		}

		const element = printRef.current
		const filename = 'edible-meal-plan.pdf'

		// We'll clone the print element and inject lightweight PDF-specific styles
		const clone = element.cloneNode(true) as HTMLElement
		// Inline styles for PDF readability
		const style = document.createElement('style')
		style.innerHTML = `
		  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
		  .card { box-shadow: none !important; border: none !important; page-break-inside: avoid; }
		  .print-only { display: block !important; }
		  .no-print { display: none !important; }
		  .heading { font-size: 18px; }
		  .card h3 { font-size: 14px; margin: 0 0 6px 0 }
		  .card ul { font-size: 12px }
		  /* Force page breaks between grid items when necessary */
		  .print-page-break { page-break-after: always; }
		`
		clone.prepend(style)

		// Wrap clone in a container so html2pdf picks up styles
		const wrapper = document.createElement('div')
		wrapper.style.padding = '0.5in'
		wrapper.appendChild(clone)

		const opt = {
			margin: 0.5,
			filename,
			image: { type: 'jpeg', quality: 0.98 },
			html2canvas: { scale: 2, useCORS: true },
			jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
			pagebreak: { mode: ['css', 'legacy'] }
		}

		try {
			// html2pdf expects an element; call from the wrapper
			await html2pdf().set(opt).from(wrapper).save()
			showToast('success', 'Downloaded meal plan PDF')
		} catch (err) {
			console.error('[PDF] html2pdf error:', err)
			showToast('error', 'Failed to generate PDF')
			// Fallback to print dialog
			try { handlePrint(); showToast('info', 'Opened print dialog — choose "Save as PDF" to export') } catch { /* ignore */ }
		}
	}, [handlePrint, showToast])

	return (
		<ErrorBoundary onError={(error) => {
			console.error('[App] Error boundary caught:', error)
			showToast('error', 'An unexpected error occurred. Please refresh and try again.')
		}}>
			<div className="min-h-full">
				<ToastContainer toasts={toasts} onDismiss={dismissToast} />
			<div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
				<Header />

				<div className="card p-5 md:p-6 mb-6">
					<div className="grid gap-6">
						<UploadArea onItemsDetected={onItemsDetected} onError={onItemError} disabled={isLoading} />

						<div className="grid gap-2">
							<label className="text-sm font-semibold text-black/80">Select diet:</label>
							<div className="flex items-center gap-3">
								<DietSelector value={diet} onChange={setDiet} disabled={isLoading} />
								<div>
									<label className="text-sm font-semibold text-black/80">Meal Plan Length</label>
									<select
										className="ml-2 border rounded px-2 py-1"
										value={planDaysSelection}
										onChange={(e) => {
											const v = e.target.value
											if (v === 'auto') setPlanDaysSelection('auto')
											else setPlanDaysSelection(Number(v))
										}}
									>
										<option value={'auto'}>Auto ({autoPlanDays} days)</option>
										<option value={3}>3 days</option>
										<option value={5}>5 days</option>
										<option value={7}>7 days</option>
									</select>
									<div className="text-xs text-black/60 mt-1">Based on {groceryItems.length} items, recommended {autoPlanDays} days</div>
								</div>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-3">
							<button
								className="btn btn-primary text-base"
								disabled={!canGenerate || isLoading}
								onClick={handleGenerate}
							>
								Generate Meal Plan
							</button>
							{!canGenerate && (
								<span className="text-sm text-black/60">Upload a file or paste text to enable</span>
							)}
						</div>
					</div>
				</div>

				{isLoading && (
					<div className="card p-6 mb-6">
						<Loading />
					</div>
				)}

				{error && (
					<div className="card p-4 border-red-200">
						<p className="text-sm text-red-700">{error}</p>
					</div>
				)}

				{result && !isLoading && (
					<div className="card p-5 md:p-6">
						<Results
							result={result}
							onCopy={handleCopy}
							onDownload={triggerDownload}
							onRegenerate={handleRegenerate}
							ref={printRef}
						/>
					</div>
				)}
			</div>
			</div>
		</ErrorBoundary>
	)
}
