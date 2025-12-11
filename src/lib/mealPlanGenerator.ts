import Tesseract from 'tesseract.js'
import type { DietType, GenerateMealPlanParams, MealPlanResult, DayMeals, OcrResult } from '../utils/types'
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
	const items = extractGroceryItems(rawText)
	console.log('[OCR] Completed. Confidence:', confidence, 'Raw length:', rawText.length, 'Items:', items)
	return { items, rawText, confidence }
}

function buildPrompt(items: string[], diet: DietType, days?: number): string {
	const itemsList = items.map((item, index) => `${index + 1}. ${item}`).join('\n')
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
		'Use ONLY the following grocery items. Do NOT add anything else:',
		itemsList,
		'',
		'Make meals practical, varied, and realistic:',
		'- Do NOT use the same primary protein twice in the same day (e.g., do not serve chicken for both lunch and dinner on the same day).',
		'- Vary cooking methods across meals (grilled, baked, sautéed, roasted, raw/salad, stir-fry, baked, pan-seared).',
		"- Distribute ingredients evenly across days; don't exhaust a scarce ingredient on day 1 unless quantity allows.",
		'- Each meal should list its main ingredients used from the provided grocery items and include a short 1-2 sentence instruction plus approximate prep time.',
		"- Format each meal string ending with: ' (Prep: X min | Uses: item1, item2, ...)'",
		'Estimation rules:',
		days ? `- Generate exactly ${days} complete days and distribute ingredients across those days.` : '- Determine how many complete days the ingredients can support (1 to 7 days).',
		'- If the variety or quantity is limited, create fewer days instead of forcing seven.',
		'- Meals must be realistic and avoid repeating the exact same dish more than twice.',
		'- Assume pantry basics like salt, pepper, and water only.',
		'Output format (JSON only, no commentary):',
		'{ "totalDays": number, "days": [ { "day": "Day 1", "Breakfast": "... (Prep: 10 min | Uses: eggs, onion)", "Lunch": "... (Prep: 15 min | Uses: chicken, lettuce)", "Dinner": "... (Prep: 25 min | Uses: salmon, broccoli)" } ] }',
		'Requirements:',
		'- "totalDays" must match the number of objects in "days" and be between 1 and 7.',
		'- Each meal must reference only the provided grocery items and must NOT include any items from the NEVER list for this diet.',
		'- If an ingredient would violate the diet, do NOT use it; choose an alternative from the provided items or adjust portioning to avoid violation.',
		'- Mention portioning where helpful to stretch ingredients.',
		'- Distribute ingredients so the plan can be completed without running out early. If necessary, include portioning instructions.'
	].join('\n')
}

function coerceDaysStructure(raw: any): { totalDays: number; days: DayMeals[] } {
	if (!raw) return { totalDays: 0, days: [] }
	const totalDays = Number(raw.totalDays) || (Array.isArray(raw.days) ? raw.days.length : 0)
	const fallbackDays = ['Day 1','Day 2','Day 3','Day 4','Day 5','Day 6','Day 7']
	const rawDays = Array.isArray(raw.days) ? raw.days : []
	const safeDays = rawDays.slice(0, Math.min(7, rawDays.length || totalDays || 7))
	const days: DayMeals[] = safeDays.map((d: any, idx: number) => ({
		day: d?.day || fallbackDays[idx],
		Breakfast: d?.Breakfast || 'Breakfast based on provided items',
		Lunch: d?.Lunch || 'Lunch based on provided items',
		Dinner: d?.Dinner || 'Dinner based on provided items'
	}))
	return { totalDays: Math.max(1, Math.min(7, days.length || totalDays || 0)), days }
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
			const meal = (day as any)[mealKey] as string
			if (!meal) continue
			const text = meal.toLowerCase()
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
			const dayText = `${day.Breakfast} ${day.Lunch} ${day.Dinner}`.toLowerCase()
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
		const parsed = JSON.parse(content)
		return coerceDaysStructure(parsed)
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
	if (!items.length) {
		throw new Error('No grocery items found. Try a clearer photo.')
	}
	// Clean and normalize the provided grocery items before building the prompt
	const cleanedItems = cleanGroceryList(items)
	const prompt = buildPrompt(cleanedItems, diet, days)
	const aiResult = await callOpenAI(prompt, diet)
	if (aiResult && aiResult.totalDays && aiResult.days.length) {
		// Validate AI output against strict diet rules
		const ok = validatePlanCompliance(aiResult, diet, items)
		if (ok) {
			return {
				sourceItems: items,
				sourceText,
				diet,
				totalDays: aiResult.totalDays,
				days: aiResult.days
			}
		}
		console.warn('[Generator] AI result failed diet validation — falling back to safe plan')
	}
	return buildFallbackPlan(items, diet, sourceText, days)
}


