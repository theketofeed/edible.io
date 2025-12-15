import { forwardRef } from 'react'
import { Copy, Download, RefreshCw } from 'lucide-react'
import type { MealPlanResult } from '../utils/types'

interface Props {
	result: MealPlanResult
	onCopy: () => void
	onDownload: () => void
	onRegenerate: () => void
}

const Results = forwardRef<HTMLDivElement, Props>(function Results({ result, onCopy, onDownload, onRegenerate }, ref) {
	const title = `Your ${result.totalDays}-Day ${result.diet} Meal Plan`

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
					{result.days.map((d) => (
						<div key={d.day} className="card p-4">
							<h3 className="heading text-lg font-bold mb-3">{d.day}</h3>
							<div className="text-sm grid gap-3">
								<div>
									<div className="font-semibold mb-1">Breakfast:</div>
									<div className="mb-1">{d.Breakfast.title}</div>
									<div className="text-black/70 text-xs">⏱️ Prep: {d.Breakfast.prepTime} min | Cook: {d.Breakfast.cookTime} min | Total: {d.Breakfast.totalTime} min</div>
								</div>
								<div>
									<div className="font-semibold mb-1">Lunch:</div>
									<div className="mb-1">{d.Lunch.title}</div>
									<div className="text-black/70 text-xs">⏱️ Prep: {d.Lunch.prepTime} min | Cook: {d.Lunch.cookTime} min | Total: {d.Lunch.totalTime} min</div>
								</div>
								<div>
									<div className="font-semibold mb-1">Dinner:</div>
									<div className="mb-1">{d.Dinner.title}</div>
									<div className="text-black/70 text-xs">⏱️ Prep: {d.Dinner.prepTime} min | Cook: {d.Dinner.cookTime} min | Total: {d.Dinner.totalTime} min</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
})

export default Results

