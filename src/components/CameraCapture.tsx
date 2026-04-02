import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, X, RotateCw, AlertCircle } from 'lucide-react'

interface Props {
	onCapture: (file: File) => void
	onClose: () => void
}

export default function CameraCapture({ onCapture, onClose }: Props) {
	const [isCameraActive, setIsCameraActive] = useState(false)
	const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
	const [error, setError] = useState('')

	const videoRef = useRef<HTMLVideoElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const streamRef = useRef<MediaStream | null>(null)

	const startCamera = useCallback(async () => {
		try {
			console.log('[CameraCapture] Starting camera with facingMode:', facingMode)
			setError('')

			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode,
					width: { ideal: 1920 },
					height: { ideal: 1080 }
				}
			})

			if (videoRef.current) {
				videoRef.current.srcObject = stream
				streamRef.current = stream
				setIsCameraActive(true)
				console.log('[CameraCapture] Camera started successfully')
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to access camera'
			console.error('[CameraCapture] Camera error:', message)
			setError(message)
		}
	}, [facingMode])

	const stopCamera = useCallback(() => {
		console.log('[CameraCapture] Stopping camera')
		if (streamRef.current) {
			streamRef.current.getTracks().forEach(track => {
				console.log('[CameraCapture] Stopping track:', track.kind)
				track.stop()
			})
			streamRef.current = null
		}
		setIsCameraActive(false)
	}, [])

	const capturePhoto = useCallback(() => {
		console.log('[CameraCapture] Capturing photo')

		if (!videoRef.current || !canvasRef.current) {
			console.error('[CameraCapture] Video or canvas ref not available')
			return
		}

		const context = canvasRef.current.getContext('2d')
		if (!context) {
			console.error('[CameraCapture] Could not get 2D context')
			return
		}

		// Set canvas dimensions to match video
		const width = videoRef.current.videoWidth
		const height = videoRef.current.videoHeight
		canvasRef.current.width = width
		canvasRef.current.height = height

		console.log('[CameraCapture] Canvas dimensions:', { width, height })

		// Draw video frame to canvas
		context.drawImage(videoRef.current, 0, 0, width, height)

		// Convert canvas to blob
		canvasRef.current.toBlob(
			(blob) => {
				if (!blob) {
					console.error('[CameraCapture] Failed to create blob')
					return
				}

				console.log('[CameraCapture] Blob created, size:', blob.size, 'bytes')
				const file = new File([blob], 'receipt-capture.jpg', { type: 'image/jpeg' })
				console.log('[CameraCapture] File created:', file.name, file.size, 'bytes')

				onCapture(file)
				stopCamera()
			},
			'image/jpeg',
			0.95
		)
	}, [onCapture, stopCamera])

	const switchCamera = useCallback(() => {
		console.log('[CameraCapture] Switching camera from', facingMode)
		setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'))
	}, [facingMode])

	// Auto-start camera on mount
	useEffect(() => {
		console.log('[CameraCapture] Component mounted, starting camera')
		startCamera()

		return () => {
			console.log('[CameraCapture] Component unmounting, stopping camera')
			stopCamera()
		}
	}, [startCamera, stopCamera])

	// Restart camera when facingMode changes
	useEffect(() => {
		if (isCameraActive) {
			console.log('[CameraCapture] Facing mode changed, restarting camera')
			stopCamera()
			startCamera()
		}
	}, [facingMode])

	const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

	return (
		<div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
			<style>{`
				@keyframes slideUp {
					from {
						opacity: 0;
						transform: translateY(20px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				@keyframes scanLineMove {
					0% {
						top: -10%;
						opacity: 0;
					}
					5% {
						opacity: 1;
					}
					90% {
						opacity: 1;
					}
					100% {
						top: 110%;
						opacity: 0;
					}
				}

				@keyframes pulseGlow {
					0%, 100% {
						box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3);
					}
					50% {
						box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
					}
				}

				.camera-frame-guide {
					animation: pulseGlow 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
				}

				.scan-line {
					animation: scanLineMove 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
				}

				.corner-bracket {
					width: 24px;
					height: 24px;
					border: 2px solid rgba(255, 255, 255, 0.8);
					position: absolute;
					z-index: 10;
				}

				.corner-tl {
					top: 24px;
					left: 24px;
					border-right: none;
					border-bottom: none;
					border-radius: 12px 0 0 0;
				}

				.corner-tr {
					top: 24px;
					right: 24px;
					border-left: none;
					border-bottom: none;
					border-radius: 0 12px 0 0;
				}

				.corner-bl {
					bottom: 24px;
					left: 24px;
					border-right: none;
					border-top: none;
					border-radius: 0 0 0 12px;
				}

				.corner-br {
					bottom: 24px;
					right: 24px;
					border-left: none;
					border-top: none;
					border-radius: 0 0 12px 0;
				}
			`}</style>

			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 backdrop-blur-md border-b border-white/10">
				<h2 className="text-white font-semibold text-lg sm:text-xl">
					Scan your grocery receipt/list
				</h2>
				<button
					onClick={onClose}
					className="p-2 rounded-full hover:bg-white/10 transition-colors duration-200"
					aria-label="Close camera"
				>
					<X className="w-6 h-6 text-white" strokeWidth={1.5} />
				</button>
			</div>

			{/* Camera View - Full-screen on mobile */}
			<div className="flex-1 relative bg-black overflow-hidden">
				{error ? (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
						<div className="text-center p-6 max-w-xs animate-fadeInScale">
							<AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
							<p className="text-white font-semibold mb-2 text-lg">Camera Not Available</p>
							<p className="text-gray-400 text-sm mb-6">{error}</p>
							<button
								onClick={startCamera}
								className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all duration-200 backdrop-blur-sm border border-white/20"
							>
								Try Again
							</button>
						</div>
					</div>
				) : (
					<>
						<video
							ref={videoRef}
							autoPlay
							playsInline
							className="w-full h-full object-cover"
						/>

						{/* Premium Frame Guide Overlay */}
						<div className="absolute inset-0 pointer-events-none camera-frame-guide">
							{/* Corner Brackets */}
							<div className="corner-bracket corner-tl" />
							<div className="corner-bracket corner-tr" />
							<div className="corner-bracket corner-bl" />
							<div className="corner-bracket corner-br" />

							{/* Scanning Line */}
							<div className="scan-line absolute w-full h-1">
								<div className="h-full w-full bg-gradient-to-b from-transparent via-white to-transparent opacity-80" />
								<div className="absolute top-1 left-0 w-full h-8 bg-gradient-to-b from-white/30 via-white/10 to-transparent" />
							</div>

							{/* Center Guide Text */}
							<div className="absolute inset-0 flex items-center justify-center">
								<div className="text-center px-4 py-2 rounded-full backdrop-blur-md border border-white/20 bg-black/40">
									<p className="text-white/90 text-sm font-medium">
										Position receipt in frame
									</p>
								</div>
							</div>

							{/* Safe Zone Indicator */}
							<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border border-white/5 rounded-2xl pointer-events-none" />
						</div>
					</>
				)}
			</div>

			{/* Controls - Sticky at bottom */}
			<div className="px-4 sm:px-6 py-4 backdrop-blur-md bg-black/40 border-t border-white/10">
				<div className="flex gap-3 justify-center mb-3 animate-slideUp" style={{ animationDelay: '100ms' }}>
					{isMobile && (
						<button
							onClick={switchCamera}
							disabled={!isCameraActive || !!error}
							className="p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 backdrop-blur-sm border border-white/20 hover:border-white/40"
							title="Switch camera"
							aria-label="Switch camera"
						>
							<RotateCw className="w-5 h-5 text-white" strokeWidth={1.5} />
						</button>
					)}

					<button
						onClick={capturePhoto}
						disabled={!isCameraActive || !!error}
						className="flex-1 sm:flex-initial px-8 py-3 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2 transition-all duration-200 backdrop-blur-sm border border-white/40 hover:border-white/60 hover:shadow-lg hover:shadow-white/10 sm:max-w-xs"
						aria-label="Capture photo"
					>
						<Camera className="w-5 h-5" strokeWidth={1.5} />
						<span className="hidden sm:inline">Capture</span>
					</button>

					<button
						onClick={onClose}
						disabled={!isCameraActive || !!error}
						className="flex-1 sm:flex-initial px-8 py-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 backdrop-blur-sm border border-white/20 hover:border-white/40 sm:max-w-xs"
						aria-label="Cancel"
					>
						<span className="hidden sm:inline">Cancel</span>
						<span className="sm:hidden">Close</span>
					</button>
				</div>

				{/* Tips for better photos */}
				<div className="space-y-1.5">
					<p className="text-white/80 text-xs font-medium text-center">📸 Tips for best results:</p>
					<p className="text-white/60 text-xs text-center leading-relaxed">
						Use natural lighting • Keep text crisp and clear • Avoid glare or shadows
					</p>
				</div>
			</div>

			{/* Hidden canvas for capturing */}
			<canvas ref={canvasRef} className="hidden" />
		</div>
	)
}
