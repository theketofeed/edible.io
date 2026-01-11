import fetch from 'node-fetch'
import { readFileSync } from 'fs'

// Read API key from command line argument
const apiKey = process.argv[2]

if (!apiKey) {
    console.error('Usage: node test-mindee-key.mjs YOUR_API_KEY')
    process.exit(1)
}

console.log('Testing API key:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 3))
console.log('Key length:', apiKey.length)
console.log('')

// Create a minimal test request
const testBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

console.log('Sending test request to Mindee API...')

try {
    const response = await fetch(
        'https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict',
        {
            method: 'POST',
            headers: {
                'Authorization': `Token: ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                document: testBase64
            }),
        }
    )

    console.log('Response status:', response.status)
    console.log('Response status text:', response.statusText)
    console.log('')

    const responseText = await response.text()

    if (response.ok) {
        console.log('✅ SUCCESS! API key is valid and working!')
        console.log('Response preview:', responseText.substring(0, 200))
    } else {
        console.log('❌ FAILED! API key was rejected')
        console.log('Error response:', responseText)

        if (response.status === 401) {
            console.log('')
            console.log('This means your API key is INVALID or EXPIRED.')
            console.log('Please:')
            console.log('1. Go to https://platform.mindee.com/api-keys')
            console.log('2. Create a NEW API key')
            console.log('3. Copy it and update your .env.local file')
        }
    }
} catch (error) {
    console.error('Network error:', error.message)
}
