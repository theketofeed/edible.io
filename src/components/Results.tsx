import { forwardRef, memo, useMemo } from 'react'
import { Copy, Download, RefreshCw } from 'lucide-react'
import type { MealPlanResult, DayMeals, Meal } from '../utils/types'

interface Props {
	result: MealPlanResult
	onCopy: () => void
	onDownload: () => void
	onRegenerate: () => void
}

// Memoized meal card to prevent unnecessary re-renders
const MealCard = memo(function MealCard({ meal, label }: { meal: Meal; label: string }) {
	return (
		<div>
			<div className="font-semibold mb-1">{label}:</div>
			<div className="mb-1">{meal.title}</div>
			<div className="text-black/70 text-xs">⏱️ Prep: {meal.prepTime} min | Cook: {meal.cookTime} min | Total: {meal.totalTime} min</div>
		</div>
	)
})

// Memoized day card to prevent re-rendering of unchanged days
const DayCard = memo(function DayCard({ day }: { day: DayMeals }) {
	return (
		<div className="card p-4">
			<h3 className="heading text-lg font-bold mb-3">{day.day}</h3>
			<div className="text-sm grid gap-3">
				<MealCard meal={day.Breakfast} label="Breakfast" />
				<MealCard meal={day.Lunch} label="Lunch" />
				<MealCard meal={day.Dinner} label="Dinner" />
			</div>
		</div>
	)
})

const Results = memo(forwardRef<HTMLDivElement, Props>(function Results({ result, onCopy, onDownload, onRegenerate }, ref) {
	// Memoize the title to avoid recalculation
	const title = useMemo(() => `Your ${result.totalDays}-Day ${result.diet} Meal Plan`, [result.totalDays, result.diet])
	
	// Memoize the days to avoid re-rendering all days when props change slightly
	const days = useMemo(() => result.days, [result.days])

	return (
		<div className="grid gap-6 animate-fadeIn">
			<div className="flex flex-wrap items-center justify-between gap-3 screen-only">
				<div>
					<h2 className="heading text-2xl font-bold">{title}</h2>
					<p className="text-black/60 text-sm">Grounded in {result.sourceItems.length} grocery items</p>
				</div>
				<div className="flex items-center gap-2 no-print">
					<button className="btn border border-gray-300" onClick={onCopy}>
						<Copy className="w-4 h-4 mr-2" />
						Copy
					</button>
					<button className="btn border border-gray-300" onClick={onDownload}>
						<Download className="w-4 h-4 mr-2" />
						Download as PDF
					</button>
					<button className="btn btn-primary" onClick={onRegenerate}>
						<RefreshCw className="w-4 h-4 mr-2" />
						Regenerate
					</button>
				</div>
			</div>

			<div ref={ref} className="grid gap-4 print-content">
				<div className="print-only text-center mb-4">
					<h1 className="heading text-2xl font-bold">Edible.io – {title}</h1>
					<p className="text-sm text-black/70">Generated from your uploaded grocery list</p>
				</div>
				<div className="grid md:grid-cols-2 gap-4">
					{days.map((d) => (
						<DayCard key={d.day} day={d} />
					))}
				</div>
			</div>
		</div>
	)
}))

export default Results

