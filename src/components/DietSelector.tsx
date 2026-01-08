import { memo, useCallback } from 'react'
import type { DietType } from '../utils/types'

// Order chosen to follow user preference: Keto, Paleo, Vegan, Vegetarian, Low Carb, High Protein, Balanced, Mediterranean
const DIETS: DietType[] = ['Keto','Paleo','Vegan','Vegetarian','Low-Carb','High-Protein','Balanced','Mediterranean']

interface Props {
	value: DietType
	onChange: (diet: DietType) => void
	disabled?: boolean
}

// Memoized diet button to prevent re-renders
const DietButton = memo(function DietButton({ 
	diet, 
	isActive, 
	onClick, 
	disabled 
}: { 
	diet: DietType
	isActive: boolean
	onClick: (diet: DietType) => void
	disabled?: boolean
}) {
	const handleClick = useCallback(() => onClick(diet), [diet, onClick])
	
	return (
		<button
			key={diet}
			type="button"
			onClick={handleClick}
			className={`px-4 py-2 rounded-lg border transition-colors ${isActive ? 'bg-lavender border-lavender text-black' : 'border-gray-300 hover:border-black/40'}`}
			disabled={disabled}
		>
			{diet}
		</button>
	)
})

const DietSelector = memo(function DietSelector({ value, onChange, disabled }: Props) {
	const handleChange = useCallback((diet: DietType) => {
		onChange(diet)
	}, [onChange])
	
	return (
		<div className="flex flex-wrap gap-2">
			{DIETS.map((d) => (
				<DietButton
					key={d}
					diet={d}
					isActive={d === value}
					onClick={handleChange}
					disabled={disabled}
				/>
			))}
		</div>
	)
})

export default DietSelector


