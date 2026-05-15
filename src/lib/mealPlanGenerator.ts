import Tesseract from 'tesseract.js'
import type { DietType, GenerateMealPlanParams, MealPlanResult, DayMeals, Meal, OcrResult } from '../utils/types'
import { extractGroceryItems, cleanGroceryList } from '../utils/grocery'

// ─── Config ───────────────────────────────────────────────────────────────────

// ─── Diet Rules (concise) ─────────────────────────────────────────────────────
const DIET_RULES: Record<DietType, string> = {
  Keto: 'High fat (70%), moderate protein (25%), net carbs <30g/day. NO bread, pasta, rice, beans, starchy veg, or sugary fruit.',
  Paleo: 'Meats, veggies, fruits, nuts, olive oil ONLY. NO grains, legumes, dairy, refined sugar, or processed foods.',
  Vegan: '100% plant-based. NO meat, fish, eggs, dairy, or honey.',
  Vegetarian: 'NO meat or fish. Eggs and dairy are fine.',
  'Low-Carb': 'Protein + veggies + healthy fats. NO bread, pasta, rice, or sugary items.',
  'High-Protein': 'Every meal must have a strong protein source. Minimize empty carbs.',
  Balanced: 'Balanced protein, complex carbs, and healthy fats. Variety across the week.',
  Mediterranean: 'Olive oil, fish, whole grains, legumes, veggies, fruit, nuts. Limit red meat.',
}

// ─── OCR ──────────────────────────────────────────────────────────────────────
export async function runOcrOnFile(file: File): Promise<OcrResult> {
  const { data } = await Tesseract.recognize(file, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        console.log(`[OCR] ${(m.progress * 100).toFixed(0)}%`)
      }
    }
  } as any)
  const rawText = data.text ?? ''
  const items = extractGroceryItems(rawText)
  return { items, rawText, confidence: data.confidence }
}

// ─── Pantry staples (always available) ───────────────────────────────────────
export const PANTRY_STAPLES = [
  'olive oil', 'vegetable oil', 'butter', 'salt', 'black pepper', 'garlic powder',
  'onion powder', 'paprika', 'cumin', 'oregano', 'basil', 'thyme', 'cinnamon',
  'lemon juice', 'lime juice', 'vinegar', 'soy sauce', 'garlic', 'onion',
  'all-purpose flour', 'cornstarch', 'sugar', 'water', 'chicken broth', 'vegetable broth',
]

// ─── Diet-specific forbidden items ───────────────────────────────────────────
const DIET_FORBIDDEN: Partial<Record<DietType, string[]>> = {
  Keto: ['bread', 'pasta', 'rice', 'potato', 'beans', 'tortilla', 'apple', 'banana', 'grapes', 'oats'],
  Paleo: ['bread', 'pasta', 'rice', 'beans', 'peanut', 'milk', 'cheese', 'yogurt', 'butter'],
  Vegan: ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'egg', 'eggs', 'milk', 'cheese', 'yogurt', 'butter', 'honey'],
  Vegetarian: ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp'],
  'Low-Carb': ['bread', 'pasta', 'rice', 'potato', 'tortilla', 'oats', 'sugar', 'honey'],
}

// ─── Prompt Builder (lean & focused) ─────────────────────────────────────────
function buildPrompt(items: string[], diet: DietType, days: number): string {
  const itemsList = items.map((item, i) => `${i + 1}. ${item}`).join('\n')
  const dietRule = DIET_RULES[diet]
  const forbidden = DIET_FORBIDDEN[diet]
  const forbiddenNote = forbidden?.length
    ? `\nFORBIDDEN for ${diet}: ${forbidden.join(', ')}`
    : ''

  return `You are a Michelin-star meal planning chef. Create a ${days}-day ${diet} meal plan.

DIET RULE: ${dietRule}${forbiddenNote}

GROCERY LIST (use ONLY these + basic pantry staples like salt, pepper, oil, garlic):
${itemsList}

CRITICAL CULINARY RULES:
1. Create COHESIVE, REALISTIC meals. Do NOT just throw random ingredients together (e.g., no "Apple and Egg Breakfast" or "Banana Chicken"). If the ingredients don't naturally go together, rely heavily on the pantry staples to bridge them or separate them (e.g., eat the apple as a side).
2. Only use ingredients from the list above + pantry staples. Do NOT add salmon, chickpeas, feta, mushrooms, or any ingredient not listed.
3. Give each recipe an appetizing, standard culinary name. Instead of "Roasted Chicken with Green Bean and Onion", use "Herb-Roasted Chicken with Garlic Green Beans". Instead of "Oatmeal with Peanut Butter", use "Creamy Peanut Butter Oat Porridge". Make it sound delicious without using absurd 5-star restaurant flowery words.
4. Meals must make sense for their time of day (Breakfast, Lunch, Dinner).

Return ONLY valid JSON (no markdown, no commentary):
If ingredients are insufficient to create a meaningful meal for a slot, use null for that slot instead of a placeholder name. Never output a meal named literally 'Lunch', 'Dinner', or 'Breakfast' — these are placeholders and are not acceptable meal names.
{
  "totalDays": ${days},
  "days": [
    {
      "day": "Day 1",
      "Breakfast": {
        "title": "Enticing Recipe Name",
        "instructions": ["Step 1", "Step 2", "ENJOY!❤️"],
        "ingredients": ["ingredient 1", "ingredient 2"],
        "tips": ["Chef tip specific to this recipe"],
        "prepTime": 10,
        "cookTime": 15,
        "totalTime": 25,
        "nutrition": { "calories": 350, "protein": 20, "carbs": 40, "fat": 12, "fiber": 5 }
      },
      "Lunch": { ... },
      "Dinner": { ... }
    }
  ]
}

Requirements per recipe:
- 4-7 detailed instruction steps (last step always "ENJOY!❤️")
- Every ingredient MUST include a specific quantity and unit (e.g. '2 large eggs', '1 tbsp olive oil', '200g chicken breast', '1/2 tsp paprika'). Never list a bare ingredient name without a measurement.
- Chef tips must be specific to the exact technique used in THIS recipe. Never use generic freshness advice like 'use fresh X for best flavor'. Instead give technique tips like timing, temperature, texture cues, or common mistakes to avoid for this specific dish.
- Realistic nutrition data
- Use ingredients creatively — combine them with pantry staples`
}

