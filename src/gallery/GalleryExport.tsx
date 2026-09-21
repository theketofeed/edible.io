import { useEffect, memo, type ReactNode } from 'react'
import {
	BookOpen,
	CheckCircle2,
	ChefHat,
	Circle,
	Clock,
	Timer,
} from 'lucide-react'
import IPhoneMockup from '../components/IPhoneMockup'
import { STORY_STEPS as STEPS, STATIC_PREVIEW_DAYS, StepScreen } from '../components/howItWorksScreens'

/* ------------------------------------------------------------------ */
/* Inline fallback if a remote food photo fails to load                */
/* ------------------------------------------------------------------ */

const IMG_FALLBACK =
	'data:image/svg+xml;utf8,' +
	encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320">` +
			`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
			`<stop offset="0" stop-color="#F3E8FF"/><stop offset="1" stop-color="#EBE0FF"/>` +
			`</linearGradient></defs>` +
			`<rect width="480" height="320" fill="url(#g)"/>` +
			`<circle cx="240" cy="150" r="54" fill="#E9D5FF"/>` +
			`<circle cx="226" cy="140" r="20" fill="#C6A0F6" opacity="0.85"/>` +
			`<circle cx="252" cy="170" r="34" fill="#D8B4FE"/>` +
			`</svg>`
	)

/* ------------------------------------------------------------------ */
/* RecipeDetailPreview — mirrors the real mobile recipe detail page     */
/* ------------------------------------------------------------------ */

const RECIPE_HERO_IMG = 'https://images.pexels.com/photos/1438672/pexels-photo-1438672.jpeg?auto=compress&cs=tinysrgb&w=480&h=320&fit=crop'

function IngredientRow({ done = false, text }: { done?: boolean; text: string }) {
	return (
		<div className={`flex items-center gap-2 rounded-xl border p-2 ${done ? 'border-gray-100 bg-gray-50' : 'border-gray-50 bg-white'}`}>
			{done ? (
				<CheckCircle2 className="h-4 w-4 shrink-0 text-purple-600" strokeWidth={2.2} />
			) : (
				<Circle className="h-4 w-4 shrink-0 text-purple-200" strokeWidth={2.2} />
			)}
			<span className={`text-[11px] font-medium leading-tight ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{text}</span>
		</div>
	)
}

function TimeCard({ icon: Icon, label, value, tileBg, iconColor }: {
	icon: typeof Clock
	label: string
	value: string
	tileBg: string
	iconColor: string
}) {
	return (
		<div className="flex flex-1 items-center gap-1.5">
			<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: tileBg, borderColor: tileBg }}>
				<Icon className="h-3.5 w-3.5" strokeWidth={2.2} style={{ color: iconColor }} />
			</div>
			<div className="min-w-0">
				<p className="mb-0.5 text-[6.5px] font-bold uppercase tracking-widest text-gray-400 leading-none">{label}</p>
				<p className="text-[11px] font-bold text-gray-900 leading-none">{value}</p>
			</div>
		</div>
	)
}

