import { useEffect, useRef, useState, memo, type ElementType } from 'react'
import { Download, FileArchive } from 'lucide-react'
import IPhoneMockup from './IPhoneMockup'
import Loading from './Loading'
import DietSelector from './DietSelector'
import type { DietType } from '../utils/types'

const STEPS = [
	{
		number: '01',
		label: 'UPLOAD',
		title: 'Upload your groceries',
		description: 'Snap a receipt or paste your grocery list. Edible figures out what you have.',
	},
	{
		number: '02',
		label: 'CHOOSE',
		title: 'Choose your plan',
		description: 'Pick a diet (keto, paleo, or your own) and how many days you want planned.',
	},
	{
		number: '03',
		label: 'GENERATE',
		title: 'AI builds your plan',
		description: 'Edible turns your groceries into a personalized meal plan in seconds, with zero food waste.',
	},
	{
		number: '04',
		label: 'COOK',
		title: 'Cook your week',
		description: 'See your full week at a glance, ready to cook. Every recipe, every ingredient, organized.',
	},
]

const SCREEN_SLOTS = [
	{ label: 'Receipt / Grocery List', kind: 'STATIC SCREENSHOT SLOT' },
	{ label: 'Diet Selection', kind: 'STATIC SCREENSHOT SLOT' },
	{ label: 'AI Generation', kind: 'LOOPING GIF / VIDEO SLOT' },
	{ label: 'Meal Plan View', kind: 'STATIC SCREENSHOT SLOT' },
] as const

const SCREEN_ASSETS: Record<number, string> = {
	1: '/how-it-works/step-1-upload.png',
}

