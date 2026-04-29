import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
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
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL,
  'https://youractualdomain.com', // replace with your real domain
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))

const rawBodyParser = express.raw({ type: 'application/json' })
app.use('/api/webhooks', rawBodyParser)
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ limit: '25mb', extended: true }))

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
})

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI calls per minute per IP
  message: { error: 'AI rate limit reached. Please wait a moment.' }
})

const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many checkout attempts.' }
})

app.use(generalLimiter) // applies to everything

// ─── Claude API proxy ──────────────────────────────────────────────────────
app.post('/api/claude', aiLimiter, async (req, res) => {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => {
		controller.abort()
		console.warn('[Claude Backend] Request timed out after 25s')
	}, 25000)

	try {
		const { prompt } = req.body
		if (typeof prompt !== 'string' || prompt.length > 20000) {
			clearTimeout(timeoutId)
			return res.status(400).json({ error: 'Invalid prompt' })
		}

		const apiKey = process.env.CLAUDE_API_KEY
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
				model: 'claude-haiku-4-5',
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

// ─── Groq API proxy ────────────────────────────────────────────────────────
app.post('/api/groq', aiLimiter, async (req, res) => {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), 15000)
	try {
		const { messages, model, temperature, max_tokens } = req.body
		if (!Array.isArray(messages) || messages.length > 20) {
			clearTimeout(timeoutId)
			return res.status(400).json({ error: 'Invalid messages' })
		}
		for (const msg of messages) {
			if (typeof msg.content !== 'string' || msg.content.length > 20000) {
				clearTimeout(timeoutId)
				return res.status(400).json({ error: 'Message too large' })
			}
		}

		const apiKey = process.env.GROQ_API_KEY
		if (!apiKey) {
			clearTimeout(timeoutId)
			return res.status(401).json({ error: 'Groq API key not configured' })
		}

		const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				messages,
				model: model || 'llama-3.3-70b-versatile',
				temperature: temperature ?? 0.4,
				max_tokens: max_tokens || 4096,
				response_format: { type: 'json_object' }
			}),
			signal: controller.signal
		})
		clearTimeout(timeoutId)

		if (!response.ok) {
			const text = await response.text().catch(() => '')
			return res.status(response.status).json({ error: `Groq error: ${response.status}`, details: text })
		}

		const json = await response.json()
		res.json(json)
	} catch (err) {
		clearTimeout(timeoutId)
		if (err.name === 'AbortError') return res.status(504).json({ error: 'Groq timed out' })
		res.status(500).json({ error: err.message })
	}
})

