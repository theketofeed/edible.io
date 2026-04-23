import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import DodoPayments from 'dodopayments'
import { Webhook } from 'standardwebhooks'
import crypto from 'crypto'

// Load environment variables
dotenv.config({ path: '.env.local' })

const app = express()
const PORT = process.env.PORT || 3001

// Initialize Dodo client
const dodo = new DodoPayments({ 
  bearerToken: process.env.DODO_API_KEY,
  environment: process.env.DODO_ENV || 'test_mode',
})

// Quick check on startup
console.log(`[Init] Dodo Environment: ${process.env.DODO_ENV || 'test_mode'}`)
if (!process.env.DODO_API_KEY) {
  console.warn('[Init] ⚠️ DODO_API_KEY is missing from environment variables!')
}

// Test webhook secret format
const webhookSecret = process.env.DODO_WEBHOOK_SECRET
if (webhookSecret) {
  try {
    const secretBase64 = webhookSecret.split('_')[1]
    const decoded = Buffer.from(secretBase64, 'base64')
    console.log(`[Init] Webhook secret prefix: ${webhookSecret.substring(0, 10)}...`)
    console.log(`[Init] Webhook secret base64 length: ${secretBase64.length}`)
    console.log(`[Init] Webhook secret decoded length: ${decoded.length} bytes`)
  } catch (e) {
    console.error('[Init] ❌ Webhook secret decode error:', e.message)
  }
}

// Initialize Supabase admin client (uses service key, server only)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
)

// Middleware
app.use(cors())

// Custom raw body parser for webhooks (must be BEFORE express.json)
const rawBodyParser = express.raw({ type: 'application/json' })
app.use('/api/webhooks', rawBodyParser)

app.use(express.json())

// Debug endpoint to test webhook signature
app.post('/api/debug/webhook-test', rawBodyParser, async (req, res) => {
  const payload = req.body
  const headers = {
    'webhook-id': req.headers['webhook-id'],
    'webhook-signature': req.headers['webhook-signature'],
    'webhook-timestamp': req.headers['webhook-timestamp']
  }
  
  const webhookSecret = process.env.DODO_WEBHOOK_SECRET
  const wh = new Webhook(webhookSecret)
  
  try {
    const event = wh.verify(payload, headers)
    res.json({ success: true, event })
  } catch (err) {
    const signedContent = `${headers['webhook-id']}.${headers['webhook-timestamp']}.${payload}`
    const secretBytes = Buffer.from(webhookSecret.split('_')[1], 'base64')
    const expectedSig = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64')
    
    res.json({ 
      success: false, 
      error: err.message,
      debug: {
        webhookSecretPrefix: webhookSecret.substring(0, 10),
        secretBase64: webhookSecret.split('_')[1],
        signedContent: signedContent.substring(0, 500),
        expectedSignature: `v1,${expectedSig}`,
        receivedSignature: headers['webhook-signature']
      }
    })
  }
})

// Claude API endpoint
app.post('/api/claude', async (req, res) => {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => {
		controller.abort()
		console.warn('[Claude Backend] Request timed out after 15s')
	}, 15000)

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
		console.log('[Claude Backend] Claude responded successfully')
		
		const rawContent = json.content || json.choices?.[0]?.message?.content || ''
		let text: string
		
		if (Array.isArray(rawContent)) {
			const textBlock = rawContent.find((b: any) => b.type === 'text')
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
		if (err.name === 'AbortError' || err.message?.includes('aborted')) {
			return res.status(504).json({ error: 'Claude API timed out' })
		}
		res.status(500).json({ error: err.message })
	}
})