// ─── Response coercion ────────────────────────────────────────────────────────
function coerceMeal(meal: any, fallbackTitle: string, context: string = ''): Meal {
  if (!meal || typeof meal !== 'object' || !meal.title) {
    return {
      title: fallbackTitle,
      prepTime: 10,
      cookTime: 10,
      totalTime: 20,
      instructions: ['Prepare ingredients.', 'Cook until done.', 'ENJOY!❤️'],
      ingredients: [],
    }
  }

  let instructions: string[] = []
  if (Array.isArray(meal.instructions)) {
    instructions = meal.instructions.map(String)
  } else if (typeof meal.instructions === 'string') {
    instructions = meal.instructions.split('\n').map((s: string) => s.trim().replace(/^\d+\.\s*/, '')).filter(Boolean)
  }

  if (!instructions.some(s => s.includes('ENJOY!'))) {
    instructions.push('ENJOY!❤️')
  }
  if (instructions.length === 0) {
    instructions = ['Prepare and cook ingredients.', 'ENJOY!❤️']
  }

  const tips = Array.isArray(meal.tips) ? meal.tips.map(String) : []
  const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients.map(String) : []

  const baseMeal: Meal = {
    title: String(meal.title),
    prepTime: Number(meal.prepTime) || 5,
    cookTime: Number(meal.cookTime) || 10,
    totalTime: Number(meal.totalTime) || (Number(meal.prepTime) || 5) + (Number(meal.cookTime) || 10),
    instructions,
    ingredients,
    tips: tips.length > 0 ? tips : undefined,
  }

  if (meal.nutrition && typeof meal.nutrition === 'object') {
    baseMeal.nutrition = {
      calories: Number(meal.nutrition.calories) || 400,
      protein: Number(meal.nutrition.protein) || 20,
      carbs: Number(meal.nutrition.carbs) || 40,
      fat: Number(meal.nutrition.fat) || 15,
      fiber: meal.nutrition.fiber !== undefined ? Number(meal.nutrition.fiber) : undefined,
    }
  }

  return baseMeal
}

