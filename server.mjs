import { Resend } from 'resend'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import DodoPayments from 'dodopayments'
import { Webhook } from 'standardwebhooks'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'

dotenv.config({ path: '.env.local' })
const resend = new Resend(process.env.RESEND_API_KEY)

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
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY
)

// ─── PostHog server-side capture ────────────────────────────────────────────
async function capturePostHogEvent(distinctId, event, properties = {}) {
  const posthogKey = process.env.VITE_POSTHOG_TOKEN
  const posthogHost = process.env.VITE_POSTHOG_HOST || 'https://eu.posthog.com'
  if (!posthogKey) {
    console.warn('[PostHog] No API key configured — skipping server-side capture')
    return
  }
  try {
    await fetch(`${posthogHost}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: posthogKey,
        event,
        distinct_id: distinctId,
        properties: { ...properties, source: 'backend' }
      })
    })
  } catch (err) {
    console.warn('[PostHog] Failed to capture event:', err.message)
  }
}

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI calls per minute per IP
  message: { error: 'AI rate limit reached. Please wait a moment.' }
})

const imageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 image requests per minute per IP — a single plan can need 15-21 images at once
  message: { error: 'Image rate limit reached. Please wait a moment.' }
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

		const apiKey = process.env.CLAUDE_API_KEY || process.env.VITE_CLAUDE_API_KEY
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
		const apiKey = process.env.OCR_SPACE_API_KEY || process.env.VITE_OCR_SPACE_API_KEY
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

// ─── Groq API proxy ───────────────────────────────────────────────────────
app.post('/api/groq', aiLimiter, async (req, res) => {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => {
		controller.abort()
		console.warn('[Groq Backend] Request timed out after 25s')
	}, 25000)

	try {
		const apiKey = process.env.GROQ_API_KEY
		if (!apiKey || apiKey.trim() === '') {
			clearTimeout(timeoutId)
			console.warn('[Groq Backend] No GROQ_API_KEY found in environment.')
			return res.status(401).json({ error: 'Groq API key not configured on server' })
		}

		const { messages, temperature, model } = req.body
		if (!messages || !Array.isArray(messages)) {
			clearTimeout(timeoutId)
			return res.status(400).json({ error: 'Missing or invalid messages array' })
		}

		console.log('[Groq Backend] Forwarding request to Groq...')
		console.log('[Groq Backend] API Key prefix:', apiKey.substring(0, 10) + '...')

		const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey.trim()}`
			},
			body: JSON.stringify({
				model: model || 'openai/gpt-oss-120b',
				messages,
				temperature: temperature ?? 0.5,
				response_format: { type: 'json_object' }
			}),
			signal: controller.signal
		})

		clearTimeout(timeoutId)
		console.log('[Groq Backend] Response status:', response.status)

		if (!response.ok) {
			const text = await response.text().catch(() => '')
			console.error(`[Groq Backend] HTTP ${response.status}: ${text}`)
			return res.status(response.status).json({ error: `Groq API error: ${response.status}`, details: text })
		}

		const json = await response.json()
		console.log('[Groq Backend] ✅ Success')
		res.json(json)
	} catch (err) {
		clearTimeout(timeoutId)
		console.error('[Groq Backend] Error:', err)
		if (err.name === 'AbortError' || err.message?.includes('aborted')) {
			return res.status(504).json({ error: 'Groq API timed out' })
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

      if (error) {
        console.error('[Webhook] ❌ Supabase error:', error)
      } else {
        console.log(`[Webhook] ✅ User ${userId} upgraded to ${plan}`)
        capturePostHogEvent(userId, 'payment_succeeded', { plan: productType })

        // Send welcome email
        const userEmail = event.data.customer?.email
        if (userEmail) {
          try {
            await resend.emails.send({
              from: 'Edible <hello@tryediblee.com>',
              to: userEmail,
              subject: 'Welcome to Edible Pro 🎉',
              reply_to: 'hello@tryediblee.com',
              headers: {
                'X-Entity-Ref-ID': crypto.randomUUID(),
              },
              html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 40px 32px; text-align: center; border-radius: 12px 12px 0 0;">
    <div style="display: inline-flex; align-items: center; gap: 12px; justify-content: center;">
      <img src="https://www.tryediblee.com/logo.png" alt="Edible logo" width="48" height="48" style="border-radius: 10px; display: block;" />
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; line-height: 1;">Edible</h1>
    </div>
    <p style="color: #e9d5ff; margin: 10px 0 0; font-size: 15px;">AI-powered meal planning</p>
  </div>
  <!-- Body -->
  <div style="padding: 40px 32px; background: #fafafa;">
    <h2 style="color: #1a1a1a; font-size: 22px; margin: 0 0 16px;">Welcome to Edible Pro 🎉</h2>
    <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      Hey! You're now on Edible Pro. Enjoy unlimited meal plans.
    </p>
  </div>
</div>`
            })
            console.log(`[Webhook] 📧 Welcome email sent to ${userEmail}`)
          } catch (emailErr) {
            console.error('[Webhook] ❌ Failed to send welcome email:', emailErr.message)
          }
        }
      }
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

// ─── Meal Image Pipeline ──────────────────────────────────────────────────
// DB cache (Supabase meal_images) → Pexels → Pixabay → Wikimedia → fallback
// All image fetching is server-side; no API keys exposed to the client.
import { normalizeMealTitle } from './server/lib/normalizeTitle.js'
import { getCachedImage, cacheImage } from './server/lib/imageCache.js'
import { fetchPexelsImage } from './server/lib/pexels.js'
import { fetchPixabayImage } from './server/lib/pixabay.js'
import { fetchWikimediaImage } from './server/lib/wikimedia.js'

app.post('/api/generate-meal-image', imageLimiter, async (req, res) => {
	const { mealTitle } = req.body

	if (!mealTitle || typeof mealTitle !== 'string') {
		return res.status(400).json({ error: 'Missing or invalid mealTitle' })
	}

	// ── Step 0: Normalize title ──────────────────────────────────────────────
	const { raw, normalized } = normalizeMealTitle(mealTitle)
	if (!normalized) {
		return res.status(400).json({ error: 'Meal title too short after normalization' })
	}

	// ── Step 1: Check Supabase DB cache ──────────────────────────────────────
	try {
		const cached = await getCachedImage(normalized)
		if (cached) {
			console.log(`[MealImages] 💾 DB cache hit for: "${raw}" (source: ${cached.source})`)
			return res.json({
				imageUrl: cached.image_url,
				source: cached.source,
				attribution: cached.attribution || null,
				license: cached.license || null,
			})
		}
	} catch (err) {
		console.warn('[MealImages] DB cache read error:', err.message)
	}

	// ── Step 2: Pexels API (store URL directly — permanent, no expiry) ──────
	const searchQuery = `${normalized} food dish`
	try {
		const pexelsResult = await fetchPexelsImage(searchQuery)
		if (pexelsResult) {
			await cacheImage(normalized, {
				imageUrl: pexelsResult.imageUrl,
				source: 'pexels',
			})
			console.log(`[MealImages] ✅ Pexels hit for: "${raw}"`)
			return res.json({ imageUrl: pexelsResult.imageUrl, source: 'pexels' })
		}
	} catch (err) {
		console.warn('[MealImages] Pexels error:', err.message)
	}

	// ── Step 3: Pixabay API (download + re-upload to our storage) ────────────
	try {
		const pixabayResult = await fetchPixabayImage(searchQuery, normalized)
		if (pixabayResult) {
			await cacheImage(normalized, {
				imageUrl: pixabayResult.imageUrl,
				source: 'pixabay',
			})
			console.log(`[MealImages] ✅ Pixabay hit for: "${raw}"`)
			return res.json({ imageUrl: pixabayResult.imageUrl, source: 'pixabay' })
		}
	} catch (err) {
		console.warn('[MealImages] Pixabay error:', err.message)
	}

	// ── Step 4: Wikimedia Commons (store URL + attribution/license) ──────────
	try {
		const wikiResult = await fetchWikimediaImage(normalized)
		if (wikiResult) {
			await cacheImage(normalized, {
				imageUrl: wikiResult.imageUrl,
				source: 'wikimedia',
				attribution: wikiResult.attribution,
				license: wikiResult.license,
			})
			console.log(`[MealImages] ✅ Wikimedia hit for: "${raw}"`)
			return res.json({
				imageUrl: wikiResult.imageUrl,
				source: 'wikimedia',
				attribution: wikiResult.attribution,
				license: wikiResult.license,
			})
		}
	} catch (err) {
		console.warn('[MealImages] Wikimedia error:', err.message)
	}

	// ── Step 5: All sources exhausted — serve fallback (NOT cached) ──────────
	// Do NOT write to meal_images — the next request will retry the full pipeline.
	// This prevents being permanently stuck on fallback if an API's library grows.
	console.log(`[MealImages] ⚠️  All sources missed for: "${raw}" — serving uncached fallback`)
	res.json({
		imageUrl: null,
		source: 'fallback',
		attribution: null,
		license: null,
	})
})

// ─── Welcome Email ──────────────────────────────────────────────────────────
app.post('/api/send-welcome', async (req, res) => {
  const { email, name } = req.body
  if (!email) return res.status(400).json({ error: 'Missing email' })
  try {
    await resend.emails.send({
      from: 'Edible <hello@tryediblee.com>',
      to: email,
      subject: 'Welcome to Edible 🥗',
      reply_to: 'hello@tryediblee.com',
      headers: {
        'X-Entity-Ref-ID': crypto.randomUUID(),
      },
      html: `<div style="background: #F5F3EF; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <div style="max-width: 560px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #C6A0F6, #B58DF5); padding: 40px 32px; text-align: center; border-radius: 20px 20px 0 0;">
            <span style="color: #1a1a1a; font-size: 22px; font-weight: 800; letter-spacing: -0.3px;">Welcome to Edible 🥗</span>
          </div>
          <div style="background: #ffffff; border-radius: 0 0 20px 20px; box-shadow: 0 8px 30px rgba(0,0,0,0.04); padding: 36px 32px 40px;">
            <h2 style="color: #1a1a1a; font-size: 20px; font-weight: 800; margin: 0 0 20px; line-height: 1.3;">You're in, ${name ? name.split(' ')[0] : 'there'} 👋</h2>

            <p style="color: #555; font-size: 15.5px; line-height: 1.65; margin: 0 0 20px;">
              Welcome to Edible, so glad you're here.
            </p>

            <p style="color: #555; font-size: 15.5px; line-height: 1.65; margin: 0 0 16px;">
              We've all been there.
            </p>

            <div style="margin: 0 0 20px;">
              <p style="color: #555; font-size: 15.5px; line-height: 1.6; margin: 0 0 10px; padding-left: 18px; position: relative;"><span style="color:#C6A0F6; position:absolute; left:0;">▪</span>You want to cook but don't know what to make so you order takeout</p>
              <p style="color: #555; font-size: 15.5px; line-height: 1.6; margin: 0 0 10px; padding-left: 18px; position: relative;"><span style="color:#C6A0F6; position:absolute; left:0;">▪</span>You get home from work too tired to think of dinner</p>
              <p style="color: #555; font-size: 15.5px; line-height: 1.6; margin: 0; padding-left: 18px; position: relative;"><span style="color:#C6A0F6; position:absolute; left:0;">▪</span>You buy groceries with good intentions, then watch them go to waste</p>
            </div>

            <p style="color: #555; font-size: 15.5px; line-height: 1.65; margin: 0 0 16px;">
              That's exactly why I built Edible.
            </p>

            <p style="color: #555; font-size: 15.5px; line-height: 1.65; margin: 0 0 20px;">
              I got tired of staring into my fridge every night with no idea what to make from what I actually had.
            </p>

            <p style="color: #555; font-size: 15.5px; line-height: 1.65; margin: 0 0 16px;">
              Now I just upload a grocery receipt, or type out what's in my kitchen — and Edible turns it into a full week of meals.
            </p>

            <p style="color: #555; font-size: 15.5px; line-height: 1.65; margin: 0 0 28px;">
              No more wasted groceries. No more "what should we eat" panic.
            </p>

            <a href="https://www.tryediblee.com" style="background: #C6A0F6; color: #1a1a1a; text-decoration: none; padding: 13px 26px; border-radius: 10px; font-size: 14.5px; font-weight: 700; display: inline-block;">
              Generate your first meal plan →
            </a>
            <p style="color: #999; font-size: 13px; margin: 12px 0 0;">Takes less than a minute. Try it with whatever's in your fridge right now.</p>

            <hr style="border: none; border-top: 1px solid #F0EEEA; margin: 28px 0 24px;" />

            <p style="color: #555; font-size: 14px; line-height: 1.65; margin: 0 0 4px;">Got stuck, have an idea, or just want to say what you made? Reply here — I read everything.</p>

            <p style="color: #1a1a1a; font-size: 14px; font-weight: 700; margin: 16px 0 0;">Praise</p>
            <p style="color: #999; font-size: 13px; margin: 2px 0 0;">Founder, Edible</p>
          </div>
          <p style="text-align: center; color: #A8A29A; font-size: 12px; margin: 20px 0 0;">Edible — Turn groceries into meal plans, instantly.</p>
        </div>
      </div>`
    })
    console.log(`[Welcome Email] 📧 Sent to ${email}`)
    res.json({ success: true })
  } catch (err) {
    console.error('[Welcome Email] ❌ Failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Plan Expiry Check (called daily by Supabase cron) ─────────────────────
app.post('/api/check-plan-expiry', async (req, res) => {
  try {
    const now = new Date()
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0)
    const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1)

    const { data: plans, error } = await supabaseAdmin
      .from('meal_plans')
      .select('id, user_id, title, activated_at, plan_data')

    if (error) throw error

    let endingSoonCount = 0
    let expiredCount = 0

    const emailShell = (bannerText, title, body, ctaText) => `
      <div style="background: #F5F3EF; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <div style="max-width: 560px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #C6A0F6, #B58DF5); padding: 40px 32px; text-align: center; border-radius: 20px 20px 0 0;">
            <span style="color: #1a1a1a; font-size: 22px; font-weight: 800; letter-spacing: -0.3px;">${bannerText}</span>
          </div>
          <div style="background: #ffffff; border-radius: 0 0 20px 20px; box-shadow: 0 8px 30px rgba(0,0,0,0.04); padding: 36px 32px 40px;">
            <h2 style="color: #1a1a1a; font-size: 20px; font-weight: 800; margin: 0 0 12px; line-height: 1.3;">${title}</h2>
            <p style="color: #555; font-size: 15.5px; line-height: 1.65; margin: 0 0 28px;">${body}</p>
            <a href="https://www.tryediblee.com/dashboard" style="background: #C6A0F6; color: #1a1a1a; text-decoration: none; padding: 13px 26px; border-radius: 10px; font-size: 14.5px; font-weight: 700; display: inline-block;">${ctaText} →</a>
          </div>
          <p style="text-align: center; color: #A8A29A; font-size: 12px; margin: 20px 0 0;">Edible — Turn groceries into meal plans, instantly.</p>
        </div>
      </div>`

    for (const plan of plans || []) {
      if (!plan.activated_at) continue
      const dayCount = plan.plan_data?.days?.length || 7
      const start = new Date(plan.activated_at); start.setHours(0,0,0,0)
      const lastValidDay = new Date(start)
      lastValidDay.setDate(lastValidDay.getDate() + dayCount - 1)
      const expiredDay = new Date(lastValidDay)
      expiredDay.setDate(expiredDay.getDate() + 1)

      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(plan.user_id)
      const email = userData?.user?.email
      if (!email) continue

      // Ending soon: today IS the last valid day
      if (lastValidDay >= todayStart && lastValidDay < tomorrowStart) {
        try {
          await resend.emails.send({
            from: 'Edible <hello@tryediblee.com>',
            to: email,
            subject: 'Your meal plan ends today',
            reply_to: 'hello@tryediblee.com',
            headers: { 'X-Entity-Ref-ID': crypto.randomUUID() },
            html: emailShell(
              'Your Plan Ends Today ⏰',
              `Your "${plan.title}" meal plan ends today`,
              'This is your last day on this plan. Generate your next one now so you\'re not left guessing what to cook tomorrow.',
              'Generate new plan'
            )
          })
          endingSoonCount++
        } catch (e) { console.error('[PlanExpiry] Failed ending-soon email:', e.message) }
      }

      // Expired: today is the day after the last valid day
      if (expiredDay >= todayStart && expiredDay < tomorrowStart) {
        try {
          await resend.emails.send({
            from: 'Edible <hello@tryediblee.com>',
            to: email,
            subject: 'Your meal plan has ended',
            reply_to: 'hello@tryediblee.com',
            headers: { 'X-Entity-Ref-ID': crypto.randomUUID() },
            html: emailShell(
              'Your Plan Has Ended 📭',
              `Your "${plan.title}" meal plan has finished`,
              'That\'s a wrap on this week\'s meals. Upload your groceries and get your next plan in seconds.',
              'Generate new plan'
            )
          })
          expiredCount++
        } catch (e) { console.error('[PlanExpiry] Failed expired email:', e.message) }
      }
    }

    console.log(`[PlanExpiry] Sent ${endingSoonCount} ending-soon, ${expiredCount} expired emails`)
    res.json({ success: true, endingSoonCount, expiredCount })
  } catch (err) {
    console.error('[PlanExpiry] Error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── First Plan Milestone Email (called by Supabase webhook) ───────────────
app.post('/api/first-plan-check', async (req, res) => {
  try {
    const record = req.body?.record
    if (!record?.user_id) return res.status(400).json({ error: 'Missing record.user_id' })

    const { count } = await supabaseAdmin
      .from('meal_plans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', record.user_id)

    if (count !== 1) return res.json({ skipped: true, reason: 'not first plan' })

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(record.user_id)
    const email = userData?.user?.email
    if (!email) return res.json({ skipped: true, reason: 'no email' })

    await resend.emails.send({
      from: 'Edible <hello@tryediblee.com>',
      to: email,
      subject: 'Your first meal plan is ready 🎉',
      reply_to: 'hello@tryediblee.com',
      headers: { 'X-Entity-Ref-ID': crypto.randomUUID() },
      html: `<div style="background: #F5F3EF; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <div style="max-width: 560px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #C6A0F6, #B58DF5); padding: 40px 32px; text-align: center; border-radius: 20px 20px 0 0;">
            <span style="color: #1a1a1a; font-size: 22px; font-weight: 800; letter-spacing: -0.3px;">Your First Plan is Ready 🎉</span>
          </div>
          <div style="background: #ffffff; border-radius: 0 0 20px 20px; box-shadow: 0 8px 30px rgba(0,0,0,0.04); padding: 36px 32px 40px;">
            <h2 style="color: #1a1a1a; font-size: 20px; font-weight: 800; margin: 0 0 12px; line-height: 1.3;">Your first plan is saved</h2>
            <p style="color: #555; font-size: 15.5px; line-height: 1.65; margin: 0 0 28px;">It's ready and waiting for you. Come back anytime to check today's meals, swap a recipe, or start your next week.</p>
            <a href="https://www.tryediblee.com/dashboard" style="background: #C6A0F6; color: #1a1a1a; text-decoration: none; padding: 13px 26px; border-radius: 10px; font-size: 14.5px; font-weight: 700; display: inline-block;">View your plan →</a>
          </div>
          <p style="text-align: center; color: #A8A29A; font-size: 12px; margin: 20px 0 0;">Edible — Turn groceries into meal plans, instantly.</p>
        </div>
      </div>`
    })

    console.log(`[FirstPlan] 📧 Milestone email sent to ${email}`)
    res.json({ success: true })
  } catch (err) {
    console.error('[FirstPlan] Error:', err)
    res.status(500).json({ error: err.message })
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
