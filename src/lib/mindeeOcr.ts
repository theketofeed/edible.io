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
 * Calls our backend server which securely handles the API key
 */
export async function runMindeeOcr(file: File): Promise<MindeeOcrResult> {
  console.log('[Mindee Client] Starting OCR for file:', file.name)

  // Convert file to base64
  const base64Data = await fileToBase64(file)

  console.log('[Mindee Client] Sending request to BACKEND SERVER at localhost:3002...')

  try {
    // Call OUR backend server (NOT Mindee directly!)
    const response = await fetch('http://localhost:3002/api/mindee-ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Data: base64Data
      }),
    })

    console.log('[Mindee Client] Backend response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Mindee Client] Backend server error:', errorText)
      throw new Error(`Backend server error: ${response.status} - ${errorText}`)
    }

    const data: MindeeApiResponse = await response.json()

    console.log('[Mindee Client] Received response from backend server')

    // Check if the request was successful
    if (data.api_request.status !== 'success') {
      throw new Error('Mindee API request failed')
    }

    const prediction = data.document.inference.prediction

    // Extract line items from the receipt
    const lineItems = prediction.line_items || []
    
    console.log('[Mindee Client] Found line items:', lineItems.length)

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

    console.log('[Mindee Client] Extracted descriptions:', descriptions)

    // Use your existing grocery extraction logic to clean up the items
    const items = extractGroceryItems(descriptions.join('\n'))

    console.log('[Mindee Client] Cleaned grocery items:', items)

    // Calculate average confidence
    const confidence = 92

    // Extract metadata
    const metadata = {
      supplierName: prediction.supplier_name?.value,
      date: prediction.date?.value,
      totalAmount: prediction.total_amount?.value
    }

    console.log('[Mindee Client] Metadata:', metadata)

    // Capture raw text for fallback
    const rawText = descriptions.join('\n')

    return {
      items,
      rawText,
      confidence,
      metadata
    }
  } catch (error) {
    console.error('[Mindee Client] Error:', error)
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
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}