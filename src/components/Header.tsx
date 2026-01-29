import { memo } from 'react'
import { UtensilsCrossed, House, Sparkles, CreditCard, MessageCircleQuestion, ArrowUpRight, Menu } from 'lucide-react'

const Header = memo(function Header() {
	return (
		<>
			{/* Page Background - Light shade of lavender */}
			<div className="fixed inset-0 -z-10 w-full h-screen bg-purple-50"></div>

			{/* Floating Sticky Header */}
			<header className="sticky top-4 z-50 flex justify-center px-4">
				{/* Fatter container (p-3), stronger shadow for 'pop' */}
				<nav className="flex items-center gap-1 p-3 pl-6 pr-3 bg-white/90 backdrop-blur-md rounded-full shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-white/50 max-w-5xl w-full mx-auto">

					{/* Logo Section */}
					<div className="flex items-center gap-3">
						{/* Icon Box */}
						<div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900">
							<UtensilsCrossed className="w-4 h-4 text-white" />
						</div>
						{/* Brand Text */}
						<span className="text-lg font-bold text-gray-900 tracking-tight">
							Edible.io
						</span>
					</div>

					{/* Navigation Links - Centered, Hidden on mobile */}
					<div className="hidden md:flex flex-1 items-center justify-center gap-1">
						{/* Home */}
						<a href="#home" className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200">
							<House className="w-4 h-4" />
							<span>Home</span>
						</a>

						{/* Services */}
						<a href="#how-it-works" className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200">
							<Sparkles className="w-4 h-4" />
							<span>Services</span>
						</a>

						{/* Pricing */}
						<a href="#pricing" className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200">
							<CreditCard className="w-4 h-4" />
							<span>Pricing</span>
						</a>

						{/* Features */}
						<a href="#faq" className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200">
							<MessageCircleQuestion className="w-4 h-4" />
							<span>Features</span>
						</a>
					</div>

					{/* CTA Section */}
					<div className="flex items-center gap-2">
						{/* Primary Button - Lavender to match 'Choose file' */}
						<button className="flex items-center gap-2 bg-[#C6A0F6] text-gray-900 px-6 py-2.5 rounded-full text-sm font-semibold shadow-md hover:bg-[#b58df5] transition-colors duration-200">
							Try Now
						</button>

						{/* Secondary Circle Button */}
						<button className="flex items-center justify-center w-10 h-10 rounded-full bg-black text-white hover:bg-gray-800 transition-colors duration-200 group">
							<ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
						</button>

						{/* Mobile Menu Button */}
						<button className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200 ml-1">
							<Menu className="w-5 h-5 text-gray-900" />
						</button>
					</div>
				</nav>
			</header>
		</>
	)
})

export default Header