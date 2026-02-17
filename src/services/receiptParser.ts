import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini
const apiKey = import.meta.env.VITE_GEMINI_API_KEY
// Fallback if key is missing, though App checks it
const genAI = new GoogleGenerativeAI(apiKey || 'missing-key')

export interface ParsedItem {
    id: string
    original: string
    name: string
    quantity: string
    category: string
    confidence: number // 0-100
}

export async function parseReceiptWithGemini(rawText: string): Promise<ParsedItem[]> {
    if (!apiKey) {
        console.warn('[ReceiptParser] No Gemini API key found.')
        return []
    }

    try {
        console.log('[ReceiptParser] Calling Gemini to parse receipt text...')
        // Use 2.5 flash model (1.5 models are deprecated)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

        const prompt = `
			You are a grocery receipt parser. I will provide raw text extracted from a receipt via OCR. 
			Your job is to identify valid grocery food items and format them into a strict JSON list.

			Rules:
			1. Ignore non-food items (taxes, totals, card info, store address, phone numbers).
			2. Ignore non-grocery items (paper towels, soap, etc.) UNLESS they are relevant for kitchen management.
			3. Extract the clean NAME of the item (remove codes like "04592", "Tax F").
			4. Extract the QUANTITY/WEIGHT if available (e.g. "2 lb", "1 gal", "2x"). If not specified, assume "1".
			5. Categorize each item into one of: "Produce", "Meat", "Dairy", "Pantry", "Frozen", "Other".
			6. Confidence: 0-100 based on how likely it is a real grocery item.
			7. Return JSON ONLY. No markdown code blocks. No intro text.

			RAW OCR TEXT:
			"""
			${rawText}
			"""

			Output format:
			[
				{ "name": "Bananas", "quantity": "2 lb", "category": "Produce", "confidence": 95 },
				{ "name": "Milk", "quantity": "1 gal", "category": "Dairy", "confidence": 98 }
			]
		`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        console.log('[ReceiptParser] Raw Gemini response:', text)

        // Clean codes if Gemini includes them
        const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim()

        try {
            const parsed: any[] = JSON.parse(cleanJson)
            if (!Array.isArray(parsed)) throw new Error('Response is not an array')

            return parsed.map((item, idx) => ({
                id: `item-${idx}-${Date.now()}`,
                original: item.name, // Keep original extraction as ref
                name: item.name,
                quantity: item.quantity || '1',
                category: item.category || 'Other',
                confidence: item.confidence || 80
            }))

        } catch (parseErr) {
            console.error('[ReceiptParser] JSON parse error:', parseErr)
            return []
        }

    } catch (err) {
        console.error('[ReceiptParser] Gemini API error:', err)
        return []
    }
}
