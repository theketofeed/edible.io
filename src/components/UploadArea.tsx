import { useCallback, useEffect, useRef, useState, memo } from 'react'
import { FileUp, FileText, Image as ImageIcon, X, File as FileIcon } from 'lucide-react'
import { extractGroceryItems } from '../utils/grocery'
import { runMindeeOcr } from '../lib/mindeeOcr'
import OcrErrorFallback from './OcrErrorFallback'

interface Props {
	onItemsDetected: (items: string[], rawText: string) => void
	onError: (message: string) => void
	disabled?: boolean
}

const UploadArea = memo(function UploadArea({ onItemsDetected, onError, disabled }: Props) {
	const inputRef = useRef<HTMLInputElement | null>(null)
	const [dragOver, setDragOver] = useState(false)
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [filePreview, setFilePreview] = useState<string | null>(null)
	const [manualText, setManualText] = useState('')
	const [isOcrRunning, setIsOcrRunning] = useState(false)
	const [ocrConfidence, setOcrConfidence] = useState<number | undefined>()
	const [detectedCount, setDetectedCount] = useState<number | null>(null)
	const [receiptMetadata, setReceiptMetadata] = useState<{
		supplierName?: string
		date?: string
		totalAmount?: number
	} | null>(null)
	const [ocrError, setOcrError] = useState<string | null>(null)
	const [showManualTab, setShowManualTab] = useState(false)

	useEffect(() => {
		if (selectedFile && selectedFile.type.startsWith('image/')) {
			const url = URL.createObjectURL(selectedFile)
			setFilePreview(url)
			return () => URL.revokeObjectURL(url)
		}
		setFilePreview(null)
	}, [selectedFile])

	const accept = '.jpg,.jpeg,.png,.pdf'

	const handleFiles = useCallback(async (files: FileList) => {
		const file = files[0]
		if (!file) return
		setSelectedFile(file)
		setDetectedCount(null)
		setIsOcrRunning(true)
		setOcrConfidence(undefined)
		setReceiptMetadata(null)
		setOcrError(null)
		
		try {
			console.log('[UploadArea] Processing file with Mindee OCR...')
			const { items, rawText, confidence, metadata } = await runMindeeOcr(file)
			
			setOcrConfidence(confidence)
			setReceiptMetadata(metadata || null)
			
			if (items.length) {
				setDetectedCount(items.length)
				onItemsDetected(items, rawText)
			} else {
				setDetectedCount(0)
				const msg = 'No grocery items found. Try a clearer photo.'
				setOcrError(msg)
				onError(msg)
			}
		} catch (e) {
			console.error('[UploadArea] OCR error:', e)
			const errorMessage = e instanceof Error ? e.message : 'Something went wrong while reading your receipt.'
			setOcrError(errorMessage)
			onError(errorMessage)
		} finally {
			setIsOcrRunning(false)
		}
	}, [onError, onItemsDetected])

	const onDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setDragOver(false)
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
		setReceiptMetadata(null)
		setOcrError(null)
	}, [])

	const useManual = useCallback(() => {
		const items = extractGroceryItems(manualText)
		if (!items.length) {
			onError('Please list grocery items separated by commas or new lines.')
			return
		}
		setDetectedCount(items.length)
		onItemsDetected(items, manualText)
	}, [manualText, onItemsDetected, onError])

	return (
		<div className="grid gap-4">
			{ocrError && (
				<OcrErrorFallback 
					error={ocrError}
					onManualEntry={() => setShowManualTab(true)}
					retryFn={selectedFile ? () => {
						setOcrError(null)
						void handleFiles(new FileList() as any)
					} : undefined}
				/>
			)}

			{!showManualTab ? (
				<div
					onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true) }}
					onDragLeave={() => setDragOver(false)}
					onDrop={onDrop}
					className={`dropzone ${dragOver ? 'border-lavender bg-lavender/5' : ''}`}
				>
					<div className="flex flex-col md:flex-row md:items-center md:justify-center gap-3 text-black/80">
						<ImageIcon className="w-6 h-6 mx-auto md:mx-0" />
						<span className="font-semibold text-center md:text-left">Drag & drop</span>
						<span className="text-center md:text-left">an image or PDF here, or</span>
						<button
							type="button"
							onClick={() => inputRef.current?.click()}
							className="btn btn-primary text-sm"
							disabled={disabled}
						>
							<FileUp className="w-4 h-4 mr-2" />
							Choose file
						</button>
					</div>
					<p className="mt-2 text-xs text-black/60 text-center md:text-left">Supported: .jpg, .png, .pdf (optimized for grocery receipts)</p>
					<input
						ref={inputRef}
						type="file"
						accept={accept}
						onChange={onPick}
						className="hidden"
						disabled={disabled}
					/>
					{selectedFile && !ocrError && (
						<div className="mt-4 grid gap-2 place-items-center md:place-items-start text-sm">
							<div className="flex items-center gap-2">
								<FileIcon className="w-4 h-4 text-black/60" />
								<span>{selectedFile.name}</span>
								{typeof ocrConfidence === 'number' && (
									<span className="text-xs text-black/60">(OCR confidence: {Math.round(ocrConfidence)}%)</span>
								)}
								<button type="button" className="text-black/60 hover:text-black" onClick={clearFile} aria-label="Remove file">
									<X className="w-4 h-4" />
								</button>
							</div>
							{receiptMetadata && (receiptMetadata.supplierName || receiptMetadata.date) && (
								<div className="text-xs text-black/60 space-y-1">
									{receiptMetadata.supplierName && <div>Store: {receiptMetadata.supplierName}</div>}
									{receiptMetadata.date && <div>Date: {receiptMetadata.date}</div>}
									{receiptMetadata.totalAmount && <div>Total: ${receiptMetadata.totalAmount.toFixed(2)}</div>}
								</div>
							)}
							{filePreview ? (
								<img src={filePreview} alt="Uploaded preview" className="rounded-lg border border-gray-200 max-h-40 object-contain" />
							) : (
								<span className="text-xs text-black/60">Preview unavailable for this file type.</span>
							)}
							{typeof detectedCount === 'number' && (
								<span className="text-xs text-black/70">{detectedCount > 0 ? `Detected ${detectedCount} items` : 'No grocery items detected yet.'}</span>
							)}
						</div>
					)}
					{isOcrRunning && (
						<p className="mt-3 text-sm text-black/70 flex items-center justify-center gap-2">
							<span className="spinner-lavender" />
							Reading your receipt with Mindee AI...
						</p>
					)}
				</div>
			) : null}

			<div className="grid gap-2">
				<label className="text-sm font-semibold text-black/80 flex items-center gap-2">
					<FileText className="w-4 h-4" />
					{showManualTab ? 'Paste your grocery list:' : 'Or paste your grocery list:'}
				</label>
				<textarea
					className="input min-h-[140px]"
					placeholder="e.g., chicken breast, quinoa, spinach, eggs, yogurt, berries, tofu, broccoli…"
					value={manualText}
					onChange={(e) => setManualText(e.target.value)}
					disabled={disabled}
				/>
				<div className="flex items-center gap-3">
					<button type="button" className="btn btn-primary" onClick={useManual} disabled={disabled || !manualText.trim()}>
						Use this text
					</button>
					{typeof detectedCount === 'number' && (
						<span className="text-xs text-black/60">Current list: {detectedCount} items</span>
					)}
					{showManualTab && (
						<button 
							type="button" 
							className="btn border border-gray-300 text-sm"
							onClick={() => setShowManualTab(false)}
						>
							Back to upload
						</button>
					)}
				</div>
			</div>
		</div>
	)
})