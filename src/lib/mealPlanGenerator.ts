import Tesseract from 'tesseract.js'
import type { DietType, GenerateMealPlanParams, MealPlanResult, DayMeals, Meal, OcrResult } from '../utils/types'
import { SAMPLE_PLAN } from '../utils/samplePlan'
import { extractGroceryItems, cleanGroceryList } from '../utils/grocery'

// Groq Configuration (Fallback - unlimited free)
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

type DietRules = { never: string[]; always?: string[]; notes?: string }

const DIET_RULES: Record<DietType, string> = {
	Keto: 'Keep net carbohydrates under ~30g per day, prioritize healthy fats, moderate protein, and avoid grains, sugar, and starchy produce.',
	Paleo: 'Exclude all grains, legumes, dairy, refined sugar, and processed foods. Focus on meats, vegetables, fruits, nuts, and healthy fats.',
	Vegan: 'Meals must be 100% plant-based. No meat, fish, eggs, dairy, or animal-derived products.',
	Vegetarian: 'No meat or fish. Include eggs and dairy only if ingredients are available.',
	'Low-Carb': 'Limit carbohydrate-rich items. Center meals around proteins, vegetables, and healthy fats.',
	'High-Protein': 'Emphasize high-quality protein sources in every meal with supporting vegetables or low-carb sides.',
	Balanced: 'Create nutritionally balanced meals with protein, healthy fats, and complex carbohydrates.',
	Mediterranean: 'Emphasize olive oil, fish, whole grains, legumes, vegetables, fruits, nuts, and moderate dairy/poultry with limited red meat.'
}

const DIET_STRICT: Record<DietType, DietRules> = {
	Keto: {
		never: ['bread', 'pasta', 'rice', 'potato', 'potatoes', 'beans', 'tortilla', 'tortillas', 'apple', 'banana', 'grapes', 'grape'],
		always: ['meat', 'fish', 'eggs', 'cheese', 'avocado', 'nuts', 'olive oil', 'butter'],
		notes: 'Aim for high-fat (~70%), moderate protein (~25%), very low carb (~5%). Net carbs under 30g/day.'
	},
	Paleo: {
		never: ['bread', 'pasta', 'rice', 'beans', 'peanuts', 'dairy', 'milk', 'cheese', 'yogurt', 'refined sugar', 'processed'],
		always: ['meat', 'fish', 'eggs', 'vegetable', 'fruit', 'nuts', 'seeds', 'olive oil']
	},
	Vegan: {
		never: ['meat', 'fish', 'eggs', 'milk', 'cheese', 'honey', 'butter', 'yogurt'],
		always: ['vegetable', 'fruit', 'legumes', 'tofu', 'tempeh', 'nuts', 'seeds', 'whole grain']
	},
	Vegetarian: {
		never: ['meat', 'fish', 'poultry', 'gelatin'],
		always: ['eggs', 'dairy', 'vegetable', 'fruit', 'legumes']
	},
	'Low-Carb': {
		never: ['bread', 'pasta', 'rice', 'potato', 'potatoes', 'sugary', 'sugar'],
		always: ['protein', 'vegetable', 'healthy fat']
	},
	'High-Protein': {
		never: [],
		always: ['meat', 'fish', 'eggs', 'greek yogurt', 'cottage cheese', 'legumes', 'quinoa']
	},
	Balanced: {
		never: [],
		always: []
	},
	Mediterranean: {
		never: ['red meat (frequent)', 'excessive red meat'],
		always: ['olive oil', 'fish', 'whole grain', 'legumes', 'vegetable', 'fruit', 'nuts'],
		notes: 'Limit red meat to 1-2x per month; include fish 2-3x per week; emphasize olive oil as primary fat.'
	}
}

export async function runOcrOnFile(file: File): Promise<OcrResult> {
	console.log('[OCR] Starting OCR for file:', file.name, file.type, file.size)
	const { data } = await Tesseract.recognize(file, 'eng', {
		logger: (m) => {
			if (m.status === 'recognizing text') {
				console.log(`[OCR] Progress: ${(m.progress * 100).toFixed(0)}%`)
			}
		}
	} as any)
	const rawText = data.text ?? ''
	const confidence = data.confidence
	console.log('[OCR] Raw extracted text:', rawText)
	console.log('[OCR] Raw text lines:', rawText.split(/\r?\n/).filter(l => l.trim()))
	console.log(`[OCR] FULL RAW TEXT (len=${rawText.length}):\n${rawText}`)
	const items = extractGroceryItems(rawText)
	console.log('[OCR] Completed. Confidence:', confidence, 'Raw length:', rawText.length)
	console.log('[OCR] Extracted items count:', items.length)
	console.log('[OCR] Extracted items:', items)
	return { items, rawText, confidence }
}

// Common pantry staples to assume or suggest
export const PANTRY_STAPLES = [
	// Oils & Fats
	'olive oil', 'vegetable oil', 'canola oil', 'butter', 'coconut oil',

	// Seasonings & Spices
	'salt', 'black pepper', 'white pepper', 'garlic powder', 'onion powder',
	'paprika', 'cumin', 'coriander', 'chili powder', 'cayenne pepper',
	'oregano', 'basil', 'thyme', 'rosemary', 'parsley', 'bay leaves',
	'cinnamon', 'nutmeg', 'ginger powder', 'turmeric',

	// Acids & Condiments
	'lemon juice', 'lime juice', 'vinegar', 'white vinegar', 'apple cider vinegar',
	'balsamic vinegar', 'soy sauce', 'worcestershire sauce', 'hot sauce',

	// Fresh Aromatics
	'garlic', 'onion', 'fresh ginger', 'green onions', 'shallots',

	// Thickeners & Baking
	'all-purpose flour', 'cornstarch', 'baking powder', 'baking soda',

	// Sweeteners
	'sugar', 'brown sugar', 'honey', 'maple syrup',

	// Liquids & Broths
	'water', 'chicken broth', 'vegetable broth', 'beef broth', 'milk'
]