// ─── Create Checkout Session ───────────────────────────────────────────────
app.post('/api/checkout', async (req, res) => {
	try {
		const { productType, userId, userEmail } = req.body
		console.log(`[Checkout] Request for ${productType} from user ${userId} (${userEmail})`)

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
			console.error(`[Checkout] Invalid product type: ${productType}`)
			return res.status(400).json({ error: 'Invalid product type' })
		}

		console.log(`[Checkout] Using Product ID: ${productId}`)

		// Create checkout session with Dodo (v2+ SDK uses checkoutSessions)
		const session = await dodo.checkoutSessions.create({
			customer: {
				email: userEmail,
				name: userEmail.split('@')[0]
			},
			product_cart: [{
				product_id: productId,
				quantity: 1
			}],
			return_url: `${process.env.FRONTEND_URL}/payment-success`,
			metadata: {
				user_id: userId,
				product_type: productType
			}
		})

		if (!session || !session.checkout_url) {
			console.error('[Checkout] Dodo API responded but no checkout_url was found:', session)
			throw new Error('Dodo Payments failed to generate a checkout URL')
		}

		console.log('[Checkout] ✅ Created session successfully:', session.checkout_url.substring(0, 50) + '...')
		res.json({ checkout_url: session.checkout_url })

	} catch (err) {
		console.error('[Checkout] ❌ Dodo API Error:', err)
		res.status(500).json({ 
			error: err.message,
			details: err.response?.data || 'Check server logs for full trace'
		})
	}
})

// ─── Webhook Handler ───────────────────────────────────────────────────────
app.post('/api/webhooks/dodo', async (req, res) => {
  try {
    const payload = req.body // Already raw Buffer from middleware
    
    const webhookSecret = process.env.DODO_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Webhook] DODO_WEBHOOK_SECRET not set')
      return res.status(500).json({ error: 'Webhook secret not configured' })
    }

    const headers = {
      'webhook-id': req.headers['webhook-id'],
      'webhook-signature': req.headers['webhook-signature'],
      'webhook-timestamp': req.headers['webhook-timestamp']
    }
    


    let event;
    try {
      const wh = new Webhook(webhookSecret)
      event = wh.verify(payload, headers)
    } catch (err) {
      console.error('[Webhook] ❌ Invalid signature:', err.message)
      return res.status(401).json({ error: 'Invalid signature' })
    }

    console.log('[Webhook] ✅ Valid event received:', event.type)

    // ── Handle payment success ──
    if (event.type === 'payment.succeeded') {
      const metadata = event.data?.metadata || {}
      const userId = metadata.user_id
      const productType = metadata.product_type

      console.log('[Webhook] payment.succeeded for user:', userId, 'product:', productType)

      if (!userId) {
        console.error('[Webhook] No user_id in metadata. Full event.data:', JSON.stringify(event.data))
        return res.status(200).json({ received: true })
      }

      const plan = productType === 'founding' ? 'founding' : 'pro'
      
      let planExpiresAt = null
      if (productType === 'pro_monthly') {
        planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      } else if (productType === 'pro_annual') {
        planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }

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
        console.error('[Webhook] ❌ Supabase update failed:', error)
        return res.status(200).json({ error: 'Database update failed' })
      }

      console.log(`[Webhook] ✅ User ${userId} upgraded to ${plan}`)
    }

    // ── Handle subscription events (active = payment went through) ──
    if (event.type === 'subscription.active' || event.type === 'subscription.updated') {
      const metadata = event.data?.metadata || {}
      const userId = metadata.user_id
      const productType = metadata.product_type

      console.log('[Webhook] subscription.active for user:', userId)

      if (userId) {
        const plan = productType === 'founding' ? 'founding' : 'pro'
        let planExpiresAt = null
        if (productType === 'pro_monthly') {
          planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        } else if (productType === 'pro_annual') {
          planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        }

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ plan, plan_expires_at: planExpiresAt })
          .eq('id', userId)

        if (error) {
          console.error('[Webhook] ❌ Supabase update failed for subscription.active:', error)
        } else {
          console.log(`[Webhook] ✅ User ${userId} plan set to ${plan} via subscription.active`)
        }
      }
    }

    // ── Handle subscription renewal ──
    if (event.type === 'subscription.renewed') {
      const metadata = event.data?.metadata || {}
      const userId = metadata.user_id
      if (userId) {
        const planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        await supabaseAdmin
          .from('profiles')
          .update({ plan_expires_at: planExpiresAt })
          .eq('id', userId)
        console.log(`[Webhook] ✅ Subscription renewed for user ${userId}`)
      }
    }

    // ── Handle cancellation/expiry ──
    if (event.type === 'subscription.cancelled' || event.type === 'subscription.expired') {
      const metadata = event.data?.metadata || {}
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
    console.error('[Webhook] Unhandled error:', err)
    res.status(200).json({ error: err.message })
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
