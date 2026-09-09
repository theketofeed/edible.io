// ─── Live Anthropic token confirmation ────────────────────────────────────────
// Confirmation harness for the production single ceiling
// (shared/timeouts.mjs → CLAUDE_MAX_TOKENS = 16384), which replaced the old
// per-tier max_tokens values that truncated mid-JSON (3500/3500 and 3072/3072).
//
// max_tokens is a cap, not a target: Anthropic bills per ACTUAL output token,
// so a high shared ceiling costs the same as any other for a natural completion
// and can never be reached by a legitimate plan. This script therefore does a
// CHEAP single-run confirmation at the production value — not a cost-heavy
// threshold sweep (live sweeps burned ~2M test tokens; the threshold was fully
// mapped in one pass: 3-day truncated through 5120, clean at 6144 (natural
// 5,239); 5-day truncated through 8192, clean at 10240 (natural 8,533)).
//
// A "success" here requires ALL of:
//   1. HTTP 200
//   2. output_tokens < max_tokens         (stop_reason != "max_tokens")
//   3. JSON parses cleanly after fence-stripping
//   4. The parsed plan has exactly the requested number of days, each with a
//      full Breakfast + Lunch + Dinner (same gate the frontend enforces)
//
// Usage:
//   node scripts/test-claude-token-threshold.mjs                 # both tiers, production cap
//   node scripts/test-claude-token-threshold.mjs --tier 3        # one tier
//   node scripts/test-claude-token-threshold.mjs --maxTokens 4096,6144   # custom ceiling sweep ($$$)
//   node scripts/test-claude-token-threshold.mjs --diet Keto     # harder case
//   node scripts/test-claude-token-threshold.mjs --iter 2        # repeat confirmations

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: '.env.local' })
if (!process.env.CLAUDE_API_KEY || process.env.CLAUDE_API_KEY.trim() === '' || process.env.CLAUDE_API_KEY === 'your_key_here') {
  dotenv.config({ path: '.env' })
}

const API_KEY = process.env.CLAUDE_API_KEY
const MODEL = 'claude-haiku-4-5-20251001'
const SYSTEM = 'You output JSON only. No code fences. No commentary.'

// ─── Same diet rules as src/lib/mealPlanGenerator.ts (Balanced is default) ───
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

// ─── Realistic detailed grocery lists (top of each auto-tier item band) ───────
// autoPlanDays: 3-day is 10-15 items, 5-day is 16-25 items. We test the TOP of
// each band (most items = most output tokens needed).
const GROCERY_LISTS = {
  3: [
    'Boneless Skinless Chicken Breast',
    'Wild Salmon Fillet',
    '93% Lean Ground Turkey',
    'Extra Large Eggs',
    'Baby Spinach',
    'Roma Tomatoes',
    'Broccoli Florets',
    'Hass Avocado',
    'Sweet Potatoes',
    'Quinoa',
    'Plain Greek Yogurt',
    'Almond Milk',
    'Sharp Cheddar Cheese',
    'Gala Apples',
    'Old Fashioned Rolled Oats',
  ],
  5: [
    'Boneless Skinless Chicken Breast',
    'Wild Salmon Fillet',
    '85% Lean Ground Beef',
    '93% Lean Ground Turkey',
    'Extra Large Eggs',
    'Baby Spinach',
    'Kale',
    'Roma Tomatoes',
    'English Cucumber',
    'Broccoli Florets',
    'Asparagus',
    'Hass Avocado',
    'Sweet Potatoes',
    'Red Bell Pepper',
    'Yellow Onion',
    'Garlic',
    'Quinoa',
    'Brown Rice',
    'Plain Greek Yogurt',
    'Sharp Cheddar Cheese',
    'Almond Milk',
    'Strawberries',
    'Blueberries',
    'Whole Wheat Bread',
    'Old Fashioned Rolled Oats',
  ],
}

// ─── Same requirements text as buildPrompt() for non-7-day plans ──────────────
const REQUIREMENTS = `Requirements per recipe:
- 4-7 detailed instruction steps (last step always "ENJOY!❤️")
- Every ingredient MUST include a specific quantity and unit (e.g. '2 large eggs', '1 tbsp olive oil', '200g chicken breast', '1/2 tsp paprika'). Never list a bare ingredient name without a measurement.
- Chef tips must be specific to the exact technique used in THIS recipe. Never use generic freshness advice like 'use fresh X for best flavor'. Instead give technique tips like timing, temperature, texture cues, or common mistakes to avoid for this specific dish.
- Realistic nutrition data
- Use ingredients creatively — combine them with pantry staples`

