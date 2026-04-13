// Receipt Parser - Groq only (Gemini removed)
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

export interface ParsedItem {
	id: string
	original: string
	name: string
	quantity: string
	category: string
	confidence: number
}

const PARSER_PROMPT = `You are a grocery receipt parser. I will provide raw text extracted from a receipt via OCR. 
Your job is to identify valid grocery food items and format them into a strict JSON list.

Rules:
1. Ignore non-food items (taxes, totals, card info, store address, phone numbers, dates, transaction codes).
2. Extract the clean NAME of the item (remove price codes like "04592", "Tax F", store loyalty info, etc.).
3. Extract the QUANTITY/WEIGHT if available (e.g. "2 lb", "1 gal", "2x"). If not specified, use "1".
4. Categorize each item into one of: "Produce", "Meat", "Dairy", "Pantry", "Frozen", "Bakery", "Other".
5. Confidence: 0-100 based on how likely it is a real grocery item.
6. Return a JSON array ONLY. No markdown code fences. No intro text. No explanation.

Output format (array only, no wrapper object):
[
  { "name": "Bananas", "quantity": "2 lb", "category": "Produce", "confidence": 95 },
  { "name": "Whole Milk", "quantity": "1 gal", "category": "Dairy", "confidence": 98 }
]`

export async function parseReceiptWithGemini(rawText: string): Promise<ParsedItem[]> {
	// Gemini removed — using Groq (llama-3.3-70b) directly
	return parseReceiptWithGroq(rawText)
}

async function parseReceiptWithGroq(rawText: string): Promise<ParsedItem[]> {
	if (!GROQ_API_KEY) {
		console.warn('[ReceiptParser] No Groq API key found.')
		return []
	}

	try {
		console.log('[ReceiptParser] Parsing receipt with Groq (llama-3.3-70b)...')

		const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${GROQ_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: 'llama-3.3-70b-versatile',
				messages: [
					{ role: 'system', content: PARSER_PROMPT },
					{ role: 'user', content: `RAW OCR TEXT:\n"""\n${rawText}\n"""` }
				],
				temperature: 0.1,
				max_tokens: 2000
			})
		})

		if (!response.ok) {
			throw new Error(`Groq API error: ${response.status} ${response.statusText}`)
		}

		const data = await response.json()
		const text = data.choices?.[0]?.message?.content || ''
		console.log('[ReceiptParser] Raw Groq response:', text.substring(0, 300))
		return parseLLMResponse(text)
	} catch (err) {
		console.error('[ReceiptParser] Groq parsing failed:', err)
		return []
	}
}

function parseLLMResponse(text: string): ParsedItem[] {
	try {
		// Strip markdown code fences if present
		const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim()

		let parsed = JSON.parse(cleanJson)

		// Handle cases where model wraps array in object
		if (!Array.isArray(parsed) && typeof parsed === 'object') {
			const possibleArray = Object.values(parsed).find(v => Array.isArray(v))
			if (possibleArray) parsed = possibleArray
		}

		if (!Array.isArray(parsed)) throw new Error('Response is not an array')

		return parsed
			.filter(item => item.name && String(item.name).trim().length > 1)
			.map((item, idx) => ({
				id: `item-${idx}-${Date.now()}`,
				original: item.name,
				name: String(item.name).trim(),
				quantity: String(item.quantity || '1').trim(),
				category: item.category || 'Other',
				confidence: Number(item.confidence) || 80
			}))
	} catch (err) {
		console.error('[ReceiptParser] Failed to parse LLM JSON response:', err)
		return []
	}
}
