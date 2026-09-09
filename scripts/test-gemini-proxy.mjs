// ─── Proxy end-to-end test ────────────────────────────────────────────────────
// Boots the REAL server.mjs on an isolated PORT, POSTs the 7-day worst-case
// prompt to /api/gemini, and verifies:
//   1. HTTP 200 with the /api/claude-style contract { content: [{ type:'text', text }] }
//   2. Text fence-strips to clean JSON (server already strips — hard check)
//   3. Full 7 days × 3 meals, same gate the frontend enforces
//   4. Server logs show the [Gemini Backend] Success line (truncation-aware path)
//
// Usage: node scripts/test-gemini-proxy.mjs

import { spawn } from 'node:child_process'
import path from 'node:path'
import { WORST_CASE_ITEMS, buildPrompt, checkCompleteness } from './lib/gemini-fixture.mjs'

const PORT = 3101
const prompt = buildPrompt(WORST_CASE_ITEMS, 'Balanced', 7)
const BASE = `http://localhost:${PORT}`

const child = spawn(process.execPath, ['server.mjs'], {
  cwd: path.resolve(process.cwd()),
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
})

let serverLog = ''
child.stdout.on('data', (d) => { serverLog += d })
child.stderr.on('data', (d) => { serverLog += d })

function waitForHealth(timeoutMs = 25000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (Date.now() - start > timeoutMs) return reject(new Error('health check timed out'))
      try {
        const res = await fetch(`${BASE}/health`)
        if (res.ok) return resolve()
      } catch {}
      setTimeout(tick, 500)
    }
    tick()
  })
}

function cleanup(reason, code = 0) {
  child.kill('SIGTERM')
  console.log(`\n${reason} — server stopped (exit code ${code})`)
  process.exit(code)
}

try {
  console.log(`[proxy-e2e] waiting for server on :${PORT}...`)
  await waitForHealth()
  console.log(`[proxy-e2e] server healthy. POSTing 7-day worst-case prompt (${prompt.length} chars) to /api/gemini...`)

  const startedAt = Date.now()
  const res = await fetch(`${BASE}/api/gemini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  const elapsedMs = Date.now() - startedAt

  const body = await res.json()
  const content = Array.isArray(body.content)
    ? (body.content.find((b) => b.type === 'text')?.text || body.content[0]?.text || '')
    : typeof body.content === 'string' ? body.content : ''

  let ok = true
  const failures = []
  if (!res.ok) failures.push(`HTTP ${res.status}`)
  if (res.ok && (!content || content.trim().length === 0)) failures.push('empty content')
  const { complete, reason, parsed } = checkCompleteness(content, 7)
  if (!complete) failures.push(`completeness: ${reason}`)
  const successLogged = /\[Gemini Backend\] Success/.test(serverLog)
  if (res.ok && !successLogged) failures.push('server did not log [Gemini Backend] Success')

  console.log(`[proxy-e2e] HTTP ${res.status} in ${elapsedMs}ms — content ${content.length} chars`)
  console.log(`[proxy-e2e] completeness: ${complete ? 'OK' : reason} (${parsed?.days?.length ?? 0} days)`)

  const summary = serverLog.split('\n').filter((l) => l.includes('[Gemini Backend]')).join('\n')
  console.log('--- server gemini log ---')
  console.log(summary || '(no [Gemini Backend] log lines found)')
  console.log('-------------------------')

  if (failures.length) {
    console.error(`✗ FAIL — ${failures.join('; ')}`)
    cleanup('fail', 1)
  } else {
    console.log('✓ PASS — /api/gemini proxy returns complete, parseable 7-day JSON with the claude-style contract')
    cleanup('pass', 0)
  }
} catch (err) {
  console.error('✗ FAIL —', err.message)
  console.log('--- last server output ---')
  console.log(serverLog.slice(-1500))
  cleanup('fail', 1)
}