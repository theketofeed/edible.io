import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import DodoPayments from 'dodopayments'

// Load environment variables
dotenv.config({ path: '.env.local' })

const app = express()
const PORT = process.env.PORT || 3001

// Initialize Dodo client
const dodo = new DodoPayments({ 
  bearerToken: process.env.DODO_API_KEY,
  environment: process.env.DODO_ENV || 'test_mode',
})

// Initialize Supabase admin client (uses service key, server only)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
)

// Middleware
app.use(cors())
app.use(express.json())

// Claude API endpoint
app.post('/api/claude', async (req, res) => {
	try {
		const { prompt } = req.body

		if (!prompt) {
			return res.status(400).json({ error: 'Missing prompt' })
		}

		const apiKey = process.env.VITE_CLAUDE_API_KEY
		if (!apiKey || apiKey.trim() === '' || apiKey === 'your_key_here') {
			console.warn('[Claude Backend] No valid Claude API key found.')
			return res.status(401).json({ error: 'Claude API key not configured' })
		}

		console.log('[Claude Backend] Forwarding request to Claude API...')
		console.log('[Claude Backend] API Key length:', apiKey.length)
		console.log('[Claude Backend] API Key prefix:', apiKey.substring(0, 10) + '...')
		console.log('[Claude Backend] Prompt length:', prompt.length)

		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: 'claude-3-haiku-20240307',
				max_tokens: 4096,
				system: 'You output JSON only. No code fences. No commentary.',
				messages: [{ role: 'user', content: prompt }],
				temperature: 0.55
			})
		})

		console.log('[Claude Backend] Response status:', response.status)

		if (!response.ok) {
			const text = await response.text().catch(() => '')
			console.error(`[Claude Backend] HTTP ${response.status}: ${text}`)
			return res.status(response.status).json({ error: `Claude API error: ${response.status}`, details: text })
		}

		const json = await response.json()
		console.log('[Claude Backend] Claude responded successfully')
		res.json(json)
	} catch (err) {
		console.error('[Claude Backend] Error:', err)
		res.status(500).json({ error: err.message })
	}
})

// ─── Create Checkout Session ───────────────────────────────────────────────
app.post('/api/checkout', async (req, res) => {
	try {
		const { productType, userId, userEmail } = req.body

		if (!productType || !userId || !userEmail) {
			return res.status(400).json({ error: 'Missing required fields' })
		}

		// Map product type to Dodo product ID
		const productMap = {
			'pro_monthly': process.env.DODO_PRODUCT_PRO_MONTHLY,
			'pro_annual': process.env.DODO_PRODUCT_PRO_ANNUAL,
			'founding': process.env.DODO_PRODUCT_FOUNDING
		}

		const productId = productMap[productType]
		if (!productId) {
			return res.status(400).json({ error: 'Invalid product type' })
		}

		const isRecurring = productType !== 'founding'

		// Create checkout session with Dodo
		const checkout = await dodo.payments.create({
			customer: {
				email: userEmail,
				name: userEmail.split('@')[0]
			},
			product_cart: [{
				product_id: productId,
				quantity: 1
			}],
			payment_link: true,
			return_url: `${process.env.FRONTEND_URL}/payment-success`,
			metadata: {
				user_id: userId,
				product_type: productType
			}
		})

		console.log('[Checkout] Created session for user:', userId)
		res.json({ checkout_url: checkout.payment_link })

	} catch (err) {
		console.error('[Checkout] Error:', err)
		res.status(500).json({ error: err.message })
	}
})

// ─── Webhook Handler ───────────────────────────────────────────────────────
app.post('/api/webhooks/dodo', express.raw({ type: 'application/json' }), async (req, res) => {
	try {
		const payload = req.body.toString()
		const headers = req.headers

		// Verify the webhook is genuinely from Dodo
		const webhookSecret = process.env.DODO_WEBHOOK_SECRET
		const signature = headers['webhook-signature']
		const timestamp = headers['webhook-timestamp']
		const webhookId = headers['webhook-id']

		if (!signature || !timestamp || !webhookId) {
			console.error('[Webhook] Missing headers')
			return res.status(401).json({ error: 'Missing webhook headers' })
		}

		// Construct signed content for verification
		const signedContent = `${webhookId}.${timestamp}.${payload}`
		const crypto = await import('crypto')
		const secretBytes = Buffer.from(webhookSecret.split('_')[1] || webhookSecret, 'base64')
		const expectedSignature = crypto.default
			.createHmac('sha256', secretBytes)
			.update(signedContent)
			.digest('base64')

		const signatures = signature.split(' ')
		const isValid = signatures.some(sig => sig.startsWith('v1,') && sig.slice(3) === expectedSignature)

		if (!isValid) {
			console.error('[Webhook] Invalid signature')
			return res.status(401).json({ error: 'Invalid signature' })
		}

		const event = JSON.parse(payload)
		console.log('[Webhook] Received event:', event.type)

		// ── Handle payment success ──
		if (event.type === 'payment.succeeded') {
			const metadata = event.data.metadata || {}
			const userId = metadata.user_id
			const productType = metadata.product_type

			if (!userId) {
				console.error('[Webhook] No user_id in metadata')
				return res.status(200).json({ received: true })
			}

			const plan = productType === 'founding' ? 'founding' : 'pro'
			
			// Calculate expiry for subscriptions
			let planExpiresAt = null
			if (productType === 'pro_monthly') {
				planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
			} else if (productType === 'pro_annual') {
				planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
			}
			// founding = null (never expires)

			const { error } = await supabaseAdmin
				.from('profiles')
				.update({
					plan,
					plan_expires_at: planExpiresAt,
					dodo_customer_id: event.data.customer?.customer_id || null,
					dodo_subscription_id: event.data.subscription_id || null
				})
				.eq('id', userId)

			if (error) {
				console.error('[Webhook] Supabase update failed:', error)
				return res.status(500).json({ error: 'Database update failed' })
			}

			console.log(`[Webhook] ✅ User ${userId} upgraded to ${plan}`)
		}

		// ── Handle subscription cancellation ──
		if (event.type === 'subscription.cancelled' || event.type === 'subscription.expired') {
			const metadata = event.data.metadata || {}
			const userId = metadata.user_id

			if (userId) {
				await supabaseAdmin
					.from('profiles')
					.update({ plan: 'free', plan_expires_at: null })
					.eq('id', userId)

				console.log(`[Webhook] User ${userId} downgraded to free`)
			}
		}

		res.status(200).json({ received: true })

	} catch (err) {
		console.error('[Webhook] Error:', err)
		res.status(500).json({ error: err.message })
	}
})

// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
	console.log(`✅ Backend server running on http://localhost:${PORT}`)
	console.log(`📍 Claude proxy endpoint: http://localhost:${PORT}/api/claude`)
})