function buildPrompt(items: string[], diet: DietType, days?: number): string {
	const itemsList = items.map((item, index) => `${index + 1}. ${item}`).join('\n')
	const requestedDays = days || 3

	const strict = DIET_STRICT[diet]
	const neverList = strict?.never?.length ? `NEVER include: ${strict.never.join(', ')}` : ''
	const alwaysList = strict?.always?.length ? `ALWAYS include where appropriate: ${strict.always.join(', ')}` : ''
	const notes = strict?.notes ? `Notes: ${strict.notes}` : ''

	const systemMessage = `You are a professional meal planning chef. Create meal plans using STRICTLY ONLY the provided ingredients. ZERO hallucinations allowed.

DIET RULES:
Diet focus: ${diet}. ${DIET_RULES[diet]}
${neverList}
${alwaysList}
${notes}

═══════════════════════════════════════════════════════════
ABSOLUTE RULES - VIOLATION = MEAL PLAN REJECTION
═══════════════════════════════════════════════════════════

ALLOWED INGREDIENTS ONLY:
1. Items on the grocery list below (ONLY these)
2. These pantry staples ONLY: salt, pepper, black pepper, garlic powder, onion powder, paprika, cumin, oregano, basil, olive oil, vegetable oil, butter, vinegar, lemon juice, soy sauce, hot sauce

⚠️ COMMONLY HALLUCINATED ITEMS - DO NOT USE UNLESS LISTED IN GROCERY LIST ABOVE:
- Bread, toast, pita, bagels, baguettes
- Oats, rice, quinoa, pasta, grains
- Bananas, apples, berries (any fruit)
- Green beans, spinach, broccoli, asparagus (any vegetable)
- Salmon, shrimp, tuna, fish
- Cheese, yogurt, milk, cream
- Mushrooms, peppers, onions
- Chickpeas, kidney beans, lentils
- Peanut butter, cashews, almonds, walnuts, nuts
- Honey, maple syrup, sugar
- Sesame oil, peanut oil
- Ginger, turmeric, coconut

⚠️ KEY: If any of these appear in the grocery list above, USE THEM. Only avoid if NOT listed.

YOUR GROCERY LIST (use ONLY these):
${itemsList}

✅ STRATEGY:
- For each meal, pick 2-3 items from the list above + basic pantry staples
- Create realistic recipes combining these exact items
- DO NOT mention or use any ingredient not listed
- If you can't make 5 days with available items, create variations of the same core ingredients
- Example: Day 1 rotisserie chicken salad, Day 2 rotisserie chicken wrap, Day 3 rotisserie chicken soup, etc.

Recipe requirements:
- Real recipe names (searchable on cooking sites)
- 4-8 detailed instruction steps
- Include cooking times and techniques
- Be specific: "dice into 1/4 inch pieces", "sauté for 5-7 minutes until golden"
- Always include nutrition data: {calories, protein, carbs, fat, fiber}

Generate exactly ${requestedDays} complete ${requestedDays === 1 ? "day" : "days"} (Breakfast, Lunch, Dinner each day) using ONLY the groceries listed above.`;

	const userMessage = `Create a ${diet} meal plan for ${requestedDays} ${requestedDays === 1 ? "day" : "days"
		} using ONLY these ingredients:

${itemsList}

REMINDER: Use ONLY the ingredients listed above + pantry staples (salt, pepper, oil, spices, etc). 
DO NOT add salmon, chickpeas, feta cheese, mushrooms, or any other ingredient not in this list!

Return your response as valid JSON matching this EXACT structure. Each day MUST have exactly three properties: "day", "Breakfast", "Lunch", and "Dinner". Each meal MUST have: title, instructions (string with steps), ingredients (array), prepTime, cookTime, totalTime, and nutrition (object with calories, protein, carbs, fat):

{
  "totalDays": ${requestedDays},
  "days": [
    {
      "day": "Day 1",
      "Breakfast": {
        "title": "Recipe Name",
        "instructions": "Step 1... Step 2... etc",
        "ingredients": ["item 1", "item 2"],
        "prepTime": 10,
        "cookTime": 15,
        "totalTime": 25,
        "nutrition": {
          "calories": 350,
          "protein": 12,
          "carbs": 45,
          "fat": 15,
          "fiber": 5
        }
      },
      "Lunch": {...},
      "Dinner": {...}
    }
  ]
}`;

	return `${systemMessage}\n\n--- USER REQUEST ---\n\n${userMessage}`
}

function validateNutritionData(nutrition: any, context: string) {
	if (!nutrition || typeof nutrition !== 'object') {
		console.warn(`[Nutrition] Missing nutrition object for ${context}`)
		return
	}

	const { calories, protein, carbs, fat } = nutrition
	const issues: string[] = []

	if (calories < 100 || calories > 1000) issues.push(`Calories (${calories} kcal) out of range [100-1000]`)
	if (protein < 5 || protein > 60) issues.push(`Protein (${protein}g) out of range [5-60]`)
	if (carbs < 5 || carbs > 100) issues.push(`Carbs (${carbs}g) out of range [5-100]`)
	if (fat < 5 || fat > 50) issues.push(`Fat (${fat}g) out of range [5-50]`)

	if (issues.length > 0) {
		console.warn(`[Nutrition] Validation warnings for ${context}:`, issues.join(', '))
	} else {
		console.log(`[Nutrition] ✅ Verified for ${context}: ${calories} kcal | P: ${protein}g | C: ${carbs}g | F: ${fat}g`)
	}
}

