import Tesseract from 'tesseract.js'
import type { DietType, GenerateMealPlanParams, MealPlanResult, DayMeals, OcrResult } from '../utils/types'
import { SAMPLE_PLAN } from '../utils/samplePlan'
import { extractGroceryItems } from '../utils/grocery'

const OPENAI_BASE_URL = 'https://api.openai.com/v1'
const OPENAI_MODEL = 'gpt-4o-mini'

const DIET_RULES: Record<DietType, string> = {
	Keto: 'Keep net carbohydrates under 20g per day, prioritize healthy fats, moderate protein, and avoid grains, sugar, and starchy produce.',
	Paleo: 'Exclude all grains, legumes, dairy, refined sugar, and processed foods. Focus on meats, vegetables, fruits, nuts, and healthy fats.',
	Vegan: 'Meals must be 100% plant-based. No meat, fish, eggs, dairy, or animal-derived products.',
	Vegetarian: 'No meat or fish. Include eggs and dairy only if ingredients are available.',
	'Low-Carb': 'Limit carbohydrate-rich items. Center meals around proteins, vegetables, and healthy fats.',
	'High-Protein': 'Emphasize high-quality protein sources in every meal with supporting vegetables or low-carb sides.',
	Balanced: 'Create nutritionally balanced meals with protein, healthy fats, and complex carbohydrates.'
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

function buildPrompt(items: string[], diet: DietType): string {
	const itemsList = items.map((item, index) => `${index + 1}. ${item}`).join('\n')
	return [
		'You are a registered dietitian crafting realistic meal plans.',
		`Diet focus: ${diet}. ${DIET_RULES[diet]}`,
		'Use ONLY the following grocery items. Do NOT add anything else:',
		itemsList,
		'Estimation rules:',
		'- Determine how many complete days the ingredients can support (1 to 7 days).',
		'- If the variety or quantity is limited, create fewer days instead of forcing seven.',
		'- Meals must be realistic and avoid repeating the exact same dish more than twice.',
		'- Assume pantry basics like salt, pepper, and water only.',
		'Output format (JSON only, no commentary):',
		'{ "totalDays": number, "days": [ { "day": "Day 1", "Breakfast": "...", "Lunch": "...", "Dinner": "..." } ] }',
		'Requirements:',
		'- "totalDays" must match the number of objects in "days" and be between 1 and 7.',
		'- Each meal must reference only the provided grocery items.',
		'- Mention portioning where helpful to stretch ingredients.'
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

function buildFallbackPlan(items: string[], diet: DietType, sourceText: string): MealPlanResult {
	const base = SAMPLE_PLAN.days
	const estimatedDays = Math.max(1, Math.min(7, Math.round(items.length / 3) || 3))
	const days = base.slice(0, estimatedDays).map((day) => ({ ...day }))
	return {
		sourceItems: items,
		sourceText,
		diet,
		totalDays: days.length,
		days
	}
}

export async function generateMealPlan(params: GenerateMealPlanParams): Promise<MealPlanResult> {
	const { items, diet, sourceText } = params
	if (!items.length) {
		throw new Error('No grocery items found. Try a clearer photo.')
	}
	const prompt = buildPrompt(items, diet)
	const aiResult = await callOpenAI(prompt, diet)
	if (aiResult && aiResult.totalDays && aiResult.days.length) {
		return {
			sourceItems: items,
			sourceText,
			diet,
			totalDays: aiResult.totalDays,
			days: aiResult.days
		}
	}
	return buildFallbackPlan(items, diet, sourceText)
}


