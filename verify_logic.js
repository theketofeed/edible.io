
// Copied from grocery.ts for independent verification
const FOOD_KEYWORDS = new Set([
    'zucchini', 'banana', 'potato', 'potatoes', 'broccoli', 'brussels', 'sprouts', 'peas', 'tomato', 'tomatoes', 'lettuce',
    'spinach', 'kale', 'carrot', 'carrots', 'onion', 'onions', 'pepper', 'peppers', 'cucumber', 'cucumbers', 'celery',
    'corn', 'bean', 'beans', 'black bean', 'black beans', 'peas', 'asparagus', 'cauliflower', 'cabbage', 'mushroom', 'mushrooms', 'avocado', 'avocados',
    'romaine', 'cilantro', 'heart', 'apple', 'apples', 'orange', 'oranges', 'grape', 'grapes', 'berry', 'berries', 'strawberry', 'strawberries',
    'blueberry', 'blueberries', 'raspberry', 'raspberries', 'peach', 'peaches', 'pear', 'pears', 'plum', 'plums',
    'cherry', 'cherries', 'mango', 'mangoes', 'pineapple', 'watermelon', 'melon', 'kiwi', 'kiwis', 'lemon', 'lemons',
    'lime', 'limes', 'raisins', 'chicken', 'turkey', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'crabmeat', 'lobster', 'egg', 'eggs',
    'tofu', 'tempeh', 'seitan', 'bacon', 'sausage', 'ham', 'steak', 'ground', 'tenders', 'ckn', 'roti',
    'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'sour cream', 'cottage cheese', 'greek yogurt', 'shred',
    'bread', 'rice', 'pasta', 'noodles', 'quinoa', 'oats', 'oatmeal', 'wheat', 'barley', 'couscous', 'tortilla', 'wrap',
    'croissant', 'cookies', 'oil', 'olive', 'olive oil', 'vinegar', 'balsamic', 'balsamic vinegar', 'salt', 'sugar', 'flour', 'honey', 'jam', 'jelly',
    'peanut', 'peanuts', 'almond', 'almonds', 'walnut', 'walnuts', 'cashew', 'cashews', 'seed', 'seeds', 'nut', 'nuts',
    'cilantro', 'parsley', 'basil', 'oregano', 'thyme', 'rosemary', 'sage', 'mint', 'garlic', 'ginger', 'cumin',
    'paprika', 'pepper', 'peppercorn', 'cinnamon', 'nutmeg', 'bay leaf', 'turmeric', 'dill', 'tarragon',
    'ketchup', 'mustard', 'mayo', 'mayonnaise', 'sauce', 'salsa', 'pesto', 'soy sauce', 'coffee', 'roast',
])

function normalizeItem(value) {
    let cleaned = value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')

    if (!cleaned || cleaned.length < 2) return ''

    // Apply robust cleaning patterns
    cleaned = cleaned
        // Weight measurements: "370 kg", "2.5 lb", ".370 kg", etc.
        .replace(/\d*\.?\d+\s*(kg|lb|lbs|g|oz|grams|pounds)\b/gi, '')
        // Price and quantity patterns after/with @: "@ $4.39/kg", "1@ 3/$2.50", etc.
        .replace(/\s*\d*@.*$/gi, '')
        // Special formats like "3/$2.50" without @
        .replace(/\b\d+\s*\/\s*\$\d*\.?\d+\b/gi, '')
        // Quantity prefixes/suffixes: "2x", "12 pack", "3 count"
        .replace(/\b\d+\s*x\b/gi, '')
        .replace(/\b\d+\s*count\b/gi, '')
        .replace(/\b\d+\s*pack\b/gi, '')
        // Prices at the end: "$8.99", "8.99"
        .replace(/\s*\$?\d+[\.,]\d{2}\s*$/, '')
        // Line numbers at start
        .replace(/^\d+[\s.\-:]+/, '')
        // Clean up any remaining artifacts like lone dots or symbols at start/end
        .replace(/^[.\s\-\:]+/, '')
        .replace(/[.\s\-\:]+$/, '')
        .trim()

    return cleaned
}

function looksLikeFood(item) {
    if (!item || item.length < 2) return false
    const lower = item.toLowerCase()
    for (const keyword of FOOD_KEYWORDS) {
        if (lower.includes(keyword)) return true
    }
    return item.length >= 3
}

const testCases = [
    { input: '370 kg chicken', expected: 'chicken' },
    { input: 'Bean (Green) .370 kg @ $4.39/kg', expected: 'bean (green)' },
    { input: 'Lemon Regular 1@ 3/$2.50', expected: 'lemon regular' },
    { input: '2x Peanut Butter', expected: 'peanut butter' },
    { input: '2.5 lb chicken', expected: 'chicken' },
    { input: '1.5 lbs beef', expected: 'beef' },
    { input: '500g broccoli', expected: 'broccoli' },
    { input: '16 oz milk', expected: 'milk' },
    { input: '12 pack water', expected: 'water' },
    { input: '3 count lemons', expected: 'lemon' },
    { input: 'organic 2x chicken breast 500g @ $5.99/kg', expected: 'organic chicken breast' }
]

testCases.forEach(({ input, expected }, index) => {
    const normalized = normalizeItem(input)
    const isFood = looksLikeFood(normalized)
    const passed = normalized.includes(expected) && isFood
    console.log('Normalized length:', normalized.length, 'Expected length:', expected.length);

    if (passed) {
        console.log(`PASS [${index}]: "${input}" -> "${normalized}"`)
    } else {
        console.error(`FAIL [${index}]: "${input}" -> Normalized: "${normalized}", IsFood: ${isFood}, Expected: "${expected}"`)
    }
})