function coerceMeal(meal: any, fallbackTitle: string, context: string = 'Unknown meal'): Meal {
	if (meal && typeof meal === 'object' && meal.title) {
		const rawInstructions = String(meal.instructions || 'Prepare according to recipe.').trim()
		const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients.map(String) : []

		// Validation: Warn if instructions are too short (likely vague)
		if (rawInstructions.length < 50) {
			console.warn(`[Coerce] ⚠️ Instructions too short (<50 chars) for ${context}: "${rawInstructions}"`)
		}

		// Validation: Warn if ingredient list is too short
		if (ingredients.length < 3) {
			console.warn(`[Coerce] ⚠️ Ingredient list too short (<3 items) for ${context}:`, ingredients)
		}

		const baseMeal: Meal = {
			title: String(meal.title || fallbackTitle),
			prepTime: Number(meal.prepTime) || 5,
			cookTime: Number(meal.cookTime) || 5,
			totalTime: Number(meal.totalTime) || (Number(meal.prepTime) || 5) + (Number(meal.cookTime) || 5),
			instructions: rawInstructions,
			ingredients: ingredients
		}

		// Add nutrition if present
		if (meal.nutrition && typeof meal.nutrition === 'object') {
			baseMeal.nutrition = {
				calories: Number(meal.nutrition.calories) || 0,
				protein: Number(meal.nutrition.protein) || 0,
				carbs: Number(meal.nutrition.carbs) || 0,
				fat: Number(meal.nutrition.fat) || 0,
				fiber: meal.nutrition.fiber !== undefined ? Number(meal.nutrition.fiber) : undefined
			}
			validateNutritionData(baseMeal.nutrition, `${context}: ${baseMeal.title}`)
		} else {
			console.warn(`[Coerce] ⚠️ Missing nutrition object for meal: ${baseMeal.title}`)
		}

		return baseMeal
	}
	// Fallback for old string format
	if (typeof meal === 'string') {
		const instructions = meal.includes('(') ? meal.split('(')[1]?.split(')')[0] || 'Prepare according to recipe.' : 'Prepare according to recipe.'
		if (instructions.length < 50) {
			console.warn(`[Coerce] ⚠️ Instructions too short (<50 chars) for old format meal: "${instructions}"`)
		}
		return {
			title: meal.split('(')[0].trim() || fallbackTitle,
			prepTime: 10,
			cookTime: 10,
			totalTime: 20,
			instructions: instructions,
			ingredients: []
		}
	}
	return {
		title: fallbackTitle,
		prepTime: 10,
		cookTime: 10,
		totalTime: 20,
		instructions: 'Prepare according to recipe.',
		ingredients: []
	}
}

function coerceDaysStructure(raw: any): { totalDays: number; days: DayMeals[] } {
	if (!raw) return { totalDays: 0, days: [] }
	const reportedTotalDays = Number(raw.totalDays) || 0
	const rawDays = Array.isArray(raw.days) ? raw.days : []
	const actualDaysCount = rawDays.length
	console.log('[Coerce] Raw totalDays from AI:', reportedTotalDays)
	console.log('[Coerce] Actual days array length:', actualDaysCount)

	const targetDays = Math.max(actualDaysCount, reportedTotalDays || actualDaysCount || 1)
	const safeDays = rawDays.slice(0, Math.min(7, targetDays))

	const fallbackDays = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']
	const days: DayMeals[] = safeDays.map((d: any, idx: number) => {
		const dayName = d?.day || fallbackDays[idx]
		return {
			day: dayName,
			Breakfast: coerceMeal(d?.Breakfast, 'Breakfast', `${dayName} Breakfast`),
			Lunch: coerceMeal(d?.Lunch, 'Lunch', `${dayName} Lunch`),
			Dinner: coerceMeal(d?.Dinner, 'Dinner', `${dayName} Dinner`)
		}
	})

	const finalTotalDays = Math.max(1, Math.min(7, days.length || reportedTotalDays || 1))
	console.log('[Coerce] Final totalDays:', finalTotalDays, 'final days count:', days.length)
	return { totalDays: finalTotalDays, days }
}

function isIngredientAllowed(ingredient: string, allowedItems: string[]): boolean {
	const lowerIngredient = ingredient.toLowerCase().trim()
	if (!lowerIngredient) return true

	// 1. Check Pantry Staples first
	for (const staple of PANTRY_STAPLES) {
		const lowerStaple = staple.toLowerCase()
		if (lowerIngredient.includes(lowerStaple) || lowerStaple.includes(lowerIngredient)) {
			return true
		}
	}

	// 2. Check Grocery List
	for (const allowed of allowedItems) {
		const lowerAllowed = allowed.toLowerCase()
		if (lowerIngredient === lowerAllowed ||
			lowerIngredient.includes(lowerAllowed) ||
			lowerAllowed.includes(lowerIngredient)) {
			return true
		}
	}

	return false
}

function validateIngredientUsage(plan: any, allowedItems: string[]): {
	isValid: boolean
	violations: string[]
	hallucinatedIngredients: string[]
} {
	const violations: string[] = []
	const hallucinated: string[] = []

	for (const day of plan.days) {
		for (const mealType of ['Breakfast', 'Lunch', 'Dinner'] as const) {
			const meal = day[mealType]
			if (!meal || !meal.ingredients) continue

			for (const ingredient of meal.ingredients) {
				if (!isIngredientAllowed(ingredient, allowedItems)) {
					violations.push(`${day.day} ${mealType}: "${ingredient}"`)

					// Track what Claude hallucinated
					const baseIngredient = ingredient.toLowerCase()
						.replace(/\d+/g, '')
						.replace(/cup|tbsp|tsp|oz|lb|kg|g|ml|pinch|large|small|medium|cup|clove|cloves|can|cans|package|pkg|slice|slices/gi, '')
						.trim()

					if (!hallucinated.includes(baseIngredient) && baseIngredient.length > 0) {
						hallucinated.push(baseIngredient)
					}
				}
			}
		}
	}

	if (violations.length > 0) {
		console.error(`[Validation] ❌ AI hallucinated ${hallucinated.length} ingredients not in grocery list:`)
		console.error(`[Validation] Hallucinated: ${hallucinated.join(', ')}`)
		console.error(`[Validation] This is why the plan was rejected. AI must use ONLY groceries provided + pantry staples.`)
	}

	return {
		isValid: violations.length === 0,
		violations,
		hallucinatedIngredients: hallucinated
	}
}

