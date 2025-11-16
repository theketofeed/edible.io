import { useCallback, useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import UploadArea from './components/UploadArea'
import DietSelector from './components/DietSelector'
import Loading from './components/Loading'
import Results from './components/Results'
import { generateMealPlan } from './lib/mealPlanGenerator'
import type { DietType, MealPlanResult } from './utils/types'
import { useReactToPrint } from 'react-to-print'
import html2pdf from 'html2pdf.js/dist/include/html2pdf.es.js'
import ToastContainer, { ToastKind, ToastMessage } from './components/Toast'

export default function App() {
	const [diet, setDiet] = useState<DietType>('Balanced')
	const [groceryItems, setGroceryItems] = useState<string[]>([])
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
			const plan = await generateMealPlan({ items: groceryItems, diet, sourceText })
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
	}, [diet, groceryItems, showToast, sourceText])

	const handleRegenerate = useCallback(() => {
		if (!canGenerate) return
		void handleGenerate()
	}, [canGenerate, handleGenerate])

	const handleCopy = useCallback(async () => {
		if (!result) return
		const text = result.days.map(d =>
			`${d.day}\n- Breakfast: ${d.Breakfast}\n- Lunch: ${d.Lunch}\n- Dinner: ${d.Dinner}`
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
		<div className="min-h-full">
			<ToastContainer toasts={toasts} onDismiss={dismissToast} />
			<div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
				<Header />

				<div className="card p-5 md:p-6 mb-6">
					<div className="grid gap-6">
						<UploadArea onItemsDetected={onItemsDetected} onError={onItemError} disabled={isLoading} />

						<div className="grid gap-2">
							<label className="text-sm font-semibold text-black/80">Select diet:</label>
							<DietSelector value={diet} onChange={setDiet} disabled={isLoading} />
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
	)
}


