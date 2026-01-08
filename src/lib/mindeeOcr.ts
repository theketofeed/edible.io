import { extractGroceryItems } from '../utils/grocery'

export interface MindeeOcrResult {
  items: string[]
  rawText: string
  confidence: number
  metadata?: {
    date?: string
    supplierName?: string
    totalAmount?: number
  }
}

interface MindeeLineItem {
  description?: string
  quantity?: number | { value?: number }
  unit?: { value?: string }
  total_amount?: number
}

interface MindeeQuantity {
  value?: number
}

interface MindeeApiResponse {
  api_request: {
    status: string
  }
  document: {
    inference: {
      prediction: {
        supplier_name?: { value?: string }
        date?: { value?: string }
        total_amount?: { value?: number }
        line_items?: MindeeLineItem[]
      }
      pages: Array<{
        prediction: {
          line_items?: MindeeLineItem[]
        }
      }>
    }
  }
}

/**
 * Process a receipt using Mindee's Receipt OCR API
 * Mindee is specifically trained for receipts and returns structured data
 */
export async function runMindeeOcr(file: File): Promise<MindeeOcrResult> {
  console.log('[Mindee] Starting OCR for file:', file.name)

  const apiKey = import.meta.env.VITE_MINDEE_API_KEY as string | undefined

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_mindee_api_key_here') {
    throw new Error('Mindee API key not configured. Please add VITE_MINDEE_API_KEY to your .env.local file')
  }

  // Convert file to base64 (Mindee accepts base64 or multipart)
  const base64Data = await fileToBase64(file)

  console.log('[Mindee] Sending request to Mindee API...')

  try {
    // Mindee Receipt API endpoint (v5 is the latest)
    const response = await fetch('https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document: base64Data
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Mindee] API error:', errorText)
      throw new Error(`Mindee API error: ${response.status} - ${errorText}`)
    }

    const data: MindeeApiResponse = await response.json()

    console.log('[Mindee] Raw API response:', JSON.stringify(data, null, 2))

    // Check if the request was successful
    if (data.api_request.status !== 'success') {
      throw new Error('Mindee API request failed')
    }

    const prediction = data.document.inference.prediction

    // Extract line items from the receipt
    const lineItems = prediction.line_items || []
    
    console.log('[Mindee] Found line items:', lineItems.length)

    // Extract item descriptions with quantity information when available
    const descriptions = lineItems
      .map(item => {
        if (!item.description) return null
        let desc = item.description.trim()
        
        // Enhance with quantity info if available
        const qty = typeof item.quantity === 'number' 
          ? item.quantity 
          : item.quantity?.value
        const unit = item.unit?.value
        
        if (qty && qty > 1) {
          const unitStr = unit ? ` ${unit}` : ''
          desc = `${qty}${unitStr} ${desc}`
        }
        
        return desc.length > 0 ? desc : null
      })
      .filter((desc): desc is string => !!desc)

    console.log('[Mindee] Extracted item descriptions with quantities:', descriptions)

    // Use your existing grocery extraction logic to clean up the items
    const items = extractGroceryItems(descriptions.join('\n'))

    console.log('[Mindee] Cleaned grocery items:', items)

    // Calculate average confidence (Mindee is typically 90%+ for receipts)
    const confidence = 92 // Mindee doesn't provide item-level confidence, but receipt accuracy is ~92%

    // Extract metadata
    const metadata = {
      supplierName: prediction.supplier_name?.value,
      date: prediction.date?.value,
      totalAmount: prediction.total_amount?.value
    }

    console.log('[Mindee] Metadata:', metadata)

    // Also capture raw text for fallback (join all descriptions)
    const rawText = descriptions.join('\n')

    return {
      items,
      rawText,
      confidence,
      metadata
    }
  } catch (error) {
    console.error('[Mindee] Error:', error)
    throw error
  }
}

/**
 * Convert File to base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
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
}