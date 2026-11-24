import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { claudePlanConfig } from '../../shared/timeouts.mjs'
import { cleanGroceryList } from './lib/grocery-clean.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..')
const ENV_PATH = path.join(REPO_ROOT, '.env.local')
const API_KEY_ENV_NAME = 'CLAUDE_API_KEY'
const RECEIPTS_PATH = path.join(SCRIPT_DIR, 'receipts.json')
const WRITE_MODEL = 'claude-haiku-4-5-20251001'
const STEP3_TIMEOUT_MS = 200000
const SYSTEM_JSON = 'You output JSON only. No code fences. No commentary.'

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
2. Title: name the dish completely, the way a restaurant menu or popular recipe site would. Use the full common name (write "Grilled Cheese Sandwich", not "Grilled Cheese"). At most two ingredients in the title. No ingredient lists. No drinks or snacks in the title. If it involves eggs, say how they are cooked, unless the dish name already implies it (shakshuka, menemen, frittata, omelette, egg fried rice). Put every cooking word directly next to the thing it describes (write "Indomie with Fried Eggs", not "Fried Indomie with Eggs"). If the dish is traditionally eaten with one defining accompaniment in its cuisine (a soup with its swallow, a stew or curry with rice), put that one accompaniment in the title, for example "Egusi Soup with Eba", "Chicken Stew with Rice", "Chana Masala with Rice". This is allowed only when: the main dish is itself a real named dish, the pairing is a real tradition of that cuisine, there is at most one accompaniment, and the accompaniment is on the grocery list or is a pantry staple. Never put a random side in a title (a dinner roll, carrot sticks). Optional extras go in serve_with. A reader must immediately picture one clear dish. Never name a part that is already inherent to the dish. Shakshuka already contains poached eggs, menemen already is scrambled eggs, mujaddara already is rice and lentils, Greek salad already contains feta. Name an accompaniment only when it is a separate item served alongside the dish, such as eba with a soup. Use the name people actually use: call a rice or grain bowl a bowl ("Chicken Shawarma Rice Bowl", not "Chicken Shawarma with Rice"), and put an added main ingredient before the dish name ("Cheese Scrambled Eggs", "Tuna Rice Cakes"). Use a foreign-language name only for a real named dish of that cuisine, never for a plain dish ("Arroz con Atun" for plain tuna rice is wrong).
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
Titles that fail, never write these: "Eggs with Apple Cider and Dinner Roll" (odd pairing), "Cheese Stick with Banana and Orange Juice" (snack and drink forced into a meal), "Rice with Carrots, Peas, and Tomato" (ingredient list, not a dish), "Tuna with Tomato and Rice" (ingredient list), "Cassava and Chicken Soup" (not a real dish), "Greek Yogurt with Tortilla Chips and Salsa" (items that do not belong together), "Hot Dog with Carrot Sticks" (not a dish), "Vegetable Rice Soup" (invented generic dish), "Tomato Rice Soup" (invented generic dish), "Fried Indomie with Eggs" (cooking word attached to the wrong item), "Egusi Soup" with no staple (incomplete, half a meal), "Shakshuka with Poached Eggs" (poached eggs are already in shakshuka), "Menemen with Scrambled Eggs" (already scrambled eggs), "Mujadara with Rice and Lentils" (those are the dish), "Greek Salad with Feta" (feta is already in it), "Arroz con Atun" (foreign name for plain tuna rice), "Tuna Cakes with Rice" (should be Tuna Rice Cakes), "Scrambled Eggs with Cheddar" (should be Cheese Scrambled Eggs).

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
2. Title: name the dish completely, the way a restaurant menu or popular recipe site would. Use the full common name (write "Grilled Cheese Sandwich", not "Grilled Cheese"). At most two ingredients in the title. No ingredient lists. No drinks or snacks in the title. If it involves eggs, say how they are cooked, unless the dish name already implies it (shakshuka, menemen, frittata, omelette, egg fried rice). Put every cooking word directly next to the thing it describes (write "Indomie with Fried Eggs", not "Fried Indomie with Eggs"). If the dish is traditionally eaten with one defining accompaniment in its cuisine (a soup with its swallow, a stew or curry with rice), put that one accompaniment in the title, for example "Egusi Soup with Eba", "Chicken Stew with Rice", "Chana Masala with Rice". This is allowed only when: the main dish is itself a real named dish, the pairing is a real tradition of that cuisine, there is at most one accompaniment, and the accompaniment is on the grocery list or is a pantry staple. Never put a random side in a title (a dinner roll, carrot sticks). Optional extras go in serve_with. A reader must immediately picture one clear dish. final_title may fix an incomplete title or the placement of a cooking word, but may not change what the dish is. Never name a part that is already inherent to the dish. Shakshuka already contains poached eggs, menemen already is scrambled eggs, mujaddara already is rice and lentils, Greek salad already contains feta. Name an accompaniment only when it is a separate item served alongside the dish, such as eba with a soup. Use the name people actually use: call a rice or grain bowl a bowl ("Chicken Shawarma Rice Bowl", not "Chicken Shawarma with Rice"), and put an added main ingredient before the dish name ("Cheese Scrambled Eggs", "Tuna Rice Cakes"). Use a foreign-language name only for a real named dish of that cuisine, never for a plain dish ("Arroz con Atun" for plain tuna rice is wrong).
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

