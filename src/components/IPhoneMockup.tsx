import { memo, type ReactNode } from 'react'

interface IPhoneMockupProps {
	children: ReactNode
	className?: string
}

const IPhoneMockup = memo(function IPhoneMockup({ children, className = '' }: IPhoneMockupProps) {
	return (
		<div className={`relative select-none ${className}`} style={{ width: 280, height: 580 }}>
			{/* Device frame SVG */}
			<svg
				viewBox="0 0 280 580"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				className="absolute inset-0 w-full h-full pointer-events-none"
				aria-hidden="true"
			>
				{/* Outer frame */}
				<rect x="0.5" y="0.5" width="279" height="579" rx="48" fill="#1a1a1a" stroke="#333" strokeWidth="1" />

				{/* Screen bezel */}
				<rect x="8" y="8" width="264" height="564" rx="42" fill="#fff" />

				{/* Dynamic Island */}
				<rect x="100" y="18" width="80" height="28" rx="14" fill="#1a1a1a" />

				{/* Status bar - Time */}
				<text x="28" y="40" fontFamily="system-ui, -apple-system, sans-serif" fontSize="14" fontWeight="600" fill="#1a1a1a" letterSpacing="-0.2">
					9:41
				</text>

				{/* WiFi icon */}
				<g transform="translate(200, 27)">
					<path d="M8 14.5C10 14.5 11.5 13 11.5 11.5" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
					<path d="M5 12C7.5 9.5 10.5 9.5 13 12" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
					<path d="M2.5 9.5C6.5 5.5 11.5 5.5 15.5 9.5" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
					<circle cx="9" cy="16" r="1.2" fill="#1a1a1a" />
				</g>

				{/* Battery icon */}
				<g transform="translate(228, 28)">
					<rect x="0" y="0" width="22" height="11" rx="2.5" stroke="#1a1a1a" strokeWidth="1.2" fill="none" />
					<rect x="2" y="2" width="18" height="7" rx="1.5" fill="#1a1a1a" />
					<rect x="22" y="3.5" width="2" height="4" rx="1" fill="#1a1a1a" />
				</g>

				{/* Left side buttons - Volume Up */}
				<rect x="-2" y="120" width="3" height="30" rx="1.5" fill="#2a2a2a" />
				{/* Left side buttons - Volume Down */}
				<rect x="-2" y="158" width="3" height="30" rx="1.5" fill="#2a2a2a" />

				{/* Right side button - Power/Side */}
				<rect x="279" y="145" width="3" height="50" rx="1.5" fill="#2a2a2a" />

				{/* Home indicator */}
				<rect x="100" y="554" width="80" height="5" rx="2.5" fill="#1a1a1a" />
			</svg>

			{/* Screen content area */}
			<div
				className="absolute overflow-hidden"
				style={{
					top: 50,
					left: 10,
					right: 10,
					bottom: 12,
					borderRadius: 36,
				}}
			>
				{children}
			</div>
		</div>
	)
})

export default IPhoneMockup
