import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize API Keys
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || 'missing-key')

export interface ParsedItem {
	id: string
	original: string
	name: string
	quantity: string
	category: string
	confidence: number // 0-100
}

const PARSER_PROMPT = `
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

Output format:
[
	{ "name": "Bananas", "quantity": "2 lb", "category": "Produce", "confidence": 95 },
	{ "name": "Milk", "quantity": "1 gal", "category": "Dairy", "confidence": 98 }
]
`

/**
 * Main entry point with fallback logic
 */
export async function parseReceiptWithGemini(rawText: string): Promise<ParsedItem[]> {
	console.log('[ReceiptParser] Using Gemini as primary parser...')
	
	try {
		const items = await tryGeminiWithRetry(rawText)
		if (items.length > 0) return items
		
		console.warn('[ReceiptParser] Gemini returned empty or failed, trying Groq fallback...')
		return await parseReceiptWithGroq(rawText)
	} catch (err) {
		console.error('[ReceiptParser] Gemini failed completely, trying Groq fallback...', err)
		return await parseReceiptWithGroq(rawText)
	}
}

async function tryGeminiWithRetry(rawText: string, retries = 2): Promise<ParsedItem[]> {
	if (!GEMINI_API_KEY) return []

	for (let i = 0; i <= retries; i++) {
		try {
			// Use 1.5-pro for better compatibility and reasoning
			const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
			const fullPrompt = `${PARSER_PROMPT}\n\nRAW OCR TEXT:\n\"\"\"\n${rawText}\n\"\"\"`
			
			const result = await model.generateContent(fullPrompt)
			const text = result.response.text()
			return parseLLMResponse(text)
		} catch (err: any) {
			const is503 = err?.message?.includes('503') || err?.status === 503
			if (is503 && i < retries) {
				const delay = Math.pow(2, i) * 1000
				console.warn(`[ReceiptParser] Gemini 503 error. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`)
				await new Promise(resolve => setTimeout(resolve, delay))
				continue
			}
			throw err
		}
	}
	return []
}

async function parseReceiptWithGroq(rawText: string): Promise<ParsedItem[]> {
	if (!GROQ_API_KEY) {
		console.warn('[ReceiptParser] No Groq API key found for fallback.')
		return []
	}

	try {
		console.log('[ReceiptParser] Calling Groq (Llama 3) fallback...')
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
					{ role: 'user', content: `RAW OCR TEXT:\n\"\"\"\n${rawText}\n\"\"\"` }
				],
				temperature: 0.1,
				response_format: { type: 'json_object' }
			})
		})

		if (!response.ok) {
			throw new Error(`Groq API error: ${response.status} ${response.statusText}`)
		}

		const data = await response.json()
		const text = data.choices[0].message.content
		
		// Llama might wrap in a root object if response_format is used, 
		// but let's try to parse it directly first
		return parseLLMResponse(text)
	} catch (err) {
		console.error('[ReceiptParser] Groq fallback failed:', err)
		return []
	}
}

function parseLLMResponse(text: string): ParsedItem[] {
	try {
		// Clean markdown blocks if present
		const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim()
		let parsed = JSON.parse(cleanJson)
		
		// Handle cases where some models wrap the array in an object
		if (!Array.isArray(parsed) && typeof parsed === 'object') {
			// Look for any array property (common if model wraps in { "items": [...] })
			const possibleArray = Object.values(parsed).find(v => Array.isArray(v))
			if (possibleArray) parsed = possibleArray
		}

		if (!Array.isArray(parsed)) throw new Error('Response is not an array')

		return parsed.map((item, idx) => ({
			id: `item-${idx}-${Date.now()}`,
			original: item.name,
			name: item.name,
			quantity: item.quantity || '1',
			category: item.category || 'Other',
			confidence: item.confidence || 80
		}))
	} catch (err) {
		console.error('[ReceiptParser] Error parsing LLM response JSON:', err)
		return []
	}
}
