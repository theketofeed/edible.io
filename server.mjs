import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import DodoPayments from 'dodopayments'
import { Webhook } from 'standardwebhooks'
import crypto from 'crypto'

dotenv.config({ path: '.env.local' })

const app = express()
const PORT = process.env.PORT || 3001

const dodo = new DodoPayments({ 
  bearerToken: process.env.DODO_API_KEY,
  environment: process.env.DODO_ENV || 'test_mode',
})

console.log(`[Init] Dodo Environment: ${process.env.DODO_ENV || 'test_mode'}`)
if (!process.env.DODO_API_KEY) {
  console.warn('[Init] ⚠️ DODO_API_KEY is missing!')
}

const webhookSecret = process.env.DODO_WEBHOOK_SECRET
if (webhookSecret) {
  try {
    const secretBase64 = webhookSecret.split('_')[1]
    const decoded = Buffer.from(secretBase64, 'base64')
    console.log(`[Init] Webhook secret decoded length: ${decoded.length} bytes`)
  } catch (e) {
    console.error('[Init] ❌ Webhook secret decode error:', e.message)
  }
}

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
)

app.use(cors())

const rawBodyParser = express.raw({ type: 'application/json' })
app.use('/api/webhooks', rawBodyParser)
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ limit: '25mb', extended: true }))

// ─── Claude API proxy ──────────────────────────────────────────────────────
app.post('/api/claude', async (req, res) => {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => {
		controller.abort()
		console.warn('[Claude Backend] Request timed out after 25s')
	}, 25000)

	try {
		const { prompt } = req.body

		if (!prompt) {
			clearTimeout(timeoutId)
			return res.status(400).json({ error: 'Missing prompt' })
		}

		const apiKey = process.env.VITE_CLAUDE_API_KEY
		if (!apiKey || apiKey.trim() === '' || apiKey === 'your_key_here') {
			clearTimeout(timeoutId)
			console.warn('[Claude Backend] No valid Claude API key found.')
			return res.status(401).json({ error: 'Claude API key not configured' })
		}

		console.log('[Claude Backend] Sending to Claude...')
		console.log('[Claude Backend] API Key prefix:', apiKey.substring(0, 15) + '...')

		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: 'claude-haiku-4-5-20251001',
				max_tokens: 4096,
				system: 'You output JSON only. No code fences. No commentary.',
				messages: [{ role: 'user', content: prompt }],
				temperature: 0.55
			}),
			signal: controller.signal
		})

		clearTimeout(timeoutId)
		console.log('[Claude Backend] Response status:', response.status)

		if (!response.ok) {
			const text = await response.text().catch(() => '')
			console.error(`[Claude Backend] HTTP ${response.status}: ${text}`)
			return res.status(response.status).json({ error: `Claude API error: ${response.status}`, details: text })
		}

		const json = await response.json()
		console.log('[Claude Backend] ✅ Success')

		const rawContent = json.content || ''
		let text

		if (Array.isArray(rawContent)) {
			const textBlock = rawContent.find((b) => b.type === 'text')
			text = textBlock?.text || rawContent[0]?.text || ''
		} else if (typeof rawContent === 'string') {
			text = rawContent
		} else {
			text = JSON.stringify(rawContent)
		}

		res.json({ content: [{ type: 'text', text }] })
	} catch (err) {
		clearTimeout(timeoutId)
		console.error('[Claude Backend] Error:', err)
		if (err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('timed out')) {
			return res.status(504).json({ error: 'Claude API timed out' })
		}
		res.status(500).json({ error: err.message })
	}
})

