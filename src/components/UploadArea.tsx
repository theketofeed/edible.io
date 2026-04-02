import { useCallback, useEffect, useRef, useState } from 'react'
import {
	FileUp,
	FileText,
	Image as ImageIcon,
	X,
	File as FileIcon,
	Receipt,
	Upload,
	CheckCircle,
	AlertCircle,
	Loader2,
	Camera
} from 'lucide-react'
import { extractGroceryItems } from '../utils/grocery'
import { runOcrSpace } from '../lib/ocrSpaceOcr'
import { validateReceiptOrList } from '../services/documentValidator'
import CameraCapture from './CameraCapture'

interface Props {
	onItemsDetected: (items: string[], rawText: string) => void
	onError: (message: string) => void
	disabled?: boolean
}

type UploadState = 'idle' | 'hover' | 'dragOver' | 'uploading' | 'processing' | 'success' | 'error'

export default function UploadArea({ onItemsDetected, onError, disabled }: Props) {
	const inputRef = useRef<HTMLInputElement | null>(null)
	const [uploadState, setUploadState] = useState<UploadState>('idle')
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [filePreview, setFilePreview] = useState<string | null>(null)
	const [manualText, setManualText] = useState('')
	const [uploadProgress, setUploadProgress] = useState(0)
	const [ocrConfidence, setOcrConfidence] = useState<number | undefined>()
	const [detectedCount, setDetectedCount] = useState<number | null>(null)
	const [errorMessage, setErrorMessage] = useState<string>('')
	const [showCamera, setShowCamera] = useState(false)

	useEffect(() => {
		if (selectedFile && selectedFile.type.startsWith('image/')) {
			const url = URL.createObjectURL(selectedFile)
			setFilePreview(url)
			return () => URL.revokeObjectURL(url)
		}
		setFilePreview(null)
	}, [selectedFile])

	const accept = '.jpg,.jpeg,.png,.pdf'

	const formatFileSize = (bytes: number): string => {
		if (bytes < 1024) return bytes + ' B'
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
	}

	const getFileIcon = (file: File) => {
		if (file.type === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />
		if (file.type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-purple-500" />
		return <FileIcon className="w-5 h-5 text-gray-500" />
	}

	const handleFiles = useCallback(async (files: FileList) => {
		const file = files[0]
		if (!file) return

		setSelectedFile(file)
		setDetectedCount(null)
		setUploadState('uploading')
		setUploadProgress(0)
		setOcrConfidence(undefined)
		setErrorMessage('')

		// Simulate upload progress - slower for realistic feel
		const progressInterval = setInterval(() => {
			setUploadProgress(prev => {
				if (prev >= 90) {
					clearInterval(progressInterval)
					return 90
				}
				return prev + 2 // Slower increment (2% per 100ms = ~4.5s to 90%)
			})
		}, 100)

		try {
			console.log('[UploadArea] Processing file with OCR.space...')

			// Start OCR request
			const ocrPromise = runOcrSpace(file)

			// Wait for at least 2 seconds of "uploading" (progress bar filling)
			await new Promise(resolve => setTimeout(resolve, 2000))

			setUploadState('processing')
			setUploadProgress(100)
			clearInterval(progressInterval)

			// Wait for at least 1.5 seconds of "processing" (analyzing animation)
			await new Promise(resolve => setTimeout(resolve, 1500))

			const { items, rawText, confidence } = await ocrPromise

			console.log('[UploadArea] OCR completed. Items found:', items.length)

			// Validate if document is a receipt or shopping list
			const validation = validateReceiptOrList(rawText)
			console.log('[UploadArea] Document validation:', validation)

			if (!validation.isValid) {
				// Document is not a valid receipt or shopping list
				setDetectedCount(0)
				setUploadState('error')
				setErrorMessage(validation.reason || 'This doesn\'t appear to be a valid grocery receipt or shopping list. Please try again.')
				onError(validation.reason || 'Invalid document type')
				return
			}

			setOcrConfidence(confidence)

			if (items.length) {
				setDetectedCount(items.length)
				setUploadState('success')
				onItemsDetected(items, rawText)
			} else {
				setDetectedCount(0)
				setUploadState('error')
				setErrorMessage('No grocery items found. Try a clearer photo.')
				onError('No grocery items found. Try a clearer photo.')
			}
		} catch (e) {
			console.error('[UploadArea] OCR error:', e)
			const errMsg = e instanceof Error ? e.message : 'Something went wrong while reading your receipt.'
			
			// Make OCR errors more user-friendly
			let friendlyMessage = errMsg
			if (errMsg.includes('E500') || errMsg.includes('Resource Exhaustion')) {
				friendlyMessage = 'The OCR service encountered an issue. Make sure you\'re uploading a clear receipt or list with visible text, not a blank image.'
			} else if (errMsg.includes('timeout') || errMsg.includes('Timeout')) {
				friendlyMessage = 'The service took too long to process. Please try uploading a clearer image with less content.'
			} else if (errMsg.includes('No image')) {
				friendlyMessage = 'No text could be detected in this image. Make sure it\'s a receipt or shopping list with clear, readable text.'
			}
			
			setErrorMessage(friendlyMessage)
			setUploadState('error')
			onError(friendlyMessage)
		} finally {
			clearInterval(progressInterval)
		}
	}, [onError, onItemsDetected])

	const onDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setUploadState('idle')
		if (disabled) return
		if (e.dataTransfer.files?.length) {
			void handleFiles(e.dataTransfer.files)
		}
	}, [disabled, handleFiles])

	const onPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.length) {
			void handleFiles(e.target.files)
			e.target.value = ''
		}
	}, [handleFiles])

	const clearFile = useCallback(() => {
		setSelectedFile(null)
		setFilePreview(null)
		setOcrConfidence(undefined)
		setDetectedCount(null)
		setUploadState('idle')
		setErrorMessage('')
		setUploadProgress(0)
	}, [])

	const retryUpload = useCallback(() => {
		if (selectedFile) {
			const dt = new DataTransfer()
			dt.items.add(selectedFile)
			void handleFiles(dt.files)
		}
	}, [selectedFile, handleFiles])

	const useManual = useCallback(() => {
		const items = extractGroceryItems(manualText)
		if (!items.length) {
			onError('Please list grocery items separated by commas or new lines.')
			return
		}
		setDetectedCount(items.length)
		onItemsDetected(items, manualText)
	}, [manualText, onItemsDetected, onError])

	const handleCameraCapture = useCallback((file: File) => {
		console.log('[UploadArea] Camera photo captured')
		setShowCamera(false)
		const dt = new DataTransfer()
		dt.items.add(file)
		void handleFiles(dt.files)
	}, [handleFiles])

	const getDropzoneClass = () => {
		let baseClass = 'dropzone'
		if (uploadState === 'dragOver') return `${baseClass} dropzone-drag-over`
		if (uploadState === 'hover') return `${baseClass} dropzone-hover`
		if (uploadState === 'error') return `${baseClass} border-error`
		return baseClass
	}

	return (
		<div className="grid gap-6">
			<div
				onDragOver={(e) => {
					e.preventDefault()
					if (!disabled && uploadState === 'idle') setUploadState('dragOver')
				}}
				onDragLeave={() => {
					if (uploadState === 'dragOver') setUploadState('idle')
				}}
				onDrop={onDrop}
				onMouseEnter={() => {
					if (!disabled && uploadState === 'idle') setUploadState('hover')
				}}
				onMouseLeave={() => {
					if (uploadState === 'hover') setUploadState('idle')
				}}
				className={getDropzoneClass()}
			>
				{/* Idle/Hover/DragOver State */}
				{(uploadState === 'idle' || uploadState === 'hover' || uploadState === 'dragOver') && !selectedFile && (
					<div className="flex flex-col items-center gap-4 py-4">
						<div className="relative">
							<FileText className="w-16 h-16 text-lavender" strokeWidth={1.5} />
							<div className="absolute -bottom-1 -right-1 bg-lavender rounded-full p-1.5">
								<Upload className="w-4 h-4 text-white" strokeWidth={2.5} />
							</div>
						</div>
						<div className="text-center space-y-2">
							<h3 className="text-lg font-semibold text-black">
								{uploadState === 'dragOver' ? 'Drop here to upload' : 'Upload your grocery receipt or shopping list'}
							</h3>
							<p className="text-sm text-black/60">
								We support receipts from major stores • JPG, PNG, PDF
							</p>
						</div>
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						<button
							type="button"
							onClick={() => inputRef.current?.click()}
							className="px-6 py-3 rounded-full bg-lavender text-black font-semibold shadow-lg shadow-lavender/40 hover:shadow-lavender/50 hover:scale-105 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
							disabled={disabled}
						>
							<FileUp className="w-4 h-4" strokeWidth={2} />
							Choose File
						</button>
						<button
							type="button"
							onClick={() => setShowCamera(true)}
							className="px-6 py-3 rounded-full bg-white border-2 border-lavender/40 text-black font-semibold hover:bg-lavender/5 hover:border-lavender/60 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
							disabled={disabled}
						>
							<Camera className="w-4 h-4" strokeWidth={2} />
							Take Photo
						</button>
					</div>
						<p className="text-xs text-black/50 flex items-center gap-1">
							💡 Tip: Upload a clear photo for best results
						</p>
					</div>
				)}

				{/* Uploading State */}
				{uploadState === 'uploading' && (
					<div className="flex flex-col items-center gap-4 py-6 animate-fadeInScale">
						<Loader2 className="w-12 h-12 text-lavender animate-spin" />
						<div className="w-full max-w-xs space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-black/70 font-medium">{selectedFile?.name}</span>
								<span className="text-lavender font-semibold">{uploadProgress}%</span>
							</div>
							<div className="h-2 bg-gray-200 rounded-full overflow-hidden">
								<div
									className="h-full bg-gradient-to-r from-lavender to-purple-400 transition-all duration-300 animate-progressPulse"
									style={{ width: `${uploadProgress}%` }}
								/>
							</div>
						</div>
						<p className="text-sm text-black/60">Uploading...</p>
					</div>
				)}

				{/* Processing State */}
				{uploadState === 'processing' && (
					<div className="flex flex-col items-center gap-4 py-6 animate-fadeInScale">
						<Loader2 className="w-12 h-12 text-lavender animate-spin" />
						<p className="text-sm text-black/70 font-medium">Analyzing your receipt...</p>
					</div>
				)}

				{/* Success State */}
				{uploadState === 'success' && selectedFile && (
					<div className="space-y-4 animate-slideUp">
						<div className="flex items-start gap-3 p-4 bg-success border border-success rounded-lg">
							<CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
							<div className="flex-1 min-w-0">
								<p className="text-sm font-semibold text-success mb-1">Receipt uploaded successfully</p>
								<div className="flex items-center gap-2 text-sm text-black/70">
									{getFileIcon(selectedFile)}
									<span className="font-medium truncate">{selectedFile.name}</span>
									<span className="text-black/50">•</span>
									<span className="text-black/50">{formatFileSize(selectedFile.size)}</span>
								</div>
								{typeof detectedCount === 'number' && detectedCount > 0 && (
									<p className="text-xs text-black/60 mt-2">
										✓ {detectedCount} items detected
									</p>
								)}
								{typeof ocrConfidence === 'number' && (
									<p className="text-xs text-black/50 mt-1">
										OCR confidence: {Math.round(ocrConfidence)}%
									</p>
								)}
							</div>
							<button
								type="button"
								className="text-black/40 hover:text-black/70 transition-colors"
								onClick={clearFile}
								aria-label="Remove file"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{/* Image Preview */}
						{filePreview && (
							<div className="flex justify-center">
								<img
									src={filePreview}
									alt="Receipt preview"
									className="rounded-2xl border-2 border-lavender/20 max-h-48 object-contain shadow-xl shadow-lavender/20"
								/>
							</div>
						)}

						<button
							type="button"
							onClick={() => inputRef.current?.click()}
							className="w-full px-4 py-3 rounded-full text-lavender hover:text-purple-600 font-semibold transition-all duration-200 hover:bg-lavender/5 active:scale-95"
						>
							Replace receipt
						</button>
					</div>
				)}

				{/* Error State */}
				{uploadState === 'error' && selectedFile && (
					<div className="space-y-4 animate-slideUp">
						<div className="flex items-start gap-3 p-4 bg-error border border-error rounded-lg">
							<AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
							<div className="flex-1">
								<p className="text-sm font-semibold text-error mb-1">Upload failed</p>
								<p className="text-sm text-black/70">{errorMessage}</p>
								<div className="flex items-center gap-2 text-xs text-black/50 mt-2">
									{getFileIcon(selectedFile)}
									<span className="truncate">{selectedFile.name}</span>
								</div>
							</div>
							<button
								type="button"
								className="text-black/40 hover:text-black/70 transition-colors"
								onClick={clearFile}
								aria-label="Remove file"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
						<div className="flex gap-3">
							<button
								type="button"
								onClick={retryUpload}
								className="flex-1 px-4 py-3 rounded-full bg-lavender text-black font-semibold shadow-lg shadow-lavender/40 hover:shadow-lavender/50 hover:scale-105 transition-all duration-200 active:scale-95"
							>
								Retry Upload
							</button>
							<button
								type="button"
								onClick={() => inputRef.current?.click()}
								className="flex-1 px-4 py-3 rounded-full border-2 border-lavender/40 text-black font-semibold hover:bg-lavender/5 hover:border-lavender/60 transition-all duration-200 active:scale-95"
							>
								Choose Different
							</button>
						</div>
					</div>
				)}

				<input
					ref={inputRef}
					type="file"
					accept={accept}
					onChange={onPick}
					className="hidden"
					disabled={disabled}
				/>
			</div>

			{/* Camera Capture Modal */}
			{showCamera && (
				<CameraCapture
					onCapture={handleCameraCapture}
					onClose={() => setShowCamera(false)}
				/>
			)}

			{/* Manual Text Input Section */}
			<div className="grid gap-3 pt-4 border-t border-gray-200/50">
				<label className="text-sm font-semibold text-black/80 flex items-center gap-2">
					<FileText className="w-4 h-4 text-lavender" strokeWidth={2} />
					Or paste your grocery list:
				</label>
				<textarea
					className="input rounded-xl border-2 border-gray-200/50 focus:border-lavender/50 focus:ring-0 min-h-[120px] resize-none"
					placeholder="e.g., chicken breast, quinoa, spinach, eggs, yogurt, berries, tofu, broccoli…"
					value={manualText}
					onChange={(e) => setManualText(e.target.value)}
					disabled={disabled}
				/>
				<div className="flex items-center gap-3 flex-wrap">
					<button
						type="button"
						className="px-6 py-2.5 rounded-full bg-lavender text-black font-semibold shadow-lg shadow-lavender/40 hover:shadow-lavender/50 hover:scale-105 transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
						onClick={useManual}
						disabled={disabled || !manualText.trim()}
					>
						Use this text
					</button>
					{typeof detectedCount === 'number' && (
						<span className="text-xs text-black/60 px-3 py-1 rounded-full bg-black/5">
							{detectedCount} items ready
						</span>
					)}
				</div>
			</div>
		</div>
	)
}