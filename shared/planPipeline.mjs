// Prompts are ported from scripts/eval/run-v2.mjs and must be kept in sync.
import {
  CLAUDE_MAX_TOKENS,
  PIPELINE_STEP1_MS,
  PIPELINE_STEP2_MS,
  PIPELINE_STEP3_MS,
  PIPELINE_STEP3_SPLIT_MS,
} from './timeouts.mjs'

const CONCEPT_MODEL = 'claude-sonnet-5-5'
const WRITE_MODEL = 'claude-haiku-4-5-20251001'
const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const SYSTEM_JSON = 'You output JSON only. No code fences. No commentary.'
const LOWER_SLOTS = ['breakfast', 'lunch', 'dinner']
const UPPER_SLOTS = ['Breakfast', 'Lunch', 'Dinner']
const VALID_DIETS = new Set([
  'Keto', 'Paleo', 'Vegan', 'Vegetarian', 'Low-Carb', 'High-Protein', 'Balanced', 'Mediterranean',
])

const DIET_RULES = {
  Keto: 'High fat (70%), moderate protein (25%), net carbs <30g/day. NO bread, pasta, rice, beans, starchy veg, or sugary fruit.',
  Paleo: 'Meats, veggies, fruits, nuts, olive oil ONLY. NO grains, legumes, dairy, refined sugar, or processed foods.',
  Vegan: '100% plant-based. NO meat, fish, eggs, dairy, or honey.',
  Vegetarian: 'NO meat or fish. Eggs and dairy are fine.',
  'Low-Carb': 'Protein + veggies + healthy fats. NO bread, pasta, rice, or sugary items.',
  'High-Protein': 'Every meal must have a strong protein source. Minimize empty carbs.',
  Balanced: 'Balanced protein, complex carbs, and healthy fats. Variety across the week.',
  Mediterranean: 'Olive oil, fish, whole grains, legumes, veggies, fruit, nuts. Limit red meat.',
}
const DIET_FORBIDDEN = {
  Keto: ['bread', 'pasta', 'rice', 'potato', 'beans', 'tortilla', 'apple', 'banana', 'grapes', 'oats'],
  Paleo: ['bread', 'pasta', 'rice', 'beans', 'peanut', 'milk', 'cheese', 'yogurt', 'butter'],
  Vegan: ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'egg', 'eggs', 'milk', 'cheese', 'yogurt', 'butter', 'honey'],
  Vegetarian: ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp'],
  'Low-Carb': ['bread', 'pasta', 'rice', 'potato', 'tortilla', 'oats', 'sugar', 'honey'],
}

