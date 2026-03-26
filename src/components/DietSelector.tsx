import { memo, useCallback } from 'react'
import type { ElementType } from 'react'
import { Dumbbell, Flame, Leaf, Salad, Scale, Sprout, UtensilsCrossed, Wheat } from 'lucide-react'
import type { DietType } from '../utils/types'

interface DietInfo {
	icon: ElementType
	description: string
	col: string
	bg: string
}

// Diet metadata with icons and descriptions
const DIET_INFO: Record<DietType, DietInfo> = {
	'Keto': { icon: Flame, description: 'Low-carb, high-fat', col: '#b45309', bg: '#FEFCE8' },
	'Vegan': { icon: Leaf, description: '100% plant-based', col: '#047857', bg: '#ECFDF5' },
	'Balanced': { icon: Scale, description: 'Nutritionally complete', col: '#16a34a', bg: '#F0FDF4' },
	'Paleo': { icon: UtensilsCrossed, description: 'Whole foods only', col: '#c2410c', bg: '#FFF7ED' },
	'Vegetarian': { icon: Sprout, description: 'No meat or fish', col: '#15803d', bg: '#F0FDF4' },
	'Low-Carb': { icon: Salad, description: 'Reduced carbohydrates', col: '#0ea5e9', bg: '#E0F2FE' },
	'High-Protein': { icon: Dumbbell, description: 'Protein-focused meals', col: '#dc2626', bg: '#FEF2F2' },
	'Mediterranean': { icon: Wheat, description: 'Heart-healthy fats', col: '#1d4ed8', bg: '#EFF6FF' }
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
	const Icon = info.icon
	
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
				${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
				group relative
			`}
			style={{
				background: isActive ? info.col : '#FFFFFF',
				borderColor: isActive ? info.col : '#EDE9E2',
				color: isActive ? '#FFFFFF' : '#111827',
				boxShadow: isActive ? `0 12px 34px rgba(0,0,0,0.06)` : undefined
			}}
		>
			<div
				style={{
					width: 44,
					height: 44,
					borderRadius: 16,
					background: isActive ? 'rgba(255,255,255,0.15)' : info.bg,
					border: isActive ? 'none' : `1px solid rgba(0,0,0,0.04)`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					marginBottom: 10,
				}}
			>
				<Icon size={20} style={{ color: isActive ? '#FFFFFF' : info.col }} />
			</div>
			<div className="text-sm md:text-base font-semibold" style={{ textAlign: 'center' }}>{diet}</div>
			<div className="text-xs mt-1" style={{ color: isActive ? 'rgba(255,255,255,0.9)' : '#6B7280', textAlign: 'center' }}>
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


