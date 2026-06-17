import { memo } from 'react'

interface Step {
	number: number
	title: string
	description: string
}

const STEPS: Step[] = [
	{ number: 1, title: 'Upload Receipt', description: 'Snap a photo of your grocery receipt or paste your shopping list. Our AI extracts ingredients instantly' },
	{ number: 2, title: 'Choose Your Diet', description: 'Select from 8 dietary preferences: Keto, Vegan, Paleo, and more. Customize to match your lifestyle' },
	{ number: 3, title: 'Get Your Plan', description: 'Receive a personalized meal plan with step-by-step recipes using only what you bought. No food waste!' }
]

const ReceiptIllustration = () => (
	<svg viewBox="0 0 200 140" className="w-full h-28 sm:h-32" xmlns="http://www.w3.org/2000/svg">
		<path d="M16 34 L16 16 L34 16" stroke="#C6A0F6" strokeWidth="3" fill="none" strokeLinecap="round"/>
		<path d="M166 16 L184 16 L184 34" stroke="#C6A0F6" strokeWidth="3" fill="none" strokeLinecap="round"/>
		<path d="M16 106 L16 124 L34 124" stroke="#C6A0F6" strokeWidth="3" fill="none" strokeLinecap="round"/>
		<path d="M184 106 L184 124 L166 124" stroke="#C6A0F6" strokeWidth="3" fill="none" strokeLinecap="round"/>
		<rect x="58" y="28" width="76" height="88" rx="8" fill="white" stroke="#E5DEFA" strokeWidth="2" transform="rotate(-3 96 72)"/>
		<g transform="rotate(-3 96 72)">
			<rect x="70" y="40" width="40" height="5" rx="2.5" fill="#E9D5FF"/>
			<rect x="70" y="52" width="32" height="4" rx="2" fill="#EDE9FE"/>
			<rect x="70" y="62" width="36" height="4" rx="2" fill="#EDE9FE"/>
			<rect x="70" y="72" width="26" height="4" rx="2" fill="#C6A0F6"/>
			<rect x="70" y="82" width="34" height="4" rx="2" fill="#EDE9FE"/>
			<line x1="70" y1="94" x2="106" y2="94" stroke="#E5DEFA" strokeWidth="1.5"/>
			<rect x="70" y="100" width="18" height="5" rx="2.5" fill="#7C3AED" opacity="0.7"/>
		</g>
		<circle cx="138" cy="34" r="18" fill="#7C3AED"/>
		<path d="M131 36c0-5 4-9 9-9 1.5 2 1.5 4 0 6-3 0-5 1-6 3z" fill="white"/>
		<path d="M131 36c4 1 7 1 11-2" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
	</svg>
)

const DietIllustration = () => (
	<svg viewBox="0 0 200 140" className="w-full h-28 sm:h-32" xmlns="http://www.w3.org/2000/svg">
		<circle cx="100" cy="76" r="42" fill="white" stroke="#E5DEFA" strokeWidth="3"/>
		<circle cx="100" cy="76" r="32" fill="#F5F3FF"/>
		<ellipse cx="90" cy="72" rx="17" ry="11" fill="#D8B4FE"/>
		<path d="M78 70c2-3 6-4 9-2" stroke="#C084FC" strokeWidth="1.2" fill="none" opacity="0.7"/>
		<path d="M84 76c3-2 7-2 10 0" stroke="#C084FC" strokeWidth="1.2" fill="none" opacity="0.7"/>
		<circle cx="116" cy="64" r="5" fill="#86EFAC"/>
		<circle cx="122" cy="70" r="4.5" fill="#86EFAC"/>
		<circle cx="117" cy="76" r="4" fill="#4ADE80"/>
		<circle cx="112" cy="90" r="4.5" fill="#FCA5A5"/>
		<circle cx="120" cy="86" r="3.5" fill="#FCA5A5"/>
		<path d="M82 92c4 3 9 3 13 0" stroke="#86EFAC" strokeWidth="2" fill="none" strokeLinecap="round"/>
		<path d="M132 78 Q137 74 134 68" stroke="#C6A0F6" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"/>
		<rect x="2" y="12" width="62" height="22" rx="11" fill="#7C3AED"/>
		<text x="33" y="26" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">Keto ✓</text>
		<rect x="136" y="8" width="60" height="22" rx="11" fill="white" stroke="#E5DEFA" strokeWidth="2"/>
		<text x="166" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="#9CA3AF">Vegan</text>
		<rect x="2" y="110" width="64" height="22" rx="11" fill="white" stroke="#E5DEFA" strokeWidth="2"/>
		<text x="34" y="124" textAnchor="middle" fontSize="11" fontWeight="700" fill="#9CA3AF">Paleo</text>
	</svg>
)