function logUnusedIngredients(result: { totalDays: number; days: DayMeals[] }, allowedItems: string[]): void {
	const used = new Set<string>()
	for (const day of result.days) {
		for (const mealKey of ['Breakfast', 'Lunch', 'Dinner'] as const) {
			const meal = day[mealKey]
			if (!meal || !meal.ingredients) continue
			for (const ingredient of meal.ingredients) {
				const key = ingredient.toLowerCase().trim()
				if (key) used.add(key)
			}
		}
	}

	const unused: string[] = []
	for (const item of allowedItems) {
		const key = item.toLowerCase().trim()
		if (!key) continue
		let found = false
		for (const u of used) {
			if (u === key || u.includes(key) || key.includes(u)) {
				found = true
				break
			}
		}
		if (!found) unused.push(item)
	}

	if (unused.length) {
		console.warn('[Validation] The following grocery items were NOT used in any meal:', unused)
	} else {
		console.log('[Validation] All grocery items were used at least once.')
	}
}

function detectPrimaryProtein(meal: Meal): string | null {
	const text = `${meal.title} ${meal.ingredients.join(' ')}`.toLowerCase()
	const proteins = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'egg', 'eggs', 'bean', 'beans', 'tofu', 'turkey', 'sausage', 'ham']
	for (const p of proteins) {
		if (text.includes(p)) return p
	}
	return null
}

function validateProteinVariety(result: { totalDays: number; days: DayMeals[] }): string[] {
	const messages: string[] = []
	const proteinCounts: Record<string, number> = {}

	for (const day of result.days) {
		const dayProteins: Record<'Breakfast' | 'Lunch' | 'Dinner', string | null> = {
			Breakfast: detectPrimaryProtein(day.Breakfast),
			Lunch: detectPrimaryProtein(day.Lunch),
			Dinner: detectPrimaryProtein(day.Dinner)
		}

		if (dayProteins.Lunch && dayProteins.Dinner && dayProteins.Lunch === dayProteins.Dinner) {
			messages.push(`${day.day}: Lunch and Dinner both use "${dayProteins.Lunch}" as primary protein.`)
		}

		for (const key of ['Breakfast', 'Lunch', 'Dinner'] as const) {
			const p = dayProteins[key]
			if (!p) continue
			proteinCounts[p] = (proteinCounts[p] || 0) + 1
		}
	}

	if ((proteinCounts['chicken'] || 0) > 3) {
		messages.push(`Chicken is used in ${proteinCounts['chicken']} meals (target max 2–3).`)
	}
	const eggCount = (proteinCounts['egg'] || 0) + (proteinCounts['eggs'] || 0)
	if (eggCount > 3) {
		messages.push(`Eggs are used in ${eggCount} meals (should primarily be breakfasts with at most one lunch).`)
	}
	const beanCount = (proteinCounts['bean'] || 0) + (proteinCounts['beans'] || 0)
	if (beanCount < 2) {
		messages.push(`Beans appear in only ${beanCount} meals (target at least 2–3 meals).`)
	}

	if (messages.length) {
		console.warn('[Validation] Protein variety issues detected:', messages)
	} else {
		console.log('[Validation] Protein variety looks good.')
	}

	return messages
}

function validatePlanCompliance(result: { totalDays: number; days: DayMeals[] } | null, diet: DietType, items: string[]): boolean {
	if (!result) return false
	const rules = DIET_STRICT[diet]
	if (!rules) return true

	const forbidden = (rules.never || []).map(s => s.toLowerCase())
	const required = (rules.always || []).map(s => s.toLowerCase())
	const violations: string[] = []
	let criticalViolations = 0

	// Check forbidden ingredients - only count MAIN ingredients as critical violations
	for (const day of result.days) {
		for (const mealKey of ['Breakfast', 'Lunch', 'Dinner'] as const) {
			const meal = day[mealKey]
			if (!meal) continue

			for (const f of forbidden) {
				if (!f) continue

				// Check if it's a MAIN ingredient (in the ingredients array)
				const isMainIngredient = meal.ingredients.some(ing => ing.toLowerCase().includes(f))

				if (isMainIngredient) {
					// Critical violation - forbidden ingredient is a main ingredient
					violations.push(`${day.day} ${mealKey} contains forbidden main ingredient: ${f}`)
					criticalViolations++
				} else {
					// Just mentioned in text, not a main ingredient - log warning but don't count
					const textMentioned = `${meal.title} ${meal.instructions}`.toLowerCase().includes(f)
					if (textMentioned) {
						console.warn(`[Validation] ${day.day} ${mealKey} mentions "${f}" in text but not as main ingredient`)
					}
				}
			}
		}
	}

	// Check required ingredients - less strict, just warn if missing
	if (required.length) {
		for (const day of result.days) {
			const dayText = `${day.Breakfast.title} ${day.Breakfast.ingredients.join(' ')} ${day.Lunch.title} ${day.Lunch.ingredients.join(' ')} ${day.Dinner.title} ${day.Dinner.ingredients.join(' ')}`.toLowerCase()
			const hasRequired = required.some(r => dayText.includes(r))
			if (!hasRequired) {
				console.warn(`[Validation] ${day.day} is missing required items for ${diet}: needs one of ${required.join(', ')}`)
			}
		}
	}

	// Only reject if 3+ critical violations, allow 0-2 with warning
	if (criticalViolations >= 3) {
		console.error('[Validation] Plan has', criticalViolations, 'critical diet violations (threshold: 3+). Rejecting plan.', violations)
		return false
	}

	if (criticalViolations > 0) {
		console.warn(`[Validation] Plan has ${criticalViolations} critical violation(s) but within tolerance (0-2 allowed). Accepting plan with warning.`, violations)
	}

	return true
}