const STEP1_SYSTEM = 'You are an experienced working chef and recipe developer for a popular home cooking site. You name dishes the way real menus and recipe sites do.'
const STEP1_TEMPLATE = `Grocery items the person bought: {items}
Diet: {diet}
Days: {days}. Meals per day: breakfast, lunch, dinner.

Task: propose {N} dish concepts for each slot (breakfast, lunch, dinner). Propose more than will be used, so a later editor can pick the best.

Rules:
1. Work out which cuisine or cooking style this grocery list points to and put it in the cuisine field. If the list clearly points to a specific cuisine, most concepts must be real, well-known dishes from that cuisine, named the way people from that cuisine name them, and served with the sides and accompaniments that cuisine normally serves with them. Never combine ingredients in a way that cuisine would not. If the list does not point to a cuisine, use familiar mainstream home-cooking dishes.
2. Title: name the dish completely, the way a restaurant menu or popular recipe site would. Use the full common name (write "Grilled Cheese Sandwich", not "Grilled Cheese"). At most two ingredients in the title. No ingredient lists. No drinks or snacks in the title. If it involves eggs, say how they are cooked, unless the dish name already implies it (shakshuka, menemen, frittata, omelette, egg fried rice). Put every cooking word directly next to the thing it describes (write "Indomie with Fried Eggs", not "Fried Indomie with Eggs"). If the dish is traditionally eaten with one defining accompaniment in its cuisine (a soup with its swallow, a stew or curry with rice), put that one accompaniment in the title, for example "Egusi Soup with Eba", "Chicken Stew with Rice", "Chana Masala with Rice". This is allowed only when: the main dish is itself a real named dish, the pairing is a real tradition of that cuisine, there is at most one accompaniment, and the accompaniment is on the grocery list or is a pantry staple. Never put a random side in a title (a dinner roll, carrot sticks). Optional extras go in serve_with. A reader must immediately picture one clear dish. Never name a part that is already inherent to the dish. Shakshuka already contains poached eggs, menemen already is scrambled eggs, mujaddara already is rice and lentils, Greek salad already contains feta. Name an accompaniment only when it is a separate item served alongside the dish, such as eba with a soup. Use the name people actually use: call a rice or grain bowl a bowl ("Chicken Shawarma Rice Bowl", not "Chicken Shawarma with Rice"), and put an added main ingredient before the dish name ("Cheese Scrambled Eggs", "Tuna Rice Cakes"). Use a foreign-language name only for a real named dish of that cuisine, never for a plain dish ("Arroz con Atun" for plain tuna rice is wrong). Do not put a cuisine or nationality in the title unless it is part of the dish's real name (write "Chicken Stew with Rice", not "Nigerian Chicken Stew with Rice"). Use the word order people actually say ("Jollof Spaghetti", not "Spaghetti Jollof").
3. Every concept needs a flavor_engine: the named sauce, glaze, crust, spice blend, pickle or crunchy topping that makes it taste good.
4. Assume the cook has basic pantry staples that rarely appear on receipts: cooking oil, salt, black pepper, common dry spices, and seasoning cubes or powders for the cuisine. Do not treat these as missing.
5. You do not have to use every item. Proteins and fresh vegetables and fruit should each appear in at least one concept. Snacks, drinks, candy and condiments must never be forced into a dish. Leave them out if they do not belong.
6. Use only the grocery items above plus the pantry staples in rule 4. key_ingredients must come from the grocery list or the pantry. Do not rely on any other ingredient. An accompaniment named in the title must also appear in key_ingredients.
7. Breakfast concepts can be simple but must still be a recognizable dish.
8. Respect the diet.
9. Prefer variety in main proteins, cooking methods and dish types.
10. If the list is small, favor batch-friendly dishes (soups, stews, rice dishes, curries, pasta dishes) that can be cooked once and eaten twice, instead of inventing odd combinations.
11. Every title must be a real named dish that a person could look up. Do not invent generic dishes made of an ingredient plus a generic dish type (for example "Vegetable Rice Soup", "Tomato Rice Soup", "Tofu Rice Porridge"). If the list is small, use real named batch dishes instead.

Titles that work: "Tuna and Avocado Wrap", "Ground Turkey Tacos", "Egg and Zucchini Frittata", "Shrimp Noodle Soup", "Pumpkin Sage Soup", "Baked Avocado Eggs", "Kimchi Tofu Scramble", "Shakshuka", "Menemen", "Mujaddara", "Greek Salad", "Cheese Scrambled Eggs", "Tuna Rice Cakes", "Chicken Shawarma Rice Bowl", "Egusi Soup with Eba", "Indomie with Fried Eggs", "Grilled Cheese Sandwich", "Chicken Stew with Rice".
Titles that fail, never write these: "Eggs with Apple Cider and Dinner Roll" (odd pairing), "Cheese Stick with Banana and Orange Juice" (snack and drink forced into a meal), "Rice with Carrots, Peas, and Tomato" (ingredient list, not a dish), "Tuna with Tomato and Rice" (ingredient list), "Cassava and Chicken Soup" (not a real dish), "Greek Yogurt with Tortilla Chips and Salsa" (items that do not belong together), "Hot Dog with Carrot Sticks" (not a dish), "Vegetable Rice Soup" (invented generic dish), "Tomato Rice Soup" (invented generic dish), "Fried Indomie with Eggs" (cooking word attached to the wrong item), "Egusi Soup" with no staple (incomplete, half a meal), "Shakshuka with Poached Eggs" (poached eggs are already in shakshuka), "Menemen with Scrambled Eggs" (already scrambled eggs), "Mujadara with Rice and Lentils" (those are the dish), "Greek Salad with Feta" (feta is already in it), "Arroz con Atun" (foreign name for plain tuna rice), "Tuna Cakes with Rice" (should be Tuna Rice Cakes), "Scrambled Eggs with Cheddar" (should be Cheese Scrambled Eggs), "Nigerian Chicken Stew with Rice" (cuisine added to a real dish name), "Spaghetti Jollof" (wrong word order).

Return only JSON: {"cuisine": string, "concepts": [{"id": string, "slot": "breakfast" or "lunch" or "dinner", "title": string, "serve_with": string, "key_ingredients": [string], "flavor_engine": string}]}. Use ids like b1, b2 for breakfast, l1, l2 for lunch, d1, d2 for dinner.`

