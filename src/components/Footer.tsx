import { memo } from 'react'
import { Twitter, Instagram, Facebook } from 'lucide-react'
import logo from '../assets/Transparent logo.png'

const Footer = memo(function Footer() {
	const currentYear = new Date().getFullYear()

	return (
		<footer className="bg-gray-900 text-white">
			<div className="max-w-5xl mx-auto px-4">

				{/* Top Row */}
				<div className="py-16 flex flex-col md:flex-row md:items-start md:justify-between gap-12">

					{/* Brand Block */}
					<div className="max-w-xs">
						{/* Logo + Wordmark */}
						<div className="flex items-center gap-2.5 mb-3">
							<img src={logo} alt="Edible.io" className="w-10 h-10 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
							<span className="text-xl font-bold text-white">Edible.io</span>
						</div>
						<p className="text-gray-400 text-sm leading-relaxed mt-2">
							Turn your groceries into delicious, personalized meal plans, powered by Edible.
						</p>

						{/* Social Icons */}
						<div className="flex gap-3 mt-6">
							<a
								href="https://twitter.com"
								target="_blank"
								rel="noopener noreferrer"
								title="Twitter / X"
								className="w-9 h-9 rounded-full bg-gray-800 hover:bg-purple-600 transition-colors flex items-center justify-center"
							>
								<Twitter className="w-4 h-4" />
							</a>
							<a
								href="https://instagram.com"
								target="_blank"
								rel="noopener noreferrer"
								title="Instagram"
								className="w-9 h-9 rounded-full bg-gray-800 hover:bg-purple-600 transition-colors flex items-center justify-center"
							>
								<Instagram className="w-4 h-4" />
							</a>
							<a
								href="https://facebook.com"
								target="_blank"
								rel="noopener noreferrer"
								title="Facebook"
								className="w-9 h-9 rounded-full bg-gray-800 hover:bg-purple-600 transition-colors flex items-center justify-center"
							>
								<Facebook className="w-4 h-4" />
							</a>
						</div>
					</div>

					{/* Link Columns */}
					<div className="flex gap-12 md:gap-16">
						{/* Product */}
						<div>
							<h4 className="text-white font-semibold text-sm mb-4">Product</h4>
							<ul className="space-y-2">
								<li><a href="#how-it-works" className="text-gray-400 hover:text-purple-400 text-sm transition-colors">How It Works</a></li>
								<li><a href="#pricing" className="text-gray-400 hover:text-purple-400 text-sm transition-colors">Pricing</a></li>
							</ul>
						</div>

						{/* Company */}
						<div>
							<h4 className="text-white font-semibold text-sm mb-4">Company</h4>
							<ul className="space-y-2">
								<li><a href="#contact" className="text-gray-400 hover:text-purple-400 text-sm transition-colors">Contact Us</a></li>
							</ul>
						</div>

						{/* Legal */}
						<div>
							<h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
							<ul className="space-y-2">
								<li><a href="#privacy" className="text-gray-400 hover:text-purple-400 text-sm transition-colors">Privacy Policy</a></li>
								<li><a href="#terms" className="text-gray-400 hover:text-purple-400 text-sm transition-colors">Terms & Conditions</a></li>
							</ul>
						</div>
					</div>
				</div>

				{/* Bottom Strip */}
				<div className="border-t border-gray-800 py-6">
					<div className="flex flex-col md:flex-row items-center justify-between gap-3">
						<p className="text-gray-500 text-xs">© {currentYear} Edible.io. All rights reserved.</p>
						<p className="text-gray-500 text-xs">Made with ❤️ for home cooks everywhere.</p>
					</div>
				</div>

			</div>
		</footer>
	)
})

export default Footer
