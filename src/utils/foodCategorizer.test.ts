import { extractAndCategorizeFoodItems } from './foodCategorizer'

// Test data: cleaned items from grocery list
const sampleCleanedItems = [
	'Flat Leaf Spinach',
	'Fresh Ground Turkey',
	'Boneless Chicken Breast',
	'Gluten Free Pasta',
	'Pasta (GF)',
	'Organic Bananas',
	'Cheddar Cheese',
	'Whole Wheat Bread',
	'Greek Yogurt',
	'Olive Oil',
	'Tomatoes',
	'Broccoli',
	'Brown Rice',
	'Salmon Fillet',
	'Frozen Peas',
	'Avocados',
	'Eggs',
	'Sweet Potatoes',
	'Almond Milk',
	'Black Beans'
]

// Run the categorization
console.log('=== Food Item Extraction Layer Test ===\n')
console.log('Input (cleaned items):')
console.log(sampleCleanedItems)
console.log('\n---\n')

const result = extractAndCategorizeFoodItems(sampleCleanedItems)

console.log('Output (categorized JSON):')
console.log(JSON.stringify(result, null, 2))

console.log('\n---\n')
console.log('Category breakdown:')
const categoryCount: Record<string, number> = {}
result.food_items.forEach(item => {
	categoryCount[item.category] = (categoryCount[item.category] || 0) + 1
})
console.log(categoryCount)

// Test normalization (similar items should be treated consistently)
console.log('\n=== Testing Normalization ===\n')
const normalizationTest = [
	'Gluten Free Pasta',
	'Pasta (GF)',
	'gluten-free pasta'
]
const normalizedResult = extractAndCategorizeFoodItems(normalizationTest)
console.log('Input:', normalizationTest)
console.log('Output (should dedupe):')
console.log(JSON.stringify(normalizedResult, null, 2))
console.log(`Expected 1 item, got ${normalizedResult.food_items.length}`)

// Test spelling corrections
console.log('\n=== Testing Spelling Corrections ===\n')
const spellingTest = [
	'chiken breast',
	'tomatoe',
	'banan'
]
const spellingResult = extractAndCategorizeFoodItems(spellingTest)
console.log('Input:', spellingTest)
console.log('Output (corrected):')
console.log(JSON.stringify(spellingResult, null, 2))