const STEP2_SYSTEM = 'You are a strict head chef and menu editor. You cut anything that would make a customer ask what is this.'
const STEP2_TEMPLATE = `Grocery items: {items}
Diet: {diet}
Days: {days}
Cuisine: {cuisine}
Candidate concepts (JSON): {concepts}

Task: choose the final meal plan. One breakfast, one lunch and one dinner for each day, using only the candidates above. You may fix the wording of a title (return it as final_title) but you may not change what the dish is.

Rules:
1. Cut any concept a reader could not picture as one clear dish, any hybrid (is it a burger or a wrap), any forced or odd pairing, any invented generic dish (ingredient plus generic dish type) that is not a real named dish, any snack or drink treated as a meal component, any dish that someone from the stated cuisine would not recognize or would not eat that way, any title that repeats a component already inherent to the dish, and any title whose accompaniment is not on the grocery list or a pantry staple. Also cut any concept whose key_ingredients include something that is neither on the grocery list nor a basic pantry staple.
2. Title: name the dish completely, the way a restaurant menu or popular recipe site would. Use the full common name (write "Grilled Cheese Sandwich", not "Grilled Cheese"). At most two ingredients in the title. No ingredient lists. No drinks or snacks in the title. If it involves eggs, say how they are cooked, unless the dish name already implies it (shakshuka, menemen, frittata, omelette, egg fried rice). Put every cooking word directly next to the thing it describes (write "Indomie with Fried Eggs", not "Fried Indomie with Eggs"). If the dish is traditionally eaten with one defining accompaniment in its cuisine (a soup with its swallow, a stew or curry with rice), put that one accompaniment in the title, for example "Egusi Soup with Eba", "Chicken Stew with Rice", "Chana Masala with Rice". This is allowed only when: the main dish is itself a real named dish, the pairing is a real tradition of that cuisine, there is at most one accompaniment, and the accompaniment is on the grocery list or is a pantry staple. Never put a random side in a title (a dinner roll, carrot sticks). Optional extras go in serve_with. A reader must immediately picture one clear dish. final_title may fix an incomplete title or the placement of a cooking word, but may not change what the dish is. Never name a part that is already inherent to the dish. Shakshuka already contains poached eggs, menemen already is scrambled eggs, mujaddara already is rice and lentils, Greek salad already contains feta. Name an accompaniment only when it is a separate item served alongside the dish, such as eba with a soup. Use the name people actually use: call a rice or grain bowl a bowl ("Chicken Shawarma Rice Bowl", not "Chicken Shawarma with Rice"), and put an added main ingredient before the dish name ("Cheese Scrambled Eggs", "Tuna Rice Cakes"). Use a foreign-language name only for a real named dish of that cuisine, never for a plain dish ("Arroz con Atun" for plain tuna rice is wrong). Do not put a cuisine or nationality in the title unless it is part of the dish's real name (write "Chicken Stew with Rice", not "Nigerian Chicken Stew with Rice"). Use the word order people actually say ("Jollof Spaghetti", not "Spaghetti Jollof").
3. Every protein and every fresh vegetable or fruit in the grocery list should appear in at least one chosen meal. If one truly cannot be used in a good dish, list it in unused. Never force it.
4. Variety: avoid the same main protein or the same type of dish on consecutive days, and within the same slot across days.
5. Lunches and dinners should be the strongest concepts. Breakfast can be simple but must be a recognizable dish.
6. A concept may be used on two different days (cook once, eat twice) only if it is batch-friendly (soup, stew, rice dish, curry, pasta dish) or the grocery list has fewer than 12 items. Never use a concept more than twice.
7. Respect the diet.

Return only JSON: {"plan": [{"day": 1, "breakfast": {"id": string, "final_title": string}, "lunch": {"id": string, "final_title": string}, "dinner": {"id": string, "final_title": string}}], "rejected": [{"id": string, "reason": string}], "unused": [string]}`