function validateRecipeQuality(result: { totalDays: number; days: DayMeals[] }): void {
	console.log('[Validation] Checking recipe quality...')

	let warnings = 0

	for (const day of result.days) {
		for (const mealType of ['Breakfast', 'Lunch', 'Dinner'] as const) {
			const meal = day[mealType]

			// Check recipe name quality
			if (meal.title.toLowerCase().includes('bowl with') ||
				meal.title.toLowerCase().includes('simple') ||
				meal.title.toLowerCase().includes('plate')) {
				console.warn(`[Quality] Generic recipe name: "${meal.title}"`)
				warnings++
			}

			// Check instruction length
			if (meal.instructions.length < 100) {
				console.warn(`[Quality] Instructions too short (${meal.instructions.length} chars): "${meal.title}"`)
				warnings++
			}

			// Check number of steps
			const stepCount = meal.instructions.split('\n').length
			if (stepCount < 4) {
				console.warn(`[Quality] Too few steps (${stepCount}): "${meal.title}"`)
				warnings++
			}

			// Check ingredient count
			if (meal.ingredients.length < 3) {
				console.warn(`[Quality] Too few ingredients (${meal.ingredients.length}): "${meal.title}"`)
				warnings++
			}

			// Check nutrition
			if (!meal.nutrition || !meal.nutrition.calories) {
				console.warn(`[Quality] Missing nutrition: "${meal.title}"`)
				warnings++
			}
		}
	}

	if (warnings > 0) {
		console.warn(`[Validation] Recipe quality check completed with ${warnings} warnings`)
	} else {
		console.log('[Validation] ✓ All recipes passed quality checks')
	}
}

function calculateRecipeQualityScore(meal: Meal): number {
	let score = 0
	const maxScore = 100

	// Recipe name quality (20 points)
	if (!meal.title.toLowerCase().includes('bowl with') &&
		!meal.title.toLowerCase().includes('simple') &&
		!meal.title.toLowerCase().includes('plate')) {
		score += 20
	}

	// Instruction length (20 points)
	if (meal.instructions.length >= 200) score += 20
	else if (meal.instructions.length >= 100) score += 10

	// Number of steps (20 points)
	const stepCount = meal.instructions.split('\n').length
	if (stepCount >= 6) score += 20
	else if (stepCount >= 4) score += 15
	else if (stepCount >= 3) score += 10

	// Ingredient count (15 points)
	if (meal.ingredients.length >= 5) score += 15
	else if (meal.ingredients.length >= 3) score += 10

	// Nutrition data present (15 points)
	if (meal.nutrition && meal.nutrition.calories > 0) score += 15

	// Cooking techniques used (10 points)
	const techniques = ['sauté', 'roast', 'grill', 'bake', 'simmer', 'fry', 'steam']
	const hasTechnique = techniques.some(t => meal.instructions.toLowerCase().includes(t))
	if (hasTechnique) score += 10

	return Math.min(score, maxScore)
}

function logRecipeQualityScores(result: { days: DayMeals[] }): void {
	console.log('[Quality Scores] Recipe quality analysis:')
	let totalScore = 0
	let recipeCount = 0

	for (const day of result.days) {
		for (const mealType of ['Breakfast', 'Lunch', 'Dinner'] as const) {
			const meal = day[mealType]
			const score = calculateRecipeQualityScore(meal)
			totalScore += score
			recipeCount++

			const emoji = score >= 80 ? '🌟' : score >= 60 ? '✅' : score >= 40 ? '⚠️' : '❌'
			console.log(`  ${emoji} ${day.day} ${mealType}: ${score}/100 - "${meal.title}"`)
		}
	}

	const avgScore = Math.round(totalScore / recipeCount)
	console.log(`\n[Quality Scores] Average: ${avgScore}/100`)

	if (avgScore < 60) {
		console.warn('[Quality Scores] ⚠️ Below target quality! Consider regenerating.')
	} else if (avgScore >= 80) {
		console.log('[Quality Scores] 🌟 Excellent quality recipes!')
	}
}

async function callClaude(prompt: string, diet: DietType): Promise<{ totalDays: number; days: DayMeals[] } | null> {
	console.log('[Claude] Attempting to use Claude API for diet:', diet)

	try {
		console.log('[Claude] Calling backend proxy at http://localhost:3001/api/claude')

		const response = await fetch('http://localhost:3001/api/claude', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				prompt: prompt
			})
		})

		if (!response.ok) {
			const text = await response.text().catch(() => '')
			throw new Error(`Backend HTTP ${response.status}: ${text}`)
		}

		const json = await response.json()
		const content = json.content?.[0]?.text
		if (!content) throw new Error('Missing content in Claude response')

		console.log('[Claude] Raw AI response:', content)

		// Claude sometimes adds markdown code fences, strip them
		const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()

		const parsed = JSON.parse(cleaned)
		console.log('[Claude] Parsed JSON:', parsed)

		const coerced = coerceDaysStructure(parsed)
		console.log('[Claude] Coerced result - totalDays:', coerced.totalDays, 'days count:', coerced.days.length)

		// Validate recipe quality before returning
		validateRecipeQuality(coerced)
		logRecipeQualityScores(coerced)

		return coerced
	} catch (err) {
		console.error('[Claude] Error:', err)
		return null
	}
}

async function callGroq(prompt: string, diet: DietType): Promise<{ totalDays: number; days: DayMeals[] } | null> {
	console.log('[Groq] Attempting to use Groq API as fallback for diet:', diet)

	// Use literal import.meta.env for Vite static replacement
	let apiKey: string | undefined = undefined
	try {
		apiKey = import.meta.env.VITE_GROQ_API_KEY
	} catch (e) {
		// Fallback for Node/test environment
		apiKey = (process as any)?.env?.VITE_GROQ_API_KEY
	}

	if (!apiKey || apiKey.trim() === '' || apiKey === 'your_key_here') {
		console.warn('[Groq] No valid Groq API key found.')
		return null
	}

	console.log('[Groq] ✓ API key validated successfully!')

	try {
		const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: GROQ_MODEL,
				messages: [
					{ role: 'system', content: 'You output JSON only. No code fences. No commentary.' },
					{ role: 'user', content: prompt }
				],
				temperature: 0.55,
				response_format: { type: 'json_object' }
			})
		})
		if (!res.ok) {
			const text = await res.text().catch(() => '')
			throw new Error(`Groq HTTP ${res.status}: ${text}`)
		}
		const json = await res.json()
		const content = json.choices?.[0]?.message?.content
		if (!content) throw new Error('Missing content in Groq response')
		console.log('[Groq] Raw AI response:', content)
		const parsed = JSON.parse(content)
		console.log('[Groq] Parsed JSON:', parsed)
		const coerced = coerceDaysStructure(parsed)
		console.log('[Groq] Coerced result - totalDays:', coerced.totalDays, 'days count:', coerced.days.length)

		// Validate recipe quality before returning
		validateRecipeQuality(coerced)
		logRecipeQualityScores(coerced)

		return coerced
	} catch (err) {
		console.error('[Groq] Error:', err)
		return null
	}
}

