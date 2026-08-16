import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

async function resolveBrowserPath() {
	if (process.platform !== 'win32') {
		// Linux / macOS: use @sparticuz/chromium's bundled binary (works on Vercel).
		return chromium.executablePath()
	}
	// Windows: find a local Chrome / Edge installation.
	const candidates = [
		path.join(process.env['PROGRAMFILES'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
		path.join(process.env['LOCALAPPDATA'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
		path.join(process.env['PROGRAMFILES(X86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
		path.join(process.env['PROGRAMFILES'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
	]
	for (const p of candidates) {
		if (fs.existsSync(p)) return p
	}
	throw new Error('[prerender] No Chrome or Edge found on Windows. Install Chrome or Edge to run the prerender.')
}

const ROUTES = ['/']

const CONTENT_MARKER = 'Turn your groceries into meal plans instantly'

const MIME_TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
	'.txt': 'text/plain; charset=utf-8',
	'.xml': 'application/xml; charset=utf-8',
	'.map': 'application/json'
}

function startStaticServer(rootDir) {
	const server = http.createServer((req, res) => {
		const pathname = decodeURIComponent((req.url || '').split('?')[0])
		if (pathname.includes('..')) {
			res.writeHead(403)
			res.end('Forbidden')
			return
		}
		const filePath = path.join(rootDir, pathname === '/' ? 'index.html' : pathname)
		fs.readFile(filePath, (err, data) => {
			if (err) {
				res.writeHead(404)
				res.end('Not found')
				return
			}
			const ext = path.extname(filePath).toLowerCase()
			res.writeHead(200, {
				'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
				'Cache-Control': 'no-store'
			})
			res.end(data)
		})
	})
	return new Promise((resolve) => {
		server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
	})
}

function closeServer(server) {
	return new Promise((resolve) => server.close(() => resolve()))
}

export default function prerenderHomepagePlugin() {
	let distDir = ''
	return {
		name: 'edible-prerender-homepage',
		apply: 'build',
		configResolved(config) {
			distDir = path.resolve(config.root, config.build.outDir || 'dist')
		},
		async closeBundle() {
			if (process.env.SKIP_PRERENDER) return
			await prerenderHomepage(distDir)
		}
	}
}

async function prerenderHomepage(distDir) {
	const indexHtmlPath = path.join(distDir, 'index.html')
	const shellHtmlPath = path.join(distDir, 'shell.html')

	if (!fs.existsSync(indexHtmlPath)) {
		throw new Error('[prerender] dist/index.html not found after build — cannot prerender.')
	}

	// Keep the original SPA shell so non-root routes can still return it.
	fs.copyFileSync(indexHtmlPath, shellHtmlPath)

	const { server, port } = await startStaticServer(distDir)
	let browser
	try {
		const execPath = await resolveBrowserPath()
		browser = await puppeteer.launch({
			executablePath: execPath,
			args: chromium.args,
			defaultViewport: chromium.defaultViewport,
			headless: chromium.headless,
		})
		const page = await browser.newPage()
		await page.setViewport({ width: 1280, height: 900 })

		// Only allow requests to the local preview server. Everything else
		// (Supabase, PostHog, Sentry, fonts, etc.) is blocked so the prerender
		// is deterministic and doesn't emit analytics/telemetry.
		await page.setRequestInterception(true)
		page.on('request', (request) => {
			try {
				const { hostname } = new URL(request.url())
				if (hostname === '127.0.0.1' || hostname === 'localhost') {
					request.continue()
				} else {
					request.abort()
				}
			} catch {
				request.abort()
			}
		})

		for (const route of ROUTES) {
			const url = `http://127.0.0.1:${port}${route}`
			const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
			if (!response || response.status() !== 200) {
				throw new Error(`[prerender] ${route} returned ${response ? response.status() : 'no response'}`)
			}

			await page.waitForFunction(
				() => {
					const h1 = document.querySelector('h1')
					return !!(h1 && h1.textContent.includes('Turn your groceries'))
				},
				{ timeout: 30000 }
			)

			// Let images/animations settle before serializing.
			await new Promise((resolve) => setTimeout(resolve, 750))

			const html =
				'<!doctype html>\n' + (await page.evaluate(() => document.documentElement.outerHTML))

			const hasContent = await page.evaluate((marker) => {
				const text = document.body ? document.body.textContent || '' : ''
				return text.replace(/\s+/g, ' ').includes(marker.replace(/\s+/g, ' '))
			}, CONTENT_MARKER)

			if (!hasContent) {
				const h1Text = await page.evaluate(() => document.querySelector('h1')?.textContent)
				fs.writeFileSync(path.join(distDir, 'prerender-debug.html'), html, 'utf8')
				throw new Error(
					`[prerender] rendered HTML for ${route} is missing expected content ("${CONTENT_MARKER}"). h1 textContent: ${JSON.stringify(h1Text)}. Debug dump written to dist/prerender-debug.html`
				)
			}
			if (html.includes('<div id="root"></div>')) {
				throw new Error(`[prerender] rendered HTML for ${route} still has an empty #root — nothing was rendered.`)
			}

			const outPath =
				route === '/' ? indexHtmlPath : path.join(distDir, route.replace(/^\//, ''), 'index.html')
			fs.mkdirSync(path.dirname(outPath), { recursive: true })
			fs.writeFileSync(outPath, html, 'utf8')
			console.log(
				`[prerender] ${route} -> ${path.relative(distDir, outPath)} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`
			)
		}
	} finally {
		if (browser) await browser.close()
		await closeServer(server)
	}
}