const REQUIREMENTS = `Requirements per recipe:
- 4-7 detailed instruction steps (last step always "ENJOY!❤️")
- Every ingredient MUST include a specific quantity and unit (e.g. '2 large eggs', '1 tbsp olive oil', '200g chicken breast', '1/2 tsp paprika'). Never list a bare ingredient name without a measurement.
- Chef tips must be specific to the exact technique used in THIS recipe. Never use generic freshness advice like 'use fresh X for best flavor'. Instead give technique tips like timing, temperature, texture cues, or common mistakes to avoid for this specific dish.
- Realistic nutrition data`
const COMPACT_REQUIREMENTS = `Requirements per recipe (compact, 7 days must fit a tight output budget):
- 3-5 concise instruction steps (last step always "ENJOY!❤️")
- Every ingredient MUST include a specific quantity and unit (e.g. '2 large eggs', '1 tbsp olive oil', '200g chicken breast', '1/2 tsp paprika'). Never list a bare ingredient name without a measurement.
- Include 1 specific chef tip per recipe: timing, temperature, texture cue, or common mistake to avoid. No generic freshness advice.
- Realistic nutrition data`

export function validatePlanRequest(body) {
  const source = body && typeof body === 'object' && !Array.isArray(body) ? body : {}
  const rawItems = source.items
  if (!Array.isArray(rawItems)) return { ok: false, reason: 'items must be an array' }
  if (rawItems.length < 1 || rawItems.length > 60) return { ok: false, reason: 'items must contain 1 to 60 entries' }

  const items = []
  for (const rawItem of rawItems) {
    if (typeof rawItem !== 'string') return { ok: false, reason: 'each item must be a string' }
    const item = rawItem.trim()
    if (item.length < 1 || item.length > 60) return { ok: false, reason: 'each item must be 1 to 60 characters after trim' }
    items.push(item)
  }

  if (!VALID_DIETS.has(source.diet)) return { ok: false, reason: 'diet must be one of the supported diets' }
  const days = source.days
  if (!Number.isInteger(days) || days < 1 || days > 7) return { ok: false, reason: 'days must be an integer from 1 to 7' }

  return { ok: true, items, diet: source.diet, days }
}

export function filterItemsByDiet(items, diet) {
  const forbidden = DIET_FORBIDDEN[diet] || []
  if (!forbidden.length) return [...items]
  const filtered = items.filter((item) => !forbidden.some((word) => item.toLowerCase().includes(word)))
  return filtered.length >= 3 ? filtered : [...items]
}

export function buildStep1Prompt(items, diet, days) {
  const conceptCount = Math.max(8, days + 3)
  return STEP1_TEMPLATE
    .replace('{items}', items.join(', '))
    .replace('{diet}', diet)
    .replace('{days}', String(days))
    .replace('{N}', String(conceptCount))
}

export function getStep3SplitPlan(days) {
  if (days <= 5) {
    return [{ startDay: 1, endDay: days, dayCount: days, timeoutMs: PIPELINE_STEP3_MS }]
  }
  const splitAt = Math.ceil(days / 2)
  return [
    { startDay: 1, endDay: splitAt, dayCount: splitAt, timeoutMs: PIPELINE_STEP3_SPLIT_MS },
    { startDay: splitAt + 1, endDay: days, dayCount: days - splitAt, timeoutMs: PIPELINE_STEP3_SPLIT_MS },
  ]
}

function pipelineError(step, message) {
  const error = new Error(`Step ${step} failed: ${message}`)
  error.failedStep = step
  return error
}

