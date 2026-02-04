import { useEffect, useState } from 'react'
import { CheckCircle, Info, AlertTriangle, X } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastMessage {
	id: string
	type: ToastKind
	message: string
	autoClose?: number
}

interface Props {
	toasts: ToastMessage[]
	onDismiss: (id: string) => void
}

const ICON_CONFIG: Record<ToastKind, { bg: string; color: string; icon: JSX.Element }> = {
	success: {
		bg: 'bg-purple-100',
		color: 'text-purple-600',
		icon: <CheckCircle className="w-5 h-5" />
	},
	error: {
		bg: 'bg-red-100',
		color: 'text-red-600',
		icon: <AlertTriangle className="w-5 h-5" />
	},
	info: {
		bg: 'bg-purple-100',
		color: 'text-purple-600',
		icon: <Info className="w-5 h-5" />
	}
}

function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
	const [isExiting, setIsExiting] = useState(false)
	const config = ICON_CONFIG[toast.type]

	useEffect(() => {
		if (!toast.autoClose) return
		const timer = setTimeout(() => {
			setIsExiting(true)
			setTimeout(onDismiss, 200)
		}, toast.autoClose)
		return () => clearTimeout(timer)
	}, [toast.autoClose, onDismiss])

	const handleClose = () => {
		setIsExiting(true)
		setTimeout(onDismiss, 200)
	}

	return (
		<div
			className={`
				flex items-center gap-3
				bg-white
				border border-purple-200
				rounded-xl
				px-5 py-4
				min-w-80 max-w-sm
				shadow-md
				transition-all duration-200
				${isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
			`}
		>
			{/* Icon Container */}
			<div className={`${config.bg} ${config.color} w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0`}>
				{config.icon}
			</div>

			{/* Message Text */}
			<p className="flex-1 text-gray-900 text-sm font-medium leading-relaxed">{toast.message}</p>

			{/* Close Button */}
			<button
				onClick={handleClose}
				className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg"
				aria-label="Close notification"
			>
				<X className="w-5 h-5" />
			</button>
		</div>
	)
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
	return (
		<div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
			{toasts.map((toast) => (
				<div key={toast.id} className="animate-in slide-in-from-bottom-3 fade-in duration-300 pointer-events-auto">
					<Toast toast={toast} onDismiss={() => onDismiss(toast.id)} />
				</div>
			))}
		</div>
	)
}