function parseArgs(argv) {
  const options = { receipts: null, dryRun: false, conceptModel: 'claude-sonnet-5-5', version: 'v2', force: false }
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--receipts') options.receipts = argv[++index]
    else if (argv[index] === '--dry-run') options.dryRun = true
    else if (argv[index] === '--concept-model') options.conceptModel = argv[++index]
    else if (argv[index] === '--force') options.force = true
    else if (argv[index] === '--version') {
      options.version = argv[++index]
      if (!options.version || !/^[A-Za-z0-9._-]+$/.test(options.version) || options.version === '.' || options.version === '..') {
        throw new Error('Provide a valid --version <name>.')
      }
    } else throw new Error(`Unknown argument: ${argv[index]}`)
  }
  if (!options.receipts) throw new Error('Usage: node scripts/eval/run-v2.mjs --receipts r11,r08,r02,r09 [--dry-run] [--concept-model <id>] [--version <name>] [--force]')
  return options
}

async function loadApiKey() {
  if (process.env.ANTHROPIC_API_KEY?.trim()) return process.env.ANTHROPIC_API_KEY.trim()
  let envText
  try {
    envText = await fs.readFile(ENV_PATH, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
  for (const line of envText.split(/\r?\n/)) {
    const entry = line.trim()
    if (!entry || entry.startsWith('#')) continue
    const separator = entry.indexOf('=')
    if (separator === -1) continue
    if (entry.slice(0, separator).trim() !== API_KEY_ENV_NAME) continue
    let value = entry.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1).trim()
    return value || null
  }
  return null
}

function prepareItems(receipt) {
  const originalLog = console.log
  let cleanedItems
  console.log = () => {}
  try {
    cleanedItems = cleanGroceryList(receipt.items)
  } finally {
    console.log = originalLog
  }
  const forbidden = DIET_FORBIDDEN[receipt.diet]
  if (!forbidden?.length) return { items: cleanedItems, cleanedCount: cleanedItems.length }
  const dietItems = cleanedItems.filter((item) => !forbidden.some((word) => item.toLowerCase().includes(word)))
  return { items: dietItems.length >= 3 ? dietItems : cleanedItems, cleanedCount: cleanedItems.length }
}

function fillStep1(receipt, items) {
  return STEP1_TEMPLATE
    .replace('{items}', items.join(', '))
    .replace('{diet}', receipt.diet)
    .replace('{days}', String(receipt.days))
    .replace('{N}', String(Math.ceil(receipt.days * 1.6)))
}

function extractText(payload) {
  return Array.isArray(payload.content)
    ? payload.content.filter((block) => block?.type === 'text').map((block) => block.text || '').join('\n')
    : ''
}

function stripFence(text) {
  return text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
}

async function writeDebugFile({ receiptId, stepNumber, attempt, model, result }) {
  const debugPath = path.join(SCRIPT_DIR, 'out', 'v2-debug', `${receiptId}-step${stepNumber}-attempt${attempt}.txt`)
  await fs.mkdir(path.dirname(debugPath), { recursive: true })
  await fs.writeFile(debugPath, [
    `model: ${model}`,
    `step: ${stepNumber}`,
    `stop_reason: ${result.stopReason ?? 'n/a'}`,
    `usage: input tokens ${result.inputTokens ?? 'n/a'}; output tokens ${result.outputTokens ?? 'n/a'}`,
    `content block types: ${JSON.stringify(result.contentTypes)}`,
    'raw text (first 4000 characters):',
    result.rawText.slice(0, 4000),
    'raw text (last 1000 characters):',
    result.rawText.slice(-1000),
  ].join('\n'), 'utf8')
  return debugPath
}

async function callStep({ model, maxTokens, temperature, thinking, system, prompt, timeoutMs }, apiKey) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const started = Date.now()
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
        ...(thinking ? { thinking } : {}),
        ...(model === 'claude-haiku-4-5-20251001' ? { temperature } : {}),
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300)
      throw new Error(`Anthropic HTTP ${response.status}: ${detail}`)
    }
    const payload = await response.json()
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
    return {
      elapsedMs: Date.now() - started,
      inputTokens: payload.usage?.input_tokens,
      outputTokens: payload.usage?.output_tokens,
      stopReason: payload.stop_reason,
      contentTypes: Array.isArray(payload.content) ? payload.content.map((block) => block?.type ?? typeof block) : [],
      rawText,
      text,
      parsed,
      parseError,
    }
  } catch (error) {
    const elapsedMs = Date.now() - started
    if (controller.signal.aborted || error?.name === 'AbortError') {
      const timeoutError = new Error(`request aborted after ${elapsedMs}ms`)
      timeoutError.timedOut = true
      timeoutError.elapsedMs = elapsedMs
      throw timeoutError
    }
    const failure = error instanceof Error ? error : new Error(String(error))
    failure.elapsedMs = elapsedMs
    throw failure
  } finally {
    clearTimeout(timer)
  }
}