function extractText(payload) {
  return Array.isArray(payload.content)
    ? payload.content.filter((block) => block?.type === 'text').map((block) => block.text || '').join('\n')
    : ''
}

function stripFence(text) {
  return text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
}

function parseJsonPayload(payload) {
  const rawText = extractText(payload)
  const text = stripFence(rawText)
  const jsonStart = text.indexOf('{')
  const jsonEnd = text.lastIndexOf('}')
  const jsonText = jsonStart !== -1 && jsonEnd >= jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text
  let parsed = null
  let parseError = null
  try {
    parsed = JSON.parse(jsonText)
  } catch (error) {
    parseError = error
  }
  return { rawText, text, parsed, parseError }
}

function linkSignal(parent, controller) {
  if (!parent) return () => {}
  const abort = () => controller.abort(parent.reason)
  if (parent.aborted) abort()
  else parent.addEventListener('abort', abort, { once: true })
  return () => parent.removeEventListener('abort', abort)
}

function logStepResult(step, label, attempt, result) {
  console.log(`[PlanPipeline] ${label || `Step ${step}`} attempt ${attempt}: time ${result.elapsedMs}ms; input tokens ${result.inputTokens ?? 'n/a'}; output tokens ${result.outputTokens ?? 'n/a'}; stop_reason ${result.stopReason ?? 'n/a'}`)
}

async function callStep(config, apiKey) {
  const controller = new AbortController()
  const unlinkSignal = linkSignal(config.signal, controller)
  const timer = setTimeout(() => controller.abort(), config.timeoutMs)
  const started = Date.now()
  try {
    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        system: config.system,
        messages: [{ role: 'user', content: config.prompt }],
        ...(config.thinking ? { thinking: config.thinking } : {}),
        ...(config.model === WRITE_MODEL ? { temperature: config.temperature } : {}),
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`Anthropic HTTP ${response.status}`)
    }
    const payload = await response.json()
    const parsedPayload = parseJsonPayload(payload)
    return {
      elapsedMs: Date.now() - started,
      inputTokens: payload.usage?.input_tokens,
      outputTokens: payload.usage?.output_tokens,
      stopReason: payload.stop_reason,
      parsed: parsedPayload.parsed,
      parseError: parsedPayload.parseError,
    }
  } catch (error) {
    const elapsedMs = Date.now() - started
    if (controller.signal.aborted || error?.name === 'AbortError') {
      const failure = pipelineError(config.step, `request aborted after ${elapsedMs}ms`)
      failure.timedOut = true
      failure.elapsedMs = elapsedMs
      throw failure
    }
    const failure = pipelineError(config.step, error instanceof Error ? error.message : String(error))
    failure.elapsedMs = elapsedMs
    throw failure
  } finally {
    clearTimeout(timer)
    unlinkSignal()
  }
}

async function runStep(config, apiKey, onStepResult) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await callStep(config, apiKey)
    logStepResult(config.step, config.label, attempt, result)
    onStepResult?.({ step: config.step, label: config.label, attempt, elapsedMs: result.elapsedMs, inputTokens: result.inputTokens, outputTokens: result.outputTokens, stopReason: result.stopReason })
    if (result.stopReason !== 'end_turn') {
      throw pipelineError(config.step, `stop_reason was ${result.stopReason ?? 'n/a'}`)
    }
    if (!result.parseError) return result
    if (attempt === 1) continue
    throw pipelineError(config.step, 'JSON parse failed after one retry')
  }
  throw pipelineError(config.step, 'no attempt completed')
}

