export type DietType = 'Keto' | 'Paleo' | 'Vegan' | 'Vegetarian' | 'Low-Carb' | 'High-Protein' | 'Balanced'

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner'

export interface DayMeals {
	day: string
	Breakfast: string
	Lunch: string
	Dinner: string
}

export interface MealPlanResult {
	sourceItems: string[]
	sourceText: string
	diet: DietType
	totalDays: number
	days: DayMeals[]
}

export interface GenerateMealPlanParams {
	items: string[]
	diet: DietType
	sourceText: string
}

export interface OcrResult {
	items: string[]
	rawText: string
	confidence?: number
}