async function callAI(prompt: string, diet: DietType): Promise<{ totalDays: number; days: DayMeals[] } | null> {
	console.log('[AI] ========== STARTING AI CALL WITH CLAUDE (PRIMARY) ==========')

	// Priority 1: Claude Haiku ($0.25 per 1M tokens - super cheap, ~$0.0005 per meal plan)
	console.log('[AI] Trying Claude API (Primary)...')
	const claudeResult = await callClaude(prompt, diet)
	if (claudeResult && claudeResult.totalDays && claudeResult.days.length) {
		console.log('[AI] ✅ Claude succeeded! Using Claude result.')
		return claudeResult
	}
	console.log('[AI] ❌ Claude failed or unavailable.')

	// Priority 2: Groq (unlimited free)
	console.log('[AI] Trying Groq API (Fallback)...')
	const groqResult = await callGroq(prompt, diet)
	if (groqResult && groqResult.totalDays && groqResult.days.length) {
		console.log('[AI] ✅ Groq succeeded! Using Groq result.')
		return groqResult
	}
	console.log('[AI] ❌ Groq failed or unavailable.')

	// Priority 3: Manual fallback
	console.log('[AI] ❌ All AI providers failed. Will use sample fallback plan.')
	return null
}

function categorizeIngredients(items: string[]): {
	proteins: string[]
	veggies: string[]
	grains: string[]
	dairy: string[]
	other: string[]
} {
	const proteins: string[] = []
	const veggies: string[] = []
	const grains: string[] = []
	const dairy: string[] = []
	const other: string[] = []

	const proteinKeywords = /chicken|beef|pork|fish|salmon|tuna|shrimp|egg|eggs|tofu|tempeh|beans|lentils|turkey|sausage/i
	const vegKeywords = /spinach|broccoli|tomato|tomatoes|lettuce|kale|carrot|carrots|onion|onions|pepper|peppers|cucumber|celery|asparagus|zucchini|potato|potatoes/i
	const grainKeywords = /bread|rice|pasta|noodles|quinoa|oats|oatmeal|tortilla|wrap|barley|couscous/i
	const dairyKeywords = /milk|cheese|yogurt|butter|cream|cottage/i

	for (const item of items) {
		const lower = item.toLowerCase()
		if (proteinKeywords.test(lower)) proteins.push(item)
		else if (vegKeywords.test(lower)) veggies.push(item)
		else if (grainKeywords.test(lower)) grains.push(item)
		else if (dairyKeywords.test(lower)) dairy.push(item)
		else other.push(item)
	}

	return { proteins, veggies, grains, dairy, other }
}

function estimateNutrition(mealType: 'Breakfast' | 'Lunch' | 'Dinner', diet: DietType, ingredients: string[]): {
	calories: number
	protein: number
	carbs: number
	fat: number
	fiber: number
} {
	// Base calorie ranges by meal type
	let baseCalories: number
	let baseProtein: number

	if (mealType === 'Breakfast') {
		baseCalories = 320
		baseProtein = 20
	} else if (mealType === 'Lunch') {
		baseCalories = 475
		baseProtein = 28
	} else {
		baseCalories = 600
		baseProtein = 32
	}

	// Adjust macros based on diet type
	let protein = baseProtein
	let carbs = 0
	let fat = 0
	let fiber = 0

	switch (diet) {
		case 'Keto':
			// High fat (70%), moderate protein (25%), very low carb (5%)
			protein = Math.round(baseCalories * 0.25 / 4) // 4 cal/g
			carbs = Math.round(baseCalories * 0.05 / 4)
			fat = Math.round(baseCalories * 0.70 / 9) // 9 cal/g
			fiber = 3
			break
		case 'High-Protein':
			// High protein (40%), moderate carb (30%), moderate fat (30%)
			protein = Math.round(baseCalories * 0.40 / 4)
			carbs = Math.round(baseCalories * 0.30 / 4)
			fat = Math.round(baseCalories * 0.30 / 9)
			fiber = 5
			break
		case 'Low-Carb':
			// Moderate protein (30%), low carb (20%), high fat (50%)
			protein = Math.round(baseCalories * 0.30 / 4)
			carbs = Math.round(baseCalories * 0.20 / 4)
			fat = Math.round(baseCalories * 0.50 / 9)
			fiber = 4
			break
		case 'Vegan':
		case 'Vegetarian':
			// Balanced with higher fiber (25% protein, 45% carb, 30% fat)
			protein = Math.round(baseCalories * 0.25 / 4)
			carbs = Math.round(baseCalories * 0.45 / 4)
			fat = Math.round(baseCalories * 0.30 / 9)
			fiber = 8
			break
		case 'Paleo':
			// Moderate protein (30%), moderate carb (30%), moderate fat (40%)
			protein = Math.round(baseCalories * 0.30 / 4)
			carbs = Math.round(baseCalories * 0.30 / 4)
			fat = Math.round(baseCalories * 0.40 / 9)
			fiber = 6
			break
		case 'Mediterranean':
			// Balanced with healthy fats (25% protein, 40% carb, 35% fat)
			protein = Math.round(baseCalories * 0.25 / 4)
			carbs = Math.round(baseCalories * 0.40 / 4)
			fat = Math.round(baseCalories * 0.35 / 9)
			fiber = 7
			break
		case 'Balanced':
		default:
			// Standard balanced (30% protein, 40% carb, 30% fat)
			protein = Math.round(baseCalories * 0.30 / 4)
			carbs = Math.round(baseCalories * 0.40 / 4)
			fat = Math.round(baseCalories * 0.30 / 9)
			fiber = 5
			break
	}

	const result = { calories: baseCalories, protein, carbs, fat, fiber }
	console.log(`[Nutrition] Fallback Estimation (${mealType}, ${diet}):`, result)
	validateNutritionData(result, `Fallback ${mealType}`)
	return result
}