function buildWritePrompt(items, diet, days, cuisine, mealList) {
  const itemsList = items.map((item, index) => `${index + 1}. ${item}`).join('\n')
  const dietRule = DIET_RULES[diet]
  const forbidden = DIET_FORBIDDEN[diet] || []
  const forbiddenNote = forbidden.length ? `\nFORBIDDEN for ${diet}: ${forbidden.join(', ')}` : ''
  const requirements = days === 7 ? COMPACT_REQUIREMENTS : REQUIREMENTS
  const mealText = mealList.map((meal) =>
    `${JSON.stringify({ day: meal.day, slot: meal.slot, final_title: meal.final_title, serve_with: meal.serve_with, key_ingredients: meal.key_ingredients, flavor_engine: meal.flavor_engine, cuisine })}`
  ).join('\n')

  return `You are a Michelin-star meal planning chef. Write full recipes for exactly these meals, in this order, using exactly these titles:
${mealText}

Cuisine: ${cuisine}

DIET RULE: ${dietRule}${forbiddenNote}

GROCERY LIST (use ONLY these + basic pantry staples like salt, pepper, oil, garlic):
${itemsList}

CRITICAL CULINARY RULES:
1. Create COHESIVE, REALISTIC meals. Do NOT just throw random ingredients together (e.g., no "Apple and Egg Breakfast" or "Banana Chicken"). If the ingredients don't naturally go together, rely heavily on the pantry staples to bridge them or separate them (e.g., eat the apple as a side).
2. Only use ingredients from the list above + pantry staples. Do NOT add salmon, chickpeas, feta, mushrooms, or any ingredient not listed.
3. Use the title exactly as given. Do not add or remove words. If the title names an accompaniment, include it as an ingredient with a quantity and as a serving step.
4. Cook the dish the way the stated cuisine traditionally makes it. Build the recipe around the given flavor engine. Include the serve_with items as part of the recipe (a serving step or an ingredient). Do not add them to the title.
5. Meals must make sense for their time of day (Breakfast, Lunch, Dinner).
6. Assume basic pantry staples (cooking oil, salt, black pepper, common dry spices, seasoning cubes or powders) are available.

Return ONLY valid JSON (no markdown, no commentary):
If ingredients are insufficient to create a meaningful meal for a slot, use null for that slot instead of a placeholder name. Never output a meal named literally 'Lunch', 'Dinner', or 'Breakfast'; these are placeholders and are not acceptable meal names.
{
  "totalDays": ${days},
  "days": [
    {
      "day": "Day 1",
      "Breakfast": {
        "title": "Plain Recipe Title",
        "instructions": ["Step 1", "Step 2", "ENJOY!❤️"],
        "ingredients": ["ingredient 1", "ingredient 2"],
        "tips": ["Chef tip specific to this recipe"],
        "prepTime": 10,
        "cookTime": 15,
        "totalTime": 25,
        "nutrition": { "calories": 350, "protein": 20, "carbs": 40, "fat": 12, "fiber": 5, "sodium": 480, "sugars": 6 }
      },
      "Lunch": { ... },
      "Dinner": { ... }
    }
  ]
}

${requirements}`
}

function shapeMeal(rawMeal, fallbackTitle) {
  const rawTitle = typeof rawMeal.title === 'string' && rawMeal.title.trim() ? rawMeal.title : fallbackTitle
  if (typeof rawTitle !== 'string' || !rawTitle.trim()) throw pipelineError(3, 'missing meal title')
  return {
    title: rawTitle,
    instructions: Array.isArray(rawMeal.instructions) ? rawMeal.instructions.map(String) : [],
    ingredients: Array.isArray(rawMeal.ingredients) ? rawMeal.ingredients.map(String) : [],
    tips: Array.isArray(rawMeal.tips) ? rawMeal.tips.map(String) : [],
    prepTime: Number(rawMeal.prepTime) || 0,
    cookTime: Number(rawMeal.cookTime) || 0,
    totalTime: Number(rawMeal.totalTime) || 0,
    nutrition: rawMeal.nutrition && typeof rawMeal.nutrition === 'object' && !Array.isArray(rawMeal.nutrition) ? rawMeal.nutrition : {},
  }
}

