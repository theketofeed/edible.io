import { useCallback, useMemo, useRef, useState } from 'react'
import { ArrowUp, AlertCircle, ArrowLeft } from 'lucide-react'
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom'
import Header from './components/Header'
import HeroSection from './components/HeroSection'
import UploadArea from './components/UploadArea'
import DietSelector from './components/DietSelector'
import Loading from './components/Loading'
import Results from './components/Results'
import RecipeDetail from './components/RecipeDetail'
import ErrorBoundary from './components/ErrorBoundary'
import HowItWorks from './components/HowItWorks'
import ComparisonSection from './components/ComparisonSection'
import Testimonials from './components/Testimonials'
import FinalCTA from './components/FinalCTA'
import FAQ from './components/FAQ'
import Footer from './components/Footer'
import { generateMealPlan } from './lib/mealPlanGenerator'
import type { DietType, MealPlanResult } from './utils/types'
import { useReactToPrint } from 'react-to-print'
import html2pdf from 'html2pdf.js/dist/include/html2pdf.es.js'
import ToastContainer, { ToastKind, ToastMessage } from './components/Toast'
import ReceiptConfirmation from './components/ReceiptConfirmation'
import { parseReceiptWithGemini, ParsedItem } from './services/receiptParser'

function MainContent() {
	const navigate = useNavigate()
	const location = useLocation()
	const [diet, setDiet] = useState<DietType>('Balanced')
	const [groceryItems, setGroceryItems] = useState<string[]>([])
	const [planDaysSelection, setPlanDaysSelection] = useState<number | 'auto'>('auto')
	const [sourceText, setSourceText] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [result, setResult] = useState<MealPlanResult | null>(null)
	const printRef = useRef<HTMLDivElement | null>(null)
	const [toasts, setToasts] = useState<ToastMessage[]>([])

	// Smart Parsing State
	const [isParsing, setIsParsing] = useState(false)
	const [showConfirmation, setShowConfirmation] = useState(false)
	const [parsedItems, setParsedItems] = useState<ParsedItem[]>([])

	const showToast = useCallback((type: ToastKind, message: string, autoClose = 4200) => {
		const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
		setToasts((prev) => [...prev, { id, type, message, autoClose }])
	}, [])

	const dismissToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id))
	}, [])

	const canGenerate = useMemo(() => groceryItems.length > 0, [groceryItems])

	const autoPlanDays = useMemo(() => {
		const n = groceryItems.length
		if (n >= 26) return 7
		if (n >= 16) return 5
		if (n >= 10) return 3
		if (n > 0) return 2
		return 1
	}, [groceryItems])

	const effectivePlanDays = planDaysSelection === 'auto' ? autoPlanDays : planDaysSelection

	const onItemsDetected = useCallback(async (items: string[], rawText: string) => {
		setError(null)
		setSourceText(rawText)
		setShowConfirmation(true)
		setIsParsing(true)

		try {
			const parsed = await parseReceiptWithGemini(rawText)
			if (parsed.length > 0) {
				setParsedItems(parsed)
			} else {
				setParsedItems(items.map((item, i) => ({
					id: `fallback-${i}`,
					original: item,
					name: item,
					quantity: '1',
					category: 'Uncategorized',
					confidence: 50
				})))
				showToast('info', 'AI parsing unavailable, using raw detection.')
			}
		} catch (err) {
			showToast('error', 'Failed to analyze receipt details.')
		} finally {
			setIsParsing(false)
		}
	}, [showToast])

	const handleConfirmItems = useCallback((confirmedItems: string[]) => {
		setGroceryItems(confirmedItems)
		setShowConfirmation(false)
		showToast('success', `Confirmed ${confirmedItems.length} items! Ready to generate.`)
	}, [showToast])

	const onItemError = useCallback((message: string) => {
		showToast('error', message)
		setGroceryItems([])
	}, [showToast])

	const handleGenerate = useCallback(async () => {
		if (!groceryItems.length) {
			setError('No grocery items found.')
			showToast('error', 'No grocery items found.')
			return
		}
		setError(null)
		setIsLoading(true)
		try {
			const plan = await generateMealPlan({ items: groceryItems, diet, sourceText, days: effectivePlanDays })
			setResult(plan)
			showToast('success', 'Your meal plan is ready!')
		} catch (e: any) {
			setError(e?.message || 'Failed to generate meal plan.')
			showToast('error', e?.message || 'Failed to generate meal plan.')
		} finally {
			setIsLoading(false)
		}
	}, [diet, groceryItems, showToast, sourceText, effectivePlanDays])

	const handleRegenerate = useCallback(() => {
		if (canGenerate) void handleGenerate()
	}, [canGenerate, handleGenerate])

	const handleCopy = useCallback(async () => {
		if (!result) return
		const text = result.days.map(d =>
			`${d.day}\n- Breakfast: ${d.Breakfast.title}\n- Lunch: ${d.Lunch.title}\n- Dinner: ${d.Dinner.title}`
		).join('\n\n')
		try {
			await navigator.clipboard.writeText(text)
			alert('Copied!')
		} catch {
			alert('Failed to copy.')
		}
	}, [result])

	const handlePrint = useReactToPrint({
		contentRef: printRef,
		documentTitle: 'Meal Plan'
	})

	const triggerDownload = useCallback(async () => {
		if (!printRef.current) return
		const opt = {
			margin: 0.5,
			filename: 'meal-plan.pdf',
			image: { type: 'jpeg', quality: 0.98 },
			html2canvas: { scale: 2 },
			jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
		}
		try {
			await html2pdf().set(opt).from(printRef.current).save()
			showToast('success', 'Downloaded PDF')
		} catch {
			showToast('error', 'Failed to generate PDF')
		}
	}, [showToast])

	const handleBackToEditor = () => {
		setResult(null)
		setGroceryItems([])
		setSourceText('')
		setError(null)
		navigate('/')
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	return (
		<div className="min-h-full flex flex-col">
			<ToastContainer toasts={toasts} onDismiss={dismissToast} />

			<ReceiptConfirmation
				isOpen={showConfirmation}
				isParsing={isParsing}
				parsedItems={parsedItems}
				onConfirm={handleConfirmItems}
				onCancel={() => setShowConfirmation(false)}
			/>

			<Header />

			<Routes>
				<Route path="/" element={
					<>
						{!result && (
							<div className="flex-1">
								<div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
									<HeroSection />
									<div id="upload-section" className="card p-5 md:p-8 mb-6">
										<div className="grid gap-8">
											<UploadArea onItemsDetected={onItemsDetected} onError={onItemError} disabled={isLoading} />
											<div className="border-t pt-8">
												<DietSelector value={diet} onChange={setDiet} disabled={isLoading} />
											</div>
											<div className="border-t pt-6">
												<div className="mb-6">
													<label className="text-sm font-semibold text-gray-900 block mb-2">Duration</label>
													<select
														className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-purple-500"
														value={planDaysSelection}
														onChange={(e) => setPlanDaysSelection(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
													>
														<option value="auto">Auto ({autoPlanDays} days)</option>
														<option value={3}>3 days</option>
														<option value={5}>5 days</option>
														<option value={7}>7 days</option>
													</select>
												</div>
												<button
													className={`px-6 py-3 rounded-lg font-semibold transition-all ${canGenerate && !isLoading ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-600/50 text-white cursor-not-allowed'}`}
													disabled={!canGenerate || isLoading}
													onClick={handleGenerate}
												>
													{isLoading ? 'Generating...' : 'Generate Plan'}
												</button>
											</div>
										</div>
									</div>
									{isLoading && <Loading />}
									{error && <div className="p-4 text-red-700 bg-red-50 rounded-lg">{error}</div>}
								</div>
								<HowItWorks />
								<ComparisonSection />
								<Testimonials />
								<FinalCTA onCTAClick={handleBackToEditor} />
								<FAQ />
							</div>
						)}

						{result && !isLoading && (
							<div className="flex-1 max-w-5xl mx-auto px-4 py-8 md:py-12">
								<Results
									result={result}
									onCopy={handleCopy}
									onDownload={triggerDownload}
									onRegenerate={handleRegenerate}
									ref={printRef}
								/>
								<div className="text-center mt-8">
									<button onClick={handleBackToEditor} className="text-purple-600 font-semibold hover:underline">
										← Create Another Plan
									</button>
								</div>
							</div>
						)}
					</>
				} />
				<Route path="/recipe/:dayIndex/:mealType" element={
					<ErrorBoundary
						onError={(error, info) => console.error('[RecipeView] Critical Error:', error, info)}
						fallback={(error, reset) => (
							<div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
								<div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
									<AlertCircle className="w-10 h-10 text-red-600" />
								</div>
								<h2 className="text-3xl font-black text-gray-900 mb-4">Oops! This recipe couldn't be loaded.</h2>
								<p className="text-gray-500 mb-8 max-w-md">
									We encountered an unexpected error while preparing your recipe details. Don't worry, your meal plan is still safe.
								</p>
								<div className="flex gap-4">
									<button
										onClick={() => {
											reset()
											navigate('/')
										}}
										className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center gap-2"
									>
										<ArrowLeft className="w-5 h-5" />
										Back to Meal Plan
									</button>
								</div>
							</div>
						)}
					>
						<RecipeWrapper onBack={() => navigate('/')} result={result} showToast={showToast} />
					</ErrorBoundary>
				} />
			</Routes>

			<Footer />
		</div>
	)
}

function RecipeWrapper({ onBack, result, showToast }: {
	onBack: () => void,
	result: MealPlanResult | null,
	showToast: (type: ToastKind, message: string) => void
}) {
	const { dayIndex, mealType } = useParams<{ dayIndex: string, mealType: string }>()
	const location = useLocation()

	const parsedDayIndex = useMemo(() => parseInt(dayIndex || '0'), [dayIndex])
	const isValidMealType = mealType === 'Breakfast' || mealType === 'Lunch' || mealType === 'Dinner'

	// Get meal from location state (preferred) or result
	const meal = useMemo(() => {
		if (location.state?.meal) return location.state.meal
		if (!result || !isValidMealType) return null
		if (parsedDayIndex < 0 || parsedDayIndex >= result.days.length) return null
		return result.days[parsedDayIndex][mealType as 'Breakfast' | 'Lunch' | 'Dinner']
	}, [location.state?.meal, result, parsedDayIndex, mealType, isValidMealType])

	// If the meal is missing and we don't even have a result, it might be a direct link
	// We'll let RecipeDetail show the skeleton while it "loads" if we want, 
	// or show an error if it's definitely an invalid request.
	const isInvalidRequest = !location.state?.meal && (!isValidMealType || (result && (parsedDayIndex < 0 || parsedDayIndex >= result.days.length)))

	if (isInvalidRequest) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center py-32 px-4 text-center">
				<div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
					<AlertCircle className="w-10 h-10 text-amber-500" />
				</div>
				<h2 className="text-3xl font-black text-gray-900 mb-4">Invalid Recipe Link</h2>
				<p className="text-gray-500 mb-8 max-w-md">
					We couldn't find the recipe you're looking for. This can happen if the link is outdated or incorrect.
				</p>
				<button
					onClick={onBack}
					className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all"
				>
					Back to Home
				</button>
			</div>
		)
	}

	return (
		<RecipeDetail
			meal={meal}
			mealType={(mealType as any) || 'Breakfast'}
			dayName={`Day ${parsedDayIndex + 1}`}
			onBack={onBack}
			showToast={showToast}
		/>
	)
}

export default function App() {
	return (
		<ErrorBoundary onError={(error) => console.error('[App] Error:', error)}>
			<Router>
				<MainContent />
			</Router>
		</ErrorBoundary>
	)
}
