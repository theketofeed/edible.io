import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, X, RotateCw } from 'lucide-react'

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
		<div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
			<div className="w-full max-w-md mx-auto">
				{/* Card */}
				<div className="bg-white rounded-lg shadow-xl overflow-hidden">
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b">
						<div className="flex items-center gap-2">
							<Camera className="w-5 h-5 text-blue-600" />
							<h2 className="text-lg font-semibold">Capture Receipt</h2>
						</div>
						<button
							onClick={onClose}
							className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
							aria-label="Close camera"
						>
							<X className="w-5 h-5 text-gray-600" />
						</button>
					</div>

					{/* Camera View */}
					<div className="relative bg-black aspect-video overflow-hidden">
						{error ? (
							<div className="absolute inset-0 flex items-center justify-center bg-black">
								<div className="text-center p-4">
									<p className="text-red-500 font-semibold mb-2">Camera Error</p>
									<p className="text-gray-300 text-sm mb-4">{error}</p>
									<button
										onClick={startCamera}
										className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
									>
										Retry
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

								{/* Camera Frame Guide Overlay */}
								<div className="absolute inset-0 border-2 border-yellow-400 pointer-events-none">
									{/* Corner indicators */}
									<div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-yellow-400" />
									<div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-yellow-400" />
									<div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-yellow-400" />
									<div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-yellow-400" />

									{/* Center text hint */}
									<div className="absolute inset-0 flex items-center justify-center">
										<p className="text-white text-xs font-medium bg-black/50 px-3 py-1 rounded">
											Align receipt with frame
										</p>
									</div>
								</div>
							</>
						)}
					</div>

					{/* Controls */}
					<div className="p-4 bg-gray-50 border-t">
						<div className="flex gap-3 justify-center mb-3">
							{isMobile && (
								<button
									onClick={switchCamera}
									disabled={!isCameraActive || !!error}
									className="p-3 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									title="Switch camera"
									aria-label="Switch camera"
								>
									<RotateCw className="w-5 h-5 text-gray-700" />
								</button>
							)}

							<button
								onClick={capturePhoto}
								disabled={!isCameraActive || !!error}
								className="flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2 transition-colors"
								aria-label="Capture photo"
							>
								<Camera className="w-5 h-5" />
								Capture
							</button>

							<button
								onClick={onClose}
								className="flex-1 px-4 py-3 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold transition-colors"
								aria-label="Cancel"
							>
								Cancel
							</button>
						</div>

						{/* Tip */}
						<p className="text-xs text-gray-600 text-center">
							📸 Position the receipt clearly in the frame for best results
						</p>
					</div>
				</div>
			</div>

			{/* Hidden canvas for capturing */}
			<canvas ref={canvasRef} className="hidden" />
		</div>
	)
}
