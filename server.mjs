import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import DodoPayments from 'dodopayments'
import { Webhook } from 'standardwebhooks'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'

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

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI calls per minute per IP
  message: { error: 'AI rate limit reached. Please wait a moment.' }
})

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
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
				model: 'claude-3-5-sonnet-20241022',
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

// ─── Meal Image Cache & Queue ──────────────────────────────────────────────
const imageCache = new Map() // key → { buffer, contentType, timestamp }
const IMAGE_CACHE_TTL = 60 * 60 * 1000 // 1 hour

function getImageCacheKey(title) {
	return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-').slice(0, 80)
}

async function fetchPexelsImage(mealTitle) {
	const pexelsKey = process.env.VITE_PEXELS_API_KEY || process.env.PEXELS_API_KEY
	if (!pexelsKey) return null

	try {
		console.log(`[MealImages] 📸 Pexels search: "${mealTitle}"`)
		const query = encodeURIComponent(mealTitle)
		const searchUrl = `https://api.pexels.com/v1/search?query=${query}&per_page=1`

		const pexelsRes = await fetch(searchUrl, {
			headers: { 'Authorization': pexelsKey },
			signal: AbortSignal.timeout(8000)
		})

		if (pexelsRes.ok) {
			const data = await pexelsRes.json()
			const photo = data?.photos?.[0]
			if (photo?.src?.large) {
				const imageUrl = photo.src.large
				console.log(`[MealImages] ✅ Pexels found image for: "${mealTitle}"`)

				const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) })
				if (imgRes.ok) {
					const arrayBuffer = await imgRes.arrayBuffer()
					const blob = Buffer.from(arrayBuffer)
					if (blob.length > 0) {
						const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
						return { buffer: blob, contentType }
					}
				}
			} else {
				console.log(`[MealImages] Pexels returned no results for: "${mealTitle}"`)
			}
		} else {
			console.warn(`[MealImages] Pexels search failed (${pexelsRes.status})`)
		}
	} catch (err) {
		console.warn(`[MealImages] Pexels error: ${err.message}`)
	}
	return null
}

// ─── Meal Image Proxy: Spoonacular → Pexels fallback ─────────────────
// Strategy:
//   1. Server-side cache      — instant response for repeated requests
//   2. Spoonacular complexSearch — real food photos, instant, free tier (150 req/day)
//   3. Pexels API           — beautiful stock photography fallback
app.post('/api/generate-meal-image', aiLimiter, async (req, res) => {
	const { mealTitle } = req.body

	if (!mealTitle || typeof mealTitle !== 'string') {
		return res.status(400).json({ error: 'Missing or invalid mealTitle' })
	}

	const cacheKey = getImageCacheKey(mealTitle)

	// ── Step 0: Check server-side cache ──────────────────────────────────────
	const cached = imageCache.get(cacheKey)
	if (cached && (Date.now() - cached.timestamp) < IMAGE_CACHE_TTL) {
		console.log(`[MealImages] 💾 Cache hit for: "${mealTitle}" (${cached.buffer.length} bytes)`)
		res.set('Content-Type', cached.contentType)
		return res.send(cached.buffer)
	}

	const spoonacularKey = process.env.SPOONACULAR_API_KEY?.trim()

	// ── Step 1: Spoonacular complexSearch ────────────────────────────────────
	if (spoonacularKey && spoonacularKey !== 'your_key_here') {
		try {
			console.log(`[MealImages] 🔍 Spoonacular search: "${mealTitle}"`)
			const query = encodeURIComponent(mealTitle)
			const spoonUrl = `https://api.spoonacular.com/recipes/complexSearch?query=${query}&number=1&apiKey=${spoonacularKey}`

			const spoonRes = await fetch(spoonUrl, {
				signal: AbortSignal.timeout(8000),
				headers: { 'Accept': 'application/json' }
			})

			if (spoonRes.ok) {
				const data = await spoonRes.json()
				const recipe = data?.results?.[0]
				if (recipe?.image) {
					let imageUrl = recipe.image
					if (!imageUrl.startsWith('http')) {
						imageUrl = `https://img.spoonacular.com/recipes/${imageUrl}`
					}
					console.log(`[MealImages] ✅ Spoonacular found image for: "${mealTitle}" → ${imageUrl}`)

					const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) })
					if (imgRes.ok) {
						const arrayBuffer = await imgRes.arrayBuffer()
						const blob = Buffer.from(arrayBuffer)
						if (blob.length > 0) {
							const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
							// Cache the result
							imageCache.set(cacheKey, { buffer: blob, contentType, timestamp: Date.now() })
							res.set('Content-Type', contentType)
							console.log(`[MealImages] ✅ Served Spoonacular image (${blob.length} bytes)`)
							return res.send(blob)
						}
					}
				} else {
					console.log(`[MealImages] Spoonacular returned no results for: "${mealTitle}"`)
				}
			} else {
				const errText = await spoonRes.text().catch(() => '')
				console.warn(`[MealImages] Spoonacular failed (${spoonRes.status}): ${errText.substring(0, 100)}`)
			}
		} catch (err) {
			console.warn(`[MealImages] Spoonacular error: ${err.message}`)
		}
	} else {
		console.log('[MealImages] No SPOONACULAR_API_KEY — skipping to Pexels')
	}

	// ── Step 2: Pexels API fallback ──────────────────
	try {
		const result = await fetchPexelsImage(mealTitle)
		if (result) {
			// Cache the result
			imageCache.set(cacheKey, { buffer: result.buffer, contentType: result.contentType, timestamp: Date.now() })
			res.set('Content-Type', result.contentType)
			return res.send(result.buffer)
		}
	} catch (err) {
		console.warn(`[MealImages] Pexels fetch error: ${err.message}`)
	}

	// ── All sources exhausted ─────────────────────────────────────────────────
	console.error(`[MealImages] ❌ All sources failed for: "${mealTitle}"`)
	res.status(500).json({
		error: 'Image generation unavailable',
		details: 'Spoonacular and Pexels both failed.'
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
