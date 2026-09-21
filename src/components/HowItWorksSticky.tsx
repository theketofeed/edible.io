import { useEffect, useRef, useState, memo, type ElementType } from 'react'
import IPhoneMockup from './IPhoneMockup'
import { STORY_STEPS as STEPS, STATIC_PREVIEW_DAYS, StepScreen } from './howItWorksScreens'

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
			className={`min-h-0 md:min-h-screen flex flex-col justify-center pt-4 pb-8 md:py-0 ${index === 0 ? 'mt-6 md:mt-10' : ''}`}
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
				<StepScreen step={index + 1} previewDays={previewDays} />
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
													<StepScreen step={index + 1} previewDays={previewDays} />
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