function RecipeDetailPreview() {
	return (
		<div className="h-full w-full overflow-hidden bg-[#F5F3FF] pb-4">
			{/* Hero + title card */}
			<div className="mx-3 mt-3 overflow-hidden rounded-[22px] border border-gray-50 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.04)]">
				<div className="relative h-[115px] w-full">
					<img src={RECIPE_HERO_IMG} alt="" className="absolute inset-0 h-full w-full object-cover" />
					<div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/0" />
				</div>
				<div className="px-3.5 pb-4 pt-3">
					<div className="mb-2 flex items-center gap-2">
						<span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Day 1</span>
						<span className="rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-purple-800">Dinner</span>
					</div>
					<h3 className="mb-3 text-[19px] font-bold leading-tight tracking-tight text-gray-900">Italian Chicken Sausage Penne</h3>
					<div className="mb-3 flex items-center gap-2">
						<TimeCard icon={Clock} label="Prep" value="10m" tileBg="#FFF7ED" iconColor="#f97316" />
						<TimeCard icon={ChefHat} label="Cook" value="25m" tileBg="#ECFDF5" iconColor="#10b981" />
						<TimeCard icon={Timer} label="Total" value="35m" tileBg="#F5F3FF" iconColor="#9333ea" />
					</div>
					<button type="button" className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[#C6A0F6] text-[12px] font-bold text-gray-900">
						<ChefHat className="h-3.5 w-3.5" />
						Enter Cooking Mode
					</button>
				</div>
			</div>

			{/* Difficulty card */}
			<div className="mx-3 mt-2.5 rounded-2xl border border-gray-50 bg-white p-3 shadow-[0_6px_24px_rgba(0,0,0,0.04)]">
				<div className="mb-2 flex items-center gap-1.5">
					<div className="h-3.5 w-1 rounded-full bg-amber-500" />
					<span className="text-[10px] font-bold text-gray-900">Difficulty</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#fde68a] bg-[#fefce8]">
						<ChefHat className="h-3.5 w-3.5 text-[#b45309]" strokeWidth={2.2} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="mb-1 flex items-baseline justify-between">
							<span className="text-[11px] font-bold text-[#b45309]">Medium</span>
							<span className="text-[8.5px] text-gray-400">35 min · 5 steps</span>
						</div>
						<div className="grid grid-cols-3 gap-1">
							<div className="h-1 rounded-full bg-amber-500" />
							<div className="h-1 rounded-full bg-amber-500" />
							<div className="h-1 rounded-full bg-gray-200" />
						</div>
					</div>
				</div>
			</div>

			{/* Tabs card: ingredients / method / nutrition */}
			<div className="mx-3 mt-2.5 overflow-hidden rounded-2xl border border-gray-50 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.04)]">
				<div className="border-b border-gray-50 p-1.5">
					<div className="flex items-center gap-1 rounded-full bg-gray-50 p-1">
						<span className="flex-1 rounded-full bg-white py-1.5 text-center text-[9px] font-bold text-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">Ingredients (5)</span>
						<span className="flex-1 rounded-full py-1.5 text-center text-[9px] font-bold text-gray-400">Method</span>
						<span className="flex-1 rounded-full py-1.5 text-center text-[9px] font-bold text-gray-400">Nutrition</span>
					</div>
				</div>
				<div className="space-y-1.5 p-2.5">
					<IngredientRow done text="1 lb Italian chicken sausage" />
					<IngredientRow text="3 garlic cloves, minced" />
					<IngredientRow text="2 cups marinara sauce" />
				</div>
			</div>
		</div>
	)
}

/* ------------------------------------------------------------------ */
/* Slide shell — 1270 x 760, identical chrome for every slide          */
/* ------------------------------------------------------------------ */

const SLIDE_BG = 'linear-gradient(180deg,#FAF5FF 0%,#F5F3FF 52%,#FDFBFF 100%)'

function Slide({ eyebrow, kicker, title, description, screen }: {
	eyebrow: string
	kicker: ReactNode
	title: string
	description: string
	screen: ReactNode
}) {
	return (
		<div
			data-slide
			style={{ width: 1270, height: 760, background: SLIDE_BG }}
			className="flex items-center justify-center gap-16 shrink-0"
			aria-hidden="true"
		>
			{/* Text column */}
			<div className="flex flex-col" style={{ width: 560 }}>
				<div className="flex items-center gap-5 mb-7">
					<span className="text-[17px] font-bold tracking-[0.18em] uppercase text-purple-400 whitespace-nowrap">{eyebrow}</span>
					<div className="h-px flex-1 bg-purple-200/80" />
				</div>

				{kicker}

				<h2 className="text-[44px] font-black text-gray-900 leading-tight tracking-tight mb-7">{title}</h2>
				<p className="text-[21px] font-medium text-gray-500 leading-relaxed">{description}</p>
			</div>

			{/* Phone column */}
			<div style={{ width: 320, flexShrink: 0 }}>
				<IPhoneMockup className="mx-auto">{screen}</IPhoneMockup>
			</div>
		</div>
	)
}

function NumberKicker({ number }: { number: string }) {
	return (
		<span className="block text-[92px] font-black leading-none text-purple-200 mb-7 select-none">{number}</span>
	)
}

function RecipeDetailKicker() {
	return (
		<div className="flex items-center mb-7" style={{ height: 92 }}>
			<span className="inline-flex items-center justify-center h-[84px] w-[84px] rounded-[26px] bg-white/70 border border-purple-100 shadow-[0_8px_24px_rgba(124,58,237,0.10)]">
				<BookOpen className="h-9 w-9 text-purple-500" strokeWidth={2} />
			</span>
		</div>
	)
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const GalleryExport = memo(function GalleryExport() {
	useEffect(() => {
		const fix = (img: HTMLImageElement) => {
			if (img.dataset.fixed === '1') return
			img.dataset.fixed = '1'
			img.src = IMG_FALLBACK
		}
		const handler = (e: Event) => {
			const t = e.target as HTMLImageElement
			if (t && t.tagName === 'IMG') fix(t)
		}
		document.addEventListener('error', handler, true)
		return () => document.removeEventListener('error', handler, true)
	}, [])

	return (
		<>
			<style>{`html,body{margin:0;padding:0;background:#ffffff} *{animation:none!important;transition:none!important}`}</style>
			<main className="w-full flex flex-col">
				{STEPS.map((step, index) => (
					<Slide
						key={step.number}
						eyebrow={step.eyebrow}
						kicker={<NumberKicker number={step.number} />}
						title={step.title}
						description={step.description}
						screen={<StepScreen step={index + 1} previewDays={STATIC_PREVIEW_DAYS} />}
					/>
				))}
				<Slide
					eyebrow="Recipe details"
					kicker={<RecipeDetailKicker />}
					title="Every recipe, fully detailed"
					description="Open any meal to see every ingredient, step-by-step instructions, and full nutrition, all in one place."
					screen={<RecipeDetailPreview />}
				/>
			</main>
		</>
	)
})

export default GalleryExport