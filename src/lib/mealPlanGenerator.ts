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

function extractIngredientsFromResponse(aiResponse: string): string[] {
	console.log('[Validation] Extracting ingredients from AI response...')

	// Find all "ingredients": [...] arrays in the JSON
	const ingredientPattern = /"ingredients"\s*:\s*\[(.*?)\]/gs
	const allIngredients = new Set<string>()
	let match

	while ((match = ingredientPattern.exec(aiResponse)) !== null) {
		const arrayContent = match[1]
		// Extract quoted strings from the array
		const itemMatches = arrayContent.match(/"([^"]+)"/g)

		if (itemMatches) {
			for (const item of itemMatches) {
				// Remove quotes and trim
				let cleanedItem = item.replace(/^"|"$/g, '').trim()
				
				// IMPORTANT: Extract base ingredient (removes quantities, measurements, processing methods)
				// This handles cases like "1 hass avocado", "2 cups rotisserie chicken", "juice of 1 lime", etc.
				cleanedItem = extractBaseIngredient(cleanedItem)
				
				if (cleanedItem && cleanedItem.length > 0) {
					allIngredients.add(cleanedItem)
				}
			}
		}
	}

	const result = Array.from(allIngredients)
	console.log(`[Validation] Extracted ${result.length} unique ingredients from response`)
	console.log('[Validation] Ingredients found:', result)

	return result
}

function preValidateIngredients(aiResponse: string, allowedItems: string[]): { valid: boolean; violations: string[] } {
	console.log('[PreValidation] Starting ingredient pre-validation before JSON parsing...')

	const usedIngredients = extractIngredientsFromResponse(aiResponse)

	// Create a Set of allowed ingredients (lowercase, trimmed)
	const allowedSet = new Set<string>()
	const allowedBaseSet = new Set<string>()
	
	for (const item of allowedItems) {
		allowedSet.add(item.toLowerCase().trim())
		allowedBaseSet.add(extractBaseIngredient(item))
	}

	// Define pantry basics
	const pantryBasics = new Set<string>([
		'salt', 'pepper', 'water', 'oil', 'olive oil', 'black pepper',
		'garlic powder', 'onion powder', 'paprika', 'cumin', 'oregano', 'basil',
		'vegetable oil', 'canola oil', 'butter', 'vinegar', 'lemon juice', 'soy sauce', 'hot sauce',
		'white pepper', 'coriander', 'chili powder', 'cayenne pepper', 'rosemary', 'parsley', 'bay leaves',
		'cinnamon', 'nutmeg', 'ginger powder', 'turmeric', 'white vinegar', 'apple cider vinegar',
		'balsamic vinegar', 'worcestershire sauce', 'garlic', 'onion', 'fresh ginger', 'green onions', 'shallots',
		'all-purpose flour', 'cornstarch', 'baking powder', 'baking soda', 'sugar', 'brown sugar', 'honey', 'maple syrup',
		'chicken broth', 'vegetable broth', 'beef broth', 'milk'
	])

	const violations: string[] = []

	for (const ingredient of usedIngredients) {
		let isAllowed = false

		// Check exact match in allowed items
		if (allowedSet.has(ingredient)) {
			isAllowed = true
		}

		// Check if ingredient is a pantry basic
		if (pantryBasics.has(ingredient)) {
			isAllowed = true
		}

		// Flexible matching: check if allowed item contains or is contained by ingredient
		if (!isAllowed) {
			for (const allowed of allowedSet) {
				if (ingredient.includes(allowed) || allowed.includes(ingredient)) {
					isAllowed = true
					break
				}
			}
		}

		// Check pantry basics with flexible matching
		if (!isAllowed) {
			for (const pantry of pantryBasics) {
				if (ingredient.includes(pantry) || pantry.includes(ingredient)) {
					isAllowed = true
					break
				}
			}
		}

		// Check base ingredient matching (handles "lime juice" when "limes" is available)
		if (!isAllowed) {
			const ingredientBase = extractBaseIngredient(ingredient)
			if (allowedBaseSet.has(ingredientBase)) {
				isAllowed = true
			}
		}

		if (!isAllowed) {
			violations.push(ingredient)
		}
	}

	if (violations.length > 0) {
		console.error(`[PreValidation] ❌ CRITICAL: Found ${violations.length} forbidden ingredients in AI response!`)
		console.error('[PreValidation] Forbidden ingredients:', violations.join(', '))
		console.error('[PreValidation] This indicates Claude is attempting to hallucinate ingredients.')
		console.error('[PreValidation] The response will be rejected before JSON parsing.')
		return { valid: false, violations }
	}

	console.log('[PreValidation] ✅ All ingredients passed pre-validation!')
	return { valid: true, violations: [] }
}

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

