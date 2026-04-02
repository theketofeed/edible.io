import { memo, useCallback } from 'react'
import { House, Sparkles, CreditCard, MessageCircleQuestion, ArrowUpRight, Menu } from 'lucide-react'
import logo from '../assets/Transparent logo.png'
import { useAuth } from '../context/AuthContext'
import UserMenu from './Usermenu'

interface HeaderProps {
	onAuthClick: () => void
	onOpenProfile: () => void
}

const Header = memo(function Header({ onAuthClick, onOpenProfile }: HeaderProps) {
	const { user } = useAuth()

	const scrollToUpload = useCallback(() => {
		const el = document.getElementById('upload-section')
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}
	}, [])

	return (
		<>
			{/* Page Background - Light shade of lavender */}
			<div className="fixed inset-0 -z-10 w-full h-screen bg-purple-50"></div>

			{/* Full-width Sticky Header */}
			<header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-lg border-b border-gray-100/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all">
				<nav className="flex items-center justify-between px-5 md:px-8 py-3.5 max-w-7xl mx-auto">

					{/* Logo Section */}
					<div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
						<img src={logo} alt="Edible.io" className="w-8 h-8 object-contain" />
						<span className="text-xl font-bold text-gray-900 tracking-tight">
							Edible<span className="text-[#C6A0F6]">.io</span>
						</span>
					</div>

					{/* Desktop Navigation Links — Centered */}
					<div className="hidden md:flex items-center gap-1 bg-gray-50/50 p-1 rounded-2xl border border-gray-100/50 absolute left-1/2 -translate-x-1/2">
						{[
							{ name: 'Home', href: '#home', icon: House },
							{ name: 'How it Works', href: '#how-it-works', icon: Sparkles },
							{ name: 'Pricing', href: '#pricing', icon: CreditCard },
							{ name: 'FAQ', href: '#faq', icon: MessageCircleQuestion },
						].map((item) => (
							<a
								key={item.name}
								href={item.href}
								className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 hover:text-purple-600 hover:bg-white rounded-xl transition-all duration-200 group"
							>
								<item.icon className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
								{item.name}
							</a>
						))}
					</div>

					{/* Auth & Menu */}
					<div className="flex items-center gap-5">
						{user ? (
							<UserMenu onOpenProfile={onOpenProfile} />
						) : (
							<div className="flex items-center gap-4 md:gap-6">
								<button
									onClick={onAuthClick}
									className="text-[15px] font-semibold text-gray-600 hover:text-gray-900 transition-colors"
								>
									Sign In
								</button>
								<button className="md:hidden flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors">
									<Menu strokeWidth={2.5} className="w-[26px] h-[26px]" />
								</button>
							</div>
						)}
					</div>
				</nav>
			</header>
		</>
	)
})

export default Header