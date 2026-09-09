// ─── Single-shot Gemini 7-day meal-plan capacity test ─────────────────────────
// One request, against the WORST-CASE realistic input (25-item list, 7-day
// compact prompt), to verify gemini-2.5-flash can emit a complete, parseable
// JSON meal plan in a single call. This is the gate before wiring Gemini in as
// a Groq-replacement fallback (Gemini was previously trialed and removed from
// this codebase, so we let one live call decide rather than assume).
//
// PASS requires ALL of:
//   1. HTTP 200 + finishReason === 'STOP'   (NOT STOP/MaxTokens)
//   2. JSON parses cleanly (Gemini returns text; we also fence-strip defensively)
//   3. Exactly 7 days, each with a full Breakfast + Lunch + Dinner
//   (the same gate src/lib/mealPlanGenerator.ts enforces on the frontend)
//
// Usage:
//   node scripts/test-gemini-meal-plan.mjs
//   node scripts/test-gemini-meal-plan.mjs --model gemini-2.5-flash --tokens 8192

import dotenv from 'dotenv'
import { WORST_CASE_ITEMS, DIET_RULES, buildPrompt, stripFence, checkCompleteness } from './lib/gemini-fixture.mjs'
dotenv.config({ path: '.env.local' })
const API_KEY = process.env.GEMINI_API_KEY

const args = { model: 'gemini-2.5-flash', maxOutputTokens: 20000, days: 7 }
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === '--model') args.model = process.argv[++i]
  if (process.argv[i] === '--tokens') args.maxOutputTokens = parseInt(process.argv[++i], 10)
  if (process.argv[i] === '--days') args.days = parseInt(process.argv[++i], 10)
}

if (!API_KEY || API_KEY.trim() === '') {
  console.error('[test-gemini-meal-plan] ✗ No GEMINI_API_KEY found in .env.local')
  process.exit(1)
}

const prompt = buildPrompt(WORST_CASE_ITEMS, 'Balanced', args.days)
console.log(`[test-gemini-meal-plan] model=${args.model} days=${args.days} max_output_tokens=${args.maxOutputTokens} items=${WORST_CASE_ITEMS.length}`)
console.log(`prompt length: ${prompt.length} chars`)
console.log('')

const url = `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent?key=${encodeURIComponent(API_KEY)}`
const startedAt = Date.now()

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    system_instruction: { parts: [{ text: 'You output JSON only. No code fences. No commentary.' }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: args.maxOutputTokens,
      temperature: 0.55,
      thinkingConfig: { thinkingBudget: 0 },
    },
  }),
})

const elapsedMs = Date.now() - startedAt

if (!res.ok) {
  const body = await res.text().catch(() => '')
  console.error(`[test-gemini-meal-plan] HTTP ${res.status} — ${body.slice(0, 500)}`)
  process.exit(1)
}

const json = await res.json()
const candidate = json?.candidates?.[0]
const finishReason = candidate?.finishReason || 'UNKNOWN'
const text = candidate?.content?.parts?.map((p) => p.text || '').join('') || ''
const usage = json?.usageMetadata
const outputTokens = usage?.candidatesTokenCount ?? Number(usage?.candidates_tokens_count ?? 0)
const inputTokens = usage?.promptTokenCount ?? Number(usage?.prompt_tokens_count ?? 0)
const blockReason = candidate?.blockReason || null

const cleaned = stripFence(text)
const atCeiling = finishReason === 'MAX_TOKENS' || finishReason === 'STOP' && outputTokens >= args.maxOutputTokens
const { complete, reason, parsed } = checkCompleteness(cleaned, args.days)
const truncated = atCeiling || finishReason !== 'STOP' || text.trim().length === 0

console.log(`finishReason=${finishReason}  input_tokens=${inputTokens}  output_tokens=${outputTokens}  blockReason=${blockReason}  ${elapsedMs}ms  chars=${cleaned.length}`)
console.log('')
console.log(truncated || !complete
  ? `✗ FAIL — truncated=${truncated} complete=${complete}: ${reason}`
  : `✓ PASS — complete 7-day plan (${parsed.days.length} days × 3 meals), output ${outputTokens} tokens`)
console.log('')
console.log('First 300 chars of JSON:')
console.log(cleaned.slice(0, 300))
console.log('')
process.exit(truncated || !complete ? 1 : 0)