function shapeStep3Days(parsed, part, meals) {
  if (!parsed || !Array.isArray(parsed.days)) throw pipelineError(3, 'JSON did not contain a days array')
  if (parsed.days.length !== part.dayCount) {
    throw pipelineError(3, `expected ${part.dayCount} days, got ${parsed.days.length}`)
  }

  const shapedDays = []
  let mealIndex = 0
  for (let index = 0; index < parsed.days.length; index += 1) {
    const dayNumber = part.startDay + index
    const rawDay = parsed.days[index]
    const shapedDay = { day: `Day ${dayNumber}` }
    for (const slot of UPPER_SLOTS) {
      const rawMeal = rawDay?.[slot]
      if (!rawMeal || typeof rawMeal !== 'object' || Array.isArray(rawMeal)) {
        throw pipelineError(3, `day ${dayNumber} ${slot} missing`)
      }
      shapedDay[slot] = shapeMeal(rawMeal, meals[mealIndex]?.final_title ?? '')
      mealIndex += 1
    }
    shapedDays.push(shapedDay)
  }
  return shapedDays
}

export async function runPlanPipeline({ items, diet, days, apiKey, signal, onStepResult }) {
  const step1Result = await runStep({
    step: 1,
    model: CONCEPT_MODEL,
    maxTokens: 12000,
    thinking: { type: 'between_tools' },
    system: STEP1_SYSTEM,
    prompt: buildStep1Prompt(items, diet, days),
    timeoutMs: PIPELINE_STEP1_MS,
    signal,
  }, apiKey, onStepResult)

  const step1 = step1Result.parsed
  if (!step1 || !Array.isArray(step1.concepts)) {
    throw pipelineError(1, 'JSON did not contain concepts')
  }

  const step2Prompt = STEP2_TEMPLATE
    .replace('{items}', items.join(', '))
    .replace('{diet}', diet)
    .replace('{days}', String(days))
    .replace('{cuisine}', step1.cuisine)
    .replace('{concepts}', JSON.stringify(step1.concepts))
  const step2Result = await runStep({
    step: 2,
    model: CONCEPT_MODEL,
    maxTokens: 8000,
    thinking: { type: 'between_tools' },
    system: STEP2_SYSTEM,
    prompt: step2Prompt,
    timeoutMs: PIPELINE_STEP2_MS,
    signal,
  }, apiKey, onStepResult)

  const plan = step2Result.parsed?.plan
  if (!Array.isArray(plan)) throw pipelineError(2, 'JSON did not contain a plan')
  if (plan.length !== days) throw pipelineError(2, `expected ${days} days, got ${plan.length}`)

  const conceptById = new Map(step1.concepts.map((concept) => [concept?.id, concept]))
  const mealList = []
  for (let index = 0; index < plan.length; index += 1) {
    const day = plan[index]
    for (const slot of LOWER_SLOTS) {
      const chosen = day?.[slot]
      if (!chosen || typeof chosen !== 'object' || Array.isArray(chosen)) {
        throw pipelineError(2, `day ${index + 1} ${slot} missing`)
      }
      if (!conceptById.has(chosen.id)) {
        throw pipelineError(2, `day ${index + 1} ${slot} referenced unknown concept ${chosen.id ?? 'n/a'}`)
      }
      if (typeof chosen.final_title !== 'string' || !chosen.final_title.trim()) {
        throw pipelineError(2, `day ${index + 1} ${slot} missing final_title`)
      }
      const concept = conceptById.get(chosen.id)
      mealList.push({
        day: index + 1,
        slot,
        final_title: chosen.final_title,
        serve_with: concept.serve_with,
        key_ingredients: concept.key_ingredients,
        flavor_engine: concept.flavor_engine,
      })
    }
  }

  const parts = getStep3SplitPlan(days)
  const step3Promises = parts.map((part) => {
    const partMeals = mealList.filter((meal) => meal.day >= part.startDay && meal.day <= part.endDay)
    return runStep({
      step: 3,
      label: `Step 3 days ${part.startDay}-${part.endDay}`,
      model: WRITE_MODEL,
      maxTokens: CLAUDE_MAX_TOKENS,
      temperature: 0.55,
      system: SYSTEM_JSON,
      prompt: buildWritePrompt(items, diet, part.dayCount, step1.cuisine, partMeals),
      timeoutMs: part.timeoutMs,
      signal,
    }, apiKey, onStepResult).then((result) => shapeStep3Days(result.parsed, part, partMeals))
  })

  const step3Days = (await Promise.all(step3Promises)).flat()
  return { totalDays: days, days: step3Days }
}
