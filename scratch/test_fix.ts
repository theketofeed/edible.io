import { extractGroceryItems } from './src/utils/grocery.ts';

const testCases = [
    ".370 kg",
    "Chicken Breast 1.5kg",
    "0.5 kg Spinach",
    ".250 kg Salmon",
    "Apples @ $4.99/kg",
    "Subtotal $45.00"
];

console.log("Testing Grocery Extraction:");
testCases.forEach(tc => {
    const result = extractGroceryItems(tc);
    console.log(`Input: "${tc}" -> Result: ${JSON.stringify(result)}`);
});
