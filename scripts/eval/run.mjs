import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { claudePlanConfig } from '../../shared/timeouts.mjs'
import { cleanGroceryList } from './lib/grocery-clean.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const RECEIPTS_PATH = path.join(SCRIPT_DIR, 'receipts.json')
const MODEL = 'claude-haiku-4-5-20251001'
const SYSTEM = 'You output JSON only. No code fences. No commentary.'
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
const REQUIREMENTS = `Requirements per recipe:
- 4-7 detailed instruction steps (last step always "ENJOY!❤️")
- Every ingredient MUST include a specific quantity and unit (e.g. '2 large eggs', '1 tbsp olive oil', '200g chicken breast', '1/2 tsp paprika'). Never list a bare ingredient name without a measurement.
- Chef tips must be specific to the exact technique used in THIS recipe. Never use generic freshness advice like 'use fresh X for best flavor'. Instead give technique tips like timing, temperature, texture cues, or common mistakes to avoid for this specific dish.
- Realistic nutrition data
- Use ingredients creatively by combining them with pantry staples`
const COMPACT_REQUIREMENTS = `Requirements per recipe (compact, 7 days must fit a tight output budget):
- 3-5 concise instruction steps (last step always "ENJOY!❤️")
- Every ingredient MUST include a specific quantity and unit (e.g. '2 large eggs', '1 tbsp olive oil', '200g chicken breast', '1/2 tsp paprika'). Never list a bare ingredient name without a measurement.
- Include 1 specific chef tip per recipe: timing, temperature, texture cue, or common mistake to avoid. No generic freshness advice.
- Realistic nutrition data
- Use ingredients creatively by combining them with pantry staples`

function parseArgs(argv) {
  const options = { receipts: null, dryRun: false, version: null }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--version') options.version = argv[++i]
    else if (argv[i] === '--receipts') options.receipts = argv[++i]
    else if (argv[i] === '--dry-run') options.dryRun = true
    else throw new Error(`Unknown argument: ${argv[i]}`)
  }
  if (!options.version || !/^[A-Za-z0-9._-]+$/.test(options.version) || options.version === '.' || options.version === '..') {
    throw new Error('Usage: node scripts/eval/run.mjs --version baseline [--receipts r01,r02] [--dry-run]')
  }
  return options
}

