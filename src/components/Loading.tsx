export default function Loading() {
	return (
		<div className="flex flex-col items-center justify-center gap-3 text-black/80 py-6">
			<span className="spinner-lavender" />
			<p className="text-sm text-center font-semibold">Analyzing your grocery list… (OCR → AI)</p>
			<p className="text-xs text-black/60 text-center">We are reading your items, applying diet rules, and assembling meals.</p>
		</div>
	)
}


