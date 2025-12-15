import Tesseract from 'tesseract.js'
import type { DietType, GenerateMealPlanParams, MealPlanResult, DayMeals, Meal, OcrResult } from '../utils/types'
import { SAMPLE_PLAN } from '../utils/samplePlan'
import { extractGroceryItems, cleanGroceryList } from '../utils/grocery'

const OPENAI_BASE_URL = 'https://api.openai.com/v1'
const OPENAI_MODEL = 'gpt-4o-mini'

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
		},
		tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-., '
	})
	const rawText = data.text ?? ''
	const confidence = data.confidence
	console.log('[OCR] Raw extracted text:', rawText)
	console.log('[OCR] Raw text lines:', rawText.split(/\r?\n/).filter(l => l.trim()))
	const items = extractGroceryItems(rawText)
	console.log('[OCR] Completed. Confidence:', confidence, 'Raw length:', rawText.length)
	console.log('[OCR] Extracted items count:', items.length)
	console.log('[OCR] Extracted items:', items)
	return { items, rawText, confidence }
}

function buildPrompt(items: string[], diet: DietType, days?: number): string {
	const itemsList = items.map((item, index) => `${index + 1}. ${item}`).join('\n')
	console.log('[Prompt] Building prompt with', items.length, 'items')
	console.log('[Prompt] Items being sent to AI:', items)
	console.log('[Prompt] Items list:', itemsList)
	
	// Build a prompt that includes strict NEVER/ALWAYS rules for the selected diet
	const strict = DIET_STRICT[diet]
	const neverList = strict?.never?.length ? `NEVER include: ${strict.never.join(', ')}` : ''
	const alwaysList = strict?.always?.length ? `ALWAYS include where appropriate: ${strict.always.join(', ')}` : ''
	const notes = strict?.notes ? `Notes: ${strict.notes}` : ''

	return [
		'You are a registered dietitian crafting realistic meal plans. STRICTLY follow the diet rules listed for the chosen diet. Do not violate the NEVER lists.',
		`Diet focus: ${diet}. ${DIET_RULES[diet]}`,
		neverList,
		alwaysList,
		notes,
		'',
		'⚠️ CRITICAL INGREDIENT RESTRICTION ⚠️',
		'You MUST use ONLY the grocery items listed below. Do NOT invent, add, or substitute any ingredients.',
		'Do NOT use ingredients that are not in the list below, even if they are common or healthy.',
		'If an ingredient is not listed below, you CANNOT use it in any meal.',
		'Every ingredient in every meal MUST come from this list:',
		'',
		'GROCERY ITEMS AVAILABLE (use ONLY these):',
		itemsList,
		'',
		'⚠️ REMINDER: Use ONLY the items above. Do NOT add anything else. ⚠️',
		'',
		'Make meals practical, varied, and realistic:',
		'- Do NOT use the same primary protein twice in the same day (e.g., do not serve chicken for both lunch and dinner on the same day).',
		'- Within a single day, Breakfast, Lunch, and Dinner should each have a different primary ingredient focus (for example: eggs for breakfast, chicken for lunch, beans or tofu for dinner).',
		'- Vary cooking methods across meals (grilled, baked, sautéed, roasted, raw/salad, stir-fry, baked, pan-seared).',
		"- Distribute ingredients evenly across days; don't exhaust a scarce ingredient (like avocado or seafood) on day 1 unless quantity clearly allows.",
		'- Avoid strange or unlikely combinations; each meal should feel like something a typical home cook would actually make with 5–8 ingredients.',
		'- Use reasonable portions and stretch expensive or limited items (like seafood, steak, or specialty cheeses) across multiple days instead of repeating them in every meal.',
		'',
		'Time estimation guidelines:',
		'- Prep time: Time to prepare ingredients (chopping, measuring, etc.)',
		'- Cook time: Time actively cooking (stovetop, oven, etc.)',
		'- Total time: Prep + Cook time',
		'- Breakfast: Typically 5-15 min prep, 5-15 min cook',
		'- Lunch: Typically 5-20 min prep, 10-25 min cook',
		'- Dinner: Typically 10-25 min prep, 15-45 min cook',
		'',
		'Estimation rules:',
		days ? `- Generate exactly ${days} complete days and distribute ingredients across those days.` : '- Determine how many complete days the ingredients can support (1 to 7 days).',
		'- If the variety or quantity is limited, create fewer days instead of forcing seven.',
		'- Meals must be realistic and avoid repeating the exact same dish more than twice.',
		'- Assume pantry basics like salt, pepper, and water only.',
		'',
		'Output format (JSON only, no commentary):',
		'{',
		'  "totalDays": number,',
		'  "days": [',
		'    {',
		'      "day": "Day 1",',
		'      "Breakfast": {',
		'        "title": "Scrambled Eggs with Tomatoes & Colby Jack",',
		'        "prepTime": 5,',
		'        "cookTime": 5,',
		'        "totalTime": 10,',
		'        "instructions": "Cook the eggs in a non-stick pan, add tomatoes, and add cheese on top until melted.",',
		'        "ingredients": ["eggs", "tomatoes", "colby jack cheese"]',
		'      },',
		'      "Lunch": { ... },',
		'      "Dinner": { ... }',
		'    }',
		'  ]',
		'}',
		'',
		'Requirements:',
		'- "totalDays" must match the number of objects in "days" and be between 1 and 7.',
		'- Each meal title should be concise but descriptive, using title case (e.g., "Turkey & Black Bean Wrap", "Herb-Seasoned Baked Pork Loin").',
		'',
		'⚠️ INGREDIENT REQUIREMENTS (CRITICAL):',
		'- EVERY ingredient in EVERY meal MUST be from the grocery items list above.',
		'- Do NOT use ingredients that are not in the list, even if they are common pantry staples.',
		'- If you need an ingredient that is not listed, you CANNOT use it. Work with what is available.',
		'- Double-check every ingredient in every meal against the grocery items list.',
		'- Each meal must NOT include any items from the NEVER list for this diet.',
		'- If an ingredient would violate the diet, do NOT use it; choose an alternative from the provided items or adjust portioning to avoid violation.',
		'',
		'Other requirements:',
		'- Instructions should be 1-2 sentences describing how to prepare the meal.',
		'- Distribute ingredients so the plan can be completed without running out early. If necessary, include portioning instructions in the instructions field.'
	].join('\n')
}