// ─── OCR.space proxy ───────────────────────────────────────────────────────
app.post('/api/ocr', async (req, res) => {
	try {
		const apiKey = process.env.VITE_OCR_SPACE_API_KEY
		if (!apiKey) {
			return res.status(500).json({ error: 'OCR.space API key not configured on server' })
		}

		// The frontend sends us base64 image data + options
		const { base64Image, language, ocrEngine } = req.body

		if (!base64Image) {
			return res.status(400).json({ error: 'Missing base64Image in request body' })
		}

		console.log('[OCR Proxy] Forwarding request to OCR.space...')

		const formBody = new URLSearchParams()
		formBody.append('base64Image', base64Image)
		formBody.append('language', language || 'eng')
		formBody.append('isOverlayRequired', 'false')
		formBody.append('detectOrientation', 'true')
		formBody.append('scale', 'true')
		formBody.append('OCREngine', ocrEngine || '2')

		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 30000)

		const response = await fetch('https://api.ocr.space/parse/image', {
			method: 'POST',
			headers: {
				'apikey': apiKey,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: formBody.toString(),
			signal: controller.signal
		})
		clearTimeout(timeoutId)

		if (!response.ok) {
			const text = await response.text().catch(() => '')
			console.error(`[OCR Proxy] HTTP ${response.status}: ${text}`)
			return res.status(response.status).json({ error: `OCR.space API error: ${response.status}`, details: text })
		}

		const data = await response.json()
		console.log('[OCR Proxy] ✅ Success')
		res.json(data)

	} catch (err) {
		console.error('[OCR Proxy] Error:', err)
		if (err.name === 'AbortError') {
			return res.status(504).json({ error: 'OCR.space request timed out' })
		}
		res.status(500).json({ error: err.message })
	}
})

// ─── Checkout ──────────────────────────────────────────────────────────────
app.post('/api/checkout', async (req, res) => {
	try {
		const { productType, userId, userEmail } = req.body
		if (!productType || !userId || !userEmail) {
			return res.status(400).json({ error: 'Missing required fields' })
		}

		const productMap = {
			'pro_monthly': process.env.DODO_PRODUCT_PRO_MONTHLY,
			'pro_annual': process.env.DODO_PRODUCT_PRO_ANNUAL,
			'founding': process.env.DODO_PRODUCT_FOUNDING
		}

		const productId = productMap[productType]
		if (!productId) {
			return res.status(400).json({ error: 'Invalid product type' })
		}

		const session = await dodo.checkoutSessions.create({
			customer: { email: userEmail, name: userEmail.split('@')[0] },
			product_cart: [{ product_id: productId, quantity: 1 }],
			return_url: `${process.env.FRONTEND_URL}/payment-success`,
			metadata: { user_id: userId, product_type: productType }
		})

		if (!session?.checkout_url) {
			throw new Error('Dodo Payments failed to generate a checkout URL')
		}

		res.json({ checkout_url: session.checkout_url })
	} catch (err) {
		console.error('[Checkout] ❌ Error:', err)
		res.status(500).json({ error: err.message })
	}
})

// ─── Webhook ──────────────────────────────────────────────────────────────
app.post('/api/webhooks/dodo', async (req, res) => {
  try {
    const payload = req.body
    const secret = process.env.DODO_WEBHOOK_SECRET
    if (!secret) {
      return res.status(500).json({ error: 'Webhook secret not configured' })
    }

    const headers = {
      'webhook-id': req.headers['webhook-id'],
      'webhook-signature': req.headers['webhook-signature'],
      'webhook-timestamp': req.headers['webhook-timestamp']
    }

    let event
    try {
      const wh = new Webhook(secret)
      event = wh.verify(payload, headers)
    } catch (err) {
      console.error('[Webhook] ❌ Invalid signature:', err.message)
      return res.status(401).json({ error: 'Invalid signature' })
    }

    console.log('[Webhook] ✅ Valid event received:', event.type)

    if (event.type === 'payment.succeeded') {
      const metadata = event.data?.metadata || {}
      const userId = metadata.user_id
      const productType = metadata.product_type
      if (!userId) return res.status(200).json({ received: true })

      const plan = productType === 'founding' ? 'founding' : 'pro'
      let planExpiresAt = null
      if (productType === 'pro_monthly') planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      else if (productType === 'pro_annual') planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

      const { error } = await supabaseAdmin.from('profiles').update({
        plan, plan_expires_at: planExpiresAt,
        dodo_customer_id: event.data.customer?.customer_id || null,
        dodo_subscription_id: event.data.subscription_id || null
      }).eq('id', userId)

      if (error) console.error('[Webhook] ❌ Supabase error:', error)
      else console.log(`[Webhook] ✅ User ${userId} upgraded to ${plan}`)
    }

    if (event.type === 'subscription.cancelled' || event.type === 'subscription.expired') {
      const userId = event.data?.metadata?.user_id
      if (userId) {
        await supabaseAdmin.from('profiles').update({ plan: 'free', plan_expires_at: null }).eq('id', userId)
        console.log(`[Webhook] User ${userId} downgraded to free`)
      }
    }

    res.status(200).json({ received: true })
  } catch (err) {
    console.error('[Webhook] Unhandled error:', err)
    res.status(200).json({ error: err.message })
  }
})

