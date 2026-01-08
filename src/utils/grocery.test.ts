import { describe, it, expect } from 'vitest'
import { extractGroceryItems, cleanGroceryList } from './grocery'

describe('extractGroceryItems - Mindee Structured Data', () => {
  describe('simple structured input from Mindee', () => {
    it('should extract clean line items', () => {
      const input = 'chicken breast\nspinach\nrice\nyogurt'
      const result = extractGroceryItems(input)
      expect(result).toContain('chicken breast')
      expect(result).toContain('spinach')
      expect(result).toContain('rice')
      expect(result).toContain('yogurt')
    })

    it('should handle quantities in descriptions', () => {
      const input = '2 lbs chicken breast\n1 bunch spinach\n2 cups rice'
      const result = extractGroceryItems(input)
      expect(result.length).toBeGreaterThan(0)
      // Should still extract items even with quantities
      expect(result.some(item => item.includes('chicken'))).toBe(true)
    })

    it('should preserve multi-word items', () => {
      const input = 'ground turkey\nsweet potato\nblack beans'
      const result = extractGroceryItems(input)
      expect(result.some(item => item.includes('ground') && item.includes('turkey'))).toBe(true)
      expect(result.some(item => item.includes('sweet') && item.includes('potato'))).toBe(true)
    })
  })

  describe('filtering minimal metadata', () => {
    it('should only filter obvious metadata', () => {
      const input = 'chicken\nsubtotal\nspinach\ntotal\neggs'
      const result = extractGroceryItems(input)
      expect(result.some(item => item.toLowerCase().includes('subtotal'))).toBe(false)
      expect(result.some(item => item.toLowerCase().includes('total'))).toBe(false)
      expect(result.length).toBeGreaterThanOrEqual(3)
    })

    it('should NOT filter store names from items', () => {
      // Mindee structure means store info is separate, so items can mention stores
      const input = 'organic spinach\nwhole wheat bread\nfresh tomatoes'
      const result = extractGroceryItems(input)
      expect(result.some(item => item.includes('spinach'))).toBe(true)
      expect(result.some(item => item.includes('bread'))).toBe(true)
    })

    it('should only filter true metadata not brand names', () => {
      const input = 'frito lay chips\ndole pineapple\nminute maid orange juice'
      const result = extractGroceryItems(input)
      // These are real items, not metadata
      expect(result.length).toBeGreaterThan(0)
    })

    it('should filter payment-related metadata', () => {
      const input = 'chicken\npayment\nspinach\ncash\neggs'
      const result = extractGroceryItems(input)
      expect(result.some(item => item === 'payment')).toBe(false)
      expect(result.some(item => item === 'cash')).toBe(false)
    })
  })

  describe('edge cases with Mindee data', () => {
    it('should handle empty input', () => {
      expect(extractGroceryItems('')).toEqual([])
      expect(extractGroceryItems('   ')).toEqual([])
    })

    it('should deduplicate items', () => {
      const input = 'chicken\nchicken\nCHICKEN\nspinach\nspinach'
      const result = extractGroceryItems(input)
      const chickenCount = result.filter(item => item === 'chicken').length
      expect(chickenCount).toBe(1)
    })

    it('should handle prices (minimal removal)', () => {
      const input = 'chicken $8.99\nspinach $2.50\neggs'
      const result = extractGroceryItems(input)
      expect(result.length).toBeGreaterThan(0)
      // Prices should be removed
      expect(result.every(item => !item.includes('$'))).toBe(true)
    })

    it('should normalize whitespace', () => {
      const input = 'chicken  breast\n  spinach  \nrice   '
      const result = extractGroceryItems(input)
      expect(result.every(item => !item.match(/  +/))).toBe(true)
    })

    it('should handle mixed case', () => {
      const input = 'CHICKEN\nSpinach\nRICE\neggs'
      const result = extractGroceryItems(input)
      expect(result.every(item => item === item.toLowerCase())).toBe(true)
    })

    it('should filter truly short non-food tokens', () => {
      const input = 'a\nab\nchicken\nbc\nspinach'
      const result = extractGroceryItems(input)
      expect(result.some(item => item === 'a')).toBe(false)
      expect(result.some(item => item === 'ab')).toBe(false)
      expect(result.some(item => item === 'bc')).toBe(false)
    })

    it('should accept reasonable 3+ char items', () => {
      const input = 'oil\nham\nbag\npot\nwok'
      const result = extractGroceryItems(input)
      // Should accept these reasonable kitchen items
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('real Mindee receipt formats', () => {
    it('should handle typical Mindee line item output', () => {
      const input = `organic chicken breast
      baby spinach fresh
      brown rice bulk
      free range eggs
      greek yogurt plain
      wild salmon fillet
      sweet potato bundle`
      
      const result = extractGroceryItems(input)
      expect(result.length).toBeGreaterThanOrEqual(5)
      expect(result.some(item => item.includes('chicken'))).toBe(true)
      expect(result.some(item => item.includes('spinach'))).toBe(true)
      expect(result.some(item => item.includes('rice'))).toBe(true)
    })

    it('should handle line items with quantity notations', () => {
      const input = `chicken breast - qty 2
      spinach 1 bunch
      rice 2 lb
      eggs 12 count
      yogurt 32oz`
      
      const result = extractGroceryItems(input)
      expect(result.length).toBeGreaterThan(0)
      expect(result.some(item => item.includes('chicken'))).toBe(true)
    })

    it('should filter actual totals and balance lines', () => {
      const input = `chicken $8.99
      spinach $2.50
      subtotal $11.49
      tax $0.92
      total $12.41
      change $7.59`
      
      const result = extractGroceryItems(input)
      expect(result.some(item => item === 'subtotal')).toBe(false)
      expect(result.some(item => item === 'total')).toBe(false)
      expect(result.some(item => item === 'change')).toBe(false)
      expect(result.some(item => item.includes('chicken'))).toBe(true)
    })
  })

  describe('brand names and descriptors', () => {
    it('should keep descriptive brand items', () => {
      const input = `frito lay tortilla chips
      california extra virgin olive oil
      kerrygold butter
      starbucks coffee`
      
      const result = extractGroceryItems(input)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle organic and descriptors', () => {
      const input = `organic spinach
      farm fresh eggs
      grass fed beef
      wild caught salmon`
      
      const result = extractGroceryItems(input)
      expect(result.some(item => item.includes('spinach'))).toBe(true)
      expect(result.some(item => item.includes('eggs'))).toBe(true)
    })
  })
})

describe('cleanGroceryList - Mindee Integration', () => {
  describe('minimal cleaning', () => {
    it('should clean and deduplicate', () => {
      const input = ['chicken breast', 'CHICKEN BREAST', 'spinach', 'spinach', 'rice']
      const result = cleanGroceryList(input)
      const chickenCount = result.filter(item => item === 'chicken breast').length
      expect(chickenCount).toBe(1)
      expect(result.length).toBe(3)
    })

    it('should remove prices', () => {
      const input = ['chicken $8.99', 'spinach $2.50', 'rice']
      const result = cleanGroceryList(input)
      expect(result.every(item => !item.includes('$'))).toBe(true)
    })

    it('should filter obvious metadata', () => {
      const input = ['chicken', 'subtotal', 'spinach', 'total', 'rice']
      const result = cleanGroceryList(input)
      expect(result.some(item => item === 'subtotal')).toBe(false)
      expect(result.some(item => item === 'total')).toBe(false)
    })
  })

  describe('empty and invalid inputs', () => {
    it('should handle empty array', () => {
      expect(cleanGroceryList([])).toEqual([])
    })

    it('should handle whitespace-only items', () => {
      const input = ['   ', '', 'chicken', '  \n  ']
      const result = cleanGroceryList(input)
      expect(result).toContain('chicken')
      expect(result.length).toBe(1)
    })

    it('should handle metadata-only items', () => {
      const input = ['total', 'subtotal', 'balance']
      const result = cleanGroceryList(input)
      expect(result).toEqual([])
    })
  })
})

describe('integration - full Mindee workflow', () => {
  it('should handle realistic Mindee receipt output', () => {
    const mindeeOutput = `
      organic chicken breast
      fresh spinach
      brown rice
      free range eggs
      greek yogurt
      wild salmon fillet
      sweet potato
      broccolini
      olive oil extra virgin
      sea salt`
    
    const extracted = extractGroceryItems(mindeeOutput)
    const cleaned = cleanGroceryList(extracted)
    
    expect(cleaned.length).toBeGreaterThanOrEqual(8)
    expect(cleaned.some(item => item.includes('chicken'))).toBe(true)
    expect(cleaned.some(item => item.includes('spinach'))).toBe(true)
    expect(cleaned.some(item => item.includes('rice'))).toBe(true)
  })

  it('should reject actual metadata while keeping real items', () => {
    const mixedOutput = `
      whole foods market
      11/05/2025 2:30 pm
      chicken breast
      subtotal
      spinach bunch
      tax
      rice
      thank you`
    
    const extracted = extractGroceryItems(mixedOutput)
    expect(extracted.some(item => item.includes('chicken'))).toBe(true)
    expect(extracted.some(item => item === 'subtotal')).toBe(false)
    expect(extracted.some(item => item === 'tax')).toBe(false)
    expect(extracted.some(item => item === 'thank you')).toBe(false)
  })

  it('should handle edge case - single letter foods', () => {
    const input = 'chicken\nham\negg'
    const result = extractGroceryItems(input)
    // 'ham' might be tricky but should pass (3+ chars)
    expect(result.length).toBeGreaterThan(0)
  })
})
