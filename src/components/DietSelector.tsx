import type { DietType } from '../utils/types'

// Order chosen to follow user preference: Keto, Paleo, Vegan, Vegetarian, Low Carb, High Protein, Balanced, Mediterranean
const DIETS: DietType[] = ['Keto','Paleo','Vegan','Vegetarian','Low-Carb','High-Protein','Balanced','Mediterranean']

interface Props {
	value: DietType
	onChange: (diet: DietType) => void
	disabled?: boolean
}

export default function DietSelector({ value, onChange, disabled }: Props) {
	return (
		<div className="flex flex-wrap gap-2">
			{DIETS.map((d) => {
				const active = d === value
				return (
					<button
						key={d}
						type="button"
						onClick={() => onChange(d)}
						className={`px-4 py-2 rounded-lg border transition-colors ${active ? 'bg-lavender border-lavender text-black' : 'border-gray-300 hover:border-black/40'}`}
						disabled={disabled}
					>
						{d}
					</button>
				)
			})}
		</div>
	)
}


