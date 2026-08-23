import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

function resolveBrowserPath() {
	const candidates = [
		path.join(process.env['PROGRAMFILES'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
		path.join(process.env['LOCALAPPDATA'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
		path.join(process.env['PROGRAMFILES(X86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
		path.join(process.env['PROGRAMFILES'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
	]
	for (const p of candidates) {
		if (fs.existsSync(p)) return p
	}
	throw new Error('No Chrome or Edge found')
}

const MIME_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2' }
const distDir = path.resolve('dist')
const server = http.createServer((req, res) => {
	const pathname = decodeURIComponent((req.url || '').split('?')[0])
	if (pathname.includes('..')) { res.writeHead(403); res.end(); return }
	const filePath = path.join(distDir, pathname === '/' ? 'index.html' : pathname)
	fs.readFile(filePath, (err, data) => {
		if (err) {
			fs.readFile(path.join(distDir, 'index.html'), (e2, d2) => {
				if (e2) { res.writeHead(404); res.end('nf'); return }
				res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(d2)
			})
			return
		}
		res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' })
		res.end(data)
	})
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port

const ROUTES = ['/', '/pricing', '/how-it-works', '/faq', '/blog/best-meal-planning-apps', '/blog/healthy-grocery-list', '/blog']

const browser = await puppeteer.launch({ executablePath: resolveBrowserPath(), args: chromium.args, defaultViewport: chromium.defaultViewport, headless: chromium.headless })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })
await page.setRequestInterception(true)
page.on('request', (request) => {
	try {
		const { hostname } = new URL(request.url())
		if (hostname === '127.0.0.1' || hostname === 'localhost') {
			request.continue()
		} else {
			request.abort()
		}
	} catch { request.abort() }
})

for (const route of ROUTES) {
	const t0 = Date.now()
	try {
		await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle0', timeout: 60000 })
		console.log(`OK ${route} (${Date.now() - t0}ms)`)
	} catch (e) {
		console.log(`FAIL ${route} after ${Date.now() - t0}ms: ${e.message.split('\n')[0]}`)
		const pending = await page.evaluate(() => performance.getEntriesByType('resource').filter((r) => r.responseEnd === 0).map((r) => r.name))
		console.log('pending resources:', JSON.stringify(pending, null, 2))
		break
	}
}
await browser.close()
server.close()
