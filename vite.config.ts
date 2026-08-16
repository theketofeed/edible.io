import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import prerenderHomepage from './scripts/prerender-plugin.mjs'

// During `vite preview`, serve the plain SPA shell (dist/shell.html) for any
// route other than the prerendered homepage. The build emits dist/index.html
// as the fully-rendered homepage and dist/shell.html as the original shell;
// without this, `vite preview` would fall back to index.html for every route.
function spaShellPreviewFallback() {
	let distDir = ''
	return {
		name: 'spa-shell-preview-fallback',
		configResolved(config) {
			distDir = path.resolve(config.root, config.build.outDir || 'dist')
		},
		configurePreviewServer(server) {
			server.middlewares.use((req, _res, next) => {
				if (req.method === 'GET' || req.method === 'HEAD') {
					const pathname = (req.url || '').split('?')[0]
					if (
						pathname !== '/' &&
						pathname !== '/index.html' &&
						path.extname(pathname) === '' &&
						fs.existsSync(path.join(distDir, 'shell.html'))
					) {
						req.url = '/shell.html'
					}
				}
				next()
			})
		}
	}
}

export default defineConfig({
  base: '/',
  plugins: [react(), prerenderHomepage(), spaShellPreviewFallback()],
  server: {
    port: 5173
  },
  preview: {
    port: 5173
  },
  esbuild: {
    drop: ['console', 'debugger']
  }
})