═══════════════════════════════════════════════════════════
🚫 EXPLICIT FORBIDDEN EXAMPLES - COMMON HALLUCINATIONS 🚫
═══════════════════════════════════════════════════════════

These ingredients are FREQUENTLY HALLUCINATED. DO NOT USE unless explicitly found in your grocery list above:

🚫 STRICTLY FORBIDDEN (Hallucination Risk):
- Banana, berries, strawberries, blueberries, raspberries
- Milk, yogurt, Greek yogurt, cream, sour cream
- Eggs, egg whites, egg yolks
- Bread, toast, bagels, baguettes, pita, naan, wraps, flour tortillas
- Pasta, spaghetti, noodles, lasagna sheets
- Rice, risotto, brown rice, white rice, quinoa
- Cheese (all types), feta, cheddar, mozzarella, parmesan
- Avocado (ONLY if explicitly in your list above)
- Chickpeas, kidney beans, black beans, white beans, lentils
- Peanut butter, almond butter, cashews, walnuts, pecans, almonds
- Mushrooms, portobello, shiitake
- Bell peppers, sweet peppers, chili peppers
- Salmon, shrimp, tuna, cod, any fish not listed
- Honey, maple syrup, agave nectar
- Sesame oil, peanut oil, coconut oil (unless listed)
- Ginger, turmeric, cumin (beyond basic spices)

═══════════════════════════════════════════════════════════
✅ TWO-STEP VALIDATION PROCESS
═══════════════════════════════════════════════════════════

STEP 1 - VERIFICATION: Before using ANY ingredient in a recipe, you MUST:
  a) Check if it appears in the GROCERY LIST above
  b) If NOT in the list → DO NOT USE
  c) If in the list → Proceed to step 2

STEP 2 - CONFIRMATION: For every meal, mentally verify:
  ✅ All ingredients are on the grocery list
  ❌ NO items from the forbidden list above
  ✅ Only basic pantry staples added (salt, pepper, oil, garlic powder, etc.)

═══════════════════════════════════════════════════════════
❌ REJECTED EXAMPLE (HALLUCINATION ERROR)
═══════════════════════════════════════════════════════════

❌ WRONG - "Peanut Butter Banana Oatmeal"
- Contains: Banana (hallucinated - was NOT in list)
- Contains: Peanut Butter (hallucinated - was NOT in list)
- Contains: Oats (hallucinated - was NOT in list)
WHY REJECTED: Uses 3 items not in the provided grocery list. This violates the core rule.

═══════════════════════════════════════════════════════════
✅ ACCEPTED EXAMPLE (CORRECT USAGE)
═══════════════════════════════════════════════════════════

✅ CORRECT - "Lemon Peanut Butter Chicken"
- Contains: Lemon (✅ verified on grocery list)
- Contains: Peanut Butter (✅ verified on grocery list - was included above)
- Contains: Chicken (✅ verified on grocery list)
- Prepared with: Salt, pepper, olive oil (✅ basic pantry staples)
WHY ACCEPTED: Uses ONLY ingredients that are either on the grocery list or standard pantry items.

