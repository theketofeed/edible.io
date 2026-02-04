import { memo } from 'react'

interface FooterLink {
	label: string
	href: string
}

interface FooterColumn {
	title: string
	links: FooterLink[]
}

const FOOTER_COLUMNS: FooterColumn[] = [
	{
		title: 'Product',
		links: [
			{ label: 'Features', href: '#features' },
			{ label: 'How It Works', href: '#how-it-works' },
			{ label: 'Pricing', href: '#pricing' },
			{ label: 'Download', href: '#download' }
		]
	},
	{
		title: 'Company',
		links: [
			{ label: 'About', href: '#about' },
			{ label: 'Blog', href: '#blog' },
			{ label: 'Careers', href: '#careers' },
			{ label: 'Contact', href: '#contact' }
		]
	},
	{
		title: 'Legal',
		links: [
			{ label: 'Privacy', href: '#privacy' },
			{ label: 'Terms', href: '#terms' },
			{ label: 'Cookies', href: '#cookies' },
			{ label: 'Disclaimer', href: '#disclaimer' }
		]
	}
]

const SOCIAL_LINKS = [
	{ label: 'Twitter', icon: '𝕏', href: 'https://twitter.com' },
	{ label: 'Instagram', icon: '📷', href: 'https://instagram.com' },
	{ label: 'Facebook', icon: 'f', href: 'https://facebook.com' }
]

const Footer = memo(function Footer() {
	const currentYear = new Date().getFullYear()

	return (
		<footer className="bg-gray-900 text-white">
			{/* Main Footer Content */}
			<div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
					{/* Branding */}
					<div className="col-span-2 md:col-span-1">
						<h3 className="text-xl font-bold mb-4">Edible.io</h3>
						<p className="text-gray-400 text-sm leading-relaxed">
							Transform your groceries into delicious meal plans with AI
						</p>
					</div>

					{/* Footer Links */}
					{FOOTER_COLUMNS.map((column, idx) => (
						<div key={idx}>
							<h4 className="font-semibold text-white mb-4 text-sm md:text-base">
								{column.title}
							</h4>
							<ul className="space-y-2">
								{column.links.map((link) => (
									<li key={link.label}>
										<a
											href={link.href}
											className="text-gray-400 hover:text-purple-400 transition-colors duration-200 text-sm"
										>
											{link.label}
										</a>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				{/* Bottom Row */}
				<div className="border-t border-gray-800 pt-8 md:pt-12">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
						{/* Copyright */}
						<p className="text-gray-400 text-xs md:text-sm">
							© {currentYear} Edible.io. All rights reserved.
						</p>

						{/* Social Links */}
						<div className="flex gap-4">
							{SOCIAL_LINKS.map((link) => (
								<a
									key={link.label}
									href={link.href}
									target="_blank"
									rel="noopener noreferrer"
									className="w-10 h-10 rounded-full bg-gray-800 hover:bg-purple-600 transition-colors duration-200 flex items-center justify-center text-white"
									title={link.label}
								>
									<span className="text-lg">{link.icon}</span>
								</a>
							))}
						</div>
					</div>
				</div>
			</div>
		</footer>
	)
})

export default Footer