// ─── HuggingFace Image Generation Proxy ────────────────────────────────────
app.post('/api/generate-meal-image', async (req, res) => {
	const { mealTitle } = req.body

	if (!mealTitle || typeof mealTitle !== 'string') {
		return res.status(400).json({ error: 'Missing or invalid mealTitle' })
	}

	const apiKey = process.env.VITE_HF_API_KEY
	if (!apiKey || apiKey.trim() === '' || apiKey === 'your_key_here') {
		console.warn('[MealImages] No valid HuggingFace API key found.')
		return res.status(400).json({ error: 'HuggingFace API key not configured' })
	}

	const HF_MODEL_URL = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell'

	const buildFoodPrompt = (title) => [
		title,
		'professional food photography',
		'restaurant quality plating',
		'natural lighting',
		'shallow depth of field',
		'white ceramic plate',
		'appetizing',
		'vibrant colors',
		'4k ultra HD',
	].join(', ')

	const prompt = buildFoodPrompt(mealTitle)

	try {
		console.log(`[MealImages] Generating image for: "${mealTitle}"`)

		const response = await fetch(HF_MODEL_URL, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ inputs: prompt }),
			timeout: 35000,
		})

		// Model cold-starting — wait and retry once
		if (response.status === 503) {
			const errorData = await response.json().catch(() => ({}))
			const waitMs = Math.min((errorData.estimated_time || 20) * 1000, 20000)
			console.log(`[MealImages] HF model loading, waiting ${waitMs / 1000}s...`)
			await new Promise(r => setTimeout(r, waitMs))

			const retry = await fetch(HF_MODEL_URL, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ inputs: prompt }),
				timeout: 35000,
			})

			if (!retry.ok) {
				console.warn(`[MealImages] HF retry failed: ${retry.status}`)
				return res.status(500).json({ error: 'HuggingFace retry failed' })
			}

			const blob = await retry.buffer()
			res.set('Content-Type', 'image/jpeg')
			return res.send(blob)
		}

		if (!response.ok) {
			const text = await response.text().catch(() => '')
			console.warn(`[MealImages] HF API error: ${response.status} - ${text}`)
			return res.status(response.status).json({ error: `HuggingFace API error: ${response.status}` })
		}

		const blob = await response.buffer()
		console.log(`[MealImages] ✅ HF generated image (${blob.length} bytes) for: "${mealTitle}"`)
		res.set('Content-Type', 'image/jpeg')
		res.send(blob)
	} catch (err) {
		console.error('[MealImages] Generation failed:', err?.message || err)
		res.status(500).json({ error: 'Image generation failed', details: err?.message })
	}
})

// ─── Health check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
	console.log(`✅ Backend running on http://localhost:${PORT}`)
	console.log(`📍 Claude proxy: http://localhost:${PORT}/api/claude`)
})
