import { memo } from 'react'

export const ScanAnimation = memo(function ScanAnimation() {
  return (
    <div className="relative w-full max-w-sm mx-auto h-72">
      <style>{`
        @keyframes scanPulse {
          0%, 100% {
            opacity: 0.4;
            transform: scaleY(0.8);
          }
          50% {
            opacity: 1;
            transform: scaleY(1);
          }
        }

        @keyframes lineGlide {
          0% {
            top: -8%;
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 108%;
            opacity: 0;
          }
        }

        @keyframes textReveal {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          40% {
            opacity: 1;
            transform: translateY(0);
          }
          80% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-8px);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        .receipt-frame {
          animation: scanPulse 1.5s ease-in-out infinite;
        }

        .scan-line-premium {
          animation: lineGlide 2.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
        }

        .receipt-text {
          animation: textReveal 2.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
        }

        .shimmer-effect {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.3) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 3s infinite;
        }
      `}</style>

      {/* Background Frame - Apple Style */}
      <div className="absolute inset-0 receipt-frame">
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-lavender/20 via-purple-200/10 to-transparent blur-2xl" />

        {/* Premium Card */}
        <div className="relative w-full h-full rounded-2xl border-2 border-lavender/40 bg-gradient-to-br from-white via-white to-lavender/5 backdrop-blur-sm shadow-xl">
          {/* Corner accents - iOS style */}
          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-lavender/40 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-lavender/40 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-lavender/40 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-lavender/40 rounded-br-lg" />

          {/* Content area */}
          <div className="absolute inset-0 flex flex-col items-start justify-start pt-12 pl-8 gap-4 overflow-hidden rounded-2xl">
            {/* Receipt text lines - animated reveal */}
            <div className="receipt-text space-y-3 w-full pr-8">
              <div className="h-2 bg-gray-800 rounded-full w-3/4 opacity-80" />
              <div className="h-2 bg-gray-400 rounded-full w-1/2 opacity-60" />
              <div className="h-2 bg-gray-700 rounded-full w-4/5 opacity-80" />
            </div>

            {/* Additional text lines with staggered animation */}
            <div className="receipt-text space-y-3 w-full pr-8" style={{ animationDelay: '0.15s' }}>
              <div className="h-2 bg-gray-600 rounded-full w-2/3 opacity-70" />
              <div className="h-2 bg-gray-400 rounded-full w-3/5 opacity-50" />
            </div>

            {/* Premium scanning line with glow */}
            <div className="scan-line-premium absolute left-0 w-full">
              {/* Main line */}
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-lavender to-transparent shadow-lg shadow-lavender/50" />
              {/* Glow effect */}
              <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-lavender/30 via-lavender/10 to-transparent blur-md" />
              {/* Shimmer */}
              <div className="absolute top-0 left-0 w-full h-1 shimmer-effect" />
            </div>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-gray-600">
        <div className="w-2 h-2 rounded-full bg-lavender animate-pulse" />
        <span>Analyzing receipt...</span>
      </div>
    </div>
  )
})
