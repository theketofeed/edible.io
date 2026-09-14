import { memo, type ReactNode } from 'react'

const FRAME_COLOR = '#0B0B0C'
const BUTTON_COLOR = '#050506'
const BUTTON_HIGHLIGHT = '#0B0B0C'

interface IPhoneMockupProps {
	children?: ReactNode
	time?: string
	className?: string
}

const IPhoneMockup = memo(function IPhoneMockup({ children, time = '9:41', className = '' }: IPhoneMockupProps) {
	return (
		<div className={`iphone-mockup ${className}`} style={{ aspectRatio: '393 / 852', width: '100%', maxWidth: 393, position: 'relative', borderRadius: 55, border: `9px solid ${FRAME_COLOR}`, background: FRAME_COLOR, boxShadow: '0 2px 0 rgba(255,255,255,0.04) inset, 0 30px 60px -20px rgba(0,0,0,0.45)', overflow: 'visible' }}>
			<SideButton top="16%" height="7%" side="left" />
			<SideButton top="25%" height="11%" side="left" />
			<SideButton top="38%" height="11%" side="left" />
			<SideButton top="22%" height="14%" side="right" />

			<div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 46, overflow: 'hidden', background: '#F5F3FF' }}>
				<StatusBar time={time} />
				<div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>{children}</div>
				<div style={{ position: 'absolute', bottom: '1.2%', left: '50%', transform: 'translateX(-50%)', width: '36%', height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.35)' }} />
			</div>
		</div>
	)
})

function StatusBar({ time }: { time: string }) {
	return (
		<div style={{ position: 'absolute', top: '0.75%', left: 0, right: 0, height: '6.8%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8.5%', zIndex: 3, pointerEvents: 'none' }} aria-label={`${time}, full signal, Wi-Fi, full battery`}>
			<span style={{ fontFamily: '"Open Sans", ui-sans-serif, system-ui, sans-serif', fontWeight: 900, fontSize: 15, letterSpacing: '-0.2px', color: '#0A0A0A', transform: 'translateX(28px)', WebkitTextStroke: '0.35px #0A0A0A', textShadow: '0 0 0.01px #0A0A0A' }}>{time}</span>
			<div style={{ position: 'absolute', top: '22.5%', left: '50%', transform: 'translateX(-50%)', width: '30%', height: '55%', borderRadius: 999, background: '#000' }} />
			<div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
				<SignalDots />
				<WifiIcon />
				<BatteryIcon />
			</div>
		</div>
	)
}

function SignalDots() {
	const heights = [4, 6, 8, 10]
	return <svg width="18" height="11" viewBox="0 0 18 11" fill="none" aria-label="Cellular signal">{heights.map((height, index) => <rect key={index} x={index * 4.5} y={11 - height} width="3" height={height} rx="0.8" fill="#0A0A0A" />)}</svg>
}

function WifiIcon() {
	return <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-label="Wi-Fi"><path d="M8 10.2a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Z" fill="#0A0A0A" /><path d="M5 7.2c1.6-1.5 4.4-1.5 6 0M2.6 4.6c3-2.7 7.8-2.7 10.8 0" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" /></svg>
}

function BatteryIcon() {
	return <svg width="25" height="12" viewBox="0 0 25 12" fill="none" aria-label="Full battery"><rect x="0.75" y="0.75" width="20.5" height="10.5" rx="2.75" stroke="#0A0A0A" strokeWidth="1.2" /><rect x="2.5" y="2.5" width="17" height="7" rx="1.4" fill="#0A0A0A" /><rect x="22.5" y="4" width="1.8" height="4" rx="0.8" fill="#0A0A0A" /></svg>
}

function SideButton({ top, height, side }: { top: string; height: string; side: 'left' | 'right' }) {
	return <div style={{ position: 'absolute', top, height, width: 12, [side]: -12, zIndex: 50, border: '1px solid #1A1A1C', borderRadius: side === 'left' ? '6px 0 0 6px' : '0 6px 6px 0', background: `linear-gradient(${side === 'left' ? 'to left' : 'to right'}, ${BUTTON_COLOR}, ${BUTTON_HIGHLIGHT} 55%, ${BUTTON_COLOR})` }} />
}

export default IPhoneMockup