// Static representative content keeps the marketing preview identical for every visitor.
const STATIC_PREVIEW_DAYS = [
	{
		day: 'Day 1',
		Breakfast: { title: 'Berry Almond Overnight Oats', imageUrl: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=160&h=160&fit=crop' },
		Lunch: { title: 'Chicken and Quinoa Power Bowl', imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=160&h=160&fit=crop' },
		Dinner: { title: 'Garlic Tomato Pasta', imageUrl: 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=160&h=160&fit=crop' },
	},
	{
		day: 'Day 2',
		Breakfast: { title: 'Bacon and Egg Breakfast Tacos with Avocado and Salsa', imageUrl: 'https://images.pexels.com/photos/37305407/pexels-photo-37305407.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
		Lunch: { title: 'Cheesy Chicken and Spinach Quesadilla', imageUrl: 'https://images.pexels.com/photos/14930606/pexels-photo-14930606.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
		Dinner: { title: 'Ground Turkey Meatballs with Spinach and Tomato Sauce', imageUrl: 'https://images.pexels.com/photos/36958915/pexels-photo-36958915.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
	},
	{
		day: 'Day 3',
		Breakfast: { title: 'Italian Chicken Sausage Penne', imageUrl: 'https://images.pexels.com/photos/1438672/pexels-photo-1438672.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
		Lunch: { title: 'Pan-Seared Chicken with Onion and Green Bean Medley', imageUrl: 'https://images.pexels.com/photos/36230654/pexels-photo-36230654.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
		Dinner: { title: 'Scrambled Eggs with Spinach and Cottage Cheese', imageUrl: 'https://images.pexels.com/photos/5639282/pexels-photo-5639282.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
	},
]

function DietSelectorPreview() {
	const previewDiet: DietType = 'Balanced'
	return (
		<div className="h-full w-full overflow-hidden bg-white px-6 pt-14 pb-10">
			<div className="origin-top-left" style={{ width: '114.3%', transform: 'scale(0.875)' }}>
				<DietSelector value={previewDiet} onChange={() => undefined} disabled />
				<div className="border-t border-gray-200 pt-5">
					<h2 className="text-lg font-bold text-gray-900 mb-1.5">Select your plan duration</h2>
					<p className="text-sm text-gray-500 font-medium mb-4">Choose how long you want your meal plan to last</p>
					<select disabled value="3" aria-label="Plan duration" className="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-900 bg-white">
						<option value="3">3 days</option>
					</select>
					<p className="text-xs text-gray-400 font-medium mt-2">Add more items to your list to unlock longer plans</p>
					<button type="button" disabled className="mt-5 px-6 py-3 rounded-lg font-semibold bg-[#C6A0F6] text-white">Generate Plan</button>
				</div>
			</div>
		</div>
	)
}

function MealPlanPreview({ days }: { days: typeof STATIC_PREVIEW_DAYS }) {
	const previewDays = days.slice(0, 3)
	return (
		<div className="h-full w-full overflow-hidden bg-white px-7 pt-20 pb-16">
			<div className="origin-top-left" style={{ width: '121.95%', transform: 'scale(0.82)' }}>
				<div className="mb-5 text-center">
					<p className="text-lg font-black uppercase tracking-[0.12em] text-purple-500">3-day plan</p>
					<h2 className="text-base font-black text-gray-900 mt-1">Your meal plan</h2>
				</div>
				<div className="flex gap-2 mb-6">
					<button type="button" disabled className="h-9 flex-1 rounded-xl bg-white/70 border border-gray-200 text-[11px] font-bold text-gray-700 flex items-center justify-center gap-1.5 shadow-sm">
						<Download className="w-3.5 h-3.5 text-purple-500" />
						Download Plan
					</button>
					<button type="button" disabled className="h-9 flex-1 rounded-xl bg-white/70 border border-gray-200 text-[11px] font-bold text-gray-700 flex items-center justify-center gap-1.5 shadow-sm">
						<FileArchive className="w-3.5 h-3.5 text-amber-500" />
						Download All Recipes PDF
					</button>
				</div>
				<div className="space-y-5">
					{previewDays.map((day, dayIndex) => (
						<div key={day.day}>
							<p className="mb-2 text-xs font-black uppercase tracking-wider text-gray-900">{day.day}</p>
							<div className="space-y-2">
								{(['Breakfast', 'Lunch', 'Dinner'] as const).filter((type) => dayIndex < 2 || type === 'Breakfast').map((type) => {
									const meal = day[type]
									return <div key={type} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2.5 shadow-[0_1px_5px_rgba(0,0,0,0.05)]">
										<img src={meal.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
										<div className="min-w-0">
											<p className="text-[9px] font-bold uppercase tracking-wider text-purple-500">{type}</p>
											<p className="line-clamp-1 text-xs font-bold leading-tight text-gray-900">{meal.title}</p>
										</div>
									</div>
								})}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

function ScreenPlaceholder({ step, previewDays }: { step: number; previewDays: typeof STATIC_PREVIEW_DAYS }) {
	if (step === 3) return (
		<div className="h-full w-full flex items-center justify-center bg-purple-50 px-4 py-12">
			<div className="w-full h-[64%] rounded-3xl bg-white border border-purple-100 shadow-[0_12px_32px_rgba(124,58,237,0.12)] overflow-hidden">
				<Loading step={1} compact />
			</div>
		</div>
	)
	if (step === 2) return <DietSelectorPreview />
	if (step === 4) return <MealPlanPreview days={previewDays} />
	if (SCREEN_ASSETS[step]) {
		return <img src={SCREEN_ASSETS[step]} alt="" className="block w-full h-full object-contain" />
	}

	const slot = SCREEN_SLOTS[step - 1]
	return (
		<div className="w-full h-full bg-gradient-to-b from-purple-50 to-purple-100/60 flex flex-col items-center justify-center gap-3 px-6 text-center">
			<div className="w-14 h-14 rounded-2xl bg-purple-200/60 flex items-center justify-center">
				<span className="text-2xl font-black text-purple-400">0{step}</span>
			</div>
			<span className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.12em]">
				{slot.kind}
			</span>
			<span className="text-xs font-semibold text-purple-500 uppercase tracking-wider">{slot.label}</span>
		</div>
	)
}

/** Single step block in the left column */
function StepBlock({
	step,
	index,
	stepRef,
}: {
	step: (typeof STEPS)[number]
	index: number
	stepRef: (el: HTMLDivElement | null) => void
}) {
	return (
		<div
			ref={stepRef}
			data-step={index}
			className="min-h-0 md:min-h-screen flex flex-col justify-center pt-4 pb-8 md:py-0"
		>
			<div className="max-w-md">
				{/* Eyebrow */}
				<div className="flex items-center gap-3 mb-5">
					<span className="text-[11px] font-bold text-purple-400 tracking-[0.15em] uppercase">
						Step {step.number}
					</span>
					<div className="h-px flex-1 bg-purple-200/60" />
				</div>

				{/* Number + label */}
				<div className="flex items-baseline gap-4 mb-4">
					<span className="text-5xl md:text-6xl font-black text-purple-200 leading-none select-none">
						{step.number}
					</span>
					<span className="text-lg font-black text-gray-900 uppercase tracking-tight">
						{step.label}
					</span>
				</div>

				{/* Headline */}
				<h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-5 leading-tight tracking-tight">
					{step.title}
				</h3>

				{/* Body */}
				<p className="text-base md:text-lg text-gray-500 leading-relaxed font-medium">
					{step.description}
				</p>
			</div>
		</div>
	)
}

/** Mobile-only inline mockup for a single step */
function MobileMockup({ index, previewDays }: { index: number; previewDays: typeof STATIC_PREVIEW_DAYS }) {
	return (
		<div className="md:hidden flex justify-center pt-4 pb-20">
			<IPhoneMockup className="mx-auto">
				<ScreenPlaceholder step={index + 1} previewDays={previewDays} />
			</IPhoneMockup>
		</div>
	)
}

const HowItWorksSticky = memo(function HowItWorksSticky({
	headingLevel = 'h2',
}: {
	headingLevel?: 'h1' | 'h2'
}) {
	const [activeStep, setActiveStep] = useState(0)
	const previewDays = STATIC_PREVIEW_DAYS
	const stepRefs = useRef<(HTMLDivElement | null)[]>([])

	useEffect(() => {
		const desktopQuery = window.matchMedia('(min-width: 768px)')
		let observer: IntersectionObserver | null = null

		const syncObserver = () => {
			observer?.disconnect()
			observer = null
			if (!desktopQuery.matches) return

			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting) {
							const idx = Number((entry.target as HTMLElement).dataset.step)
							if (!isNaN(idx)) setActiveStep(idx)
						}
					}
				},
				{ rootMargin: '-45% 0px -45% 0px', threshold: 0 },
			)

			stepRefs.current.forEach((el) => {
				if (el) observer?.observe(el)
			})
		}

		syncObserver()
		desktopQuery.addEventListener('change', syncObserver)
		return () => {
			desktopQuery.removeEventListener('change', syncObserver)
			observer?.disconnect()
		}
	}, [])

	const Heading: ElementType = headingLevel

	return (
		<section
			id="how-it-works"
			className="relative bg-gradient-to-b from-purple-50 via-purple-50/50 to-white"
		>
			{/* Header */}
			<div className="max-w-6xl mx-auto px-6 sm:px-6 md:px-8 pt-12 md:pt-24 pb-0 md:pb-12">
				<div className="text-center">
					<div className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/40 backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] mb-4 sm:mb-5 before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white/50 before:to-white/0 before:opacity-60 before:pointer-events-none">
						<span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_0_3px_rgba(168,85,247,0.15)]" />
						<span className="text-[11px] sm:text-[12px] font-medium text-gray-900">How Edible works</span>
					</div>
					<Heading className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 sm:mb-6">
						From groceries to meal plans in{' '}
						<span className="text-[#C6A0F6]">4 steps</span>
					</Heading>
					<p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
						No recipe hunting, no extra grocery trips. Just tell us what's in your kitchen and let Edible handle the rest.
					</p>
				</div>
			</div>

			{/* Two-column scroll layout */}
			<div className="max-w-6xl mx-auto px-6 sm:px-6 md:px-8 pb-24 md:pb-32">
				<div className="relative flex gap-12 lg:gap-20">
					{/* Left column: scrollable step text blocks */}
					<div className="flex-1 min-w-0">
						{STEPS.map((step, index) => (
							<div key={step.number}>
								<StepBlock
									step={step}
									index={index}
									stepRef={(el) => { stepRefs.current[index] = el }}
								/>
												<MobileMockup index={index} previewDays={previewDays} />
							</div>
						))}
					</div>

					{/* Right column: sticky iPhone (desktop only) */}
					<div className="hidden md:flex w-[300px] lg:w-[320px] flex-shrink-0">
						<div className="sticky top-24 self-start w-full">
							<IPhoneMockup className="mx-auto">
								{/* Crossfade wrapper */}
								<div className="relative w-full h-full">
									{STEPS.map((_, index) => (
										<div
											key={index}
											className="absolute inset-0 transition-opacity duration-500 ease-in-out"
											style={{ opacity: activeStep === index ? 1 : 0, zIndex: activeStep === index ? 1 : 0 }}
											aria-hidden={activeStep !== index}
										>
													<ScreenPlaceholder step={index + 1} previewDays={previewDays} />
										</div>
									))}
								</div>
							</IPhoneMockup>

							{/* Step indicator dots */}
							<div className="flex items-center justify-center gap-2 mt-6">
								{STEPS.map((_, index) => (
									<div
										key={index}
										className={`h-2 rounded-full transition-all duration-500 ${
											activeStep === index
												? 'w-6 bg-purple-500'
												: 'w-2 bg-purple-200'
										}`}
									/>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
})

export default HowItWorksSticky