function coerceDaysStructure(raw: any): { totalDays: number; days: DayMeals[] } {
  if (!raw) return { totalDays: 0, days: [] }

  const rawDays = Array.isArray(raw.days) ? raw.days : []
  const fallbackNames = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']

  const days: DayMeals[] = rawDays.slice(0, 7).map((d: any, idx: number) => ({
    day: d?.day || fallbackNames[idx],
    Breakfast: coerceMeal(d?.Breakfast, 'Breakfast', `Day ${idx + 1} Breakfast`),
    Lunch: coerceMeal(d?.Lunch, 'Lunch', `Day ${idx + 1} Lunch`),
    Dinner: coerceMeal(d?.Dinner, 'Dinner', `Day ${idx + 1} Dinner`),
  }))

  return {
    totalDays: Math.max(1, days.length),
    days,
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validatePlan(plan: { days: DayMeals[] }, allowedItems: string[]): boolean {
  const forbidden = PANTRY_STAPLES // always allowed
  let violations = 0

  for (const day of plan.days) {
    for (const mealType of ['Breakfast', 'Lunch', 'Dinner'] as const) {
      const meal = day[mealType]
      for (const ingredient of meal.ingredients) {
        const lower = ingredient.toLowerCase()
        const isAllowed =
          allowedItems.some(a => lower.includes(a.toLowerCase()) || a.toLowerCase().includes(lower)) ||
          PANTRY_STAPLES.some(s => lower.includes(s))
        if (!isAllowed) violations++
      }
    }
  }

  if (violations > 5) {
    console.warn(`[Validation] ${violations} ingredient violations — rejecting plan`)
    return false
  }
  return true
}

// ─── AI Callers ───────────────────────────────────────────────────────────────
async function callClaude(prompt: string): Promise<{ totalDays: number; days: DayMeals[] } | null> {
  console.log('[Claude] Calling backend proxy...')
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
  try {
    const response = await fetch(`${backendUrl}/api/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(40000),
    })

    if (!response.ok) throw new Error(`Backend HTTP ${response.status}`)

    const json = await response.json()
    
    let content: string
    if (json.content && Array.isArray(json.content)) {
      const textBlock = json.content.find((b: any) => b.type === 'text')
      content = textBlock?.text || json.content[0]?.text || ''
    } else if (typeof json.content === 'string') {
      content = json.content
    } else {
      content = ''
    }
    
    if (!content) {
      console.warn('[Claude] Empty response content')
      return null
    }

    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    const result = coerceDaysStructure(parsed)
    console.log('[Claude] ✅ Success —', result.days.length, 'days')
    return result
  } catch (err) {
    console.error('[Claude] ❌', err)
    return null
  }
}

async function callGroq(prompt: string): Promise<{ totalDays: number; days: DayMeals[] } | null> {
  console.log('[Groq] Calling backend proxy...')
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

  try {
    const res = await fetch(`${backendUrl}/api/groq`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You output JSON only. No markdown fences. No commentary.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(15000), // 15s timeout
    })

    if (!res.ok) throw new Error(`Groq HTTP ${res.status}`)

    const json = await res.json()
    const content = json.choices?.[0]?.message?.content
    if (!content) throw new Error('Missing content in Groq response')

    const parsed = JSON.parse(content)
    const result = coerceDaysStructure(parsed)
    console.log('[Groq] ✅ Success —', result.days.length, 'days')
    return result
  } catch (err) {
    console.error('[Groq] ❌', err)
    return null
  }
}

// ─── Diet item filter ─────────────────────────────────────────────────────────
function filterItemsByDiet(items: string[], diet: DietType): string[] {
  const forbidden = DIET_FORBIDDEN[diet]
  if (!forbidden?.length) return items

  return items.filter(item => {
    const lower = item.toLowerCase()
    return !forbidden.some(f => lower.includes(f))
  })
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generateMealPlan(params: GenerateMealPlanParams): Promise<MealPlanResult> {
  const { items, diet, sourceText, days } = params

  console.log('[Generator] Starting generation — items:', items.length, 'diet:', diet, 'days:', days)

  if (!items.length) {
    throw new Error('No grocery items found. Try a clearer photo.')
  }

  // Clean and filter items
  const cleanedItems = cleanGroceryList(items)
  const dietItems = filterItemsByDiet(cleanedItems, diet)
  const effectiveItems = dietItems.length >= 3 ? dietItems : cleanedItems

  // Determine days
  const requestedDays = days || Math.max(2, Math.min(7, Math.floor(effectiveItems.length / 3)))
  const effectiveDays = Math.max(1, Math.min(7, requestedDays))

  console.log('[Generator] Using', effectiveItems.length, 'items for', effectiveDays, 'days')

  const prompt = buildPrompt(effectiveItems, diet, effectiveDays)

  // Try Claude first, then Groq
  let result = await callClaude(prompt)

  if (!result || !result.days.length) {
    result = await callGroq(prompt)
  }

  // Both failed — throw so UI can show retry
  if (!result || !result.days.length) {
    throw new Error('AI_UNAVAILABLE')
  }

  // Validate ingredient usage (soft check)
  const isValid = validatePlan(result, effectiveItems)
  if (!isValid) {
    // Try once more with Groq before giving up
    console.warn('[Generator] Plan failed validation — retrying with Groq...')
    const retryResult = await callGroq(prompt)
    if (retryResult && retryResult.days.length) {
      result = retryResult
    }
    // If still invalid, continue anyway — better than nothing
  }

  // Pad days if needed
  if (effectiveDays > result.days.length) {
    const fallbackNames = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']
    while (result.days.length < effectiveDays) {
      const idx = result.days.length
      result.days.push({
        day: fallbackNames[idx] || `Day ${idx + 1}`,
        Breakfast: coerceMeal(null, 'Breakfast'),
        Lunch: coerceMeal(null, 'Lunch'),
        Dinner: coerceMeal(null, 'Dinner'),
      })
    }
  }

  console.log('[Generator] ✅ Done —', result.days.length, 'days generated')

  return {
    sourceItems: items,
    sourceText,
    diet,
    totalDays: result.days.length,
    days: result.days,
  }
}
