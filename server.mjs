import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const app = express()
const PORT = process.env.PORT || 3001

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

// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
	console.log(`✅ Backend server running on http://localhost:${PORT}`)
	console.log(`📍 Claude proxy endpoint: http://localhost:${PORT}/api/claude`)
})