═══════════════════════════════════════════════════════════
⚠️ FINAL WARNING - NON-NEGOTIABLE
═══════════════════════════════════════════════════════════

🛑 ANY MEAL PLAN CONTAINING INGREDIENTS NOT ON THE LIST ABOVE WILL BE AUTOMATICALLY REJECTED 🛑

Before generating recipes:
1. Look at the grocery list (20-30 items typically)
2. Work ONLY with those items
3. Combine them creatively with basic pantry staples
4. If the list seems limited, make variations (e.g., 3 different chicken recipes)
5. NEVER add "helpful" ingredients thinking they're normal to include

Your job: Creative meal planning with CONSTRAINTS, not unlimited cooking.

✅ STRATEGY:
- For each meal, pick 2-3 items from the list above + basic pantry staples
- Create realistic recipes combining these exact items
- DO NOT mention or use any ingredient not listed
- If you can't make 5 days with available items, create variations of the same core ingredients
- Example: Day 1 rotisserie chicken salad, Day 2 rotisserie chicken wrap, Day 3 rotisserie chicken soup, etc.

Recipe requirements:
- Real recipe names (searchable on cooking sites)
- Exactly 4-8 detailed instruction steps, returned as an ARRAY of strings
- Include cooking times and techniques
- Be specific: "dice into 1/4 inch pieces", "sauté for 5-7 minutes until golden"
- Include exactly 2-3 "Tips" as an ARRAY of strings. These MUST be recipe-specific, not generic:
  * Each tip must reference actual ingredients used in this recipe by name
  * Tips should address: what commonly goes wrong with this dish, a technique that improves it, or a smart way to use a specific ingredient here
  * BAD tip (reject these): "Season to taste", "Store leftovers in the fridge", "Adjust spices as desired"
  * GOOD tip example: "Zucchini releases a lot of moisture — pat it completely dry before adding to the pan or your dish will be watery"
  * GOOD tip example: "The pork loin will seize up if overcooked — pull it at 145°F internal and let it rest 5 minutes before slicing"
  * Think like a chef who has made this exact dish before and knows where home cooks go wrong
