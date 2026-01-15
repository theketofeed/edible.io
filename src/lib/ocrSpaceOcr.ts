import { extractGroceryItems } from '../utils/grocery'

interface OcrSpaceResponse {
    ParsedResults?: Array<{
        ParsedText: string
        ErrorMessage?: string
        ErrorDetails?: string
    }>
    IsErroredOnProcessing?: boolean
    ErrorMessage?: Array<string>
    OCRExitCode?: number
}

export async function runOcrSpace(file: File) {
    const apiKey = import.meta.env.VITE_OCR_SPACE_API_KEY

    // Diagnostic logging
    console.log('[OCR] Loading env vars. Available keys:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')))

    if (!apiKey) {
        throw new Error(`Missing OCR.space API key. Available keys: ${Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')).join(', ')}`)
    }

    const formData = new FormData()
    formData.append('file', file)
    // formData.append('apikey', apiKey) // Using header instead
    formData.append('language', 'eng')
    formData.append('isOverlayRequired', 'false')
    formData.append('detectOrientation', 'true')
    formData.append('scale', 'true')
    formData.append('OCREngine', '2') // Engine 2 is better for receipts/numbers

    try {
        console.log('[OCR] Sending request to OCR.space with key length:', apiKey.length)
        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                'apikey': apiKey
            },
            body: formData,
        })

        if (!response.ok) {
            throw new Error(`OCR.space API error: ${response.statusText}`)
        }

        const data: OcrSpaceResponse = await response.json()

        if (data.IsErroredOnProcessing || (data.ErrorMessage && data.ErrorMessage.length > 0)) {
            const errorMsg = data.ErrorMessage?.join(', ') || 'Unknown error from OCR.space'
            throw new Error(errorMsg)
        }

        if (!data.ParsedResults || data.ParsedResults.length === 0) {
            return {
                items: [],
                rawText: '',
                confidence: 0,
                metadata: null
            }
        }

        const result = data.ParsedResults[0]
        const rawText = result.ParsedText || ''

        // OCR.space doesn't give a simple confidence score per document like Mindee
        // We can mock it or calculate it if needed, but for now we'll imply success = high confidence
        const confidence = rawText.length > 10 ? 90 : 50

        const items = extractGroceryItems(rawText)

        return {
            items,
            rawText,
            confidence, // Mocked confidence
            metadata: null // OCR.space simple endpoint doesn't extract structured metadata like Mindee
        }

    } catch (error) {
        console.error('OCR.space error:', error)
        throw error
    }
}