const PlanIllustration = () => (
	<svg viewBox="0 0 200 140" className="w-full h-28 sm:h-32" xmlns="http://www.w3.org/2000/svg">
		<rect x="56" y="14" width="92" height="100" rx="10" fill="#EDE9FE" transform="rotate(-4 102 64)"/>
		<rect x="48" y="18" width="92" height="100" rx="10" fill="white" stroke="#E5DEFA" strokeWidth="2"/>
		<rect x="48" y="18" width="92" height="18" rx="10" fill="#F5F3FF"/>
		<circle cx="62" cy="27" r="3" fill="#C6A0F6"/>
		<rect x="72" y="24" width="40" height="5" rx="2.5" fill="#DDD6FE"/>
		<circle cx="62" cy="48" r="6" fill="#7C3AED"/>
		<path d="M59 48 L61.5 50.5 L65.5 45" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
		<rect x="74" y="45" width="50" height="5" rx="2.5" fill="#EDE9FE"/>
		<circle cx="62" cy="68" r="6" fill="#7C3AED"/>
		<path d="M59 68 L61.5 70.5 L65.5 65" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
		<rect x="74" y="65" width="42" height="5" rx="2.5" fill="#EDE9FE"/>
		<circle cx="62" cy="88" r="6" fill="white" stroke="#C6A0F6" strokeWidth="2"/>
		<rect x="74" y="85" width="46" height="5" rx="2.5" fill="#EDE9FE"/>
		<circle cx="62" cy="106" r="6" fill="white" stroke="#C6A0F6" strokeWidth="2"/>
		<rect x="74" y="103" width="38" height="5" rx="2.5" fill="#EDE9FE"/>
		<rect x="150" y="78" width="44" height="24" rx="12" fill="#7C3AED"/>
		<text x="172" y="93" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">320 cal</text>
		<path d="M156 24 L159 32 L167 35 L159 38 L156 46 L153 38 L145 35 L153 32 Z" fill="#C6A0F6"/>
	</svg>
)

const ILLUSTRATIONS = [ReceiptIllustration, DietIllustration, PlanIllustration]

const HowItWorks = memo(function HowItWorks() {
	return (
		<section id="how-it-works" className="py-10 md:py-16 bg-gradient-to-b from-purple-50 via-purple-50/50 to-white">
			<div className="max-w-6xl mx-auto px-6 sm:px-6 md:px-8">
				<div className="text-center mb-10 md:mb-16">
					<div className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/40 backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] mb-4 sm:mb-5 before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white/50 before:to-white/0 before:opacity-60 before:pointer-events-none">
						<span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_0_3px_rgba(168,85,247,0.15)]" />
						<span className="text-[11px] sm:text-[12px] font-medium text-gray-900">How Edible works</span>
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
							<div key={step.number} className="group h-full relative" style={{ animation: `fadeInUp 0.6s ease-out ${index * 100}ms both` }}>
								<div className="absolute -top-3 -left-3 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#C6A0F6] text-gray-900 font-extrabold text-sm sm:text-base flex items-center justify-center shadow-[0_4px_14px_rgba(198,160,246,0.5)] ring-4 ring-white">
									{step.number}
								</div>
								<div className="h-full bg-white rounded-2xl md:rounded-3xl border-2 border-[#C6A0F6]/30 shadow-[0_4px_20px_rgba(124,58,237,0.04)] overflow-hidden flex flex-col transition-all duration-500 hover:shadow-xl hover:shadow-purple-500/10 hover:border-[#C6A0F6] hover:-translate-y-1.5">
									<div className="bg-gradient-to-b from-[#F5F3FF] to-[#EDE9FE]/40 px-5 pt-9 pb-8 flex items-center justify-center border-b-2 border-[#C6A0F6]/20">
										<div className="w-full max-w-[180px] sm:max-w-[200px] flex items-center justify-center">
											<Illustration />
										</div>
									</div>
									<div className="p-5 sm:p-8 pt-4 sm:pt-5 flex-1">
										<h3 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-2 sm:mb-3 group-hover:text-purple-900 transition-colors duration-300">{step.title}</h3>
										<p className="text-gray-500 leading-relaxed text-sm font-medium">{step.description}</p>
									</div>
								</div>
							</div>
						)
					})}
				</div>
			</div>
			<style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }`}</style>
		</section>
	)
})

export default HowItWorks