function buildFallbackPlan(items: string[], diet: DietType, sourceText: string, desiredDays?: number): MealPlanResult {
	const estimatedDays = desiredDays ?? Math.max(1, Math.min(7, Math.round(items.length / 3) || 3))
	const safeDays = Math.max(1, Math.min(7, estimatedDays))

	const categorized = categorizeIngredients(items)
	const days: DayMeals[] = []

	const createBreakfast = (dayNum: number, availableItems: string[]): Meal => {
		const proteins = categorized.proteins
		const grains = categorized.grains
		const dairy = categorized.dairy
		const other = categorized.other

		// Pick ingredients with rotation
		const protein = proteins.length > 0 ? proteins[dayNum % proteins.length] : 'Eggs'
		const grain = grains.length > 0 ? grains[dayNum % grains.length] : (dayNum % 2 === 0 ? 'Oats' : 'Toast')
		const extra = dairy.length > 0 ? dairy[dayNum % dairy.length] : (other.length > 0 ? other[dayNum % other.length] : '')

		const ingredients = [
			protein,
			grain,
			extra,
			'Butter (1 tbsp)',
			'Salt (to taste)',
			'Black Pepper (to taste)'
		].filter(Boolean)

		// Create realistic title
		const title = extra
			? `Savory ${protein} & ${grain} with ${extra}`
			: `Classic ${protein} & ${grain} Breakfast`

		// Detailed instructions
		const instructions = `1. Prepare your ingredients: gather ${protein}, ${grain}${extra ? `, and ${extra}` : ''}.\n2. Heat a non-stick skillet over medium heat with a knob of butter.\n3. Cook ${protein} for 5-7 minutes, seasoning with salt and pepper, until fully cooked or heated through.\n4. Meanwhile, prepare ${grain} according to package instructions or toast until golden brown.\n5. Plate the ${protein} alongside the ${grain}.\n6. ${extra ? `Finish by adding ${extra} on top or on the side.` : 'Serve hot and enjoy your balanced breakfast.'}`

		return {
			title,
			prepTime: 10,
			cookTime: 15,
			totalTime: 25,
			instructions,
			ingredients,
			nutrition: estimateNutrition('Breakfast', diet, ingredients)
		}
	}

	const createLunch = (dayNum: number, availableItems: string[]): Meal => {
		const proteins = categorized.proteins
		const veggies = categorized.veggies
		const grains = categorized.grains
		const dairy = categorized.dairy

		// Pick ingredients
		const protein = proteins.length > 0 ? proteins[(dayNum + 1) % proteins.length] : 'Grilled Chicken'
		const veggie = veggies.length > 0 ? veggies[dayNum % veggies.length] : 'Mixed Greens'
		const base = grains.length > 0 ? grains[(dayNum + 1) % grains.length] : 'Rice'
		const fat = dairy.length > 0 ? dairy[dayNum % dairy.length] : 'Olive Oil'

		const ingredients = [
			protein,
			veggie,
			base,
			fat,
			'Olive Oil (1 tbsp)',
			'Lemon Juice (1 tsp)',
			'Salt & Pepper (to taste)'
		].filter(Boolean)

		// Realistic Title
		let title = ''
		if (base.toLowerCase().includes('bread') || base.toLowerCase().includes('wrap')) {
			title = `Mediterranean ${protein} ${base}`
		} else if (base.toLowerCase().includes('rice') || base.toLowerCase().includes('quinoa')) {
			title = `${protein} & ${veggie} Grain Bowl`
		} else {
			title = `Fresh ${protein} Salad with ${veggie}`
		}

		// Detailed Instructions
		const instructions = `1. Wash and chop ${veggie} into bite-sized pieces.\n2. If raw, season ${protein} with salt and pepper, then cook in a pan with olive oil over medium-high heat for 6-8 minutes until golden and cooked through.\n3. Prepare ${base} (if needed) or warm up if pre-cooked.\n4. In a large bowl, combine the ${base}, ${veggie}, and cooked ${protein}.\n5. Drizzle with ${fat === 'Olive Oil' ? 'extra olive oil' : fat} and a splash of lemon juice.\n6. Toss everything gently to combine and season with extra salt or pepper if needed.`

		return {
			title,
			prepTime: 15,
			cookTime: 15,
			totalTime: 30,
			instructions,
			ingredients,
			nutrition: estimateNutrition('Lunch', diet, ingredients)
		}
	}

	const createDinner = (dayNum: number, availableItems: string[]): Meal => {
		const proteins = categorized.proteins
		const veggies = categorized.veggies
		const grains = categorized.grains

		// Pick ingredients
		const protein = proteins.length > 0 ? proteins[(dayNum + 2) % proteins.length] : 'Salmon'
		const veg1 = veggies.length > 0 ? veggies[(dayNum + 1) % veggies.length] : 'Asparagus'
		const veg2 = veggies.length > 1 ? veggies[(dayNum + 2) % veggies.length] : 'Roasted Potatoes'

		const ingredients = [
			protein,
			veg1,
			veg2,
			'Garlic (2 cloves, minced)',
			'Olive Oil (2 tbsp)',
			'Dried Herbs (1 tsp)',
			'Salt & Pepper (to taste)'
		].filter(Boolean)

		// Realistic Title
		const methods = ['Pan-Seared', 'Herb-Roasted', 'Garlic Butter', 'Baked', 'Grilled']
		const method = methods[dayNum % methods.length]
		const title = `${method} ${protein} with ${veg1}`

		// Detailed Instructions
		const instructions = `1. Preheat your oven to 400°F (200°C) or heat a large skillet over medium-high heat.\n2. Pat ${protein} dry and season generously with salt, pepper, and dried herbs.\n3. Toss ${veg1} and ${veg2} with olive oil, minced garlic, salt, and pepper.\n4. If baking: Arrange everything on a sheet pan and roast for 20-25 minutes until ${protein} is cooked through and veggies are tender.\n5. If sautéing: Cook ${protein} in the skillet for 4-5 minutes per side, then remove. Add veggies to the same pan and sauté for 8-10 minutes until soft.\n6. Plate the ${protein} alongside the roasted vegetables and drizzle with any pan juices before serving.`

		return {
			title,
			prepTime: 20,
			cookTime: 25,
			totalTime: 45,
			instructions,
			ingredients,
			nutrition: estimateNutrition('Dinner', diet, ingredients)
		}
	}

	for (let d = 0; d < safeDays; d++) {
		const dayItems = items.slice(Math.floor(d * items.length / safeDays), Math.floor((d + 1) * items.length / safeDays)).filter(i => i && i.length > 0)

		days.push({
			day: `Day ${d + 1}`,
			Breakfast: createBreakfast(d, dayItems),
			Lunch: createLunch(d, dayItems),
			Dinner: createDinner(d, dayItems)
		})
	}

	console.log('[Generator] Generated realistic fallback plan with ingredient distribution across', safeDays, 'days')
	console.log('[Generator] Ingredient categories:', categorized)
	return {
		sourceItems: items,
		sourceText,
		diet,
		totalDays: days.length,
		days
	}
}

