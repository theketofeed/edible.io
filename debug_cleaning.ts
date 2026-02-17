import { normalizeItem, looksLikeFood } from './src/utils/grocery'

const inputs = [
    'Bean (Green) .370 kg @ $4.39/kg',
    'organic 2x chicken breast 500g @ $5.99/kg',
    'Lemon Regular 1@ 3/$2.50'
]

inputs.forEach(input => {
    const normalized = normalizeItem(input);
    console.log(`Input: "${input}"`);
    console.log(`Normalized: "|${normalized}|"`);
    console.log(`LooksLikeFood: ${looksLikeFood(normalized)}`);
    console.log('---');
})
