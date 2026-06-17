import { memo, useCallback, useState } from 'react'
import { House, Sparkles, CreditCard, MessageCircleQuestion, Menu, X } from 'lucide-react'
import logo from '../assets/favicon.png'
import { useAuth } from '../context/AuthContext'
import UserMenu from './Usermenu'

interface HeaderProps {
	onAuthClick: () => void
	onOpenProfile: () => void
}

const Header = memo(function Header({ onAuthClick, onOpenProfile }: HeaderProps) {
	const { user } = useAuth()
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

	const scrollToUpload = useCallback(() => {
		const el = document.getElementById('upload-section')
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}
	}, [])

	const navItems = [
		{ name: 'Home', href: '#home', icon: House },
		{ name: 'How it Works', href: '#how-it-works', icon: Sparkles },
		{ name: 'Pricing', href: '#pricing', icon: CreditCard },
		{ name: 'FAQ', href: '#faq', icon: MessageCircleQuestion },
	]

	return (
		<>
			{/* Page Background */}
			<div className="fixed inset-0 -z-10 w-full h-screen bg-purple-50"></div>

			{/* Floating Pill Header */}
			<header className="sticky top-0 z-50 mx-3 sm:mx-4 mt-3 sm:mt-4 rounded-full bg-white/70 backdrop-blur-md border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all">
				<nav className="flex items-center justify-between px-4 md:px-8 py-3 max-w-7xl mx-auto">

					{/* Logo */}
					<div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => window.scrollTo(0, 0)}>
						<img src={logo} alt="Edible" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
						<span className="text-[17px] sm:text-xl font-bold text-gray-900 tracking-tight">
							Edible
						</span>
					</div>

					{/* Desktop Nav — Centred Pill */}
					<div className="hidden md:flex items-center gap-1 bg-gray-100/30 p-1 rounded-full border border-gray-200/20 absolute left-1/2 -translate-x-1/2 shadow-sm">
						{navItems.map((item) => (
							<a
								key={item.name}
								href={item.href}
								className="flex items-center gap-2 px-4 py-2 text-[13px] font-bold text-gray-500 hover:text-purple-600 hover:bg-white rounded-full transition-all duration-300 group shadow-none hover:shadow-sm"
							>
								<item.icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-purple-500 transition-colors" />
								{item.name}
							</a>
						))}
					</div>

					{/* Auth & Mobile Menu Button */}
					<div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
						{user ? (
							<UserMenu onOpenProfile={onOpenProfile} />
						) : (
							<button
								onClick={onAuthClick}
								className="text-[14px] font-semibold text-gray-600 hover:text-gray-900 transition-colors px-1 py-1"
							>
								Sign In
							</button>
						)}
						
						{/* Mobile Hamburger */}
						<button 
							className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							aria-label="Toggle menu"
						>
							{mobileMenuOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
						</button>
					</div>
				</nav>
			</header>

			{/* Mobile Menu Dropdown */}
			{mobileMenuOpen && (
				<div className="md:hidden fixed top-24 left-4 right-4 z-40 bg-white rounded-2xl shadow-lg border border-gray-100 p-4 animate-fadeIn">
					<div className="flex flex-col gap-2">
						{navItems.map((item) => (
							<a
								key={item.name}
								href={item.href}
								onClick={() => setMobileMenuOpen(false)}
								className="flex items-center gap-3 px-4 py-3 text-[15px] font-semibold text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
							>
								<item.icon className="w-5 h-5 text-gray-400" />
								{item.name}
							</a>
						))}
	
					</div>
				</div>
			)}
		</>
	)
})

export default Header