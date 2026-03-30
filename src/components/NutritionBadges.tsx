import { memo } from 'react'

export interface NutritionData {
    calories?: number | string
    protein?: number | string
    carbs?: number | string
    fat?: number | string
    fiber?: number | string
}

interface NutritionBadgesProps {
    nutrition: NutritionData
    className?: string
}

const Badge = ({ label, value, emoji, unit }: { label: string; value: string | number | undefined; emoji: string; unit: string }) => {
    const displayValue = value !== undefined && value !== null && value !== '' ? value : 'N/A'

    return (
        <div
            className="flex-shrink-0 flex items-center gap-3 px-5 py-3 bg-[#F9F8F6] rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
            aria-label={`${label}: ${displayValue} ${displayValue !== 'N/A' ? unit : ''}`}
        >
            <span className="text-xl" role="img" aria-hidden="true">{emoji}</span>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-none mb-1" aria-hidden="true">{label}</span>
                <span className="text-base font-bold text-gray-900 leading-none">
                    {displayValue}
                    {displayValue !== 'N/A' && <span className="text-[11px] ml-0.5 font-bold text-gray-400" aria-hidden="true">{unit}</span>}
                </span>
            </div>
        </div>
    )
}

const NutritionBadges = memo(function NutritionBadges({ nutrition, className = '' }: NutritionBadgesProps) {
    return (
        <div
            className={`w-full overflow-x-auto pb-2 scrollbar-hide focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-xl ${className}`}
            role="region"
            aria-label="Nutritional information"
            tabIndex={0}
        >
            <div className="flex items-center gap-3 w-max min-w-full">
                <Badge
                    label="Calories"
                    value={nutrition.calories}
                    emoji="🔥"
                    unit="kcal"
                />
                <Badge
                    label="Protein"
                    value={nutrition.protein}
                    emoji="🥩"
                    unit="g"
                />
                <Badge
                    label="Carbs"
                    value={nutrition.carbs}
                    emoji="🍞"
                    unit="g"
                />
                <Badge
                    label="Fat"
                    value={nutrition.fat}
                    emoji="🥑"
                    unit="g"
                />
                {nutrition.fiber !== undefined && (
                    <Badge
                        label="Fiber"
                        value={nutrition.fiber}
                        emoji="🌾"
                        unit="g"
                    />
                )}
            </div>
        </div>
    )
})

export default NutritionBadges
