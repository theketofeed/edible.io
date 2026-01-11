import fetch from 'node-fetch'

const apiKey = process.argv[2]

if (!apiKey) {
    console.error('Usage: node test-endpoints.mjs YOUR_API_KEY')
    process.exit(1)
}

console.log('Testing different Mindee API endpoints...')
console.log('API Key:', apiKey.substring(0, 10) + '...')
console.log('')

// Minimal test image (1x1 transparent PNG)
const testBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

// Different possible endpoint formats
const endpoints = [
    {
        name: 'Current format (v1/products/mindee/expense_receipts/v5)',
        url: 'https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict',
        authHeader: `Token: ${apiKey}`
    },
    {
        name: 'Alternative format (products/expense_receipts/v5)',
        url: 'https://api.mindee.net/products/expense_receipts/v5/predict',
        authHeader: `Token: ${apiKey}`
    },
    {
        name: 'v4 endpoint (v1/products/mindee/expense_receipts/v4)',
        url: 'https://api.mindee.net/v1/products/mindee/expense_receipts/v4/predict',
        authHeader: `Token: ${apiKey}`
    },
    {
        name: 'Bearer token format',
        url: 'https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict',
        authHeader: `Bearer ${apiKey}`
    }
]

for (const endpoint of endpoints) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Testing: ${endpoint.name}`)
    console.log(`URL: ${endpoint.url}`)
    console.log(`Auth: ${endpoint.authHeader.substring(0, 20)}...`)
    console.log('='.repeat(60))

    try {
        const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
                'Authorization': endpoint.authHeader,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                document: testBase64
            }),
        })

        console.log(`Status: ${response.status} ${response.statusText}`)

        if (response.ok) {
            console.log('✅ SUCCESS! This endpoint works!')
            const data = await response.json()
            console.log('Response preview:', JSON.stringify(data).substring(0, 200))
            break // Stop testing once we find a working endpoint
        } else {
            const errorText = await response.text()
            console.log('❌ Failed')
            console.log('Error:', errorText.substring(0, 150))
        }
    } catch (error) {
        console.log('❌ Network error:', error.message)
    }
}

console.log('\n' + '='.repeat(60))
console.log('Testing complete!')
