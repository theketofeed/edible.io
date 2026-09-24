import { useEffect } from 'react'
import { DEFAULT_OG_IMAGE, SITE_URL } from '../lib/seo'

type SeoProps = {
	title: string
	description: string
	/** Route path, e.g. "/blog/best-meal-planning-apps". Used for canonical + og:url. */
	path: string
	/** Absolute image URL for social cards. Defaults to the site's og-image. */
	image?: string
}

const CANONICAL_SELECTOR = 'link[rel="canonical"]'

function setMeta(selector: string, content: string) {
	const el = document.querySelector(selector)
	if (el) el.setAttribute('content', content)
}

export default function Seo({ title, description, path, image }: SeoProps) {
	useEffect(() => {
		const url = `${SITE_URL}${path}`
		const img = image || DEFAULT_OG_IMAGE

		document.title = title
		setMeta('meta[name="description"]', description)
		setMeta('meta[property="og:title"]', title)
		setMeta('meta[property="og:description"]', description)
		setMeta('meta[property="og:url"]', url)
		setMeta('meta[property="og:image"]', img)
		setMeta('meta[name="twitter:title"]', title)
		setMeta('meta[name="twitter:description"]', description)
		setMeta('meta[name="twitter:image"]', img)

		let canonical = document.querySelector<HTMLLinkElement>(CANONICAL_SELECTOR)
		if (!canonical) {
			canonical = document.createElement('link')
			canonical.rel = 'canonical'
			document.head.appendChild(canonical)
		}
		canonical.href = url
	}, [title, description, path, image])

	return null
}