async function runRetry(config, apiKey, { receiptId, stepNumber, onResult }) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let result
    try {
      result = await callStep(config, apiKey)
    } catch (error) {
      const elapsedMs = error.elapsedMs ?? 0
      const reason = error.timedOut ? 'timed out or was aborted' : 'failed'
      const failure = new Error(`Step ${stepNumber} ${reason} after ${elapsedMs}ms: ${error.message}`)
      failure.stepNumber = stepNumber
      failure.elapsedMs = elapsedMs
      failure.timedOut = Boolean(error.timedOut)
      throw failure
    }
    onResult(config.model, result)
    if (!result.parseError && result.stopReason === 'end_turn') return result

    const debugPath = await writeDebugFile({ receiptId, stepNumber, attempt, model: config.model, result })
    const failureMessage = result.parseError?.message || `stop_reason was ${result.stopReason ?? 'n/a'}`
    if (result.parseError && attempt === 1) {
      console.error(`${receiptId}: Step ${stepNumber} attempt ${attempt} failed: ${failureMessage}; stop_reason=${result.stopReason ?? 'n/a'}; output tokens=${result.outputTokens ?? 'n/a'}; debug file=${path.relative(process.cwd(), debugPath)}; retrying`)
      continue
    }

    const error = new Error(`Step ${stepNumber} failed after ${result.elapsedMs}ms: ${failureMessage}`)
    error.stepNumber = stepNumber
    error.elapsedMs = result.elapsedMs
    error.parseError = Boolean(result.parseError)
    error.stopReason = result.stopReason
    error.outputTokens = result.outputTokens
    error.debugPath = path.relative(process.cwd(), debugPath)
    throw error
  }
  throw new Error('Step failed')
}

