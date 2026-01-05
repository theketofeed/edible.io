import { extractGroceryItems } from '../utils/grocery'

export interface VisionOcrResult {
  items: string[]
  rawText: string
  confidence: number
}

export async function runGoogleVisionOcr(file: File): Promise<VisionOcrResult> {
  console.log('[Google Vision] Starting OCR for file:', file.name)

  // Convert file to base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

  console.log('[Google Vision] Sending request to backend...')

  // Call backend OCR endpoint (API key is secure on the server)
  const response = await fetch('http://localhost:3001/api/ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base64Data }),
  })

  console.log('[Google Vision] Backend response status:', response.status)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Google Vision] Backend error:', errorText)
    throw new Error(`OCR server error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  // Extract text from response
  const textAnnotations = data.responses[0]?.textAnnotations

  if (!textAnnotations || textAnnotations.length === 0) {
    console.warn('[Google Vision] No text detected in image')
    return { items: [], rawText: '', confidence: 0 }
  }

  // First annotation contains all text
  const rawText = textAnnotations[0].description || ''

  // Calculate average confidence
  const confidence = textAnnotations[0].confidence
    ? textAnnotations[0].confidence * 100
    : 95 // Google Vision is typically 95%+ confident

  console.log('[Google Vision] Raw text extracted:', rawText)
  console.log('[Google Vision] Confidence:', confidence)

  // Use the imported grocery extraction function
  const items = extractGroceryItems(rawText)

  console.log('[Google Vision] Extracted items:', items)

  return {
    items,
    rawText,
    confidence,
  }
}