function coerceMeal(meal: any, fallbackTitle: string): Meal {
	if (meal && typeof meal === 'object' && meal.title) {
		return {
			title: String(meal.title || fallbackTitle),
			prepTime: Number(meal.prepTime) || 5,
			cookTime: Number(meal.cookTime) || 5,
			totalTime: Number(meal.totalTime) || (Number(meal.prepTime) || 5) + (Number(meal.cookTime) || 5),
			instructions: String(meal.instructions || 'Prepare according to recipe.'),
			ingredients: Array.isArray(meal.ingredients) ? meal.ingredients.map(String) : []
		}
	}
	// Fallback for old string format (backward compatibility)
	if (typeof meal === 'string') {
		return {
			title: meal.split('(')[0].trim() || fallbackTitle,
			prepTime: 10,
			cookTime: 10,
			totalTime: 20,
			instructions: meal.includes('(') ? meal.split('(')[1]?.split(')')[0] || 'Prepare according to recipe.' : 'Prepare according to recipe.',
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
	
	// Use the actual array length, respecting the reported totalDays
	const targetDays = Math.max(actualDaysCount, reportedTotalDays || actualDaysCount || 1)
	const safeDays = rawDays.slice(0, Math.min(7, targetDays))
	
	const fallbackDays = ['Day 1','Day 2','Day 3','Day 4','Day 5','Day 6','Day 7']
	const days: DayMeals[] = safeDays.map((d: any, idx: number) => ({
		day: d?.day || fallbackDays[idx],
		Breakfast: coerceMeal(d?.Breakfast, 'Breakfast'),
		Lunch: coerceMeal(d?.Lunch, 'Lunch'),
		Dinner: coerceMeal(d?.Dinner, 'Dinner')
	}))
	
	const finalTotalDays = Math.max(1, Math.min(7, days.length || reportedTotalDays || 1))
	console.log('[Coerce] Final totalDays:', finalTotalDays, 'final days count:', days.length)
	return { totalDays: finalTotalDays, days }
}

function validateIngredientUsage(result: { totalDays: number; days: DayMeals[] }, allowedItems: string[]): string[] {
	const violations: string[] = []
	
	console.log('[Validation] Checking ingredient usage against allowed items:', allowedItems)
	
	for (const day of result.days) {
		for (const mealKey of ['Breakfast','Lunch','Dinner'] as const) {
			const meal = day[mealKey]
			if (!meal || !meal.ingredients) continue
			
			for (const ingredient of meal.ingredients) {
				const lowerIngredient = ingredient.toLowerCase().trim()
				if (!lowerIngredient) continue
				
				// Check if ingredient matches any allowed item (exact or partial)
				let found = false
				for (const allowed of allowedItems) {
					const lowerAllowed = allowed.toLowerCase()
					if (lowerIngredient === lowerAllowed || 
					    lowerIngredient.includes(lowerAllowed) || 
					    lowerAllowed.includes(lowerIngredient)) {
						found = true
						break
					}
				}
				
				// Also check common pantry basics that are always allowed
				const pantryBasics = ['salt', 'pepper', 'water', 'oil', 'olive oil']
				if (pantryBasics.includes(lowerIngredient)) {
					found = true
				}
				
				if (!found) {
					const violation = `${day.day} ${mealKey}: "${ingredient}" not in grocery list`
					violations.push(violation)
					console.warn(`[Validation] ${violation}`)
				}
			}
		}
	}
	
	return violations
}

function validatePlanCompliance(result: { totalDays: number; days: DayMeals[] } | null, diet: DietType, items: string[]): boolean {
	if (!result) return false
	const rules = DIET_STRICT[diet]
	if (!rules) return true

	const forbidden = (rules.never || []).map(s => s.toLowerCase())
	const required = (rules.always || []).map(s => s.toLowerCase())

	const violations: string[] = []

	for (const day of result.days) {
		for (const mealKey of ['Breakfast','Lunch','Dinner'] as const) {
			const meal = day[mealKey]
			if (!meal) continue
			const text = `${meal.title} ${meal.instructions} ${meal.ingredients.join(' ')}`.toLowerCase()
			for (const f of forbidden) {
				if (!f) continue
				// simple substring check
				if (text.includes(f)) {
					violations.push(`${day.day} ${mealKey} contains forbidden term: ${f}`)
				}
			}
		}
		// check required presence per day when defined
		if (required.length) {
			const dayText = `${day.Breakfast.title} ${day.Breakfast.ingredients.join(' ')} ${day.Lunch.title} ${day.Lunch.ingredients.join(' ')} ${day.Dinner.title} ${day.Dinner.ingredients.join(' ')}`.toLowerCase()
			const hasRequired = required.some(r => dayText.includes(r))
			if (!hasRequired) {
				violations.push(`${day.day} is missing required items for ${diet}: needs one of ${required.join(', ')}`)
			}
		}
	}

	if (violations.length) {
		console.error('[Validation] Diet compliance violations detected:', violations)
		return false
	}
	return true
}

async function callOpenAI(prompt: string, diet: DietType): Promise<{ totalDays: number; days: DayMeals[] } | null> {
	console.log('[OpenAI] Sending prompt for diet:', diet)
	const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
	if (!apiKey || apiKey.trim() === '' || apiKey === 'your_key_here') {
		console.warn('[OpenAI] No valid API key found. Using sample fallback.')
		return null
	}
	try {
		const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: OPENAI_MODEL,
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
			throw new Error(`OpenAI HTTP ${res.status}: ${text}`)
		}
		const json = await res.json()
		const content = json.choices?.[0]?.message?.content
		if (!content) throw new Error('Missing content in OpenAI response')
		console.log('[OpenAI] Raw AI response:', content)
		const parsed = JSON.parse(content)
		console.log('[OpenAI] Parsed JSON:', parsed)
		// Note: We can't pass requestedDays here since callOpenAI doesn't receive it
		// The days parameter will be handled in generateMealPlan after coercion
		const coerced = coerceDaysStructure(parsed)
		console.log('[OpenAI] Coerced result - totalDays:', coerced.totalDays, 'days count:', coerced.days.length)
		return coerced
	} catch (err) {
		console.error('[OpenAI] Error:', err)
		return null
	}
}

function buildFallbackPlan(items: string[], diet: DietType, sourceText: string, desiredDays?: number): MealPlanResult {
	const base = SAMPLE_PLAN.days
	const estimatedDays = desiredDays ?? Math.max(1, Math.min(7, Math.round(items.length / 3) || 3))
	const safeDays = Math.max(1, Math.min(7, estimatedDays))
	const days = base.slice(0, safeDays).map((day) => ({ ...day }))
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
	
	// Clean and normalize the provided grocery items before building the prompt
	const cleanedItems = cleanGroceryList(items)
	console.log('[Generator] Cleaned items count:', cleanedItems.length)
	console.log('[Generator] Cleaned items:', cleanedItems)
	
	if (cleanedItems.length === 0) {
		console.error('[Generator] ERROR: All items were filtered out during cleaning!')
		throw new Error('No valid grocery items found after cleaning. The receipt may contain only non-food items.')
	}
	
	const prompt = buildPrompt(cleanedItems, diet, days)
	console.log('[Generator] Prompt includes days instruction:', days ? `Generate exactly ${days} complete days` : 'Auto-determine days')
	console.log('[Generator] Prompt length:', prompt.length, 'characters')
	const aiResult = await callOpenAI(prompt, diet)
	console.log('[Generator] AI result:', aiResult)
	console.log('[Generator] AI result totalDays:', aiResult?.totalDays)
	console.log('[Generator] AI result days count:', aiResult?.days?.length)
	if (aiResult && aiResult.totalDays && aiResult.days.length) {
		// If AI returned fewer days than requested, log a warning
		if (days && aiResult.days.length < days) {
			console.warn(`[Generator] AI returned ${aiResult.days.length} days but ${days} were requested`)
		}
		
		// Validate that AI only used provided ingredients
		const ingredientViolations = validateIngredientUsage(aiResult, cleanedItems)
		if (ingredientViolations.length > 0) {
			console.error('[Generator] AI used ingredients not in grocery list:', ingredientViolations)
			console.error('[Generator] Available ingredients were:', cleanedItems)
			// Still proceed but log the violations
		}
		
		// Validate AI output against strict diet rules
		const ok = validatePlanCompliance(aiResult, diet, items)
		if (ok) {
			// Ensure we have the requested number of days
			let finalDays = aiResult.days
			if (days && aiResult.days.length < days && aiResult.days.length < 7) {
				console.log('[Generator] Padding AI result to requested', days, 'days')
				const fallbackDays = ['Day 1','Day 2','Day 3','Day 4','Day 5','Day 6','Day 7']
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
	console.log('[Generator] Using fallback plan with', days, 'days')
	return buildFallbackPlan(items, diet, sourceText, days)
}