// ─── OCR.space proxy ───────────────────────────────────────────────────────
app.post('/api/ocr', async (req, res) => {
	try {
		const apiKey = process.env.OCR_SPACE_API_KEY
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
app.post('/api/checkout', checkoutLimiter, async (req, res) => {
	try {
		const { productType, userId, userEmail } = req.body
		if (typeof userId !== 'string' || typeof userEmail !== 'string' || 
				!userEmail.includes('@') || userId.length > 100) {
			return res.status(400).json({ error: 'Invalid user data' })
		}
		if (!productType) {
			return res.status(400).json({ error: 'Missing productType' })
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
app.post('/api/generate-meal-image', aiLimiter, async (req, res) => {
	const { mealTitle } = req.body
	if (typeof mealTitle !== 'string' || mealTitle.length > 200) {
		return res.status(400).json({ error: 'Invalid meal title' })
	}

	const apiKey = process.env.HF_API_KEY?.trim()
	if (!apiKey || apiKey === 'your_key_here') {
		console.warn('[MealImages] ⚠️ No valid HuggingFace API key found. Check .env.local HF_API_KEY')
		return res.status(401).json({ error: 'HuggingFace API key not configured' })
	}

	// Try multiple models with fallback strategy
	const models = [
		'stabilityai/stable-diffusion-3.5-large-turbo',  
		'black-forest-labs/FLUX.1-dev',  
		'stabilityai/stable-diffusion-xl-base-1.0',
	]

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

	for (const model of models) {
		const HF_MODEL_URL = `https://api-inference.huggingface.co/models/${model}`

		try {
			console.log(`[MealImages] Attempting generation with model: ${model}`)
			console.log(`[MealImages] API Key prefix: ${apiKey.substring(0, 10)}...`)
			console.log(`[MealImages] Prompt: "${prompt.substring(0, 80)}..."`)

			const response = await fetch(HF_MODEL_URL, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ inputs: prompt }),
				signal: AbortSignal.timeout(35000),
			})

			console.log(`[MealImages] ${model} response status: ${response.status}`)

			// Model cold-starting — wait and retry once
			if (response.status === 503) {
				const errorData = await response.json().catch(() => ({}))
				const waitMs = Math.min((errorData.estimated_time || 20) * 1000, 20000)
				console.log(`[MealImages] Model loading (503), waiting ${waitMs / 1000}s...`)
				await new Promise(r => setTimeout(r, waitMs))

				const retry = await fetch(HF_MODEL_URL, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${apiKey}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ inputs: prompt }),
					signal: AbortSignal.timeout(35000),
				})

				if (!retry.ok) {
					console.warn(`[MealImages] Retry failed with status ${retry.status}`)
					continue // Try next model
				}

				const arrayBuffer = await retry.arrayBuffer()
				const blob = Buffer.from(arrayBuffer)
				console.log(`[MealImages] ✅ Generated (${blob.length} bytes) with ${model}`)
				res.set('Content-Type', 'image/jpeg')
				return res.send(blob)
			}

			if (response.ok) {
				const arrayBuffer = await response.arrayBuffer()
				const blob = Buffer.from(arrayBuffer)
				if (blob.length > 0) {
					console.log(`[MealImages] ✅ Generated (${blob.length} bytes) with ${model}`)
					res.set('Content-Type', 'image/jpeg')
					return res.send(blob)
				}
			}

			// If model failed, log and try next
			const errorText = await response.text().catch(() => 'Unknown error')
			console.warn(`[MealImages] ${model} failed (${response.status}): ${errorText.substring(0, 100)}`)
			continue

		} catch (err) {
			console.error(`[MealImages] ${model} error:`, err?.message || err)
			continue // Try next model
		}
	}

	// All HF models exhausted — try Pollinations AI (super reliable fallback)
	try {
		console.log('[MealImages] 🔄 Attempting Pollinations AI fallback...')
		const encodedPrompt = encodeURIComponent(prompt)
		const pollinationsUrl = `https://image.pollinations.ai/image?prompt=${encodedPrompt}&width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}`
		
		let pResponse;
		let retries = 8;
		let baseWait = 1000;
		
		while (retries > 0) {
			try {
				pResponse = await fetch(pollinationsUrl, { 
					signal: AbortSignal.timeout(30000),
					headers: {
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
					}
				})
				if (pResponse.ok) {
					const arrayBuffer = await pResponse.arrayBuffer()
					const blob = Buffer.from(arrayBuffer)
					if (blob.length > 0) {
						console.log(`[MealImages] ✅ Generated (${blob.length} bytes) with Pollinations fallback`)
						res.set('Content-Type', 'image/jpeg')
						return res.send(blob)
					}
				}
				
				// Handle rate limiting (429) with exponential backoff
				if (pResponse.status === 429) {
					retries--;
					if (retries > 0) {
						const waitTime = baseWait * Math.pow(2, 5 - retries); // exponential: 2000, 4000, 8000
						console.log(`[MealImages] Rate limited (429), waiting ${waitTime}ms... (${retries} retries left)`);
						await new Promise(r => setTimeout(r, waitTime));
						continue;
					}
				} else if (pResponse.status === 401 || pResponse.status === 403) {
					retries--;
					if (retries > 0) {
						console.log(`[MealImages] Auth error (${pResponse.status}), waiting 2s...`);
						await new Promise(r => setTimeout(r, 2000));
						continue;
					}
				}
				
				retries = 0; // Exit on other errors
			} catch (fetchErr) {
				retries--;
				if (retries > 0) {
					console.log(`[MealImages] Pollinations fetch error: ${fetchErr.message}, retrying...`);
					await new Promise(r => setTimeout(r, 1500));
				}
			}
		}
		
		console.error(`[MealImages] Pollinations fallback exhausted`);
	} catch (pErr) {
		console.error('[MealImages] Pollinations fallback critical error:', pErr.message)
	}

	// All models exhausted
	console.error('[MealImages] ❌ All models failed for:', mealTitle)
	res.status(500).json({ 
		error: 'Image generation unavailable',
		details: 'All HuggingFace models and Pollinations fallback exhausted.'
	})
})

// ─── Health check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
	console.log(`✅ Backend running on http://localhost:${PORT}`)
	console.log(`📍 Claude proxy: http://localhost:${PORT}/api/claude`)
})
