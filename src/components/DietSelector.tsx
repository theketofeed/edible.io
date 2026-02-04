import { memo, useCallback } from 'react'
import type { DietType } from '../utils/types'

interface DietInfo {
	icon: string
	description: string
}

// Diet metadata with icons and descriptions
const DIET_INFO: Record<DietType, DietInfo> = {
	'Keto': { icon: '🥑', description: 'Low-carb, high-fat' },
	'Vegan': { icon: '🌱', description: '100% plant-based' },
	'Balanced': { icon: '⚖️', description: 'Nutritionally complete' },
	'Paleo': { icon: '🥩', description: 'Whole foods only' },
	'Vegetarian': { icon: '🥬', description: 'No meat or fish' },
	'Low-Carb': { icon: '🥦', description: 'Reduced carbohydrates' },
	'High-Protein': { icon: '🍗', description: 'Protein-focused meals' },
	'Mediterranean': { icon: '🥙', description: 'Heart-healthy fats' }
}

// Popular diets (Row 1)
const POPULAR_DIETS: DietType[] = ['Balanced', 'Keto', 'Vegan']
// Other diets (Row 2)
const OTHER_DIETS: DietType[] = ['Paleo', 'Vegetarian', 'Low-Carb', 'High-Protein', 'Mediterranean']

interface Props {
	value: DietType
	onChange: (diet: DietType) => void
	disabled?: boolean
}

// Memoized diet button with enhanced styling
const DietButton = memo(function DietButton({ 
	diet, 
	isActive, 
	onClick, 
	disabled,
	isPopular
}: { 
	diet: DietType
	isActive: boolean
	onClick: (diet: DietType) => void
	disabled?: boolean
	isPopular?: boolean
}) {
	const handleClick = useCallback(() => onClick(diet), [diet, onClick])
	const info = DIET_INFO[diet]
	
	return (
		<button
			key={diet}
			type="button"
			onClick={handleClick}
			disabled={disabled}
			className={`
				flex flex-col items-center justify-center
				px-3 py-3 md:px-4 md:py-4
				rounded-xl border-2 transition-all duration-200
				${isPopular ? 'md:px-5 md:py-5' : ''}
				${isActive 
					? 'bg-purple-600 border-purple-600 text-white shadow-lg' 
					: 'border-gray-200 bg-white text-gray-900 hover:border-purple-200 hover:shadow-md hover:-translate-y-0.5'
				}
				${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
				group relative
			`}
		>
			<div className="text-2xl md:text-3xl mb-1">{info.icon}</div>
			<div className="text-sm md:text-base font-semibold">{diet}</div>
			<div className={`text-xs mt-1 ${isActive ? 'text-purple-100' : 'text-gray-500'}`}>
				{info.description}
			</div>
		</button>
	)
})

const DietSelector = memo(function DietSelector({ value, onChange, disabled }: Props) {
	const handleChange = useCallback((diet: DietType) => {
		onChange(diet)
	}, [onChange])
	
	return (
		<div className="py-8 md:py-8">
			{/* Section Header */}
			<div className="mb-6">
				<h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
					Choose your dietary preference
				</h2>
				<p className="text-sm md:text-base text-gray-600">
					We'll create meals that match your lifestyle and nutritional goals
				</p>
			</div>

			{/* Popular Diets Row */}
			<div className="mb-4">
				<div className="mb-3 flex items-center gap-2">
					<span className="inline-block px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
						Most Popular
					</span>
				</div>
				<div className="grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-4">
					{POPULAR_DIETS.map((d) => (
						<DietButton
							key={d}
							diet={d}
							isActive={d === value}
							onClick={handleChange}
							disabled={disabled}
							isPopular={true}
						/>
					))}
				</div>
			</div>

			{/* Other Diets Row */}
			<div>
				<div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
					{OTHER_DIETS.map((d) => (
						<DietButton
							key={d}
							diet={d}
							isActive={d === value}
							onClick={handleChange}
							disabled={disabled}
						/>
					))}
				</div>
			</div>
		</div>
	)
})

export default DietSelector


