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
				flex flex-row items-center gap-2.5
				px-4 py-2.5 md:px-5 md:py-3
				rounded-full border transition-all duration-300
				${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5'}
			`}
			style={{
				background: isActive ? info.col : '#FFFFFF',
				borderColor: isActive ? 'transparent' : 'rgba(0,0,0,0.06)',
				color: isActive ? '#FFFFFF' : '#4B5563',
				boxShadow: isActive ? `0 8px 24px ${info.col}40` : '0 2px 8px rgba(0,0,0,0.02)'
			}}
		>
			<div
				style={{
					width: 28,
					height: 28,
					borderRadius: '50%',
					background: isActive ? 'rgba(255,255,255,0.2)' : info.bg,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<Icon size={14} style={{ color: isActive ? '#FFFFFF' : info.col }} />
			</div>
			<div className="text-[13px] md:text-sm font-bold tracking-wide" style={{ color: isActive ? '#FFFFFF' : '#111827' }}>
                {diet}
            </div>
		</button>
	)
})

const DietSelector = memo(function DietSelector({ value, onChange, disabled }: Props) {
	const handleChange = useCallback((diet: DietType) => {
		onChange(diet)
	}, [onChange])
	
	return (
		<div className="py-6 md:py-8">
			{/* Section Header */}
			<div className="mb-5 md:mb-6">
				<h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-1.5 md:mb-2">
					Dietary preference
				</h2>
				<p className="text-sm text-gray-500 font-medium">
					We'll create meals that match your lifestyle
				</p>
			</div>

			{/* Popular Diets Row */}
			<div className="mb-5">
				<div className="mb-3 flex items-center gap-2">
					<span className="inline-block px-2.5 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] md:text-xs font-bold tracking-widest uppercase border border-purple-100/50">
						Most Popular
					</span>
				</div>
				<div className="flex flex-wrap gap-2.5 md:gap-3">
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
				<div className="flex flex-wrap gap-2.5 md:gap-3">
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


