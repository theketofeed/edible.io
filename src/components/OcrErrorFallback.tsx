import { AlertCircle, HelpCircle, FileText } from 'lucide-react'

interface Props {
  error: string
  onManualEntry: () => void
  retryFn?: () => void
}

export default function OcrErrorFallback({ error, onManualEntry, retryFn }: Props) {
  const isMindeeError = error.includes('Mindee') || error.includes('API')
  
  return (
    <div className="card p-6 border-orange-200 bg-orange-50">
      <div className="flex gap-4">
        <div className="flex-shrink-0 pt-1">
          <AlertCircle className="w-5 h-5 text-orange-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-orange-900 mb-2">
            {isMindeeError ? 'Receipt reading issue' : 'Photo quality issue'}
          </h3>
          
          <p className="text-orange-700 text-sm mb-4">
            {isMindeeError
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
      </div>
    </div>
  )
}
