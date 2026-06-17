import { memo } from 'react'

interface Step {
	number: number
	title: string
	description: string
}

const STEPS: Step[] = [
	{
		number: 1,
		title: 'Upload Receipt',
		description: 'Snap a photo of your grocery receipt or paste your shopping list. Our AI extracts ingredients instantly'
	},
	{
		number: 2,
		title: 'Choose Your Diet',
		description: 'Select from 8 dietary preferences: Keto, Vegan, Paleo, and more. Customize to match your lifestyle'
	},
	{
		number: 3,
		title: 'Get Your Plan',
		description: 'Receive a personalized meal plan with step-by-step recipes using only what you bought. No food waste!'
	}
]

const ReceiptIllustration = () => (
	<svg viewBox="0 0 200 140" className="w-full h-32 sm:h-36" xmlns="http://www.w3.org/2000/svg">
		<rect x="38" y="14" width="68" height="112" rx="6" fill="white" stroke="#E5DEFA" strokeWidth="2"/>
		<rect x="50" y="30" width="44" height="5" rx="2.5" fill="#E9D5FF"/>
		<rect x="50" y="44" width="36" height="4" rx="2" fill="#EDE9FE"/>
		<rect x="50" y="56" width="40" height="4" rx="2" fill="#EDE9FE"/>
		<rect x="50" y="68" width="30" height="4" rx="2" fill="#C6A0F6"/>
		<rect x="50" y="80" width="38" height="4" rx="2" fill="#EDE9FE"/>
		<rect x="50" y="92" width="26" height="4" rx="2" fill="#EDE9FE"/>
		<rect x="50" y="104" width="34" height="4" rx="2" fill="#EDE9FE"/>
		<path d="M38 126 L44 120 L50 126 L56 120 L62 126 L68 120 L74 126 L80 120 L86 126 L92 120 L98 126 L104 120 L106 126" fill="none" stroke="#E5DEFA" strokeWidth="2"/>
		<rect x="112" y="22" width="46" height="78" rx="10" fill="white" stroke="#C6A0F6" strokeWidth="2.5"/>
		<rect x="120" y="32" width="30" height="50" rx="3" fill="#F5F3FF"/>
		<circle cx="135" cy="90" r="3" fill="#C6A0F6"/>
		<rect x="118" y="55" width="34" height="3" rx="1.5" fill="#C6A0F6" opacity="0.8"/>
		<rect x="150" y="100" width="42" height="18" rx="9" fill="#7C3AED"/>
		<text x="171" y="112" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">Eggs</text>
		<rect x="158" y="72" width="38" height="16" rx="8" fill="white" stroke="#C6A0F6" strokeWidth="1.5"/>
		<text x="177" y="83" textAnchor="middle" fontSize="8" fontWeight="700" fill="#7C3AED">Milk</text>
	</svg>
)

const DietIllustration = () => (
	<svg viewBox="0 0 200 140" className="w-full h-32 sm:h-36" xmlns="http://www.w3.org/2000/svg">
		<circle cx="100" cy="74" r="42" fill="white" stroke="#E5DEFA" strokeWidth="3"/>
		<circle cx="100" cy="74" r="26" fill="#F5F3FF"/>
		<path d="M88 70 Q100 56 112 70 Q108 84 100 86 Q92 84 88 70Z" fill="#C6A0F6"/>
		<rect x="4" y="20" width="60" height="22" rx="11" fill="#7C3AED"/>
		<text x="34" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">Keto ✓</text>
		<rect x="136" y="14" width="60" height="22" rx="11" fill="white" stroke="#E5DEFA" strokeWidth="2"/>
		<text x="166" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#9CA3AF">Vegan</text>
		<rect x="4" y="104" width="64" height="22" rx="11" fill="white" stroke="#E5DEFA" strokeWidth="2"/>
		<text x="36" y="118" textAnchor="middle" fontSize="11" fontWeight="700" fill="#9CA3AF">Paleo</text>
	</svg>
)

