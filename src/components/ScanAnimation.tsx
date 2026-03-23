import { memo } from 'react'

export const ScanAnimation = memo(function ScanAnimation() {
  return (
    <div className="relative w-20 h-28 mx-auto border-2 border-gray-900 rounded-[10px] bg-white shadow-sm flex flex-col items-start justify-start pt-6 pl-4 gap-3 overflow-hidden">
      <style>{`
        @keyframes scanMotion {
          0% { top: -10%; opacity: 0; }
          5% { opacity: 1; }
          90% { top: 110%; opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
        @keyframes lineReveal {
          0%, 25% { opacity: 0; transform: translateY(2px); }
          35%, 85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; }
        }
        .scanner-line {
          animation: scanMotion 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        /* Delays synced with scanner travel */
        .receipt-line-1 { animation: lineReveal 2.2s infinite; animation-delay: 0.1s; }
        .receipt-line-2 { animation: lineReveal 2.2s infinite; animation-delay: 0.3s; }
        .receipt-line-3 { animation: lineReveal 2.2s infinite; animation-delay: 0.5s; }
      `}</style>
      
      {/* Receipt Text Lines */}
      <div className="w-10 h-1.5 bg-gray-800 rounded-full receipt-line-1 opacity-0" />
      <div className="w-8 h-1.5 bg-gray-300 rounded-full receipt-line-2 opacity-0" />
      <div className="w-12 h-1.5 bg-gray-800 rounded-full receipt-line-3 opacity-0" />

      {/* The Scanner (glow effect + line) */}
      <div className="scanner-line absolute left-0 w-full z-10">
        <div className="h-[2px] w-[140%] -ml-[20%] bg-[#d8b4fe]" />
        <div className="h-6 w-[140%] -ml-[20%] bg-gradient-to-b from-[#e9d5ff]/40 to-transparent" />
      </div>
    </div>
  )
})
