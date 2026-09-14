import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const OUTPUT = path.join(ROOT, 'tests', 'pdf-component-output')

fs.mkdirSync(OUTPUT, { recursive: true })

function findChrome() {
  const candidates = process.platform === 'win32'
    ? [
        path.join(process.env['PROGRAMFILES'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['LOCALAPPDATA'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      ]
    : process.platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    : ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium']
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  throw new Error('No Chrome/Edge found on system')
}

async function runCommand(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: 'pipe', shell: true, ...opts })
    let stdout = '', stderr = ''
    proc.stdout?.on('data', d => { stdout += d; process.stdout.write(d) })
    proc.stderr?.on('data', d => { stderr += d })
    proc.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(`Exit ${code}: ${stderr}`)))
    proc.on('error', reject)
    return proc
  })
}

async function startViteDevServer() {
  return new Promise((resolve, reject) => {
    const viteBin = path.join(ROOT, 'node_modules', '.bin', 'vite')
    const proc = spawn(viteBin, ['--port', '5199', '--host', '127.0.0.1', '--strictPort'], {
      cwd: ROOT, stdio: 'pipe', shell: true
    })
    let started = false
    let timeout = setTimeout(() => { if (!started) reject(new Error('Vite dev server timed out after 30s')) }, 30000)
    proc.stdout?.on('data', d => {
      const s = d.toString()
      process.stdout.write(s)
      if (!started && (s.includes('ready in') || s.includes('Local:'))) {
        started = true
        clearTimeout(timeout)
        resolve(proc)
      }
    })
    proc.stderr?.on('data', d => process.stderr.write(d))
    proc.on('error', e => { clearTimeout(timeout); reject(e) })
  })
}

async function main() {
  console.log('=== PDF Component Test Harness ===')
  console.log('')

  // Generate test image
  console.log('[1/6] Generating test image...')
  const testImagePath = path.join(ROOT, 'test-recipe.jpg')
  await runCommand('python', [path.join(__dirname, 'gen-test-image.py'), testImagePath])
  console.log('')

  // Start vite dev server
  console.log('[2/6] Starting Vite dev server...')
  const serverProc = await startViteDevServer()
  console.log('Vite dev server ready on port 5199')
  console.log('')

  // Import puppeteer-core
  const puppeteer = await import('puppeteer-core').then(m => m.default)

  let browser
  try {
    // Launch browser
    console.log('[3/6] Launching Chrome...')
    const execPath = findChrome()
    browser = await puppeteer.launch({
      executablePath: execPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      headless: true,
      defaultViewport: { width: 1280, height: 900 },
    })
    const page = await browser.newPage()
    console.log('Chrome launched')
    console.log('')

    // Navigate to test page
    console.log('[4/6] Loading test harness...')
    await page.goto('http://127.0.0.1:5199/pdf-test.html', { waitUntil: 'networkidle0', timeout: 30000 })
    await page.waitForFunction(() => typeof window.__pdfTests?.singleShort === 'function', { timeout: 10000 })
    console.log('Test harness ready')
    console.log('')

    // Run tests
    console.log('[5/6] Running PDF tests...')

    const tests = [
      { name: 'single-short', fn: 'singleShort' },
      { name: 'single-medium', fn: 'singleMedium' },
      { name: 'single-long', fn: 'singleLong' },
    ]

    for (const test of tests) {
      console.log(`\n--- ${test.name} ---`)
      const result = await page.evaluate(async (fnName) => {
        return window.__pdfTests[fnName]()
      }, test.fn)
      console.log(`  result: ${JSON.stringify({ ok: result.ok, size: result.size, error: result.error, filename: result.filename })}`)
      if (result.ok && result.b64) {
        const pdfPath = path.join(OUTPUT, `${test.name}.pdf`)
        fs.writeFileSync(pdfPath, Buffer.from(result.b64, 'base64'))
        console.log(`  saved: ${pdfPath} (${result.size} bytes)`)
      }
    }

    // Bulk test
    console.log(`\n--- bulk (3 recipes) ---`)
    const bulkResults = await page.evaluate(() => window.__pdfTests.bulk())
    for (const r of bulkResults) {
      console.log(`  ${r.filename}: ok=${r.ok} size=${r.size || 0} ${r.error || ''}`)
      if (r.ok && r.b64) {
        const pdfPath = path.join(OUTPUT, `bulk-${r.filename}`)
        fs.writeFileSync(pdfPath, Buffer.from(r.b64, 'base64'))
        console.log(`  saved: ${pdfPath}`)
      }
    }

    // Meal plan regression test
    console.log(`\n--- meal-plan (regression) ---`)
    const mpResult = await page.evaluate(() => window.__pdfTests.mealPlan())
    console.log(`  result: ${JSON.stringify({ ok: mpResult.ok, size: mpResult.size, error: mpResult.error })}`)
    if (mpResult.ok && mpResult.b64) {
      const pdfPath = path.join(OUTPUT, 'meal-plan-regression.pdf')
      fs.writeFileSync(pdfPath, Buffer.from(mpResult.b64, 'base64'))
      console.log(`  saved: ${pdfPath} (${mpResult.size} bytes)`)
    }

    // Analyze PDFs
    console.log('')
    console.log('[6/6] Analyzing PDFs...')
    const analyzeScript = path.join(__dirname, 'analyze.py')
    const pdfFiles = fs.readdirSync(OUTPUT).filter(f => f.endsWith('.pdf'))
    for (const pdfFile of pdfFiles) {
      console.log(`\n--- ${pdfFile} ---`)
      try {
        const analysis = await runCommand('python', [analyzeScript, path.join(OUTPUT, pdfFile)])
        console.log(analysis)
      } catch (e) {
        console.log(`  analysis failed: ${e.message}`)
      }
    }

    console.log('')
    console.log('=== All tests complete ===')
    console.log(`PDFs saved to: ${OUTPUT}`)

  } finally {
    if (browser) await browser.close()
    serverProc.kill()
    // Clean up test image
    try { fs.unlinkSync(testImagePath) } catch {}
  }
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