function buildWritePrompt(receipt, items, cuisine, mealList) {
  const itemsList = items.map((item, index) => `${index + 1}. ${item}`).join('\n')
  const dietRule = DIET_RULES[receipt.diet]
  const forbidden = DIET_FORBIDDEN[receipt.diet] || []
  const forbiddenNote = forbidden.length ? `\nFORBIDDEN for ${receipt.diet}: ${forbidden.join(', ')}` : ''
  const requirements = receipt.days === 7 ? COMPACT_REQUIREMENTS : REQUIREMENTS
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
  "totalDays": ${receipt.days},
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

async function generate(receipt, apiKey, outputPath, prepared, conceptModel, onResult, version) {
  const planConfig = claudePlanConfig(receipt.days)
  const step1Result = await runRetry({
    model: conceptModel,
    maxTokens: 12000,
    temperature: 0.9,
    thinking: { type: 'between_tools' },
    system: STEP1_SYSTEM,
    prompt: fillStep1(receipt, prepared.items),
    timeoutMs: planConfig.attemptTimeoutMs,
  }, apiKey, { receiptId: receipt.id, stepNumber: 1, onResult })
  if (!step1Result.parsed || !Array.isArray(step1Result.parsed.concepts)) throw new Error('Step 1 JSON did not contain concepts')
  console.log(`${receipt.id}: Step 1 time ${step1Result.elapsedMs}ms; input tokens ${step1Result.inputTokens ?? 'n/a'}; output tokens ${step1Result.outputTokens ?? 'n/a'}`)

  const step1 = step1Result.parsed
  const step2Prompt = STEP2_TEMPLATE
    .replace('{items}', prepared.items.join(', '))
    .replace('{diet}', receipt.diet)
    .replace('{days}', String(receipt.days))
    .replace('{cuisine}', step1.cuisine)
    .replace('{concepts}', JSON.stringify(step1.concepts))
  const step2Result = await runRetry({
    model: conceptModel,
    maxTokens: 8000,
    temperature: 0.3,
    thinking: { type: 'between_tools' },
    system: STEP2_SYSTEM,
    prompt: step2Prompt,
    timeoutMs: planConfig.attemptTimeoutMs,
  }, apiKey, { receiptId: receipt.id, stepNumber: 2, onResult })
  if (!step2Result.parsed || !Array.isArray(step2Result.parsed.plan)) throw new Error('Step 2 JSON did not contain a plan')
  console.log(`${receipt.id}: Step 2 time ${step2Result.elapsedMs}ms; input tokens ${step2Result.inputTokens ?? 'n/a'}; output tokens ${step2Result.outputTokens ?? 'n/a'}`)

  const step2 = step2Result.parsed
  const conceptById = new Map(step1.concepts.map((concept) => [concept.id, concept]))
  const mealList = []
  for (const day of step2.plan) {
    for (const slot of ['breakfast', 'lunch', 'dinner']) {
      const chosen = day[slot]
      const concept = conceptById.get(chosen?.id)
      if (!concept) throw new Error(`Step 2 referenced unknown concept ${chosen?.id}`)
      mealList.push({
        day: day.day,
        slot,
        final_title: chosen.final_title,
        serve_with: concept.serve_with,
        key_ingredients: concept.key_ingredients,
        flavor_engine: concept.flavor_engine,
      })
    }
  }

  const writePrompt = buildWritePrompt(receipt, prepared.items, step1.cuisine, mealList)
  const step3Result = await runRetry({
    model: WRITE_MODEL,
    maxTokens: planConfig.maxTokens,
    temperature: 0.55,
    system: SYSTEM_JSON,
    prompt: writePrompt,
    timeoutMs: STEP3_TIMEOUT_MS,
  }, apiKey, { receiptId: receipt.id, stepNumber: 3, onResult })
  if (!step3Result.parsed || !Array.isArray(step3Result.parsed.days)) throw new Error('Step 3 JSON did not contain a days array')
  console.log(`${receipt.id}: Step 3 time ${step3Result.elapsedMs}ms; input tokens ${step3Result.inputTokens ?? 'n/a'}; output tokens ${step3Result.outputTokens ?? 'n/a'}`)

  let mealIndex = 0
  for (const day of step3Result.parsed.days) {
    for (const slot of ['Breakfast', 'Lunch', 'Dinner']) {
      const meal = day[slot]
      const selected = mealList[mealIndex]
      if (meal && typeof meal === 'object' && selected) meal.title = selected.final_title
      mealIndex += 1
    }
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(step3Result.parsed, null, 2)}\n`, 'utf8')

  const stepPath = path.join(SCRIPT_DIR, 'out', `${version}-steps`, `${receipt.id}.json`)
  await fs.mkdir(path.dirname(stepPath), { recursive: true })
  await fs.writeFile(stepPath, `${JSON.stringify({
    cuisine: step1.cuisine,
    concepts: step1.concepts,
    critic: {
      plan: step2.plan,
      rejected: step2.rejected,
      unused: step2.unused,
    },
  }, null, 2)}\n`, 'utf8')

  return {
    step1: step1Result,
    step2: step2Result,
    step3: step3Result,
  }
}

async function main() {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
    return
  }

  const receipts = JSON.parse(await fs.readFile(RECEIPTS_PATH, 'utf8'))
  const requestedIds = options.receipts.split(',').map((id) => id.trim()).filter(Boolean)
  if (!requestedIds.length) throw new Error('--receipts must contain at least one receipt id')
  if (requestedIds.length > 4) throw new Error(`Receipt cap exceeded: requested ${requestedIds.length}; maximum is 4.`)
  const missingIds = requestedIds.filter((id) => !receipts.some((receipt) => receipt.id === id))
  if (missingIds.length) throw new Error(`Unknown receipt id(s): ${missingIds.join(', ')}`)
  const selected = requestedIds.map((id) => receipts.find((receipt) => receipt.id === id))
  const totalMeals = selected.reduce((total, receipt) => total + receipt.days * 3, 0)
  if (totalMeals > 60) throw new Error(`Meal cap exceeded: requested ${totalMeals} meals; maximum is 60.`)

  if (options.dryRun) {
    const first = selected[0]
    const prepared = prepareItems(first)
    const planConfig = claudePlanConfig(first.days)
    const callPlan = selected.map((receipt) => `${receipt.id}:${receipt.days * 3} meals`).join(', ')
    console.log(`Dry run. Concept model: ${options.conceptModel}`)
    console.log(`Output folder: out/${options.version}`)
    console.log(`Step output folder: out/${options.version}-steps`)
    console.log(`Call plan: ${callPlan}`)
    console.log(`Meal cap check: ${totalMeals}/60 meals`)
    console.log(`Receipt cap check: ${selected.length}/4 receipts`)
    console.log('Thinking: Step 1 between_tools; Step 2 between_tools; Step 3 not sent')
    console.log(`max_tokens: Step 1 12000; Step 2 8000; Step 3 ${planConfig.maxTokens}`)
    console.log(`STEP 1 SYSTEM:\n${STEP1_SYSTEM}`)
    console.log(`STEP 1 USER:\n${fillStep1(first, prepared.items)}`)
    console.log(`STEP 2 SYSTEM:\n${STEP2_SYSTEM}`)
    console.log(`STEP 2 USER TEMPLATE:\n${STEP2_TEMPLATE}`)
    console.log(`STEP 3 WRITE TEMPLATE:\n${buildWritePrompt(first, prepared.items, '{cuisine}', [
      { day: 1, slot: 'breakfast', final_title: '{final_title}', serve_with: '{serve_with}', key_ingredients: ['{key_ingredients}'], flavor_engine: '{flavor_engine}' },
      { day: 1, slot: 'lunch', final_title: '{final_title}', serve_with: '{serve_with}', key_ingredients: ['{key_ingredients}'], flavor_engine: '{flavor_engine}' },
      { day: 1, slot: 'dinner', final_title: '{final_title}', serve_with: '{serve_with}', key_ingredients: ['{key_ingredients}'], flavor_engine: '{flavor_engine}' },
    ])}`)
    return
  }

  const apiKey = await loadApiKey()
  if (!apiKey) {
    console.error(`Missing API key in the environment or ${path.relative(process.cwd(), ENV_PATH)} (${API_KEY_ENV_NAME}). Set it before running without --dry-run.`)
    process.exitCode = 1
    return
  }

  const totals = new Map()
  function addTotal(model, result) {
    const current = totals.get(model) || { elapsedMs: 0, inputTokens: 0, outputTokens: 0 }
    current.elapsedMs += result.elapsedMs
    if (Number.isFinite(result.inputTokens)) current.inputTokens += result.inputTokens
    if (Number.isFinite(result.outputTokens)) current.outputTokens += result.outputTokens
    totals.set(model, current)
  }

  let nextJob = 0
  async function worker() {
    while (nextJob < selected.length) {
      const receipt = selected[nextJob]
      nextJob += 1
      const prepared = prepareItems(receipt)
      const outputPath = path.join(SCRIPT_DIR, 'out', options.version, `${receipt.id}.json`)
      if (!options.force) {
        try {
          await fs.access(outputPath)
          console.log(`${receipt.id}: cleaned ${prepared.cleanedCount} items; final plan already exists, skipping (out/${options.version}/${receipt.id}.json); pass --force to regenerate`)
          continue
        } catch (error) {
          if (error.code !== 'ENOENT') throw error
        }
      }
      try {
        await generate(receipt, apiKey, outputPath, prepared, options.conceptModel, addTotal, options.version)
      } catch (error) {
        if (Number.isInteger(error.stepNumber)) {
          const details = [`stop_reason=${error.stopReason ?? 'n/a'}`, `output tokens=${error.outputTokens ?? 'n/a'}`]
          if (Number.isFinite(error.elapsedMs)) details.push(`elapsed=${error.elapsedMs}ms`)
          if (error.debugPath) details.push(`debug file=${error.debugPath}`)
          console.error(`${receipt.id}: failed at Step ${error.stepNumber}: ${error.message}; ${details.join('; ')}; skipping receipt`)
        } else {
          console.error(`${receipt.id}: failed: ${error.message}; skipping receipt`)
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(2, selected.length) }, () => worker()))
  console.log('Totals by model:')
  for (const [model, total] of totals) {
    console.log(`${model}: elapsed ${total.elapsedMs}ms, input tokens ${total.inputTokens}, output tokens ${total.outputTokens}`)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