- MANDATORY: The VERY LAST step of EVERY recipe's instructions array MUST be exactly "ENJOY!❤️"
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
        "instructions": ["Step 1 content", "Step 2 content", "ENJOY!❤️"],
        "ingredients": ["item 1", "item 2"],
        "tips": ["Tip 1", "Tip 2"],
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
		let instructions: string[] = []
		if (Array.isArray(meal.instructions)) {
			instructions = meal.instructions.map(String)
		} else if (typeof meal.instructions === 'string') {
			instructions = meal.instructions.split('\n').map(s => s.trim()).filter(Boolean)
			// Remove step numbers if they exist
			instructions = instructions.map(s => s.replace(/^\d+\.\s*/, ''))
		}

		const tips = Array.isArray(meal.tips) ? meal.tips.map(String) : []
		const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients.map(String) : []

		// Ensure "ENJOY!❤️" is at the end
		if (instructions.length > 0 && !instructions[instructions.length - 1].includes('ENJOY!')) {
			instructions.push('ENJOY!❤️')
		} else if (instructions.length === 0) {
			instructions = ['Prepare according to recipe.', 'ENJOY!❤️']
		}

		// Validation: Warn if instructions are too short (likely vague)
		if (instructions.join(' ').length < 50) {
			console.warn(`[Coerce] ⚠️ Instructions too short (<50 chars) for ${context}: "${instructions.join(' ')}"`)
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
			instructions,
			ingredients,
			tips: tips.length > 0 ? tips : undefined
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
	// Fallback for old formats
	return {
		title: fallbackTitle,
		prepTime: 10,
		cookTime: 10,
		totalTime: 20,
		instructions: ['Prepare according to recipe.', 'ENJOY!❤️'],
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

function extractBaseIngredient(ingredient: string): string {
	// Strip common modifiers and processing methods to get the base ingredient
	// "lime juice" → "lime", "shredded chicken" → "chicken", etc.
	const modifiers = [
		'juice', 'juiced', 'zest', 'zested',
		'sauce', 'paste', 'powder', 'ground', 'minced', 'diced', 'sliced', 'chopped', 'shredded', 'grated',
		'cooked', 'grilled', 'roasted', 'baked', 'fried', 'sautéed', 'steamed', 'boiled',
		'fresh', 'dried', 'raw', 'blanched', 'caramelized', 'candied', 'crushed', 'mashed',
		'oil', 'water', 'broth', 'extract', 'distilled',
		'large', 'medium', 'small', 'whole', 'half', 'halved',
		'tbsp', 'tsp', 'cup', 'cups', 'oz', 'lb', 'g', 'ml', 'clove', 'cloves', 'can', 'cans', 'package', 'pkg', 'slice', 'slices',
	]

	let base = ingredient.toLowerCase().trim()

	// Remove quantities and measurements
	base = base.replace(/\d+(\.\d+)?/g, '') // Remove numbers
		.replace(/\s*[\(\[].*?[\)\]]/g, '') // Remove parenthetical info

	// Remove each modifier word
	for (const modifier of modifiers) {
		const regex = new RegExp(`\\b${modifier}\\b`, 'g')
		base = base.replace(regex, ' ')
	}

	// Clean up extra spaces
	base = base.trim().replace(/\s+/g, ' ')

	return base
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

	// 2. Check Grocery List - exact and substring matching
	for (const allowed of allowedItems) {
		const lowerAllowed = allowed.toLowerCase()
		if (lowerIngredient === lowerAllowed ||
			lowerIngredient.includes(lowerAllowed) ||
			lowerAllowed.includes(lowerIngredient)) {
			return true
		}
	}

	// 3. Check Grocery List - base ingredient matching
	// This handles cases like "lime juice" when we have "limes" in the list
	const baseIngredient = extractBaseIngredient(ingredient)
	for (const allowed of allowedItems) {
		const baseAllowed = extractBaseIngredient(allowed)
		// Match if bases are close enough
		if (baseIngredient === baseAllowed ||
			(baseIngredient.length > 2 && baseAllowed.length > 2 &&
				(baseIngredient.includes(baseAllowed) || baseAllowed.includes(baseIngredient)))) {
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
			const fullInstructions = meal.instructions.join(' ')
			if (fullInstructions.length < 100) {
				console.warn(`[Quality] Instructions too short (${fullInstructions.length} chars): "${meal.title}"`)
				warnings++
			}

			// Check number of steps
			const stepCount = meal.instructions.length
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
	const fullInstructionsScore = meal.instructions.join(' ')
	if (fullInstructionsScore.length >= 200) score += 20
	else if (fullInstructionsScore.length >= 100) score += 10

	// Number of steps (20 points)
	const stepCountScore = meal.instructions.length
	if (stepCountScore >= 6) score += 20
	else if (stepCountScore >= 4) score += 15
	else if (stepCountScore >= 3) score += 10

	// Ingredient count (15 points)
	if (meal.ingredients.length >= 5) score += 15
	else if (meal.ingredients.length >= 3) score += 10

	// Nutrition data present (15 points)
	if (meal.nutrition && meal.nutrition.calories > 0) score += 15

	// Cooking techniques used (10 points)
	const techniques = ['sauté', 'roast', 'grill', 'bake', 'simmer', 'fry', 'steam']
	const hasTechnique = techniques.some(t => meal.instructions.join(' ').toLowerCase().includes(t))
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

async function callClaude(prompt: string, diet: DietType, items: string[]): Promise<{ totalDays: number; days: DayMeals[] } | null> {
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

		// SANITIZE JSON: escape unescaped control characters that Claude sometimes includes
		const sanitized = content
			.replace(/[\r\n]+/g, ' ') // Replace newlines with space
			.replace(/[\t]+/g, ' ')   // Replace tabs with space
			.replace(/[\x00-\x1F\x7F]/g, ' ') // Remove ASCII control characters

		// PRE-VALIDATION: Check for hallucinated ingredients BEFORE parsing JSON
		console.log('[Claude] ========== PRE-VALIDATION: Checking for ingredient hallucinations ==========')
		const preValidation = preValidateIngredients(content, items)

		if (!preValidation.valid) {
			console.error('[Claude] ❌ PRE-VALIDATION FAILED')
			console.error(`[Claude] The AI response contains ${preValidation.violations.length} forbidden ingredients:`)
			console.error(`[Claude] ${preValidation.violations.join(', ')}`)
			console.error('[Claude] Rejecting response to prevent hallucinated meal plans.')
			throw new Error(`Pre-validation failed: Detected ${preValidation.violations.length} hallucinated ingredients: ${preValidation.violations.join(', ')}`)
		}

		console.log('[Claude] ✅ PRE-VALIDATION PASSED - All ingredients are allowed')

		// Claude sometimes adds markdown code fences, strip them
		const cleaned = sanitized.replace(/```json\n?|\n?```/g, '').trim()

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

async function callGroq(prompt: string, diet: DietType, items: string[]): Promise<{ totalDays: number; days: DayMeals[] } | null> {
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

		// SANITIZE JSON: escape unescaped control characters
		const sanitized = content
			.replace(/[\r\n]+/g, ' ') // Replace newlines with space
			.replace(/[\t]+/g, ' ')   // Replace tabs with space
			.replace(/[\x00-\x1F\x7F]/g, ' ') // Remove ASCII control characters

		// PRE-VALIDATION: Check for hallucinated ingredients BEFORE parsing JSON
		console.log('[Groq] ========== PRE-VALIDATION: Checking for ingredient hallucinations ==========')
		const preValidation = preValidateIngredients(content, items)

		if (!preValidation.valid) {
			console.error('[Groq] ❌ PRE-VALIDATION FAILED')
			console.error(`[Groq] The AI response contains ${preValidation.violations.length} forbidden ingredients:`)
			console.error(`[Groq] ${preValidation.violations.join(', ')}`)
			console.error('[Groq] Rejecting response to prevent hallucinated meal plans.')
			throw new Error(`Pre-validation failed: Detected ${preValidation.violations.length} hallucinated ingredients: ${preValidation.violations.join(', ')}`)
		}

		console.log('[Groq] ✅ PRE-VALIDATION PASSED - All ingredients are allowed')

		const parsed = JSON.parse(sanitized)
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

async function callAI(prompt: string, diet: DietType, items: string[]): Promise<{ totalDays: number; days: DayMeals[] } | null> {
	console.log('[AI] ========== STARTING AI CALL WITH CLAUDE (PRIMARY) ==========')

	// Priority 1: Claude Haiku ($0.25 per 1M tokens - super cheap, ~$0.0005 per meal plan)
	console.log('[AI] Trying Claude API (Primary)...')
	const claudeResult = await callClaude(prompt, diet, items)
	if (claudeResult && claudeResult.totalDays && claudeResult.days.length) {
		console.log('[AI] ✅ Claude succeeded! Using Claude result.')
		return claudeResult
	}
	console.log('[AI] ❌ Claude failed or unavailable.')

	// Priority 2: Groq (unlimited free)
	console.log('[AI] Trying Groq API (Fallback)...')
	const groqResult = await callGroq(prompt, diet, items)
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
		const instructions = [
			`Prepare your ingredients: gather ${protein}, ${grain}${extra ? `, and ${extra}` : ''}.`,
			`Heat a non-stick skillet over medium heat with a knob of butter.`,
			`Cook ${protein} for 5-7 minutes, seasoning with salt and pepper, until fully cooked or heated through.`,
			`Meanwhile, prepare ${grain} according to package instructions or toast until golden brown.`,
			`Plate the ${protein} alongside the ${grain}.`,
			extra ? `Finish by adding ${extra} on top or on the side.` : 'Serve hot and enjoy your balanced breakfast.',
			'ENJOY!❤️'
		]

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
		const instructions = [
			`Wash and chop ${veggie} into bite-sized pieces.`,
			`If raw, season ${protein} with salt and pepper, then cook in a pan with olive oil over medium-high heat for 6-8 minutes until golden and cooked through.`,
			`Prepare ${base} (if needed) or warm up if pre-cooked.`,
			`In a large bowl, combine the ${base}, ${veggie}, and cooked ${protein}.`,
			`Drizzle with ${fat === 'Olive Oil' ? 'extra olive oil' : fat} and a splash of lemon juice.`,
			`Toss everything gently to combine and season with extra salt or pepper if needed.`,
			'ENJOY!❤️'
		]

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
		const instructions = [
			`Preheat your oven to 400°F (200°C) or heat a large skillet over medium-high heat.`,
			`Pat ${protein} dry and season generously with salt, pepper, and dried herbs.`,
			`Toss ${veg1} and ${veg2} with olive oil, minced garlic, salt, and pepper.`,
			`If baking: Arrange everything on a sheet pan and roast for 20-25 minutes until ${protein} is cooked through and veggies are tender.`,
			`If sautéing: Cook ${protein} in the skillet for 4-5 minutes per side, then remove. Add veggies to the same pan and sauté for 8-10 minutes until soft.`,
			`Plate the ${protein} alongside the roasted vegetables and drizzle with any pan juices before serving.`,
			'ENJOY!❤️'
		]

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

// Expanded forbidden patterns per diet (more thorough than DIET_STRICT)
const DIET_FILTER_PATTERNS: Record<DietType, string[]> = {
	Paleo: [
		'pasta', 'noodle', 'spaghetti', 'bread', 'tortilla', 'wrap', 'pita', 'bagel',
		'rice', 'quinoa', 'oat', 'oats', 'cereal', 'cracker', 'mix', 'flour', 'grain',
		'beans', 'bean', 'lentil', 'chickpea', 'pea', 'peas', 'hummus', 'soy', 'tofu',
		'peanut', 'legume', 'edamame',
		'milk', 'cheese', 'yogurt', 'cream', 'butter', 'dairy', 'whey',
		'fries', 'chips', 'processed', 'refined',
	],
	Keto: [
		'bread', 'tortilla', 'pasta', 'rice', 'quinoa', 'oat', 'oats', 'grain', 'flour', 'cereal',
		'potato', 'potatoes', 'sweet potato', 'yam',
		'beans', 'bean', 'lentil', 'chickpea',
		'apple', 'banana', 'grape', 'mango', 'orange', 'pear',
		'sugar', 'honey', 'syrup', 'juice',
		'fries',
	],
	Vegan: [
		'chicken', 'beef', 'pork', 'turkey', 'ham', 'bacon', 'sausage', 'lamb',
		'fish', 'salmon', 'tuna', 'shrimp', 'cod', 'tilapia',
		'egg', 'eggs',
		'milk', 'cheese', 'yogurt', 'cream', 'butter', 'whey', 'casein', 'ghee',
		'honey', 'gelatin',
	],
	Vegetarian: [
		'chicken', 'beef', 'pork', 'turkey', 'ham', 'bacon', 'sausage', 'lamb',
		'fish', 'salmon', 'tuna', 'shrimp', 'cod', 'tilapia',
		'gelatin',
	],
	'Low-Carb': [
		'bread', 'pasta', 'rice', 'potato', 'potatoes', 'tortilla', 'wrap',
		'oat', 'oats', 'cereal', 'grain', 'quinoa',
		'sugar', 'honey', 'syrup', 'juice',
		'banana', 'grape', 'mango',
		'fries', 'chips',
	],
	'High-Protein': [], // No hard exclusions
	Balanced: [],       // No hard exclusions
	Mediterranean: [],  // Very permissive — no hard exclusions needed
}

function filterItemsByDiet(items: string[], diet: DietType): {
	compliant: string[]
	excluded: string[]
} {
	const patterns = DIET_FILTER_PATTERNS[diet]
	if (!patterns || patterns.length === 0) {
		return { compliant: items, excluded: [] }
	}

	const compliant: string[] = []
	const excluded: string[] = []

	for (const item of items) {
		const lowerItem = item.toLowerCase()
		const isForbidden = patterns.some(pattern => lowerItem.includes(pattern))

		if (isForbidden) {
			excluded.push(item)
		} else {
			compliant.push(item)
		}
	}

	if (excluded.length > 0) {
		console.log(`[DietFilter] Removed ${excluded.length} non-compliant items for ${diet}:`, excluded)
	}

	return { compliant, excluded }
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

	// 🔑 Filter items that violate the selected diet BEFORE sending to AI
	const { compliant: dietItems, excluded: dietExcluded } = filterItemsByDiet(cleanedItems, diet)
	console.log(`[Generator] Diet-compliant items for ${diet}: ${dietItems.length}/${cleanedItems.length}`)
	if (dietExcluded.length > 0) {
		console.log(`[Generator] Excluded non-${diet} items:`, dietExcluded)
	}

	// Use dietItems (not cleanedItems) for everything below
	const effectiveItems = dietItems.length >= 3 ? dietItems : cleanedItems // safety fallback
	console.log(`[Generator] Using ${effectiveItems.length} items for prompt (fallback: ${effectiveItems === cleanedItems})`)

	const isRestrictiveDiet = ['paleo', 'keto', 'vegan', 'mediterranean', 'vegetarian', 'low-carb'].includes(diet.toLowerCase())
	let effectiveDays = days || 3
	if (isRestrictiveDiet && effectiveItems.length < effectiveDays * 3) {
		const maxDays = Math.max(1, Math.floor(effectiveItems.length / 3))
		if (maxDays < effectiveDays) {
			console.log(`[Generator] ⚠️ Restrictive diet (${diet}) with ${effectiveItems.length} items. Reducing days from ${effectiveDays} to ${maxDays}`)
			effectiveDays = maxDays
		}
	}
	console.log(`[Generator] Requesting ${effectiveDays} days for diet: ${diet} (items available: ${effectiveItems.length})`)

	const prompt = buildPrompt(effectiveItems, diet, effectiveDays)
	console.log('[Generator] Prompt includes days instruction:', days ? `Generate exactly ${days} complete days` : 'Auto-determine days')
	console.log('[Generator] Prompt length:', prompt.length, 'characters')

	// Use the new AI caller with priority fallback (Gemini -> Groq -> Fallback)
	// Pass effectiveItems for ingredient pre-validation
	const aiResult = await callAI(prompt, diet, effectiveItems)
	console.log('[Generator] AI result:', aiResult)
	console.log('[Generator] AI result totalDays:', aiResult?.totalDays)
	console.log('[Generator] AI result days count:', aiResult?.days?.length)

	if (aiResult && aiResult.totalDays && aiResult.days.length) {
		if (days && aiResult.days.length < days) {
			console.warn(`[Generator] AI returned ${aiResult.days.length} days but ${days} were requested`)
		}

		const validation = validateIngredientUsage(aiResult, effectiveItems)
		if (!validation.isValid) {
			console.error('[Generator] AI used ingredients not in grocery list:', validation.violations)
			console.error('[Generator] Available ingredients were:', effectiveItems)
			console.warn(`[Generator] Rejecting AI plan due to ${validation.violations.length} ingredient violations`)
			console.warn(`[Generator] Hallucinated ingredients: ${validation.hallucinatedIngredients.join(', ')}`)
			console.warn(`[Generator] Falling back to safe plan.`)
		} else {
			logUnusedIngredients(aiResult, effectiveItems)
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
	return buildFallbackPlan(effectiveItems, diet, sourceText, days)
}