export async function generateMealPlan(params: GenerateMealPlanParams): Promise<MealPlanResult> {
	const { items, diet, sourceText, days } = params
	console.log('[Generator] ========== MEAL PLAN GENERATION START ==========')
	console.log('[Generator] Raw items count:', items.length)
	console.log('[Generator] Raw items:', items)
	console.log('[Generator] Requested days:', days)
	console.log('[Generator] Diet:', diet)

	if (!items.length) {
		throw new Error('No grocery items found. Try a clearer photo.')
	}

	const cleanedItems = cleanGroceryList(items)
	console.log('[Generator] Cleaned items count:', cleanedItems.length)
	const isRestrictiveDiet = ['paleo', 'keto', 'vegan', 'mediterranean', 'vegetarian', 'low-carb'].includes(diet.toLowerCase())
	let effectiveDays = days || 3
	if (isRestrictiveDiet && cleanedItems.length < effectiveDays * 3) {
		const maxDays = Math.max(1, Math.floor(cleanedItems.length / 3))
		if (maxDays < effectiveDays) {
			console.log(`[Generator] ⚠️ Restrictive diet (${diet}) with ${cleanedItems.length} items. Reducing days from ${effectiveDays} to ${maxDays}`)
			effectiveDays = maxDays
		}
	}
	console.log(`[Generator] Requesting ${effectiveDays} days for diet: ${diet} (items available: ${cleanedItems.length})`)

	const prompt = buildPrompt(cleanedItems, diet, effectiveDays)
	console.log('[Generator] Prompt includes days instruction:', days ? `Generate exactly ${days} complete days` : 'Auto-determine days')
	console.log('[Generator] Prompt length:', prompt.length, 'characters')

	// Use the new AI caller with priority fallback (Gemini -> Groq -> Fallback)
	const aiResult = await callAI(prompt, diet)
	console.log('[Generator] AI result:', aiResult)
	console.log('[Generator] AI result totalDays:', aiResult?.totalDays)
	console.log('[Generator] AI result days count:', aiResult?.days?.length)

	if (aiResult && aiResult.totalDays && aiResult.days.length) {
		if (days && aiResult.days.length < days) {
			console.warn(`[Generator] AI returned ${aiResult.days.length} days but ${days} were requested`)
		}

		const validation = validateIngredientUsage(aiResult, cleanedItems)
		if (!validation.isValid) {
			console.error('[Generator] AI used ingredients not in grocery list:', validation.violations)
			console.error('[Generator] Available ingredients were:', cleanedItems)
			console.warn(`[Generator] Rejecting AI plan due to ${validation.violations.length} ingredient violations`)
			console.warn(`[Generator] Hallucinated ingredients: ${validation.hallucinatedIngredients.join(', ')}`)
			console.warn(`[Generator] Falling back to safe plan.`)
		} else {
			logUnusedIngredients(aiResult, cleanedItems)
			validateProteinVariety(aiResult)

			const ok = validatePlanCompliance(aiResult, diet, items)
			if (ok) {
				let finalDays = aiResult.days
				if (days && aiResult.days.length < days && aiResult.days.length < 7) {
					console.log('[Generator] Padding AI result to requested', days, 'days')
					const fallbackDays = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']
					finalDays = [...aiResult.days]
					for (let i = aiResult.days.length; i < days && i < 7; i++) {
						finalDays.push({
							day: fallbackDays[i],
							Breakfast: coerceMeal(null, 'Breakfast'),
							Lunch: coerceMeal(null, 'Lunch'),
							Dinner: coerceMeal(null, 'Dinner')
						})
					}
				}
				const finalTotalDays = days && days > 0 ? days : finalDays.length
				console.log('[Generator] AI result passed validation, returning', finalDays.length, 'days (requested:', days, ')')
				return {
					sourceItems: items,
					sourceText,
					diet,
					totalDays: finalTotalDays,
					days: finalDays
				}
			}
			console.warn('[Generator] AI result failed diet validation — falling back to safe plan')
		}
	}

	console.log('[Generator] Using fallback plan with', days, 'days')
	return buildFallbackPlan(cleanedItems, diet, sourceText, days)
}