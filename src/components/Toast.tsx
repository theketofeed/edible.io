import { useEffect } from 'react'
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

const ICONS: Record<ToastKind, JSX.Element> = {
	success: <CheckCircle className="w-4 h-4 text-green-500" />,
	error: <AlertTriangle className="w-4 h-4 text-red-500" />,
	info: <Info className="w-4 h-4 text-blue-500" />
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
	useEffect(() => {
		const timers = toasts.map((toast) => {
			if (!toast.autoClose) return undefined
			return setTimeout(() => onDismiss(toast.id), toast.autoClose)
		})
		return () => {
			timers.forEach((timer) => timer && clearTimeout(timer))
		}
	}, [toasts, onDismiss])

	return (
		<div className="fixed top-6 right-4 z-50 flex flex-col gap-3">
			{toasts.map((toast) => (
				<div key={toast.id} className={`toast ${toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : 'toast-info'}`}>
					<div className="flex items-center gap-2">
						{ICONS[toast.type]}
						<span>{toast.message}</span>
					</div>
					<button className="text-black/50 hover:text-black" onClick={() => onDismiss(toast.id)} aria-label="Dismiss toast">
						<X className="w-4 h-4" />
					</button>
				</div>
			))}
		</div>
	)
}

