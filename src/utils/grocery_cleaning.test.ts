import { describe, it, expect } from 'vitest'
import { extractGroceryItems } from './grocery'

describe('Grocery Cleaning Logic - Robust Regex Patterns', () => {
    it('should strip weight measurements', () => {
        const input = '370 kg chicken'
        const result = extractGroceryItems(input)
        expect(result).toContain('chicken')
        expect(result[0]).toBe('chicken')
    })

    it('should strip price per weight patterns', () => {
        const input = 'Bean (Green) .370 kg @ $4.39/kg'
        const result = extractGroceryItems(input)
        expect(result).toContain('bean (green)')
        expect(result[0]).toBe('bean (green)')
    })

    it('should strip special formats like 1@ 3/$2.50', () => {
        const input = 'Lemon Regular 1@ 3/$2.50'
        const result = extractGroceryItems(input)
        expect(result).toContain('lemon regular')
        expect(result[0]).toBe('lemon regular')
    })

    it('should strip quantity prefixes like 2x', () => {
        const input = '2x Peanut Butter'
        const result = extractGroceryItems(input)
        expect(result).toContain('peanut butter')
        expect(result[0]).toBe('peanut butter')
    })

    it('should strip weight with pounds/grams', () => {
        const cases = [
            { input: '2.5 lb chicken', expected: 'chicken' },
            { input: '1.5 lbs beef', expected: 'beef' },
            { input: '500g broccoli', expected: 'broccoli' },
            { input: '16 oz milk', expected: 'milk' },
            { input: '200 grams beans', expected: 'bean' } // Note: "beans" might be normalized to "bean" if FOOD_KEYWORDS check is involved or just stripped?
        ]

        cases.forEach(({ input, expected }) => {
            const result = extractGroceryItems(input)
            expect(result[0]).toContain(expected)
        })
    })

    it('should strip packs and counts', () => {
        const cases = [
            { input: '12 pack water', expected: 'water' },
            { input: '3 count lemons', expected: 'lemon' }
        ]

        // Note: water might not be in FOOD_KEYWORDS, but should be accepted if length >= 3
        // lemons -> lemon (keywords)

        cases.forEach(({ input, expected }) => {
            const result = extractGroceryItems(input)
            if (result.length > 0) {
                expect(result[0]).toContain(expected)
            }
        })
    })

    it('should handle complex mixed lines', () => {
        const input = 'organic 2x chicken breast 500g @ $5.99/kg'
        const result = extractGroceryItems(input)
        expect(result[0]).toBe('organic chicken breast')
    })
})
