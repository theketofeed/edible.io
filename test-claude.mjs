import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const key = process.env.VITE_CLAUDE_API_KEY
console.log('Claude API Key loaded:')
console.log('  Exists:', !!key)
console.log('  Length:', key?.length)
console.log('  Prefix:', key?.substring(0, 15) + '...')
console.log('  Suffix:', '...' + key?.substring(key.length - 10))
console.log('')
console.log('Testing Claude API...')

const apiKey = process.env.VITE_CLAUDE_API_KEY

fetch('https://api.anthropic.com/v1/messages', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'x-api-key': apiKey,
		'anthropic-version': '2023-06-01'
	},
	body: JSON.stringify({
		model: 'claude-3-haiku-20240307',
		max_tokens: 100,
		system: 'Respond with JSON only',
		messages: [{ role: 'user', content: 'Test: respond with {"status": "ok"}' }],
		temperature: 0.55
	})
})
	.then(res => {
		console.log('Response Status:', res.status)
		return res.text()
	})
	.then(text => {
		console.log('Response:', text.substring(0, 200))
	})
	.catch(err => {
		console.error('Error:', err.message)
	})
