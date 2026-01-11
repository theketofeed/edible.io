import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '.env.local') })

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Get Mindee API key from environment (NOT exposed to browser)
const MINDEE_API_KEY = process.env.VITE_MINDEE_API_KEY

if (!MINDEE_API_KEY) {
  console.error('ERROR: VITE_MINDEE_API_KEY is not set in .env.local')
  process.exit(1)
}

console.log('Mindee server starting...')
console.log('API Key present:', !!MINDEE_API_KEY)
console.log('API Key length:', MINDEE_API_KEY?.length)

// Proxy endpoint for Mindee OCR
app.post('/api/mindee-ocr', async (req, res) => {
  try {
    const { base64Data } = req.body

    if (!base64Data) {
      return res.status(400).json({ error: 'base64Data is required' })
    }

    console.log('[Mindee Server] Processing OCR request...')
    console.log('[Mindee Server] Using API key:', MINDEE_API_KEY.substring(0, 15) + '...')

    // Call Mindee API from the server (secure)
    // Try BOTH authentication methods
    const headers = {
      'Authorization': `Token: ${MINDEE_API_KEY}`,
      'Content-Type': 'application/json',
    }

    console.log('[Mindee Server] Request headers:', {
      'Authorization': `Token: ${MINDEE_API_KEY.substring(0, 10)}...`,
      'Content-Type': 'application/json'
    })

    const response = await fetch(
      'https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict',
      {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          document: base64Data
        }),
      }
    )

    console.log('[Mindee Server] Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Mindee Server] API error:', errorText)
      return res.status(response.status).json({
        error: `Mindee API error: ${response.status} - ${errorText}`,
      })
    }

    const data = await response.json()
    console.log('[Mindee Server] Success! Returning data to client')
    res.json(data)
  } catch (error) {
    console.error('[Mindee Server] Error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

const PORT = process.env.PORT || 3002
app.listen(PORT, () => {
  console.log(`Mindee OCR server running on http://localhost:${PORT}`)
  console.log('Ready to process receipts!')
})