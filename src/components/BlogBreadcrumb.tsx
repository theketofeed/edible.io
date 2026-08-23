import { Link } from 'react-router-dom'

interface BlogBreadcrumbProps {
	title: string
}

export default function BlogBreadcrumb({ title }: BlogBreadcrumbProps) {
	return (
		<nav aria-label="Breadcrumb" className="text-sm mb-5">
			<Link
				to="/blog"
				className="text-gray-400 hover:text-purple-600 transition-colors"
			>
				Blog
			</Link>
			<span className="text-gray-300 mx-2" aria-hidden="true">›</span>
			<span className="text-gray-500">{title}</span>
		</nav>
	)
}