function buildPrompt(items, diet, days) {
  const itemsList = items.map((item, i) => `${i + 1}. ${item}`).join('\n')
  const dietRule = DIET_RULES[diet]
  const forbidden = DIET_FORBIDDEN[diet] || []
  const forbiddenNote = forbidden.length ? `\nFORBIDDEN for ${diet}: ${forbidden.join(', ')}` : ''

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
        "nutrition": { "calories": 350, "protein": 20, "carbs": 40, "fat": 12, "fiber": 5, "sodium": 480, "sugars": 6 }
      },
      "Lunch": { ... },
      "Dinner": { ... }
    }
  ]
}

${REQUIREMENTS}`
}

function stripMarkdownJsonFence(text) {
  if (typeof text !== 'string') return ''
  return text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
}

// Same "is this usable" gate the frontend applies (JSON.parse + days present).
function checkCompleteness(cleanedText, expectedDays) {
  let parsed = null
  try {
    parsed = JSON.parse(cleanedText)
  } catch (e) {
    return { complete: false, reason: `JSON parse failed: ${e.message}`, parsed: null }
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.days)) {
    return { complete: false, reason: 'No "days" array in parsed JSON', parsed }
  }

  if (parsed.days.length !== expectedDays) {
    return { complete: false, reason: `Expected ${expectedDays} days, got ${parsed.days.length}`, parsed }
  }

  for (let i = 0; i < parsed.days.length; i++) {
    const d = parsed.days[i]
    for (const slot of ['Breakfast', 'Lunch', 'Dinner']) {
      if (!d || !d[slot] || !Array.isArray(d[slot].instructions) || !Array.isArray(d[slot].ingredients)) {
        return { complete: false, reason: `Day ${i + 1} missing complete ${slot}`, parsed }
      }
    }
  }

  return { complete: true, reason: 'OK', parsed }
}

async function runCall({ tier, maxTokens, prompt, diet, attemptMs = 120000 }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), attemptMs)
  const startedAt = Date.now()
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.55,
      }),
      signal: controller.signal,
    })
    const elapsedMs = Date.now() - startedAt

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return {
        tier, maxTokens, diet, elapsedMs,
        httpStatus: res.status,
        outputTokens: 0,
        truncated: false,
        complete: false,
        reason: `HTTP ${res.status} — ${body.slice(0, 200)}`,
        stopReason: null,
        textLen: 0,
      }
    }

    const json = await res.json()
    const rawContent = json.content || ''
    let text = ''
    if (Array.isArray(rawContent)) {
      const textBlock = rawContent.find((b) => b.type === 'text')
      text = textBlock?.text || rawContent[0]?.text || ''
    } else if (typeof rawContent === 'string') {
      text = rawContent
    } else {
      text = JSON.stringify(rawContent)
    }

    const cleanedText = stripMarkdownJsonFence(text)
    const outputTokens = Number(json?.usage?.output_tokens ?? 0)
    const stopReason = json?.stop_reason || null
    // Truncation signal: hit the ceiling (canonical stop_reason is "max_tokens").
    const truncated = stopReason === 'max_tokens' || outputTokens >= maxTokens
    const { complete, reason, parsed } = checkCompleteness(cleanedText, tier)

    return {
      tier, maxTokens, diet, elapsedMs,
      httpStatus: res.status,
      outputTokens,
      truncated,
      complete,
      reason: truncated || !complete
        ? `truncated=${truncated}, complete=${complete} → ${reason}`
        : `output_tokens ${outputTokens} < ${maxTokens}, complete`,
      stopReason,
      textLen: cleanedText.length,
      parsedDays: parsed?.days?.length ?? 0,
    }
  } catch (err) {
    return {
      tier, maxTokens, diet, elapsedMs: Date.now() - startedAt,
      httpStatus: 0,
      outputTokens: 0,
      truncated: false,
      complete: false,
      reason: `Request failed: ${err?.message || String(err)}`,
      stopReason: null,
      textLen: 0,
    }
  } finally {
    clearTimeout(timer)
  }
}

function parseArgs(argv) {
  const args = {
    tiers: [3, 5],
    maxTokensByTier: null,
    diet: 'Balanced',
    iter: 1,
  }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--tier') args.tiers = [parseInt(argv[++i], 10)]
    if (argv[i] === '--list') args.list = parseInt(argv[++i], 10) // grocery-list fixture to use (defaults to tier)
    if (argv[i] === '--maxTokens') {
      const values = argv[++i].split(',').map((n) => parseInt(n, 10))
      args.maxTokensByTier = { [args.tiers[0]]: values }
    }
    if (argv[i] === '--diet') args.diet = argv[++i]
    if (argv[i] === '--iter') args.iter = parseInt(argv[++i], 10)
  }
  return args
}

// Production uses a SINGLE shared ceiling for every plan size (see
// shared/timeouts.mjs → CLAUDE_MAX_TOKENS). Default confirmation = one cheap
// run per tier at that ceiling. Override via --maxTokens for bespoke sweeps.
const DEFAULT_CANDIDATES = {
  3: [16384],
  5: [16384],
  7: [16384],
}

const args = parseArgs(process.argv.slice(2))

if (!API_KEY || API_KEY.trim() === '' || API_KEY === 'your_key_here') {
  console.error('[test-claude-token-threshold] ✗ No CLAUDE_API_KEY found in .env.local or .env')
  process.exit(1)
}

console.log(`[test-claude-token-threshold] model=${MODEL} diet=${args.diet} tiers=${args.tiers.join(',')} iterations=${args.iter}`)
console.log('')

const summary = []

for (const tier of args.tiers) {
  const listKey = args.list || tier
  const items = GROCERY_LISTS[listKey]
  if (!items) {
    console.warn(`[test-claude-token-threshold] No grocery list fixture for tier ${tier} — skipping`)
    continue
  }

  const prompts = DIET_RULES[args.diet]
  if (!prompts) {
    console.error(`[test-claude-token-threshold] Unknown diet "${args.diet}"`)
    process.exit(1)
  }

  const prompt = buildPrompt(items, args.diet, tier)
  const candidates = args.maxTokensByTier?.[tier] || DEFAULT_CANDIDATES[tier]

  console.log(`════════ ══ ${tier}-DAY TIER — ${items.length}-item grocery list, ${args.diet} diet ══════════`)
  console.log(`prompt length: ${prompt.length} chars  |  candidates: ${candidates.join(', ')}\n`)

  const results = []
  let thresholdFound = false

  for (const maxTokens of candidates) {
    const batch = []
    for (let it = 1; it <= args.iter; it++) {
      process.stdout.write(`  max_tokens=${maxTokens} (run ${it}/${args.iter})… `)
      const r = await runCall({ tier, maxTokens, prompt, diet: args.diet })
      batch.push(r)
      if (args.iter === 1) {
        console.log(r.complete && !r.truncated ? 'PASS' : (r.truncated ? 'TRUNCATED' : 'FAIL'))
      } else {
        console.log(r.complete && !r.truncated ? 'pass' : (r.truncated ? 'trunc' : 'fail'))
      }
    }
    for (const r of batch) results.push(r)

    const okCount = batch.filter((r) => r.complete && !r.truncated).length
    const allOk = okCount === batch.length

    // Stop sweeping once we've found a verified-safe level (all runs pass).
    if (allOk) {
      console.log(`  → verified-safe: max_tokens=${maxTokens} passed all ${batch.length} live run(s)\n`)
      thresholdFound = true
      summary.push({ tier, verifiedSafeMaxTokens: maxTokens, results: batch })
      break
    }
  }

  if (!thresholdFound) {
    console.log(`  → NO verified-safe level found in tested candidates (${candidates.join(', ')})\n`)
    summary.push({ tier, verifiedSafeMaxTokens: null, results })
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n════════════════════════ SUMMARY ════════════════════════')
for (const { tier, verifiedSafeMaxTokens, results } of summary) {
  console.log(`\n── ${tier}-day tier ──`)
  for (const r of results) {
    const verdict = r.complete && !r.truncated ? 'PASS' : r.truncated ? 'TRUNCATED' : 'INCOMPLETE'
    console.log(
      `  max_tokens=${String(r.maxTokens).padEnd(5)}  output_tokens=${String(r.outputTokens).padEnd(5)}  stop=${String(r.stopReason).padEnd(9)}  http=${r.httpStatus}  ${verdict.padEnd(10)}  ${r.elapsedMs}ms  ${r.reason.slice(0, 140)}`
    )
  }
  if (verifiedSafeMaxTokens) {
    console.log(`  ✓ PASSES at max_tokens=${verifiedSafeMaxTokens} — production shared ceiling is CLAUDE_MAX_TOKENS=16384 (billing is per emitted token; this cap is free headroom, not a target)`)
  } else {
    console.log(`  ✗ TRUNCATED even at the 16384 production ceiling — raise CLAUDE_MAX_TOKENS in shared/timeouts.mjs`)
  }
}

const tf = summary.filter((s) => s.verifiedSafeMaxTokens != null)
console.log(`\n${tf.length}/${summary.length} tiers verified-safe`)