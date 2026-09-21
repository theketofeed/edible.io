import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const OUTPUT = path.join(ROOT, 'product-hunt-gallery')
const PORT = 5202

const SLIDES = [
	{ name: 'ph-gallery-01-upload', label: 'Upload' },
	{ name: 'ph-gallery-02-choose-plan', label: 'Choose plan' },
	{ name: 'ph-gallery-03-ai-generating', label: 'AI generating' },
	{ name: 'ph-gallery-04-cook-your-week', label: 'Cook your week' },
	{ name: 'ph-gallery-05-recipe-detail', label: 'Recipe detail' },
]

fs.mkdirSync(OUTPUT, { recursive: true })

function findChrome() {
	const candidates =
		process.platform === 'win32'
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

function startViteDevServer() {
	return new Promise((resolve, reject) => {
		const viteBin = path.join(ROOT, 'node_modules', '.bin', 'vite')
		const proc = spawn(viteBin, ['--port', String(PORT), '--host', '127.0.0.1', '--strictPort'], {
			cwd: ROOT,
			stdio: 'pipe',
			shell: true,
		})
		let started = false
		let timedOut = false
		const timeout = setTimeout(() => {
			timedOut = true
			reject(new Error(`Vite dev server timed out after 90s`))
		}, 90000)
		proc.stdout?.on('data', (d) => {
			const s = d.toString()
			process.stdout.write('[vite] ' + s)
			if (!started && (s.includes('ready in') || s.includes('Local:'))) {
				started = true
				clearTimeout(timeout)
				resolve(proc)
			}
		})
		proc.stderr?.on('data', (d) => {
			const s = d.toString()
			if (s.includes('Port') && s.includes('in use')) {
				clearTimeout(timeout)
				reject(new Error('Port in use: ' + s.trim()))
			}
			process.stderr.write('[vite:err] ' + s)
		})
		proc.on('error', (e) => {
			if (!timedOut) {
				clearTimeout(timeout)
				reject(e)
			}
		})
	})
}

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms))
}

function readPngSize(buf) {
	if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

async function main() {
	console.log('=== Product Hunt Gallery Export ===\n')

	console.log('[1/4] Starting Vite dev server...')
	const serverProc = await startViteDevServer()
	console.log('Vite ready on port', PORT, '\n')

	const puppeteer = await import('puppeteer-core').then((m) => m.default)

	let browser
	try {
		console.log('[2/4] Launching Chrome...')
		const execPath = findChrome()
		browser = await puppeteer.launch({
			executablePath: execPath,
			args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--hide-scrollbars'],
			headless: true,
			defaultViewport: { width: 1360, height: 860, deviceScaleFactor: 1 },
		})
		const page = await browser.newPage()
		page.on('console', (msg) => {
			if (msg.type() !== 'log') console.log('[page.console]', msg.type(), msg.text().slice(0, 300))
		})
		page.on('pageerror', (err) => console.error('[page.error]', err?.message))
		console.log('Chrome launched\n')

		console.log('[3/4] Loading gallery-export.html...')
		await page.goto(`http://127.0.0.1:${PORT}/gallery-export.html`, { waitUntil: 'networkidle0', timeout: 90000 })

		await page.waitForSelector('[data-slide]', { timeout: 30000 }).catch(async (e) => {
			const body = await page.evaluate(() => document.body?.innerHTML?.slice(0, 400))
			console.error('Slide selector never appeared. body innerHTML:', body)
			throw e
		})
		const slideCount = await page.$$eval('[data-slide]', (els) => els.length)
		console.log('Slides rendered:', slideCount)
		if (slideCount !== 5) throw new Error(`Expected 5 slides, found ${slideCount}`)

		// Wait for webfonts + remote images
		await page.evaluate(() => document.fonts?.ready)
		const imagesPending = await page.evaluate(() => [...document.images].filter((i) => !i.complete).length)
		if (imagesPending > 0) {
			console.log(`Waiting for ${imagesPending} image(s) to finish loading...`)
			await page
				.waitForFunction(() => [...document.images].every((i) => i.complete), { timeout: 45000 })
				.catch(() => console.warn('Timed out waiting for images — continuing with whatever loaded'))
		}
		await sleep(1200)

		console.log('\n[4/4] Capturing slides...')
		const els = await page.$$('[data-slide]')
		if (els.length !== SLIDES.length) throw new Error(`Expected ${SLIDES.length} slide elements, found ${els.length}`)
		for (let i = 0; i < SLIDES.length; i++) {
			const { name, label } = SLIDES[i]
			const el = els[i]
			if (!el) throw new Error(`Slide element missing for index ${i + 1}`)
			const box = await el.boundingBox()
			const buf = await el.screenshot({ type: 'png' })
			const file = path.join(OUTPUT, `${name}.png`)
			fs.writeFileSync(file, buf)
			const size = readPngSize(buf)
			console.log(
				`  ${label.padEnd(14)} -> ${path.relative(ROOT, file)}  (${size.width}x${size.height}px, ${(buf.length / 1024).toFixed(1)} KB)`
			)
			if (!box || Math.round(box.width) !== 1270 || Math.round(box.height) !== 760) {
				console.warn(`    WARN: bounding box was ${box?.width}x${box?.height} — expected 1270x760`)
			}
			if (!size || size.width !== 1270 || size.height !== 760) {
				console.warn(`    WARN: PNG is ${size?.width}x${size?.height} — expected 1270x760`)
			}
		}

		console.log('\nDone. Files written to', OUTPUT)
	} finally {
		await browser?.close()
		serverProc.kill()
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})