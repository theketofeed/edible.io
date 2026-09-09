// Shared fixtures for Gemini 7-day capacity tests.
// Mirrors the production prompt builder in src/lib/mealPlanGenerator.ts.

export const DIET_RULES = {
  Balanced: 'Balanced protein, complex carbs, and healthy fats. Variety across the week.',
}

export const WORST_CASE_ITEMS = [
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
]

const REQUIREMENTS_COMPACT = `Requirements per recipe (compact — 7 days must fit a tight output budget):
- 3-5 concise instruction steps (last step always "ENJOY!❤️")
- Every ingredient MUST include a specific quantity and unit (e.g. '2 large eggs', '1 tbsp olive oil', '200g chicken breast', '1/2 tsp paprika'). Never list a bare ingredient name without a measurement.
- Include 1 specific chef tip per recipe — timing, temperature, texture cue, or common mistake to avoid. No generic freshness advice.
- Realistic nutrition data
- Use ingredients creatively — combine them with pantry staples`

export function buildPrompt(items, diet, days) {
  const itemsList = items.map((item, i) => `${i + 1}. ${item}`).join('\n')
  return `You are a Michelin-star meal planning chef. Create a ${days}-day ${diet} meal plan.

DIET RULE: ${DIET_RULES[diet]}

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

${REQUIREMENTS_COMPACT}`
}

export function stripFence(text) {
  return (text || '')
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
}

export function checkCompleteness(cleanedText, expectedDays) {
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