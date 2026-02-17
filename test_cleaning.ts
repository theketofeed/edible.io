import { extractGroceryItems } from './src/utils/grocery'

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

console.log('--- Starting Grocery Cleaning Tests ---')
let passed = 0
let failed = 0

testCases.forEach(({ input, expected }, index) => {
    try {
        const result = extractGroceryItems(input)
        const actual = result[0] || ''

        if (actual.includes(expected)) {
            console.log(`PASS [${index}]: "${input}" -> "${actual}"`)
            passed++
        } else {
            console.error(`FAIL [${index}]: "${input}" -> Expected to include "${expected}", but got "${actual}"`)
            failed++
        }
    } catch (err) {
        console.error(`ERROR [${index}]: "${input}" -> ${err.message}`)
        failed++
    }
})

console.log('--- Summary ---')
console.log(`Total: ${testCases.length}, Passed: ${passed}, Failed: ${failed}`)

if (failed > 0) {
    process.exit(1)
} else {
    process.exit(0)
}
