import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import run from './drive.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
process.env.DRIVE_RECIPE = process.env.DRIVE_RECIPE || 'real'
process.env.DRIVE_OUT = path.resolve(__dirname, '../../tests/pdf-real-recipe.pdf')
process.env.DRIVE_IMG = '1'
process.env.DRIVE_OPTS = JSON.stringify({ dataurl: true, waitMs: 800 })

function findChrome() {
  const candidates = process.platform === 'win32'
    ? [
        path.join(process.env['PROGRAMFILES'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['LOCALAPPDATA'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      ]
    : ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium']
  for (const p of candidates) if (p && fs.existsSync(p)) return p
  throw new Error('No Chrome/Edge found on system')
}

const { default: puppeteer } = await import('puppeteer-core')
const browser = await puppeteer.launch({
  executablePath: findChrome(),
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  headless: true,
  defaultViewport: { width: 1280, height: 900 },
})
try {
  const page = await browser.newPage()
  const res = await run(page)
  if (!res.ok) { console.error('FAIL:', res.error); console.log('LOG:\n' + res.log); process.exit(1) }
  console.log('OK  recipe=' + res.recipe + ' size=' + res.size + ' out=' + res.out)
  console.log('--- harness log ---')
  console.log(res.log)
} finally {
  await browser.close()
}