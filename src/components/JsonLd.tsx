import { useEffect } from 'react'

type JsonLdProps = {
	data: Record<string, unknown> | Record<string, unknown>[]
}

const SELECTOR = 'script[data-edible-json-ld]'

function escapeJsonLd(json: string) {
	return json.replace(/</g, '\\u003c')
}

export default function JsonLd({ data }: JsonLdProps) {
	useEffect(() => {
		document.querySelectorAll(SELECTOR).forEach((el) => el.remove())

		const items = Array.isArray(data) ? data : [data]
		const scripts: HTMLScriptElement[] = []

		for (const item of items) {
			const script = document.createElement('script')
			script.type = 'application/ld+json'
			script.dataset.edibleJsonLd = String(item['@type'] || 'schema')
			script.textContent = escapeJsonLd(JSON.stringify(item))
			document.head.appendChild(script)
			scripts.push(script)
		}

		return () => {
			for (const script of scripts) script.remove()
		}
	}, [data])

	return null
}