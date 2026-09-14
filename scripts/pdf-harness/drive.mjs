import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const ROOT = process.cwd()
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' }

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://x')
      let file
      if (u.pathname === '/' || u.pathname === '/harness.html') file = 'scripts/pdf-harness/harness.html'
      else if (u.pathname === '/html2pdf.bundle.min.js') file = 'node_modules/html2pdf.js/dist/html2pdf.bundle.min.js'
      else file = u.pathname.slice(1)
      const abs = path.join(ROOT, file)
      try {
        const body = fs.readFileSync(abs)
        res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream' })
        res.end(body)
      } catch {
        res.writeHead(404); res.end('not found')
      }
    })
    srv.listen(0, '127.0.0.1', () => resolve(srv))
  })
}

export default async function run(page) {
  const recipeKey = process.env.DRIVE_RECIPE || 'short'
  const outPath = path.resolve(process.env.DRIVE_OUT || 'tests/pdf-harness-out.pdf')
  const opts = JSON.parse(process.env.DRIVE_OPTS || '{}')
  const useImage = String(process.env.DRIVE_IMG || '1') !== '0'

  const srv = await startServer()
  const base = `http://127.0.0.1:${srv.address().port}`
  try {
    await page.goto(base + '/', { waitUntil: 'load' })
    await new Promise(r => setTimeout(r, 400))

    await page.evaluate(({ recipeKey, opts, useImage, width }) => {
      const cfg = document.getElementById('config')
      cfg.setAttribute('data-recipe', recipeKey)
      cfg.setAttribute('data-opts', JSON.stringify(opts))
      cfg.setAttribute('data-img', useImage ? '1' : '0')
      cfg.setAttribute('data-width', String(width || 800))
    }, { recipeKey, opts, useImage, width: Number(process.env.DRIVE_WIDTH || 800) })

    const btnPresent = (await page.$('#run')) !== null
    if (!btnPresent) {
      return { ok: false, error: 'no #run button', log: await page.evaluate(() => document.getElementById('log').textContent) }
    }

    await page.locator('#run').click()
    await page.evaluate(() => { document.getElementById('result').setAttribute('data-done', '0') })
    await page.waitForFunction(() => document.getElementById('result').getAttribute('data-done') === '1', { timeout: 120000 })

    const result = await page.evaluate(() => {
      const res = document.getElementById('result')
      const log = document.getElementById('log').textContent
      const err = res.getAttribute('data-error')
      return {
        ok: !err,
        error: err || '',
        size: Number(res.getAttribute('data-size')),
        b64: res.textContent,
        log,
      }
    })

    if (!result.ok) return { ok: false, error: result.error, log: result.log }
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, Buffer.from(result.b64, 'base64'))
    return {
      ok: true,
      size: result.size,
      recipe: recipeKey,
      out: outPath,
      log: result.log,
    }
  } finally {
    srv.close()
  }
}