import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '.env.local') })

const apiKey = process.env.VITE_MINDEE_API_KEY

console.log('=== API Key Diagnostics ===')
console.log('Key exists:', !!apiKey)
console.log('Key length:', apiKey?.length)
console.log('Key value:', JSON.stringify(apiKey)) // Shows hidden chars
console.log('First 10 chars:', apiKey?.substring(0, 10))
console.log('Last 10 chars:', apiKey?.substring(apiKey.length - 10))
console.log('Has leading whitespace:', apiKey !== apiKey?.trimStart())
console.log('Has trailing whitespace:', apiKey !== apiKey?.trimEnd())
console.log('Trimmed length:', apiKey?.trim().length)
console.log('\nExpected format: Should start with something like "api_" or similar')
console.log('Your key starts with:', apiKey?.substring(0, 4))
