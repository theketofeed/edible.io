import { AlertCircle, HelpCircle, FileText } from 'lucide-react'

interface Props {
  error: string
  onManualEntry: () => void
  retryFn?: () => void
}

export default function OcrErrorFallback({ error, onManualEntry, retryFn }: Props) {
  const isOcrError = error.includes('OCR') || error.includes('API')

  return (
    <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-center">
      <div className="flex justify-center text-red-400 mb-2">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h3 className="font-semibold text-red-800 mb-1">
        {isOcrError ? 'Receipt reading issue' : 'Photo quality issue'}
      </h3>
      <p className="text-sm text-red-600 mb-3">
        {isOcrError
          ? 'The OCR service encountered an issue processing your receipt. This might be a temporary service problem.'
          : 'We couldn\'t read the receipt from your photo. This can happen with poor lighting, blurry images, or cropped receipts.'}
      </p>

      <div className="bg-orange-100 rounded border border-orange-200 p-3 mb-4">
        <p className="text-xs text-orange-800 font-mono break-words">{error}</p>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-orange-900 mb-2">
            <HelpCircle className="w-4 h-4" />
            Quick fixes
          </h4>
          <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
            <li>Try a clearer, straight-on photo of your receipt</li>
            <li>Make sure the receipt is fully visible (not cropped)</li>
            <li>Ensure good lighting to avoid shadows</li>
            <li>Try a JPG or PNG image (not PDF if possible)</li>
          </ul>
        </div>

        <div className="bg-white rounded p-3 border border-orange-200">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-orange-900 mb-2">
            <FileText className="w-4 h-4" />
            Alternative: Enter manually
          </h4>
          <p className="text-xs text-orange-700 mb-3">
            You can paste your grocery list directly instead of uploading a photo.
          </p>
          <button
            onClick={onManualEntry}
            className="btn btn-primary w-full text-sm"
          >
            Paste grocery list
          </button>
        </div>

        <div className="flex gap-2 pt-2">
          {retryFn && (
            <button
              onClick={retryFn}
              className="btn border border-gray-300 flex-1 text-sm"
            >
              Try again
            </button>
          )}
          <button
            onClick={onManualEntry}
            className="btn btn-primary flex-1 text-sm"
          >
            Enter manually
          </button>
        </div>
      </div>
    </div>

  )
}