function buildPrompt(items, diet, days) {
  const itemsList = items.map((item, index) => `${index + 1}. ${item}`).join('\n')
  const dietRule = DIET_RULES[diet]
  const forbidden = DIET_FORBIDDEN[diet] || []
  const forbiddenNote = forbidden.length ? `\nFORBIDDEN for ${diet}: ${forbidden.join(', ')}` : ''
  const requirements = days === 7 ? COMPACT_REQUIREMENTS : REQUIREMENTS

  return `You are a Michelin-star meal planning chef. Create a ${days}-day ${diet} meal plan.

DIET RULE: ${dietRule}${forbiddenNote}

GROCERY LIST (use ONLY these + basic pantry staples like salt, pepper, oil, garlic):
${itemsList}

CRITICAL CULINARY RULES:
1. Create COHESIVE, REALISTIC meals. Do NOT just throw random ingredients together (e.g., no "Apple and Egg Breakfast" or "Banana Chicken"). If the ingredients don't naturally go together, rely heavily on the pantry staples to bridge them or separate them (e.g., eat the apple as a side).
2. Only use ingredients from the list above + pantry staples. Do NOT add salmon, chickpeas, feta, mushrooms, or any ingredient not listed.
3. Use the shortest conventional title that identifies the main ingredients and dish form. Use a cooking method (roasted, pan-seared, baked, steamed, stir-fried, slow-cooked) only when that is how the dish is actually cooked. Use an ingredient or sauce descriptor (garlic, lemon, tomato, cream sauce) only when that ingredient or sauce is in the recipe. Use "Creamy" only when the dish truly has a cream, yogurt, cheese, or nut-butter sauce element. Never use mood, taste, temperature, texture, or quality words such as warm, savory, hearty, delicious, comforting, golden, zesty, juicy, tender, crispy, fluffy, flavorful, spiced, or cheesy. Never use words about when or how a meal was made or reused, such as leftover, leftovers, next-day, reheated, or meal-prep. If a meal reuses an earlier meal, name it as a normal dish. Do not repeat a descriptor word across titles in one plan.
   Bad: "Warm Lentil and Spinach Soup". Good: "Lentil and Spinach Soup".
   Bad: "Hearty Beef and Barley Stew". Good: "Beef and Barley Stew".
   Bad: "Savory Mushroom Pasta". Good: "Mushroom Pasta".
   Bad: "Leftover Roasted Pork and Apple Salad". Good: "Roasted Pork and Apple Salad".
4. Meals must make sense for their time of day (Breakfast, Lunch, Dinner).

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

function prepareItems(receipt) {
  const cleanedItems = cleanGroceryList(receipt.items)
  const forbidden = DIET_FORBIDDEN[receipt.diet]
  if (!forbidden?.length) return { items: cleanedItems, cleanedCount: cleanedItems.length }
  const dietItems = cleanedItems.filter((item) => !forbidden.some((word) => item.toLowerCase().includes(word)))
  return {
    items: dietItems.length >= 3 ? dietItems : cleanedItems,
    cleanedCount: cleanedItems.length,
  }
}

function extractText(response) {
  const textBlock = response.content?.find((block) => block.type === 'text')
  return textBlock?.text || ''
}

async function generate(receipt, apiKey, outputPath, items) {
  const prompt = buildPrompt(items, receipt.diet, receipt.days)
  const planConfig = claudePlanConfig(receipt.days)
  const requestStarted = Date.now()
  let lastError

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), planConfig.attemptTimeoutMs)
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: planConfig.maxTokens,
          system: SYSTEM,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.55,
        }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300)
        throw new Error(`Anthropic HTTP ${response.status}: ${detail}`)
      }

      const payload = await response.json()
      const text = extractText(payload).replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
      const plan = JSON.parse(text)
      if (!plan || typeof plan !== 'object' || !Array.isArray(plan.days)) {
        throw new Error('Anthropic response did not contain a plan with a days array')
      }
      await fs.mkdir(path.dirname(outputPath), { recursive: true })
      await fs.writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8')
      return {
        elapsedMs: Date.now() - requestStarted,
        inputTokens: payload.usage?.input_tokens,
        outputTokens: payload.usage?.output_tokens,
      }
    } catch (error) {
      lastError = error
      if (attempt === 2) throw lastError
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError
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

  if (!options.dryRun && !process.env.ANTHROPIC_API_KEY?.trim()) {
    console.error('Missing ANTHROPIC_API_KEY in the environment. Set it before running without --dry-run.')
    process.exitCode = 1
    return
  }

  const receipts = JSON.parse(await fs.readFile(RECEIPTS_PATH, 'utf8'))
  const requestedIds = options.receipts ? options.receipts.split(',').filter(Boolean) : null
  const selected = requestedIds
    ? receipts.filter((receipt) => requestedIds.includes(receipt.id))
    : receipts
  const missingIds = requestedIds?.filter((id) => !receipts.some((receipt) => receipt.id === id)) || []
  if (missingIds.length) throw new Error(`Unknown receipt id(s): ${missingIds.join(', ')}`)

  const jobs = []
  const outputDir = path.join(SCRIPT_DIR, 'out', options.version)
  for (const receipt of selected) {
    const outputPath = path.join(outputDir, `${receipt.id}.json`)
    const prepared = prepareItems(receipt)
    try {
      await fs.access(outputPath)
      console.log(`${receipt.id}: cleaned ${prepared.cleanedCount} items; already exists, skipping (${path.relative(SCRIPT_DIR, outputPath)})`)
    } catch (error) {
      if (error.code === 'ENOENT') jobs.push({ receipt, outputPath, ...prepared })
      else throw error
    }
  }

  if (options.dryRun) {
    console.log(`Dry run. Model: ${MODEL}`)
    for (const { receipt, outputPath, cleanedCount } of jobs) {
      console.log(`${receipt.id}: cleaned ${cleanedCount} items; would generate ${receipt.days}-day ${receipt.diet} plan -> ${path.relative(SCRIPT_DIR, outputPath)}`)
    }
    console.log(`Would generate ${jobs.length} plan(s); at most 2 requests at a time.`)
    return
  }

  const totals = { succeeded: 0, failed: 0, elapsedMs: 0, inputTokens: 0, outputTokens: 0 }
  let nextJob = 0
  async function worker() {
    while (nextJob < jobs.length) {
      const job = jobs[nextJob]
      nextJob += 1
      const started = Date.now()
      try {
        const result = await generate(job.receipt, process.env.ANTHROPIC_API_KEY, job.outputPath, job.items)
        totals.succeeded += 1
        totals.elapsedMs += result.elapsedMs
        if (Number.isFinite(result.inputTokens)) totals.inputTokens += result.inputTokens
        if (Number.isFinite(result.outputTokens)) totals.outputTokens += result.outputTokens
        console.log(`${job.receipt.id}: success in ${result.elapsedMs}ms; input tokens ${result.inputTokens ?? 'n/a'}; output tokens ${result.outputTokens ?? 'n/a'}`)
      } catch (error) {
        const elapsedMs = Date.now() - started
        totals.failed += 1
        totals.elapsedMs += elapsedMs
        console.error(`${job.receipt.id}: failed after retry in ${elapsedMs}ms: ${error.message}`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(2, jobs.length) }, () => worker()))
  console.log(`Totals: succeeded ${totals.succeeded}, failed ${totals.failed}, elapsed ${totals.elapsedMs}ms, input tokens ${totals.inputTokens}, output tokens ${totals.outputTokens}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