const PlanIllustration = () => (
	<svg viewBox="0 0 200 140" className="w-full h-32 sm:h-36" xmlns="http://www.w3.org/2000/svg">
		<rect x="58" y="18" width="92" height="98" rx="10" fill="#EDE9FE" transform="rotate(-4 104 67)"/>
		<rect x="50" y="22" width="92" height="98" rx="10" fill="white" stroke="#E5DEFA" strokeWidth="2"/>
		<circle cx="64" cy="42" r="6" fill="#7C3AED"/>
		<path d="M61 42 L63.5 44.5 L67.5 39" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
		<rect x="76" y="39" width="50" height="5" rx="2.5" fill="#EDE9FE"/>
		<circle cx="64" cy="62" r="6" fill="#7C3AED"/>
		<path d="M61 62 L63.5 64.5 L67.5 59" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
		<rect x="76" y="59" width="42" height="5" rx="2.5" fill="#EDE9FE"/>
		<circle cx="64" cy="82" r="6" fill="white" stroke="#C6A0F6" strokeWidth="2"/>
		<rect x="76" y="79" width="46" height="5" rx="2.5" fill="#EDE9FE"/>
		<circle cx="64" cy="102" r="6" fill="white" stroke="#C6A0F6" strokeWidth="2"/>
		<rect x="76" y="99" width="38" height="5" rx="2.5" fill="#EDE9FE"/>
		<path d="M158 24 L161 32 L169 35 L161 38 L158 46 L155 38 L147 35 L155 32 Z" fill="#C6A0F6"/>
		<circle cx="172" cy="50" r="3" fill="#E9D5FF"/>
	</svg>
)

const ILLUSTRATIONS = [ReceiptIllustration, DietIllustration, PlanIllustration]

const HowItWorks = memo(function HowItWorks() {
	return (
		<section id="how-it-works" className="py-10 md:py-16 bg-gradient-to-b from-purple-50 via-purple-50/50 to-white">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
				<div className="text-center mb-10 md:mb-16">
					<div className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/40 backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] mb-4 sm:mb-5 before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white/50 before:to-white/0 before:opacity-60 before:pointer-events-none">
						<span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_0_3px_rgba(168,85,247,0.15)]" />
						<span className="text-[11px] sm:text-[12px] font-medium text-gray-900">
							How Edible works
						</span>
					</div>

					<h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 sm:mb-6">
						Transform your groceries into meal plans in{' '}
						<span className="text-[#C6A0F6]">3 simple steps</span>
					</h2>

					<p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
						No recipe hunting, no extra grocery trips — just tell us what's already in your kitchen and let Edible handle the rest.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-10 pt-3">
					{STEPS.map((step, index) => {
						const Illustration = ILLUSTRATIONS[index]
						return (
							<div
								key={step.number}
								className="group h-full relative"
								style={{
									animation: `fadeInUp 0.6s ease-out ${index * 100}ms both`
								}}
							>
								<div className="absolute -top-4 -left-4 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#7C3AED] text-white font-extrabold text-sm sm:text-base flex items-center justify-center shadow-[0_4px_14px_rgba(124,58,237,0.4)] ring-4 ring-white">
									{step.number}
								</div>

								<div className="h-full bg-white rounded-2xl md:rounded-3xl border border-gray-100 overflow-hidden flex flex-col transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-2 group-hover:border-purple-100">
									<div className="bg-gradient-to-b from-purple-50 to-purple-50/20 px-6 pt-9 pb-5 flex items-center justify-center">
										<Illustration />
									</div>

									<div className="p-5 sm:p-8 pt-4 sm:pt-5 flex-1">
										<h3 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-2 sm:mb-3 group-hover:text-purple-900 transition-colors duration-300">
											{step.title}
										</h3>
										<p className="text-gray-500 leading-relaxed text-sm font-medium">
											{step.description}
										</p>
									</div>
								</div>
							</div>
						)
					})}
				</div>
			</div>

			<style>{`
				@keyframes fadeInUp {
					from {
						opacity: 0;
						transform: translateY(30px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
			`}</style>
		</section>
	)
})

export default HowItWorks
