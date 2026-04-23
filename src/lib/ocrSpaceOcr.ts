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

/**
 * Convert a File to a base64 data URI string.
 */
async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

export async function runOcrSpace(file: File) {
    console.log('[OCR] Converting file to base64 for proxy...')

    const base64Image = await fileToBase64(file)

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

    try {
        console.log('[OCR] Sending request to backend OCR proxy...')

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 35000) // 35s (server has 30s internal timeout)

        try {
            const response = await fetch(`${backendUrl}/api/ocr`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    base64Image,
                    language: 'eng',
                    ocrEngine: '2' // Engine 2 is better for receipts/numbers
                }),
                signal: controller.signal
            })
            clearTimeout(timeoutId)

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }))
                throw new Error(`OCR proxy error: ${errorData.error || response.statusText}`)
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
            const confidence = rawText.length > 10 ? 90 : 50
            const items = extractGroceryItems(rawText)

            console.log('[OCR] ✅ Successfully parsed text:', rawText.substring(0, 100) + '...')

            return {
                items,
                rawText,
                confidence,
                metadata: null
            }

        } catch (fetchError: any) {
            clearTimeout(timeoutId)
            if (fetchError.name === 'AbortError' || (fetchError instanceof DOMException && fetchError.name === 'AbortError')) {
                throw new Error('OCR request timed out after 35 seconds. Please check your internet connection.')
            }
            throw fetchError
        }

    } catch (error) {
        console.error('OCR.space error:', error)
        throw error
    }
}
