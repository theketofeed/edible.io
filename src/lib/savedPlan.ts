import type { DayMeals, DietType, Meal, MealPlanResult } from '../utils/types'

type SavedPlanRecord = {
	title?: unknown
	plan_data?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function numberValue(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function normalizeMeal(value: unknown): Meal | undefined {
	if (!isRecord(value)) return undefined

	const nutrition = isRecord(value.nutrition) ? value.nutrition : {}
	const imageUrl = typeof value.imageUrl === 'string' ? value.imageUrl : undefined
	const tips = value.tips === undefined ? undefined : stringArray(value.tips)

	return {
		title: typeof value.title === 'string' && value.title.trim() ? value.title : 'Untitled meal',
		prepTime: numberValue(value.prepTime),
		cookTime: numberValue(value.cookTime),
		totalTime: numberValue(value.totalTime),
		instructions: stringArray(value.instructions),
		ingredients: stringArray(value.ingredients),
		...(tips ? { tips } : {}),
		...(imageUrl ? { imageUrl } : {}),
		nutrition: {
			calories: numberValue(nutrition.calories),
			protein: numberValue(nutrition.protein),
			carbs: numberValue(nutrition.carbs),
			fat: numberValue(nutrition.fat),
			...(typeof nutrition.fiber === 'number' ? { fiber: numberValue(nutrition.fiber) } : {}),
			...(typeof nutrition.sodium === 'number' ? { sodium: numberValue(nutrition.sodium) } : {}),
			...(typeof nutrition.sugars === 'number' ? { sugars: numberValue(nutrition.sugars) } : {})
		}
	}
}

const DIETS: DietType[] = ['Balanced', 'Keto', 'Vegan', 'High-Protein', 'Mediterranean', 'Vegetarian', 'Paleo']

export function normalizeSavedPlan(record: SavedPlanRecord): { title: string; result: MealPlanResult } {
	const planData = isRecord(record.plan_data) ? record.plan_data : {}
	const rawDays = Array.isArray(planData.days) ? planData.days : []
	const days: DayMeals[] = rawDays.filter(isRecord).map((day, index) => ({
		day: typeof day.day === 'string' && day.day.trim() ? day.day : `Day ${index + 1}`,
		Breakfast: normalizeMeal(day.Breakfast) || {
			title: 'Meal unavailable',
			prepTime: 0,
			cookTime: 0,
			totalTime: 0,
			instructions: [],
			ingredients: []
		},
		Lunch: normalizeMeal(day.Lunch),
		Dinner: normalizeMeal(day.Dinner)
	}))
	const diet = typeof planData.diet === 'string' && DIETS.includes(planData.diet as DietType)
		? planData.diet as DietType
		: 'Balanced'
	const totalDays = typeof planData.totalDays === 'number' && Number.isFinite(planData.totalDays)
		? planData.totalDays
		: days.length

	return {
		title: typeof record.title === 'string' && record.title.trim() ? record.title : 'Saved meal plan',
		result: {
			sourceItems: stringArray(planData.sourceItems),
			sourceText: typeof planData.sourceText === 'string' ? planData.sourceText : '',
			diet,
			totalDays,
			days
		}
	}
}
